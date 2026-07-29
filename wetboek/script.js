const state = { data:null, query:"", chapter:"all", expanded:false };
const $ = id => document.getElementById(id);
const els = {
  chapterNav:$("chapterNav"), lawContainer:$("lawContainer"), searchInput:$("searchInput"),
  clearSearchButton:$("clearSearchButton"), articleCount:$("articleCount"), chapterCount:$("chapterCount"),
  updatedDate:$("updatedDate"), resultTitle:$("resultTitle"), resultCount:$("resultCount"),
  popularArticles:$("popularArticles"), recentArticles:$("recentArticles"), emptyState:$("emptyState"),
  expandAllButton:$("expandAllButton"), quickArticleInput:$("quickArticleInput"),
  quickArticleButton:$("quickArticleButton"), menuButton:$("menuButton"), sidebar:$("sidebar"),
  overlay:$("overlay"), themeButton:$("themeButton"), toast:$("toast")
};
const normalize = s => String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const slugify = s => normalize(s).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const escapeHtml = s => String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function highlight(text,q){
  const safe=escapeHtml(text);
  const terms=q.trim().split(/\s+/).filter(Boolean).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  return terms.length?safe.replace(new RegExp(`(${terms.join("|")})`,"gi"),"<mark>$1</mark>"):safe;
}
function articleSearchText(a,c){
  return normalize([a.number,a.title,a.description,a.notes,a.penalty?.jail,a.penalty?.fine,a.penalty?.points,...(a.tags||[]),c.title,c.description].join(" "));
}
function visibleChapters(){
  const q=normalize(state.query.trim());
  return state.data.chapters
    .filter(c=>state.chapter==="all"||c.id===state.chapter)
    .map(c=>({...c,articles:c.articles.filter(a=>!q||articleSearchText(a,c).includes(q))}))
    .filter(c=>c.articles.length);
}
function categoryClass(id){
  if(id.includes("drug")) return "drugs";
  if(id.includes("verkeer")) return "verkeer";
  if(id.includes("geweld")||id.includes("wapen")) return "geweld";
  if(id.includes("overheid")) return "overheid";
  return "vermogen";
}
function renderNav(){
  els.chapterNav.innerHTML=state.data.chapters.map((c,i)=>`
    <button class="chapter-button ${state.chapter===c.id?"active":""}" data-chapter="${escapeHtml(c.id)}">
      <span class="chapter-icon">${c.icon||"▤"}</span><b>${escapeHtml(c.title)}</b><span class="chapter-count">${c.articles.length}</span>
    </button>`).join("");
  els.chapterNav.querySelectorAll("[data-chapter]").forEach(btn=>btn.onclick=()=>{
    state.chapter=state.chapter===btn.dataset.chapter?"all":btn.dataset.chapter;
    renderNav();renderArticles();document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"});
    closeMenu();
  });
}
function renderDashboard(){
  const all=state.data.chapters.flatMap(c=>c.articles.map(a=>({...a,chapter:c})));
  const popular=all.filter(a=>a.popular).slice(0,5);
  const recent=[...all].filter(a=>a.updated).sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,5);
  els.popularArticles.innerHTML=popular.map(a=>listRow(a,false)).join("");
  els.recentArticles.innerHTML=recent.map(a=>listRow(a,true)).join("");
  document.querySelectorAll("[data-open-article]").forEach(el=>el.onclick=()=>goToArticle(el.dataset.openArticle));
}
function listRow(a,showDate){
  return `<div class="list-row" data-open-article="${slugify(a.number)}">
    <span class="title">Artikel ${escapeHtml(a.number)} - ${escapeHtml(a.title)}</span>
    <span class="tag ${categoryClass(a.chapter.id)}">${escapeHtml(a.chapter.shortTitle||a.chapter.title)}</span>
    ${showDate?`<span class="date">${escapeHtml(a.updated)}</span>`:"<span>›</span>"}
  </div>`;
}
function renderArticles(){
  const chapters=visibleChapters();
  const total=chapters.reduce((n,c)=>n+c.articles.length,0);
  els.resultTitle.textContent=state.query?`Zoeken naar “${state.query}”`:state.chapter==="all"?"Alle artikelen":state.data.chapters.find(c=>c.id===state.chapter)?.title;
  els.resultCount.textContent=`${total} ${total===1?"artikel":"artikelen"} gevonden`;
  els.clearSearchButton.hidden=!state.query;
  els.emptyState.hidden=total!==0;
  els.lawContainer.innerHTML=chapters.map((c,ci)=>`
    <section class="chapter-section" id="chapter-${escapeHtml(c.id)}">
      <div class="chapter-title"><span>${String(ci+1).padStart(2,"0")}</span><div><h3>${highlight(c.title,state.query)}</h3><p>${highlight(c.description||"",state.query)}</p></div></div>
      ${c.articles.map(a=>articleCard(a,c)).join("")}
    </section>`).join("");
  bindArticles();
  if(location.hash) setTimeout(openFromHash,50);
}
function articleCard(a,c){
  const id=`artikel-${slugify(a.number)}`;
  return `<article class="article-card ${state.expanded||state.query?"open":""}" id="${id}">
    <button class="article-head">
      <span class="article-number">Art. ${highlight(a.number,state.query)}</span>
      <span class="article-main"><b>${highlight(a.title,state.query)}</b><small>${highlight((a.tags||[]).join(" · "),state.query)}</small></span>
      <span class="quick-penalty">
        ${a.penalty?.jail?`<span class="badge">Cel: ${escapeHtml(a.penalty.jail)}</span>`:""}
        ${a.penalty?.fine?`<span class="badge">Boete: ${escapeHtml(a.penalty.fine)}</span>`:""}
      </span>
      <span class="chev">⌄</span>
    </button>
    <div class="article-body"><div class="article-inner">
      <p>${highlight(a.description||"",state.query)}</p>
      <div class="penalty-grid">
        <div class="penalty"><small>Celstraf</small><strong>${escapeHtml(a.penalty?.jail||"Niet van toepassing")}</strong></div>
        <div class="penalty"><small>Boete</small><strong>${escapeHtml(a.penalty?.fine||"Niet van toepassing")}</strong></div>
        <div class="penalty"><small>Punten / maatregel</small><strong>${escapeHtml(a.penalty?.points||"Niet van toepassing")}</strong></div>
      </div>
      ${a.notes?`<div class="notes"><strong>Toelichting:</strong> ${highlight(a.notes,state.query)}</div>`:""}
      <div class="tag-row">${(a.tags||[]).map(t=>`<span class="article-tag">${highlight(t,state.query)}</span>`).join("")}</div>
      <div class="article-actions"><button data-copy="${id}">Link kopiëren</button><button data-favorite="${id}">☆ Favoriet</button></div>
    </div></div>
  </article>`;
}
function bindArticles(){
  document.querySelectorAll(".article-head").forEach(btn=>btn.onclick=()=>{
    const card=btn.closest(".article-card"); card.classList.toggle("open"); history.replaceState(null,"",`#${card.id}`);
  });
  document.querySelectorAll("[data-copy]").forEach(btn=>btn.onclick=async e=>{
    e.stopPropagation(); const url=new URL(location.href); url.hash=btn.dataset.copy;
    try{await navigator.clipboard.writeText(url);toast("Link gekopieerd.");}catch{prompt("Kopieer deze link:",url);}
  });
  document.querySelectorAll("[data-favorite]").forEach(btn=>btn.onclick=e=>{
    e.stopPropagation(); const favs=JSON.parse(localStorage.getItem("gh-favorites")||"[]"); const id=btn.dataset.favorite;
    const next=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id]; localStorage.setItem("gh-favorites",JSON.stringify(next));
    btn.textContent=next.includes(id)?"★ Favoriet":"☆ Favoriet"; toast(next.includes(id)?"Toegevoegd aan favorieten.":"Verwijderd uit favorieten.");
  });
}
function goToArticle(number){
  const id=`artikel-${slugify(number)}`; state.chapter="all"; state.query=""; els.searchInput.value=""; renderNav();renderArticles();
  setTimeout(()=>{location.hash=id;openFromHash();},60);
}
function openFromHash(){
  const el=document.getElementById(location.hash.slice(1)); if(!el)return; el.classList.add("open"); el.scrollIntoView({behavior:"smooth",block:"center"});
}
function clearSearch(){state.query="";els.searchInput.value="";renderArticles();els.searchInput.focus();}
function toast(msg){els.toast.textContent=msg;els.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove("show"),1800);}
function openMenu(){els.sidebar.classList.add("open");els.overlay.classList.add("show");}
function closeMenu(){els.sidebar.classList.remove("open");els.overlay.classList.remove("show");}
async function init(){
  const res=await fetch("data/wetboek.json",{cache:"no-store"}); state.data=await res.json();
  const total=state.data.chapters.reduce((n,c)=>n+c.articles.length,0);
  els.articleCount.textContent=total; els.chapterCount.textContent=state.data.chapters.length; els.updatedDate.textContent=state.data.meta.lastUpdated;
  renderNav();renderDashboard();renderArticles();
  els.searchInput.oninput=e=>{state.query=e.target.value;state.chapter="all";renderNav();renderArticles();};
  els.clearSearchButton.onclick=clearSearch;
  els.expandAllButton.onclick=()=>{state.expanded=!state.expanded;els.expandAllButton.textContent=state.expanded?"Alles sluiten":"Alles openen";renderArticles();};
  const quick=()=>{if(els.quickArticleInput.value.trim())goToArticle(els.quickArticleInput.value.trim());};
  els.quickArticleButton.onclick=quick; els.quickArticleInput.onkeydown=e=>{if(e.key==="Enter")quick();};
  els.menuButton.onclick=openMenu; els.overlay.onclick=closeMenu;
  els.themeButton.onclick=()=>{const now=document.documentElement.dataset.theme||"dark";const next=now==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("gh-theme",next);};
  document.documentElement.dataset.theme=localStorage.getItem("gh-theme")||"dark";
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();els.searchInput.focus();}if(e.key==="Escape")closeMenu();});
  $("year").textContent=new Date().getFullYear();
  openFromHash();
}
init().catch(err=>{console.error(err);els.lawContainer.innerHTML='<div class="empty-state"><h3>Wetboek kon niet worden geladen</h3><p>Controleer data/wetboek.json.</p></div>';});
