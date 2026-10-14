/* Lightweight, dependency-free PDF report exporter for Koteka Workspace.
   PDF 1.4 vector text, pagination, page counters, styled tables. */
(function(){'use strict';
const tr = s => String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7e]/g,'?');
const esc=s=>tr(s).replace(/[\\()]/g,'\\$&');
const fmt=d=>new Date(d).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
function build({heading,subtitle,columns,rows,summary=[],filename='laporan-koteka.pdf'}){
 const W=595,H=842;const pages=[];let cmds=[],y=0,page=0;
 const cmd=s=>cmds.push(s), color=(r,g,b)=>`${r} ${g} ${b}`;
 function rect(x,top,w,h,rgb){cmd(`${color(...rgb)} rg ${x} ${H-top-h} ${w} ${h} re f`)}
 function line(x1,top1,x2,top2,rgb=[.88,.92,.95]){cmd(`${color(...rgb)} RG 0.6 w ${x1} ${H-top1} m ${x2} ${H-top2} l S`)}
 function text(s,x,top,opts={}){let {size=9,bold=false,fill=[.13,.23,.32]}=opts;cmd(`BT /${bold?'F2':'F1'} ${size} Tf ${color(...fill)} rg 1 0 0 1 ${x} ${H-top-size} Tm (${esc(s)}) Tj ET`)}
 function truncate(s,n){let v=tr(s);return v.length>n?v.slice(0,Math.max(2,n-3))+'...':v}
 function pageStart(){page++;cmds=[];rect(0,0,W,9,[.04,.15,.25]);rect(38,39,6,28,[.94,.75,.29]);text('KOTEKA DIGITAL',56,39,{size:13,bold:true,fill:[.05,.18,.3]});text('KOTEKA WORKSPACE  /  LAPORAN',56,58,{size:7,bold:true,fill:[.49,.6,.68]});line(38,83,557,83);text(heading,38,100,{size:19,bold:true});text(subtitle,38,132,{size:9,fill:[.43,.53,.62]});rect(38,159,519,25,[.96,.98,.99]);text('Data tercatat | dihasilkan '+fmt(Date.now()),48,165,{size:8,fill:[.45,.55,.64]});y=199;if(page===1&&summary.length){let n=Math.min(summary.length,4),gap=10,width=(519-gap*(n-1))/n;summary.slice(0,4).forEach((item,i)=>{let x=38+i*(width+gap);rect(x,y,width,62,[.95,.97,.99]);text(truncate(item.label,19),x+10,y+11,{size:8,fill:[.44,.56,.65]});text(truncate(item.value,18),x+10,y+29,{size:14,bold:true,fill:[.08,.26,.41]})});y+=81}tableHeader()}
 const colWidths=columns.map(c=>c.width),startX=38;
 function tableHeader(){rect(startX,y,519,26,[.07,.21,.33]);let x=startX;columns.forEach((c,i)=>{text(truncate(c.label,Math.round(colWidths[i]/5.4)),x+7,y+7,{size:8,bold:true,fill:[1,1,1]});x+=colWidths[i]});y+=27}
 function finish(){let yft=817;line(38,yft-8,557,yft-8);text('KOTEKA DIGITAL  |  DATA SESUAI SUMBER TERSEDIA',38,yft,{size:7,fill:[.53,.62,.69]});text('HAL '+page,530,yft,{size:7,bold:true});pages.push(cmds.join('\n'))}
 pageStart();
 if(!rows.length){text('Tidak ada data pada filter yang dipilih.',48,y+16,{size:10});finish()}
 else{rows.forEach((r,i)=>{if(y>772){finish();pageStart()}const h=29; if(i%2===0)rect(startX,y,519,h,[.975,.985,.992]);let x=startX;columns.forEach((c,j)=>{let max=Math.max(6,Math.floor((colWidths[j]-12)/4.8));text(truncate(r[c.key],max),x+7,y+8,{size:8,fill:[.2,.32,.42]});x+=colWidths[j]});y+=h});finish()}
 const objects=[];
 const add=s=>(objects.push(s),objects.length);
 const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const parent=add('');let ids=[];
 pages.forEach(stream=>{let content=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);ids.push(add(`<< /Type /Page /Parent ${parent} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${content} 0 R >>`))});
 objects[parent-1]=`<< /Type /Pages /Kids [${ids.map(i=>i+' 0 R').join(' ')}] /Count ${ids.length} >>`;
 let catalog=add(`<< /Type /Catalog /Pages ${parent} 0 R >>`);
 let output='%PDF-1.4\n%KOTEKA\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(output.length);output+=`${i+1} 0 obj\n${o}\nendobj\n`});let xref=output.length;output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)output+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';output+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 let data=new Uint8Array(output.length);for(let i=0;i<output.length;i++)data[i]=output.charCodeAt(i)&255;
 let url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));let a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);
 return {pages:pages.length,records:rows.length};
}
window.KotekaPDF={
 exportTraffic(records,meta){return build({heading:'Laporan Trafik Pengunjung',subtitle:`Periode: ${meta.period} | Kanal: ${meta.channel} | Perangkat: ${meta.device}`,summary:[{label:'Total tayangan',value:String(meta.total)},{label:'Pengunjung unik',value:String(meta.unique)},{label:'Rata-rata per titik',value:String(meta.average)},{label:'Jumlah periode',value:String(records.length)}],columns:[{key:'label',label:'Periode',width:205},{key:'views',label:'Tayangan',width:105},{key:'unique',label:'Unik',width:95},{key:'channel',label:'Kanal',width:114}],rows:records,filename:'koteka-trafik-' +new Date().toISOString().slice(0,10)+'.pdf'})},
 exportLogs(records,meta){return build({heading:'Laporan Log Aktivitas',subtitle:`Filter: ${meta.filter} | ${meta.from||'Semua tanggal'} - ${meta.to||'Sekarang'}`,summary:[{label:'Total aktivitas',value:String(records.length)},{label:'Aktivitas admin',value:String(records.filter(x=>x.kind==='editor').length)},{label:'Kunjungan tercatat',value:String(records.filter(x=>x.kind==='visitor').length)}],columns:[{key:'dateLabel',label:'Waktu',width:104},{key:'kind',label:'Jenis',width:70},{key:'actor',label:'Pelaku',width:88},{key:'description',label:'Aktivitas',width:257}],rows:records,filename:'koteka-log-' +new Date().toISOString().slice(0,10)+'.pdf'})},
};
})();
