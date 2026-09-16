import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoPath } from 'd3-geo';
import { ArrowLeft, ArrowUpRight, Compass, Globe2, LocateFixed, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { allEvents, overseasEvents } from './history';
import { loadMap } from './mapData';
import { MIN_MAP_SCALE, planNumberedRoutes, routeGeometry, spreadNumberedNodes } from './mapRoutes';

const H = 500;
const provinceLabels = [
  ['四川', 103.1, 30.1], ['陕西', 108.5, 34.8], ['山西', 112.1, 37.3], ['河北', 115.7, 39.7],
  ['河南', 113.6, 33.7], ['山东', 118.1, 36.1], ['湖北', 111.9, 31.0], ['湖南', 111.7, 27.5],
  ['江西', 116.0, 27.0], ['安徽', 117.0, 32.3], ['江苏', 119.8, 33.0], ['浙江', 120.2, 28.9],
  ['福建', 118.0, 25.7], ['广东', 113.0, 24.3], ['广西', 108.5, 24.0], ['贵州', 106.9, 26.7],
  ['云南', 102.0, 24.4], ['海南', 109.7, 19.2], ['台湾', 121.0, 23.7],
];
const globalLabels = [['欧 洲', 12, 60], ['亚 洲', 80, 48], ['中 国', 102, 34], ['俄 罗 斯', 81, 60], ['印 度', 78, 22]];

const identity = () => ({ k: 1, x: 0, y: 0 });
const overseasOffsets = { 'moscow-study': [-25, -23], 'moscow-1928': [25, 20], europe: [-22, -16] };
const compactOverseasOffsets = { 'moscow-study': [-20, -30], 'moscow-1928': [24, 18], europe: [-10, 30] };

// This layer never changes while dragging: only its parent transform is updated.
const Geography = memo(function Geography({ paths, chinaOnly }) {
  return <g className="geography" aria-hidden="true">
    {!chinaOnly && <path d={paths.grid} fill="none" stroke="#c9a577" strokeWidth=".6" strokeDasharray="3 5" opacity=".14"/>}
    {paths.world.map(p => <path key={p.id} d={p.d} className="world-land"/>)}
    {paths.china.map(p => <path key={p.id} d={p.d} className="china-land"/>)}
  </g>;
});

export default function MapAtlas({ period, selected, onSelect, mode, setMode, showRoutes, focusRequest, reducedMotion, onInteract, paused }) {
  const [data, setData] = useState({}), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [W, setW] = useState(900);
  const containerRef = useRef(null), svgRef = useRef(null), cameraRef = useRef(null), routeRef = useRef(null);
  const routeElements = useRef([]), renderedScale = useRef(null);
  const paintRoutes = scale => {
    if (renderedScale.current === scale) return;
    for (let i = 0; i < routePlan.length; i++) {
      const route = routePlan[i], elements = routeElements.current[i];
      if (!elements) continue;
      const geometry = scale === route.scale ? route.geometry : routeGeometry(route, scale);
      elements.forEach(node => node.setAttribute('d', geometry.d));
    }
    renderedScale.current = scale;
    routeRef.current?.setAttribute('data-layout-scale', String(scale));
  };
  const anchors = useRef([]), callouts = useRef([]), view = useRef(identity()), savedViews = useRef(new Map());
  const drag = useRef(null), animation = useRef(null), moveFrame = useRef(null), idleTimer = useRef(null);
  const currentKey = `${period.id}:${mode}:${W}`;
  const viewKey = useRef(currentKey), actions = useRef({ onInteract });
  actions.current = { onInteract };
  const cancelMovement = () => {
    cancelAnimationFrame(animation.current); cancelAnimationFrame(moveFrame.current); moveFrame.current = null;
    clearTimeout(idleTimer.current); containerRef.current?.classList.remove('map-moving');
  };
  const paintView = (next) => {
    view.current = next;
    cameraRef.current?.setAttribute('transform', `translate(${next.x},${next.y}) scale(${next.k})`);
    svgRef.current?.setAttribute('data-view', `${next.k},${next.x},${next.y}`);
    routeRef.current?.setAttribute('transform', `translate(${next.x},${next.y})`);
    paintRoutes(next.k);
    for (const { node, x, y } of anchors.current) node.setAttribute('transform', `translate(${x * next.k + next.x},${y * next.k + next.y})`);
    for (const { node, leader, x, y } of callouts.current) {
      node.setAttribute('transform', `translate(${x * next.k},${y * next.k})`);
      leader.setAttribute('x2', x * next.k); leader.setAttribute('y2', y * next.k);
    }
  };
  const markMoving = () => {
    if (!containerRef.current?.classList.contains('map-moving')) containerRef.current?.classList.add('map-moving');
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { containerRef.current?.classList.remove('map-moving'); }, 140);
  };
  const queueView = (next) => {
    view.current = next;
    if (moveFrame.current !== null) return;
    moveFrame.current = requestAnimationFrame(() => { moveFrame.current = null; paintView(view.current); markMoving(); });
  };
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (height > 0) setW(Math.round(H * width / height));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    const names = mode === 'china' ? ['china'] : ['china', 'world'];
    Promise.all(names.map(async name => [name, await loadMap(name)]))
      .then(entries => { if (!cancelled) setData(previous => ({ ...previous, ...Object.fromEntries(entries) })); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [mode, retry]);
  const projection = useMemo(() => mode === 'eurasia'
    ? geoMercator().center([68, 43]).scale(Math.max(85, Math.min((W - 60) / 2.15, 320))).translate([W * .66, H / 2 + 15])
    : geoMercator().center([111.5, 31.5]).scale(Math.min(980, W * 1.35)).translate([W * (W > 600 ? .6 : .5), H / 2]), [mode, W]);
  const paths = useMemo(() => {
    if (!data.china || (mode === 'eurasia' && !data.world)) return null;
    const path = geoPath(projection);
    return {
      world: mode === 'eurasia' ? data.world.features.filter(f => !['CHN', 'TWN'].includes(f.properties.ADM0_A3)).map((f, i) => ({ id: i, d: path(f) })) : [],
      china: data.china.features.map((f, i) => ({ id: i, d: path(f) })),
      grid: mode === 'eurasia' ? path(geoGraticule10()) : null,
    };
  }, [data, projection, mode]);
  const events = useMemo(() => mode === 'eurasia' ? overseasEvents : period.events.filter(event => !event.overseas), [period, mode]);
  const routeNodes = useMemo(() => spreadNumberedNodes(events.map(event => ({ ...event, point: projection(event.coords), number: allEvents.findIndex(e => e.id === event.id) + 1,
    offset: mode === 'eurasia' ? (W <= 400 ? compactOverseasOffsets : overseasOffsets)[event.id] : event.offset,
  })), W), [events, projection, mode, W]);
  const routePlan = useMemo(() => planNumberedRoutes(routeNodes, { width: W, height: H, compact: mode === 'china' && W <= 400, selectedId: selected.id }), [routeNodes, W, mode, selected.id]);
  const displayedEvents = [...events].sort((a, b) => Number(a.id === selected.id) - Number(b.id === selected.id));
  useLayoutEffect(() => {
    if (viewKey.current !== currentKey) {
      savedViews.current.set(viewKey.current, view.current);
      cancelMovement(); drag.current = null;
      view.current = savedViews.current.get(currentKey) || identity(); viewKey.current = currentKey;
    }
    anchors.current = [...(svgRef.current?.querySelectorAll('[data-map-x]') || [])].map(node => ({ node, x: Number(node.dataset.mapX), y: Number(node.dataset.mapY) }));
    callouts.current = [...(svgRef.current?.querySelectorAll('[data-callout-x]') || [])].map(node => ({ node, leader: node.parentElement.querySelector('.marker-leader'), x: Number(node.dataset.calloutX), y: Number(node.dataset.calloutY) }));
    routeElements.current = [...(routeRef.current?.querySelectorAll('[data-route-from]') || [])].map(node => [...node.querySelectorAll('path')]);
    renderedScale.current = null;
    paintView(view.current);
  }, [currentKey, paths, selected.id, period.id, showRoutes]);
  const animateTo = (target) => {
    cancelMovement();
    if (reducedMotion || document.hidden || paused) { paintView(target); return; }
    const from = view.current, start = performance.now();
    const frame = now => {
      const t = Math.min((now - start) / 500, 1), ease = 1 - (1 - t) ** 3;
      paintView({ k: from.k + (target.k - from.k) * ease, x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease });
      if (t < 1) animation.current = requestAnimationFrame(frame);
      else { containerRef.current?.classList.remove('map-moving'); }
    };
    containerRef.current?.classList.add('map-moving');
    animation.current = requestAnimationFrame(frame);
  };
  useEffect(() => {
    if (focusRequest) { const p = projection(selected.coords); animateTo({ k: 1.1, x: W / 2 - p[0] * 1.1, y: H / 2 - p[1] * 1.1 }); }
    return () => cancelAnimationFrame(animation.current);
  }, [focusRequest, mode, W, period.id]);
  const zoom = factor => {
    actions.current.onInteract?.(); cancelMovement();
    const v = view.current, k = Math.max(MIN_MAP_SCALE, Math.min(4, v.k * factor));
    paintView({ k, x: W / 2 - (W / 2 - v.x) * k / v.k, y: H / 2 - (H / 2 - v.y) * k / v.k }); markMoving();
  };
  useEffect(() => {
    const el = containerRef.current;
    const wheel = event => {
      if (!event.target.closest('.atlas-svg')) return;
      event.preventDefault(); actions.current.onInteract?.(); cancelAnimationFrame(animation.current);
      const v = view.current, k = Math.max(MIN_MAP_SCALE, Math.min(4, v.k * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
      queueView({ k, x: W / 2 - (W / 2 - v.x) * k / v.k, y: H / 2 - (H / 2 - v.y) * k / v.k });
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [W, routePlan]);
  useEffect(() => { if (paused) cancelMovement(); }, [paused]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) { cancelMovement(); drag.current = null; } };
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelMovement(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const pendingLocate = useRef(false);
  const locate = () => {
    onInteract?.();
    const nextMode = selected.overseas ? 'eurasia' : 'china';
    if (mode !== nextMode) { pendingLocate.current = true; setMode(nextMode); return; }
    const p = projection(selected.coords), k = view.current.k;
    animateTo({ k, x: W / 2 - p[0] * k, y: H / 2 - p[1] * k });
  };
  useEffect(() => { if (pendingLocate.current) { pendingLocate.current = false; locate(); } }, [mode, projection]);
  const startDrag = event => {
    if (event.target.closest('[data-marker]') || event.button !== 0) return;
    onInteract?.(); cancelMovement();
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, ratio: W / svgRef.current.getBoundingClientRect().width, ...view.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = event => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    queueView({ k: d.k, x: d.x + (event.clientX - d.startX) * d.ratio, y: d.y + (event.clientY - d.startY) * d.ratio });
  };
  const stopDrag = () => { if (drag.current) paintView(view.current); drag.current = null; };
  const changeMode = next => { if (next !== mode) { cancelMovement(); setMode(next); } };
  const labels = mode === 'china' ? [...provinceLabels, ['东 海', 125, 27]] : globalLabels;
  return <div ref={containerRef} className={`map-canvas ${mode}`}>
    <div className="map-view-switch" aria-label="地图范围">
      <button className={mode === 'china' ? 'active' : ''} onClick={() => changeMode('china')}>{mode === 'eurasia' && <ArrowLeft size={13}/>}中国</button>
      <button className={mode === 'eurasia' ? 'active' : ''} aria-expanded={mode === 'eurasia'} aria-controls="overseas-journeys" onClick={() => changeMode(mode === 'eurasia' ? 'china' : 'eurasia')}><Globe2 size={13}/>海外足迹</button>
    </div>
    {mode === 'eurasia' && <aside id="overseas-journeys" className="overseas-journeys" aria-label="海外足迹选择">
      <div className="overseas-heading"><span>跨越山海的求索</span><button className="icon-button" aria-label="返回中国地图" onClick={() => changeMode('china')}><X size={16}/></button></div>
      {overseasEvents.map(event => <button key={event.id} data-overseas={event.id} className={`overseas-event ${selected.id === event.id ? 'active' : ''}`} onClick={() => onSelect(event.id)}>
        <span className="overseas-date">{event.date}</span><strong>{event.city}<span>{event.tag}</span></strong><ArrowUpRight size={17}/>
      </button>)}
    </aside>}
    {error ? <div className="map-status" role="alert"><Compass size={30}/><p>地图暂未加载成功，仍可通过下方时间轴阅读事迹。</p><button className="text-button" onClick={() => setRetry(v => v + 1)}>重新加载 <RotateCcw size={14}/></button></div> : !paths ? <div className="map-status"><Compass size={30}/><p>正在展开历史地图…</p></div> :
      <svg ref={svgRef} className="atlas-svg" tabIndex={0} data-view="1,0,0" viewBox={`0 0 ${W} ${H}`} aria-label={`${mode === 'eurasia' ? '海外足迹' : period.title}交互地图，可拖动平移，通过右下角按钮缩放`}
        onKeyDown={event => { const direction = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] }[event.key]; if (event.target === event.currentTarget && direction) { event.preventDefault(); onInteract?.(); cancelMovement(); const v = view.current; paintView({ ...v, x: v.x + direction[0], y: v.y + direction[1] }); } }}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
        <defs><marker id="route-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M.5,1 L7,4 L.5,7 L2.1,4Z" fill="#ffda8f"/></marker></defs>
        <g ref={cameraRef} transform="translate(0,0) scale(1)">
          <Geography paths={paths} chinaOnly={mode === 'china'}/>
        </g>
        {showRoutes && <g ref={routeRef} className="routes" key={`${mode}-${period.id}`} aria-label="按编号排列的事件路线">
          {routePlan.map(({ from, to, gap }, i) => <g key={`${from.id}-${to.id}`} data-route-from={from.number} data-route-to={to.number} className={`route-leg ${gap ? 'route-gap' : ''} ${selected.id === from.id || selected.id === to.id ? 'route-current' : ''}`}>
            <title>{`${String(from.number).padStart(2, '0')} ${from.city} → ${String(to.number).padStart(2, '0')} ${to.city}${gap ? '；虚线衔接当前视图中的事件，中间编号见其他地图或时期' : ''}`}</title>
            <path className="route-casing"/>
            <path className="route-path" pathLength={gap ? undefined : 1} style={{ animationDelay: `${i * 70}ms` }} markerEnd="url(#route-arrow)"/>
          </g>)}
        </g>}
        {labels.map(([label, lon, lat]) => { const p = projection([lon, lat]); return <g key={label} data-map-x={p[0]} data-map-y={p[1]}><text className={`province-label ${mode === 'eurasia' ? 'world-label' : ''}`}>{label}</text></g>; })}
        {displayedEvents.map(event => {
          const p = projection(event.coords), active = event.id === selected.id;
          const offset = routeNodes.find(node => node.id === event.id).offset;
          const index = allEvents.findIndex(e => e.id === event.id);
          const labelLeft = offset[0] < 0;
          return <g key={event.id} data-map-x={p[0]} data-map-y={p[1]} data-marker={event.id} className={`map-marker ${active ? 'selected' : ''} ${mode === 'china' && W <= 400 ? 'compact-marker' : ''}`} role="button" tabIndex={0} aria-pressed={active} aria-label={`${event.city}，${event.date}，${event.title}`} onClick={() => onSelect(event.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(event.id); } }}>
            <title>{event.date} · {event.city} · {event.title}</title>
            <line x1="0" y1="0" x2={offset[0]} y2={offset[1]} className="marker-leader"/>
            <circle cx="0" cy="0" r="2.5" className="coordinate-dot"/>
            <g data-callout-x={offset[0]} data-callout-y={offset[1]} transform={`translate(${offset})`}>
              {active && <circle r="22" className="marker-halo"/>}
              <circle r="19" fill="transparent"/>
              <circle r={active ? 13 : 10} className="marker-circle"/>
              <text y=".5" className="marker-number">{String(index + 1).padStart(2, '0')}</text>
              <text x={labelLeft ? -19 : 19} y="4" textAnchor={labelLeft ? 'end' : 'start'} className="marker-label">{event.city}{mode === 'eurasia' && <tspan className="overseas-marker-date" x={labelLeft ? -19 : 19} dy="13">{event.date}</tspan>}</text>
            </g>
          </g>;
        })}
      </svg>}
    <div className="map-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 28 40"><path d="M14 1L23 33L14 26L5 33Z" fill="#f3c587"/><path d="M14 1L14 26L5 33Z" fill="#c88666"/></svg></div>
    <div className="map-controls">
      <button onClick={() => zoom(1.3)} aria-label="放大地图" title="放大"><Plus size={17}/></button>
      <button onClick={() => zoom(1 / 1.3)} aria-label="缩小地图" title="缩小"><Minus size={17}/></button>
      <button onClick={locate} aria-label="定位当前事件" title="定位当前事件"><LocateFixed size={17}/></button>
      <button onClick={() => { onInteract?.(); cancelMovement(); paintView(identity()); }} aria-label="重置地图" title="重置地图"><RotateCcw size={15}/></button>
    </div>
  </div>;
}
