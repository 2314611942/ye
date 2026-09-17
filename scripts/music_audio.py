"""FFmpeg audio validation and conservative, two-pass loudness mastering."""

import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess


def find_ffmpeg(root):
    configured = os.environ.get("MUSIC_FFMPEG", "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate.resolve())
        raise RuntimeError("MUSIC_FFMPEG 没有指向可执行的 FFmpeg 文件。")
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    binaries = sorted((Path(root) / ".music-tools/imageio_ffmpeg/binaries").glob("ffmpeg-*"))
    for binary in binaries:
        if binary.is_file() and os.access(binary, os.X_OK):
            return str(binary)
    raise RuntimeError("缺少 FFmpeg。运行 python3 -m pip install --target .music-tools imageio-ffmpeg==0.6.0，或设置 MUSIC_FFMPEG。")


def ffmpeg_run(binary, arguments):
    result = subprocess.run([str(binary), "-hide_banner", "-nostdin", *map(str, arguments)], capture_output=True, text=True, timeout=600)
    if result.returncode:
        raise RuntimeError("FFmpeg 处理失败：" + result.stderr[-1500:])
    return result


def verify_audio(path, binary):
    path = Path(path)
    if not path.is_file() or path.stat().st_size < 1024:
        raise RuntimeError("音频文件缺失或过小。")
    # Decode the full first audio stream: a JSON/HTML error page is never accepted.
    ffmpeg_run(binary, ["-v", "error", "-xerror", "-i", path, "-map", "0:a:0", "-f", "null", "-"])


def measure(path, binary, settings):
    chain = f"silencedetect=noise=-55dB:d=2,loudnorm=I={settings['integrated_lufs']}:TP={settings['true_peak_dbtp']}:LRA={settings['loudness_range_lu']}:print_format=json"
    result = ffmpeg_run(binary, ["-i", path, "-map", "0:a:0", "-af", chain, "-f", "null", "-"])
    matches = re.findall(r'\{\s*"input_i"[\s\S]*?\}', result.stderr)
    if not matches:
        raise RuntimeError("FFmpeg 未返回响度测量结果。")
    raw = json.loads(matches[-1])
    values = {key: float(raw[key]) for key in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")}
    if not all(math.isfinite(value) for value in values.values()):
        raise RuntimeError("音频为静音或不能可靠测量响度，不能导出为歌曲成品。")
    duration_match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not duration_match:
        raise RuntimeError("无法读取音频时长。")
    hours, minutes, seconds = map(float, duration_match.groups())
    length = hours * 3600 + minutes * 60 + seconds
    stream = re.search(r"Audio: ([^\n]+)", result.stderr)
    sample_rate_match = re.search(r"(\d+) Hz", stream.group(1) if stream else "")
    silences = [float(value) for value in re.findall(r"silence_duration: ([\d.]+)", result.stderr)]
    return {"duration_seconds": length, "sample_rate_hz": int(sample_rate_match.group(1)) if sample_rate_match else None, "integrated_lufs": values["input_i"], "true_peak_dbtp": values["input_tp"], "loudness_range_lu": values["input_lra"], "longest_silence_seconds": max(silences, default=0), "loudnorm": values}


def master_audio(source, output, settings, binary, target_duration):
    source, output = Path(source).resolve(), Path(output).resolve()
    if source.name in {"master.wav", "master.mp3"} and source.parent == output:
        raise RuntimeError("原始音频不能与导出文件同名。")
    output.mkdir(parents=True, exist_ok=True)
    verify_audio(source, binary)
    before = measure(source, binary, settings)
    if before["duration_seconds"] < 3:
        raise RuntimeError("音频不足 3 秒，不是完整候选歌曲。")
    measured = before["loudnorm"]
    # Do not force a dynamic recording into a smaller loudness range.
    lra = max(settings["loudness_range_lu"], measured["input_lra"])
    analysis_settings = {**settings, "loudness_range_lu": lra}
    if lra != settings["loudness_range_lu"]:
        before = measure(source, binary, analysis_settings)
        measured = before["loudnorm"]
    chain = (f"loudnorm=I={settings['integrated_lufs']}:TP={settings['true_peak_dbtp']}:LRA={lra}"
             f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
             f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
             f":offset={measured['target_offset']}:linear=true:print_format=json")
    wav_temp, mp3_temp = output / "master.working.wav", output / "master.working.mp3"
    try:
        rendering = ffmpeg_run(binary, ["-y", "-i", source, "-map", "0:a:0", "-af", chain, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", wav_temp])
        ffmpeg_run(binary, ["-y", "-i", wav_temp, "-map", "0:a:0", "-c:a", "libmp3lame", "-b:a", "320k", mp3_temp])
        verify_audio(wav_temp, binary)
        verify_audio(mp3_temp, binary)
        wav_stats = measure(wav_temp, binary, settings)
        mp3_stats = measure(mp3_temp, binary, settings)
        normalizations = re.findall(r'"normalization_type"\s*:\s*"([^"]+)"', rendering.stderr)
        checks = {
            "duration_matches_plan": target_duration * .8 <= before["duration_seconds"] <= target_duration * 1.2,
            "duration_preserved": abs(wav_stats["duration_seconds"] - before["duration_seconds"]) < .15,
            "wav_loudness": abs(wav_stats["integrated_lufs"] - settings["integrated_lufs"]) <= 1,
            "mp3_loudness": abs(mp3_stats["integrated_lufs"] - settings["integrated_lufs"]) <= 1,
            "wav_peak_headroom": wav_stats["true_peak_dbtp"] <= -1,
            "mp3_peak_headroom": mp3_stats["true_peak_dbtp"] <= -1,
            "no_long_silence": wav_stats["longest_silence_seconds"] <= 8,
        }
        report = {"passed": all(checks.values()), "checks": checks, "target": settings, "target_duration_seconds": target_duration, "original": before, "wav": wav_stats, "mp3": mp3_stats, "normalization_type": normalizations[-1] if normalizations else "unknown", "human_review_required": True, "notes": ["检测只覆盖音频技术指标，不证明歌词正确、演唱真实自然或音乐质量。", "48 kHz / 24-bit WAV 是编辑交付格式；不会增加上游音频已有的真实细节。", "未自动添加 EQ、去噪或压缩；先保留生成模型的音色与动态，再按试听问题定向处理。"]}
        wav_temp.replace(output / "master.wav")
        mp3_temp.replace(output / "master.mp3")
        return report
    finally:
        wav_temp.unlink(missing_ok=True)
        mp3_temp.unlink(missing_ok=True)
