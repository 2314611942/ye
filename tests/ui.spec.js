import { test, expect } from '@playwright/test';
import { allEvents, periods, sources } from '../src/history.js';
import { media } from '../src/media.js';
const enter = async (page) => { await page.goto('/'); await page.getByRole('button', { name: '静音进入', exact: true }).click(); await expect(page.locator('.china-land')).toHaveCount(35); };
const close = async (page) => { await page.getByRole('button', { name: '关闭弹窗', exact: true }).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); };
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });
test('静音入场、会话记忆与首次分享直达', async ({ page }) => {
  let audioRequests = 0; page.on('request', r => { if (r.url().includes('reverie.mp3')) audioRequests++; });
  await enter(page); expect(audioRequests).toBe(0); await expect(page.locator('.brand .university-signature')).toHaveText('国防科技大学');
  await page.reload(); await expect(page.locator('.entrance')).toHaveCount(0);
  await page.goto('/?event=rejoin'); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('重获自由，再次申请入党');
  await expect(page.locator('.entrance')).toHaveCount(0); expect(audioRequests).toBe(0);
});
test('20个事件均可从时间轴一键打开，正文、图片与段落引用一致', async ({ page }) => {
  test.setTimeout(60000); await enter(page);
  for (const p of periods) {
    await page.getByRole('tab', { name: new RegExp(p.tab) }).click();
    for (const e of p.events) {
      await page.locator(`[data-event="${e.id}"]`).click();
      await expect(page.locator('#dialog-title')).toHaveText(e.title);
      await expect(page.locator('.story-section')).toHaveCount(3);
      await expect(page.locator('.story-section').nth(1)).toContainText(e.sections[1].text);
      await expect(page.locator('.feature-image img')).toHaveAttribute('src', media[e.images[0]].src);
      await page.getByRole('button', { name: /^查看引用/ }).first().click();
      await expect(page.locator('.story-section .reference-card')).toContainText(sources[e.sections[0].refs[0]].date);
      await expect(page).toHaveURL(new RegExp(`event=${e.id}`)); await close(page);
    }
  }
});
test('20个地图标记可直接打开对应展签', async ({ page }) => {
  test.setTimeout(60000); await enter(page);
  for (const p of periods) {
    await page.getByRole('tab', { name: new RegExp(p.tab) }).click();
    for (const e of p.events) {
      if (!(await page.locator('.map-canvas').getAttribute('class')).includes(e.overseas ? 'eurasia' : 'china')) await page.locator('.map-view-switch').getByRole('button', { name: e.overseas ? '海外足迹' : '中国', exact: true }).click();
      await page.locator(`[data-marker="${e.id}"] .marker-circle`).click();
      await expect(page.locator('#dialog-title')).toHaveText(e.title); await close(page);
    }
  }
});
test('关闭展签保持地图视角，支持缩放、拖动、定位、复位与轨迹开关', async ({ page }) => {
  await enter(page); const svg = page.locator('.atlas-svg');
  await page.getByRole('button', { name: '放大地图', exact: true }).click();
  const zoomed = await svg.getAttribute('data-view'); expect(zoomed.startsWith('1.3,')).toBeTruthy();
  const rect = await svg.boundingBox(); await page.mouse.move(rect.x + 400, rect.y + 200); await page.mouse.down(); await page.mouse.move(rect.x + 440, rect.y + 230); await page.mouse.up();
  const view = await svg.getAttribute('data-view'); expect(view).not.toBe(zoomed);
  await page.locator('[data-event="baoding"]').click(); await close(page); await expect(svg).toHaveAttribute('data-view', view);
  await page.getByRole('button', { name: '定位当前事件' }).click(); await expect(svg).not.toHaveAttribute('data-view', view);
  await page.getByRole('button', { name: '重置地图' }).click(); await expect(svg).toHaveAttribute('data-view','1,0,0');
  await page.getByRole('button', { name: '声音与展厅设置', exact: true }).click();
  await page.getByRole('button', { name: /显示轨迹连线/ }).click(); await close(page); await expect(page.locator('.route-path')).toHaveCount(0);
});
test('导览10秒一站，只显示简题；手动阅读暂停，关闭后手动继续', async ({ page }) => {
  await page.clock.install(); await enter(page); await page.getByRole('button', { name: '自动导览' }).click();
  await expect(page.locator('.tour-caption')).toContainText('惠阳'); await page.clock.fastForward(9000); await expect(page.locator('.tour-caption')).toContainText('惠阳');
  await page.clock.fastForward(1000); await expect(page.locator('.tour-caption')).toContainText('保定'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('.tour-caption').click(); await expect(page.locator('#dialog-title')).toContainText('求学保定'); await close(page);
  await page.clock.fastForward(20000); await expect(page.locator('[data-event="baoding"]')).toHaveAttribute('aria-current','step');
  await page.getByRole('button', { name: '自动导览' }).click(); await page.clock.fastForward(10000); await expect(page.locator('.tour-caption')).toContainText('广州');
});
test('展签前后切换、图集放大与键盘焦点', async ({ page }) => {
  await page.goto('/?event=macau-return'); await expect(page.locator('#dialog-title')).toContainText('归居澳门');
  await page.getByRole('button', { name: '下一事件' }).click(); await expect(page.locator('#dialog-title')).toContainText('赴沪寻路');
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#dialog-title')).toContainText('归居澳门');
  await page.getByRole('button', { name: /^放大图片/ }).click(); await expect(page.getByRole('button', { name: '关闭图片放大' })).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('.lightbox .image-credit strong')).toHaveText('叶挺与家人在澳门');
  await page.getByRole('button', { name: '下一张图片' }).click(); await expect(page.locator('.lightbox .image-credit strong')).toHaveText('澳门叶挺将军故居');
  for (let i=0;i<8;i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(()=>document.querySelector('.lightbox').contains(document.activeElement))).toBeTruthy(); }
  await page.keyboard.press('Escape'); await expect(page.locator('.lightbox')).toHaveCount(0); await expect(page.getByRole('button', { name: /^放大图片/ })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('[data-event="macau-return"]').click(); await close(page); await expect(page.locator('[data-event="macau-return"]')).toBeFocused();
});
for (const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]) {
  test(`${viewport.width}px布局、触控、图集及内部宽度均正常`, async ({ page }) => {
    await page.setViewportSize(viewport); await enter(page);
    for (const selector of ['.exhibit-header','.period-tabs','.timeline-panel','.exhibition-map']) { const r = await page.locator(selector).boundingBox(); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x+r.width).toBeLessThanOrEqual(viewport.width+1); }
    await expect(page.getByRole('tab')).toHaveCount(3); for(const tab of await page.getByRole('tab').all()) await expect(tab).toBeInViewport();
    if (viewport.width>=1024) expect(await page.locator('.exhibition-map').evaluate(el=>el.clientHeight/innerHeight)).toBeGreaterThanOrEqual(.75);
    await page.getByRole('tab', {name:new RegExp(periods[2].tab)}).click(); await page.locator('[data-event="prison"]').click();
    await expect(page.locator('#dialog-title')).toContainText('《囚歌》');
    expect(await page.locator('.exhibit-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
    await page.getByRole('button', {name:/^放大图片/}).click(); await expect(page.locator('.lightbox')).toBeVisible(); await page.getByRole('button',{name:'下一张图片'}).click(); await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'下一事件'}).click(); await expect(page.locator('#dialog-title')).toContainText('再次申请入党');
    if(viewport.width<=640) expect(await page.locator('.story-layout').evaluate(el=>el.scrollTop)).toBe(0);
  });
}
test('地图和图片加载失败可继续阅读，地图支持重试', async ({ page }) => {
  let fail = true; await page.route('**/data/*.json', route => fail ? route.abort() : route.continue()); await page.route('**/images/archive/*.jpg', route => route.abort());
  await page.goto('/'); await page.getByRole('button',{name:'静音进入',exact:true}).click(); await expect(page.getByRole('alert')).toContainText('地图暂未加载成功');
  await page.locator('[data-event="birth"]').click(); await expect(page.locator('.feature-image .image-fallback')).toBeVisible(); await expect(page.locator('.story-reading')).toContainText('1896年9月10日'); await close(page);
  fail=false; await page.getByRole('button',{name:'重新加载'}).click(); await expect(page.locator('.china-land')).toHaveCount(35);
});
test('减少动效设置、时期键盘切换、资料和精神面板', async ({ page }) => {
  await enter(page); await page.getByRole('tab').first().focus(); await page.keyboard.press('ArrowRight'); await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'声音与展厅设置',exact:true}).click(); await expect(page.getByRole('button',{name:/减少动效/})).toHaveAttribute('aria-pressed','true'); await expect(page.locator('html')).toHaveAttribute('data-motion','reduced'); await close(page);
  await page.getByRole('button',{name:'史料文献',exact:true}).click(); await expect(page.locator('.media-catalog figure')).toHaveCount(Object.keys(media).length); await expect(page.locator('.panel-content')).not.toContainText(/CC BY|Wikimedia|Scott Buckley|DataV/); await expect(page.locator('.panel-signature')).toHaveText('国防科技大学'); await close(page);
  await page.getByRole('button',{name:'精神丰碑',exact:true}).click(); await page.getByRole('button',{name:'走近《囚歌》背后的故事'}).click(); await expect(page.locator('#dialog-title')).toContainText('《囚歌》');
});
// Record the real HTMLAudioElement to check actual playback, muting and browser visibility handling.
const captureAudio = async (page) => page.addInitScript(() => { const NativeAudio=window.Audio; window.__audio=[]; window.Audio=function(...args){const audio=new NativeAudio(...args);window.__audio.push(audio);return audio;}; });
test('主动开启音乐、20%音量、阅读降音量、静音、后台暂停与手动暂停', async ({ page }) => {
  await captureAudio(page); await page.goto('/'); await page.getByRole('button',{name:'开启声音并进入'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).paused)).toBe(false); await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).currentTime)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__audio.at(-1).volume)).toBe(.2);
  await page.locator('[data-event="birth"]').click(); expect(await page.evaluate(()=>window.__audio.at(-1).volume)).toBeCloseTo(.08); await close(page); expect(await page.evaluate(()=>window.__audio.at(-1).volume)).toBe(.2);
  await page.getByRole('button',{name:'全局静音',exact:true}).click(); expect(await page.evaluate(()=>window.__audio.at(-1).muted)).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}); await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).paused)).toBe(true);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));}); await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).paused)).toBe(false);
  await page.getByRole('button',{name:'声音与展厅设置',exact:true}).click(); await page.getByRole('button',{name:'暂停音乐',exact:true}).click(); await expect.poll(()=>page.evaluate(()=>window.__audio.at(-1).paused)).toBe(true);
  await page.getByRole('button',{name:/交互音效/}).click(); await expect(page.getByRole('button',{name:/交互音效/})).toHaveAttribute('aria-pressed','false');
});
test('音频失败不阻碍展厅和事件阅读', async ({ page }) => {
  await page.route('**/audio/reverie.mp3',route=>route.abort()); await page.goto('/'); await page.getByRole('button',{name:'开启声音并进入'}).click();
  await page.getByRole('button',{name:'声音与展厅设置',exact:true}).click(); await expect(page.getByRole('status')).toContainText('配乐暂时无法播放'); await close(page); await page.locator('[data-event="birth"]').click(); await expect(page.locator('#dialog-title')).toContainText('生于南粤');
});
test('分享复制与剪贴板不可用时的手动复制入口', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']); await page.goto('/?event=zhaoqing');
  await page.getByRole('button',{name:'分享展签'}).click(); await expect(page.getByRole('status')).toContainText('事件链接已复制');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain('?event=zhaoqing');
  await page.evaluate(()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error('unavailable'));}); await page.getByRole('button',{name:'分享展签'}).click();
  await expect(page.getByRole('textbox',{name:'事件分享链接'})).toHaveValue(/event=zhaoqing/);
});
test('导览自动切换欧亚范围，后台暂停；减少动效可以手动调整', async ({page}) => {
  await page.clock.install(); await page.goto('/?event=guangzhou-early'); await close(page); await page.getByRole('button',{name:'自动导览'}).click();
  await page.clock.fastForward(10000); await expect(page.locator('.map-canvas')).toHaveClass(/eurasia/); await expect(page.locator('.tour-caption')).toContainText('莫斯科');
  await page.clock.fastForward(10000); await expect(page.locator('.map-canvas')).toHaveClass(/china/); await expect(page.locator('.tour-caption')).toContainText('肇庆');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(20000); await expect(page.locator('[data-event="zhaoqing"]')).toHaveAttribute('aria-current','step'); await expect(page.locator('.tour-caption')).toHaveCount(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.getByRole('button',{name:'声音与展厅设置',exact:true}).click(); await page.getByRole('button',{name:/减少动效/}).click(); await expect(page.locator('html')).toHaveAttribute('data-motion','full'); await close(page);
  await page.locator('[data-event="moscow-study"]').click(); await close(page); await page.locator('.map-view-switch').getByRole('button',{name:'中国',exact:true}).click(); await page.getByRole('button',{name:'定位当前事件'}).click();
  await expect(page.locator('.map-canvas')).toHaveClass(/eurasia/); await expect(page.locator('.atlas-svg')).not.toHaveAttribute('data-view','1,0,0');
});

test('海外入口先选择地点，不自动打开展签；底图按需加载并复用，返回保留视角', async ({page}) => {
  const requests = { china: 0, world: 0 };
  page.on('request', r => { for (const key of Object.keys(requests)) if (r.url().endsWith(`/data/${key}.json`)) requests[key]++; });
  await enter(page);
  expect(requests).toEqual({china:1, world:0});
  await page.getByRole('button', {name:'放大地图', exact:true}).click();
  const view = await page.locator('.atlas-svg').getAttribute('data-view');
  await page.getByRole('button', {name:'海外足迹', exact:true}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('[data-overseas]')).toHaveCount(3);
  await expect(page.locator('.world-land').first()).toBeVisible();
  await page.getByRole('button', {name:'返回中国地图'}).click();
  await expect(page.locator('.atlas-svg')).toHaveAttribute('data-view', view);
  for (const id of ['moscow-study','moscow-1928','europe']) {
    if (!(await page.locator('.map-canvas').getAttribute('class')).includes('eurasia')) await page.getByRole('button', {name:'海外足迹', exact:true}).click();
    await page.locator(`[data-overseas="${id}"]`).click();
    await expect(page.locator('#dialog-title')).toHaveText(allEvents.find(e=>e.id===id).title);
    await close(page);
  }
  expect(requests).toEqual({china:1, world:1});
  await page.locator('[data-event="macau-return"]').click(); await close(page);
  await expect(page.locator('.map-canvas')).toHaveClass(/china/);
  await expect(page.locator('[data-marker="macau-return"]')).toBeVisible();
});
test('四张艺术示意图正常解码并明确标示，与历史照片可切换', async ({page}) => {
  for (const id of ['xianning','nanchang-uprising','europe','prison']) {
    await page.goto(`/?event=${id}`);
    await expect(page.locator('.art-badge')).toHaveText('AI 艺术示意');
    await expect(page.locator('.feature-image img')).toHaveAttribute('src', /illustrations.*webp/);
    await page.locator('.feature-image img').evaluate(img=>img.decode());
    await page.getByRole('button', {name:/^图片 2：/}).click();
    await expect(page.locator('.art-badge')).toHaveCount(0);
    await expect(page.locator('.story-gallery .media-type')).toHaveText('历史原照');
  }
});
for (const width of [320,390]) test(`${width}px海外地点选择与地图控件可触达`, async ({page}) => {
  await page.setViewportSize({width,height:844}); await enter(page);
  await page.getByRole('button', {name:'海外足迹', exact:true}).click();
  const aside = page.locator('.overseas-journeys');
  await expect(aside).toBeInViewport();
  expect(await aside.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
  for (const button of await page.locator('[data-overseas]').all()) {
    const rect=await button.boundingBox(); expect(rect.height).toBeGreaterThanOrEqual(44);
    await expect(button).toBeInViewport();
  }
  await page.locator('[data-overseas="europe"]').click(); await expect(page.locator('#dialog-title')).toContainText('旅居欧洲'); await close(page);
  await page.getByRole('button', {name:'返回中国地图'}).click(); await expect(aside).toHaveCount(0);
});
test('拖动只更新视角而不替换地形；正常动效下关闭展签仍保留视角', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'}); await enter(page);
  await page.evaluate(()=>{window.__land=document.querySelector('.china-land');window.__geometryChanges=0;window.__observer=new MutationObserver(list=>window.__geometryChanges+=list.length);window.__observer.observe(document.querySelector('.geography'),{subtree:true,attributes:true,childList:true});});
  const svg=page.locator('.atlas-svg'), rect=await svg.boundingBox();
  await page.mouse.move(rect.x+400,rect.y+250); await page.mouse.down(); await page.mouse.move(rect.x+470,rect.y+290,{steps:15}); await page.mouse.up();
  const view=await svg.getAttribute('data-view'); expect(view).not.toBe('1,0,0');
  expect(await page.evaluate(()=>window.__geometryChanges)).toBe(0);
  expect(await page.evaluate(()=>window.__land===document.querySelector('.china-land'))).toBe(true);
  await page.locator('[data-event="baoding"]').click(); await close(page); await expect(svg).toHaveAttribute('data-view',view);
});

for (const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]) {
  test(`${viewport.width}px史诗封面、囚歌节选及入场按钮可读可用`, async ({page}) => {
    await page.setViewportSize(viewport); await page.goto('/');
    const cover=page.locator('.epic-entrance'); await expect(cover).toBeVisible();
    await expect(page.locator('.cover-poem')).toContainText('我应该在烈火和热血中得到永生！');
    await expect(page.locator('.cover-poem cite')).toContainText('叶挺《囚歌》节选');
    await expect(page.locator('.cover-footer .university-signature')).toHaveText('国防科技大学');
    await page.locator('.cover-portrait img').evaluate(img=>img.decode());
    expect(await cover.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    for (const name of ['开启声音并进入','静音进入']) {
      const button=page.getByRole('button',{name,exact:true}); await expect(button).toBeInViewport();
      const rect=await button.boundingBox(); expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button',{name:'静音进入',exact:true}).click(); await expect(cover).toHaveCount(0);
  });
}

test('封面预览链接可在已进入的会话中重新查看，事件分享仍直接打开', async ({page}) => {
  await enter(page); await page.goto('/?cover=1'); await expect(page.locator('.epic-entrance')).toBeVisible();
  await page.getByRole('button',{name:'静音进入',exact:true}).click(); await expect(page).not.toHaveURL(/cover=/);
  await page.reload(); await expect(page.locator('.entrance')).toHaveCount(0);
  await page.goto('/?cover=1&event=prison'); await expect(page.locator('.entrance')).toHaveCount(0);
  await expect(page.locator('#dialog-title')).toContainText('《囚歌》');
});

for(const width of [1440,390]) test(`${width}px路线依次连接编号，缩放和拖动后箭头仍对准圆点`,async({page})=>{
  await page.setViewportSize({width,height:900}); await enter(page);
  for(const period of periods) {
    await page.getByRole('tab',{name:new RegExp(period.tab)}).click();
    await page.locator('.map-view-switch').getByRole('button',{name:'中国',exact:true}).click();
    const numbers=period.events.filter(e=>!e.overseas).map(e=>allEvents.findIndex(item=>item.id===e.id)+1);
    const pairs=await page.locator('[data-route-from]').evaluateAll(nodes=>nodes.map(n=>[+n.dataset.routeFrom,+n.dataset.routeTo]));
    expect(pairs).toEqual(numbers.slice(1).map((n,i)=>[numbers[i],n]));
  }
  await page.getByRole('tab').first().click(); await page.getByRole('button',{name:'放大地图',exact:true}).click();
  await expect.poll(()=>page.locator('.routes').getAttribute('data-layout-scale')).toBe('1.3');
  const svg=page.locator('.atlas-svg'), rect=await svg.boundingBox();
  await page.mouse.move(rect.x+30,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+65,rect.y+rect.height/2+15);await page.mouse.up();
  const ends=await page.locator('.route-path').evaluateAll(paths=>paths.map(path=>{
    const target=+path.parentElement.dataset.routeTo;
    const marker=[...document.querySelectorAll('[data-marker]')].find(n=>+n.querySelector('.marker-number').textContent===target);
    const circle=marker.querySelector('.marker-circle'), rect=circle.getBoundingClientRect();
    const end=path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM());
    return {distance:Math.hypot(end.x-rect.x-rect.width/2,end.y-rect.y-rect.height/2),radius:rect.width/2};
  }));
  for(const end of ends) {expect(end.distance).toBeGreaterThan(end.radius+1);expect(end.distance).toBeLessThan(end.radius+26);}
  await page.getByRole('button',{name:'海外足迹',exact:true}).click();
  await expect(page.locator('.world-land').first()).toBeVisible();
  expect(await page.locator('[data-route-from]').evaluateAll(nodes=>nodes.map(n=>[+n.dataset.routeFrom,+n.dataset.routeTo]))).toEqual([[4,10],[10,11]]);
});

for (const width of [1440,390]) test(`${width}px连续缩放时路线保持形状，停止和往返缩放均不跳线`, async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width,height:900}); await enter(page);
  await page.waitForTimeout(1800);
  for (const overseas of [false,true]) {
    if(overseas) await page.getByRole('button',{name:'海外足迹',exact:true}).click();
    await expect(page.locator('.route-path').first()).toBeVisible();
    await page.waitForTimeout(1400);
    await page.evaluate(()=>{
      window.routeIdleChanges=0;
      window.routeObserver=new MutationObserver(records=>{window.routeIdleChanges+=records.length;});
      window.routeObserver.observe(document.querySelector('.routes'),{subtree:true,attributes:true,attributeFilter:['d']});
    });
    const shapes=()=>page.locator('.route-path').evaluateAll(paths=>paths.map(path=>path.getAttribute('d')));
    const midpoints=()=>page.locator('.route-path').evaluateAll(paths=>paths.map(path=>{
      const k=+document.querySelector('.atlas-svg').dataset.view.split(',')[0];
      const p=path.getPointAtLength(path.getTotalLength()/2);
      return [p.x/k,p.y/k];
    }));
    const initial=await shapes();
    const initialMids=await midpoints();
    await page.getByRole('button',{name:'放大地图',exact:true}).click();
    const enlarged=await shapes(); expect(enlarged).not.toEqual(initial);
    const enlargedMids=await midpoints();
    for(let i=0;i<initialMids.length;i++) expect(Math.hypot(initialMids[i][0]-enlargedMids[i][0],initialMids[i][1]-enlargedMids[i][1])).toBeLessThan(1);
    await page.evaluate(()=>{window.routeIdleChanges=0;});
    await page.waitForTimeout(450);
    expect(await page.evaluate(()=>window.routeIdleChanges)).toBe(0);
    expect(await shapes()).toEqual(enlarged);
    await page.getByRole('button',{name:'缩小地图',exact:true}).click();
    await page.waitForTimeout(300); expect(await shapes()).toEqual(initial);
    const rect=await page.locator('.atlas-svg').boundingBox();
    await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
    for(const delta of [-120,-120,-120,120,120,120]) {
      const before=await page.locator('.atlas-svg').getAttribute('data-view');
      await page.mouse.wheel(0,delta);
      await expect(page.locator('.atlas-svg')).not.toHaveAttribute('data-view',before);
    }
    await page.waitForTimeout(400); expect(await shapes()).toEqual(initial);
    await page.evaluate(()=>window.routeObserver.disconnect());
  }
});
