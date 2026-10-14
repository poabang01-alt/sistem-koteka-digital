/* Koteka Digital / audit 9: scroll entry and pricing carousel only. */
(()=>{'use strict';
// Pricing: two identical card sets are rendered by React. Advance on requestAnimationFrame
// and wrap at the midpoint so the loop has no blank gap or snap on mobile.
const controls=new WeakMap();let activeControllers=new Set();
function initCarousel(viewport){if(!viewport||controls.has(viewport))return;const rail=viewport.querySelector('.pricing-package-grid');if(!rail)return;
 let last=0,pauseUntil=0,visible=true,raf=0,disposed=false;
 const parents=viewport.querySelectorAll('.pricing-card-reference');const repeat=parents.length>1&&parents.length%2===0;
 const mid=()=>{const cards=rail.querySelectorAll('.pricing-card-reference');return cards.length>1&&cards.length%2===0?cards[cards.length/2].offsetLeft-cards[0].offsetLeft:0};
 const onEnter=()=>{pauseUntil=performance.now()+600};
 viewport.addEventListener('pointerenter',onEnter,{passive:true});viewport.addEventListener('focusin',onEnter);viewport.addEventListener('touchstart',()=>{pauseUntil=performance.now()+2600},{passive:true});viewport.addEventListener('touchend',()=>{pauseUntil=performance.now()+1300},{passive:true});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true},{threshold:0});intersection.observe(viewport);
 const tick=now=>{if(disposed)return;const step=Math.min(50,Math.max(0,now-(last||now)));last=now;
 if(visible&&repeat&&now>pauseUntil&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){viewport.scrollLeft+=step*.039;const half=mid();if(half&&viewport.scrollLeft>=half-2)viewport.scrollLeft-=half}
 raf=requestAnimationFrame(tick)};
 raf=requestAnimationFrame(tick);
 const controller={viewport,rail,pause(){pauseUntil=performance.now()+1800},dispose(){disposed=true;cancelAnimationFrame(raf);intersection.disconnect()}};controls.set(viewport,controller);activeControllers.add(controller);
}
window.KotekaPricingMarquee={nudge(viewport,direction){if(!viewport)return;const ctl=controls.get(viewport);if(ctl)ctl.pause();const card=viewport.querySelector('.pricing-card-reference');const step=(card?.getBoundingClientRect().width||310)+22;const cards=viewport.querySelectorAll('.pricing-card-reference');if(direction<0&&cards.length>1&&cards.length%2===0&&viewport.scrollLeft<step){viewport.scrollLeft+=cards[cards.length/2].offsetLeft-cards[0].offsetLeft}viewport.scrollBy({left:direction*step,behavior:'smooth'});},refresh(){document.querySelectorAll('.kd-pricing-viewport').forEach(initCarousel)}};
// Opt-in entry animation only on elements that do not already use motion transforms.
const motionOff=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen=new WeakSet();const observer=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{entries.forEach(e=>{if(!e.isIntersecting)return;observer.unobserve(e.target);if(!motionOff()&&!e.target.animate)return;if(!motionOff())e.target.animate([{opacity:.55,transform:'translate3d(0,18px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:620,easing:'cubic-bezier(.2,.7,.2,1)',fill:'none'});});},{threshold:.1,rootMargin:'0px 0px -24px 0px'}):null;
function scan(){document.querySelectorAll('.kd-pricing-viewport').forEach(initCarousel);
 if(observer&&!motionOff())document.querySelectorAll('section[id] h2,section[id] .pricing-card-reference,section[id] .contact-card,section[id] .section-heading').forEach(el=>{if(seen.has(el)||el.closest('[data-motion-pop-id]')||el.style.transform)return;seen.add(el);observer.observe(el)});
}
let scheduled=false;const queue=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})};
const dom=new MutationObserver(changes=>{if(changes.some(x=>x.addedNodes.length))queue()});
document.addEventListener('DOMContentLoaded',()=>{scan();dom.observe(document.querySelector('#root')||document.body,{subtree:true,childList:true});});
})();
