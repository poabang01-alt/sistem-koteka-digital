'use strict';import * as K from '../server/koteka.js';
export default async function handler(req,res){
 if(!K.configured())return K.json(res,503,{error:'Backend admin belum dikonfigurasi.'});
 if(!K.acceptsOrigin(req))return K.json(res,403,{error:'Origin tidak sah'});
 if(req.method==='GET')return K.json(res,200,{authenticated:K.session(req)});
 if(req.method==='DELETE'){K.setSession(res,false);return K.json(res,200,{authenticated:false})}
 if(req.method!=='POST')return K.json(res,405,{error:'Metode tidak didukung'},{Allow:'GET, POST, DELETE'});
 try{const d=await K.body(req);if(!K.comparePassword(d.email,d.password))return K.json(res,401,{error:'Email atau kata sandi tidak cocok.'});K.setSession(res,true);return K.json(res,200,{authenticated:true})}catch{return K.json(res,400,{error:'Login tidak dapat diproses'})}
};
