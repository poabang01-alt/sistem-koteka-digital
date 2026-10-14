import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function submit({status=201, data={stored:true,delivery:{email:'sent'}}, channel='email'}={}) {
 const states=[], navigations=[], events=[], resets=[];
 const form={nama:'Pengunjung Uji',namaBisnis:'Usaha Uji',wa:'081234567890',email:'visitor@example.test',pesan:'Saya membutuhkan website usaha.',jenisWebsite:'Website UMKM',anggaran:'1 juta',targetSelesai:'Bulan ini',kirimVia:channel,persetujuan:true};
 let index=0;
 const hooks={useState(initial){const i=index++;return [i===0?form:initial, value=>{if(i===2)states.push(value);if(i===0)resets.push(value);}];},useRef:()=>({current:null})};
 const jsx=(type,props)=>({type,props});
 const context=vm.createContext({console,AbortController,CustomEvent:class{constructor(type){this.type=type;}},fetch:async()=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}),window:{setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),dispatchEvent:event=>events.push(event.type),location:{assign:url=>navigations.push(url),set href(url){navigations.push(url);}}}});
 const source=await fs.readFile(new URL('../assets/ContactSectionContainer-DXOfP6-K.js',import.meta.url),'utf8');
 const mod=new vm.SourceTextModule(source+'\nexport {d as FormForTest};',{context});
 const deps={
  './jsx-runtime-BkSabwWG.js':{r:value=>value,t:()=>({jsx,jsxs:jsx})},
  './react-DHmoMYoq.js':{t:()=>hooks},
  './siteData-C5f9a5aD.js':{contactInfo:{}},
  './Reveal-a4c48c8478.js':{t:()=>null}
 };
 await mod.link(name=>new vm.SyntheticModule(Object.keys(deps[name]),function(){for(const [k,v] of Object.entries(deps[name]))this.setExport(k,v);},{context}));
 await mod.evaluate();
 const tree=mod.namespace.FormForTest({contactInfo:{email:'admin@example.test',whatsappNumber:'6285210559404'}});
 const element=tree.props.children.find(x=>x.type==='form');
 await element.props.onSubmit({preventDefault(){}});
 return {states,navigations,events,resets};
}
test('confirmed automatic send saves, resets and announces the new consultation',async()=>{
 const result=await submit();
 assert.equal(result.states.at(-1).type,'success');
 assert.equal(result.resets.length,1);
 assert.ok(result.events.includes('koteka:consultation-stored'));
 assert.equal(result.navigations.length,0);
});
test('stored consultation with provider failure shows a warning, not a send confirmation',async()=>{
 const result=await submit({data:{stored:true,delivery:{email:'failed'}}});
 assert.equal(result.states.at(-1).type,'warning');
 assert.equal(result.navigations.length,0);
 assert.equal(result.resets.length,1);
});
test('unconfigured backend keeps the form and does not silently open WhatsApp',async()=>{
 const result=await submit({status:503,data:{error:'Pengiriman otomatis belum dikonfigurasi.'},channel:'whatsapp'});
 assert.equal(result.states.at(-1).type,'error');
 assert.equal(result.navigations.length,0);
 assert.equal(result.resets.length,0);
});

