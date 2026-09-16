// Route in display space: numbered circles are the endpoints, not their geographic pins.
// Plan once at the minimum zoom, then scale the same route and callout positions.
// Zooming must never choose a different corridor or warp the route's control points.
export const MIN_MAP_SCALE = .7;
const GAP = 19;
const STEP = 5;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const number = value => Math.round(value * 100) / 100;
const pointText = p => `${number(p[0])},${number(p[1])}`;

function trim(points, amount) {
  let remaining = amount;
  for (let i = 1; i < points.length; i++) {
    const length = distance(points[i - 1], points[i]);
    if (length > remaining) return [mix(points[i - 1], points[i], remaining / length), ...points.slice(i)];
    remaining -= length;
  }
  return [];
}

function roundedPath(points, radius = 8) {
  if (points.length < 2) return { d: '', samples: [] };
  let d = `M${pointText(points[0])}`;
  const samples = [points[0]];
  const line = p => {
    const from = samples.at(-1), count = Math.max(1, Math.ceil(distance(from, p) / 2.5));
    for (let i = 1; i <= count; i++) samples.push(mix(from, p, i / count));
    d += ` L${pointText(p)}`;
  };
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const r = Math.min(radius, distance(a, b) / 3, distance(b, c) / 3);
    const enter = mix(b, a, r / (distance(a, b) || 1)), leave = mix(b, c, r / (distance(b, c) || 1));
    line(enter);
    d += ` Q${pointText(b)} ${pointText(leave)}`;
    for (let j = 1; j <= 6; j++) { const t = j / 6; samples.push(mix(mix(enter, b, t), mix(b, leave, t), t)); }
  }
  line(points.at(-1));
  return { d, samples };
}

function arc(a, b, bend) {
  const length = distance(a, b) || 1;
  const c = [(a[0] + b[0]) / 2 - (b[1] - a[1]) / length * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) / length * bend];
  const count = Math.max(20, Math.ceil((length + Math.abs(bend)) / 7));
  return Array.from({ length: count + 1 }, (_, i) => { const t = i / count; return mix(mix(a, c, t), mix(c, b, t), t); });
}

class Heap {
  items = [];
  push(item) {
    const a = this.items; a.push(item); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].cost <= item.cost) break; a[i] = a[p]; i = p; }
    a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let next = i * 2 + 1; if (next + 1 < a.length && a[next + 1].cost < a[next].cost) next++;
        if (a[next].cost >= last.cost) break;
        a[i] = a[next]; i = next;
      }
      a[i] = last;
    }
    return first;
  }
}

// A* is a fallback for crowded routes. Smooth arcs are preferred whenever clear.
function findCorridor(a, b, blocked, bounds) {
  const [left, top, right, bottom] = bounds;
  const columns = Math.ceil((right - left) / STEP) + 1, rows = Math.ceil((bottom - top) / STEP) + 1;
  const total = columns * rows;
  const position = id => [left + id % columns * STEP, top + Math.floor(id / columns) * STEP];
  const index = p => Math.round((p[1] - top) / STEP) * columns + Math.round((p[0] - left) / STEP);
  const start = index(a), end = index(b), costs = new Float64Array(total).fill(Infinity), previous = new Int32Array(total).fill(-1);
  const checked = new Int8Array(total), closed = new Uint8Array(total), heap = new Heap();
  const occupied = id => {
    if (id === start || id === end) return false;
    if (!checked[id]) checked[id] = blocked(position(id)) ? 1 : -1;
    return checked[id] === 1;
  };
  costs[start] = 0; heap.push({ id: start, cost: distance(a, b) });
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  while (heap.items.length) {
    const { id } = heap.pop(); if (closed[id]) continue;
    if (id === end) {
      const points = [b]; let cursor = previous[id];
      while (cursor !== -1 && cursor !== start) { points.push(position(cursor)); cursor = previous[cursor]; }
      points.push(a); points.reverse();
      // Remove stair stepping with line-of-sight simplification inside the free corridor.
      const simplified = [a]; let i = 0;
      while (i < points.length - 1) {
        let next = i + 1;
        for (let j = points.length - 1; j > i + 1; j--) {
          if (clearLine(points[i], points[j], blocked)) { next = j; break; }
        }
        simplified.push(points[next]); i = next;
      }
      return simplified;
    }
    closed[id] = 1;
    const x = id % columns, y = Math.floor(id / columns);
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
      const next = ny * columns + nx;
      if (closed[next] || occupied(next)) continue;
      if (dx && dy && (occupied(y * columns + nx) || occupied(ny * columns + x))) continue;
      const candidate = costs[id] + STEP * (dx && dy ? Math.SQRT2 : 1);
      if (candidate >= costs[next]) continue;
      costs[next] = candidate; previous[next] = id;
      heap.push({ id: next, cost: candidate + distance(position(next), b) });
    }
  }
  return null;
}

function clearLine(a, b, blocked) {
  const count = Math.max(1, Math.ceil(distance(a, b) / 2.5));
  for (let i = 0; i <= count; i++) if (blocked(mix(a, b, i / count))) return false;
  return true;
}

export function routeGeometry(route, scale = route.scale) {
  const factor = scale / route.scale;
  const points = route.points.map(point => [point[0] * factor, point[1] * factor]);
  const clipped = trim(trim(points, GAP).reverse(), GAP).reverse();
  return roundedPath(clipped, route.radius * factor);
}

