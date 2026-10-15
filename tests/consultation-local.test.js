import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const sample = {nama:'Dummy Konsultasi',namaBisnis:'Usaha Dummy',wa:'081234567890',
  email:'dummy@example.test',jenisWebsite:'Website UMKM',anggaran:'Rp2,5–5 juta',
  targetSelesai:'1–2 bulan',pesan:'SIMULASI DUMMY: membutuhkan website usaha.',kirimVia:'email',persetujuan:true};

async function browser({host='127.0.0.1',storage=new Map(),status=405,failStorage=false,networkError=false}={}) {
  let calls=0;
  const location={hostname:host,pathname:'/',host,href:`http://${host}/`};
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(failStorage)throw Error('Storage full');storage.set(key,value);}};
  const context=vm.createContext({URL,Response,Date,console,crypto:webcrypto,localStorage,location,
    fetch:async()=>{calls++;if(networkError)throw Error('Connection lost');return new Response(status===201?JSON.stringify({stored:true,id:'server-lead',delivery:{email:'sent'}}):'API unavailable',{status,headers:{'Content-Type':status===201?'application/json':'text/html'}});},
    document:{readyState:'loading',addEventListener(){}},
    window:{location,addEventListener(){}}
  });
  vm.runInContext(await fs.readFile(new URL('../assets/koteka-workspace-sync.js',import.meta.url),'utf8'),context);
  assert.equal(typeof context.window.KotekaConsultation?.request,'function','local consultation bridge must be available');
  return {request:context.window.KotekaConsultation.request,storage,calls:()=>calls};
}

for(const channel of ['email','whatsapp']) {
  test(`static preview stores a ${channel} simulation visible to another dashboard tab`,async()=>{
    const form=await browser();
    const res=await form.request('/api/leads',{method:'POST',body:JSON.stringify({...sample,kirimVia:channel})});
    assert.equal(res.status,201);const saved=await res.json();
    assert.equal(saved.simulation,true);assert.equal(saved.delivery[channel],'simulated');
    assert.equal(saved.delivery[channel==='email'?'whatsapp':'email'],'not_requested');
    const dashboard=await browser({storage:form.storage});
    const inbox=await (await dashboard.request('/api/inbox')).json();
    assert.equal(inbox.items.length,1);assert.equal(inbox.unread,1);
    assert.equal(inbox.items[0].pesan,sample.pesan);assert.equal(inbox.items[0].id,saved.id);
    assert.equal(inbox.items[0].wa,'6281234567890');
    await dashboard.request('/api/inbox',{method:'PATCH',body:JSON.stringify({id:saved.id})});
    const updated=await (await form.request('/api/inbox')).json();
    assert.equal(updated.unread,0);assert.equal(updated.items[0].read,true);
  });
}

test('production never substitutes browser data for the server inbox',async()=>{
  const app=await browser({host:'kotekadigital.com'});
  const res=await app.request('/api/leads',{method:'POST',body:JSON.stringify(sample)});
  assert.equal(res.status,405);assert.equal(app.storage.size,0);
});

test('a configured API retains its real delivery acknowledgement',async()=>{
  const app=await browser({status:201});
  const saved=await (await app.request('/api/leads',{method:'POST',body:JSON.stringify(sample)})).json();
  assert.equal(saved.id,'server-lead');assert.equal(saved.simulation,undefined);assert.equal(app.storage.size,0);
});

test('authentication failures and ambiguous server errors never create local duplicates',async()=>{
  for(const status of [401,403,429,500,502]) {
    const app=await browser({status});
    const res=await app.request('/api/leads',{method:'POST',body:JSON.stringify(sample)});
    assert.equal(res.status,status);assert.equal(app.storage.size,0);
  }
  const app=await browser({networkError:true});
  await assert.rejects(app.request('/api/leads',{method:'POST',body:JSON.stringify(sample)}));
  assert.equal(app.storage.size,0);
});

test('invalid data and unavailable storage never report successful saving',async()=>{
  const app=await browser();
  const invalid=await app.request('/api/leads',{method:'POST',body:JSON.stringify({...sample,persetujuan:false})});
  assert.equal(invalid.status,422);assert.equal(app.storage.size,0);
  const blocked=await browser({failStorage:true});
  const res=await blocked.request('/api/leads',{method:'POST',body:JSON.stringify(sample)});
  assert.equal(res.status,507);assert.notEqual((await res.json()).stored,true);
});
