const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('accounts.js','utf8'),nodes=new Map();
function node(k){if(!nodes.has(k))nodes.set(k,{hidden:false,value:'',innerHTML:'',textContent:'',dataset:{},prepend(){},close(){},reset(){},addEventListener(type,fn){this[type]=fn},insertAdjacentHTML(){}});return nodes.get(k)}
const users=[{id:'owner',name:'Owner',email:'owner@example.test'},{id:'admin',name:'Admin <b>',email:'admin@example.test'},{id:'viewer',email:'viewer@example.test'}];
const ctx=vm.createContext({document:{createElement:()=>node('button'),querySelector:node,body:node('body'),addEventListener(type,fn){node('events')[type]=fn}},$:node,currentUser:{id:'owner'},isOwner:true,Set,esc:s=>String(s??'').replaceAll('<','&lt;'),client:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}}),onAuthStateChange(){}},functions:{invoke:async()=>({data:{users,hasMore:false}})},from:()=>({select:async()=>({data:[{user_id:'admin'}]})})}});
vm.runInContext(source,ctx);
(async()=>{
 await ctx.loadAccounts();const html=node('#accountsList').innerHTML;
 assert(html.includes('Pemilik'));assert(html.includes('Cabut akses admin'));assert(html.includes('Jadikan admin'));assert(!html.includes('data-account-role="owner"'));assert(html.includes('Admin &lt;b>'));
 ctx.isOwner=false;node('events')['calendar-access']();assert.equal(node('button').hidden,true);
 const index=fs.readFileSync('index.html','utf8'),load=index.slice(index.indexOf('async function loadData'),index.indexOf('async function save'));
 for(const [owner,member,allowed] of [[true,false,true],[false,true,true],[false,false,false]]){
  const c=vm.createContext({client:{from:table=>({select:()=>({eq:()=>({single:async()=>({data:{owner_id:owner?'me':'other',payload:{},revision:1}}),maybeSingle:async()=>({data:member?{user_id:'me'}:null})})})})},currentUser:{id:'me'},document:{body:{classList:{toggle(){}}},dispatchEvent(){}},Event:class{},render(){}});vm.runInContext(load,c);await c.loadData();assert.equal(c.canEdit,allowed);assert.equal(c.isOwner,owner);
 }
 console.log('PASS: owner/admin/viewer access, escaped account list, protected owner and owner-only account controls.');
})().catch(e=>{console.error(e);process.exitCode=1});
