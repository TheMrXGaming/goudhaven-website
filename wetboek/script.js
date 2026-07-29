const state={data:null,query:"",chapter:"all",expanded:false,selected:new Set()};
const $=id=>document.getElementById(id);
const els={
  chapterNav:$("chapterNav"),lawContainer:$("lawContainer"),searchInput:$("searchInput"),
  articleCount:$("articleCount"),chapterCount:$("chapterCount"),updatedDate:$("updatedDate"),version:$("version"),
  popularTags:$("popularTags"),recentList:$("recentList"),resultTitle:$("resultTitle"),resultCount:$("resultCount"),
  clearSearch:$("clearSearch"),expandAll:$("expandAll"),emptyState:$("emptyState"),
  quickInput:$("quickInput"),quickButton:$("quickButton"),menuButton:$("menuButton"),
  sidebar:$("sidebar"),overlay:$("overlay"),themeButton:$("themeButton"),toast:$("toast"),
  calculatorList:$("calculatorList"),totalJail:$("totalJail"),totalFine:$("totalFine"),
  selectedCount:$("selectedCount"),clearCalculator:$("clearCalculator")
};
const normalize=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const slugify=s=>normalize(s).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function highlight(text,q){
  const safe=esc(text);const terms=q.trim().split(/\s+/).filter(Boolean).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  return terms.length?safe.replace(new RegExp(`(${terms.join("|")})`,"gi"),"<mark>$1</mark>"):safe
}
function searchText(a,c){return normalize([a.number,a.title,a.description,a.notes,a.type,a.penalty?.jail,a.penalty?.fine,a.penalty?.points,a.penalty?.seize,...(a.tags||[]),c.title,c.description].join(" "))}
function visible(){
  const q=normalize(state.query.trim());
  return state.data.chapters.filter(c=>state.chapter==="all"||c.id===state.chapter)
    .map(c=>({...c,articles:c.articles.filter(a=>!q||searchText(a,c).includes(q))}))
    .filter(c=>c.articles.length)
}
function parseMonths(v){const m=String(v||"").match(/(\d+)/);return m?Number(m[1]):0}
function parseMoney(v){return Number(String(v||"").replace(/[^\d]/g,""))||0}
function renderNav(){
  els.chapterNav.innerHTML=state.data.chapters.map((c,i)=>`<button class="chapter-btn ${state.chapter===c.id?"active":""}" data-chapter="${esc(c.id)}"><span class="num">${String(i+1).padStart(2,"0")}</span><b>${esc(c.title)}</b><span class="count">${c.articles.length}</span></button>`).join("");
  document.querySelector(".sidebar-home").classList.toggle("active",state.chapter==="all");
  document.querySelector(".sidebar-home").onclick=()=>{state.chapter="all";renderNav();renderArticles();closeMenu()};
  els.chapterNav.querySelectorAll("[data-chapter]").forEach(b=>b.onclick=()=>{state.chapter=b.dataset.chapter;renderNav();renderArticles();closeMenu();document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"})})
}
function renderDashboard(){
  const all=state.data.chapters.flatMap(c=>c.articles.map(a=>({...a,chapter:c})));
  const popular=["coke","wiet","lean","meth","speed","opium","xtc","heroïne","drugslab","gijzeling","wapen","witwassen"];
  els.popularTags.innerHTML=popular.map(t=>`<button data-search="${esc(t)}">${esc(t)}</button>`).join("");
  els.popularTags.querySelectorAll("[data-search]").forEach(b=>b.onclick=()=>{els.searchInput.value=b.dataset.search;state.query=b.dataset.search;state.chapter="all";renderNav();renderArticles();document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"})});
  const recent=all.filter(a=>a.updated).sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,6);
  els.recentList.innerHTML=recent.map(a=>`<div class="recent-row"><b>Artikel ${esc(a.number)} — ${esc(a.title)}</b><span>${esc(a.updated)}</span></div>`).join("")
}
function articleCard(a){
  const id=`artikel-${slugify(a.number)}`;
  return `<article class="article-card ${state.expanded||state.query?"open":""}" id="${id}">
    <button class="article-head">
      <span class="article-number">Art. ${highlight(a.number,state.query)}</span>
      <span class="article-title"><b>${highlight(a.title,state.query)}</b><small>${highlight((a.tags||[]).join(" · "),state.query)}</small></span>
      <span class="quick-penalty">${a.penalty?.jail?`<span class="badge">Cel: ${esc(a.penalty.jail)}</span>`:""}${a.penalty?.fine?`<span class="badge">Boete: ${esc(a.penalty.fine)}</span>`:""}</span>
      <span class="chev">⌄</span>
    </button>
    <div class="article-body"><div class="article-inner">
      <p>${highlight(a.description||"",state.query)}</p>
      <div class="penalty-grid">
        <div class="penalty"><small>Celstraf</small><strong>${esc(a.penalty?.jail||"Niet van toepassing")}</strong></div>
        <div class="penalty"><small>Boete</small><strong>${esc(a.penalty?.fine||"Niet van toepassing")}</strong></div>
        <div class="penalty"><small>Punten / maatregel</small><strong>${esc(a.penalty?.points||"Niet van toepassing")}</strong></div>
        <div class="penalty"><small>Inbeslagname</small><strong>${esc(a.penalty?.seize||"Volgens situatie")}</strong></div>
      </div>
      ${a.notes?`<div class="notes"><strong>Toelichting:</strong> ${highlight(a.notes,state.query)}</div>`:""}
      <div class="tag-row">${(a.tags||[]).map(t=>`<span class="article-tag">${highlight(t,state.query)}</span>`).join("")}</div>
    </div></div>
  </article>`
}
function renderArticles(){
  const chapters=visible();const total=chapters.reduce((n,c)=>n+c.articles.length,0);
  els.resultTitle.textContent=state.query?`Zoeken naar “${state.query}”`:state.chapter==="all"?"Alle artikelen":state.data.chapters.find(c=>c.id===state.chapter)?.title;
  els.resultCount.textContent=`${total} ${total===1?"artikel":"artikelen"} gevonden`;
  els.clearSearch.hidden=!state.query;els.emptyState.hidden=total!==0;
  els.lawContainer.innerHTML=chapters.map((c,i)=>`<section class="chapter-section"><div class="chapter-header"><span>${String(i+1).padStart(2,"0")}</span><div><h3>${highlight(c.title,state.query)}</h3><p>${highlight(c.description||"",state.query)}</p></div></div>${c.articles.map(articleCard).join("")}</section>`).join("");
  document.querySelectorAll(".article-head").forEach(btn=>btn.onclick=()=>{const card=btn.closest(".article-card");card.classList.toggle("open");history.replaceState(null,"",`#${card.id}`)});
  if(location.hash)setTimeout(openHash,50)
}
function renderCalculator(){
  const all=state.data.chapters.flatMap(c=>c.articles.map(a=>({...a,chapter:c})));
  els.calculatorList.innerHTML=all.map(a=>`<label class="calc-row"><input type="checkbox" value="${esc(a.number)}"><b>Artikel ${esc(a.number)} — ${esc(a.title)}</b><span>${esc(a.penalty?.jail||"0 maanden")} · ${esc(a.penalty?.fine||"€0")}</span></label>`).join("");
  els.calculatorList.querySelectorAll("input").forEach(ch=>ch.onchange=()=>{ch.checked?state.selected.add(ch.value):state.selected.delete(ch.value);updateCalculator()})
}
function updateCalculator(){
  const all=state.data.chapters.flatMap(c=>c.articles);let jail=0,fine=0;
  all.filter(a=>state.selected.has(a.number)).forEach(a=>{jail+=parseMonths(a.penalty?.jail);fine+=parseMoney(a.penalty?.fine)});
  els.totalJail.textContent=`${jail} maanden`;els.totalFine.textContent=new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(fine);
  els.selectedCount.textContent=`${state.selected.size} ${state.selected.size===1?"artikel":"artikelen"} geselecteerd`
}
function openHash(){const el=document.getElementById(location.hash.slice(1));if(el){el.classList.add("open");el.scrollIntoView({behavior:"smooth",block:"center"})}}
function jump(){const v=els.quickInput.value.trim();if(!v)return;state.query=v;state.chapter="all";els.searchInput.value=v;renderNav();renderArticles();setTimeout(()=>document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"}),40)}
function clearSearch(){state.query="";els.searchInput.value="";renderArticles();els.searchInput.focus()}
function openMenu(){els.sidebar.classList.add("open");els.overlay.classList.add("show")}
function closeMenu(){els.sidebar.classList.remove("open");els.overlay.classList.remove("show")}
async function init(){
  const res=await fetch("data/wetboek.json",{cache:"no-store"});state.data=await res.json();
  const total=state.data.chapters.reduce((n,c)=>n+c.articles.length,0);
  els.articleCount.textContent=total;els.chapterCount.textContent=state.data.chapters.length;els.updatedDate.textContent=state.data.meta.lastUpdated;els.version.textContent=state.data.meta.version;
  renderNav();renderDashboard();renderArticles();renderCalculator();
  els.searchInput.oninput=e=>{state.query=e.target.value;state.chapter="all";renderNav();renderArticles()};
  els.clearSearch.onclick=clearSearch;els.expandAll.onclick=()=>{state.expanded=!state.expanded;els.expandAll.textContent=state.expanded?"Alles sluiten":"Alles openen";renderArticles()};
  els.quickButton.onclick=jump;els.quickInput.onkeydown=e=>{if(e.key==="Enter")jump()};
  els.menuButton.onclick=openMenu;els.overlay.onclick=closeMenu;
  els.themeButton.onclick=()=>{const next=(document.documentElement.dataset.theme||"dark")==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("gh-theme",next)};
  document.documentElement.dataset.theme=localStorage.getItem("gh-theme")||"dark";
  els.clearCalculator.onclick=()=>{state.selected.clear();document.querySelectorAll(".calc-row input").forEach(x=>x.checked=false);updateCalculator()};
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();els.searchInput.focus()}if(e.key==="Escape")closeMenu()});
  $("year").textContent=new Date().getFullYear();openHash()
}
init().catch(err=>{console.error(err);els.lawContainer.innerHTML='<div class="empty"><h3>Wetboek kon niet worden geladen</h3><p>Controleer data/wetboek.json.</p></div>'});
