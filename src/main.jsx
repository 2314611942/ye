import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, BookOpen, Check, ChevronRight, Flag, Pause, Play, Settings2, Star, Volume2, VolumeX } from 'lucide-react';
import MapAtlas from './MapAtlas';
import Entrance from './Entrance';
import AccessGate from './AccessGate';
import UniversityEmblem from './UniversityEmblem';
import ExhibitDialog, { ArchiveImage } from './ExhibitDialog';
import Particles from './Particles';
import { RedRibbons, YananSkyline } from './RedHeritage';
import { useSound } from './useSound';
import { allEvents, getEvent, getPeriod, periods } from './history';
import { media } from './media';
import './styles.css';
import './red-theme.css';
import './entrance.css';
const linkEvent = () => getEvent(new URLSearchParams(window.location.search).get('event'));
const sessionEntered = () => { try { return sessionStorage.getItem('yeting-entered') === 'yes'; } catch { return false; } };
function App() {
  const [selectedId, setSelectedId] = useState(() => linkEvent()?.id || 'birth');
  const selected = getEvent(selectedId), period = getPeriod(selectedId);
  const [entered, setEntered] = useState(() => Boolean(linkEvent()) || (new URLSearchParams(window.location.search).get('cover') !== '1' && sessionEntered()));
  const [panel, setPanel] = useState(() => linkEvent() ? 'story' : null);
  const [mode, setMode] = useState(() => selected.overseas ? 'eurasia' : 'china');
  const [playing, setPlaying] = useState(false), [focusRequest, setFocusRequest] = useState(0);
  const [showRoutes, setShowRoutes] = useState(true), [toast, setToast] = useState('');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sound = useSound(Boolean(panel));
  const timeline = useRef(null), toastTimer = useRef(null), enterButton = useRef(null);
  const setLink = (id) => { const url = new URL(window.location.href); if (id) url.searchParams.set('event', id); else url.searchParams.delete('event'); window.history.replaceState(null, '', url); };
  const notify = (text) => { clearTimeout(toastTimer.current); setToast(text); toastTimer.current = setTimeout(() => setToast(''), 3200); };
  const select = (id, open = true) => {
    const event = getEvent(id); if (!event) return;
    if (open) { setPlaying(false); setFocusRequest(0); setPanel('story'); sound.chime(); setLink(id); }
    setMode(event.overseas ? 'eurasia' : 'china');
    setSelectedId(id);
  };
  const switchPeriod = (id) => { const p = periods.find((p) => p.id === id); setPlaying(false); setFocusRequest(0); setSelectedId(p.events[0].id); setMode(p.events[0].overseas ? 'eurasia' : 'china'); setLink(null); sound.chime('period'); };
  const step = (direction) => { const next = allEvents[allEvents.findIndex((e) => e.id === selectedId) + direction]; if (next) select(next.id); };
  const close = () => { setPanel(null); setLink(null); };
  const enter = (withSound) => { const url = new URL(window.location.href); url.searchParams.delete('cover'); window.history.replaceState(null, '', url); try { sessionStorage.setItem('yeting-entered', 'yes'); } catch { /* Session storage may be unavailable. */ } if (withSound) sound.start(); setEntered(true); };
  const openPanel = (name) => { setPlaying(false); setPanel(name); };
  const shareUrl = new URL(window.location.href); shareUrl.searchParams.set('event', selectedId);
  const share = async () => { try { await navigator.clipboard.writeText(shareUrl.href); notify('事件链接已复制'); } catch { setPanel('share'); } };
  const toggleTour = () => { if (!playing) { if (selectedId === allEvents.at(-1).id) select('birth', false); setFocusRequest((n) => n + 1); } setPlaying(!playing); };
  useEffect(() => {
    if (!playing || panel || !entered) return;
    const timer = setTimeout(() => { const next = allEvents[allEvents.findIndex((e) => e.id === selectedId) + 1]; if (next) { select(next.id, false); setFocusRequest((n) => n + 1); } else { setPlaying(false); notify('二十处足迹，感谢与我们一同铭记。'); } }, 10000);
    return () => clearTimeout(timer);
  }, [playing, panel, selectedId, entered]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = (e) => setReducedMotion(e.matches);
    const visibility = () => { if (document.hidden) setPlaying(false); };
    const pop = () => { const event = linkEvent(); setPlaying(false); if (event) { setEntered(true); setSelectedId(event.id); setMode(event.overseas ? 'eurasia' : 'china'); setPanel('story'); } else setPanel(null); };
    query.addEventListener('change', change); document.addEventListener('visibilitychange', visibility); window.addEventListener('popstate', pop);
    return () => { query.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('popstate', pop); clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
    const container = timeline.current, node = container?.querySelector('[aria-current="step"]');
    if (node) container.scrollTo({ left: node.offsetLeft - container.offsetLeft - container.clientWidth / 2 + node.clientWidth / 2, behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [selectedId, reducedMotion, entered]);
  useEffect(() => { if (entered) { try { sessionStorage.setItem('yeting-entered', 'yes'); } catch {} if (!panel) enterButton.current?.focus(); } }, [entered]);
  return <div className={`exhibit ${panel ? 'reading' : ''} ${entered ? 'entered' : ''} mode-${mode}`}>
    <a className="skip-link" href="#event-timeline">跳转至事件时间轴</a>
    <div className="exhibit-space" inert={!entered ? true : undefined}>
      <header className="exhibit-header"><div className="brand"><UniversityEmblem/><div><strong>叶挺<span> · 生平足迹</span></strong></div></div>
        <nav className="period-tabs" role="tablist" aria-label="生平时期">{periods.map((p, i) => <button ref={i === 0 ? enterButton : null} key={p.id} id={`tab-${p.id}`} role="tab" title={p.rangeLabel} aria-selected={period.id === p.id} aria-controls="exhibition-map" tabIndex={period.id === p.id ? 0 : -1} onClick={() => switchPeriod(p.id)} onKeyDown={(e) => { let next; if (e.key === 'ArrowRight') next = (i + 1) % 3; if (e.key === 'ArrowLeft') next = (i + 2) % 3; if (e.key === 'Home') next = 0; if (e.key === 'End') next = 2; if (next !== undefined) { e.preventDefault(); switchPeriod(periods[next].id); document.getElementById(`tab-${periods[next].id}`).focus(); } }}><span>{p.number}</span><strong>{p.tab}</strong></button>)}</nav>
        <div className="header-actions"><button onClick={() => openPanel('spirit')} aria-label="精神丰碑" title="精神丰碑"><Flag size={17}/><span>精神丰碑</span></button><button onClick={() => openPanel('sources')} aria-label="史料文献" title="史料文献"><BookOpen size={17}/><span>史料文献</span></button><button className="icon-button" onClick={() => openPanel('settings')} aria-label="声音与展厅设置" title="声音与展厅设置"><Settings2 size={18}/></button></div>
      </header>
      <main id="exhibition-map" className="exhibition-map" role="tabpanel" aria-labelledby={`tab-${period.id}`}>
        <MapAtlas period={period} selected={selected} onSelect={(id) => select(id)} mode={mode} setMode={(m) => { setPlaying(false); setFocusRequest(0); setMode(m); }} showRoutes={showRoutes} focusRequest={focusRequest} reducedMotion={reducedMotion} onInteract={() => setPlaying(false)} paused={Boolean(panel)}/>
        <RedRibbons className="map-ribbons"/><YananSkyline className="map-skyline"/><Particles paused={Boolean(panel) || !entered || reducedMotion}/>
        <div className="map-chapter" key={`${period.id}-${mode}`}><span className="eyebrow"><i/>{mode === 'eurasia' ? '海外足迹' : period.chapter}</span><h1>{mode === 'eurasia' ? '海外求索' : period.title.split(' · ')[0]}<br/>{mode === 'eurasia' ? '心系家国' : period.title.split(' · ')[1]}<span>。</span></h1><div className="chapter-years">{mode === 'eurasia' ? '1924 — 1932' : period.years}</div></div>
        <button className="yanan-feature" onClick={() => select('yanan')} aria-label="走进延安：到访延安，重赴抗战征程"><ArchiveImage item={media['yanan-pagoda']} thumbnail/><span className="yanan-feature-star"><Star size={13} fill="currentColor"/></span><span className="yanan-feature-title">延安印记 <ArrowUpRight size={16}/></span></button>
        {playing && <button className="tour-caption" key={selectedId} onClick={() => select(selectedId)}><span><i/>正在导览 · 10 秒 / 站</span><strong>{selected.date} · {selected.city}</strong><p>{selected.title}<ArrowUpRight size={16}/></p><div className="tour-progress"/></button>}
      </main>
      <footer className="timeline-panel"><div className="timeline-lead"><strong>循迹山河</strong><button className={playing ? 'tour-button playing' : 'tour-button'} onClick={toggleTour}>{playing ? <Pause size={13}/> : <Play size={13}/>}<span>{playing ? '暂停导览' : '自动导览'}</span></button></div>
        <div id="event-timeline" className="timeline" ref={timeline} aria-label="本时期事件时间轴" tabIndex={-1}>{period.events.map((event, i) => <button key={event.id} data-event={event.id} aria-current={selectedId === event.id ? 'step' : undefined} onClick={() => select(event.id)}><span className="timeline-date">{event.date}</span><span className="timeline-line"><i/></span><strong>{event.city}{event.overseas && <ArrowUpRight size={11}/>}</strong></button>)}</div>
        <div className="timeline-tail"><button className="sound-button" onClick={() => sound.playing || sound.muted === false ? sound.toggleMute() : sound.start()} aria-label={sound.muted ? '开启展厅声音' : '全局静音'} title={sound.muted ? '开启展厅声音' : '全局静音'}>{sound.muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}<span>展厅声音</span><i className={!sound.muted && sound.playing ? 'on' : ''}/></button><button className="music-status" onClick={() => openPanel('settings')}>{sound.error ? '配乐暂不可用' : '声音设置'}<ChevronRight size={12}/></button></div>
      </footer>
    </div>
    {!entered && <Entrance onEnter={enter}/>}
    <ExhibitDialog panel={panel} event={selected} onClose={close} onStep={step} onOpenEvent={(id) => select(id)} sound={sound} reducedMotion={reducedMotion} setReducedMotion={setReducedMotion} showRoutes={showRoutes} setShowRoutes={setShowRoutes} onShare={share} shareUrl={shareUrl.href}/>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><AccessGate><App/></AccessGate></React.StrictMode>);
