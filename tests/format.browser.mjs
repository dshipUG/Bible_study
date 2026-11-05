import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const answer='### Historical Setting of John 1:1\n\n- **Date and Place:** Written around **AD 90–100**.\n- **Religious Background:**\n  - **Jewish context:** The beginning echoes Genesis 1:1.\n\nThe Greek word is *logos*.\n\n<script>window.hacked=true</script>\n\n[Unsafe](javascript:alert(1))\n\n[Reference](https://example.com)';
 await page.route('**/api/chat',route=>route.fulfill({json:{reply:answer}}));
 await page.route('**/api/passage?*',route=>route.fulfill({status:503,json:{error:'unavailable'}}));
 await page.goto(process.env.APP_TEST_URL||'http://127.0.0.1:3002');
 await page.locator('#prompt').fill('Explain John 1:1');await page.click('#send');
 await page.waitForSelector('.message.assistant h3');
 assert.equal(await page.locator('.message.assistant h3').textContent(),'Historical Setting of John 1:1');
 assert.ok(await page.locator('.message.assistant strong').count()>=4);
 assert.equal(await page.locator('.message.assistant ul ul li').count(),1);
 assert.equal(await page.locator('.message.assistant em').textContent(),'logos');
 assert.equal(await page.locator('.message.assistant script').count(),0);
 assert.equal(await page.locator('.message.assistant a[href^="javascript:"]').count(),0);
 assert.equal(await page.evaluate(()=>window.hacked),undefined);
 assert.equal(await page.locator('.message.assistant a').getAttribute('rel'),'noopener noreferrer');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.reload();await page.waitForSelector('.message.assistant h3');
 assert.equal(await page.locator('.message.assistant h3').textContent(),'Historical Setting of John 1:1');
 await page.locator('#messages').evaluate(el=>el.scrollTop=0);
 await page.locator('.study').screenshot({path:'/workspace/Bible_study/chat-format-preview.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS: headings, bold, italics, nested lists, safe HTML/links, phone width, saved conversation restoration.');
}finally{await browser.close();}
