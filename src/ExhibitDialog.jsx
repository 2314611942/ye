import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Expand, ImageOff, MapPin, Pause, Play, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { allEvents, getPeriod, periodization, sources } from './history';
import { media } from './media';
import { YananSkyline } from './RedHeritage';
import UniversityEmblem from './UniversityEmblem';
export function ArchiveImage({ item, thumbnail = false, ...props }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.id, thumbnail]);
  return failed ? <div className="image-fallback" role="img" aria-label={`${item.title}，图片暂未加载`}><ImageOff size={28}/><span>影像暂未加载</span><small>图注与正文仍可阅读</small></div> : <img {...props} src={thumbnail ? item.thumb : item.src} alt={item.title} onError={() => setFailed(true)} decoding="async"/>;
}
function Credit({ item, compact = false }) {
  return <figcaption className="image-credit"><div><span className="media-type">{item.type}</span><span>{item.date}</span></div><strong>{item.title}</strong>{compact ? <details className="image-details"><summary>图片说明</summary><p>{item.caption}</p></details> : <p>{item.caption}</p>}</figcaption>;
}
function Reference({ source, number }) {
  return <div className="reference-card"><span className="ref-number">{String(number).padStart(2, '0')}</span><div><small>{source.kind}</small><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={13}/></a><p>{source.author} · {source.name}<br/>{source.date}</p></div></div>;
}
export default function ExhibitDialog({ panel, event, onClose, onStep, onOpenEvent, sound, reducedMotion, setReducedMotion, showRoutes, setShowRoutes, onShare, shareUrl }) {
  const ref = useRef(null), bodyRef = useRef(null), layoutRef = useRef(null), zoomClose = useRef(null), expandButton = useRef(null);
  const [picture, setPicture] = useState(0), [enlarged, setEnlarged] = useState(false), [activeRef, setActiveRef] = useState(null);
  const items = event.images.map((id) => media[id]);
  const item = items[picture] || items[0];
  const refs = [...new Set(event.sections.flatMap((s) => s.refs))];
  const index = allEvents.findIndex((e) => e.id === event.id);
  const turnImage = (n) => setPicture((v) => (v + n + items.length) % items.length);
  useEffect(() => { if (panel) ref.current.showModal(); else ref.current.close(); }, [panel]);
  useEffect(() => { setPicture(0); setActiveRef(null); setEnlarged(false); bodyRef.current?.scrollTo(0, 0); layoutRef.current?.scrollTo(0, 0); }, [event.id, panel]);
  useEffect(() => { if (enlarged) zoomClose.current?.focus(); }, [enlarged]);
  const closeImage = () => { setEnlarged(false); requestAnimationFrame(() => expandButton.current?.focus()); };
  const cancel = () => enlarged ? closeImage() : onClose();
  return <dialog ref={ref} className={`exhibit-dialog ${panel === 'story' ? 'story-dialog' : 'panel-dialog'}`} aria-labelledby="dialog-title" onCancel={(e) => { e.preventDefault(); cancel(); }} onClick={(e) => { if (e.target === e.currentTarget) cancel(); }} onKeyDown={(e) => {
    if (e.key === 'Tab') {
      const region = enlarged ? ref.current.querySelector('.lightbox') : ref.current.querySelector('.dialog-inner');
      const focusable = [...region.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]')].filter((node) => !node.closest('[inert]') && node.getClientRects().length && (node.checkVisibility ? node.checkVisibility() : getComputedStyle(node).visibility !== 'hidden'));
      const first = focusable[0], last = focusable.at(-1), current = document.activeElement;
      if (first && ((!e.shiftKey && (current === last || !region.contains(current))) || (e.shiftKey && (current === first || !region.contains(current))))) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    }
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (enlarged) { e.preventDefault(); turnImage(e.key === 'ArrowLeft' ? -1 : 1); } else if (panel === 'story') { e.preventDefault(); onStep(e.key === 'ArrowLeft' ? -1 : 1); } }
  }}>
    <div className="dialog-inner" inert={enlarged ? true : undefined}>
      <div className="dialog-top"><span><BookOpen size={15}/>{panel === 'story' ? `${getPeriod(event.id).chapter} / ${event.tag}` : '叶挺将军 · 数字展厅'}</span><button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={21}/></button></div>
      {panel === 'story' && <>
        <div className="story-layout" ref={layoutRef}>
          <div className="story-gallery"><figure><button ref={expandButton} className="feature-image" onClick={() => setEnlarged(true)} aria-label={`放大图片：${item.title}`}><ArchiveImage item={item}/>{item.type === 'AI 艺术示意' && <span className="art-badge">AI 艺术示意</span>}<span className="expand-hint"><Expand size={16}/> 查看大图</span></button><Credit item={item} compact/></figure>
            <div className="gallery-strip" aria-label="事件图集">{items.map((img, i) => <button key={img.id} aria-label={`图片 ${i + 1}：${img.title}`} aria-pressed={picture === i} onClick={() => setPicture(i)}><ArchiveImage item={img} thumbnail loading="lazy"/></button>)}<span>{String(picture + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span></div>
          </div>
          <article className="story-reading" ref={bodyRef} tabIndex={0} aria-label="展签正文">
            <div className="story-date">{event.date}</div><h2 id="dialog-title">{event.title}</h2><div className="story-location"><MapPin size={13}/>{event.location}</div>
            {event.sections.map((section, i) => <div className="story-section" key={section.title}><p>{section.text}<span className="citations">{section.refs.map((id) => <button key={id} aria-label={`查看引用 ${refs.indexOf(id) + 1}：${sources[id].title}`} aria-expanded={activeRef === `${i}:${id}`} onClick={() => setActiveRef(activeRef === `${i}:${id}` ? null : `${i}:${id}`)}>[{refs.indexOf(id) + 1}]</button>)}</span></p>{section.refs.map((id) => activeRef === `${i}:${id}` && <Reference key={id} source={sources[id]} number={refs.indexOf(id) + 1}/>)}</div>)}
            {event.quote && <blockquote className="document-quote"><span>文献摘引</span><p>{event.quote.text}</p><cite>{event.quote.label}</cite><a href={sources[event.quote.source].url} target="_blank" rel="noreferrer">查阅转引出处 ↗</a></blockquote>}
            {event.note && <details className="research-note"><summary>史料说明</summary><p>{event.note}</p></details>}
            <details className="event-references"><summary>本事件参考文献 · {refs.length} 篇</summary>{refs.map((id, i) => <Reference key={id} source={sources[id]} number={i + 1}/>)}</details>
          </article>
        </div>
        <div className="dialog-bottom"><button onClick={() => onStep(-1)} disabled={index === 0}><ArrowLeft size={16}/><span>上一事件</span></button><button className="story-share" onClick={onShare}><Share2 size={15}/><span>分享展签</span></button><span className="story-counter">{String(index + 1).padStart(2, '0')} / 20</span><button onClick={() => onStep(1)} disabled={index === allEvents.length - 1}><span>下一事件</span><ArrowRight size={16}/></button></div>
      </>}
      {panel === 'sources' && <article className="panel-content"><h2 id="dialog-title">史料文献</h2><details className="exhibition-note periodization-note"><summary>生平分期依据</summary><p>{periodization.text}</p>{periodization.refs.map((id, i) => <Reference key={id} source={sources[id]} number={i + 1}/>)}</details><div className="source-list">{Object.values(sources).map((source, i) => <Reference key={source.url} source={source} number={i + 1}/>)}</div><h3>展览影像</h3><div className="media-catalog">{Object.values(media).map((m) => <figure key={m.id}><ArchiveImage item={m} thumbnail loading="lazy"/><Credit item={m}/></figure>)}</div><details className="exhibition-note"><summary>展览说明</summary><p>正文依据所列文献撰写，历史影响部分包含策展解读。图片注明实际年代，遗址今照作为地点资料；AI 艺术示意不作为历史影像或史实依据。地图为现代地理底图，连线仅表示事件顺序；1937年以全面抗战爆发为篇章分界。</p></details><UniversityEmblem/></article>}
      {panel === 'spirit' && <article className="panel-content spirit-panel"><YananSkyline className="spirit-skyline"/><h2 id="dialog-title">山河铭记<br/>精神不朽<span>。</span></h2><blockquote>我应该在烈火和热血中<br/>得到永生！</blockquote><p>叶挺《囚歌》节选 · 据《学习时报》转引</p><div className="spirit-values"><div><strong>赤诚报国</strong><p>从求学救国到投身抗战，在时代的选择中承担责任。</p></div><div><strong>铮铮铁骨</strong><p>历经五年囚禁，以诗明志，守住人格与尊严。</p></div><div><strong>信仰如磐</strong><p>重获自由的第二天，再次郑重提出入党申请。</p></div></div><button className="primary-button" onClick={() => onOpenEvent('prison')}>走近《囚歌》背后的故事 <ArrowUpRight size={17}/></button></article>}
      {panel === 'settings' && <article className="panel-content settings-panel"><h2 id="dialog-title">声音与展厅设置</h2><div className="music-card"><span className={`sound-bars ${sound.playing && !sound.muted ? 'active' : ''}`} aria-hidden="true"><i/><i/><i/><i/><i/></span><div><strong>Reverie</strong><p>钢琴 · 弦乐</p></div><button className="icon-button" onClick={sound.toggle} aria-label={sound.playing ? '暂停音乐' : '播放音乐'}>{sound.playing ? <Pause/> : <Play/>}</button></div>{sound.error && <p role="status" className="audio-error">配乐暂时无法播放，仍可继续浏览。点击播放可重试。</p>}<label className="volume-row"><span>音乐音量 <b>{Math.round(sound.volume * 100)}%</b></span><input type="range" min="0" max="1" step=".01" value={sound.volume} onChange={(e) => sound.setVolume(Number(e.target.value))} aria-label="音乐音量"/></label><button className="setting-row" aria-pressed={sound.muted} onClick={sound.toggleMute}><span>{sound.muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}全局静音</span><i className={`toggle ${sound.muted ? 'on' : ''}`}/></button><button className="setting-row" aria-pressed={sound.effects} onClick={() => sound.setEffects(!sound.effects)}><span>交互音效</span><i className={`toggle ${sound.effects ? 'on' : ''}`}/></button><button className="setting-row" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}><span>减少动效</span><i className={`toggle ${reducedMotion ? 'on' : ''}`}/></button><button className="setting-row" aria-pressed={showRoutes} onClick={() => setShowRoutes(!showRoutes)}><span>显示轨迹连线</span><i className={`toggle ${showRoutes ? 'on' : ''}`}/></button></article>}
      {panel === 'share' && <article className="panel-content"><h2 id="dialog-title">分享这段历史</h2><p>复制链接，即可直接打开“{event.title}”展签。</p><input className="share-input" value={shareUrl} readOnly onFocus={(e) => e.target.select()} aria-label="事件分享链接"/><button className="primary-button" onClick={onShare}>复制链接 <Share2 size={16}/></button></article>}
    </div>
    {enlarged && <div className="lightbox" role="region" aria-label="图片放大浏览"><div className="lightbox-top"><span>{item.type} · {picture + 1} / {items.length}</span><button ref={zoomClose} className="icon-button" aria-label="关闭图片放大" onClick={closeImage}><X/></button></div><div className="lightbox-view"><button className="icon-button" onClick={() => turnImage(-1)} aria-label="上一张图片"><ChevronLeft/></button><ArchiveImage item={item}/><button className="icon-button" onClick={() => turnImage(1)} aria-label="下一张图片"><ChevronRight/></button></div><figure><Credit item={item} compact/></figure></div>}
  </dialog>;
}
