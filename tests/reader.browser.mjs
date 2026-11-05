// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let failSix=true;
 await page.route('**/api/passage?*',async route=>{
  const url=new URL(route.request().url());const ref=url.searchParams.get('reference');const translation=url.searchParams.get('translation');const [,book,c]=ref.match(/^(.+) (\d+)$/);const chapter=+c;
  if(book==='Proverbs'&&chapter===6&&failSix){failSix=false;await route.fulfill({status:503,json:{error:'Unavailable'}});return;}
  await route.fulfill({json:{reference:ref,translation_name:translation,verses:Array.from({length:30},(_,i)=>({chapter,verse:i+1,text:`${book} chapter ${chapter} verse ${i+1} (${translation}). This is a browser test verse.`}))}});
 });
 await page.goto(process.env.APP_TEST_URL||'http://127.0.0.1:3001');
 await page.waitForSelector('.reader-verse[aria-pressed=true]');
 await page.selectOption('#book','Proverbs');await page.waitForFunction(()=>!document.querySelector('#load').disabled);
 await page.selectOption('#chapter','5');await page.waitForFunction(()=>!document.querySelector('#load').disabled);
 await page.selectOption('#verse','5');await page.click('#load');
 await page.waitForFunction(()=>document.querySelector('#reference').textContent==='Proverbs 5:5');
 const offset=await page.evaluate(()=>{const verse=document.querySelector('.reader-verse[aria-pressed=true]');return verse.getBoundingClientRect().top-document.querySelector('#bookReader').getBoundingClientRect().top;});
 assert.ok(offset>=0&&offset<100,'selected verse visible near reader top');
 await page.locator('#bookReader').evaluate(el=>el.scrollTop=0);
 await page.waitForSelector('.reader-verse[data-chapter="4"]');
 // Prepending must preserve the visible chapter-five text, not jump to chapter four.
 assert.ok(await page.locator('#bookReader').evaluate(el=>el.scrollTop>300));
 await page.locator('.reader-verse[data-chapter="5"][data-verse="7"]').click();
 assert.equal(await page.locator('#reference').textContent(),'Proverbs 5:7');
 await page.click('#insert');assert.match(await page.locator('#prompt').inputValue(),/Proverbs 5:7/);
 await page.locator('#bookReader').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.waitForFunction(()=>document.querySelector('[data-direction=next]').textContent.includes('retry'));
 await page.locator('[data-direction=next]').click();await page.waitForSelector('.reader-verse[data-chapter="6"]');
 await page.locator('.reader-verse[data-chapter="6"][data-verse="1"]').click();
 assert.equal(await page.locator('#chapter').inputValue(),'6');
 assert.equal(await page.locator('#verse').inputValue(),'1');
 await page.reload();await page.waitForFunction(()=>document.querySelector('.reader-verse[aria-pressed=true]')?.dataset.chapter==='6');
 assert.equal(await page.locator('#book').inputValue(),'Proverbs');
 await page.selectOption('#chapter','31');await page.waitForFunction(()=>!document.querySelector('#load').disabled);await page.click('#load');
 await page.waitForFunction(()=>document.querySelector('#reference').textContent==='Proverbs 31:1');
 assert.equal(await page.locator('[data-direction=next]').isVisible(),false);
 await page.selectOption('#chapter','1');await page.waitForFunction(()=>!document.querySelector('#load').disabled);await page.click('#load');
 await page.waitForFunction(()=>document.querySelector('#reference').textContent==='Proverbs 1:1');
 assert.equal(await page.locator('[data-direction=previous]').isVisible(),false);
 await page.selectOption('#version','web');await page.waitForFunction(()=>!document.querySelector('#load').disabled);await page.click('#load');
 await page.waitForFunction(()=>document.querySelector('#badge').textContent==='WEB');
 assert.match(await page.locator('.reader-verse[aria-pressed=true]').textContent(),/web/);
 assert.deepEqual(errors,[]);
 console.log('PASS: verse jump, scroll both directions, selection, chat insertion, retry, restore, book boundaries, translation.');
}finally{await browser.close();}
