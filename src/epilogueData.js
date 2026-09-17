import catalog from './epilogue-photos.json';
import cues from './epilogue-lyrics.json';
export const EPILOGUE_AUDIO = '/audio/iron-army-epilogue.mp3';
export const EPILOGUE_DURATION = 160.44;
export const chapters = [
  { id: 'war', start: 0, end: 40, title: '烽火铸魂', kicker: '以热血，铸就铁军风骨' },
  { id: 'foundation', start: 40, end: 88, title: '自立奠基', kicker: '建军兴业，自力更生' },
  { id: 'strength', start: 88, end: 128, title: '科技强军', kicker: '自主创新，跨越发展' },
  { id: 'legacy', start: 128, end: EPILOGUE_DURATION, title: '强军新篇', kicker: '接续奋斗，向强而行' },
];
export const photos = catalog;
export const lyrics = cues;
export const getPhotoIndex = (time) => Math.max(0, Math.min(photos.length - 1, Math.floor(time / 8)));
export const getChapter = (time) => chapters.find((chapter) => time >= chapter.start && time < chapter.end) || chapters.at(-1);
export function getLyricState(time) {
  const active = lyrics.findIndex((line) => time >= line.start && time < line.end);
  let center = active;
  if (center < 0) { center = lyrics.findLastIndex((line) => time >= line.start); }
  return { active, center: Math.max(0, center) };
}
