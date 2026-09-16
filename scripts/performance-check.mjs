// Diagnostic benchmark: compare on the same machine, without other active browser tests.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1440,height:900}});
await page.goto(process.env.PERFORMANCE_URL || 'http://localhost:5173'); await page.getByLabel('访问密码',{exact:true}).fill('yanan'); await page.getByRole('button',{name:'验证并进入',exact:true}).click(); await page.getByRole('button',{name:'静音进入',exact:true}).click(); await page.locator('.china-land').first().waitFor();
await page.waitForTimeout(1600);
const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); await cdp.send('Performance.enable');
const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
await page.mouse.move(500,280); await page.mouse.down();
const frames = await page.evaluate(async()=>{ const svg=document.querySelector('.atlas-svg');const durations=[];let last=performance.now(); for(let i=0;i<120;i++){ await new Promise(requestAnimationFrame);const now=performance.now();durations.push(now-last);last=now;svg.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:500+Math.sin(i/12)*100,clientY:280+Math.cos(i/12)*45}));}return durations; });
await page.mouse.up();
const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
const sorted=frames.slice(1).sort((a,b)=>a-b);const result={label:process.argv[2]||'sample',cpuThrottle:4,frames:sorted.length,frameMedianMs:sorted[Math.floor(sorted.length*.5)],frameP95Ms:sorted[Math.floor(sorted.length*.95)],over33ms:sorted.filter(v=>v>33.4).length,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,taskMs:(after.TaskDuration-before.TaskDuration)*1000,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000};
writeFileSync(`/tmp/yeting-performance-${result.label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
