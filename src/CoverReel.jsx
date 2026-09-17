import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { media } from './media';
import './cover-reel.css';

// Each original photograph has its own scale, without cropping faces or inventing detail.
const slides = [
  { id: 'portrait', ratio: 1083 / 1600, width: '46vw', cap: '720px', mobile: '68vw', y: '-2%', drift: '-.4%' },
  { id: 'officers-1921', ratio: 1600 / 1202, width: '59vw', cap: '780px', mobile: '96vw', y: '0%', drift: '.4%' },
  { id: 'portrait-early', ratio: 960 / 1472, width: '40vw', cap: '570px', mobile: '64vw', y: '-2%', drift: '.3%' },
  { id: 'uniform', ratio: 342 / 500, width: '31vw', cap: '420px', mobile: '58vw', y: '0%', drift: '-.3%' },
  { id: 'snow-1938', ratio: 1600 / 1142, width: '61vw', cap: '1040px', mobile: '97vw', y: '-1%', drift: '-.4%' },
  { id: 'headquarters-1939', ratio: 377 / 300, width: '39vw', cap: '530px', mobile: '87vw', y: '0%', drift: '.3%' },
  { id: 'family-garden-1939', ratio: 960 / 780, width: '56vw', cap: '880px', mobile: '95vw', y: '0%', drift: '-.3%' },
  { id: 'family-1939', ratio: 960 / 742, width: '55vw', cap: '860px', mobile: '95vw', y: '0%', drift: '.3%' },
  { id: 'veterans-1940', ratio: 500 / 349, width: '46vw', cap: '670px', mobile: '95vw', y: '0%', drift: '-.4%' },
].map(slide => ({ ...slide, item: media[slide.id] }));
const HOLD = 3000;
const FADE = 800;
const wrap = index => (index % slides.length + slides.length) % slides.length;

function Frame({ slide, current, initial, onError }) {
  const [failed, setFailed] = useState(false);
  return <div className={`cover-frame ${current ? 'is-current' : 'is-previous'} ${initial ? 'is-initial' : ''}`} aria-hidden={!current} data-photo={slide.id}
    style={{ '--photo-ratio': slide.ratio, '--photo-width': slide.width, '--photo-cap': slide.cap, '--photo-mobile': slide.mobile, '--photo-y': slide.y, '--photo-drift': slide.drift }}>
    <div className="reel-photo">
      {!failed && <img className="cover-reel-image" src={slide.item.src} alt={slide.item.title} decoding="async" fetchPriority={initial ? 'high' : 'auto'} onError={() => { setFailed(true); if (current) onError(); }}/>}
    </div>
  </div>;
}

export default function CoverReel({ reducedMotion }) {
  const [scene, setScene] = useState({ index: 0, previous: null, serial: 0 });
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const request = useRef(0), cache = useRef(new Map()), failed = useRef(new Set());
  const timeLeft = useRef(HOLD), cycle = useRef(0);
  const playing = !paused && !hidden && !reducedMotion && scene.index !== null;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const load = useCallback(index => {
    if (cache.current.has(index)) return cache.current.get(index).promise;
    const entry = {};
    entry.promise = new Promise(resolve => {
      const picture = new Image();
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true; clearTimeout(timeout);
        picture.onload = picture.onerror = null;
        if (result === false) failed.current.add(index);
        if (result !== true) picture.src = '';
        resolve(result);
      };
      const timeout = setTimeout(() => finish(false), 6000);
      entry.cancel = () => finish(null);
      picture.onload = () => picture.decode().then(() => finish(true), () => finish(false));
      picture.onerror = () => finish(false);
      picture.src = slides[index].item.src;
    });
    cache.current.set(index, entry);
    return entry.promise;
  }, []);

  const change = useCallback(async (index, reason = 'manual', direction = 1) => {
    if (reason === 'manual') setPaused(true);
    const ticket = ++request.current;
    for (let step = 0; step < slides.length; step++) {
      const next = wrap(index + step * direction);
      if (failed.current.has(next)) continue;
      const ready = await load(next);
      if (ticket !== request.current || (reason === 'auto' && !playingRef.current) || ready === null) return;
      if (!ready) continue;
      setScene(previous => ({ index: next, previous: reducedMotion || failed.current.has(previous.index) ? null : previous.index, serial: previous.serial + 1 }));
      return;
    }
    if (ticket === request.current) setScene(previous => ({ index: null, previous: null, serial: previous.serial + 1 }));
  }, [load, reducedMotion]);

  useEffect(() => {
    const visibility = () => { ++request.current; setHidden(document.hidden); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      ++request.current;
      document.removeEventListener('visibilitychange', visibility);
      cache.current.forEach(entry => entry.cancel());
      cache.current.clear();
    };
  }, []);
  useEffect(() => {
    if (cycle.current !== scene.serial) { cycle.current = scene.serial; timeLeft.current = HOLD; }
    if (!playing) return;
    // Preload only the next usable photograph. Failed files are not retried in a loop.
    for (let step = 1; step < slides.length; step++) {
      const next = wrap(scene.index + step);
      if (!failed.current.has(next)) { load(next); break; }
    }
    const started = performance.now();
    const timer = setTimeout(() => change(scene.index + 1, 'auto'), timeLeft.current);
    return () => { clearTimeout(timer); timeLeft.current = Math.max(0, timeLeft.current - (performance.now() - started)); };
  }, [scene.index, scene.serial, playing, change, load]);
  useEffect(() => {
    if (scene.previous === null) return;
    const timer = setTimeout(() => setScene(value => ({ ...value, previous: null })), FADE);
    return () => clearTimeout(timer);
  }, [scene.serial]);

  const unavailable = scene.index === null;
  const slide = unavailable ? null : slides[scene.index];
  return <section className={`cover-reel ${playing ? 'is-playing' : 'is-paused'} ${reducedMotion ? 'reel-reduced' : ''}`} aria-label="历史照片轮播" aria-roledescription="轮播" data-current={slide?.id || 'unavailable'}
    onKeyDown={event => {
      if (!unavailable && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault(); const direction = event.key === 'ArrowLeft' ? -1 : 1;
        change(scene.index + direction, 'manual', direction);
      }
    }}>
    <div className="reel-screen" id="cover-photographs">
      {scene.previous !== null && scene.previous !== scene.index && <Frame key={slides[scene.previous].id} slide={slides[scene.previous]} current={false}/>}
      {slide && <Frame key={slide.id} slide={slide} current initial={scene.serial === 0} onError={() => { failed.current.add(scene.index); change(scene.index + 1, 'recover'); }}/>}
    </div>
    <div className="reel-dock">
      <div className="reel-caption" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        {slide ? <><span>{slide.item.date}</span><strong>{slide.item.title}</strong></> : <span>历史影像暂不可用，仍可进入展厅</span>}
      </div>
      <div className="reel-buttons">
        <button disabled={unavailable} onClick={() => change(scene.index - 1, 'manual', -1)} aria-controls="cover-photographs" aria-label="上一张历史照片"><ChevronLeft size={16}/></button>
        <button disabled={reducedMotion || unavailable} onClick={() => { ++request.current; setPaused(value => !value); }} aria-controls="cover-photographs" aria-label={reducedMotion ? '减少动效：自动播放已关闭' : paused ? '播放历史照片' : '暂停历史照片'}>{paused || reducedMotion ? <Play size={13}/> : <Pause size={13}/>}</button>
        <button disabled={unavailable} onClick={() => change(scene.index + 1)} aria-controls="cover-photographs" aria-label="下一张历史照片"><ChevronRight size={16}/></button>
      </div>
    </div>
  </section>;
}
