// Real-time, uncut playback check. Requires a running local site and Chrome.
import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    sessionStorage.setItem('yeting-access-v1', 'granted');
    sessionStorage.setItem('yeting-entered', 'yes');
  });
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');
  await page.locator('.ending-entry').click();
  await page.evaluate(() => {
    window.playbackCheck = { photos: [], lines: [], chapters: [], maximumLayers: 0, startedAt: Date.now() };
    const add = (list, value) => { if (value != null && value !== '' && !list.includes(value)) list.push(value); };
    window.checkTimer = setInterval(() => {
      const report = window.playbackCheck;
      const line = document.querySelector('.epilogue-lyrics')?.dataset.activeLine;
      if (Number(line) >= 0 && line != null) add(report.lines, Number(line));
      const photo = document.querySelector('.epilogue-photography')?.dataset.photo;
      if (photo !== 'background') add(report.photos, photo);
      add(report.chapters, document.querySelector('.epilogue-current-chapter')?.textContent);
      report.maximumLayers = Math.max(report.maximumLayers, document.querySelectorAll('.epilogue-photo').length);
    }, 100);
  });
  await page.getByRole('button', { name: '开启声音并播放', exact: true }).click();
  await page.waitForSelector('.epilogue.state-final', { timeout: 180000 });
  const result = await page.evaluate(() => {
    clearInterval(window.checkTimer);
    const track = document.querySelector('.epilogue audio');
    return { ...window.playbackCheck, elapsedSeconds: (Date.now() - window.playbackCheck.startedAt) / 1000,
      audioDuration: track.duration, ended: track.ended, paused: track.paused, loop: track.loop,
      slogan: document.querySelector('.epilogue-finale h1').textContent };
  });
  assert.deepEqual(result.photos, JSON.parse(readFileSync('src/epilogue-photos.json')).map(p=>p.id));
  assert.deepEqual(result.lines, Array.from({ length: 34 }, (_, i) => i));
  assert.deepEqual(result.chapters, ['烽火铸魂', '自立奠基', '科技强军', '强军新篇']);
  assert.ok(result.maximumLayers <= 2);
  assert.ok(result.ended && result.paused && !result.loop);
  assert.ok(result.elapsedSeconds >= 160 && result.elapsedSeconds < 175);
  assert.equal(result.slogan, '传承铁军精神矢志强军报国');
  writeFileSync('docs/epilogue/playback-check.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
