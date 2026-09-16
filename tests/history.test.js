import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const wordCopy = JSON.parse(readFileSync(new URL('../src/word-copy.json', import.meta.url), 'utf8'));
import { allEvents, periods, sources } from '../src/history.js';
import { media } from '../src/media.js';
const preservedIds = ['birth','baoding','guangzhou-early','moscow-study','zhaoqing','xianning','wuchang','nanchang-uprising','guangzhou-uprising','moscow-1928','europe','macau-return','shanghai-return','yanan','wuhan-headquarters','yansi','jingxian','prison','rejoin','heichashan'];
test('保留三个时期、全部20个事件与分享标识，年代和坐标有效', () => {
  assert.equal(periods.length, 3);
  assert.deepEqual(allEvents.map(e => e.id), preservedIds);
  for (const [i, event] of allEvents.entries()) {
    assert.ok(sources[event.source]?.url.startsWith('https://'), event.id);
    assert.equal(event.coords.length, 2);
    assert.ok(Math.abs(event.coords[0]) <= 180 && Math.abs(event.coords[1]) <= 90);
    if (i > 0) assert.ok(event.year >= allEvents[i - 1].year, event.id);
  }
  assert.ok(periods[0].events.every(e => e.year <= 1927));
  assert.ok(periods[1].events.every(e => e.year >= 1928 && e.year <= 1937));
  assert.ok(periods[2].events.every(e => e.year >= 1937));
});
test('每个展签与Word主稿一致，保留三个分节、可追溯引用和1—3张图片', () => {
  for (const e of allEvents) {
    assert.deepEqual(e.sections.map(s => s.title), ['历史背景','事件经过','历史影响']);
    const original = wordCopy.events[e.id];
    for (const key of ['title','date','location','sections','note','quote']) assert.deepEqual(e[key], original[key], `${e.id}: ${key}`);
    for (const section of e.sections) {
      assert.ok(section.refs.length > 0, e.id);
      for (const id of section.refs) {
        const source = sources[id]; assert.ok(source, `${e.id}: ${id}`);
        for (const key of ['title','author','name','date','kind','url']) assert.ok(source[key], `${id}: ${key}`);
        assert.equal(new URL(source.url).protocol, 'https:');
      }
    }
    assert.ok(e.images.length >= 1 && e.images.length <= 3, e.id);
    e.images.forEach(id => assert.ok(media[id], `${e.id}: ${id}`));
    if (e.quote) assert.ok(sources[e.quote.source]);
  }
});
test('至少12张不同影像、至少8张历史照片，每张有本地大小图和授权署名', () => {
  const entries = Object.values(media);
  assert.ok(entries.length >= 12);
  assert.ok(entries.filter(m => m.type === '历史原照').length >= 8);
  const hashes = new Set();
  for (const m of entries) {
    for (const key of ['title','date','caption','author','source','url','license','licenseUrl']) assert.ok(m[key], `${m.id}: ${key}`);
    for (const file of [m.src, m.thumb]) { const content = readFileSync(`public${file}`); assert.ok((content[0] === 255 && content[1] === 216) || (content.toString('ascii', 0, 4) === 'RIFF' && content.toString('ascii', 8, 12) === 'WEBP'), file); assert.ok(content.length > 1000); }
    hashes.add(createHash('sha256').update(readFileSync(`public${m.src}`)).digest('hex'));
    assert.ok(statSync(`public${m.thumb}`).size <= statSync(`public${m.src}`).size);
  }
  assert.equal(hashes.size, entries.length);
  assert.ok(statSync('public/audio/reverie.mp3').size > 1000000);
});
test('日期分歧、转引与代表地点均有明确说明', () => {
  assert.match(allEvents.find(e=>e.id==='yanan').note, /11月3日.*11月4日/);
  assert.match(allEvents.find(e=>e.id==='zhaoqing').note, /改称/);
  assert.match(allEvents.find(e=>e.id==='prison').note, /并非/);
  assert.match(allEvents.find(e=>e.id==='rejoin').quote.label, /转引/);
});

test('分期与艺术示意标识准确，原始照片保留', () => {
  assert.deepEqual(periods.map(p => p.events.length), [9, 4, 7]);
  assert.equal(periods[0].events.at(-1).id, 'guangzhou-uprising');
  assert.equal(periods[1].events.at(-1).id, 'shanghai-return');
  assert.equal(periods[2].events[0].id, 'yanan');
  const art = Object.values(media).filter(m => m.type === 'AI 艺术示意');
  assert.equal(art.length, 4);
  assert.equal(Object.values(media).filter(m => m.type === '历史原照').length, 9);
  for (const m of art) {
    assert.match(m.caption, /AI生成绘画/);
    assert.match(m.date, /创作/);
    assert.ok(allEvents.some(e => e.images[0] === m.id));
    assert.ok(statSync(`docs/generated-originals/${m.id}.png`).size > 1000);
  }
});

test('网页导入数据与指定Word原文件同步，分期沿用已确认的新分期', () => {
  assert.equal(createHash('sha256').update(readFileSync(wordCopy.document)).digest('hex'), wordCopy.sha256);
  assert.deepEqual(periods.map(p => p.events.length), [9,4,7]);
  assert.deepEqual(wordCopy.periods.map(p => p.eventIds.length), [7,6,7]);
});
