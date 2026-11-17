/* Calendar sales: compatible additions to the existing shared payload. */
const paymentMethods=['Belum ditentukan','Transfer','Cash'];
const paymentStates=['Belum dibayar','DP / Sebagian','Lunas'];
const selectField=(label,name,value,options)=>`<label>${label}<select name="${name}">${options.map(x=>`<option ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
document.head.insertAdjacentHTML('beforeend',`<style>textarea{font:inherit;border:1px solid #dfe5df;border-radius:6px;padding:11px;resize:vertical;width:100%;margin-top:6px}dialog{max-height:90vh;overflow:auto}.customer-detail{white-space:normal;min-width:200px;max-width:310px;overflow-wrap:anywhere}.report-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.payment-summary{display:flex;gap:20px;flex-wrap:wrap;margin:14px 0;color:var(--green);font-size:12px}.team-viewer #editTeamTarget{display:none}#targetHelp{margin-bottom:12px}</style>`);
$('#export').insertAdjacentHTML('afterend','<button class="outline" id="reportPdf"> |  Laporan PDF</button>');
$('.target-card').insertAdjacentHTML('beforeend','<p id="targetHelp"></p><button class="outline" id="editTeamTarget">Atur target bulanan</button>');
$('#orderTable').insertAdjacentHTML('beforebegin','<div class="payment-summary" id="paymentSummary"></div>');
function goalFor(data,month,salesId=''){
 if(!salesId&&Object.hasOwn(data.teamTargets||{},month))return data.teamTargets[month];
 return data.sales.filter(s=>!salesId||s.id===salesId).reduce((n,s)=>n+(s.targets[month]||0),0);
}
function paidAmount(o){return o.status==='Dibatalkan'?0:o.paymentStatus==='Lunas'?o.qty*o.price:o.paymentStatus==='DP / Sebagian'?Math.min(o.qty*o.price,Number(o.amountPaid)||0):0}
function financials(orders){return orders.filter(o=>o.status!=='Dibatalkan').reduce((a,o)=>({revenue:a.revenue+o.qty*o.price,paid:a.paid+paidAmount(o),qty:a.qty+o.qty}),{revenue:0,paid:0,qty:0})}
const baseRender=render;
render=function(){baseRender();const goal=rangeMonths(activeRange).reduce((n,m)=>n+goalFor(state,m,$('#salesFilter').value),0),t=totals(validOrders()),pct=goal?Math.round(t.qty/goal*100):0;
 $('#target').innerHTML=`<div class="target-number">${goal?pct:'-'}<small>${goal?' %':''}</small></div><div class="progress"><span style="width:${Math.min(100,pct)}%"></span></div><div class="target-caption"><span>${num(t.qty)} unit terjual</span><span>${num(goal)} unit target</span></div>`;
 const metric=$$('#metrics .metric')[2];metric.querySelector('.metric-value').textContent=goal?pct+'%':'-';metric.querySelector('.metric-note').textContent=num(goal)+' eksemplar; target bulan penuh, tanpa prorata';
 $('#targetHelp').textContent='Target periode adalah jumlah target bulan yang tercakup, tanpa prorata tanggal. Target tahunan perusahaan dihitung terpisah.';
 $('#editTeamTarget').hidden=!canEdit;
 renderAnnual();renderRangeChart();$('#monthLabel').textContent=rangeLabel();
};
const baseOrders=renderOrders;
renderOrders=function(){baseOrders();const orders=allOrders().filter(o=>o.customer.toLowerCase().includes($('#search').value.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
 $$('#orderTable tbody tr').forEach((row,i)=>{const o=orders[i];row.cells[0].classList.add('customer-detail');row.cells[0].insertAdjacentHTML('beforeend',`<p>${esc(o.address||'Alamat belum diisi')}</p>${o.contact?'<p>Kontak: '+esc(o.contact)+'</p>':''}${o.notes?'<p>Catatan: '+esc(o.notes)+'</p>':''}`);row.cells[5].insertAdjacentHTML('beforeend',`<p>${esc(o.paymentMethod||'Belum ditentukan')}</p><p>${esc(o.paymentStatus||'Belum dicatat')}</p>`)});
 const f=financials(orders);$('#paymentSummary').textContent=`Nilai pesanan: ${rupiah(f.revenue)}  |  Pembayaran tercatat: ${rupiah(f.paid)}  |  Sisa tagihan: ${rupiah(f.revenue-f.paid)}`;
};
const baseOpenOrder=openOrder;
openOrder=function(id){baseOpenOrder(id);if(!canEdit||editing?.kind!=='order')return;const o=state.orders.find(o=>o.id===id)||{};
 $('#fields').insertAdjacentHTML('beforeend',`<label>Alamat pelanggan<textarea name="address" rows="2" maxlength="1000" placeholder="Jalan, nomor, kota, kode pos">${esc(o.address||'')}</textarea></label>`+field('Kontak / WhatsApp (opsional)','contact',o.contact||'','text','maxlength="100"')+'<div class="pair">'+selectField('Metode pembayaran','paymentMethod',o.paymentMethod||'Belum ditentukan',paymentMethods)+selectField('Status pembayaran','paymentStatus',o.paymentStatus||'Belum dicatat',['Belum dicatat',...paymentStates])+'</div>'+field('Pembayaran diterima (Rp)','amountPaid',paidAmount(o)||0,'number','min="0" max="1000000000000000" step="1" required')+`<p>Untuk Lunas, nilai pembayaran otomatis sama dengan total pesanan. Pesanan dibatalkan tidak dihitung dalam rekap.</p><label>Catatan khusus<textarea name="notes" rows="3" maxlength="2000" placeholder="Detail pengiriman, permintaan customer, atau keterangan lain">${esc(o.notes||'')}</textarea></label>`);
 const syncPayment=()=>{const f=$('#form').elements,total=Number(f.qty.value)*Number(f.price.value);f.amountPaid.readOnly=f.paymentStatus.value!=='DP / Sebagian';if(f.paymentStatus.value==='Lunas')f.amountPaid.value=total;else if(f.paymentStatus.value!=='DP / Sebagian')f.amountPaid.value=0;f.amountPaid.max=total;};
 ['qty','price','paymentStatus'].forEach(n=>$('#form').elements[n].addEventListener('input',syncPayment));syncPayment();
};
$('#editTeamTarget').onclick=()=>{if(!canEdit)return;editing={kind:'teamTarget',month:activeRange.start.slice(0,7)};$('#modalTitle').textContent='Target total bulanan';$('#fields').innerHTML=`<p>Periode ${esc(editing.month)} (bulan awal rentang). Kosongkan untuk mengikuti jumlah target tiap sales. Nilai 0 berarti tanpa target.</p>`+field('Target kalender (unit)','teamTarget',state.teamTargets?.[editing.month]??'','number','min="0" max="100000000" step="1"');$('#modal').showModal()};
const baseSubmit=$('#form').onsubmit;
$('#form').onsubmit=async e=>{e.preventDefault();if(!canEdit||saving)return;
 if(editing.kind==='annualTarget'){const n=Number(e.target.elements.annualTarget.value);if(!Number.isInteger(n)||n<0||n>100000000)return;state.annualTargets={...(state.annualTargets||{}),[editing.year]:n};if(await save()){render();$('#modal').close();toast('Target tahunan perusahaan disimpan')}return;}
 if(editing.kind==='teamTarget'){const value=e.target.elements.teamTarget.value;state.teamTargets={...(state.teamTargets||{})};if(value==='')delete state.teamTargets[editing.month];else{const n=Number(value);if(!Number.isInteger(n)||n<0||n>100000000)return;state.teamTargets[editing.month]=n}if(await save()){render();$('#modal').close();toast('Target bulanan disimpan')}return;}
 if(editing.kind==='order'){const f=e.target.elements,total=Number(f.qty.value)*Number(f.price.value),paid=Number(f.amountPaid.value);if(!Number.isFinite(paid)||paid<0||paid>total){toast('Pembayaran tidak boleh melebihi nilai pesanan.');return}if(f.paymentStatus.value==='DP / Sebagian'&&(paid<=0||paid>=total)){toast('DP harus lebih dari 0 dan kurang dari total pesanan.');return}}
 await baseSubmit(e);
};
const baseValidate=validate;
validate=function(s){if(!baseValidate(s)||!validAnnualTargets(s.annualTargets))return false;if(s.teamTargets&&(Array.isArray(s.teamTargets)||typeof s.teamTargets!=='object'||Object.entries(s.teamTargets).some(([m,n])=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||!Number.isInteger(n)||n<0||n>100000000)))return false;
 return s.orders.every(o=>['address','contact','notes'].every(k=>o[k]===undefined||typeof o[k]==='string')&&(o.paymentMethod===undefined||paymentMethods.includes(o.paymentMethod))&&(o.paymentStatus===undefined||['Belum dicatat',...paymentStates].includes(o.paymentStatus))&&(o.amountPaid===undefined||(Number.isFinite(Number(o.amountPaid))&&Number(o.amountPaid)>=0&&Number(o.amountPaid)<=o.qty*o.price)));};
$('#export').onclick=()=>{const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['Tanggal','Pelanggan','Alamat','Kontak','Sales','Jenis kalender','Jumlah','Harga per unit','Total','Status pesanan','Metode pembayaran','Status pembayaran','Pembayaran tercatat','Sisa tagihan','Catatan'],...allOrders().map(o=>[o.date,o.customer,o.address,o.contact,salesName(o.salesId),o.type,o.qty,o.price,o.qty*o.price,o.status,o.paymentMethod||'Belum ditentukan',o.paymentStatus||'Belum dicatat',paidAmount(o),o.status==='Dibatalkan'?0:o.qty*o.price-paidAmount(o),o.notes])];download('Penjualan-Kalender-'+activeRange.start+'_'+activeRange.end+'.csv','\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8')};
/* Dependency-free PDF writer: paginated, wrapped text with standard PDF fonts. */
function pdfDocument(lines){
 const ascii=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ');
 const wrapped=[];for(const line of lines){let text=ascii(line);if(!text){wrapped.push('');continue}while(text.length>94){let cut=text.lastIndexOf(' ',94);if(cut<1)cut=94;wrapped.push(text.slice(0,cut));text=text.slice(cut).trimStart()}wrapped.push(text)}
 const pages=[];for(let i=0;i<wrapped.length;i+=48)pages.push(wrapped.slice(i,i+48));if(!pages.length)pages.push([]);
 const objects=['','<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const escape=s=>s.replace(/([\\()])/g,'\\$1');const kids=[];
 pages.forEach((lines,i)=>{const pageId=objects.length,streamId=pageId+1;kids.push(pageId+' 0 R');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);const stream='0.10 0.25 0.21 rg\nBT /F1 10 Tf 15 TL 42 790 Td '+lines.map((l,j)=>(j?'T* ':'')+'('+escape(l)+') Tj').join('\n')+`\nET\nBT /F1 9 Tf 42 30 Td (Kalender - Halaman ${i+1} / ${pages.length}) Tj ET`;objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream')});
 objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';return pdf+'trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
}
function reportLines(data,orders,label,month,salesId){const f=financials(orders),lines=['KALENDER | LAPORAN PENJUALAN',label,'Dicetak: '+today(),'','RINGKASAN',`Kalender terjual: ${num(f.qty)} unit | Nilai pesanan: ${rupiah(f.revenue)}`,`Pembayaran tercatat: ${rupiah(f.paid)} | Sisa tagihan: ${rupiah(f.revenue-f.paid)}`,`Pesanan: ${orders.length} | Dibatalkan: ${orders.filter(o=>o.status==='Dibatalkan').length}`,'Pesanan dibatalkan dikecualikan dari unit, omzet, dan pembayaran.','Pembayaran yang belum dicatat dianggap 0; periksa data lama.'];
 if(month){const goal=goalFor(data,month,salesId);lines.push(`Target periode: ${num(goal)} unit | Pencapaian: ${goal?Math.round(f.qty/goal*100)+'%':'Belum ada target'}`)}
 lines.push('','PERFORMA SALES');data.sales.filter(s=>!salesId||s.id===salesId).map(s=>({s,f:financials(orders.filter(o=>o.salesId===s.id))})).sort((a,b)=>b.f.qty-a.f.qty).forEach(({s,f},i)=>{const t=month?s.targets[month]||0:null;lines.push(`${i+1}. ${s.name} | ${num(f.qty)} unit | ${rupiah(f.revenue)}${t!==null?' | Target: '+num(t)+' unit':''}`)});
 lines.push('','DETAIL SELURUH PESANAN DALAM CAKUPAN LAPORAN');if(!orders.length)lines.push('Belum ada transaksi.');orders.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach((o,i)=>{lines.push('',`${i+1}. ${o.date} | ${o.customer}`,`Sales: ${data.sales.find(s=>s.id===o.salesId)?.name||'Sales dihapus'} | Status pesanan: ${o.status}`,`Alamat: ${o.address||'Belum diisi'} | Kontak: ${o.contact||'-'}`,`${o.type} | ${num(o.qty)} unit x ${rupiah(o.price)} = ${rupiah(o.qty*o.price)}`,`Pembayaran: ${o.paymentMethod||'Belum ditentukan'} | ${o.paymentStatus||'Belum dicatat'}`,`Diterima: ${rupiah(paidAmount(o))} | Sisa: ${rupiah(o.status==='Dibatalkan'?0:o.qty*o.price-paidAmount(o))}`,`Catatan: ${o.notes||'-'}`)});return lines;
}
document.body.insertAdjacentHTML('beforeend',`<dialog id="reportDialog" aria-labelledby="reportTitle"><div class="modal-head"><h2 id="reportTitle">Unduh laporan PDF</h2><button id="closeReport" aria-label="Tutup">x</button></div><p>Laporan memuat ringkasan, performa sales, dan detail customer serta pembayaran. Pencarian nama pelanggan tidak membatasi laporan.</p><div class="report-actions"><button class="primary" id="pdfPeriod">Periode & sales terpilih</button><button class="outline" id="pdfAll">Semua periode & sales</button></div><p>Data lama yang belum memiliki informasi pembayaran ditandai "Belum dicatat".</p></dialog>`);
$('#reportPdf').onclick=()=>$('#reportDialog').showModal();$('#closeReport').onclick=()=>$('#reportDialog').close();
function exportPdf(all){try{const orders=all?state.orders:allOrders(),label=all?'Seluruh periode - seluruh sales':rangeLabel()+' - '+($('#salesFilter').value?salesName($('#salesFilter').value):'Seluruh sales');const lines=reportLines(state,orders,label,null,all?'':$('#salesFilter').value);const year=$('#annualYear').value,a=annualStats(state,year);lines.splice(4,0,'TARGET TAHUNAN PERUSAHAAN '+year,annualReportText(a),'Cakupan target tahunan: seluruh sales, 1 Januari sampai 31 Desember; terpisah dari filter laporan.','');if(!all)lines.splice(4,0,'Rentang tanggal termasuk tanggal mulai dan akhir.','');download('Laporan-Kalender-'+(all?'Semua-Periode':activeRange.start+'_'+activeRange.end)+'.pdf',pdfDocument(lines),'application/pdf');$('#reportDialog').close();toast('Laporan PDF berhasil diunduh')}catch{toast('Laporan gagal dibuat. Silakan coba kembali.')}}
$('#pdfPeriod').onclick=()=>exportPdf(false);$('#pdfAll').onclick=()=>exportPdf(true);

function validAnnualTargets(targets){
 return targets===undefined||!!targets&&typeof targets==='object'&&!Array.isArray(targets)&&Object.entries(targets).every(([y,n])=>/^20\d{2}$|^2100$/.test(y)&&Number.isInteger(n)&&n>=0&&n<=100000000);
}
function annualStats(data,year){
 const goal=Object.hasOwn(data.annualTargets||{},year)?data.annualTargets[year]:null;
 const qty=data.orders.filter(o=>o.date.slice(0,4)===String(year)&&o.status!=='Dibatalkan').reduce((n,o)=>n+o.qty,0);
 return {goal,qty,remaining:goal===null?null:Math.max(0,goal-qty),percent:goal>0?Math.round(qty/goal*100):null};
}
function annualReportText(a){return 'Target: '+(a.goal===null?'Belum diatur':num(a.goal)+' eksemplar')+' | Terjual: '+num(a.qty)+' eksemplar | Sisa: '+(a.remaining===null?'-':num(a.remaining))+' | Pencapaian: '+(a.percent===null?'-':a.percent+'%')}
function renderAnnual(){
 const year=$('#annualYear').value,a=annualStats(state,year);
 $('#annualProgress').innerHTML='<div class="annual-stats"><div><p>Target perusahaan '+esc(year)+'</p><h2>'+(a.goal===null?'Belum diatur':num(a.goal)+' <small>eksemplar</small>')+'</h2></div><div><p>Terjual sepanjang '+esc(year)+'</p><h2>'+num(a.qty)+' <small>eksemplar</small></h2></div><div><p>Sisa menuju target</p><h2>'+(a.remaining===null?'-':num(a.remaining)+' <small>eksemplar</small>')+'</h2></div><div><p>Pencapaian tahunan</p><h2>'+(a.percent===null?'-':a.percent+'%')+'</h2></div></div><div class="progress"><span style="width:'+Math.min(100,a.percent||0)+'%"></span></div><p style="margin-top:12px">Seluruh sales, 1 Januari - 31 Desember '+esc(year)+'. Tidak mengikuti filter tanggal atau sales. Pesanan dibatalkan tidak dihitung.</p>';
 $('#editAnnualTarget').hidden=!canEdit;
}
function chartBuckets(orders,r){
 const days=Math.round((Date.parse(r.end)-Date.parse(r.start))/86400000)+1,monthly=days>62;
 const keys=monthly?rangeMonths(r):Array.from({length:days},(_,i)=>new Date(Date.parse(r.start)+i*86400000).toISOString().slice(0,10));
 const counts=new Map(keys.map(k=>[k,0]));
 for(const o of orders){const k=monthly?o.date.slice(0,7):o.date;if(counts.has(k))counts.set(k,counts.get(k)+o.qty)}
 return {monthly,buckets:keys.map(key=>({key,qty:counts.get(key)}))};
}
function renderRangeChart(){
 const {monthly,buckets}=chartBuckets(validOrders(),activeRange),max=Math.max(1,...buckets.map(b=>b.qty)),step=Math.max(1,Math.ceil(buckets.length/8));
 $('#chart').innerHTML='<div class="bars">'+buckets.map((b,i)=>'<div class="bar-slot" title="'+esc(b.key)+': '+num(b.qty)+' eksemplar"><div class="bar" style="height:'+b.qty/max*140+'px"></div>'+(i%step===0?'<small>'+esc(monthly?b.key.slice(2):b.key.slice(5))+'</small>':'')+'</div>').join('')+'</div>';
 $('.chart-card p').textContent=(monthly?'Rekap per bulan':'Rekap per hari')+' | '+rangeLabel();
}
function applyDateRange(){
 const next={start:$('#dateStart').value,end:$('#dateEnd').value};
 if(!validRange(next)){toast('Isi tanggal valid (2000-2100). Tanggal akhir tidak boleh sebelum tanggal mulai.');return false}
 activeRange=next;render();return true;
}
document.head.insertAdjacentHTML('beforeend','<style>.annual-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:20px}.annual-stats h2{font-size:25px;margin-top:8px}.annual-stats small{font-size:11px;font-weight:400}.filters{flex-wrap:wrap}.toolbar{align-items:flex-start}.team-viewer #editAnnualTarget{display:none!important}@media(max-width:800px){.annual-stats{grid-template-columns:repeat(2,1fr)}.filters label span{display:inline}}</style>');
$('#editAnnualTarget').onclick=()=>{if(!canEdit)return;const year=$('#annualYear').value;editing={kind:'annualTarget',year};$('#modalTitle').textContent='Target perusahaan tahun '+year;$('#fields').innerHTML='<p>Tetapkan jumlah eksemplar kalender yang ingin dijual selama 1 Januari - 31 Desember '+esc(year)+'. Target ini berdiri sendiri dan tidak mengubah target sales.</p>'+field('Target penjualan tahunan (eksemplar)','annualTarget',state.annualTargets?.[year]??'','number','required min="0" max="100000000" step="1"');$('#modal').showModal()};
let selectedAnnualYear=$('#annualYear').value;
$('#annualYear').onchange=()=>{const year=$('#annualYear').value;if(!/^(20\d{2}|2100)$/.test(year)){toast('Pilih tahun 2000 sampai 2100.');$('#annualYear').value=selectedAnnualYear;return}selectedAnnualYear=year;renderAnnual()};
$('#applyRange').onclick=()=>{if(applyDateRange())$('#quickRange').value=''};
$('#quickRange').onchange=()=>{const kind=$('#quickRange').value;if(!kind)return;const t=today(),m=t.slice(0,7),y=t.slice(0,4);$('#dateStart').value=kind==='today'?t:kind==='month'?m+'-01':y+'-01-01';$('#dateEnd').value=kind==='today'?t:kind==='month'?monthEnd(m):y+'-12-31';applyDateRange()};

// Rebind listeners that held the original functions.
$('#salesFilter').onchange=()=>render();$('#search').oninput=()=>renderOrders();render();