async function workspace({withLogin=false}={}) {
 const badges=[{hidden:true,textContent:''},{hidden:true,textContent:''}],attrs={};
 const button={setAttribute:(k,v)=>attrs[k]=v};
 const nodes={'#appShell':{hidden:false},'#notificationButton':button};
 let loginReplaced=0;
 if(withLogin){nodes['#serverInboxLogin']={};nodes['#inboxStatus']={set innerHTML(value){loginReplaced++;}};}
 const context=vm.createContext({console,URL,Intl,Date,crypto:{},setTimeout,clearTimeout,localStorage:{getItem:()=>null},window:{KOTEKA_SITE_SEED:{},addEventListener(){}},document:{querySelector:q=>nodes[q]||null,querySelectorAll:q=>q==='[data-inbox-badge]'?badges:[],documentElement:{classList:{toggle(){},contains:()=>false}}}});
 let source=await fs.readFile(new URL('../admin/app.js',import.meta.url),'utf8');
 source=source.replace('setup();bindEvents();applyWorkspaceTheme();authView();',`globalThis.workspaceTest={loadInbox,updateInboxBadge,setUnread:n=>{inboxUnread=n},setRoute:r=>{route=r},getUnread:()=>inboxUnread,setAuthenticating:n=>{inboxAuthenticating=n}};`);
 vm.runInContext(source,context);
 return {context,badges,attrs,api:context.workspaceTest,getLoginReplaced:()=>loginReplaced};
}
test('badge remains visible until the messages are read and has an accessible count',async()=>{
 const app=await workspace();app.api.setUnread(3);app.api.updateInboxBadge();
 assert.equal(app.badges[0].hidden,false);
 assert.equal(app.badges[1].textContent,'3');
 assert.ok(app.attrs['aria-label'].includes('3'));
});
test('opening notifications never dismisses unread messages',async()=>{
 const source=await fs.readFile(new URL('../admin/app.js',import.meta.url),'utf8');
 const line=source.split('\n').find(x=>x.includes("$('#notificationButton').addEventListener('click'"));
 const handler=line.slice(line.indexOf("'click',")+8,line.lastIndexOf(');'));
 const opened=[];
 vm.runInNewContext('('+handler+')()', {go:route=>opened.push(route),dismissNotifications:()=>{throw Error('Unread messages must not be dismissed');}});
 assert.deepEqual(opened,['inbox']);
});
test('inbox polling preserves a partially filled server login form',async()=>{
 const app=await workspace({withLogin:true});app.api.setRoute('inbox');
 app.context.fetch=async()=>new Response('{}',{status:401});
 await app.api.loadInbox(true);assert.equal(app.getLoginReplaced(),0);
});
test('inbox polling pauses while server authentication is in progress',async()=>{
 const app=await workspace();let requests=0;app.context.fetch=async()=>{requests++;return new Response('{}',{status:401});};
 app.api.setAuthenticating(true);await app.api.loadInbox(true);assert.equal(requests,0);
});

async function login(status,body,{email='admin@kotekadigital.com',password='KotekaDemo@2026'}={}) {
 const source=await fs.readFile(new URL('../admin/app.js',import.meta.url),'utf8');
 const start=source.indexOf("$('#loginForm').addEventListener('submit',")+"$('#loginForm').addEventListener('submit',".length;
 const handler=source.slice(start,source.indexOf('\n });',start)+3);
 const messages=[],sessions=[];let authenticated=false;
 const button={disabled:false},error={hidden:true,textContent:''};
 const nodes={'#loginEmail':{value:email},'#loginPassword':{value:password},'#loginError':error};
 const context=vm.createContext({console,AbortController,setTimeout,clearTimeout,AUTH:'session',DEMO_USER:'admin@kotekadigital.com',DEMO_PASS:'KotekaDemo@2026',inboxKnownIds:null,$:q=>nodes[q],fetch:async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}),sessionStorage:{setItem:(k,v)=>sessions.push([k,v])},writeLog(){},authView(){authenticated=true;},toast:message=>messages.push(message)});
 vm.runInContext('globalThis.loginHandler='+handler,context);
 await context.loginHandler({preventDefault(){},target:{querySelector:()=>button}});
 return {authenticated,messages,sessions,error,button};
}
test('server administrator login activates the existing dashboard session',async()=>{
 const result=await login(200,{authenticated:true},{email:'owner@example.test',password:'test'});
 assert.equal(result.authenticated,true);assert.equal(result.messages.length,0);assert.equal(result.button.disabled,false);
});
test('configured server rejects demo credentials without bypassing its login',async()=>{
 const result=await login(401,{error:'Email atau kata sandi tidak cocok.'});
 assert.equal(result.authenticated,false);assert.equal(result.sessions.length,0);assert.equal(result.error.hidden,false);
});
test('unavailable backend preserves local dashboard access with a clear notification limitation',async()=>{
 const result=await login(503,{error:'Backend belum dikonfigurasi.'});
 assert.equal(result.authenticated,true);assert.match(result.messages[0],/konfigurasi server/);
});
