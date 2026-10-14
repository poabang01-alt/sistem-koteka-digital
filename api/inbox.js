'use strict';import * as K from '../server/koteka.js';
export default async function handler(req,res){
 if(!K.configured())return K.json(res,503,{error:'Backend pesan belum dikonfigurasi.'});
 if(!K.session(req))return K.json(res,401,{error:'Login server diperlukan untuk membuka pesan.'});
 if(!['GET','PATCH'].includes(req.method))return K.json(res,405,{error:'Metode tidak didukung'},{Allow:'GET, PATCH'});
 if(req.method==='PATCH'&&!K.acceptsOrigin(req))return K.json(res,403,{error:'Origin tidak sah'});
 try{const raw=await K.redis(['LRANGE',K.LEADS_KEY,'0','1999']);const items=(raw||[]).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean);
  if(req.method==='GET')return K.json(res,200,{items,unread:items.filter(x=>!x.read).length,integrations:K.deliveryConfig()});
  const d=await K.body(req);if(typeof d.id!=='string'||!d.id)return K.json(res,422,{error:'ID pesan tidak valid.'});
  const updated=await K.updateLead(d.id,{read:true});if(!updated)return K.json(res,404,{error:'Pesan tidak ditemukan.'});return K.json(res,200,{ok:true,id:d.id});
 }catch{return K.json(res,502,{error:'Tidak bisa mengakses penyimpanan pesan.'})}
};
