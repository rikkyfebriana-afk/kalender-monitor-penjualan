const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('enhancements.js','utf8');
const pure=src.slice(src.indexOf('function goalFor'),src.indexOf('const baseRender'))+src.slice(src.indexOf('function pdfDocument'),src.indexOf("document.body.insertAdjacentHTML('beforeend',`<dialog id=\"reportDialog\""));
const context=vm.createContext({num:n=>String(n),rupiah:n=>'Rp '+n,today:()=> '2026-11-17'});vm.runInContext(pure,context);
const data={sales:[{id:'a',name:'Sales A',targets:{'2026-11':100}}],orders:[]};
assert.equal(context.goalFor(data,'2026-11'),100);data.teamTargets={'2026-11':250};assert.equal(context.goalFor(data,'2026-11'),250);assert.equal(context.goalFor(data,'2026-11','a'),100);data.teamTargets['2026-11']=0;assert.equal(context.goalFor(data,'2026-11'),0);
const base={id:'1',date:'2026-11-17',salesId:'a',customer:'PT Customer (Bandung)',type:'Kalender meja',qty:10,price:10000,status:'Selesai'};
const orders=[base,{...base,paymentStatus:'Lunas'},{...base,paymentStatus:'DP / Sebagian',amountPaid:'25000'},{...base,status:'Dibatalkan',paymentStatus:'Lunas'}];
const f=context.financials(orders);assert.equal(f.revenue,300000);assert.equal(f.paid,125000);assert.equal(f.qty,30);
const lines=context.reportLines(data,orders,'Semua periode',null,'');assert(lines.some(l=>l.includes('Belum dicatat')));assert(lines.some(l=>l.includes('Dibatalkan: 1')));
const pdf=context.pdfDocument(Array.from({length:150},(_,i)=>'Customer '+i+' (A) \\ '+('alamat '.repeat(30))));assert(pdf.startsWith('%PDF-1.4'));assert(pdf.includes('/Count 10'));const at=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(at,at+4),'xref');
const xref=pdf.slice(at).split('\n');for(let i=1;i<Number(xref[1].split(' ')[1]);i++){const offset=Number(xref[i+2].slice(0,10));assert(pdf.slice(offset).startsWith(i+' 0 obj'))}
assert(context.pdfDocument([]).includes('/Count 1'));
console.log('PASS: target overrides and zero; sales scope; cancelled orders; legacy payments; partial and full payments; report content; multi-page PDF cross-reference offsets.');