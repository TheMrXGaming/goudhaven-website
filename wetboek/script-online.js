const S={data:null,q:"",chapter:"all",expanded:false,selected:new Set(),filter:"all"};const $=id=>document.getElementById(id);
const E={chapterNav:$("chapterNav"),law:$("lawContainer"),search:$("searchInput"),articleCount:$("articleCount"),chapterCount:$("chapterCount"),updated:$("updatedDate"),version:$("version"),popular:$("popularTags"),recent:$("recentList"),title:$("resultTitle"),count:$("resultCount"),clear:$("clearSearch"),expand:$("expandAll"),empty:$("emptyState"),quick:$("quickInput"),quickBtn:$("quickButton"),menu:$("menuButton"),sidebar:$("sidebar"),overlay:$("overlay"),theme:$("themeButton"),filterRow:$("filterRow"),calcList:$("calculatorList"),jail:$("totalJail"),fine:$("totalFine"),selectedCount:$("selectedCount"),clearCalc:$("clearCalculator")};
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");const slug=s=>norm(s).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function hi(t,q){const safe=esc(t),terms=q.trim().split(/\s+/).filter(Boolean).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));return terms.length?safe.replace(new RegExp(`(${terms.join("|")})`,"gi"),"<mark>$1</mark>"):safe}
function text(a,c){return norm([a.number,a.title,a.description,a.severity,a.penalty?.jail,a.penalty?.fine,a.penalty?.points,a.penalty?.seize,...(a.tags||[]),c.title,c.description].join(" "))}
function visible(){const q=norm(S.q.trim());return S.data.chapters.filter(c=>S.chapter==="all"||c.id===S.chapter).map(c=>({...c,articles:c.articles.filter(a=>(!q||text(a,c).includes(q))&&(S.filter==="all"||a.severity===S.filter))})).filter(c=>c.articles.length)}
function renderNav(){E.chapterNav.innerHTML=S.data.chapters.map(c=>`<button class="chapter-btn ${S.chapter===c.id?"active":""}" data-ch="${esc(c.id)}"><span class="icon">${esc(c.icon||"▤")}</span><b>${esc(c.title)}</b><span class="count">${c.articles.length}</span></button>`).join("");document.querySelector(".home").classList.toggle("active",S.chapter==="all");document.querySelector(".home").onclick=()=>{S.chapter="all";renderNav();renderArticles()};E.chapterNav.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{S.chapter=b.dataset.ch;renderNav();renderArticles();closeMenu();document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"})})}
function renderDash(){const all=S.data.chapters.flatMap(c=>c.articles.map(a=>({...a,chapter:c})));["coke","wiet","lean","meth","speed","opium","xtc","heroïne","drugslab","gijzeling","wapen","witwassen"].forEach;E.popular.innerHTML=["coke","wiet","lean","meth","speed","opium","xtc","heroïne","drugslab","gijzeling","wapen","witwassen"].map(t=>`<button data-q="${t}">${t}</button>`).join("");E.popular.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{S.q=b.dataset.q;S.chapter="all";E.search.value=S.q;renderNav();renderArticles();document.querySelector("#wetboek").scrollIntoView({behavior:"smooth"})});const recent=all.filter(a=>a.updated).slice(0,6);E.recent.innerHTML=recent.map(a=>`<div class="recent"><b>Artikel ${esc(a.number)} — ${esc(a.title)}</b><span>${esc(a.updated)}</span></div>`).join("")}
function card(a){return `<article class="article-card ${S.expanded||S.q?"open":""}" id="artikel-${slug(a.number)}"><button class="article-head"><span class="article-number">Art. ${hi(a.number,S.q)}</span><span class="article-title"><b>${hi(a.title,S.q)}</b><small>${hi((a.tags||[]).join(" · "),S.q)}</small></span><span class="quick-penalty">${a.penalty?.jail?`<span class="badge">Cel: ${esc(a.penalty.jail)}</span>`:""}${a.penalty?.fine?`<span class="badge">Boete: ${esc(a.penalty.fine)}</span>`:""}</span><span class="chev">⌄</span></button><div class="article-body"><div class="article-inner"><p>${hi(a.description,S.q)}</p><div class="penalty-grid"><div class="penalty"><small>Celstraf</small><strong>${esc(a.penalty?.jail||"Niet van toepassing")}</strong></div><div class="penalty"><small>Boete</small><strong>${esc(a.penalty?.fine||"Niet van toepassing")}</strong></div><div class="penalty"><small>Punten / maatregel</small><strong>${esc(a.penalty?.points||"Niet van toepassing")}</strong></div><div class="penalty"><small>Inbeslagname</small><strong>${esc(a.penalty?.seize||"Volgens situatie")}</strong></div></div><div class="tag-row">${(a.tags||[]).map(t=>`<span class="article-tag">${hi(t,S.q)}</span>`).join("")}</div></div></div></article>`}
function renderArticles(){const cs=visible(),total=cs.reduce((n,c)=>n+c.articles.length,0);E.title.textContent=S.q?`Zoeken naar “${S.q}”`:S.chapter==="all"?"Alle artikelen":S.data.chapters.find(c=>c.id===S.chapter)?.title;E.count.textContent=`${total} ${total===1?"artikel":"artikelen"} gevonden`;E.clear.hidden=!S.q;E.empty.hidden=total!==0;E.law.innerHTML=cs.map((c,i)=>`<section class="chapter-section"><div class="chapter-header"><span>${c.icon||String(i+1)}</span><div><h3>${hi(c.title,S.q)}</h3><p>${hi(c.description,S.q)}</p></div></div>${c.articles.map(card).join("")}</section>`).join("");document.querySelectorAll(".article-head").forEach(b=>b.onclick=()=>b.closest(".article-card").classList.toggle("open"));if(location.hash)setTimeout(openHash,50)}
function renderFilters(){const fs=[["all","Alles"],["normaal","Normaal"],["middel","Middel"],["ernstig","Ernstig"],["zeer ernstig","Zeer ernstig"]];E.filterRow.innerHTML=fs.map(([v,l])=>`<button class="${S.filter===v?"active":""}" data-filter="${v}">${l}</button>`).join("");E.filterRow.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{S.filter=b.dataset.filter;renderFilters();renderArticles()})}
const months=v=>Number((String(v||"").match(/(\d+)/)||[0,0])[1]);const money=v=>Number(String(v||"").replace(/[^\d]/g,""))||0;
function renderCalc(){const all=S.data.chapters.flatMap(c=>c.articles);E.calcList.innerHTML=all.map(a=>`<label class="calc-row"><input type="checkbox" value="${esc(a.number)}"><b>Artikel ${esc(a.number)} — ${esc(a.title)}</b><span>${esc(a.penalty?.jail||"0 maanden")} · ${esc(a.penalty?.fine||"€0")}</span></label>`).join("");E.calcList.querySelectorAll("input").forEach(x=>x.onchange=()=>{x.checked?S.selected.add(x.value):S.selected.delete(x.value);updateCalc()})}
function updateCalc(){const all=S.data.chapters.flatMap(c=>c.articles);let j=0,f=0;all.filter(a=>S.selected.has(a.number)).forEach(a=>{j+=months(a.penalty?.jail);f+=money(a.penalty?.fine)});let factor=1;if($("recidive").checked)factor+=.5;if($("weaponUsed").checked)factor+=.1;if($("officerVictim").checked)factor+=.15;j=Math.round(j*factor);f=Math.round(f*factor);E.jail.textContent=`${j} maanden`;E.fine.textContent=new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(f);E.selectedCount.textContent=`${S.selected.size} artikelen geselecteerd`}
function openHash(){const el=document.getElementById(location.hash.slice(1));if(el){el.classList.add("open");el.scrollIntoView({behavior:"smooth",block:"center"})}}function closeMenu(){E.sidebar.classList.remove("open");E.overlay.classList.remove("show")}
async function init(){let loaded = false;
  if (
    window.GH_SUPABASE_URL &&
    window.GH_SUPABASE_PUBLISHABLE_KEY &&
    !window.GH_SUPABASE_URL.startsWith("VUL_")
  ) {
    const client = window.supabase.createClient(
      window.GH_SUPABASE_URL,
      window.GH_SUPABASE_PUBLISHABLE_KEY
    );

    const { data: chapters, error: chapterError } = await client
      .from("chapters")
      .select("*")
      .eq("is_published", true)
      .order("sort_order");

    const { data: articles, error: articleError } = await client
      .from("articles")
      .select("*")
      .eq("is_published", true)
      .order("sort_order");

    if (!chapterError && !articleError && chapters?.length) {
      S.data = {
        meta: {
          title: "Wetboek GoudHaven",
          lastUpdated: new Date().toLocaleDateString("nl-NL", {
            day: "numeric", month: "long", year: "numeric"
          }),
          version: "Online"
        },
        chapters: chapters.map(chapter => ({
          id: chapter.slug,
          title: chapter.title,
          icon: chapter.icon || "▤",
          description: chapter.description || "",
          articles: (articles || [])
            .filter(article => article.chapter_id === chapter.id)
            .map(article => ({
              number: article.article_number,
              title: article.title,
              description: article.description || "",
              penalty: {
                jail: article.jail || "",
                fine: article.fine || "",
                points: article.points || "",
                seize: article.seize || ""
              },
              tags: article.tags || [],
              updated: article.updated_at
                ? new Date(article.updated_at).toLocaleDateString("nl-NL")
                : "",
              severity: article.severity || "normaal"
            }))
        }))
      };
      loaded = true;
    }
  }

  if (!loaded) {
    const r = await fetch("data/wetboek.json", { cache: "no-store" });
    S.data = await r.json();
  }const total=S.data.chapters.reduce((n,c)=>n+c.articles.length,0);E.articleCount.textContent=total;E.chapterCount.textContent=S.data.chapters.length;E.updated.textContent=S.data.meta.lastUpdated;E.version.textContent=S.data.meta.version;renderNav();renderDash();renderFilters();renderArticles();renderCalc();E.search.oninput=e=>{S.q=e.target.value;S.chapter="all";renderNav();renderArticles()};E.clear.onclick=()=>{S.q="";E.search.value="";renderArticles()};E.expand.onclick=()=>{S.expanded=!S.expanded;E.expand.textContent=S.expanded?"Alles sluiten":"Alles openen";renderArticles()};E.quickBtn.onclick=()=>{S.q=E.quick.value.trim();E.search.value=S.q;S.chapter="all";renderNav();renderArticles()};E.menu.onclick=()=>{E.sidebar.classList.add("open");E.overlay.classList.add("show")};E.overlay.onclick=closeMenu;E.theme.onclick=()=>{const n=(document.documentElement.dataset.theme||"dark")==="dark"?"light":"dark";document.documentElement.dataset.theme=n;localStorage.setItem("gh-theme",n)};document.documentElement.dataset.theme=localStorage.getItem("gh-theme")||"dark";["recidive","weaponUsed","officerVictim"].forEach(id=>$(id).onchange=updateCalc);E.clearCalc.onclick=()=>{S.selected.clear();document.querySelectorAll(".calc-row input").forEach(x=>x.checked=false);updateCalc()};document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();E.search.focus()}});$("year").textContent=new Date().getFullYear();openHash()}init();
