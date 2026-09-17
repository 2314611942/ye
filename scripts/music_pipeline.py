#!/usr/bin/env python3
"""Song production CLI. Preparation is offline; only generate/resume call fal.

No credentials enter Vite, exported plans, logs, or generated web pages.
Paid POST requests are never automatically repeated.
"""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from music_audio import find_ffmpeg, master_audio, verify_audio

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SONG = ROOT / "music/yeting-anthem/song.json"
OUTPUT = ROOT / "music/output"
ENGINES = {"minimax": "minimax/music-3", "eleven": "elevenlabs/music/v2.5"}
CRITERIA = ("lyrics_accuracy", "pronunciation", "melody", "vocal", "arrangement", "ending")


class WorkflowError(Exception):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def file_digest(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def load_environment():
    """Small literal dotenv reader: no shell execution, interpolation or logging."""
    path = ROOT / ".env.music"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        name, sep, value = line.partition("=")
        name, value = name.strip(), value.strip()
        if sep and name in {"FAL_KEY", "MUSIC_FFMPEG"}:
            if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ.setdefault(name, value)


def validate_song(song):
    if song.get("schema_version") != 1:
        raise WorkflowError("song.json 的 schema_version 必须是 1。")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", song.get("slug", "")):
        raise WorkflowError("slug 只允许小写字母、数字及连字符。")
    for field in ("title", "key", "language", "brief", "composition_notes"):
        if not isinstance(song.get(field), str) or not song[field].strip():
            raise WorkflowError(f"缺少非空文本字段：{field}")
    if song.get("meter") != "4/4" or not 40 <= song.get("bpm", 0) <= 200:
        raise WorkflowError("当前编排器要求 4/4 拍，BPM 在 40—200 之间。")
    for field in ("styles", "negative_styles"):
        if not isinstance(song.get(field), list) or not song[field] or not all(isinstance(s, str) and s.strip() for s in song[field]):
            raise WorkflowError(f"{field} 必须是非空字符串列表。")
    sections = song.get("sections", [])
    if not 1 <= len(sections) <= 30:
        raise WorkflowError("需要 1—30 个歌曲段落。")
    seen = set()
    for section in sections:
        for field in ("id", "label", "tag", "arrangement"):
            if not isinstance(section.get(field), str) or not section[field].strip():
                raise WorkflowError(f"段落缺少 {field}。")
        if section["id"] in seen:
            raise WorkflowError("段落 id 不能重复。")
        seen.add(section["id"])
        if not re.fullmatch(r"[A-Za-z0-9 -]{1,100}", section["tag"]):
            raise WorkflowError("段落 tag 必须是英文名称，不能包含歌词或换行。")
        bars = section.get("bars")
        if type(bars) is not int or bars < 1 or not 3000 <= section_ms(song, section) <= 120000:
            raise WorkflowError("各段必须是正整数小节，时长为 3—120 秒。")
        lyrics = section.get("lyrics")
        if not isinstance(lyrics, list) or len(lyrics) > 29 or not all(isinstance(line, str) and 0 < len(line) <= 200 and not any(c in line for c in "\n\r[]{}") for line in lyrics):
            raise WorkflowError("歌词必须是逐行字符串列表，不含段落标签或制作指令。")
        if len(section.get("chords", [])) != bars:
            raise WorkflowError(f"{section['id']} 每小节需要一个和弦。")
    if not any(s["lyrics"] for s in sections):
        raise WorkflowError("这是一条人声歌曲流程，至少需要一段歌词。")
    if not 3 <= duration(song) <= 300:
        raise WorkflowError("两引擎共用工程的总时长必须为 3—300 秒。")
    settings = song.get("mastering", {})
    if not (-24 <= settings.get("integrated_lufs", 0) <= -10 and -3 <= settings.get("true_peak_dbtp", 0) <= -1 and 1 <= settings.get("loudness_range_lu", 0) <= 20):
        raise WorkflowError("请设置合适的 mastering LUFS、true peak 和 LRA。")
    return song


def section_ms(song, section):
    return round(section["bars"] * 4 * 60000 / song["bpm"])


def duration(song):
    return sum(section_ms(song, s) for s in song["sections"]) / 1000


def section_text(section):
    return f"[{section['tag']}]\n" + "\n".join(section["lyrics"])


def lyrics_text(song):
    return "\n\n".join(section_text(s).rstrip() for s in song["sections"]) + "\n"


def build_payload(song, engine, seed):
    validate_song(song)
    if not 0 <= seed <= 2147483647:
        raise WorkflowError("seed 必须在 0—2147483647 之间。")
    if engine == "minimax":
        arrangement = "\n".join(f"{s['label']} ({section_ms(song, s) / 1000:g}s): {s['arrangement']} Harmonic target: {' / '.join(s['chords'])}." for s in song["sections"])
        return {
            "prompt": "; ".join(song["styles"]) + ".\n" + song["composition_notes"] + "\nArrangement:\n" + arrangement + "\nAvoid: " + ", ".join(song["negative_styles"]),
            "lyrics": lyrics_text(song), "duration": duration(song), "seed": seed,
            "num_inference_steps": 30, "guidance_scale": 1.7,
        }
    if engine == "eleven":
        return {
            "composition_plan": {"chunks": [{
                "text": section_text(s).rstrip(), "duration_ms": section_ms(song, s),
                "positive_styles": song["styles"] + [s["arrangement"], "Harmonic target: " + " / ".join(s["chords"])],
                "negative_styles": song["negative_styles"] + ([] if s["lyrics"] else ["vocals"]),
                "context_adherence": "high",
            } for s in song["sections"]]},
            "seed": seed, "output_format": "mp3_48000_320",
        }
    raise WorkflowError("未知音乐引擎。")


def production_notes(song):
    lines = [f"# {song['title']} · 制作谱", "", song["brief"], "", f"目标：{song['bpm']} BPM · {song['meter']} · {song['key']} · {duration(song):g} 秒。", "", "和弦与时间是作曲指导，实际旋律与音高由生成模型创作；这不是成品录音的逐音符转谱。", "", "| 起点 | 段落 | 小节 | 和弦 |", "|---|---|---|---|"]
    elapsed = 0
    for s in song["sections"]:
        lines.append(f"| {elapsed // 60:02d}:{elapsed % 60:02d} | {s['label']} | {s['bars']} | {' / '.join(s['chords'])} |")
        elapsed += round(section_ms(song, s) / 1000)
    lines += ["", "## 歌词", "", lyrics_text(song), "## 制作方向", "", song["composition_notes"], "", "## 地名、人名发音复核", ""]
    lines += [f"- {s}" for s in song.get("pronunciation_review", [])]
    lines += ["", "## 史实边界", ""] + [f"- {s}" for s in song.get("history_notes", [])]
    return "\n".join(lines) + "\n"


def prepare(song, output):
    validate_song(song)
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / "song.json", song)
    (output / "lyrics.txt").write_text(lyrics_text(song), encoding="utf-8")
    (output / "production.md").write_text(production_notes(song), encoding="utf-8")
    for engine in ENGINES:
        write_json(output / f"request-{engine}.json", build_payload(song, engine, 18960910))
    write_json(output / "status.json", {"stage": "prepared_only", "audio_generated": False, "target_duration_seconds": duration(song), "updated_at": now()})
    print(f"歌词、制作谱及两个引擎的请求文件已准备：{output}")


