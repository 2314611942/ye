import test from 'node:test';
import assert from 'node:assert/strict';
import { geoMercator } from 'd3-geo';
import { allEvents, overseasEvents, periods } from '../src/history.js';
import { planNumberedRoutes, routeGeometry, spreadNumberedNodes } from '../src/mapRoutes.js';
const offsets = { 'moscow-study': [-25,-23], 'moscow-1928': [25,20], europe: [-22,-16] };
const compactOffsets = { 'moscow-study': [-20,-30], 'moscow-1928': [24,18], europe: [-10,30] };
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
const minus = (a,b) => [a[0]-b[0],a[1]-b[1]];
function intersects(a,b,c,d) {
  const u=minus(b,a), v=minus(d,c), denominator=cross(u,v);
  if(Math.abs(denominator)<1e-7) return false;
  const w=minus(c,a), t=cross(w,v)/denominator, s=cross(w,u)/denominator;
  return t>1e-5 && t<1-1e-5 && s>1e-5 && s<1-1e-5;
}
function layout(width, mode, period) {
  const projection = mode==='china'
    ? geoMercator().center([111.5,31.5]).scale(Math.min(980,width*1.35)).translate([width*(width>600?.6:.5),250])
    : geoMercator().center([68,43]).scale(Math.max(85,Math.min((width-60)/2.15,320))).translate([width*.66,265]);
  const events=mode==='china'?period.events.filter(e=>!e.overseas):overseasEvents;
  return spreadNumberedNodes(events.map(event=>({...event,number:allEvents.indexOf(event)+1,point:projection(event.coords),offset:mode==='china'?event.offset:(width<=400?compactOffsets:offsets)[event.id]})),width);
}

test('三个篇章与海外视图按编号相连，同城事件不漏线，跨视图节点用虚线衔接',()=>{
  for(const period of periods) for(const mode of ['china','eurasia']) {
    const nodes=layout(1023,mode,period), routes=planNumberedRoutes([...nodes].reverse(),{width:1023});
    assert.deepEqual(routes.map(r=>[r.from.number,r.to.number]),nodes.slice(1).map((n,i)=>[nodes[i].number,n.number]));
    for(const route of routes) {
      assert.equal(route.gap,route.to.number-route.from.number>1);
      assert.ok(route.geometry.d.length>10);
      assert.ok(!/NaN|Infinity/.test(route.geometry.d));
    }
  }
});

test('宽窄地图与0.7—4倍缩放：路线彼此不相交，也不穿过其他编号圆点',()=>{
  for(const width of [1023,680,375,320,270]) {
    for(const mode of ['china','eurasia']) for(const period of mode==='china'?periods:[periods[1]]) {
      const nodes=layout(width,mode,period), plan=planNumberedRoutes(nodes,{width,compact:mode==='china'&&width<=400,selectedId:period.events[0].id});
      for(const scale of [.7,1,1.3,2,4]) {
        const routes=plan.map(route=>({...route,geometry:routeGeometry(route,scale)}));
        const context=`${width}px / ${scale} / ${mode} / ${period.id}`;
        for(const route of routes) {
          const points=route.geometry.samples;
          assert.ok(points.length>1,context);
          for(const node of nodes) {
            if([route.from.id,route.to.id].includes(node.id))continue;
            const center=[(node.point[0]+node.offset[0])*scale,(node.point[1]+node.offset[1])*scale];
            assert.ok(points.every(p=>distance(p,center)>=17),`${context}: ${route.from.number}→${route.to.number} overlaps ${node.number}`);
          }
        }
        for(let i=0;i<routes.length;i++)for(let j=i+1;j<routes.length;j++) {
          const a=routes[i].geometry.samples,b=routes[j].geometry.samples;
          for(let x=1;x<a.length;x++)for(let y=1;y<b.length;y++) assert.ok(!intersects(a[x-1],a[x],b[y-1],b[y]),`${context}: crossing ${routes[i].from.number} / ${routes[j].from.number}`);
        }
      }
    }
  }
});

test('手机选择不同事件时，显示的城市标签不会使连线穿过编号',()=>{
  for(const period of periods) {
    const nodes=layout(270,'china',period);
    for(const selected of nodes) {
      const routes=planNumberedRoutes(nodes,{width:270,compact:true,selectedId:selected.id});
      for(const route of routes)for(const node of nodes) {
        if([route.from.id,route.to.id].includes(node.id))continue;
        const center=[node.point[0]+node.offset[0],node.point[1]+node.offset[1]];
        assert.ok(routeGeometry(route,1).samples.every(p=>distance(p,center)>=17),`${selected.id}: ${route.id}`);
      }
    }
  }
});
