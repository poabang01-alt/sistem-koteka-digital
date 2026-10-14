/* Shared demo content for public pages and Workspace on the same browser/origin. */
(() => {
  'use strict';
  if (window.KotekaWorkspace) return;
  const keys = {content:'koteka.admin.content.v1',public:'koteka.public.content.v1',traffic:'koteka.admin.traffic.v2',logs:'koteka.admin.logs.v2'};
  const listeners = new Set();
  const read = (key, fallback = {}) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
  const published = () => {const value=read(keys.public);return value && typeof value==='object' && !Array.isArray(value) ? value : {};};
  const notify = () => {for (const listener of listeners) listener();};
  const get = (key, fallback) => {const value=published()[key];return value===undefined ? fallback : value;};
  const list = value => Array.isArray(value) ? value.filter(x=>x && (!x.status || x.status==='Publik')) : [];
  const words = value => Array.isArray(value) ? value : String(value || '').split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
  const url = (value, image=false) => {
    const text=String(value || '').trim();
    if (/^(?:\/[^/]|\/$|#|\.\.?\/)/.test(text)) return text;
    if (/^https?:\/\//i.test(text)) return text;
    if (!image && /^(?:mailto:|tel:)/i.test(text)) return text;
    if (image && /^data:image\/(?:png|jpeg|webp|gif);base64,[\w+/=]+$/i.test(text)) return text;
    return '';
  };
  const clean = item => ({...item,...Object.fromEntries(['link','website','instagram','facebook','tiktok','download','orderLink','primaryLink','secondaryLink','ctaLink','mapLink'].filter(k=>k in item).map(k=>[k,url(item[k])])),...('image' in item ? {image:url(item.image,true)} : {})});
  function commit(content, key) {
    const beforeContent=localStorage.getItem(keys.content),beforePublic=localStorage.getItem(keys.public);
    const next=published();
    next[key]=content[key];
    if (key==='serviceItems' || key==='serviceCategories') {next.serviceItems=content.serviceItems;next.serviceCategories=content.serviceCategories;}
    try {localStorage.setItem(keys.content,JSON.stringify(content));localStorage.setItem(keys.public,JSON.stringify(next));}
    catch(error) {for(const [name,value] of [[keys.content,beforeContent],[keys.public,beforePublic]]) {try {value===null ? localStorage.removeItem(name) : localStorage.setItem(name,value);} catch {}}throw error;}
    notify();
  }
  function readPublic(base) {
    const value=published(),out={...base};
    if (value.about) out.aboutCards=(base.aboutCards || []).map((x,i)=>({...x,text:i===0?value.about.vision:i===1?value.about.mission:x.text}));
    if ('teamMembers' in value) out.teamMembers=list(value.teamMembers).map(x=>({...clean(x),socials:[['website','fa-solid fa-globe'],['instagram','fa-brands fa-instagram'],['facebook','fa-brands fa-facebook-f'],['tiktok','fa-brands fa-tiktok']].filter(([k])=>url(x[k])).map(([k,icon])=>({href:url(x[k]),icon,label:k+' '+x.name}))}));
    if ('serviceCategories' in value) out.serviceGroups=list(value.serviceCategories).map(x=>({...clean(x),items:list(value.serviceItems).filter(item=>item.category===x._id).map(clean)}));
    if ('pricingPlans' in value) out.pricingPlans=list(value.pricingPlans).map(x=>({...clean(x),features:String(x.features || '').split('\n').map(v=>v.trim()).filter(Boolean),details:{pages:x.pages,design:x.design,revisions:x.revisions,duration:x.duration,maintenance:x.maintenance}}));
    if ('portfolioItems' in value) out.portfolioItems=list(value.portfolioItems).map(x=>({...clean(x),tech:words(x.tech)}));
    if ('blogPosts' in value) out.blogPosts=list(value.blogPosts).map(x=>({...clean(x),keywords:words(x.keywords),link:(base.blogPosts || []).some(b=>b.link===x.link) ? url(x.link) : '/blog/article.html?id='+encodeURIComponent(x._id)}));
    if ('faqs' in value) out.faqs=list(value.faqs).map(clean);
    if (value.contact) out.contactInfo={...base.contactInfo,...clean(value.contact),whatsappNumber:value.contact.whatsapp,whatsappLabel:value.contact.phone,whatsappLink:url(value.contact.ctaLink) || ('https://wa.me/'+String(value.contact.whatsapp || '').replace(/\D/g,''))};
    return out;
  }
  const subscribe = fn => {listeners.add(fn);return ()=>listeners.delete(fn);};
  window.addEventListener('storage',event=>{if (event.key===keys.public || event.key===null) notify();});
  function append(key,item,limit) {const current=read(key,[]);try {localStorage.setItem(key,JSON.stringify([item,...(Array.isArray(current)?current:[])].slice(0,limit)));} catch {}}
  function startTracking() {
    if (startTracking.started || /^\/admin(?:\/|$)/.test(location.pathname)) return;
    startTracking.started=true;
    const id=()=>typeof crypto!=='undefined' && typeof crypto.randomUUID==='function' ? crypto.randomUUID() : 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    let session;
    try {session=sessionStorage.getItem('koteka.demo.visitor');if(!session){session=id();sessionStorage.setItem('koteka.demo.visitor',session);}} catch {session=id();}
    const device=/ipad|tablet/i.test(navigator.userAgent)?'Tablet':/mobile|android/i.test(navigator.userAgent)?'Mobile':'Desktop';
    let channel='Direct';
    try {const ref=new URL(document.referrer);if(ref.host!==location.host)channel=/google|bing|yahoo/i.test(ref.host)?'Organic Search':/facebook|instagram|tiktok|twitter/i.test(ref.host)?'Social Media':'Referral';} catch {}
    const log=description=>append(keys.logs,{id:id(),date:new Date().toISOString(),kind:'visitor',module:'Kunjungan Website',actor:'Pengunjung lokal (demo)',description},1500);
    let last='';
    const visit=()=>{const page=location.pathname+location.hash;if(page===last)return;last=page;append(keys.traffic,{id:id(),date:new Date().toISOString(),page,channel,device,session,views:1,demo:true},15000);log('Mengunjungi '+page);};
    visit();window.addEventListener('popstate',visit);window.addEventListener('hashchange',visit);window.addEventListener('kotekadigital:navigation-change',visit);
    document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link){const target=url(link.getAttribute('href'));if(target)log('Membuka tautan '+target.split('?')[0].slice(0,180));}});
    document.addEventListener('submit',()=>log('Mengirim formulir konsultasi (demo lokal)'));
  }
  window.KotekaWorkspace={keys,get,list,url,readPublic,commit,subscribe,startTracking};
  if(typeof document!=='undefined' && typeof location!=='undefined' && !/^\/admin(?:\/|$)/.test(location.pathname)) {
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startTracking,{once:true});
    else startTracking();
  }
})();
