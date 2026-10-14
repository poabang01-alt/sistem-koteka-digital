'use strict';
import crypto from 'node:crypto';import * as K from '../server/koteka.js';
export default async function handler(req,res){
 if(req.method!=='POST')return K.json(res,405,{error:'Metode tidak didukung'}, {Allow:'POST'});
 if(!K.acceptsOrigin(req))return K.json(res,403,{error:'Origin tidak sah'});
 if(!K.configured())return K.json(res,503,{error:'Pengiriman otomatis belum dikonfigurasi.'});
 try{
  const d=await K.body(req),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'anonymous').split(',')[0].trim();
  // Redis-backed rate limit per IP, no IP retained in lead records.
  const key='koteka:lead:rate:'+crypto.createHash('sha256').update(ip).digest('hex');const hits=await K.redis(['INCR',key]);if(Number(hits)===1)await K.redis(['EXPIRE',key,'3600']);if(Number(hits)>12)return K.json(res,429,{error:'Terlalu banyak permintaan. Coba lagi nanti.'});
  const lead={id:crypto.randomUUID(),date:new Date().toISOString(),nama:K.clean(d.nama,90),namaBisnis:K.clean(d.namaBisnis,120),wa:K.number(d.whatsapp||d.wa).replace(/^0/,'62'),email:K.clean(d.email,120),jenisWebsite:K.clean(d.jenisWebsite,90),anggaran:K.clean(d.anggaran,90),targetSelesai:K.clean(d.targetSelesai,90),pesan:K.clean(d.pesan||d.message,2500),kirimVia:K.clean(d.kirimVia,30),read:false};
  if(d.persetujuan!==true||!['email','whatsapp'].includes(lead.kirimVia)||lead.kirimVia==='email'&&!lead.email||lead.nama.length<3||lead.namaBisnis.length<1||!/^62\d{9,13}$/.test(lead.wa)||lead.pesan.length<10||!lead.jenisWebsite||!lead.anggaran||!lead.targetSelesai||lead.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))return K.json(res,422,{error:'Data konsultasi tidak lengkap atau tidak valid.'});
  lead.delivery={[lead.kirimVia]:'pending'};
  await K.redis(['LPUSH',K.LEADS_KEY,JSON.stringify(lead)]);
  await K.redis(['LTRIM',K.LEADS_KEY,'0','1999']).catch(()=>{});
  const delivery=await K.notifyLead(lead);
  await K.updateLead(lead.id,{delivery}).catch(()=>{});
  return K.json(res,201,{ok:true,id:lead.id,stored:true,delivery});
 }catch(e){return K.json(res,502,{error:'Penyimpanan pesan gagal. Silakan hubungi kami melalui WhatsApp atau email.'})}
};
