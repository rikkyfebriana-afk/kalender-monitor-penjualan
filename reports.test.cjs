const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),html=read('index.html'),enh=read('enhancements.js');
const c=vm.createContext({Intl,num:n=>new Intl.NumberFormat('id-ID').format(n),rupiah:n=>'Rp '+new Intl.NumberFormat('id-ID').format(n),today:()=> '2026-11-18'});
let code=html.slice(html.indexOf('function monthEnd'),html.indexOf('function toast'))+enh.slice(enh.indexOf('function goalFor'),enh.indexOf('const baseRender'));
code+=enh.slice(enh.indexOf('function annualStats'),enh.indexOf('function annualStats')+enh.slice(enh.indexOf('function annualStats')).indexOf('\n}')+2);
for(const p of ['deposits.js','central.js']){const s=read(p);code+=s.slice(0,s.indexOf("document.querySelector('nav')"))}
const tr=read('trends.js');code+=tr.slice(0,tr.indexOf('const trendMetrics'));
const central=read('central.js');code+=central.slice(central.indexOf('function centralAllocationText'),central.indexOf('function renderCentral'));
const report=read('reports.js');code+=report.slice(0,report.indexOf('exportPdf=function'));
vm.runInContext(code,c);
const order={id:'o1',date:'2026-11-01',salesId:'a',customer:'PT Contoh',type:'Meja',qty:10,price:10000,status:'Selesai',paymentStatus:'Lunas',paymentRecipient:'Sales',address:'Bandung',notes:'Catatan'};
const data={sales:[{id:'a',name:'Andi',area:'Bandung',targets:{'2026-11':20}},{id:'b',name:'Budi',targets:{'2026-11':30}}],orders:[order,{...order,id:'o2',salesId:'b',qty:5,paymentStatus:'DP / Sebagian',amountPaid:25000},{...order,id:'o3',status:'Dibatalkan'}],teamTargets:{'2026-11':100},annualTargets:{2026:200},deposits:[],centralTransfers:[]};
const range={start:'2026-11-01',end:'2026-11-30'},m=c.salesReportModel(data,data.orders,range,'');
assert.equal(m.qty,15);assert.equal(m.paid,125000);assert.equal(m.goal,100);assert.equal(m.achievement,15);assert.equal(m.performance[0].achievement,50);assert.equal(c.reportPercent(1,0),'-');assert.equal(c.reportPercent(1,3),'33,3%');
const d={id:'d1',orderId:'o1',salesId:'a',date:'2026-11-02',amount:60000,status:'Terverifikasi',method:'Transfer',history:[{at:'2026-11-02',actor:'Admin',status:'Terverifikasi',note:'OK'}]};data.deposits=[d];
data.centralTransfers=[{id:'t1',date:'2026-11-03',sender:'Admin',destination:'Pusat',amount:30000,allocations:[{depositId:'d1',amount:30000}],method:'Transfer',status:'Dikirim - menunggu konfirmasi',createdBy:'Admin',createdAt:'2026-11-03',history:[{at:'2026-11-03',actor:'Admin',status:'Dikirim - menunggu konfirmasi'}]}];
function check(pdf){assert(pdf.startsWith('%PDF-1.4'));const at=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(at,at+4),'xref');const lines=pdf.slice(at).split('\n');for(let i=1;i<Number(lines[1].split(' ')[1]);i++)assert(pdf.slice(Number(lines[i+2].slice(0,10))).startsWith(i+' 0 obj'));assert(!pdf.includes('NaN'));return pdf}
const sales=check(c.makeSalesTableReport(data,data.orders,range,'',2026,'November 2026'));assert(sales.includes('(15%)'));assert(sales.includes('(50%)'));assert(sales.includes('125.000'));fs.writeFileSync('report-preview.pdf',sales);
check(c.makeSalesTableReport(data,data.orders,null,'',2026,'Seluruh periode'));
check(c.makeDepositTableReport(data,[d],'','November'));check(c.makeCentralTableReport(data,data.centralTransfers,'November'));check(c.makeCentralTableReport(data,data.centralTransfers,'Detail',true));
const empty={sales:[],orders:[],deposits:[],centralTransfers:[]};check(c.makeSalesTableReport(empty,[],range,'',2026,'Kosong'));check(c.makeDepositTableReport(empty,[],'','Kosong'));check(c.makeCentralTableReport(empty,[],'Kosong'));
const long=c.makeSalesTableReport(data,[{...order,notes:'Alamat sangat panjang '.repeat(1000)+'AKHIRCATATAN'}],range,'',2026,'Panjang');check(long);assert(long.includes('AKHIRCATATAN'));assert((long.match(/\(Catatan khusus\)/g)||[]).length>2);
console.log('PASS: dashboard calculations, percentages, all five report variants, empty data, long text pagination and valid PDF cross references.');
