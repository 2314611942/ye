import { chromium } from '@playwright/test';
import { media } from '../src/media.js';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const decodeImage = async (selector) => {
  await page.locator(selector).waitFor();
  await page.locator(selector).evaluate(img => img.decode());
};
await page.goto(origin);
await page.getByLabel('访问密码', {exact:true}).waitFor();
await page.locator('.access-footer .red-star').evaluate(img=>img.decode());
await page.screenshot({path:'docs/preview-access.png'});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'docs/preview-access-mobile.png'});
await page.setViewportSize({width:1440,height:900});
await page.getByLabel('访问密码', {exact:true}).fill('yanan');
await page.getByRole('button', {name:'验证并进入',exact:true}).click();
await decodeImage('.cover-frame.is-current img');
await decodeImage('.cover-art img');
await page.screenshot({path:'docs/preview-entrance.png'});
for (const width of [390,320]) {
  await page.setViewportSize({width,height:width===390?844:740});
  await decodeImage('.cover-art img');
  await page.screenshot({path:`docs/preview-entrance-${width}.png`});
}
await page.setViewportSize({width:1440,height:900});
await page.getByRole('button',{name:'静音进入',exact:true}).click(); await page.locator('.china-land').first().waitFor(); await decodeImage('.yanan-feature img');
await page.screenshot({path:'docs/preview-map.png'});
const mapRatio = await page.locator('.exhibition-map').evaluate(el=>el.clientHeight/innerHeight);
await page.locator('[data-event="zhaoqing"]').click(); await decodeImage('.feature-image img'); await page.screenshot({path:'docs/preview-story.png'});
await page.keyboard.press('Escape');
await page.getByRole('button',{name:'海外足迹',exact:true}).click(); await page.locator('.world-land').first().waitFor();
await page.screenshot({path:'docs/preview-overseas.png'});
await page.locator('[data-overseas="europe"]').click(); await decodeImage('.feature-image img');
await page.screenshot({path:'docs/preview-artwork.png'}); await page.keyboard.press('Escape');
await page.setViewportSize({width:320,height:740});
await page.screenshot({path:'docs/preview-overseas-mobile.png'});
await page.getByRole('tab').first().click();
await page.setViewportSize({width:390,height:844});
await page.waitForFunction(()=>{const svg=document.querySelector('.atlas-svg'), rect=svg.getBoundingClientRect();return svg.getAttribute('viewBox') === `0 0 ${Math.round(500 * rect.width / rect.height)} 500`;});
await page.screenshot({path:'docs/preview-mobile.png'});
const assets = [...Object.values(media).flatMap(m=>[m.src,m.thumb]),'/data/china.json','/data/world.json','/audio/reverie.mp3','/images/identity/red-star.svg','/images/cover/epic-landscape.webp','/images/cover/epic-landscape-mobile.webp'];
for (const url of assets) { const response=await page.request.get(origin+url); if(!response.ok()) errors.push(`${url}: ${response.status()}`); }
console.log(JSON.stringify({origin,mapRatio,checkedAssets:assets.length,errors},null,2));
await browser.close(); if(errors.length) process.exitCode=1;
