const $=id=>document.getElementById(id);
const configReady=window.GH_SUPABASE_URL&&window.GH_SUPABASE_PUBLISHABLE_KEY&&!window.GH_SUPABASE_PUBLISHABLE_KEY.startsWith("PLAK_");
const db=configReady?window.supabase.createClient(window.GH_SUPABASE_URL,window.GH_SUPABASE_PUBLISHABLE_KEY):null;
let user=null,chapters=[],articles=[],changes=[],admins=[];
const fmt=d=>d?new Date(d).toLocaleDateString("nl-NL",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
const toast=m=>{$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)};
const slug=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
async function isAdmin(uid){const{data,error}=await db.from("admins").select("user_id").eq("user_id",uid).maybeSingle();return !error&&!!data}
async function boot(){
 if(!configReady){$("loginMessage").textContent="De Publishable key ontbreekt nog in supabase-config.js.";return}
 const{data:{session}}=await db.auth.getSession();
 if(session&&await isAdmin(session.user.id)){user=session.user;showApp();await loadAll()}
}
$("loginForm").onsubmit=async e=>{e.preventDefault();$("loginMessage").textContent="Inloggen...";const{data,error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){$("loginMessage").textContent="Inloggen mislukt: "+error.message;return}if(!await isAdmin(data.user.id)){await db.auth.signOut();$("loginMessage").textContent="Dit account is geen beheerder.";return}user=data.user;showApp();await loadAll()};
function showApp(){$("loginScreen").hidden=true;$("app").hidden=false;$("userEmail").textContent=user.email;$("userInitial").textContent=user.email[0].toUpperCase()}
$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};
async function loadAll(){
 const[c,a,l,ad]=await Promise.all([
   db.from("chapters").select("*").order("sort_order"),
   db.from("articles").select("*").order("sort_order"),
   db.from("change_log").select("*").order("created_at",{ascending:false}).limit(100),
   db.from("admin_overview").select("*").order("email")
 ]);
 chapters=c.data||[];articles=a.data||[];changes=l.data||[];admins=ad.data||[];
 fillSelectors();renderDashboard();renderArticles();renderChapters();renderChanges();renderAdmins()
}
function switchView(name){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("view-"+name).classList.add("active");document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===name));$("pageTitle").textContent={dashboard:"Dashboard",articles:"Artikelen",chapters:"Hoofdstukken",changes:"Wijzigingen",admins:"Beheerders"}[name];document.querySelector(".sidebar").classList.remove("open")}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
document.querySelectorAll("[data-view-jump]").forEach(b=>b.onclick=()=>switchView(b.dataset.viewJump));
$("menuButton").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");
function renderDashboard(){
 $("statArticles").textContent=articles.length;$("statChapters").textContent=chapters.length;$("statPublished").textContent=articles.filter(a=>a.is_published).length;
 $("statUpdated").textContent=fmt(articles.map(a=>a.updated_at).sort().at(-1));
 $("recentChanges").innerHTML=(changes.slice(0,6).map(c=>`<div class="recent-row"><div><strong>${c.title||c.action}</strong><small>${c.entity_type} · ${c.actor_email||"Beheerder"}</small></div><small>${fmt(c.created_at)}</small></div>`).join("")||'<div class="recent-row"><small>Nog geen wijzigingen geregistreerd.</small></div>');
 const max=Math.max(1,...chapters.map(c=>articles.filter(a=>a.chapter_id===c.id).length));
 $("chapterBreakdown").innerHTML=chapters.map(c=>{const n=articles.filter(a=>a.chapter_id===c.id).length;return`<div class="break-row"><div class="break-meta"><span>${c.icon||"▤"} ${c.title}</span><b>${n}</b></div><div class="bar"><i style="width:${n/max*100}%"></i></div></div>`}).join("")
}
function fillSelectors(){
 const opts=chapters.map(c=>`<option value="${c.id}">${c.title}</option>`).join("");
 $("articleChapter").innerHTML=opts;$("chapterFilter").innerHTML='<option value="">Alle hoofdstukken</option>'+opts
}
function renderArticles(){
 const q=$("articleSearch").value.toLowerCase(),ch=$("chapterFilter").value,st=$("statusFilter").value;
 const list=articles.filter(a=>(!q||`${a.article_number} ${a.title} ${(a.tags||[]).join(" ")}`.toLowerCase().includes(q))&&(!ch||a.chapter_id===ch)&&(!st||(st==="published"?a.is_published:!a.is_published)));
 $("articlesBody").innerHTML=list.map(a=>{const c=chapters.find(x=>x.id===a.chapter_id);return`<tr><td><b>${a.article_number}</b></td><td><b>${a.title}</b><small>${(a.tags||[]).slice(0,3).join(" · ")}</small></td><td>${c?.title||"—"}</td><td><span class="status ${a.is_published?"live":"draft"}">${a.is_published?"Gepubliceerd":"Concept"}</span></td><td>${fmt(a.updated_at)}</td><td><div class="actions"><button data-edit-article="${a.id}">Bewerken</button></div></td></tr>`}).join("")||'<tr><td colspan="6">Geen artikelen gevonden.</td></tr>';
 document.querySelectorAll("[data-edit-article]").forEach(b=>b.onclick=()=>openArticle(articles.find(a=>a.id===b.dataset.editArticle)))
}
["articleSearch","chapterFilter","statusFilter"].forEach(id=>$(id).oninput=renderArticles);
function renderChapters(){$("chaptersGrid").innerHTML=chapters.map(c=>`<article class="chapter-card"><div class="chapter-card-top"><span class="chapter-icon">${c.icon||"▤"}</span><span class="status ${c.is_published?"live":"draft"}">${c.is_published?"Online":"Concept"}</span></div><h3>${c.title}</h3><p>${c.description||"Geen omschrijving."}</p><footer><span>${articles.filter(a=>a.chapter_id===c.id).length} artikelen</span><button data-edit-chapter="${c.id}">Bewerken</button></footer></article>`).join("");document.querySelectorAll("[data-edit-chapter]").forEach(b=>b.onclick=()=>openChapter(chapters.find(c=>c.id===b.dataset.editChapter)))}
function renderChanges(){$("changesList").innerHTML=changes.map(c=>`<div class="change-row"><div><strong>${c.title||c.action}</strong><small>${c.action} · ${c.actor_email||"Beheerder"}</small></div><small>${new Date(c.created_at).toLocaleString("nl-NL")}</small></div>`).join("")||'<div class="change-row"><small>Nog geen wijzigingen.</small></div>'}
function renderAdmins(){$("adminsList").innerHTML=admins.map(a=>`<div class="admin-row"><div><strong>${a.email||a.user_id}</strong><small>Toegevoegd op ${fmt(a.created_at)}</small></div><span class="status live">Beheerder</span></div>`).join("")||'<div class="admin-row"><small>Geen beheerders gevonden.</small></div>'}
function openArticle(a={}){
 $("articleDialogTitle").textContent=a.id?"Artikel bewerken":"Nieuw artikel";$("articleId").value=a.id||"";$("articleChapter").value=a.chapter_id||chapters[0]?.id||"";$("articleNumber").value=a.article_number||"";$("articleTitle").value=a.title||"";$("articleDescription").value=a.description||"";$("articleJail").value=a.jail||"";$("articleFine").value=a.fine||"";$("articlePoints").value=a.points||"";$("articleSeize").value=a.seize||"";$("articleSeverity").value=a.severity||"normaal";$("articleOrder").value=a.sort_order||0;$("articleTags").value=(a.tags||[]).join(", ");$("articlePublished").checked=a.is_published!==false;$("deleteArticleButton").hidden=!a.id;$("articleDialog").showModal()
}
$("newArticleButton").onclick=$("quickNewArticle").onclick=()=>openArticle();
$("articleForm").onsubmit=async e=>{e.preventDefault();const id=$("articleId").value,p={chapter_id:$("articleChapter").value,article_number:$("articleNumber").value.trim(),title:$("articleTitle").value.trim(),description:$("articleDescription").value,jail:$("articleJail").value,fine:$("articleFine").value,points:$("articlePoints").value,seize:$("articleSeize").value,severity:$("articleSeverity").value,sort_order:+$("articleOrder").value||0,tags:$("articleTags").value.split(",").map(x=>x.trim()).filter(Boolean),is_published:$("articlePublished").checked,updated_by:user.id};const r=id?await db.from("articles").update(p).eq("id",id):await db.from("articles").insert(p);if(r.error){alert(r.error.message);return}$("articleDialog").close();toast("Artikel opgeslagen");await loadAll()};
$("deleteArticleButton").onclick=async()=>{const id=$("articleId").value;if(!id||!confirm("Dit artikel definitief verwijderen?"))return;const{error}=await db.from("articles").delete().eq("id",id);if(error){alert(error.message);return}$("articleDialog").close();toast("Artikel verwijderd");await loadAll()};
function openChapter(c={}){$("chapterDialogTitle").textContent=c.id?"Hoofdstuk bewerken":"Nieuw hoofdstuk";$("chapterId").value=c.id||"";$("chapterTitle").value=c.title||"";$("chapterSlug").value=c.slug||"";$("chapterIcon").value=c.icon||"";$("chapterDescription").value=c.description||"";$("chapterOrder").value=c.sort_order||0;$("chapterPublished").checked=c.is_published!==false;$("chapterDialog").showModal()}
$("newChapterButton").onclick=()=>openChapter();
$("chapterTitle").oninput=()=>{if(!$("chapterId").value)$("chapterSlug").value=slug($("chapterTitle").value)};
$("chapterForm").onsubmit=async e=>{e.preventDefault();const id=$("chapterId").value,p={title:$("chapterTitle").value.trim(),slug:$("chapterSlug").value.trim(),icon:$("chapterIcon").value,description:$("chapterDescription").value,sort_order:+$("chapterOrder").value||0,is_published:$("chapterPublished").checked};const r=id?await db.from("chapters").update(p).eq("id",id):await db.from("chapters").insert(p);if(r.error){alert(r.error.message);return}$("chapterDialog").close();toast("Hoofdstuk opgeslagen");await loadAll()};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
boot();