const $=id=>document.getElementById(id);
const configReady=window.GH_SUPABASE_URL&&window.GH_SUPABASE_PUBLISHABLE_KEY&&!window.GH_SUPABASE_PUBLISHABLE_KEY.startsWith("PLAK_");
const db=configReady?window.supabase.createClient(window.GH_SUPABASE_URL,window.GH_SUPABASE_PUBLISHABLE_KEY):null;
let user=null,chapters=[],articles=[],changes=[],admins=[],articleVersions=[],selectedArticles=new Set();
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
function showApp(){
  const loginScreen=$("loginScreen"),app=$("app");
  loginScreen.hidden=true;
  loginScreen.style.setProperty("display","none","important");
  app.hidden=false;
  app.style.setProperty("display","grid","important");
  $("loginMessage").textContent="";
  $("userEmail").textContent=user.email;
  $("userInitial").textContent=user.email[0].toUpperCase();
  if($("settingsUserEmail")) $("settingsUserEmail").textContent=user.email;
}
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
function switchView(name){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("view-"+name).classList.add("active");document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===name));$("pageTitle").textContent={dashboard:"Dashboard",articles:"Artikelen",chapters:"Hoofdstukken",changes:"Wijzigingen",admins:"Beheerders",settings:"Instellingen"}[name];document.querySelector(".sidebar").classList.remove("open")}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
document.querySelectorAll("[data-view-jump]").forEach(b=>b.onclick=()=>switchView(b.dataset.viewJump));
$("menuButton").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");

