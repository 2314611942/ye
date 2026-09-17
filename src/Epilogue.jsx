import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import RedStar from './RedStar';
import { EPILOGUE_AUDIO, EPILOGUE_DURATION, chapters, photos, lyrics, getPhotoIndex, getChapter, getLyricState } from './epilogueData';
import './epilogue.css';

const clock = (time) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

function PhotoStage({ time, playing, reducedMotion }) {
  const desired = getPhotoIndex(time);
  const [layers, setLayers] = useState([]);
  const failed = useRef(new Set());
  useEffect(() => {
    let cancelled = false;
    const item = photos[desired];
    if (failed.current.has(item.id)) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      // Decode before replacing the visible frame, including after a large seek.
      try { await image.decode(); }
      catch { if (!cancelled) failed.current.add(item.id); return; }
      if (!cancelled) setLayers((previous) => previous.at(-1)?.id === item.id ? previous : reducedMotion ? [item] : [...previous.slice(-1), item]);
    };
    image.onerror = () => failed.current.add(item.id);
    image.src = item.src;
    return () => { cancelled = true; image.onload = image.onerror = null; };
  }, [desired, reducedMotion]);
  useEffect(() => {
    if (layers.length < 2) return;
    const timer = setTimeout(() => setLayers((current) => current.slice(-1)), 1100);
    return () => clearTimeout(timer);
  }, [layers]);
  useEffect(() => {
    const preload = photos.slice(desired + 1, desired + 3).filter((p) => !failed.current.has(p.id)).map((p) => { const img = new Image(); img.src = p.src; return img; });
    return () => { preload.forEach((img) => { img.onload = img.onerror = null; }); };
  }, [desired]);
  const shown = layers.at(-1);
  return <div className={`epilogue-photography ${playing ? 'is-playing' : ''}`} data-photo={shown?.id || 'background'}>
    {layers.map((item) => <figure className={`epilogue-photo ${item.historic ? 'historic' : ''} ${item.contain ? 'archive-scale' : ''} ${item.mobileContain ? 'mobile-contain' : ''}`} key={item.id} style={{ '--photo-position': item.position, '--photo-mobile-position': item.mobilePosition, '--pan': reducedMotion ? 1 : 1 + Math.min(1, Math.max(0, (time - item.start) / 8)) * .015 }}>
      <img src={item.src} alt={item.title} decoding="sync" draggable="false"/>
    </figure>)}
    <div className="epilogue-photo-shade"/>
    {shown && <div className="epilogue-photo-caption"><span>{shown.yearLabel}</span><p>{shown.title}</p></div>}
  </div>;
}

