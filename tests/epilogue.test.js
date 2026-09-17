import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const lyrics = JSON.parse(readFileSync('src/epilogue-lyrics.json'));
const photos = JSON.parse(readFileSync('src/epilogue-photos.json'));
test('结语保留34句、两遍副歌及非均分的演唱时间轴', () => {
  assert.equal(lyrics.length, 34);
  const source = JSON.parse(execFileSync('python3', ['-c', "import json,runpy; from pathlib import Path; extract=runpy.run_path('scripts/align-epilogue.py')['extract_lyrics']; print(json.dumps(extract(Path('music/歌词.docx'))))"], { encoding: 'utf8' }));
  assert.deepEqual(lyrics.map(l=>l.text), source);
  assert.deepEqual(lyrics.slice(8,16).map(l=>l.text),lyrics.slice(24,32).map(l=>l.text));
  for (const [i, cue] of lyrics.entries()) {
    assert.ok(cue.start >= 0 && cue.end > cue.start && cue.end < 160.44);
    if(i) assert.ok(cue.start >= lyrics[i-1].end);
  }
  assert.ok(lyrics[0].start > 20); assert.ok(lyrics.at(-1).end < 155);
  assert.ok(new Set(lyrics.map(l=>Math.round((l.end-l.start)*10))).size > 10);
});
test('20张结语照片按四篇章编排，均为本地实拍素材并保留来源',()=>{
  assert.equal(photos.length,20); assert.equal(new Set(photos.map(p=>p.src)).size,20);
  for (const [i,p] of photos.entries()) {
    assert.equal(p.start,i*8); assert.ok(p.title && p.date && p.sourceUrl && p.author);
    assert.match(p.yearLabel, /^(?:约?\d{4}(?:—\d{4})?年(?:以前)?|抗战时期)$/);
    assert.ok(!p.type.includes('AI')); assert.ok(existsSync(`public${p.src}`));
    assert.ok(p.position && p.mobilePosition);
    assert.equal(createHash('sha256').update(readFileSync(`public${p.src}`)).digest('hex'),p.sha256);
  }
});
test('国防发展时间线保留全部9张原历史照片，明确年份依次推进',()=>{
  const previous=JSON.parse(readFileSync('docs/epilogue/previous-photos.json'));
  const originals=previous.filter(p=>p.historic);
  assert.equal(originals.length,9);
  for(const original of originals){
    const kept=photos.find(p=>p.id===original.id);
    assert.ok(kept,`保留老照片 ${original.id}`);
    assert.equal(kept.src,original.src);
    assert.equal(kept.sha256,original.sha256);
  }
  const years=photos.filter(p=>p.year!==null).map(p=>p.year);
  assert.deepEqual(years,[...years].sort((a,b)=>a-b));
  for(const id of ['atomic','dongfanghong','galaxy','parade1999','shenzhou','liaoning2012','supercomputer','beidou']){
    assert.ok(photos.some(p=>p.id===id),`国防建设节点 ${id}`);
  }
  assert.ok(photos.find(p=>p.id==='galaxy').title.includes('国防科大'));
  assert.ok(photos.find(p=>p.id==='supercomputer').title.includes('国防科大'));
  assert.ok(!photos.some(p=>['honor-guard','peace','mountains'].includes(p.id)));
  // Do not relabel later photographs as the day an achievement was first made.
  assert.equal(photos.find(p=>p.id==='supercomputer').year,2015);
  assert.equal(photos.find(p=>p.id==='dongfanghong').dateBasis,'milestone');
  assert.match(photos.find(p=>p.id==='liaoning2012').date,/2012年10月30日/);
});
test('结语音轨与用户提供的原始MP3逐字节一致',()=>{
 const hash=(p)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 assert.equal(hash('public/audio/iron-army-epilogue.mp3'),'a436c7994c38e87d337985b7a55ab413988afdb2cb2239b1bc4287225dba7d83');
 assert.equal(hash('music/135AE538-F1BD-44cc-B3B1-F39ADE04E032.mp3'),hash('public/audio/iron-army-epilogue.mp3'));
 assert.equal(hash('music/歌词.docx'),'565ed4d2ff34adb0f8a6436bd7a01376d76966b7ef55de0c6a8b720c38b64612');
});
