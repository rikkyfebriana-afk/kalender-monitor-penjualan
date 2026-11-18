const accountsButton=document.createElement('button');
accountsButton.id='manageAccounts';accountsButton.type='button';accountsButton.textContent='Kelola akun';accountsButton.hidden=true;
document.querySelector('#accountBar').prepend(accountsButton);
document.body.insertAdjacentHTML('beforeend',`<dialog id="accountsDialog" aria-labelledby="accountsTitle" style="width:680px"><div class="modal-head"><h2 id="accountsTitle">Kelola akun tim</h2><button type="button" id="closeAccounts" aria-label="Tutup">×</button></div><p>Sales dapat melihat seluruh tim. Admin dapat mengelola data operasional. Hanya pemilik yang dapat membuat akun dan mengatur akses admin.</p><form id="createAccountForm" style="margin:20px 0"><label>Nama sales<input id="newAccountName" required maxlength="60" autocomplete="name"></label><label>Email<input id="newAccountEmail" type="email" required maxlength="254" autocomplete="off"></label><label>Password awal<input id="newAccountPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p>Minimal 12 karakter. Sampaikan email dan password kepada sales secara pribadi. Tidak ada email otomatis. Setelah akun dibuat, klik Jadikan admin pada daftar di bawah jika diperlukan.</p><button class="primary" id="createAccountButton" style="margin-top:12px">Buat akun sales</button></form><p id="accountsMessage" role="status" aria-live="polite"></p><div class="card-head" style="margin-top:24px"><h2>Akun terdaftar</h2><button class="outline" id="reloadAccounts">Perbarui</button></div><div id="accountsList"></div><div style="display:flex;justify-content:space-between;margin-top:16px"><button class="outline" id="accountsPrev">← Sebelumnya</button><span id="accountsPage"></span><button class="outline" id="accountsNext">Berikutnya →</button></div></dialog><style>#createAccountForm label{display:block;font-size:12px;margin:12px 0}#createAccountForm input{display:block;width:100%;margin-top:6px}#manageAccounts[hidden]{display:none}#accountsMessage{color:#176953}#accountsDialog button:disabled{opacity:.5;cursor:wait}</style>`);
let accountsPage=1,accountsBusy=false;
async function callAccounts(body){
 const {data:{session}}=await client.auth.getSession();
 if(!session)throw Error('Sesi berakhir. Silakan masuk kembali.');
 const {data,error}=await client.functions.invoke('calendar-accounts',{body,headers:{Authorization:'Bearer '+session.access_token}});
 if(error){let message='Layanan akun tidak dapat dihubungi. Periksa daftar akun sebelum mencoba lagi.';try{const detail=await error.context.json();if(detail.error)message=detail.error}catch{}throw Error(message)}
 if(data?.error)throw Error(data.error);
 return data;
}
async function loadAccounts(){
 $('#accountsList').textContent='Memuat daftar akun…';
 $('#accountsPrev').disabled=true;$('#accountsNext').disabled=true;
 try{
  const data=await callAccounts({action:'list',page:accountsPage});
  const access=await client.from('calendar_admins').select('user_id');
  if(access.error)throw access.error;
  const adminIds=new Set(access.data.map(a=>a.user_id));
  if(!currentUser||!isOwner)return;
  $('#accountsList').innerHTML='<div class="table-wrap"><table><thead><tr><th>Nama / Email</th><th>Akses</th><th>Tindakan</th></tr></thead><tbody>'+data.users.map(u=>'<tr><td><b>'+esc(u.name||'—')+'</b><p>'+esc(u.email)+'</p></td><td>'+esc(u.id===currentUser.id?'Pemilik':adminIds.has(u.id)?'Admin':'Sales - lihat tim')+'</td><td>'+(u.id===currentUser.id?'Akses pemilik tetap':'<button type="button" class="outline" data-account-role="'+esc(u.id)+'" data-admin="'+adminIds.has(u.id)+'">'+(adminIds.has(u.id)?'Cabut akses admin':'Jadikan admin')+'</button>')+'</td></tr>').join('')+'</tbody></table></div>';
  $('#accountsPage').textContent='Halaman '+accountsPage;
  $('#accountsPrev').disabled=accountsPage===1;$('#accountsNext').disabled=!data.hasMore;
 }catch(e){$('#accountsList').textContent=e.message}
}
function resetAccounts(){accountsButton.hidden=true;$('#accountsDialog').close();$('#createAccountForm').reset();$('#accountsList').textContent='';$('#accountsMessage').textContent=''}
accountsButton.onclick=()=>{if(!isOwner)return;$('#accountsDialog').showModal();accountsPage=1;$('#accountsMessage').textContent='';loadAccounts()};
$('#closeAccounts').onclick=()=>{if(!accountsBusy){$('#accountsDialog').close();$('#newAccountPassword').value=''}};
$('#accountsDialog').addEventListener('cancel',e=>{if(accountsBusy)e.preventDefault();else $('#newAccountPassword').value=''});
$('#reloadAccounts').onclick=()=>{if(!accountsBusy)loadAccounts()};
$('#accountsPrev').onclick=()=>{if(accountsPage>1){accountsPage--;loadAccounts()}};
$('#accountsNext').onclick=()=>{accountsPage++;loadAccounts()};
$('#createAccountForm').onsubmit=async e=>{
 e.preventDefault();if(!isOwner||accountsBusy)return;
 accountsBusy=true;$('#createAccountButton').disabled=true;$('#closeAccounts').disabled=true;
 $('#accountsMessage').textContent='Membuat akun…';
 try{
  const result=await callAccounts({action:'create',name:$('#newAccountName').value.trim(),email:$('#newAccountEmail').value.trim(),password:$('#newAccountPassword').value});
  $('#accountsMessage').textContent='Akun '+result.user.email+' berhasil dibuat. Sales dapat masuk melalui alamat web app ini.';
  $('#createAccountForm').reset();accountsPage=1;await loadAccounts();
 }catch(error){$('#accountsMessage').textContent=error.message}
 finally{accountsBusy=false;$('#createAccountButton').disabled=false;$('#closeAccounts').disabled=false;$('#newAccountPassword').value=''}
};
client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')resetAccounts()});
document.addEventListener('calendar-access',()=>{accountsButton.hidden=!isOwner;if(!isOwner)resetAccounts()});
accountsButton.hidden=!isOwner;


