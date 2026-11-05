import {createHash, timingSafeEqual} from 'node:crypto';
export function canAccess(header,password){
 if(!password)return process.env.NODE_ENV!=='production';
 if(!header?.startsWith('Basic '))return false;
 const supplied=Buffer.from(header.slice(6),'base64').toString('utf8');
 const hash=s=>createHash('sha256').update(s).digest();
 return timingSafeEqual(hash(supplied),hash('abide:'+password));
}
