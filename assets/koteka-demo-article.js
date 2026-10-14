/* Render locally edited articles without a backend or generated HTML files. */
(() => {
  'use strict';
  const workspace=window.KotekaWorkspace, main=document.querySelector('.article-shell');
  if (!workspace || !main) return;
  workspace.startTracking();
  const original=main.cloneNode(true), generic=location.pathname==='/blog/article.html';
  const requested=new URLSearchParams(location.search).get('id');
  function render() {
    const posts=workspace.get('blogPosts',null);
    if (!posts && !generic) return;
    const post=workspace.list(posts).find(x=>generic ? x._id===requested : String(x.link || '').split('?')[0].replace(/\/$/,'')===location.pathname.replace(/\/$/,''));
    const template=original.cloneNode(true);
    main.replaceChildren(...template.childNodes);
    if (!post) {
      document.title='Artikel tidak tersedia - Koteka Digital';
      const section=document.createElement('section');section.className='article-hero-text';
      const title=document.createElement('h1');title.textContent='Artikel tidak tersedia';
      const copy=document.createElement('p');copy.textContent='Artikel ini telah dihapus atau belum dipublikasikan.';
      const link=document.createElement('a');link.href='/blog/';link.textContent='Kembali ke Artikel';
      section.append(title,copy,link);main.replaceChildren(section);return;
    }
    const set=(selector,text)=>{const element=main.querySelector(selector);if(element)element.textContent=text || '';};
    set('h1',post.title);set('.article-intro',post.excerpt);set('.article-label',post.category);
    const image=main.querySelector('.article-hero img');
    if(image){const src=workspace.url(post.image,true);if(src){image.src=src;image.alt=post.imageAlt || post.title;image.hidden=false;}else image.remove();}
    if(!post.category)main.querySelector('.article-label')?.remove();
    if (generic || post._bodyEdited) {
      const body=main.querySelector('.article-body');
      if(body){body.replaceChildren();for(const text of String(post.body || (generic?post.excerpt:'') || '').split(/\n\s*\n/)){if(!text.trim())continue;const p=document.createElement('p');p.textContent=text;p.style.whiteSpace='pre-line';body.append(p);}}
    }
    document.title=post.seoTitle || post.title+' - Koteka Digital';
    const description=document.querySelector('meta[name="description"]');if(description)description.content=post.seoDescription || post.excerpt || '';
  }
  render();workspace.subscribe(render);
})();