@contextmanager
def run_lock(folder):
    folder.mkdir(parents=True, exist_ok=True)
    with (folder / ".lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise WorkflowError("同一版本正被另一个进程处理，请稍后续接。") from exc
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def queue_url(url):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "queue.fal.run" or parsed.username or parsed.fragment:
        raise WorkflowError("拒绝向 fal 官方队列之外的地址发送凭据。")
    return url


def api_json(url, key, payload=None):
    queue_url(url)
    request = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(), headers={"Authorization": "Key " + key, "Content-Type": "application/json", "User-Agent": "YetingMusicWorkflow/1"})
    # A timed-out POST may already be billable. Never retry it automatically.
    attempts = 1 if payload is not None else 3
    for attempt in range(attempts):
        try:
            with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
                value = json.load(response)
                if not isinstance(value, dict):
                    raise WorkflowError("音乐服务返回了无效的 JSON 对象。")
                return value
        except urllib.error.HTTPError as exc:
            if payload is None and exc.code in {429, 500, 502, 503, 504} and attempt + 1 < attempts:
                time.sleep(2 ** attempt)
                continue
            raise WorkflowError(f"音乐服务 HTTP {exc.code}。请检查账号权限、余额或控制台任务；未自动重发生成请求。") from None
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
            if payload is None and attempt + 1 < attempts:
                time.sleep(2 ** attempt)
                continue
            raise WorkflowError("音乐服务连接或响应异常；已保留任务状态，请使用 resume。") from None


