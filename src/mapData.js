import { geoArea } from 'd3-geo';

// Share requests across StrictMode mounts and cache normalized geometry.
const cache = new Map();
export function loadMap(name) {
  if (!cache.has(name)) {
    const request = fetch(`/data/${name}.json`).then(async (response) => {
      if (!response.ok) throw new Error('地图加载失败');
      const data = await response.json();
      for (const feature of data.features) {
        if (geoArea(feature) <= Math.PI * 2) continue;
        const geometry = feature.geometry;
        if (geometry.type === 'Polygon') geometry.coordinates.forEach(ring => ring.reverse());
        if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(polygon => polygon.forEach(ring => ring.reverse()));
      }
      return data;
    }).catch(error => { cache.delete(name); throw error; });
    cache.set(name, request);
  }
  return cache.get(name);
}
