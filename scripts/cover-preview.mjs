import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const output = '/tmp/yeting-cover-review';
const ids = ['portrait','officers-1921','portrait-early','uniform','snow-1938','headquarters-1939','family-garden-1939','family-1939','veterans-1940'];
const viewports = [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844},{width:320,height:740},{width:844,height:390},{width:640,height:360}];
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox']});
const page = await browser.newPage({reducedMotion:'reduce'});
const errors = [], results = [];
page.on('pageerror',error=>errors.push(error.message));
await page.goto(origin+'/?cover=1');
await page.getByLabel('访问密码',{exact:true}).fill('yanan');
await page.getByRole('button',{name:'验证并进入'}).click();
for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  await page.locator('.cover-art img').evaluate(img=>img.decode());
  const directory = `${output}/${viewport.width}`;
  await mkdir(directory,{recursive:true});
  for (const id of ids) {
    await page.waitForFunction(id=>document.querySelector('.cover-reel')?.dataset.current===id,id);
    await page.locator('.cover-frame.is-current img').evaluate(img=>img.decode());
    await page.screenshot({path:`${directory}/${id}.png`});
    results.push(await page.evaluate(({id,viewport})=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      return {id,viewport,photo:rect('.cover-frame.is-current img'),title:rect('#entrance-title'),dock:rect('.reel-dock'),overflow:document.querySelector('.epic-entrance').scrollWidth>innerWidth};
    },{id,viewport}));
    await page.getByRole('button',{name:'下一张历史照片'}).click();
  }
}
await page.close();
const motion=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
motion.on('pageerror',e=>errors.push(e.message));
await motion.goto(origin+'/?cover=1');await motion.getByLabel('访问密码',{exact:true}).fill('yanan');await motion.getByRole('button',{name:'验证并进入'}).click();
await motion.locator('.cover-frame.is-current img').evaluate(img=>img.decode());
await motion.getByRole('button',{name:'下一张历史照片'}).click();
await motion.waitForFunction(()=>document.querySelector('.cover-reel')?.dataset.current==='officers-1921');
await motion.waitForTimeout(350);
await motion.screenshot({path:`${output}/transition.png`});
await motion.waitForTimeout(550);
await motion.screenshot({path:`${output}/transition-complete.png`});
await writeFile(`${output}/results.json`,JSON.stringify({origin,results,errors},null,2));
console.log(JSON.stringify({screenshots:results.length+2,overflows:results.filter(r=>r.overflow).length,errors,output}));
await browser.close();if(errors.length||results.some(r=>r.overflow))process.exitCode=1;
