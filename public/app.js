import {messageBody} from './format.js';
import {BookReader, getChapter} from './reader.js';
const $=id=>document.getElementById(id);
const books='Genesis:50|Exodus:40|Leviticus:27|Numbers:36|Deuteronomy:34|Joshua:24|Judges:21|Ruth:4|1 Samuel:31|2 Samuel:24|1 Kings:22|2 Kings:25|1 Chronicles:29|2 Chronicles:36|Ezra:10|Nehemiah:13|Esther:10|Job:42|Psalms:150|Proverbs:31|Ecclesiastes:12|Song of Solomon:8|Isaiah:66|Jeremiah:52|Lamentations:5|Ezekiel:48|Daniel:12|Hosea:14|Joel:3|Amos:9|Obadiah:1|Jonah:4|Micah:7|Nahum:3|Habakkuk:3|Zephaniah:3|Haggai:2|Zechariah:14|Malachi:4|Matthew:28|Mark:16|Luke:24|John:21|Acts:28|Romans:16|1 Corinthians:16|2 Corinthians:13|Galatians:6|Ephesians:6|Philippians:4|Colossians:4|1 Thessalonians:5|2 Thessalonians:3|1 Timothy:6|2 Timothy:4|Titus:3|Philemon:1|Hebrews:13|James:5|1 Peter:5|2 Peter:3|1 John:5|2 John:1|3 John:1|Jude:1|Revelation:22'.split('|').map(b=>{const [name,chapters]=b.split(':');return {name,chapters:+chapters}});
books.forEach(b=>$('book').add(new Option(b.name,b.name)));
$('book').value='John';
function chapters(){const count=books.find(b=>b.name===$('book').value).chapters;$('chapter').replaceChildren();for(let n=1;n<=count;n++)$('chapter').add(new Option(n,n));$('verse').value=1;}
chapters();$('book').addEventListener('change',()=>{chapters();loadChapter();});$('chapter').addEventListener('change',loadChapter);
let passage={reference:'John 1:1',translation:'KJV',text:'In the beginning was the Word, and the Word was with God, and the Word was God.'};
$('version').value='kjv';$('badge').textContent='KJV';$('passageStatus').textContent='Starter passage · King James Version';
const reader = new BookReader($('bookReader'), selected => {
 chapterRequest++;$('verse').disabled=false;$('load').disabled=false;
 passage={reference:selected.reference,translation:selected.translation,text:selected.text,copyright:selected.data.copyright||''};
 $('reference').textContent=passage.reference;$('badge').textContent=passage.translation;
 $('book').value=selected.book;chapters();$('chapter').value=selected.chapter;
 $('verse').replaceChildren(...selected.data.verses.map(v=>new Option(v.verse,v.verse)));$('verse').value=selected.verse;
 $('version').value=selected.translation.toLowerCase();
 $('passageStatus').textContent=`${selected.data.translation_name} · ${selected.data.source||'bible-api.com'}`;
 $('copyright').textContent=selected.data.copyright||'';$('copyright').hidden=!selected.data.copyright;
 syncChatPassage();persistDraft();
});
let readerRequest=0;
async function openReader(){
 const request=++readerRequest;++chapterRequest;
 const book=$('book').value, chapter=+$('chapter').value, verse=+$('verse').value, translation=$('version').value;
 $('load').disabled=true;$('passageStatus').textContent='Opening chapter…';
 try{await reader.open(book,chapter,verse,translation,books.find(b=>b.name===book).chapters);}
 catch{if(request===readerRequest)$('passageStatus').textContent='Could not open this passage. The previous text is still shown. Tap Read passage to retry.';}
 finally{if(request===readerRequest)$('load').disabled=false;}
}
$('load').onclick=openReader;
const quote=()=>`${passage.reference} (${passage.translation})\n“${passage.text}”${passage.copyright?'\n\n'+passage.copyright:''}`;
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(quote());$('passageStatus').textContent='Verse copied.';}catch{$('passageStatus').textContent='Clipboard unavailable. Use “Study this verse” to add it to your question.';}};
const prompts={words:'Explain the key original-language words in this passage.',history:'Explain the historical and cultural context of this passage.',manuscripts:'What ancient manuscript evidence and significant textual variants relate to this passage?',connections:'Which other passages help explain this verse?',application:'How might I apply this passage? Include reflection questions.',perspectives:'How do different interpretive traditions understand this passage?'};
const hints={words:'Explore the meaning behind the words.',history:'Meet the people, places, and customs behind the passage.',manuscripts:'Explore textual witnesses, variants, and what remains uncertain.',connections:'Read this passage alongside the wider story of Scripture.',application:'Connect careful reading with everyday life.',perspectives:'Compare interpretations with curiosity and respect.'};
$('mode').value='history';
function hint(){$('topicHint').textContent=hints[$('mode').value];}hint();$('mode').onchange=hint;
const chips=document.createElement('div');chips.className='chips';for(const [key,label]of [['words','Dictionary'],['manuscripts','Manuscripts'],['connections','Cross-references']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{$('mode').value=key;hint();$('prompt').value=prompts[key];$('prompt').focus();};chips.append(b);}$('topicHint').after(chips);
$('insert').onclick=()=>{syncChatPassage();$('prompt').value=prompts[$('mode').value];$('prompt').focus();$('prompt').scrollIntoView({behavior:'smooth',block:'center'});};
let history=[];let pending=false;
function bubble(role,content){$('messages').querySelector('.welcome')?.remove();const div=document.createElement('div');div.className=`message ${role}`;const label=document.createElement('span');label.className='message-label';label.textContent=role==='user'?'YOU':'ABIDE · STUDY COMPANION';div.append(label,messageBody(role,content));$('messages').append(div);$('messages').scrollTop=$('messages').scrollHeight;return div;}
function syncChatPassage(){
 $('chatPassageReference').textContent=`${passage.reference} (${passage.translation})`;
 $('chatPassageText').textContent=passage.text;
 $('prompt').placeholder=`Ask about ${passage.reference}…`;
}
const shortcutModes={history:'history','historical context':'history',dictionary:'words','word study':'words',manuscripts:'manuscripts','cross references':'connections',application:'application'};
$('chatForm').onsubmit=async e=>{
 e.preventDefault();if(pending)return;
 const question=$('prompt').value.trim();if(!question)return;
 if(history.length>=28){$('chatStatus').textContent='Clear this conversation to start a new study.';return;}
 const selectedPassage={...passage};
 const keyword=question.toLowerCase().replace(/[?!.,]+$/,'').replace(/-/g,' ');
 const mode=shortcutModes[keyword]||$('mode').value;
 $('mode').value=mode;hint();
 const content=`Study passage: ${selectedPassage.reference} (${selectedPassage.translation})\n${selectedPassage.text}\n\nQuestion: ${question}`;
 const messages=[...history,{role:'user',content}];
 const userBubble=bubble('user',content);
 pending=true;for(const id of ['send','clear','savedStudies','newStudy'])$(id).disabled=true;
 $('chatStatus').textContent=`Studying ${selectedPassage.reference}…`;$('prompt').value='';
 try{
  const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':connection.csrf||''},body:JSON.stringify({mode,passage:selectedPassage,messages})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to send question.');
  history=[...messages,{role:'assistant',content:data.reply}];persistDraft();bubble('assistant',data.reply);$('chatStatus').textContent='';
 }catch(error){userBubble.remove();if(!$('prompt').value)$('prompt').value=question;$('chatStatus').textContent=error.message;}
 finally{pending=false;for(const id of ['send','clear','savedStudies','newStudy'])$(id).disabled=false;}
};
$('clear').onclick=()=>{history=[];$('messages').replaceChildren();persistDraft();$('chatStatus').textContent='Conversation cleared.';};

