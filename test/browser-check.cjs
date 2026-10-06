const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {startServer} = require('../server.cjs');
const results=[];
require('fs').mkdirSync(require('path').join(__dirname,'../test-results'),{recursive:true});
(async()=>{
 const server=await startServer({port:0});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}),headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin); await page.click('#sample');
 assert.equal(await page.locator('.queue-item').count(),3);
 await page.click('#flag'); assert.equal(await page.locator('#flag').getAttribute('aria-pressed'),'true');
 await page.click('#useDraft'); assert.ok((await page.inputValue('#draft')).includes('DNS'));
 await page.click('#markReviewed'); assert.equal(await page.locator('#progress').textContent(),'1 of 3 reviewed');
 await page.fill('#question','Changed question'); assert.equal(await page.locator('#answerStatus').textContent(),'OUTDATED');
 await page.reload(); assert.equal(await page.inputValue('#question'),'Changed question');
 results.push('Question queue, flags, editable drafts, reviewed state, stale-answer warning, and reload persistence');
 await page.click('[data-mode="interview"]'); assert.equal(await page.locator('.queue-item').count(),1);
 await page.click('#sample'); assert.equal(await page.locator('.queue-item').count(),1);
 await page.click('[data-mode="assessment"]'); assert.equal(await page.locator('.queue-item').count(),3);
 results.push('Separate interview and assessment state');
 await page.click('#connection'); await page.fill('#apiKey','not-a-real-key'); await page.fill('#groqKey','not-a-real-groq-key'); await page.click('#settingsForm button[type="submit"]');
 await page.waitForFunction(()=>document.querySelector('#connectionText').textContent==='Key configured');
 assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('not-a-real-key'));
 const requests=[];
 await page.route('**/api/call', async route=>{
  const input=route.request().postDataJSON();
  if(input.action!=='generate')return route.continue();
  requests.push(input.payload);
  await route.fulfill({json:{answer:'## Answer\nA checked explanation.\n<img src=x onerror=alert(1)>',usage:55}});
 });
 await page.click('#answer'); await page.waitForFunction(()=>document.querySelector('#answerContent').textContent.includes('checked explanation'));
 assert.equal(await page.locator('#answerContent img').count(),0);
 await page.click('#review'); await page.waitForFunction(()=>!document.querySelector('#answer').disabled);
 assert.equal(requests.at(-1).action,'review'); assert.ok(requests.at(-1).draft);
 await page.fill('#followup','Why not A?');await page.click('#sendFollowup');await page.waitForFunction(()=>document.querySelector('.followup-turn'));
 assert.equal(requests.at(-1).action,'followup');assert.ok(requests.at(-1).history.length);assert.ok(requests.at(-1).question.includes('Why not A?'));
 results.push('Settings, no key in browser storage, AI result rendering, HTML escaping, review and contextual follow-up payloads');
 await page.unroute('**/api/call');
 await page.route('**/api/call',async route=>{const input=route.request().postDataJSON();if(input.action==='generate')await route.fulfill({status:400,json:{error:'Quota test error'}});else await route.continue()});
 await page.click('#answer'); await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('Quota test'));
 assert.equal(await page.locator('#answer').isEnabled(),true);
 results.push('Provider errors are visible and controls recover');
 await page.unroute('**/api/call');
 for(const width of [1440,1024,768,320]){
  await page.setViewportSize({width,height:1000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
  if(width===320){await page.click('#sessionMenu');assert.ok(await page.locator('#export').isVisible());await page.click('#sessionMenu')}
 }
 results.push('No horizontal overflow at 1440, 1024, 768, 320; mobile session actions available');
 await page.setViewportSize({width:1440,height:1000});
 await page.click('#clearSession'); await page.click('#confirmYes'); await page.click('#sample');
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});await page.screenshot({path:__dirname+'/../test-results/desktop.png',fullPage:true});
 await page.setViewportSize({width:320,height:900}); await page.screenshot({path:__dirname+'/../test-results/mobile.png',fullPage:true});
 // Exercise the renderer's desktop capture seam with a deterministic fake capture.
 const desktop=await browser.newPage();
 await desktop.addInitScript(()=>{
  window.desktop={
   call:async(action,payload)=>{const{token}=await(await fetch('/api/bootstrap')).json();const r=await fetch('/api/call',{method:'POST',headers:{'Content-Type':'application/json','x-cue-token':token},body:JSON.stringify({action,payload})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;},
   scan:async()=>({name:'Test screen',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPioAAAAASUVORK5CYII='}),
   onScan:cb=>{window.fakeShortcut=cb;}, pin:async x=>x
  };
 });
 const scanRequests=[];
 await desktop.route('**/api/call',async route=>{
  const input=route.request().postDataJSON();if(input.action!=='generate')return route.continue();scanRequests.push(input.payload);
  const data=input.payload.action==='extract'?{answer:'extracted',questions:[{text:'Which value? A. 1 B. 2',kind:'multiple-choice'},{text:'What is 2 + 2?',kind:'numerical'}]}:{answer:'## B. 2\nExplanation.',usage:99};
  await route.fulfill({json:data});
 });
 await desktop.goto(origin); await desktop.click('#scan');
 await desktop.waitForFunction(()=>document.querySelector('#answerContent').textContent.includes('B. 2'));
 assert.equal(await desktop.locator('.queue-item').count(),2);
 assert.deepEqual(scanRequests.map(r=>r.action),['extract','answer']);
 assert.equal(scanRequests[0].images.length,1);assert.equal(scanRequests[1].images.length,1);
 assert.equal(scanRequests[1].kind,'multiple-choice');
 await desktop.click('.queue-item:last-child');assert.equal(await desktop.locator('.attachment').count(),1);
 await desktop.click('[data-mode="interview"]');await desktop.click('#scan');
 await desktop.waitForFunction(()=>document.querySelector('#answerContent').textContent.includes('B. 2'));
 assert.equal(scanRequests.at(-1).mode,'interview');assert.equal(scanRequests.at(-1).action,'answer');
 results.push('One-click scan → extract multiple questions → auto-answer first, retained diagram image, and interview scan (mock desktop capture/provider)');
 assert.deepEqual(errors,[]);results.push('No browser JavaScript errors');
 const voicePage=await browser.newPage();
 await voicePage.addInitScript(()=>{
   window.MediaRecorder=class {static isTypeSupported(){return true}constructor(){this.mimeType='audio/webm'}start(){}stop(){this.ondataavailable({data:new Blob([new Uint8Array(500)],{type:'audio/webm'})});this.onstop()}};
   Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){window.spokenText=u.text;setTimeout(()=>u.onend(),20)}}});
   window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
 });
 let voiceRequest;
 await voicePage.route('**/api/call',async route=>{const input=route.request().postDataJSON();if(input.action==='generate'){voiceRequest=input.payload;await route.fulfill({json:{answer:'Explain DNS resolution.',usage:0}})}else await route.continue()});
 await voicePage.goto(origin);await voicePage.click('#record');await voicePage.waitForFunction(()=>document.querySelector('#record').textContent.includes('Stop'));
 await voicePage.click('#record');await voicePage.waitForFunction(()=>document.querySelector('#question').value.includes('Explain DNS'));
 assert.equal(voiceRequest.action,'transcribe');assert.equal(voiceRequest.audio.mimeType,'audio/webm');
 await voicePage.click('#sample');await voicePage.click('#readAloud');await voicePage.waitForFunction(()=>window.spokenText);
 assert.ok(await voicePage.evaluate(()=>window.spokenText.length>0));
 results.push('Record/stop → transcription payload → question text and Read aloud dispatch (mock microphone/speech engine)');
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(require('fs').readFileSync(require.resolve('axe-core/axe.min.js'),'utf8'));
 const audit=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}}));
 assert.equal(audit.violations.length,0,'Accessibility violations: '+JSON.stringify(audit.violations.map(v=>v.id)));
 console.log(JSON.stringify({passed:results,accessibility:audit.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))},null,2));
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
