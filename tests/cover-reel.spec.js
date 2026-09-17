import { test, expect } from '@playwright/test';
import { media } from '../src/media.js';

const sequence = ['portrait','officers-1921','portrait-early','uniform','snow-1938','headquarters-1939','family-garden-1939','family-1939','veterans-1940'];
async function clock(page) {
  await page.clock.install({time:new Date('2026-09-17T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-17T00:01:00Z'));
}
async function cover(page, reducedMotion = 'no-preference') {
  await page.emulateMedia({reducedMotion});
  await page.goto('/?cover=1');
  await page.getByLabel('访问密码',{exact:true}).fill('yanan');
  await page.getByRole('button',{name:'验证并进入'}).click();
  await expect(page.locator('.cover-reel')).toBeVisible();
}

test('九张原照每3秒切换、27秒循环，图注匹配且最多两层、不自动发声', async ({page}) => {
  await clock(page); let audioRequests=0;
  page.on('request',r=>{if(r.url().includes('/audio/')) audioRequests++;});
  await cover(page);
  const reel=page.locator('.cover-reel');
  const started=await page.evaluate(()=>Date.now());
  for (let index=0;index<sequence.length;index++) {
    const id=sequence[index];
    await expect(reel).toHaveAttribute('data-current',id);
    await expect(page.locator('.reel-caption strong')).toHaveText(media[id].title);
    await expect(page.locator('.reel-caption>span')).toHaveText(media[id].date);
    await expect(page.locator('.cover-frame.is-current img')).toHaveAttribute('src',media[id].src);
    expect(await page.locator('.cover-frame').count()).toBeLessThanOrEqual(2);
    await page.clock.runFor(2999);
    await expect(reel).toHaveAttribute('data-current',id);
    await expect(page.locator('.cover-frame')).toHaveCount(1);
    await page.clock.runFor(1);
    await expect(reel).toHaveAttribute('data-current',sequence[(index+1)%9]);
    expect(await page.locator('.cover-frame.is-current').evaluate(el=>getComputedStyle(el).animationDuration)).toBe('0.8s');
  }
  expect(await page.evaluate(()=>Date.now())-started).toBe(27000);
  expect(audioRequests).toBe(0);
  await page.getByRole('button',{name:'静音进入',exact:true}).click();
  await expect(reel).toHaveCount(0);
  await page.clock.fastForward(30000);
  await expect(page.locator('.exhibit.entered')).toBeVisible();
});

test('暂停接续剩余时间，手动与键盘翻阅后暂停，连续操作保持两层以内', async ({page}) => {
  await clock(page); await cover(page);
  const reel=page.locator('.cover-reel');
  await page.clock.runFor(1500);
  await page.getByRole('button',{name:'暂停历史照片'}).click();
  await page.clock.fastForward(20000);
  await expect(reel).toHaveAttribute('data-current','portrait');
  await page.getByRole('button',{name:'播放历史照片',exact:true}).click();
  await page.clock.runFor(1499);
  await expect(reel).toHaveAttribute('data-current','portrait');
  await page.clock.runFor(1);
  await expect(reel).toHaveAttribute('data-current','officers-1921');
  await page.getByRole('button',{name:'下一张历史照片'}).click();
  await expect(reel).toHaveAttribute('data-current','portrait-early');
  await expect(page.getByRole('button',{name:'播放历史照片',exact:true})).toBeVisible();
  await page.clock.fastForward(10000);
  await expect(reel).toHaveAttribute('data-current','portrait-early');
  await page.getByRole('button',{name:'下一张历史照片'}).press('ArrowLeft');
  await expect(reel).toHaveAttribute('data-current','officers-1921');
  for (const id of ['portrait-early','uniform','snow-1938']) {
    await page.getByRole('button',{name:'下一张历史照片'}).click();
    await expect(reel).toHaveAttribute('data-current',id);
    expect(await page.locator('.cover-frame').count()).toBeLessThanOrEqual(2);
  }
});

test('减少动效时静止，失败照片按顺序跳过，支持反向环绕', async ({page}) => {
  await clock(page);
  await page.route('**/images/archive/officers-1921.jpg',r=>r.abort());
  await cover(page,'reduce');
  await page.clock.fastForward(20000);
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','portrait');
  await page.getByRole('button',{name:'下一张历史照片'}).click();
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','portrait-early');
  await expect(page.locator('.cover-frame')).toHaveCount(1);
  await page.getByRole('button',{name:'上一张历史照片'}).click();
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','portrait');
  await page.getByRole('button',{name:'上一张历史照片'}).click();
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','veterans-1940');
  expect(await page.locator('.cover-reel-image').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('全部历史照片和背景失败时保留静态底色与可用入口', async ({page}) => {
  await page.route('**/images/archive/*.jpg',r=>r.abort());
  await page.route('**/images/cover/*.webp',r=>r.abort());
  await cover(page);
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','unavailable');
  await expect(page.locator('.cover-frame')).toHaveCount(0);
  await expect(page.locator('.reel-caption')).toContainText('仍可进入展厅');
  await expect(page.locator('#entrance-title')).toBeVisible();
  await page.getByRole('button',{name:'静音进入',exact:true}).click();
  await expect(page.locator('.exhibit.entered')).toBeVisible();
});

test('后台暂停后按剩余时间恢复，下一张预加载不批量请求', async ({page}) => {
  await clock(page);
  const requests=new Set();
  page.on('request',r=>{const id=sequence.find(id=>r.url().endsWith(`/archive/${id}.jpg`));if(id)requests.add(id);});
  await cover(page);
  await expect.poll(()=>requests.size).toBe(2);
  await page.clock.runFor(1000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(20000);
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','portrait');
  expect(requests.size).toBe(2);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(1999);
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','portrait');
  await page.clock.runFor(1);
  await expect(page.locator('.cover-reel')).toHaveAttribute('data-current','officers-1921');
});

for (const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390},{width:640,height:360}]) {
  test(`${viewport.width}×${viewport.height}九张封面图的题字、图注与触控入口可用`,async({page})=>{
    await page.setViewportSize(viewport);await cover(page,'reduce');
    await page.locator('.cover-art img').evaluate(img=>img.decode());
    const art=await page.locator('.cover-art img').evaluate(img=>img.currentSrc);
    expect(art.includes('-mobile.webp')).toBe(viewport.width<=640);
    for(const id of sequence){
      await expect(page.locator('.cover-reel')).toHaveAttribute('data-current',id);
      await expect(page.locator('.reel-caption strong')).toHaveText(media[id].title);
      await page.locator('.cover-frame.is-current img').evaluate(img=>img.decode());
      for(const name of ['上一张历史照片','下一张历史照片','开启声音并进入','静音进入']){
        const button=page.getByRole('button',{name,exact:true});await expect(button).toBeInViewport();
        const rect=await button.boundingBox();expect(rect.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.locator('.epic-entrance').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      await expect(page.locator('.cover-poem')).toBeInViewport();
      const overlap=await page.evaluate(()=>{
        const title=document.querySelector('#entrance-title').getBoundingClientRect(),dock=document.querySelector('.reel-dock').getBoundingClientRect();
        return title.left<dock.right&&title.right>dock.left&&title.top<dock.bottom&&title.bottom>dock.top;
      });expect(overlap).toBe(false);
      await page.getByRole('button',{name:'下一张历史照片'}).click();
    }
  });
}