def download_audio(url, target):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise WorkflowError("音频下载地址必须为不含凭据的 HTTPS URL。")
    temporary = target.with_suffix(target.suffix + ".part")
    # Media downloads never receive FAL_KEY, including redirects to storage.
    request = urllib.request.Request(url, headers={"User-Agent": "YetingMusicWorkflow/1"})
    try:
        with urllib.request.urlopen(request, timeout=90) as response, temporary.open("wb") as dest:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > 250 * 1024 * 1024:
                    raise WorkflowError("音频超过 250 MB，停止下载。")
                dest.write(chunk)
        verify_audio(temporary, find_ffmpeg(ROOT))
        temporary.replace(target)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise


def require_key():
    key = os.environ.get("FAL_KEY", "").strip()
    if not key:
        raise WorkflowError("尚未配置 FAL_KEY。请在本机 .env.music 中填写；不要发到聊天或前端代码。")
    return key


def save_state(folder, state):
    state["updated_at"] = now()
    write_json(folder / "run.json", state)


def finish_job(folder, state, key, wait_seconds):
    if state.get("audio_file"):
        path = folder / state["audio_file"]
        if not path.is_file() or file_digest(path) != state.get("audio_sha256"):
            raise WorkflowError("原始音频丢失或校验值变化；请恢复文件，不会自动生成收费替代品。")
        print(f"复用已下载的候选：{path}")
        return state
    if state["status"] in {"submitting", "submission_unknown"}:
        raise WorkflowError("上次提交结果不确定。请先在 fal 控制台找到任务，再用 recover 保存任务编号和队列 URL；不会重复扣费提交。")
    if not state.get("request_id"):
        raise WorkflowError("缺少服务任务编号，无法续接。")
    deadline = time.monotonic() + wait_seconds
    while True:
        status = api_json(state["status_url"], key)
        state["last_queue_status"] = status.get("status")
        save_state(folder, state)
        if status.get("error") or status.get("status") in {"FAILED", "CANCELLED"}:
            state["status"] = "provider_failed"
            save_state(folder, state)
            raise WorkflowError("服务报告任务失败。请查看 fal 控制台；原任务已保留，没有重新收费生成。")
        if status.get("status") == "COMPLETED":
            result = api_json(state["response_url"], key)
            if not isinstance(result.get("audio"), dict) or not result["audio"].get("url"):
                raise WorkflowError("任务返回结果中没有 audio.url；尚未生成有效歌曲文件。")
            write_json(folder / "provider-result.json", result)
            suffix = ".wav" if state["engine"] == "minimax" else ".mp3"
            target = folder / ("original" + suffix)
            download_audio(result["audio"]["url"], target)
            state.update(status="downloaded", audio_file=target.name, audio_sha256=file_digest(target), downloaded_at=now())
            save_state(folder, state)
            listen_page(folder, read_json(folder / "song.json"), state)
            print(f"候选歌曲已下载，尚待试听和后期处理：{target}")
            return state
        if status.get("status") not in {"IN_QUEUE", "IN_PROGRESS"}:
            raise WorkflowError("未知队列状态，已保存任务；稍后使用 resume。")
        if time.monotonic() >= deadline:
            print(f"仍在排队或生成中，任务已保存。续接：\npython3 scripts/music_pipeline.py resume --run {folder}")
            return state
        time.sleep(min(5, max(0, deadline - time.monotonic())))


