'use strict';
import crypto from 'node:crypto';
const REQUIRED=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KOTEKA_ADMIN_EMAIL','KOTEKA_ADMIN_PASSWORD','KOTEKA_SESSION_SECRET'];
const configured=()=>REQUIRED.every(key=>Boolean(process.env[key]));
function json(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(data));}
function acceptsOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host&&/^https?:$/.test(new URL(origin).protocol)}catch{return false}}
function sign(data){return crypto.createHmac('sha256',process.env.KOTEKA_SESSION_SECRET).update(data).digest('base64url')}
function cookie(req){return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('koteka_admin='))?.split('=').slice(1).join('')||''}
function session(req){if(!configured())return false;let parts=cookie(req).split('.');if(parts.length!==2||!parts[0]||!parts[1])return false;let expected=sign(parts[0]);if(parts[1].length!==expected.length||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return false;try{let data=JSON.parse(Buffer.from(parts[0],'base64url').toString());return data.sub==='admin'&&Date.now()<data.exp}catch{return false}}
function setSession(res,active){const c=active?`${Buffer.from(JSON.stringify({sub:'admin',exp:Date.now()+12*3600e3})).toString('base64url')}`:'';res.setHeader('Set-Cookie',active?`koteka_admin=${c}.${sign(c)}; Path=/api/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`:'koteka_admin=; Path=/api/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')}
function comparePassword(email,password){if(typeof email!=='string'||typeof password!=='string')return false;const okEmail=email.toLowerCase().trim()===process.env.KOTEKA_ADMIN_EMAIL.toLowerCase().trim();const a=crypto.createHash('sha256').update(password).digest(),b=crypto.createHash('sha256').update(process.env.KOTEKA_ADMIN_PASSWORD).digest();return okEmail&&crypto.timingSafeEqual(a,b)}
async function body(req){let value=req.body;if(value&&typeof value==='object')return value;let raw='';for await(const c of req){raw+=c.toString();if(raw.length>16000)throw Error('Payload terlalu besar')}try{return JSON.parse(raw||'{}')}catch{throw Error('JSON tidak valid')}}
async function redis(args){const base=process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/,'');const response=await fetch(base,{method:'POST',headers:{Authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('Datastore tidak dapat diakses');const data=await response.json();if(data.error)throw Error('Datastore error');return data.result}
const LEADS_KEY='koteka:consultation:inbox:v1';
const clean=(value,max=300)=>String(value??'').trim().slice(0,max);
const number=s=>clean(s,32).replace(/\D/g,'');
// Update by ID atomically so new arrivals cannot shift the row being edited.
async function updateLead(id, patch) {
 const script = `local rows = redis.call('LRANGE', KEYS[1], 0, 1999)
 for i, raw in ipairs(rows) do
  local ok, item = pcall(cjson.decode, raw)
  if ok and item.id == ARGV[1] then
   local patch = cjson.decode(ARGV[2])
   for key, value in pairs(patch) do item[key] = value end
   local updated = cjson.encode(item)
   redis.call('LSET', KEYS[1], i - 1, updated)
   return updated
  end
 end
 return nil`;
 return redis(['EVAL', script, '1', LEADS_KEY, id, JSON.stringify(patch)]);
}
function deliveryConfig() {
 return {
  email: Boolean(process.env.RESEND_API_KEY && process.env.KOTEKA_NOTIFY_EMAIL && process.env.KOTEKA_FROM_EMAIL),
  whatsapp: Boolean(process.env.META_WA_TOKEN && process.env.META_WA_PHONE_NUMBER_ID && process.env.META_WA_TO && process.env.META_WA_TEMPLATE_NAME)
 };
}
async function notifyLead(lead) {
 const result = {email: 'not_requested', whatsapp: 'not_requested'};
 const channel = lead.kirimVia;
 if (!['email','whatsapp'].includes(channel)) return result;
 result[channel] = 'not_configured';
 if (!deliveryConfig()[channel]) return result;
 const details = [`ID: ${lead.id}`, `WhatsApp: ${lead.wa}`, `Email: ${lead.email || '-'}`, `Layanan: ${lead.jenisWebsite}`, `Anggaran: ${lead.anggaran}`, `Target: ${lead.targetSelesai}`, `Pesan: ${lead.pesan}`].join('\n');
 try {
  let response;
  if (channel === 'email') {
   response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `consultation/${lead.id}`},
    body: JSON.stringify({from: process.env.KOTEKA_FROM_EMAIL, to: [process.env.KOTEKA_NOTIFY_EMAIL], reply_to: lead.email || undefined, subject: `Konsultasi baru: ${lead.nama}`, text: [`Konsultasi website baru`, `Nama: ${lead.nama}`, `Bisnis: ${lead.namaBisnis}`, details, `Buka Dashboard > Pesan Masuk untuk menindaklanjuti.`].join('\n')}),
    signal: AbortSignal.timeout(8000)
   });
  } else {
   // Approved template body: {{1}} name, {{2}} business, {{3}} summary.
   // Single-line summary fits template parameters; the full message stays in the inbox.
   const summary = details.replace(/\s+/g, ' ').slice(0, 650);
   response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(process.env.META_WA_PHONE_NUMBER_ID)}/messages`, {
    method: 'POST', headers: {Authorization: `Bearer ${process.env.META_WA_TOKEN}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({messaging_product: 'whatsapp', to: number(process.env.META_WA_TO), type: 'template', template: {name: process.env.META_WA_TEMPLATE_NAME, language: {code: process.env.META_WA_TEMPLATE_LANGUAGE || 'id'}, components: [{type: 'body', parameters: [lead.nama, lead.namaBisnis, summary].map(text => ({type: 'text', text}))}]}}),
    signal: AbortSignal.timeout(8000)
   });
  }
  const data = await response.json().catch(() => ({}));
  const accepted = channel === 'email' ? data.id : data.messages?.[0]?.id;
  result[channel] = response.ok && accepted ? 'sent' : 'failed';
 } catch { result[channel] = 'failed'; }
 return result;
}
export {configured,json,acceptsOrigin,session,setSession,comparePassword,body,redis,LEADS_KEY,clean,number,notifyLead,updateLead,deliveryConfig};