// Preserve geographic pins while spreading the numbered callouts in dense clusters.
export function spreadNumberedNodes(nodes, width) {
  const points = nodes.map(node => [node.point[0] + node.offset[0], node.point[1] + node.offset[1]]);
  // Keep enough space for fixed-size circles and arrowheads even when zoomed out.
  const separation = (width <= 400 ? 55 : 51) / MIN_MAP_SCALE;
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j], d = distance(a, b);
      if (d >= separation) continue;
      const dx = d > .01 ? (b[0] - a[0]) / d : 1, dy = d > .01 ? (b[1] - a[1]) / d : 0;
      const shift = (separation - d + .1) / 2;
      a[0] -= dx * shift; a[1] -= dy * shift; b[0] += dx * shift; b[1] += dy * shift; moved = true;
    }
    for (const p of points) { p[0] = Math.max(24, Math.min(width - 24, p[0])); p[1] = Math.max(26, Math.min(474, p[1])); }
    if (!moved) break;
  }
  return nodes.map((node, i) => ({ ...node, offset: [points[i][0] - node.point[0], points[i][1] - node.point[1]] }));
}

export function planNumberedRoutes(nodes, { width, height = 500, scale = MIN_MAP_SCALE, compact = false, selectedId } = {}) {
  if (nodes.length < 2) return [];
  const ordered = [...nodes].sort((a, b) => a.number - b.number);
  const centers = ordered.map(node => ({ ...node, center: [(node.point[0] + node.offset[0]) * scale, (node.point[1] + node.offset[1]) * scale] }));
  const minX = Math.min(...centers.map(n => n.center[0])), maxX = Math.max(...centers.map(n => n.center[0]));
  const minY = Math.min(...centers.map(n => n.center[1])), maxY = Math.max(...centers.map(n => n.center[1]));
  const bounds = [Math.min(minX - 45, Math.max(8, minX - 120)), Math.min(minY - 45, Math.max(8, minY - 100)), Math.max(maxX + 45, Math.min(width * scale - 8, maxX + 160)), Math.max(maxY + 45, Math.min(height * scale - 8, maxY + 100))];
  const labels = centers.filter(node => !compact || node.id === selectedId).map(node => {
    const [x, y] = node.center, left = node.offset[0] < 0;
    const labelWidth = Math.max(node.city.length * 11, node.overseas ? node.date.length * 4.8 : 0);
    return [left ? x - 22 - labelWidth : x + 17, y - 10, left ? x - 17 : x + 22 + labelWidth, y + (node.overseas ? 22 : 11)];
  });
  const reserved = new Set(), routes = [];
  const key = (x, y) => `${Math.floor(x / 3)},${Math.floor(y / 3)}`;
  const reserve = samples => {
    for (const [x, y] of samples) for (let dx = -6; dx <= 6; dx += 3) for (let dy = -6; dy <= 6; dy += 3) if (dx * dx + dy * dy <= 36) reserved.add(key(x + dx, y + dy));
  };
  const legs = centers.slice(1).map((to, i) => ({ from: centers[i], to }));
  // Reserve short connections first, then send long journeys around the cluster.
  legs.sort((a,b) => distance(a.from.center, a.to.center) - distance(b.from.center, b.to.center));
  for (const { from, to } of legs) {
    const a = from.center, b = to.center;
    const blocked = p => {
      const [x, y] = p;
      if (x < bounds[0] || y < bounds[1] || x > bounds[2] || y > bounds[3]) return true;
      for (const node of centers) if (node.id !== from.id && node.id !== to.id && distance(p, node.center) < 23) return true;
      for (const [l,t,r,bottom] of labels) if (x >= l && x <= r && y >= t && y <= bottom) return true;
      // The common numbered circle provides a clear junction between adjacent legs.
      return distance(p, a) > GAP + 2 && distance(p, b) > GAP + 2 && reserved.has(key(x, y));
    };
    const make = points => ({ id: `${from.id}-${to.id}`, from, to, points, scale, radius: 8, gap: to.number - from.number > 1 });
    let chosen;
    const length = distance(a, b);
    for (const bend of [0,.15,-.15,.3,-.3,.5,-.5,.8,-.8,1.2,-1.2,1.8,-1.8].map(v => v * Math.min(length, 240))) {
      const route = make(arc(a, b, bend)), geometry = routeGeometry(route);
      if (geometry.samples.length && geometry.samples.every(p => !blocked(p))) { chosen = route; break; }
    }
    if (!chosen) {
      const corridor = findCorridor(a, b, blocked, bounds);
      if (corridor) {
        chosen = make(corridor);
        for (const radius of [8,4,0]) {
          chosen.radius = radius;
          if (routeGeometry(chosen).samples.every(p => !blocked(p))) break;
        }
      }
    }
    // Keep every numbered connection even if a very narrow viewport has no free corridor.
    if (!chosen) chosen = make(arc(a, b, Math.max(38, length * .45)));
    chosen.geometry = routeGeometry(chosen);
    reserve(chosen.geometry.samples);
    routes.push(chosen);
  }
  return routes.sort((a,b) => a.from.number - b.from.number);
}
