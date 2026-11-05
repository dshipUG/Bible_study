export const nltCopyright = 'Scripture quotations marked (NLT) are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.';

function decode(text) {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'};
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (all, entity) => {
    if (entity[0] !== '#') return named[entity] ?? all;
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : +entity.slice(1);
    return n > 0 && n <= 0x10ffff && !(n>=0xd800 && n<=0xdfff) ? String.fromCodePoint(n) : '';
  });
}

// Extract plain Scripture text only. Never forward provider markup to the browser.
// Tyndale's verse_export wrappers can split a paragraph across several verses.
function verseText(html) {
  const stack=[]; let text='';
  for (const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || []) {
    if (!token.startsWith('<')) {if (!stack.some(t=>t.skip)) text+=token; continue;}
    const tag=token.match(/^<\s*(\/?)\s*([\w-]+)/); if(!tag)continue;
    const name=tag[2].toLowerCase();
    if(tag[1]) {const i=stack.findLastIndex(t=>t.name===name); if(i>=0)stack.splice(i); if(['p','div','br'].includes(name))text+=' '; continue;}
    const classes=token.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1].split(/\s+/)||[];
    const skip=['h1','h2','h3','h4','script','style'].includes(name)||classes.some(c=>['vn','tn','a-tn'].includes(c));
    if(['p','div','br'].includes(name))text+=' ';
    if(!['br','hr','img','input','meta','link','wbr'].includes(name)&&!token.endsWith('/>'))stack.push({name,skip});
  }
  return decode(text).replace(/\s+/g,' ').trim();
}

export function parseNlt(html, reference) {
  const expected=reference.match(/^(.+) (\d+)(?::(\d+))?$/);
  const verses=[];
  for(const match of html.matchAll(/<verse_export\b([^>]*)>([\s\S]*?)<\/verse_export>/gi)) {
    const attr=name=>match[1].match(new RegExp('\\b'+name+'=["\']([^"\']+)["\']','i'))?.[1];
    const chapter=Number(attr('ch')), verse=Number(attr('vn'));
    if(!Number.isInteger(verse)||verse<1||chapter!==Number(expected[2])||(expected[3]&&verse!==Number(expected[3])))continue;
    const text=verseText(match[2]);if(text)verses.push({book_name:expected[1],chapter,verse,text});
  }
  if(!verses.length)throw new Error('NLT passage unavailable');
  return {reference,translation_id:'nlt',translation_name:'New Living Translation',source:'Tyndale NLT API',copyright:nltCopyright,verses,text:verses.map(v=>v.text).join('\n')};
}

export async function nltPassage(reference) {
  if(!process.env.NLT_API_KEY)throw Object.assign(new Error('NLT is not connected yet. Add NLT_API_KEY in Render.'),{status:503});
  const url=new URL('https://api.nlt.to/api/passages');
  url.search=new URLSearchParams({ref:reference,version:'NLT',key:process.env.NLT_API_KEY});
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Object.assign(new Error('NLT could not load. Check your API key or try again later.'),{status:response.status===429?429:502});
  return parseNlt(await response.text(),reference);
}