$('#accountsList').addEventListener('click',async e=>{
 const button=e.target.closest('[data-account-role]');
 if(!button||!isOwner||accountsBusy)return;
 const userId=button.dataset.accountRole,remove=button.dataset.admin==='true';
 if(userId===currentUser.id)return;
 if(!confirm(remove?'Cabut akses admin akun ini? Akun tetap dapat melihat data tim.':'Jadikan akun ini admin? Admin dapat menambah, mengubah, dan menghapus data operasional seluruh tim.'))return;
 accountsBusy=true;button.disabled=true;$('#accountsMessage').textContent='Menyimpan hak akses...';
 try{
  const result=remove?await client.from('calendar_admins').delete().eq('user_id',userId).select('user_id'):await client.from('calendar_admins').insert({user_id:userId,granted_by:currentUser.id}).select('user_id');
  if(result.error||!result.data?.length)throw Error('Hak akses belum dapat diubah. Perbarui daftar lalu coba lagi.');
  $('#accountsMessage').textContent=remove?'Akses admin dicabut. Akun menjadi sales dengan akses lihat.':'Akses admin berhasil diberikan. Minta pengguna memuat ulang halaman atau masuk kembali.';
  await loadAccounts();
 }catch(error){$('#accountsMessage').textContent=error.message}
 finally{accountsBusy=false;button.disabled=false}
});
