import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

test('missing deployed assets return an error without crashing the server',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'abide-assets-'));
 let server;
 try {
  for(const file of ['server.js','integrations.js','access.js','nlt.js'])await copyFile(new URL('./'+file,import.meta.url),join(folder,file));
  await writeFile(join(folder,'package.json'),'{"type":"module"}');
  ({server}=await import(pathToFileURL(join(folder,'server.js'))));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/vendor/markdown-it.js','/style.css']){
   const response=await fetch(base+path);
   assert.equal(response.status,500);
   assert.ok((await response.json()).error);
   const health=await fetch(base+'/healthz');assert.equal(health.status,200);
  }
 }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));await rm(folder,{recursive:true,force:true});}
});