let connection={};
let chapterRequest=0;
async function loadChapter(){
 reader.cancel();++readerRequest;
 const request=++chapterRequest;const book=$('book').value, chapter=+$('chapter').value, translation=$('version').value;
 $('verse').disabled=true;$('load').disabled=true;$('passageStatus').textContent='Loading chapter…';
 try{const data=await getChapter(book,chapter,translation);if(request!==chapterRequest)return;
 $('verse').replaceChildren(...data.verses.map(v=>new Option(v.verse,v.verse)));$('passageStatus').textContent='Choose a verse, then tap Read passage.';
 }catch{if(request!==chapterRequest)return;$('verse').replaceChildren(...Array.from({length:176},(_,i)=>new Option(i+1,i+1)));$('passageStatus').textContent='Chapter list unavailable. Choose a verse number; Read passage will check it.';
 }finally{if(request===chapterRequest){$('verse').disabled=false;$('load').disabled=false;}}
}
$('version').addEventListener('change',loadChapter);
// John 1 has 51 verses; this makes the starter passage usable offline.
$('verse').replaceChildren(...Array.from({length:51},(_,i)=>new Option(i+1,i+1)));
async function refreshConnection(){try{const r=await fetch('/api/status');connection=await r.json();$('connectDrive').hidden=connection.driveConnected;$('disconnectDrive').hidden=!connection.driveConnected;$('connectDrive').textContent=connection.driveConfigured?'Connect Google Drive ↗':'Google Drive setup pending';$('connectDrive').setAttribute('aria-disabled',String(!connection.driveConfigured));$('saveDrive').disabled=!connection.driveConnected;$('connectionStatus').textContent=`AI chat: ${connection.aiConfigured?'configured':'setup pending'} · Drive: ${connection.driveConnected?'connected':connection.driveConfigured?'ready to connect':'setup pending'}`;if(connection.folderUrl){$('driveFolder').href=connection.folderUrl;$('driveFolder').hidden=false;}}catch{$('connectionStatus').textContent='Unable to check connections. Refresh and try again.';}}
$('connectDrive').onclick=e=>{if(!connection.driveConfigured){e.preventDefault();$('saveStatus').textContent='The app owner needs to configure Google sign-in. You can save on this device now.';}};
$('disconnectDrive').onclick=async()=>{try{const r=await fetch('/api/drive/disconnect',{method:'POST',headers:{'X-CSRF-Token':connection.csrf}});if(!r.ok)throw Error();$('driveFolder').hidden=true;await refreshConnection();$('saveStatus').textContent='Drive disconnected from this app session.';}catch{$('saveStatus').textContent='Could not disconnect. Try again.';}};
let activeStudy=crypto.randomUUID();
function study(){return {id:activeStudy,title:$('studyTitle').value.trim()||`${passage.reference} study`,passage,history,notes:$('notes').value,mode:$('mode').value,updated:new Date().toISOString()};}
function persistDraft(){try{localStorage.setItem('abide-draft',JSON.stringify(study()));}catch{$('saveStatus').textContent='Browser storage is full or unavailable. Keep a copy of your notes.';}}
function listStudies(){try{return JSON.parse(localStorage.getItem('abide-studies')||'[]');}catch{return [];}}
function renderStudies(){$('savedStudies').replaceChildren(new Option('Choose a study…',''),...listStudies().map(s=>new Option(s.title,s.id)));}
function restore(s){$('verse').disabled=false;++chapterRequest;++readerRequest;reader.cancel();activeStudy=s.id||crypto.randomUUID();passage=s.passage;syncChatPassage();history=s.history||[];$('studyTitle').value=s.title||'';$('notes').value=s.notes||'';$('mode').value=s.mode||'history';hint();$('reference').textContent=passage.reference;$('badge').textContent=passage.translation;const fallback=document.createElement('blockquote');fallback.textContent=passage.text;$('bookReader').replaceChildren(fallback);reader.generation++;reader.previous=null;reader.loading=false;$('passageStatus').textContent='Restored study passage';$('copyright').textContent=passage.copyright||'';$('copyright').hidden=!passage.copyright;$('messages').replaceChildren();history.forEach(m=>bubble(m.role,m.content));const match=passage.reference.match(/^(.+) (\d+):(\d+)$/);if(match&&books.some(b=>b.name===match[1])){$('book').value=match[1];chapters();$('chapter').value=match[2];$('verse').replaceChildren(new Option(match[3],match[3]));$('version').value=passage.translation.toLowerCase();openReader();}}
$('notes').addEventListener('input',persistDraft);$('studyTitle').addEventListener('input',persistDraft);
$('saveLocal').onclick=()=>{try{const current=study();const items=listStudies().filter(s=>s.id!==current.id);items.unshift(current);localStorage.setItem('abide-studies',JSON.stringify(items));persistDraft();renderStudies();$('saveStatus').textContent='Saved on this device. Browser data clearing will remove local studies.';}catch{$('saveStatus').textContent='Unable to save locally. Browser storage may be full.';}};
$('savedStudies').onchange=()=>{if(pending)return;const s=listStudies().find(s=>s.id===$('savedStudies').value);if(s){restore(s);persistDraft();}};
$('newStudy').onclick=()=>{if(pending)return;if(($('notes').value||history.length)&&!confirm('Start a new study? Save this study first if you want to keep it.'))return;activeStudy=crypto.randomUUID();history=[];$('messages').replaceChildren();$('notes').value='';$('studyTitle').value='';$('prompt').value='';$('saveStatus').textContent='New study started.';persistDraft();};
$('saveDrive').onclick=async()=>{const s=study();const text=[`${s.passage.reference} (${s.passage.translation})`,s.passage.text,s.passage.copyright||'',`Study lens: ${$('mode').selectedOptions[0].textContent}`,...s.history.map(m=>`${m.role==='user'?'Question':'AI study response'}:\n${m.content}`),`Personal notes:\n${s.notes}`,'Saved from Abide Bible Study','AI-generated explanations should be checked against reliable sources.'].join('\n\n');$('saveDrive').disabled=true;$('saveStatus').textContent='Saving to Google Drive…';try{const r=await fetch('/api/drive/save',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':connection.csrf},body:JSON.stringify({title:s.title,text})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not save study.');$('saveStatus').replaceChildren(document.createTextNode('Saved. '));const a=document.createElement('a');a.textContent='Open Google Doc ↗';a.href=data.url;a.target='_blank';a.rel='noopener';$('saveStatus').append(a);$('driveFolder').href=data.folderUrl;$('driveFolder').hidden=false;}catch(e){$('saveStatus').textContent=e.message;}finally{$('saveDrive').disabled=!connection.driveConnected;}};
try{const draft=JSON.parse(localStorage.getItem('abide-draft')||'null');if(draft?.passage&&Array.isArray(draft.history))restore(draft);}catch{}
renderStudies();refreshConnection();syncChatPassage();

if(!readerRequest)openReader();
