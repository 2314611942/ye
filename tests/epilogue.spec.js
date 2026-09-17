import { test, expect } from '@playwright/test';
import { allEvents } from '../src/history.js';
import { readFileSync } from 'node:fs';
const photos = JSON.parse(readFileSync('src/epilogue-photos.json'));
const lyrics = JSON.parse(readFileSync('src/epilogue-lyrics.json'));
async function visit(page, url = '/') {
  await page.addInitScript(() => { sessionStorage.setItem('yeting-entered','yes'); });
  await page.goto(url);
  if (await page.locator('.access-gate').count()) { await page.getByLabel('访问密码',{exact:true}).fill('yanan'); await page.getByRole('button',{name:'验证并进入',exact:true}).click(); }
  await expect(page.locator('.exhibit.entered')).toBeVisible();
}
async function open(page) { await visit(page); await page.locator('.ending-entry').click(); await expect(page.locator('.epilogue-ready')).toBeVisible(); }
async function start(page, sound=false) { await page.getByRole('button',{name:sound?'开启声音并播放':'静音观看',exact:true}).click(); await expect.poll(()=>page.locator('.epilogue audio').evaluate(a=>a.readyState)).toBeGreaterThan(0); }
async function seek(page, time) { await page.locator('.epilogue audio').evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'));},time); }
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});
test('准备页无预加载歌曲，静音由音频时钟驱动，Esc恢复地图视角与焦点',async({page})=>{
 let requested=0;page.on('request',r=>{if(r.url().includes('iron-army-epilogue'))requested++;});
 await visit(page); await page.getByRole('button',{name:'放大地图',exact:true}).click();const view=await page.locator('.atlas-svg').getAttribute('data-view');
 await page.locator('.ending-entry').click();expect(requested).toBe(0);await expect(page.locator('.exhibit-space')).toHaveAttribute('inert','');
 await start(page); expect(await page.locator('.epilogue audio').evaluate(a=>a.muted)).toBe(true);
 await page.getByRole('button',{name:'暂停结语',exact:true}).click();await seek(page,73);
 await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',photos[9].id);
 await expect(page.locator('.epilogue-current-chapter')).toHaveText('自立奠基');
 await page.keyboard.press('Escape'); await expect(page.locator('.epilogue')).toHaveCount(0); await expect(page.locator('.atlas-svg')).toHaveAttribute('data-view',view);await expect(page.locator('.ending-entry')).toBeFocused();
});
test('末尾展签与悬浮入口都进入结语，最终标语停留且可以重播',async({page})=>{
 await visit(page,`/?event=${allEvents.at(-1).id}`);await page.locator('.dialog-bottom').getByRole('button',{name:'观看结语',exact:true}).click();await start(page,true);
 await page.getByRole('button',{name:'跳至结尾'}).click(); await expect(page.locator('.epilogue-finale h1')).toHaveText('传承铁军精神矢志强军报国');
 expect(await page.locator('.epilogue audio').evaluate(a=>a.paused)).toBe(true);await expect(page.getByRole('button',{name:'重新播放'})).toBeFocused();
 await page.getByRole('button',{name:'重新播放'}).click();await expect(page.locator('.epilogue.state-playing')).toBeVisible();expect(await page.locator('.epilogue audio').evaluate(a=>a.currentTime)).toBeLessThan(2);
 await page.getByRole('button',{name:'暂停结语'}).click();await page.locator('.epilogue audio').evaluate(a=>a.dispatchEvent(new Event('ended')));await expect(page.locator('.epilogue-finale')).toBeVisible();
});
test('导览完成第20站后进入准备页，不自动播放歌曲',async({page})=>{
 await page.clock.install();await visit(page,`/?event=${allEvents.at(-2).id}`);await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();await page.getByRole('button',{name:'自动导览',exact:true}).click();
 await page.clock.fastForward(10000);await expect(page.locator('.tour-caption')).toContainText(allEvents.at(-1).city);
 await page.clock.fastForward(10000);await expect(page.locator('.epilogue-ready')).toBeVisible();expect(await page.locator('.epilogue audio').evaluate(a=>a.getAttribute('src'))).toBeNull();
});
test('20张照片、四篇章与34句歌词随音频时间一一对应，间奏不提前高亮',async({page})=>{
 test.setTimeout(60000);await open(page);await start(page);await page.getByRole('button',{name:'暂停结语'}).click();
 for (const p of photos) {await seek(page,p.start+1);await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',p.id);await expect(page.locator('.epilogue-photo img')).toHaveAttribute('alt',p.title);await page.locator('.epilogue-photo img').evaluate(img=>img.decode());expect(await page.locator('.epilogue-photo img').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);await expect(page.locator('.epilogue-photo-caption span')).toHaveText(p.yearLabel);await expect(page.locator('.epilogue-photo-caption p')).toHaveText(p.title);expect(await page.locator('.epilogue-photo').count()).toBeLessThanOrEqual(2);}
 for(const [time,title] of [[0,'烽火铸魂'],[40,'自立奠基'],[88,'科技强军'],[128,'强军新篇']]){await seek(page,time);await expect(page.locator('.epilogue-current-chapter')).toHaveText(title);}
 for(const [i,l] of lyrics.entries()){await seek(page,l.start+.1);await expect(page.locator('.epilogue-lyrics')).toHaveAttribute('data-active-line',String(i));await expect(page.locator('.epilogue-lyric-track .current')).toHaveText(l.text);}
 for(const t of [0,lyrics[15].end+.1,lyrics[23].end+.1,lyrics.at(-1).end+1]){await seek(page,t);await expect(page.locator('.epilogue-lyric-track .current')).toHaveCount(0);}
 const slider=page.getByRole('slider',{name:'结语播放进度'});await slider.focus();await page.keyboard.press('Home');await expect.poll(()=>page.locator('.epilogue audio').evaluate(a=>a.currentTime)).toBeLessThan(1);
 await page.keyboard.press('ArrowRight');await expect.poll(()=>page.locator('.epilogue audio').evaluate(a=>a.currentTime)).toBeGreaterThan(0);
});
test('展厅配乐与提示音挂起，后台不恢复，退出后恢复原配乐意图',async({page})=>{
 await page.addInitScript(()=>{const Native=window.Audio;window.__tracks=[];window.Audio=class extends Native{constructor(...args){super(...args);window.__tracks.push(this);}};});
 await visit(page);await page.getByRole('button',{name:'开启展厅声音',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__tracks.at(-1).paused)).toBe(false);
 await page.locator('.ending-entry').click();await expect.poll(()=>page.evaluate(()=>window.__tracks.at(-1).paused)).toBe(true);await start(page,true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.getByRole('button',{name:'播放结语',exact:true})).toBeVisible();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.evaluate(()=>window.__tracks.at(-1).paused)).toBe(true);expect(await page.locator('.epilogue audio').evaluate(a=>a.paused)).toBe(true);
 await page.getByRole('button',{name:'播放结语',exact:true}).click();await expect.poll(()=>page.locator('.epilogue audio').evaluate(a=>a.paused)).toBe(false);
 await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.__tracks.at(-1).paused)).toBe(false);
});
test('正常动效最多两张叠化，仅预加载后两张，坏图保留上一张且后续恢复',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const requested=new Set();page.on('request',r=>{if(r.url().includes('/images/epilogue/'))requested.add(new URL(r.url()).pathname);});
 await page.route(`**${photos[2].src}`,r=>r.abort());
 await open(page);expect(requested.size).toBe(0);await start(page);
 await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',photos[0].id);
 await expect.poll(()=>requested.size).toBe(3);expect([...requested].sort()).toEqual(photos.slice(0,3).map(p=>p.src).sort());
 await seek(page,8.1);await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',photos[1].id);
 await expect(page.locator('.epilogue-photo')).toHaveCount(2);await expect(page.locator('.epilogue-photo')).toHaveCount(1,{timeout:3000});
 await seek(page,16.1);await page.waitForTimeout(300);await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',photos[1].id);
 await seek(page,24.1);await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo',photos[3].id);
 await page.getByRole('button',{name:'暂停结语',exact:true}).click();const before=await page.locator('.epilogue audio').evaluate(a=>a.currentTime);await page.waitForTimeout(300);expect(await page.locator('.epilogue audio').evaluate(a=>a.currentTime)).toBe(before);
 await page.getByRole('button',{name:'跳至结尾',exact:true}).click();await expect(page.locator('.epilogue-lyrics')).toHaveAttribute('aria-hidden','true');
 await expect.poll(()=>page.locator('.epilogue-lyrics').evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(0);
 await expect.poll(()=>page.locator('.epilogue-photography').evaluate(e=>Number(getComputedStyle(e).opacity))).toBe(0);
});
test('浏览器拒绝播放后可手动恢复，空格与方向键控制，音量和静音独立',async({page})=>{
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;let blocked=false;HTMLMediaElement.prototype.play=function(){if(this.src.includes('iron-army-epilogue')&&!blocked){blocked=true;return Promise.reject(new DOMException('Blocked','NotAllowedError'));}return play.call(this);};});
 await open(page);await page.getByRole('button',{name:'开启声音并播放',exact:true}).click();await expect(page.getByRole('alert')).toContainText('请点击播放');
 await page.getByRole('button',{name:'重试播放',exact:true}).click();await expect(page.getByRole('button',{name:'暂停结语'})).toBeVisible();
 await page.locator('.epilogue').focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'播放结语',exact:true})).toBeVisible();const before=await page.locator('.epilogue audio').evaluate(a=>a.currentTime);
 await page.keyboard.press('ArrowRight');await expect.poll(()=>page.locator('.epilogue audio').evaluate(a=>a.currentTime)).toBeCloseTo(before+5,1);
 const volume=page.getByRole('slider',{name:'结语音量'});await volume.fill('0.45');expect(await page.locator('.epilogue audio').evaluate(a=>a.volume)).toBe(.45);
 await page.getByRole('button',{name:'静音结语',exact:true}).click();expect(await page.locator('.epilogue audio').evaluate(a=>a.muted)).toBe(true);
 await page.getByRole('button',{name:'开启结语声音',exact:true}).click();expect(await page.locator('.epilogue audio').evaluate(a=>a.volume)).toBe(.45);
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>Boolean(document.activeElement.closest('.epilogue')))).toBe(true);}
});
test('照片全部加载失败仍可观看、歌曲失败可重试且返回始终可用',async({page})=>{
 await page.route('**/images/epilogue/**',r=>r.abort());await open(page);await start(page);await page.getByRole('button',{name:'暂停结语'}).click();await seek(page,90.5);await expect(page.locator('.epilogue-photography')).toHaveAttribute('data-photo','background');await expect(page.locator('.epilogue-lyrics')).toBeVisible();
 await page.keyboard.press('Escape');await page.route('**/audio/iron-army-epilogue.mp3',r=>r.abort());await page.locator('.ending-entry').click();await page.getByRole('button',{name:'开启声音并播放',exact:true}).click();await expect(page.getByRole('alert')).toContainText('歌曲暂时无法加载');await expect(page.getByRole('button',{name:'重试播放'})).toBeVisible();
 await page.unroute('**/audio/iron-army-epilogue.mp3');await page.getByRole('button',{name:'重试播放'}).click();await expect(page.getByRole('button',{name:'暂停结语'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.epilogue')).toHaveCount(0);
});
for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390}]){
 test(`${viewport.width}×${viewport.height}结语入口、字幕、控件与定格布局`,async({page})=>{
  await page.setViewportSize(viewport);await open(page);await expect(page.getByRole('button',{name:'开启声音并播放',exact:true})).toBeInViewport();await start(page);await page.getByRole('button',{name:'暂停结语'}).click();await seek(page,109);
  for(const selector of ['.epilogue-header','.epilogue-lyrics','.epilogue-player']){const r=await page.locator(selector).boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(viewport.width+1);expect(r.y+r.height).toBeLessThanOrEqual(viewport.height+1);}
  expect(await page.locator('.epilogue').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'跳至结尾'}).click();await expect(page.getByRole('button',{name:'重新播放'})).toBeInViewport();await expect(page.locator('.epilogue-finale h1')).toBeInViewport();
 });
}