function escapeHtml(value){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function renderActivityChart(){
 const days=[];
 for(let i=6;i>=0;i--){
   const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
   const next=new Date(d); next.setDate(next.getDate()+1);
   const count=changes.filter(c=>{const x=new Date(c.created_at);return x>=d&&x<next}).length;
   days.push({date:d,count});
 }
 const max=Math.max(1,...days.map(d=>d.count));
 $("activityChart").innerHTML=days.map(d=>`<div class="activity-day"><b>${d.count}</b><div class="activity-bar-wrap"><i class="activity-bar" style="height:${Math.max(4,d.count/max*100)}%"></i></div><small>${d.date.toLocaleDateString("nl-NL",{weekday:"short"})}</small></div>`).join("");
 const total=days.reduce((s,d)=>s+d.count,0);
 $("activitySummary").textContent=`${total} wijziging${total===1?"":"en"}`;
}
function renderSeverity(){
 const levels=[
  {key:"normaal",label:"Normaal",color:"#7f8b99"},
  {key:"middel",label:"Middel",color:"#e0b22f"},
  {key:"ernstig",label:"Ernstig",color:"#e98b43"},
  {key:"zeer ernstig",label:"Zeer ernstig",color:"#d95757"}
 ];
 const total=Math.max(articles.length,1);
 let start=0,parts=[];
 const rows=levels.map(level=>{
   const count=articles.filter(a=>(a.severity||"normaal")===level.key).length;
   const end=start+(count/total*100);
   parts.push(`${level.color} ${start}% ${end}%`);
   start=end;
   return {...level,count};
 });
 $("severityDonut").style.background=`conic-gradient(${parts.join(",")})`;
 $("severityTotal").textContent=articles.length;
 $("severityLegend").innerHTML=rows.map(r=>`<div><i style="--legend-color:${r.color}"></i><span>${r.label}</span><small>${r.count}</small></div>`).join("");
}
function csvEscape(value){const s=String(value??"");return `"${s.replace(/"/g,'""')}"`}
function exportArticlesCsv(){
 const header=["Artikel","Titel","Hoofdstuk","Omschrijving","Celstraf","Boete","Punten/Maatregel","Inbeslagname","Ernst","Trefwoorden","Status","Gewijzigd"];
 const rows=articles.map(a=>{
   const c=chapters.find(x=>x.id===a.chapter_id);
   return [a.article_number,a.title,c?.title||"",a.description,a.jail,a.fine,a.points,a.seize,a.severity,(a.tags||[]).join(", "),a.is_published?"Gepubliceerd":"Concept",a.updated_at];
 });
 const csv="\ufeff"+[header,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=`goudhaven-wetboek-${new Date().toISOString().slice(0,10)}.csv`;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
 toast("CSV-export gedownload");
}
function renderDashboard(){
 $("statArticles").textContent=articles.length;
 $("statChapters").textContent=chapters.length;
 $("statPublished").textContent=articles.filter(a=>a.is_published).length;
 $("statDrafts").textContent=articles.filter(a=>!a.is_published).length;
 $("statAdmins").textContent=admins.length;

 $("recentChanges").innerHTML=(changes.slice(0,6).map(c=>`<div class="recent-row"><div><strong>${escapeHtml(c.title||c.action)}</strong><small>${escapeHtml(c.entity_type||"item")} · ${escapeHtml(c.actor_email||"Beheerder")}</small></div><small>${fmt(c.created_at)}</small></div>`).join("")||'<div class="recent-row"><small>Nog geen wijzigingen geregistreerd.</small></div>');

 const counts=chapters.map(c=>({chapter:c,count:articles.filter(a=>a.chapter_id===c.id).length}));
 const max=Math.max(1,...counts.map(x=>x.count));
 $("chapterBreakdown").innerHTML=counts.map(({chapter:c,count:n})=>`<div class="break-row"><div class="break-meta"><span>${escapeHtml(c.icon||"▤")} ${escapeHtml(c.title)}</span><b>${n}</b></div><div class="bar"><i style="width:${n/max*100}%"></i></div></div>`).join("");
 const largest=[...counts].sort((a,b)=>b.count-a.count)[0];
 $("largestChapter").textContent=largest?`Grootste: ${largest.chapter.title}`:"";

 renderActivityChart();
 renderSeverity();
}
function fillSelectors(){
 const opts=chapters.map(c=>`<option value="${c.id}">${c.title}</option>`).join("");
 $("articleChapter").innerHTML=opts;$("chapterFilter").innerHTML='<option value="">Alle hoofdstukken</option>'+opts
}
function getFilteredArticles(){
 const q=$("articleSearch").value.toLowerCase().trim(),ch=$("chapterFilter").value,st=$("statusFilter").value,sev=$("severityFilter").value,sort=$("articleSort").value;
 const chapterOrder=new Map(chapters.map((c,i)=>[c.id,i]));
 const list=articles.filter(a=>
   (!q||`${a.article_number} ${a.title} ${a.description||""} ${(a.tags||[]).join(" ")}`.toLowerCase().includes(q))&&
   (!ch||a.chapter_id===ch)&&
   (!st||(st==="published"?a.is_published:!a.is_published))&&
   (!sev||(a.severity||"normaal")===sev)
 );
 return list.sort((a,b)=>{
   if(sort==="newest")return new Date(b.updated_at)-new Date(a.updated_at);
   if(sort==="number")return String(a.article_number).localeCompare(String(b.article_number),"nl",{numeric:true});
   if(sort==="title")return String(a.title).localeCompare(String(b.title),"nl");
   return (chapterOrder.get(a.chapter_id)-chapterOrder.get(b.chapter_id))||(a.sort_order-b.sort_order);
 });
}
function updateBulkToolbar(){
 $("selectedCount").textContent=selectedArticles.size;
 $("bulkToolbar").hidden=selectedArticles.size===0;
 $("selectAllArticles").checked=getFilteredArticles().length>0&&getFilteredArticles().every(a=>selectedArticles.has(a.id));
 $("selectAllArticles").indeterminate=selectedArticles.size>0&&!$("selectAllArticles").checked;
}
function renderArticles(){
 const list=getFilteredArticles();
 $("articlesBody").innerHTML=list.map(a=>{
  const c=chapters.find(x=>x.id===a.chapter_id),severity=(a.severity||"normaal");
  return`<tr>
   <td class="check-col"><input type="checkbox" data-select-article="${a.id}" ${selectedArticles.has(a.id)?"checked":""}></td>
   <td><b>${escapeHtml(a.article_number)}</b></td>
   <td><b>${escapeHtml(a.title)}</b><small>${escapeHtml((a.tags||[]).slice(0,3).join(" · "))}</small></td>
   <td>${escapeHtml(c?.title||"—")}</td>
   <td><span class="severity-chip ${severity.replace(/\s+/g,"-")}">${escapeHtml(severity)}</span></td>
   <td><span class="status ${a.is_published?"live":"draft"}">${a.is_published?"Gepubliceerd":"Concept"}</span></td>
   <td>${fmt(a.updated_at)}</td>
   <td><div class="row-actions"><button data-edit-article="${a.id}">Bewerken</button></div></td>
  </tr>`}).join("")||'<tr><td colspan="8">Geen artikelen gevonden.</td></tr>';
 document.querySelectorAll("[data-edit-article]").forEach(b=>b.onclick=()=>openArticle(articles.find(a=>a.id===b.dataset.editArticle)));
 document.querySelectorAll("[data-select-article]").forEach(b=>b.onchange=()=>{b.checked?selectedArticles.add(b.dataset.selectArticle):selectedArticles.delete(b.dataset.selectArticle);updateBulkToolbar()});
 updateBulkToolbar();
}
["articleSearch","chapterFilter","statusFilter","severityFilter","articleSort"].forEach(id=>$(id).oninput=renderArticles);
$("selectAllArticles").onchange=e=>{
 getFilteredArticles().forEach(a=>e.target.checked?selectedArticles.add(a.id):selectedArticles.delete(a.id));
 renderArticles();
};
$("clearSelection").onclick=()=>{selectedArticles.clear();renderArticles()};
async function bulkUpdatePublished(value){
 if(!selectedArticles.size)return;
 const {error}=await db.from("articles").update({is_published:value,updated_by:user.id}).in("id",[...selectedArticles]);
 if(error){alert(error.message);return}
 toast(value?"Artikelen gepubliceerd":"Artikelen naar concept");
 selectedArticles.clear();await loadAll();
}
$("bulkPublish").onclick=()=>bulkUpdatePublished(true);
$("bulkDraft").onclick=()=>bulkUpdatePublished(false);
$("bulkDelete").onclick=async()=>{
 if(!selectedArticles.size||!confirm(`${selectedArticles.size} artikelen definitief verwijderen?`))return;
 const {error}=await db.from("articles").delete().in("id",[...selectedArticles]);
 if(error){alert(error.message);return}
 toast("Geselecteerde artikelen verwijderd");selectedArticles.clear();await loadAll();
};
function renderChapters(){$("chaptersGrid").innerHTML=chapters.map(c=>`<article class="chapter-card"><div class="chapter-card-top"><span class="chapter-icon">${c.icon||"▤"}</span><span class="status ${c.is_published?"live":"draft"}">${c.is_published?"Online":"Concept"}</span></div><h3>${c.title}</h3><p>${c.description||"Geen omschrijving."}</p><footer><span>${articles.filter(a=>a.chapter_id===c.id).length} artikelen</span><button data-edit-chapter="${c.id}">Bewerken</button></footer></article>`).join("");document.querySelectorAll("[data-edit-chapter]").forEach(b=>b.onclick=()=>openChapter(chapters.find(c=>c.id===b.dataset.editChapter)))}
function renderChanges(){$("changesList").innerHTML=changes.map(c=>`<div class="change-row"><div><strong>${c.title||c.action}</strong><small>${c.action} · ${c.actor_email||"Beheerder"}</small></div><small>${new Date(c.created_at).toLocaleString("nl-NL")}</small></div>`).join("")||'<div class="change-row"><small>Nog geen wijzigingen.</small></div>'}
function renderAdmins(){$("adminsList").innerHTML=admins.map(a=>`<div class="admin-row"><div><strong>${a.email||a.user_id}</strong><small>Toegevoegd op ${fmt(a.created_at)}</small></div><span class="status live">Beheerder</span></div>`).join("")||'<div class="admin-row"><small>Geen beheerders gevonden.</small></div>'}
function updatePreview(){
  const chapter=chapters.find(c=>c.id===$("articleChapter").value);
  $("previewChapter").textContent=chapter?.title||"Hoofdstuk";
  $("previewNumber").textContent="Artikel "+($("articleNumber").value||"—");
  $("previewTitle").textContent=$("articleTitle").value||"Titel van het artikel";
  $("previewDescription").textContent=$("articleDescription").value||"De omschrijving verschijnt hier terwijl je typt.";
  $("previewJail").textContent=$("articleJail").value||"—";
  $("previewFine").textContent=$("articleFine").value||"—";
  $("previewPoints").textContent=$("articlePoints").value||"—";
  $("previewSeize").textContent=$("articleSeize").value||"—";
  const tags=$("articleTags").value.split(",").map(x=>x.trim()).filter(Boolean);
  $("previewTags").innerHTML=tags.map(t=>`<span>${t}</span>`).join("");
}
function setEditorTab(name){
  document.querySelectorAll(".editor-tab").forEach(b=>b.classList.toggle("active",b.dataset.editorTab===name));
  document.querySelectorAll(".editor-panel").forEach(p=>p.classList.toggle("active",p.id==="editor-"+name));
  if(name==="preview") updatePreview();
}
document.querySelectorAll(".editor-tab").forEach(b=>b.onclick=()=>setEditorTab(b.dataset.editorTab));

let draftTimer;
function saveLocalDraft(){
  clearTimeout(draftTimer);
  $("autosaveStatus").textContent="Concept opslaan...";
  draftTimer=setTimeout(()=>{
    const id=$("articleId").value||"new";
    const draft={chapter_id:$("articleChapter").value,article_number:$("articleNumber").value,title:$("articleTitle").value,description:$("articleDescription").value,jail:$("articleJail").value,fine:$("articleFine").value,points:$("articlePoints").value,seize:$("articleSeize").value,severity:$("articleSeverity").value,sort_order:$("articleOrder").value,tags:$("articleTags").value,is_published:$("articlePublished").checked};
    localStorage.setItem("gh-draft-"+id,JSON.stringify(draft));
    $("autosaveStatus").textContent="Lokaal concept opgeslagen";
  },650);
}
["articleChapter","articleNumber","articleTitle","articleDescription","articleJail","articleFine","articlePoints","articleSeize","articleSeverity","articleOrder","articleTags","articlePublished"].forEach(id=>{
  $(id).addEventListener("input",()=>{saveLocalDraft();updatePreview()});
  $(id).addEventListener("change",()=>{saveLocalDraft();updatePreview()});
});

async function loadArticleHistory(articleId){
  if(!articleId){$("articleHistoryList").innerHTML='<p class="empty-state">Sla het artikel eerst op om geschiedenis te bekijken.</p>';return}
  const {data,error}=await db.from("article_versions").select("*").eq("article_id",articleId).order("created_at",{ascending:false}).limit(30);
  if(error){$("articleHistoryList").innerHTML='<p class="empty-state">Geschiedenis kon niet worden geladen.</p>';return}
  articleVersions=data||[];
  $("articleHistoryList").innerHTML=articleVersions.map((v,i)=>`<article class="history-item"><header><div><b>Versie ${articleVersions.length-i}</b><small>${v.actor_email||"Beheerder"}</small></div><small>${new Date(v.created_at).toLocaleString("nl-NL")}</small></header><button type="button" data-restore-version="${v.id}">Deze versie herstellen</button></article>`).join("")||'<p class="empty-state">Nog geen eerdere versies.</p>';
  document.querySelectorAll("[data-restore-version]").forEach(b=>b.onclick=()=>restoreVersion(b.dataset.restoreVersion));
}
async function restoreVersion(versionId){
  const version=articleVersions.find(v=>String(v.id)===String(versionId));
  if(!version||!confirm("Deze versie terugzetten? De huidige versie blijft in de geschiedenis staan."))return;
  const snapshot=version.snapshot;
  const {error}=await db.from("articles").update({...snapshot,updated_by:user.id}).eq("id",$("articleId").value);
  if(error){alert(error.message);return}
  toast("Vorige versie hersteld");
  await loadAll();
  const fresh=articles.find(a=>a.id===$("articleId").value);
  openArticle(fresh);
}
function openArticle(a={}){
 $("articleDialogTitle").textContent=a.id?"Artikel bewerken":"Nieuw artikel";$("articleId").value=a.id||"";$("articleChapter").value=a.chapter_id||chapters[0]?.id||"";$("articleNumber").value=a.article_number||"";$("articleTitle").value=a.title||"";$("articleDescription").value=a.description||"";$("articleJail").value=a.jail||"";$("articleFine").value=a.fine||"";$("articlePoints").value=a.points||"";$("articleSeize").value=a.seize||"";$("articleSeverity").value=a.severity||"normaal";$("articleOrder").value=a.sort_order||0;$("articleTags").value=(a.tags||[]).join(", ");$("articlePublished").checked=a.is_published!==false;$("deleteArticleButton").hidden=!a.id;$("duplicateArticleButton").hidden=!a.id;$("autosaveStatus").textContent="Niet opgeslagen";setEditorTab("edit");updatePreview();loadArticleHistory(a.id);$("articleDialog").showModal()
}
$("newArticleButton").onclick=$("quickNewArticle").onclick=$("quickNewArticle2").onclick=()=>openArticle();
$("articleForm").onsubmit=async e=>{e.preventDefault();const id=$("articleId").value,p={chapter_id:$("articleChapter").value,article_number:$("articleNumber").value.trim(),title:$("articleTitle").value.trim(),description:$("articleDescription").value,jail:$("articleJail").value,fine:$("articleFine").value,points:$("articlePoints").value,seize:$("articleSeize").value,severity:$("articleSeverity").value,sort_order:+$("articleOrder").value||0,tags:$("articleTags").value.split(",").map(x=>x.trim()).filter(Boolean),is_published:$("articlePublished").checked,updated_by:user.id};const r=id?await db.from("articles").update(p).eq("id",id):await db.from("articles").insert(p);if(r.error){alert(r.error.message);return}localStorage.removeItem("gh-draft-"+(id||"new"));$("articleDialog").close();toast("Artikel opgeslagen");await loadAll()};
$("duplicateArticleButton").onclick=async()=>{
 const id=$("articleId").value;
 const source=articles.find(a=>a.id===id);
 if(!source)return;
 const copy={
  chapter_id:source.chapter_id,
  article_number:source.article_number+" kopie",
  title:source.title+" (kopie)",
  description:source.description,
  jail:source.jail,
  fine:source.fine,
  points:source.points,
  seize:source.seize,
  severity:source.severity,
  sort_order:(source.sort_order||0)+1,
  tags:source.tags||[],
  is_published:false,
  updated_by:user.id
 };
 const {data,error}=await db.from("articles").insert(copy).select().single();
 if(error){alert(error.message);return}
 $("articleDialog").close();toast("Artikel gedupliceerd als concept");await loadAll();openArticle(data);
};
$("deleteArticleButton").onclick=async()=>{const id=$("articleId").value;if(!id||!confirm("Dit artikel definitief verwijderen?"))return;const{error}=await db.from("articles").delete().eq("id",id);if(error){alert(error.message);return}$("articleDialog").close();toast("Artikel verwijderd");await loadAll()};
function openChapter(c={}){$("chapterDialogTitle").textContent=c.id?"Hoofdstuk bewerken":"Nieuw hoofdstuk";$("chapterId").value=c.id||"";$("chapterTitle").value=c.title||"";$("chapterSlug").value=c.slug||"";$("chapterIcon").value=c.icon||"";$("chapterDescription").value=c.description||"";$("chapterOrder").value=c.sort_order||0;$("chapterPublished").checked=c.is_published!==false;$("chapterDialog").showModal()}
$("newChapterButton").onclick=()=>openChapter();
$("chapterTitle").oninput=()=>{if(!$("chapterId").value)$("chapterSlug").value=slug($("chapterTitle").value)};
$("chapterForm").onsubmit=async e=>{e.preventDefault();const id=$("chapterId").value,p={title:$("chapterTitle").value.trim(),slug:$("chapterSlug").value.trim(),icon:$("chapterIcon").value,description:$("chapterDescription").value,sort_order:+$("chapterOrder").value||0,is_published:$("chapterPublished").checked};const r=id?await db.from("chapters").update(p).eq("id",id):await db.from("chapters").insert(p);if(r.error){alert(r.error.message);return}$("chapterDialog").close();toast("Hoofdstuk opgeslagen");await loadAll()};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());

async function importCurrentWetboek(){
  if(articles.length||chapters.length){
    alert("De database bevat al hoofdstukken of artikelen. Importeren is daarom geblokkeerd om dubbele gegevens te voorkomen.");
    return;
  }
  if(!confirm("Het volledige huidige wetboek importeren naar Supabase?")) return;

  const buttons=[$("importWetboekButton"),$("settingsImportButton")].filter(Boolean);
  buttons.forEach(b=>{b.disabled=true;b.textContent="Importeren..."});

  try{
    const response=await fetch("../data/wetboek.json",{cache:"no-store"});
    if(!response.ok) throw new Error("wetboek.json kon niet worden geladen");
    const book=await response.json();

    for(let chapterIndex=0;chapterIndex<book.chapters.length;chapterIndex++){
      const sourceChapter=book.chapters[chapterIndex];
      const {data:createdChapter,error:chapterError}=await db
        .from("chapters")
        .insert({
          title:sourceChapter.title,
          slug:sourceChapter.id,
          icon:sourceChapter.icon||"▤",
          description:sourceChapter.description||"",
          sort_order:chapterIndex,
          is_published:true
        })
        .select()
        .single();

      if(chapterError) throw chapterError;

      const rows=(sourceChapter.articles||[]).map((article,index)=>({
        chapter_id:createdChapter.id,
        article_number:article.number,
        title:article.title,
        description:article.description||"",
        jail:article.penalty?.jail||"",
        fine:article.penalty?.fine||"",
        points:article.penalty?.points||"",
        seize:article.penalty?.seize||"",
        severity:article.severity||"normaal",
        tags:article.tags||[],
        sort_order:index,
        is_published:true,
        updated_by:user.id
      }));

      if(rows.length){
        const {error:articleError}=await db.from("articles").insert(rows);
        if(articleError) throw articleError;
      }
    }

    toast("Het volledige wetboek is geïmporteerd.");
    await loadAll();
  }catch(error){
    console.error("Importeren mislukt:",error);
    alert("Importeren mislukt: "+(error.message||error));
  }finally{
    buttons.forEach(b=>{b.disabled=false;b.textContent=b.id==="settingsImportButton"?"Wetboek importeren":"Huidig wetboek importeren"});
  }
}
if($("importWetboekButton")) $("importWetboekButton").onclick=importCurrentWetboek;
if($("settingsImportButton")) $("settingsImportButton").onclick=importCurrentWetboek;


$("printArticleButton").onclick=()=>{setEditorTab("preview");setTimeout(()=>window.print(),100)};
$("exportCsvButton").onclick=exportArticlesCsv;

boot();