const accountsButton=document.createElement('button');
accountsButton.id='manageAccounts';accountsButton.type='button';accountsButton.textContent='Kelola akun';accountsButton.hidden=true;
document.querySelector('#accountBar').prepend(accountsButton);
document.body.insertAdjacentHTML('beforeend',`<dialog id="accountsDialog" aria-labelledby="accountsTitle" style="width:680px"><div class="modal-head"><h2 id="accountsTitle">Kelola akun sales</h2><button type="button" id="closeAccounts" aria-label="Tutup">×</button></div><p>Akun sales dapat melihat penjualan seluruh tim. Hanya admin yang dapat mengubah data dan membuat akun.</p><form id="createAccountForm" style="margin:20px 0"><label>Nama sales<input id="newAccountName" required maxlength="60" autocomplete="name"></label><label>Email<input id="newAccountEmail" type="email" required maxlength="254" autocomplete="off"></label><label>Password awal<input id="newAccountPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p>Minimal 12 karakter. Sampaikan email dan password kepada sales secara pribadi. Tidak ada email otomatis.</p><button class="primary" id="createAccountButton" style="margin-top:12px">Buat akun sales</button></form><p id="accountsMessage" role="status" aria-live="polite"></p><div class="card-head" style="margin-top:24px"><h2>Akun terdaftar</h2><button class="outline" id="reloadAccounts">Perbarui</button></div><div id="accountsList"></div><div style="display:flex;justify-content:space-between;margin-top:16px"><button class="outline" id="accountsPrev">← Sebelumnya</button><span id="accountsPage"></span><button class="outline" id="accountsNext">Berikutnya →</button></div></dialog><style>#createAccountForm label{display:block;font-size:12px;margin:12px 0}#createAccountForm input{display:block;width:100%;margin-top:6px}#manageAccounts[hidden]{display:none}#accountsMessage{color:#176953}#accountsDialog button:disabled{opacity:.5;cursor:wait}</style>`);
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
  if(!currentUser||!canEdit)return;
  $('#accountsList').innerHTML='<div class="table-wrap"><table><thead><tr><th>Nama / Email</th><th>Akses</th></tr></thead><tbody>'+data.users.map(u=>'<tr><td><b>'+esc(u.name||'—')+'</b><p>'+esc(u.email)+'</p></td><td>'+esc(u.role)+'</td></tr>').join('')+'</tbody></table></div>';
  $('#accountsPage').textContent='Halaman '+accountsPage;
  $('#accountsPrev').disabled=accountsPage===1;$('#accountsNext').disabled=!data.hasMore;
 }catch(e){$('#accountsList').textContent=e.message}
}
function resetAccounts(){accountsButton.hidden=true;$('#accountsDialog').close();$('#createAccountForm').reset();$('#accountsList').textContent='';$('#accountsMessage').textContent=''}
accountsButton.onclick=()=>{if(!canEdit)return;$('#accountsDialog').showModal();accountsPage=1;$('#accountsMessage').textContent='';loadAccounts()};
$('#closeAccounts').onclick=()=>{if(!accountsBusy){$('#accountsDialog').close();$('#newAccountPassword').value=''}};
$('#accountsDialog').addEventListener('cancel',e=>{if(accountsBusy)e.preventDefault();else $('#newAccountPassword').value=''});
$('#reloadAccounts').onclick=()=>{if(!accountsBusy)loadAccounts()};
$('#accountsPrev').onclick=()=>{if(accountsPage>1){accountsPage--;loadAccounts()}};
$('#accountsNext').onclick=()=>{accountsPage++;loadAccounts()};
$('#createAccountForm').onsubmit=async e=>{
 e.preventDefault();if(!canEdit||accountsBusy)return;
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
document.addEventListener('calendar-access',()=>{accountsButton.hidden=!canEdit;if(!canEdit)resetAccounts()});
accountsButton.hidden=!canEdit;