export default function Epilogue({ onClose, initialVolume, reducedMotion }) {
  const dialog = useRef(null), audio = useRef(null), alive = useRef(false), mainButton = useRef(null);
  const [stage, setStage] = useState('ready');
  const [time, setTime] = useState(0), [duration, setDuration] = useState(EPILOGUE_DURATION);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [volume, setVolume] = useState(initialVolume);
  const [error, setError] = useState('');
  const chapter = getChapter(time), lyric = getLyricState(time);
  useEffect(() => {
    alive.current = true;
    const element = dialog.current, track = audio.current;
    element.showModal();
    const visibility = () => { if (document.hidden) { track.pause(); setPlaying(false); } };
    document.addEventListener('visibilitychange', visibility);
    return () => { alive.current = false; track.pause(); track.removeAttribute('src'); track.load(); element.close(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { audio.current.volume = volume; audio.current.muted = muted; }, [volume, muted]);
  useEffect(() => { if (stage === 'final') mainButton.current?.focus(); else if (stage === 'playing') dialog.current?.focus(); }, [stage]);
  const finish = () => { audio.current.pause(); setPlaying(false); setTime(duration); setStage('final'); setError(''); };
  const play = async () => {
    const track = audio.current;
    setError('');
    // Set the source here: no request or autoplay before the visitor starts.
    if (!track.getAttribute('src')) track.src = EPILOGUE_AUDIO;
    try { await track.play(); if (alive.current && !document.hidden) setPlaying(!track.paused); else track.pause(); }
    catch (e) { if (alive.current && e.name !== 'AbortError') { setPlaying(false); setError(e.name === 'NotAllowedError' ? '请点击播放，继续这一篇章。' : '歌曲暂时无法加载，请重试。'); } }
  };
  const begin = (withSound) => { audio.current.muted = !withSound; audio.current.volume = volume; setMuted(!withSound); setStage('playing'); setTime(0); if (audio.current.readyState) audio.current.currentTime = 0; play(); };
  const toggle = () => { if (playing) { audio.current.pause(); setPlaying(false); } else play(); };
  const retry = () => { audio.current.load(); play(); };
  const seek = (value) => { const next = Math.max(0, Math.min(duration, value)); if (next >= duration) { finish(); return; } if (audio.current.readyState) { audio.current.currentTime = next; setTime(next); } };
  const leave = () => { audio.current.pause(); onClose(); };
  const keyDown = (e) => {
    if (e.key === 'Tab') {
      const focusable = [...dialog.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      return;
    }
    if (stage !== 'playing' || /INPUT|BUTTON/.test(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seek(time + (e.key === 'ArrowRight' ? 5 : -5)); }
  };
  return <dialog ref={dialog} className={`epilogue state-${stage} ${reducedMotion ? 'motion-reduced' : ''}`} aria-labelledby="epilogue-title" onCancel={(e) => { e.preventDefault(); leave(); }} onKeyDown={keyDown} tabIndex={-1}>
    <audio ref={audio} preload="none" onTimeUpdate={() => setTime(audio.current.currentTime)} onLoadedMetadata={() => { if (Number.isFinite(audio.current.duration)) setDuration(audio.current.duration); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={finish} onError={() => { if (alive.current && audio.current.getAttribute('src')) { setError('歌曲暂时无法加载，请重试。'); setPlaying(false); } }}/>
    <div className="epilogue-landscape" aria-hidden="true"/>
    {stage !== 'ready' && <PhotoStage time={time} playing={playing} reducedMotion={reducedMotion}/>}
    <div className="epilogue-vignette" aria-hidden="true"/>
    <header className="epilogue-header"><div className="epilogue-identity"><RedStar/><span>铁军精神<span className="epilogue-separator"> / </span>山河新篇</span></div><button className="epilogue-back" onClick={leave}><ArrowLeft size={16}/><span>返回展厅</span></button></header>
    {stage === 'ready' && <main className="epilogue-ready">
      <div className="epilogue-overline"><i/>终章 · 山河为证<i/></div>
      <h1 id="epilogue-title">山河<span>新篇</span></h1>
      <p className="epilogue-dedication">从烽火中走来，向科技强军迈进</p>
      <div className="epilogue-chapters" aria-label="四个篇章">{chapters.map((c) => <span key={c.id}>{c.title}</span>)}</div>
      <div className="epilogue-start-actions"><button className="epilogue-primary" autoFocus onClick={() => begin(true)}><Play size={17} fill="currentColor"/>开启声音并播放<ArrowRight size={18}/></button><button className="epilogue-quiet" onClick={() => begin(false)}><VolumeX size={16}/>静音观看</button></div>
      <span className="epilogue-runtime">一曲致敬 · 2 分 40 秒</span>
    </main>}
    {stage === 'playing' && <>
      <h1 id="epilogue-title" className="sr-only">铁军精神 · 山河新篇</h1>
      <div key={chapter.id} className={`epilogue-chapter-title ${playing ? '' : 'is-paused'}`}><span>{chapter.kicker}</span><h2>{chapter.title}</h2><i/></div>
      {error && <div className="epilogue-error" role="alert"><p>{error}</p><button onClick={retry}><RotateCcw size={16}/>重试播放</button></div>}
      <footer className="epilogue-player">
        <div className="epilogue-seek"><span>{clock(time)}</span><input type="range" aria-label="结语播放进度" min="0" max={duration} step=".1" value={time} onChange={(e) => seek(Number(e.target.value))} style={{ '--progress': `${time / duration * 100}%` }}/><span>{clock(duration)}</span></div>
        <div className="epilogue-controls"><div className="epilogue-player-left"><button className="epilogue-play" aria-label={playing ? '暂停结语' : '播放结语'} onClick={toggle}>{playing ? <Pause size={19}/> : <Play size={19}/>}</button><button aria-label={muted ? '开启结语声音' : '静音结语'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button><input className="epilogue-volume" type="range" aria-label="结语音量" min="0" max="1" step=".01" value={volume} onChange={(e) => setVolume(Number(e.target.value))}/></div><span className="epilogue-current-chapter">{chapter.title}</span><button className="epilogue-skip" onClick={finish}><span>跳至结尾</span><SkipForward size={16}/></button></div>
      </footer>
    </>}
    {stage !== 'ready' && <div className={`epilogue-lyrics ${lyric.active < 0 ? 'instrumental' : ''}`} aria-label="同步歌词" aria-hidden={stage === 'final' ? true : undefined} data-active-line={lyric.active}>
      <div className="epilogue-lyric-track" style={{ '--lyric-index': lyric.center }}>{lyrics.map((line, i) => <p className={i === lyric.active ? 'current' : ''} key={i} aria-hidden={Math.abs(i - lyric.center) > 1}>{line.text}</p>)}</div>
    </div>}
    {stage === 'final' && <main className="epilogue-finale"><div className="epilogue-overline"><i/>山河锦绣 · 薪火不息<i/></div><h1 id="epilogue-title"><span>传承铁军精神</span><strong>矢志强军报国</strong></h1><div className="epilogue-finale-rule"/><div className="epilogue-final-actions"><button ref={mainButton} className="epilogue-primary" onClick={() => begin(!muted)}><RotateCcw size={17}/>重新播放</button><button className="epilogue-quiet" onClick={leave}>返回展厅<ArrowRight size={17}/></button></div></main>}
  </dialog>;
}
