import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
// Isolated Chrome UI timing checks. Mocked RB tests do not qualify physical Xbox hardware.
// Run sequentially with other browser checks so GPU work cannot distort frame evidence.
const url = process.argv[2] ?? 'http://127.0.0.1:3039';
const out = process.argv[3] ?? join(tmpdir(), 's39-menu-motion');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={environment:{url,browser:'Isolated installed Chrome; Browser plugin unavailable'},checks:[],events:[],errors:[],warnings:[]};
try {
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.addInitScript(()=>{
  localStorage.setItem('s39.settings.v1',JSON.stringify({quality:'low',master:0,music:0,effects:0}));
  window.__controller={index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__controller]});
 });
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')report.warnings.push(m.text());});
 await page.goto(report.environment.url);
 await expect(page.getByRole('button',{name:'START GAME',exact:true})).toBeEnabled({timeout:30000});
 assert.match(await page.title(),/Snake/i);
 assert.equal(await page.locator('vite-error-overlay').count(),0);
 assert((await page.locator('main').innerText()).includes('START GAME'));
 await page.waitForTimeout(400);
 await page.evaluate(()=>{
   window.__feedbackEvents=[];
   document.querySelector('.app').addEventListener('click',event=>{
     const el=event.target.closest('button,input,select'); if(!el)return;
     const dialog=document.querySelector('.settings-dialog');
     const item={label:el.getAttribute('aria-label')||el.textContent.trim(),time:performance.now(),immediate:{class:el.classList.contains('menu-confirming'),strength:el.style.getPropertyValue('--menu-confirm-strength'),connected:el.isConnected},frames:[]};
     window.__feedbackEvents.push(item);
     const collect=()=>{
       item.frames.push({elapsed:performance.now()-item.time,connected:el.isConnected,inert:!!el.closest('[inert]'),class:el.classList.contains('menu-confirming'),strength:el.style.getPropertyValue('--menu-confirm-strength'),overlays:document.querySelectorAll('.menu-confirmation').length,parentTransform:dialog?.style.transform||'',parentOpacity:dialog?.style.opacity||'',inactiveShadows:[...document.querySelectorAll('.settings-tabs button')].filter(tab=>!tab.matches(':hover,:focus-visible,[data-gamepad-focus],[aria-selected=true],.menu-confirming')).map(tab=>({label:tab.textContent.trim(),shadow:getComputedStyle(tab).boxShadow}))});
       if(item.frames.length<22)requestAnimationFrame(collect);
     };requestAnimationFrame(collect);
   },true);
 });
 await page.getByRole('button',{name:'START GAME',exact:true}).click();
 await expect(page.locator('.briefing')).toBeVisible();
 await page.waitForTimeout(380);
 await page.getByRole('button',{name:'BACK',exact:true}).click();
 await page.waitForTimeout(300);
 await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'SETTINGS',exact:true})).toBeVisible();
 await page.waitForTimeout(350);
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await page.screenshot({path:out+'/mouse-tab-impulse.png'});
 await page.waitForTimeout(380);
 await expect(page.getByRole('tab',{name:'Audio',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Visuals',exact:true}).focus();
 await page.keyboard.press('Enter');
 await page.waitForTimeout(380);
 await expect(page.getByRole('tab',{name:'Visuals',exact:true})).toHaveAttribute('aria-selected','true');
 const tap= index=>page.evaluate(index=>new Promise(resolve=>{
  window.__controller.buttons[index]={pressed:true,value:1};
  requestAnimationFrame(()=>{window.__controller.buttons[index]={pressed:false,value:0};requestAnimationFrame(resolve);});
 }),index);
 await tap(5);
 await expect(page.getByRole('tab',{name:'Accessibility',exact:true})).toHaveAttribute('aria-selected','true');
 await page.screenshot({path:out+'/gamepad-tab-impulse.png'});
 await page.waitForTimeout(380);
 // A retained tab must not restart the dialog; changed tab content enters on its own.
 const traces=await page.evaluate(()=>window.__feedbackEvents);
 for(const label of ['START GAME','BACK','SETTINGS','Audio','Visuals','Accessibility']){
  const item=traces.find(e=>e.label===label);assert(item,`Missing ${label}`);
  assert.equal(item.immediate.class,true,`${label} did not confirm in its activation event`);
  assert.equal(item.immediate.strength,'1',`${label} started with a delayed fade-in`);
  assert(item.frames.every(f=>f.overlays===0),`${label} left a detached overlay`);
  assert.equal(item.frames.at(-1).class,false,`${label} did not clean up`);
  if(['START GAME','BACK'].includes(label))assert.equal(item.frames[0].connected,false,`${label} did not immediately navigate`);
  if(label==='SETTINGS')assert(item.frames.every(f=>!f.class),`Opener feedback persisted behind the dialog`);
  if(['Audio','Visuals','Accessibility'].includes(label)){
   assert(item.frames.every(f=>f.parentTransform===''&&f.parentOpacity===''),`${label} restarted the unchanged dialog`);
   assert(item.frames.every(f=>f.inactiveShadows.every(tab=>tab.shadow==='none')),`${label} left a fading outline on an inactive tab`);
   const values=item.frames.filter(f=>f.strength!=='').map(f=>Number(f.strength));
   assert(values.every((v,i)=>i===0||v<=values[i-1]),`${label} confirmation brightened late`);
   assert(item.frames.some(f=>f.class),`${label} had no visible-frame impulse`);
  }
 }
 report.checks.push('Actual mouse navigation and mouse/keyboard/mock-RB tabs: immediate strength 1, monotonic fade, source cleanup, no detached overlay; unchanged Settings stays stationary');
 report.events=traces;
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await page.getByRole('tab',{name:'Visuals',exact:true}).click();
 const rapid = await page.locator('.menu-confirming').allTextContents();
 assert(rapid.length <= 1 && rapid.every(label => label.trim() === 'Visuals'));
 await page.waitForTimeout(250);
 report.checks.push('Rapid tab changes clear the earlier pulse; inactive tabs have no lingering outline transition');
 await page.getByRole('tab',{name:'Accessibility',exact:true}).click();
 await page.getByRole('checkbox',{name:'Reduce decorative motion',exact:true}).check();
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await page.waitForTimeout(300);
 const reduced=await page.evaluate(()=>window.__feedbackEvents.at(-1));
 assert.equal(reduced.immediate.class,false);
 assert(reduced.frames.every(f=>!f.class));
 assert.equal(await page.locator('[data-menu-motion]').evaluate(el=>el.style.transform),'');
 report.checks.push('App reduced motion disables confirmation and entrance tweens');
 await page.getByRole('tab',{name:'Accessibility',exact:true}).click();
 await page.getByRole('checkbox',{name:'Reduce decorative motion',exact:true}).uncheck();
 await page.waitForTimeout(280);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await page.waitForTimeout(300);
 const osReduced=await page.evaluate(()=>window.__feedbackEvents.at(-1));
 assert.equal(osReduced.immediate.class,false);
 assert(osReduced.frames.every(f=>!f.class));
 report.checks.push('OS reduced motion disables feedback and leaves no inline state');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(300);
 await page.getByRole('tab',{name:'Visuals',exact:true}).click();
 await page.waitForTimeout(250);
 await page.getByRole('combobox',{name:'Graphics quality',exact:true}).click();
 await page.waitForTimeout(250);
 await page.getByRole('option',{name:'Medium',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Graphics quality',exact:true})).toContainText('Medium');
 await page.waitForTimeout(250);
 assert.equal(await page.locator('.menu-confirming,.menu-confirmation').count(),0);
 await page.getByRole('combobox',{name:'Graphics quality',exact:true}).click();
 await page.getByRole('option',{name:'Low',exact:true}).click();
 await page.waitForTimeout(250);
 report.checks.push('Dropdown choice applies immediately and discarded option leaves no lingering flash');
 await page.screenshot({path:out+'/settings-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(250);
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await page.screenshot({path:out+'/settings-narrow-impulse.png'});
 await page.waitForTimeout(300);
 const narrow=await page.getByRole('dialog',{name:'SETTINGS',exact:true}).boundingBox();
 assert(narrow.x>=0&&narrow.x+narrow.width<=390);
 assert.equal(await page.locator('.menu-confirming,.menu-confirmation').count(),0);
 report.checks.push('390 × 844 narrow Settings remains inside viewport and feedback cleans up');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);
 report.checks.push('Correct page identity, meaningful content, no Vite overlay, no browser errors/warnings');
 await writeFile(out+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:report.checks,errors:report.errors,warnings:report.warnings,evidence:out},null,2));
}finally{await browser.close();}