def generate(song, engine, take, seed, wait_seconds):
    key = require_key()
    find_ffmpeg(ROOT)  # Fail before billing if decoding / mastering is unavailable.
    payload = build_payload(song, engine, seed)
    fingerprint = digest({"song": song, "engine": engine, "payload": payload})[:12]
    folder = OUTPUT / song["slug"] / f"{engine}-{take}-{fingerprint}"
    with run_lock(folder):
        state_file = folder / "run.json"
        if state_file.exists():
            return finish_job(folder, read_json(state_file), key, wait_seconds)
        write_json(folder / "song.json", song)
        write_json(folder / "request.json", payload)
        state = {"schema_version": 1, "status": "submitting", "engine": engine, "endpoint": ENGINES[engine], "take": take, "seed": seed, "song_sha256": digest(song), "payload_sha256": digest(payload), "created_at": now()}
        save_state(folder, state)
        try:
            result = api_json("https://queue.fal.run/" + ENGINES[engine], key, payload)
            if not all(result.get(k) for k in ("request_id", "status_url", "response_url")):
                raise WorkflowError("提交响应缺少任务编号或队列地址。")
            queue_url(result["status_url"])
            queue_url(result["response_url"])
        except Exception:
            state["status"] = "submission_unknown"
            save_state(folder, state)
            raise
        state.update(status="queued", request_id=result["request_id"], status_url=result["status_url"], response_url=result["response_url"])
        if result.get("cancel_url"):
            state["cancel_url"] = queue_url(result["cancel_url"])
        save_state(folder, state)
        print(f"已提交一个收费候选版本，任务编号：{state['request_id']}\n工作目录：{folder}")
        return finish_job(folder, state, key, wait_seconds)


