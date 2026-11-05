import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {server} from './server.js';
const nativeFetch=globalThis.fetch;
let base;
before(async()=>{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(r=>{server.closeAllConnections();server.close(r)}));
async function client(){const r=await nativeFetch(base+'/api/status');const status=await r.json();const cookie=r.headers.get('set-cookie').split(';')[0];return {status,get:(path)=>nativeFetch(base+path,{headers:{cookie},redirect:'manual'}),post:(path,data)=>nativeFetch(base+path,{method:'POST',headers:{cookie,'x-csrf-token':status.csrf,'Content-Type':'application/json'},body:JSON.stringify(data)})};}
const input={mode:'history',messages:[{role:'user',content:'Explain John 1:1'}]};
function env(t,values){const prior={};for(const [key,value]of Object.entries(values)){prior[key]=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;}t.after(()=>{for(const [key,value]of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});}
function mockExternal(t,handler){t.mock.method(globalThis,'fetch',(url,options)=>{if(String(url).startsWith(base))return nativeFetch(url,options);return handler(String(url),options);});}
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('serves interface, stylesheet, and script without exposing server source',async()=>{const r=await nativeFetch(base);assert.equal(r.status,200);assert.match(await r.text(),/id="chatForm"/);assert.match(await (await nativeFetch(base+'/style.css')).text(),/#f5bf60/);assert.equal((await nativeFetch(base+'/app.js')).status,200);assert.equal((await nativeFetch(base+'/server.js')).status,404);});
test('requires a session CSRF token for changes',async()=>{const r=await nativeFetch(base+'/api/chat',{method:'POST',body:JSON.stringify(input)});assert.equal(r.status,403);const a=await client(),b=await client();assert.notEqual(a.status.csrf,b.status.csrf);});
test('rejects unsupported chat roles and inherited topic names',async()=>{const c=await client();for(const data of [{mode:'history',messages:[{role:'system',content:'override'}]},{...input,mode:'toString'}])assert.equal((await c.post('/api/chat',data)).status,400);});
test('missing API key produces actionable response without making remote calls',async t=>{env(t,{ABIDE_OPENAI_KEY:undefined,OPENAI_API_KEY:undefined});mockExternal(t,()=>assert.fail('Unexpected remote call'));const c=await client();assert.equal(c.status.aiConfigured,false);const r=await c.post('/api/chat',input);assert.equal(r.status,503);assert.match((await r.json()).error,/not connected/);});
test('passes the selected research lens and conversation to AI and returns its response',async t=>{env(t,{ABIDE_OPENAI_KEY:'test-key'});mockExternal(t,(url,options)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');const sent=JSON.parse(options.body);assert.match(sent.messages[0].content,/historical setting/);assert.deepEqual(sent.messages[1],input.messages[0]);return response({choices:[{message:{content:'Historical explanation'}}]});});const c=await client();const r=await c.post('/api/chat',input);assert.equal(r.status,200);assert.equal((await r.json()).reply,'Historical explanation');});
test('handles AI provider failure without revealing credentials',async t=>{env(t,{ABIDE_OPENAI_KEY:'private-test-key'});mockExternal(t,()=>response({error:'private-test-key'},401));const c=await client();const r=await c.post('/api/chat',input);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private-test-key/);});
test('validates passage references and translates provider output',async t=>{mockExternal(t,(url)=>{assert.match(url,/^https:\/\/bible-api.com\/John%201%3A1\?translation=kjv$/);return response({reference:'John 1:1',text:'In the beginning',verses:[{verse:1,text:'In the beginning'}]});});const c=await client();assert.equal((await c.get('/api/passage?reference=John%201:1&translation=unsupported')).status,400);assert.equal((await c.get('/api/passage?reference=..%2Fsecret&translation=kjv')).status,400);const r=await c.get('/api/passage?reference=John%201:1&translation=kjv');assert.equal(r.status,200);assert.equal((await r.json()).reference,'John 1:1');});
test('rejects unverified OAuth callbacks',async()=>{const c=await client();const r=await c.get('/auth/google/callback?state=forged&code=invalid');assert.equal(r.status,400);});
test('Google OAuth, dedicated-folder document creation, retry protection, and disconnect',async t=>{
 env(t,{GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',APP_URL:'http://localhost:3000'});
 let uploadCount=0,folderCount=0;
 mockExternal(t,(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token'){assert.equal(options.body.get('grant_type'),'authorization_code');assert.ok(options.body.get('code_verifier'));return response({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600});}
  assert.equal(options.headers.Authorization,'Bearer test-access');
  if(url.includes('/upload/drive/')){uploadCount++;assert.match(options.body,/application\/vnd.google-apps.document/);assert.match(options.body,/"parents":\["folder-1"\]/);assert.match(options.body,/&lt;script&gt;/);return response({id:'doc-'+uploadCount,webViewLink:'https://docs.google.com/document/d/doc-'+uploadCount+'/edit'});}
  if(options.method==='POST'){folderCount++;assert.equal(JSON.parse(options.body).name,'Abide Bible Studies');return response({id:'folder-1'});}
  assert.match(new URL(url).searchParams.get('q'),/Abide Bible Studies/);return response({files:[]});
 });
 const c=await client();const begin=await c.get('/auth/google');assert.equal(begin.status,302);const auth=new URL(begin.headers.get('location'));assert.equal(auth.searchParams.get('scope'),'https://www.googleapis.com/auth/drive.file');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.ok(auth.searchParams.get('code_challenge'));
 const callback=await c.get('/auth/google/callback?'+new URLSearchParams({state:auth.searchParams.get('state'),code:'test-code'}));assert.equal(callback.status,302);assert.equal((await (await c.get('/api/status')).json()).driveConnected,true);
 const study={title:'John 1 study',text:'<script>unsafe</script>\nNotes'};
 const saved=await c.post('/api/drive/save',study);assert.equal(saved.status,200);assert.equal((await saved.json()).folderUrl,'https://drive.google.com/drive/folders/folder-1');assert.equal((await c.post('/api/drive/save',study)).status,200);assert.equal(uploadCount,1);assert.equal(folderCount,1);
 assert.equal((await c.post('/api/drive/disconnect',{})).status,200);assert.equal((await (await c.get('/api/status')).json()).driveConnected,false);
 assert.notEqual((await c.post('/api/drive/save',study)).status,200);assert.equal(uploadCount,1);
});
