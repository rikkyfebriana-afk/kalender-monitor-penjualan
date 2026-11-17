import {makeHandler} from './supabase/functions/calendar-accounts/handler.mjs';
import assert from 'node:assert/strict';
let calls=[], actor='owner', createStatus=200;
const handler=makeHandler({url:'https://test.invalid',serviceKey:'server-only-test-key',fetcher:async(url,options)=>{
 calls.push({url,options});
 let data=url.endsWith('/user')?{id:actor}:url.includes('/rest/')?[{owner_id:'owner'}]:options.method==='POST'?{id:'new-user',email:'sales@example.com'}:{users:[{id:'owner',email:'admin@example.com',user_metadata:{name:'Admin'}},{id:'sales',email:'sales@example.com',user_metadata:{name:'Sales'}}]};
 return new Response(JSON.stringify(data),{status:options.method==='POST'?createStatus:200});
}});
const req=(body,token=true)=>new Request('https://test.invalid',{method:'POST',headers:token?{Authorization:'Bearer test-session'}:{},body:JSON.stringify(body)});
assert.equal((await handler(req({action:'list'},false))).status,401);assert.equal(calls.length,0);
actor='sales';assert.equal((await handler(req({action:'create'}))).status,403);assert(!calls.some(c=>c.url.includes('/admin/')));
actor='owner';calls=[];assert.equal((await handler(req({action:'create',name:'Sales',email:'bad',password:'short'}))).status,400);assert(!calls.some(c=>c.url.includes('/admin/')));
const created=await handler(req({action:'create',name:' Sales ',email:'SALES@example.com',password:'long-test-password',role:'admin'}));assert.equal(created.status,201);
const sent=JSON.parse(calls.at(-1).options.body);assert.equal(sent.app_metadata.calendar_role,'viewer');assert.equal(sent.email,'sales@example.com');assert.equal(sent.name,undefined);assert.equal(sent.email_confirm,true);
assert(!JSON.stringify(await created.json()).includes('password'));
createStatus=422;assert.equal((await handler(req({action:'create',name:'Sales',email:'sales@example.com',password:'long-test-password'}))).status,400);
const list=await handler(req({action:'list'}));const data=await list.json();assert.equal(data.users[0].role,'Admin');assert.equal(data.users[1].role,'Sales — lihat tim');assert.equal(data.hasMore,false);
assert.equal((await handler(req({action:'list',page:-1}))).status,400);
console.log('PASS: unauthenticated, non-admin, validation, fixed viewer role, creation, duplicate, pagination and no password disclosure.');
