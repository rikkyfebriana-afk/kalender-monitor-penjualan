export function makeHandler({url,serviceKey,fetcher=fetch}) {
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 async function api(path,options={}) {
  const response=await fetcher(url+path,{...options,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',...options.headers}});
  let data;try{data=await response.json()}catch{data={}};
  return {ok:response.ok,status:response.status,data};
 }
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Metode tidak didukung.'});
  if(!url||!serviceKey)return reply(503,{error:'Layanan akun belum siap.'});
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Silakan masuk kembali.'});
  try{
   const auth=await api('/auth/v1/user',{headers:{Authorization:authorization}});
   if(!auth.ok||!auth.data.id||auth.data.is_anonymous)return reply(401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
   const team=await api('/rest/v1/calendar_team?id=eq.1&select=owner_id');
   if(!team.ok)return reply(503,{error:'Hak akses belum dapat diperiksa.'});
   const owner=team.data?.[0]?.owner_id;
   if(!owner||owner!==auth.data.id)return reply(403,{error:'Hanya admin yang dapat mengelola akun.'});
   const raw=await req.text();
   if(raw.length>4096)return reply(413,{error:'Permintaan terlalu besar.'});
   let body;try{body=JSON.parse(raw)}catch{return reply(400,{error:'Permintaan tidak valid.'})}
   if(body.action==='list'){
    const page=Number(body.page||1);
    if(!Number.isInteger(page)||page<1||page>10000)return reply(400,{error:'Halaman tidak valid.'});
    const result=await api('/auth/v1/admin/users?page='+page+'&per_page=50');
    if(!result.ok)return reply(503,{error:'Daftar akun belum dapat dimuat.'});
    const users=result.data.users||[];
    return reply(200,{users:users.map(u=>({id:u.id,email:u.email||'',name:u.user_metadata?.name||'',role:u.id===owner?'Admin':'Sales — lihat tim',created_at:u.created_at})),page,hasMore:users.length===50});
   }
   if(body.action!=='create')return reply(400,{error:'Aksi tidak didukung.'});
   const name=typeof body.name==='string'?body.name.trim():'';
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   const password=typeof body.password==='string'?body.password:'';
   if(!name||name.length>60||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||password.length<12||password.length>128)return reply(400,{error:'Isi nama, email valid, dan password 12–128 karakter.'});
   const result=await api('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,user_metadata:{name},app_metadata:{calendar_role:'viewer'}})});
   if(!result.ok){
    if(result.status===422||result.status===400)return reply(400,{error:'Akun tidak dapat dibuat. Email mungkin sudah terdaftar atau password belum memenuhi ketentuan.'});
    if(result.status===429)return reply(429,{error:'Terlalu banyak permintaan. Coba beberapa saat lagi.'});
    return reply(503,{error:'Pembuatan akun belum dapat dipastikan. Periksa daftar akun sebelum mencoba lagi.'});
   }
   return reply(201,{user:{id:result.data.id,email:result.data.email,name,role:'Sales — lihat tim'}});
  }catch{return reply(503,{error:'Layanan tidak dapat dihubungi. Periksa daftar akun sebelum mencoba lagi.'})}
 };
}

