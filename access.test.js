import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAccess} from './access.js';
const header=s=>'Basic '+Buffer.from(s).toString('base64');
test('private app access accepts only the correct username and password',()=>{
 assert.equal(canAccess(undefined,'test-password'),false);
 assert.equal(canAccess(header('abide:incorrect'),'test-password'),false);
 assert.equal(canAccess(header('someone:test-password'),'test-password'),false);
 assert.equal(canAccess(header('abide:test-password'),'test-password'),true);
});
test('production fails closed when no access password is configured',()=>{
 const prior=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{assert.equal(canAccess(undefined,undefined),false);}finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
});