def listen_page(folder, song, state):
    esc = html.escape
    tracks = [("生成原版 · 待人工核对", state.get("audio_file")), ("展陈版", state.get("master_mp3"))]
    players = "".join(f'<h2>{esc(label)}</h2><audio controls preload="metadata" src="{esc(name, quote=True)}"></audio><p><a download href="{esc(name, quote=True)}">下载音频</a></p>' for label, name in tracks if name)
    lyrics = "".join(f"<h3>{esc(s['label'])}</h3><p>" + "<br>".join(esc(line) for line in s["lyrics"]) + "</p>" for s in song["sections"] if s["lyrics"])
    page = f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(song['title'])} · 试听</title><style>body{{max-width:850px;margin:50px auto;padding:24px;background:#190e13;color:#f8eadb;font:17px/1.9 system-ui}}h1{{color:#ebc581}}audio{{width:100%}}a{{color:#ebc581}}p{{white-space:normal}}small{{color:#bdaba4}}</style><h1>{esc(song['title'])}</h1><p>{esc(song['subtitle'] if 'subtitle' in song else song['brief'])}</p><small>AI 生成演唱与编曲；歌词为原创纪念表达。版本：{esc(state['engine'])} / {esc(state['take'])}。歌词按段展示，不冒充已对齐字幕。</small>{players}<h2>歌词</h2>{lyrics}<p>试听重点：人名地名发音、歌词遗漏、主唱稳定性、副歌记忆点、段落衔接及自然收尾。</p></html>'''
    (folder / "listen.html").write_text(page, encoding="utf-8")


def process_master(folder):
    with run_lock(folder):
        state = read_json(folder / "run.json")
        if not state.get("audio_file"):
            raise WorkflowError("请先生成并下载候选音频。")
        source = folder / state["audio_file"]
        if file_digest(source) != state.get("audio_sha256"):
            raise WorkflowError("原始音频校验失败。")
        song = read_json(folder / "song.json")
        report = master_audio(source, folder, song["mastering"], find_ffmpeg(ROOT), duration(song))
        write_json(folder / "quality.json", report)
        state.update(status="mastered", master_wav="master.wav", master_mp3="master.mp3", master_sha256=file_digest(folder / "master.mp3"), mastered_at=now())
        # Re-mastering invalidates any old human approval, even if bytes coincide.
        state.pop("review", None)
        save_state(folder, state)
        listen_page(folder, song, state)
        print(f"已导出 WAV / MP3 和检测报告：{folder}\n技术检测：{'通过' if report['passed'] else '需处理'}；完整试听仍然必需。")


def review_run(args):
    folder = args.run.resolve()
    with run_lock(folder):
        state = read_json(folder / "run.json")
        if not state.get("master_mp3") or not (folder / "quality.json").is_file():
            raise WorkflowError("必须先完成 master。")
        if not args.listened or not args.lyrics_verified:
            raise WorkflowError("请完整试听并逐句核对歌词后，再传 --listened --lyrics-verified。")
        scores = {}
        for entry in args.score:
            key, sep, value = entry.partition("=")
            if not sep or key not in CRITERIA or key in scores or not value.isdigit() or not 0 <= int(value) <= 5:
                raise WorkflowError("评分格式：--score vocal=4；各维度只能出现一次，分值为 0—5。")
            scores[key] = int(value)
        if set(scores) != set(CRITERIA):
            raise WorkflowError("需要六项评分：" + ", ".join(CRITERIA))
        if file_digest(folder / state["master_mp3"]) != state["master_sha256"]:
            raise WorkflowError("试听文件已变化，请重新 master 和审核。")
        quality = read_json(folder / "quality.json")
        approved = quality["passed"] and scores["lyrics_accuracy"] == 5 and min(scores.values()) >= 4
        state["review"] = {"approved": approved, "scores": scores, "notes": args.notes, "listened": True, "lyrics_verified": True, "master_sha256": state["master_sha256"], "reviewed_at": now()}
        state["status"] = "approved" if approved else "needs_revision"
        save_state(folder, state)
        print("试听记录已保存：" + ("通过，可导出到项目。" if approved else "需要修改；保留原版供比较。"))


def publish(folder):
    with run_lock(folder):
        state = read_json(folder / "run.json")
        if not state.get("review", {}).get("approved"):
            raise WorkflowError("尚未通过试听审核，不能作为最终歌曲导入项目。")
        if file_digest(folder / "master.mp3") != state["review"]["master_sha256"]:
            raise WorkflowError("审核后音频发生变化，需重新试听。")
        song = read_json(folder / "song.json")
        # Versioned exports preserve earlier accepted versions.
        destination = ROOT / "public/audio" / song["slug"] / folder.name
        destination.mkdir(parents=True, exist_ok=True)
        for name in ("master.mp3", "master.wav", "listen.html", "quality.json"):
            shutil.copy2(folder / name, destination / name)
        # Published page contains only the final master; no private provider URL.
        listen_page(destination, song, {**state, "audio_file": None})
        (destination / "lyrics.txt").write_text(lyrics_text(song), encoding="utf-8")
        write_json(destination / "credits.json", {"title": song["title"], "description": "原创纪念歌词；AI 生成演唱与编曲", "provider": "fal", "model": state["endpoint"], "source_audio_sha256": state["audio_sha256"], "master_sha256": state["master_sha256"], "review": state["review"], "exported_at": now()})
        state.update(status="published", export_directory=str(destination))
        save_state(folder, state)
        print(f"已导入项目素材目录：{destination}\n试听地址：/audio/{song['slug']}/{folder.name}/listen.html")


def parser():
    result = argparse.ArgumentParser(description="原创歌曲：歌词制作谱 → 真实演唱生成 → 试听 → 响度处理 → 项目导出")
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("doctor", help="检查环境，不请求收费接口")
    preparation = commands.add_parser("prepare", help="离线导出歌词、制作谱和请求")
    preparation.add_argument("--song", type=Path, default=DEFAULT_SONG)
    preparation.add_argument("--out", type=Path)
    generation = commands.add_parser("generate", help="提交一个收费候选；相同版本续接")
    generation.add_argument("--song", type=Path, default=DEFAULT_SONG)
    generation.add_argument("--engine", choices=ENGINES, default="minimax")
    generation.add_argument("--take", default="a")
    generation.add_argument("--seed", type=int, default=18960910)
    generation.add_argument("--wait-seconds", type=int, default=45)
    for name in ("resume", "master", "publish", "recover", "review"):
        command = commands.add_parser(name)
        command.add_argument("--run", type=Path, required=True, help="候选版本目录")
        if name == "resume":
            command.add_argument("--wait-seconds", type=int, default=45)
        if name == "recover":
            command.add_argument("--request-id", required=True)
            command.add_argument("--status-url", required=True)
            command.add_argument("--response-url", required=True)
        if name == "review":
            command.add_argument("--listened", action="store_true")
            command.add_argument("--lyrics-verified", action="store_true")
            command.add_argument("--score", action="append", default=[])
            command.add_argument("--notes", required=True)
    return result


def main():
    args = parser().parse_args()
    load_environment()
    try:
        if hasattr(args, "wait_seconds") and not 0 <= args.wait_seconds <= 3600:
            raise WorkflowError("wait-seconds 范围是 0—3600。")
        if args.command == "doctor":
            try:
                ffmpeg = find_ffmpeg(ROOT)
            except RuntimeError:
                ffmpeg = None
            print(json.dumps({"python": sys.version.split()[0], "FAL_KEY_configured": bool(os.environ.get("FAL_KEY", "").strip()), "ffmpeg": str(ffmpeg) if ffmpeg else None, "song_file": str(DEFAULT_SONG), "paid_api_called": False}, ensure_ascii=False, indent=2))
        elif args.command == "prepare":
            song = validate_song(read_json(args.song))
            prepare(song, args.out or OUTPUT / song["slug"] / "prepared")
        elif args.command == "generate":
            if not re.fullmatch(r"[a-z0-9-]{1,30}", args.take):
                raise WorkflowError("take 只允许 1—30 个小写字母、数字或连字符。")
            song = validate_song(read_json(args.song))
            generate(song, args.engine, args.take, args.seed, args.wait_seconds)
        elif args.command == "resume":
            with run_lock(args.run):
                finish_job(args.run, read_json(args.run / "run.json"), require_key(), args.wait_seconds)
        elif args.command == "recover":
            with run_lock(args.run):
                state = read_json(args.run / "run.json")
                if state["status"] not in {"submitting", "submission_unknown"}:
                    raise WorkflowError("只有提交结果不确定的任务需要 recover。")
                if not re.fullmatch(r"[A-Za-z0-9_-]+", args.request_id):
                    raise WorkflowError("无效任务编号。")
                for url in (args.status_url, args.response_url):
                    queue_url(url)
                    if f"/requests/{args.request_id}" not in urllib.parse.urlsplit(url).path:
                        raise WorkflowError("任务编号与队列地址不匹配。")
                state.update(status="queued", request_id=args.request_id, status_url=args.status_url, response_url=args.response_url)
                save_state(args.run, state)
                print("已恢复任务编号。现在可以 resume，不会重新提交生成请求。")
        elif args.command == "master":
            process_master(args.run)
        elif args.command == "review":
            review_run(args)
        elif args.command == "publish":
            publish(args.run)
        return 0
    except (WorkflowError, RuntimeError, OSError, ValueError, KeyError) as exc:
        # Network errors are sanitized at their boundary; no headers are logged.
        print(f"音乐工作流：{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
