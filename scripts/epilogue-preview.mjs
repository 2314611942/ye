import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
const photos = JSON.parse(readFileSync('src/epilogue-photos.json'));
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox']});
const output='docs/epilogue';mkdirSync(output,{recursive:true});
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});
 await page.addInitScript(()=>{sessionStorage.setItem('yeting-access-v1','granted');sessionStorage.setItem('yeting-entered','yes');});
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');await page.locator('.ending-entry').click();
 await page.screenshot({path:`${output}/ready-${viewport.width}.png`});
 await page.getByRole('button',{name:'静音观看',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.epilogue audio')?.readyState>0);
 await page.getByRole('button',{name:'暂停结语'}).click();
 for(const [i,p] of photos.entries()){
  await page.locator('.epilogue audio').evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'));},p.start+2);
  await page.waitForFunction(id=>document.querySelector('.epilogue-photography')?.dataset.photo===id,p.id);
  await page.locator('.epilogue-photo img').evaluate(async img=>{await img.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  if (process.env.ALL_FRAMES === '1' || [0,9,11,13,14,15,17].includes(i)) await page.screenshot({path:`${output}/frame-${viewport.width}-${String(i+1).padStart(2,'0')}.png`});
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 const feature=photos.find(p=>p.id==='galaxy');
 await page.locator('.epilogue audio').evaluate((a,t)=>{a.currentTime=t;a.dispatchEvent(new Event('timeupdate'));},feature.start+3);
 await page.waitForFunction(id=>document.querySelector('.epilogue-photography')?.dataset.photo===id,feature.id);
 await page.waitForTimeout(1200);
 await page.locator('.epilogue-photo img').evaluate(img=>img.decode());
 await page.screenshot({path:`${output}/playing-${viewport.width}.png`});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'跳至结尾'}).click();await page.screenshot({path:`${output}/final-${viewport.width}.png`});
 await page.close();
}
await browser.close();
