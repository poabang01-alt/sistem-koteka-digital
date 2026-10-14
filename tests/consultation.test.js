import test from 'node:test';
import assert from 'node:assert/strict';
import { notifyLead } from '../server/koteka.js';
import leads from '../api/leads.js';
import inbox from '../api/inbox.js';
import crypto from 'node:crypto';

const config = {
  UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'test',
  KOTEKA_ADMIN_EMAIL: 'admin@example.test', KOTEKA_ADMIN_PASSWORD: 'test', KOTEKA_SESSION_SECRET: 'test',
  RESEND_API_KEY: 'test', KOTEKA_FROM_EMAIL: 'site@example.test', KOTEKA_NOTIFY_EMAIL: 'admin@example.test',
  META_WA_TOKEN: 'test', META_WA_PHONE_NUMBER_ID: '123', META_WA_TO: '6285210559404',
  META_WA_TEMPLATE_NAME: 'konsultasi_baru', META_WA_TEMPLATE_LANGUAGE: 'id'
};
const sample = { id: 'lead-test', nama: 'Pengunjung Uji', namaBisnis: 'Usaha Uji', wa: '6281234567890', email: 'visitor@example.test', jenisWebsite: 'Website UMKM', anggaran: '1 juta', targetSelesai: 'Bulan ini', pesan: 'Saya membutuhkan website usaha.', kirimVia: 'email', persetujuan: true };
const response = data => new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}});
async function sandbox(run) {
  const before = Object.fromEntries(Object.keys(config).map(k => [k, process.env[k]]));
  Object.assign(process.env, config);
  const original = globalThis.fetch;
  try { await run(); } finally {
    globalThis.fetch = original;
    for (const [k, v] of Object.entries(before)) v === undefined ? delete process.env[k] : process.env[k] = v;
  }
}
function result() { return {writeHead(status) {this.status = status;}, end(body) {this.data = JSON.parse(body);}}; }
function request(body, method = 'POST') {return {method, body, headers: {host: 'localhost', origin: 'http://localhost'}};}

test('email sends only the chosen channel with a reply address', () => sandbox(async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {calls.push([String(url), JSON.parse(options.body)]); return response({id: 'email-test'});};
  const delivered = await notifyLead(sample);
  assert.equal(delivered.email, 'sent');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].reply_to, sample.email);
  assert.ok(calls[0][1].text.includes(sample.pesan));
}));

test('WhatsApp notification includes consultation details and does not send email', () => sandbox(async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {calls.push(JSON.parse(options.body));return response({messages: [{id: 'wa-test'}]});};
  const delivered = await notifyLead({...sample, kirimVia: 'whatsapp'});
  assert.equal(delivered.whatsapp, 'sent');
  assert.equal(calls.length, 1);
  const params = calls[0].template.components[0].parameters;
  assert.equal(params.length, 3);
  assert.ok(params[2].text.includes(sample.pesan));
  assert.ok(params[2].text.includes(sample.wa));
}));

test('provider success requires a message identifier', () => sandbox(async () => {
  globalThis.fetch = async () => response({error: 'provider rejected message'});
  assert.equal((await notifyLead(sample)).email, 'failed');
}));

for (const [name, input] of [['unsupported channel', {...sample, kirimVia: 'other'}], ['missing email', {...sample, email: ''}]]) {
  test('rejects '+name+' before storing', () => sandbox(async () => {
    globalThis.fetch = async () => response({result: 1});
    const res = result(); await leads(request(input), res);
    assert.equal(res.status, 422);
  }));
}

test('stores delivery status and marks the correct message read despite a new arrival', () => sandbox(async () => {
  const rows = []; let arrivalDuringRead = false;
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith(config.UPSTASH_REDIS_REST_URL)) return response({id: 'email-test'});
    const args = JSON.parse(options.body);
    let value = 1;
    if (args[0] === 'LPUSH') rows.unshift(JSON.parse(args[2]));
    if (args[0] === 'LRANGE') {value = rows.map(x => JSON.stringify(x));if(arrivalDuringRead){arrivalDuringRead=false;rows.unshift({...sample, id:'new-arrival',read:false});}}
    if (args[0] === 'EVAL') {
      const item = rows.find(x => x.id === args.at(-2));
      if (item) {Object.assign(item, JSON.parse(args.at(-1))); value = JSON.stringify(item);} else value = null;
    }
    if (args[0] === 'LSET') rows[Number(args[2])] = JSON.parse(args[3]);
    return response({result: value});
  };
  const created = result(); await leads(request(sample), created);
  assert.equal(created.status, 201);
  assert.equal(created.data.stored, true);
  assert.equal(rows[0].delivery.email, 'sent');
  const id = rows[0].id;
  const payload = Buffer.from(JSON.stringify({sub: 'admin', exp: Date.now()+60000})).toString('base64url');
  const cookie = 'koteka_admin='+payload+'.'+crypto.createHmac('sha256', config.KOTEKA_SESSION_SECRET).update(payload).digest('base64url');
  arrivalDuringRead = true;
  const read = result();const req = request({id}, 'PATCH');req.headers.cookie = cookie;
  await inbox(req, read);
  assert.equal(read.status, 200);
  assert.equal(rows.find(x => x.id === id).read, true);
  assert.equal(rows[0].read, false);
  assert.equal(rows.find(x => x.id === id).delivery.email, 'sent');
}));
