import {randomBytes, createHash} from 'node:crypto';
const sessions=new Map();
const base=()=>(process.env.APP_URL||process.env.RENDER_EXTERNAL_URL||'http://localhost:3000').replace(/\/$/,'');
const configured=()=>Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
export function session(req,res){
 const id=req.headers.cookie?.match(/(?:^|;\s*)abide=([a-f0-9]{64})(?:;|$)/)?.[1];
 let s=sessions.get(id);
 if(s&&s.expires>Date.now())return s;
 const key=randomBytes(32).toString('hex');s={expires:Date.now()+86400000,csrf:randomBytes(24).toString('hex'),requests:[]};sessions.set(key,s);
 for(const [k,v] of sessions)if(v.expires<Date.now())sessions.delete(k);
 res.setHeader('Set-Cookie',`abide=${key}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${base().startsWith('https:')?'; Secure':''}`);return s;
}
async function google(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Google could not complete the request. Reconnect Drive and try again.');return r.json();}
async function token(s){if(!s.google)throw new Error('Connect Google Drive first.');if(s.google.expires>Date.now()+60000)return s.google.access_token;if(!s.google.refresh_token)throw new Error('Your Google session expired. Reconnect Drive.');const data=await google('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:s.google.refresh_token})});s.google={...s.google,...data,expires:Date.now()+data.expires_in*1000};return s.google.access_token;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function integrations(req,res,url,s,json,body){
 if(url.pathname==='/api/status'){json(res,200,{csrf:s.csrf,aiConfigured:Boolean(process.env.ABIDE_OPENAI_KEY||process.env.OPENAI_API_KEY),driveConfigured:configured(),driveConnected:Boolean(s.google),folderUrl:s.folder?`https://drive.google.com/drive/folders/${s.folder}`:null});return true;}
 if(url.pathname==='/auth/google'){
  if(!configured()){json(res,503,{error:'Google Drive is not configured yet.'});return true;}
  s.state=randomBytes(32).toString('hex');s.verifier=randomBytes(32).toString('base64url');s.stateExpires=Date.now()+600000;
  const params=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:base()+'/auth/google/callback',response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent',state:s.state,code_challenge:createHash('sha256').update(s.verifier).digest('base64url'),code_challenge_method:'S256'});
  res.writeHead(302,{Location:'https://accounts.google.com/o/oauth2/v2/auth?'+params});res.end();return true;
 }
 if(url.pathname==='/auth/google/callback'){
  if(!s.state||url.searchParams.get('state')!==s.state||s.stateExpires<Date.now()){json(res,400,{error:'Google sign-in expired or could not be verified. Start again.'});return true;}
  delete s.state;
  if(!url.searchParams.get('code')){res.writeHead(302,{Location:'/?drive=cancelled'});res.end();return true;}
  const data=await google('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code:url.searchParams.get('code'),client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:base()+'/auth/google/callback',grant_type:'authorization_code',code_verifier:s.verifier})});
  delete s.verifier;delete s.folder;delete s.lastSave;s.google={...data,expires:Date.now()+data.expires_in*1000};res.writeHead(302,{Location:'/?drive=connected'});res.end();return true;
 }
 if(url.pathname==='/api/drive/disconnect'&&req.method==='POST'){delete s.google;delete s.folder;delete s.lastSave;json(res,200,{ok:true});return true;}
 if(url.pathname==='/api/drive/save'&&req.method==='POST'){
  const input=await body(req);
  if(!input || typeof input.title!=='string'||!input.title.trim()||input.title.length>150||typeof input.text!=='string'||input.text.length>100000){json(res,400,{error:'Provide a study title and text (up to 100,000 characters).'});return true;}
  // Serialize saves per session and coalesce identical retries.
  if(s.saving){json(res,409,{error:'A study is already saving. Please wait.'});return true;}
  const digest=createHash('sha256').update(input.title+'\n'+input.text).digest('hex');
  if(s.lastSave?.digest===digest){json(res,200,s.lastSave.result);return true;}
  s.saving=true;
  try{
   const access=await token(s);const headers={Authorization:`Bearer ${access}`};
   if(!s.folder){const q="trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = 'Abide Bible Studies'";const found=await google('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q,fields:'files(id)',pageSize:'100'}),{headers});s.folder=found.files?.[0]?.id;if(!s.folder){const folder=await google('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({name:'Abide Bible Studies',mimeType:'application/vnd.google-apps.folder'})});s.folder=folder.id;}}
   const boundary='abide_'+randomBytes(16).toString('hex');
   const metadata={name:input.title,mimeType:'application/vnd.google-apps.document',parents:[s.folder]};
   const html=`<html><body><h1>${escape(input.title)}</h1><div style="white-space:pre-wrap">${escape(input.text).replace(/\n/g,'<br>')}</div></body></html>`;
   const multipart=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
   const file=await google('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{...headers,'Content-Type':`multipart/related; boundary=${boundary}`},body:multipart});
   const result={url:file.webViewLink||`https://docs.google.com/document/d/${file.id}/edit`,folderUrl:`https://drive.google.com/drive/folders/${s.folder}`};s.lastSave={digest,result};json(res,200,result);
  }finally{s.saving=false;}return true;
 }
 return false;
}
