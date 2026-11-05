import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const requests=[];
 await page.route('**/api/passage?*',async route=>{
  const url=new URL(route.request().url());const [,book,c]=url.searchParams.get('reference').match(/^(.+) (\d+)$/);
  await route.fulfill({json:{translation_name:'King James Version',verses:Array.from({length:20},(_,i)=>({chapter:+c,verse:i+1,text:`${book} ${c}:${i+1} text for context testing.`}))}});
 });
 await page.route('**/api/chat',async route=>{const input=route.request().postDataJSON();requests.push(input);await route.fulfill({json:{reply:`### ${input.passage.reference}\nAn explanation of this selected verse.`}});});
 await page.goto(process.env.APP_TEST_URL||'http://127.0.0.1:3004');
 await page.waitForSelector('.reader-verse[aria-pressed=true]');
 // Start with John, then ask a bare topic about Romans in the same conversation.
 await page.locator('#prompt').fill('history');await page.click('#send');await page.waitForSelector('.message.assistant');
 await page.selectOption('#book','Romans');await page.waitForFunction(()=>!document.querySelector('#load').disabled);
 await page.selectOption('#chapter','4');await page.waitForFunction(()=>!document.querySelector('#load').disabled);
 await page.selectOption('#verse','5');await page.click('#load');
 await page.waitForFunction(()=>document.querySelector('#chatPassageReference').textContent==='Romans 4:5 (KJV)');
 assert.equal(requests.length,1,'selecting a verse must not auto-send');
 await page.locator('#prompt').fill('history');await page.click('#send');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);
 assert.equal(requests[1].passage.reference,'Romans 4:5');assert.equal(requests[1].mode,'history');
 assert.match(requests[1].messages.at(-1).content,/Romans 4:5/);assert.doesNotMatch(requests[1].messages.at(-1).content,/John/);
 await page.locator('#prompt').fill('Keep my question');
 await page.locator('.reader-verse[data-verse="9"]').click();
 assert.equal(await page.locator('#prompt').inputValue(),'Keep my question');
 assert.equal(await page.locator('#chatPassageReference').textContent(),'Romans 4:9 (KJV)');
 await page.locator('#prompt').fill('dictionary');await page.click('#send');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===3);
 assert.equal(requests[2].passage.reference,'Romans 4:9');assert.equal(requests[2].mode,'words');
 assert.equal(requests[2].passage.text,'Romans 4:9 text for context testing.');
 await page.reload();await page.waitForSelector('.reader-verse[aria-pressed=true]');
 assert.equal(await page.locator('#chatPassageReference').textContent(),'Romans 4:9 (KJV)');
 await page.locator('#prompt').fill('history');await page.click('#send');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===4);
 assert.equal(requests[3].passage.reference,'Romans 4:9');
 await page.locator('.study').screenshot({path:'/workspace/Bible_study/chat-context-preview.png'});
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS: selected verse automatically attached; history/dictionary shortcuts; passage switches override John; drafts restore context; selection preserves typed question and does not auto-send.');
}finally{await browser.close();}
