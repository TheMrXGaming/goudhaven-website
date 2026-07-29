const React = window.React;
const ReactDOM = window.ReactDOM;

const iconSymbols = {
  Activity:'↗', Archive:'▣', BarChart3:'▥', BookOpen:'▤', Building2:'▦',
  Check:'✓', ChevronRight:'›', CircleUserRound:'●', Clock3:'◷', Copy:'⧉',
  Database:'◉', Download:'⇩', Edit3:'✎', FileText:'▤', Gauge:'◌',
  History:'↻', LayoutDashboard:'▦', LogOut:'→', Menu:'☰', Plus:'+',
  RefreshCw:'↻', Save:'✓', Search:'⌕', Settings:'⚙', Shield:'♛',
  Tags:'◇', Trash2:'×', Users:'♟', X:'×'
};
const makeIcon = name => function Icon({size=18,className=''}) {
  return <span className={'fallback-icon '+className} style={{fontSize:size}} aria-hidden="true">{iconSymbols[name]}</span>
};
const Activity=makeIcon('Activity');
const Archive=makeIcon('Archive');
const BarChart3=makeIcon('BarChart3');
const BookOpen=makeIcon('BookOpen');
const Building2=makeIcon('Building2');
const Check=makeIcon('Check');
const ChevronRight=makeIcon('ChevronRight');
const CircleUserRound=makeIcon('CircleUserRound');
const Clock3=makeIcon('Clock3');
const Copy=makeIcon('Copy');
const Database=makeIcon('Database');
const Download=makeIcon('Download');
const Edit3=makeIcon('Edit3');
const FileText=makeIcon('FileText');
const Gauge=makeIcon('Gauge');
const History=makeIcon('History');
const LayoutDashboard=makeIcon('LayoutDashboard');
const LogOut=makeIcon('LogOut');
const Menu=makeIcon('Menu');
const Plus=makeIcon('Plus');
const RefreshCw=makeIcon('RefreshCw');
const Save=makeIcon('Save');
const Search=makeIcon('Search');
const Settings=makeIcon('Settings');
const Shield=makeIcon('Shield');
const Tags=makeIcon('Tags');
const Trash2=makeIcon('Trash2');
const Users=makeIcon('Users');
const X=makeIcon('X');

const { useEffect, useMemo, useState } = React;

const fmt = value => value ? new Date(value).toLocaleDateString('nl-NL', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
const todayKey = d => new Date(d).toISOString().slice(0,10)
const blankArticle = {
  id:'', chapter_id:'', article_number:'', title:'', description:'', jail:'',
  fine:'', points:'', seize:'', severity:'normaal', tags:[], sort_order:0, is_published:true
}

function Login({supabase, configured, onLogin}) {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const submit=async e=>{
    e.preventDefault()
    if(!configured){setMessage('De Supabase Publishable key ontbreekt in supabase-config.js.');return}
    setMessage('Inloggen...')
    const {data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error){setMessage('Inloggen mislukt: '+error.message);return}
    const {data:admin}=await supabase.from('admins').select('user_id').eq('user_id',data.user.id).maybeSingle()
    if(!admin){await supabase.auth.signOut();setMessage('Dit account is geen beheerder.');return}
    onLogin(data.user)
  }
  return <main className="login-page">
    <section className="login-card">
      <img src="../assets/goudhaven-logo.png" alt="GoudHaven"/>
      <span className="eyebrow">OFFICIEEL BEHEERPANEEL</span>
      <h1>Control Center</h1>
      <p>Beheer het GoudHaven-wetboek vanuit één veilige omgeving.</p>
      <form onSubmit={submit}>
        <label>E-mailadres<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label>Wachtwoord<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <button className="primary" type="submit">Inloggen</button>
      </form>
      <small className="form-message">{message}</small>
    </section>
  </main>
}

const nav = [
  ['dashboard','Dashboard',LayoutDashboard],
  ['articles','Artikelen',BookOpen],
  ['chapters','Hoofdstukken',Archive],
  ['changes','Wijzigingen',History],
  ['admins','Beheerders',Users],
  ['settings','Instellingen',Settings]
]

function App({supabase, configured}) {
  const [user,setUser]=useState(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState('dashboard')
  const [mobileNav,setMobileNav]=useState(false)
  const [chapters,setChapters]=useState([])
  const [articles,setArticles]=useState([])
  const [changes,setChanges]=useState([])
  const [admins,setAdmins]=useState([])
  const [toast,setToast]=useState('')

  const notify=msg=>{setToast(msg);setTimeout(()=>setToast(''),2200)}

  const loadAll=async()=>{
    if(!supabase)return
    setLoading(true)
    const [c,a,l,ad]=await Promise.all([
      supabase.from('chapters').select('*').order('sort_order'),
      supabase.from('articles').select('*').order('sort_order'),
      supabase.from('change_log').select('*').order('created_at',{ascending:false}).limit(250),
      supabase.from('admin_overview').select('*').order('email')
    ])
    setChapters(c.data||[]);setArticles(a.data||[]);setChanges(l.data||[]);setAdmins(ad.data||[])
    setLoading(false)
  }

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const {data:admin}=await supabase.from('admins').select('user_id').eq('user_id',session.user.id).maybeSingle()
        if(admin){setUser(session.user);await loadAll()} else {await supabase.auth.signOut();setLoading(false)}
      } else setLoading(false)
    })
  },[])

  if(loading && !user) return <div className="splash"><img src="../assets/goudhaven-logo.png"/><span>Laden...</span></div>
  if(!user) return <Login supabase={supabase} configured={configured} onLogin={async u=>{setUser(u);await loadAll()}}/>

  const logout=async()=>{await supabase.auth.signOut();location.reload()}
  const title=nav.find(n=>n[0]===view)?.[1]||'Dashboard'

  return <div className="app-shell">
    <aside className={mobileNav?'sidebar open':'sidebar'}>
      <div className="brand"><img src="../assets/goudhaven-logo.png"/><div><b>GoudHaven</b><small>Control Center 2.0</small></div></div>
      <nav>{nav.map(([key,label,Icon])=><button key={key} className={view===key?'active':''} onClick={()=>{setView(key);setMobileNav(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer">
        <a href="../" target="_blank"><ChevronRight size={16}/>Wetboek bekijken</a>
        <button onClick={logout}><LogOut size={16}/>Uitloggen</button>
      </div>
    </aside>

    <div className="main">
      <header className="topbar">
        <button className="menu-button" onClick={()=>setMobileNav(v=>!v)}><Menu/></button>
        <div><span className="eyebrow">OFFICIEEL BEHEERPANEEL</span><h1>{title}</h1></div>
        <div className="top-actions">
          <span className="status-pill"><i/>Database online</span>
          <div className="user"><span>{user.email?.[0]?.toUpperCase()}</span><div><b>{user.email}</b><small>Beheerder</small></div></div>
        </div>
      </header>

      <main className="content">
        {view==='dashboard' && <Dashboard chapters={chapters} articles={articles} changes={changes} admins={admins} setView={setView}/>}
        {view==='articles' && <Articles supabase={supabase} user={user} chapters={chapters} articles={articles} reload={loadAll} notify={notify}/>}
        {view==='chapters' && <Chapters supabase={supabase} user={user} chapters={chapters} articles={articles} reload={loadAll} notify={notify}/>}
        {view==='changes' && <Changes changes={changes}/>}
        {view==='admins' && <Admins admins={admins}/>}
        {view==='settings' && <SettingsView articles={articles} chapters={chapters} user={user} reload={loadAll}/>}
      </main>
    </div>
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Dashboard({chapters,articles,changes,admins,setView}) {
  const published=articles.filter(a=>a.is_published).length
  const drafts=articles.length-published
  const recent=changes.slice(0,6)
  const counts=chapters.map(c=>({...c,count:articles.filter(a=>a.chapter_id===c.id).length}))
  const max=Math.max(1,...counts.map(c=>c.count))
  const days=useMemo(()=>{
    const result=[]
    for(let i=6;i>=0;i--){
      const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i)
      const next=new Date(d);next.setDate(next.getDate()+1)
      result.push({date:d,count:changes.filter(c=>new Date(c.created_at)>=d&&new Date(c.created_at)<next).length})
    }
    return result
  },[changes])
  const maxDay=Math.max(1,...days.map(d=>d.count))
  const severities=['normaal','middel','ernstig','zeer ernstig'].map(key=>({key,count:articles.filter(a=>(a.severity||'normaal')===key).length}))
  const total=Math.max(articles.length,1)
  let pos=0
  const colors={'normaal':'#8995a3','middel':'#e9b829','ernstig':'#ef8b3d','zeer ernstig':'#dc5b64'}
  const gradient=severities.map(s=>{const start=pos;pos+=s.count/total*100;return `${colors[s.key]} ${start}% ${pos}%`}).join(',')

  return <>
    <section className="hero">
      <div><span className="eyebrow">WELKOM TERUG</span><h2>GoudHaven Control Center</h2><p>Alles wat je nodig hebt om het wetboek professioneel te beheren.</p></div>
      <button className="primary" onClick={()=>setView('articles')}><Plus size={17}/>Nieuw artikel</button>
    </section>
    <section className="stats-grid">
      {[
        [BookOpen,'Artikelen',articles.length,'totaal'],
        [Archive,'Hoofdstukken',chapters.length,'structuur'],
        [Check,'Gepubliceerd',published,'online'],
        [Clock3,'Concepten',drafts,'niet zichtbaar'],
        [Users,'Beheerders',admins.length,'toegang']
      ].map(([Icon,label,value,sub])=><article key={label}><Icon/><div><small>{label}</small><strong>{value}</strong><em>{sub}</em></div></article>)}
    </section>
    <section className="quick-grid">
      <button onClick={()=>setView('articles')}><Plus/><div><b>Nieuw artikel</b><small>Direct toevoegen</small></div></button>
      <button onClick={()=>setView('articles')}><Search/><div><b>Artikelen zoeken</b><small>Zoeken en filteren</small></div></button>
      <button onClick={()=>setView('chapters')}><Archive/><div><b>Hoofdstukken</b><small>Indeling beheren</small></div></button>
      <button onClick={()=>exportCsv(articles,chapters)}><Download/><div><b>Gegevens exporteren</b><small>Download als CSV</small></div></button>
    </section>
    <section className="analytics-grid">
      <article className="panel">
        <div className="panel-head"><div><h3>Activiteit afgelopen 7 dagen</h3><small>{days.reduce((s,d)=>s+d.count,0)} wijzigingen</small></div><Activity/></div>
        <div className="bars">{days.map(d=><div className="bar-day" key={d.date}><b>{d.count}</b><div><i style={{height:`${Math.max(4,d.count/maxDay*100)}%`}}/></div><small>{d.date.toLocaleDateString('nl-NL',{weekday:'short'})}</small></div>)}</div>
      </article>
      <article className="panel">
        <div className="panel-head"><div><h3>Ernstverdeling</h3><small>Alle wetsartikelen</small></div><BarChart3/></div>
        <div className="donut-area"><div className="donut" style={{background:`conic-gradient(${gradient})`}}><span>{articles.length}</span></div><div className="legend">{severities.map(s=><div key={s.key}><i style={{background:colors[s.key]}}/><span>{s.key}</span><b>{s.count}</b></div>)}</div></div>
      </article>
    </section>
    <section className="two-grid">
      <article className="panel">
        <div className="panel-head"><h3>Recent gewijzigd</h3><button onClick={()=>setView('changes')}>Alles bekijken</button></div>
        <div className="list">{recent.map(c=><div key={c.id}><div><b>{c.title||c.action}</b><small>{c.entity_type} · {c.actor_email||'Beheerder'}</small></div><span>{fmt(c.created_at)}</span></div>)}</div>
      </article>
      <article className="panel">
        <div className="panel-head"><h3>Verdeling per hoofdstuk</h3><small>{counts.length} hoofdstukken</small></div>
        <div className="chapter-bars">{counts.map(c=><div key={c.id}><div><span>{c.icon||'▤'} {c.title}</span><b>{c.count}</b></div><i><em style={{width:`${c.count/max*100}%`}}/></i></div>)}</div>
      </article>
    </section>
  </>
}

function Articles({supabase,user,chapters,articles,reload,notify}) {
  const [query,setQuery]=useState('')
  const [chapter,setChapter]=useState('')
  const [status,setStatus]=useState('')
  const [severity,setSeverity]=useState('')
  const [sort,setSort]=useState('chapter')
  const [selected,setSelected]=useState(new Set())
  const [editor,setEditor]=useState(null)

  const list=useMemo(()=>{
    const order=new Map(chapters.map((c,i)=>[c.id,i]))
    return articles.filter(a=>{
      const hay=`${a.article_number} ${a.title} ${a.description||''} ${(a.tags||[]).join(' ')}`.toLowerCase()
      return (!query||hay.includes(query.toLowerCase()))&&(!chapter||a.chapter_id===chapter)&&(!status||(status==='published'?a.is_published:!a.is_published))&&(!severity||(a.severity||'normaal')===severity)
    }).sort((a,b)=>{
      if(sort==='newest')return new Date(b.updated_at)-new Date(a.updated_at)
      if(sort==='number')return String(a.article_number).localeCompare(String(b.article_number),'nl',{numeric:true})
      if(sort==='title')return String(a.title).localeCompare(String(b.title),'nl')
      return (order.get(a.chapter_id)-order.get(b.chapter_id))||((a.sort_order||0)-(b.sort_order||0))
    })
  },[articles,chapters,query,chapter,status,severity,sort])

  const toggleAll=checked=>setSelected(checked?new Set(list.map(a=>a.id)):new Set())
  const bulk=async action=>{
    if(!selected.size)return
    if(action==='delete'&&!confirm(`${selected.size} artikelen definitief verwijderen?`))return
    const ids=[...selected]
    const q=action==='delete'?supabase.from('articles').delete().in('id',ids):supabase.from('articles').update({is_published:action==='publish',updated_by:user.id}).in('id',ids)
    const {error}=await q
    if(error){alert(error.message);return}
    setSelected(new Set());notify('Wijziging opgeslagen');await reload()
  }

  return <>
    <div className="section-head"><div><h2>Artikelen</h2><p>Zoek, filter en beheer alle artikelen.</p></div><button className="primary" onClick={()=>setEditor({...blankArticle,chapter_id:chapters[0]?.id||''})}><Plus size={17}/>Nieuw artikel</button></div>
    <div className="filters">
      <label className="search"><Search/><input placeholder="Zoek op nummer, titel, tekst of trefwoord..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <select value={chapter} onChange={e=>setChapter(e.target.value)}><option value="">Alle hoofdstukken</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Alle statussen</option><option value="published">Gepubliceerd</option><option value="draft">Concept</option></select>
      <select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">Alle ernstniveaus</option><option>normaal</option><option>middel</option><option>ernstig</option><option>zeer ernstig</option></select>
      <select value={sort} onChange={e=>setSort(e.target.value)}><option value="chapter">Volgorde wetboek</option><option value="newest">Laatst gewijzigd</option><option value="number">Artikelnummer</option><option value="title">Titel A-Z</option></select>
    </div>
    {selected.size>0&&<div className="bulk"><b>{selected.size} geselecteerd</b><div><button onClick={()=>bulk('publish')}>Publiceren</button><button onClick={()=>bulk('draft')}>Naar concept</button><button className="danger-link" onClick={()=>bulk('delete')}>Verwijderen</button><button onClick={()=>setSelected(new Set())}>Wissen</button></div></div>}
    <div className="table-panel"><table><thead><tr><th><input type="checkbox" checked={list.length>0&&list.every(a=>selected.has(a.id))} onChange={e=>toggleAll(e.target.checked)}/></th><th>Artikel</th><th>Titel</th><th>Hoofdstuk</th><th>Ernst</th><th>Status</th><th>Gewijzigd</th><th/></tr></thead><tbody>
      {list.map(a=>{const c=chapters.find(x=>x.id===a.chapter_id);return <tr key={a.id}><td><input type="checkbox" checked={selected.has(a.id)} onChange={e=>{const next=new Set(selected);e.target.checked?next.add(a.id):next.delete(a.id);setSelected(next)}}/></td><td><b>{a.article_number}</b></td><td><b>{a.title}</b><small>{(a.tags||[]).slice(0,3).join(' · ')}</small></td><td>{c?.title||'—'}</td><td><span className={'severity '+String(a.severity||'normaal').replace(' ','-')}>{a.severity||'normaal'}</span></td><td><span className={a.is_published?'live':'draft'}>{a.is_published?'Gepubliceerd':'Concept'}</span></td><td>{fmt(a.updated_at)}</td><td><button className="icon-button" onClick={()=>setEditor(a)}><Edit3 size={16}/></button></td></tr>})}
    </tbody></table>{!list.length&&<div className="empty">Geen artikelen gevonden.</div>}</div>
    {editor&&<ArticleEditor article={editor} chapters={chapters} supabase={supabase} user={user} onClose={()=>setEditor(null)} reload={reload} notify={notify}/>}
  </>
}

function ArticleEditor({article,chapters,supabase,user,onClose,reload,notify}) {
  const [form,setForm]=useState({...blankArticle,...article,tags:article.tags||[]})
  const [tab,setTab]=useState('edit')
  const [versions,setVersions]=useState([])
  const [saving,setSaving]=useState(false)
  const draftKey='gh-react-draft-'+(form.id||'new')

  useEffect(()=>{
    if(form.id) supabase.from('article_versions').select('*').eq('article_id',form.id).order('created_at',{ascending:false}).limit(30).then(({data})=>setVersions(data||[]))
  },[form.id])

  useEffect(()=>{
    const t=setTimeout(()=>localStorage.setItem(draftKey,JSON.stringify(form)),500)
    return()=>clearTimeout(t)
  },[form])

  const set=(key,value)=>setForm(f=>({...f,[key]:value}))
  const save=async()=>{
    setSaving(true)
    const payload={chapter_id:form.chapter_id,article_number:form.article_number,title:form.title,description:form.description,jail:form.jail,fine:form.fine,points:form.points,seize:form.seize,severity:form.severity,sort_order:Number(form.sort_order)||0,tags:form.tags,is_published:form.is_published,updated_by:user.id}
    const {error}=form.id?await supabase.from('articles').update(payload).eq('id',form.id):await supabase.from('articles').insert(payload)
    setSaving(false)
    if(error){alert(error.message);return}
    localStorage.removeItem(draftKey);notify('Artikel opgeslagen');await reload();onClose()
  }
  const remove=async()=>{
    if(!form.id||!confirm('Dit artikel definitief verwijderen?'))return
    const {error}=await supabase.from('articles').delete().eq('id',form.id)
    if(error){alert(error.message);return}
    notify('Artikel verwijderd');await reload();onClose()
  }
  const duplicate=async()=>{
    const payload={...form,id:undefined,article_number:form.article_number+' kopie',title:form.title+' (kopie)',is_published:false,updated_by:user.id}
    delete payload.created_at;delete payload.updated_at
    const {error}=await supabase.from('articles').insert(payload)
    if(error){alert(error.message);return}
    notify('Artikel als concept gedupliceerd');await reload();onClose()
  }
  const restore=async v=>{
    if(!confirm('Deze eerdere versie herstellen?'))return
    const {error}=await supabase.from('articles').update({...v.snapshot,updated_by:user.id}).eq('id',form.id)
    if(error){alert(error.message);return}
    notify('Versie hersteld');await reload();onClose()
  }

  return <div className="modal-backdrop"><section className="editor-modal">
    <header><div><span className="eyebrow">PROFESSIONELE EDITOR</span><h2>{form.id?'Artikel bewerken':'Nieuw artikel'}</h2></div><button className="icon-button" onClick={onClose}><X/></button></header>
    <nav className="tabs"><button className={tab==='edit'?'active':''} onClick={()=>setTab('edit')}><Edit3/>Bewerken</button><button className={tab==='preview'?'active':''} onClick={()=>setTab('preview')}><FileText/>Live voorbeeld</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><History/>Geschiedenis</button></nav>
    <div className="editor-body">
      {tab==='edit'&&<div className="form-grid">
        <label>Hoofdstuk<select value={form.chapter_id} onChange={e=>set('chapter_id',e.target.value)}>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label>Artikelnummer<input value={form.article_number} onChange={e=>set('article_number',e.target.value)}/></label>
        <label className="wide">Titel<input value={form.title} onChange={e=>set('title',e.target.value)}/></label>
        <label className="wide">Omschrijving<textarea rows="7" value={form.description||''} onChange={e=>set('description',e.target.value)}/></label>
        <div className="field-group wide"><h3>Straf en maatregelen</h3><div className="form-grid">
          <label>Celstraf<input value={form.jail||''} onChange={e=>set('jail',e.target.value)}/></label>
          <label>Boete<input value={form.fine||''} onChange={e=>set('fine',e.target.value)}/></label>
          <label>Punten / maatregel<input value={form.points||''} onChange={e=>set('points',e.target.value)}/></label>
          <label>Inbeslagname<input value={form.seize||''} onChange={e=>set('seize',e.target.value)}/></label>
        </div></div>
        <label>Ernst<select value={form.severity||'normaal'} onChange={e=>set('severity',e.target.value)}><option>normaal</option><option>middel</option><option>ernstig</option><option>zeer ernstig</option></select></label>
        <label>Volgorde<input type="number" value={form.sort_order||0} onChange={e=>set('sort_order',e.target.value)}/></label>
        <label className="wide">Trefwoorden<input value={(form.tags||[]).join(', ')} onChange={e=>set('tags',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/></label>
        <label className="check wide"><input type="checkbox" checked={form.is_published!==false} onChange={e=>set('is_published',e.target.checked)}/> Direct publiceren</label>
      </div>}
      {tab==='preview'&&<div className="preview-card"><span>{chapters.find(c=>c.id===form.chapter_id)?.title||'Hoofdstuk'}</span><small>Artikel {form.article_number||'—'}</small><h2>{form.title||'Titel van het artikel'}</h2><p>{form.description||'De omschrijving verschijnt hier.'}</p><div className="penalties">{[['Celstraf',form.jail],['Boete',form.fine],['Maatregel',form.points],['Inbeslagname',form.seize]].map(([k,v])=><article key={k}><small>{k}</small><b>{v||'—'}</b></article>)}</div><div className="tag-list">{(form.tags||[]).map(t=><span key={t}>{t}</span>)}</div></div>}
      {tab==='history'&&<div className="history-list">{versions.length?versions.map((v,i)=><article key={v.id}><div><b>Versie {versions.length-i}</b><small>{v.actor_email||'Beheerder'} · {fmt(v.created_at)}</small></div><button onClick={()=>restore(v)}>Herstellen</button></article>):<div className="empty">Nog geen eerdere versies beschikbaar.</div>}</div>}
    </div>
    <footer><div>{form.id&&<><button onClick={duplicate}><Copy size={16}/>Dupliceren</button><button className="danger-link" onClick={remove}><Trash2 size={16}/>Verwijderen</button></>}</div><div><button onClick={onClose}>Annuleren</button><button className="primary" onClick={save} disabled={saving}><Save size={16}/>{saving?'Opslaan...':'Opslaan'}</button></div></footer>
  </section></div>
}

function Chapters({supabase,user,chapters,articles,reload,notify}) {
  const [editing,setEditing]=useState(null)
  const save=async()=>{
    if(!editing.title)return
    const payload={title:editing.title,icon:editing.icon||'▤',sort_order:Number(editing.sort_order)||0,updated_by:user.id}
    const {error}=editing.id?await supabase.from('chapters').update(payload).eq('id',editing.id):await supabase.from('chapters').insert(payload)
    if(error){alert(error.message);return}
    setEditing(null);notify('Hoofdstuk opgeslagen');await reload()
  }
  return <>
    <div className="section-head"><div><h2>Hoofdstukken</h2><p>Beheer de indeling en volgorde van het wetboek.</p></div><button className="primary" onClick={()=>setEditing({title:'',icon:'▤',sort_order:chapters.length})}><Plus/>Nieuw hoofdstuk</button></div>
    <div className="cards-list">{chapters.map(c=><article key={c.id}><div className="chapter-icon">{c.icon||'▤'}</div><div><b>{c.title}</b><small>{articles.filter(a=>a.chapter_id===c.id).length} artikelen · volgorde {c.sort_order}</small></div><button className="icon-button" onClick={()=>setEditing(c)}><Edit3/></button></article>)}</div>
    {editing&&<div className="modal-backdrop"><section className="small-modal"><header><h2>{editing.id?'Hoofdstuk bewerken':'Nieuw hoofdstuk'}</h2><button className="icon-button" onClick={()=>setEditing(null)}><X/></button></header><label>Titel<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label>Icoon<input value={editing.icon||''} onChange={e=>setEditing({...editing,icon:e.target.value})}/></label><label>Volgorde<input type="number" value={editing.sort_order||0} onChange={e=>setEditing({...editing,sort_order:e.target.value})}/></label><footer><button onClick={()=>setEditing(null)}>Annuleren</button><button className="primary" onClick={save}>Opslaan</button></footer></section></div>}
  </>
}

function Changes({changes}) {
  const [q,setQ]=useState('')
  const list=changes.filter(c=>`${c.title} ${c.action} ${c.actor_email} ${c.entity_type}`.toLowerCase().includes(q.toLowerCase()))
  return <><div className="section-head"><div><h2>Wijzigingen</h2><p>Volledig overzicht van recente beheersacties.</p></div></div><label className="search standalone"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Zoek in wijzigingen..."/></label><div className="timeline">{list.map(c=><article key={c.id}><span><History/></span><div><b>{c.title||c.action}</b><p>{c.action} · {c.entity_type}</p><small>{c.actor_email||'Beheerder'} · {new Date(c.created_at).toLocaleString('nl-NL')}</small></div></article>)}</div></>
}

function Admins({admins}) {
  return <><div className="section-head"><div><h2>Beheerders</h2><p>Accounts met toegang tot het Control Center.</p></div></div><div className="admin-grid">{admins.map(a=><article key={a.user_id||a.email}><span>{a.email?.[0]?.toUpperCase()}</span><div><b>{a.email}</b><small>Beheerder</small></div><Shield/></article>)}</div></>
}

function SettingsView({articles,chapters,user,reload}) {
  return <><div className="section-head"><div><h2>Instellingen</h2><p>Systeeminformatie en handige beheerfuncties.</p></div></div><div className="settings-grid"><article><Database/><div><b>Supabase-verbinding</b><small>Online en actief</small></div><span className="live">Verbonden</span></article><article><CircleUserRound/><div><b>Ingelogd account</b><small>{user.email}</small></div></article><article><Gauge/><div><b>Database-inhoud</b><small>{articles.length} artikelen en {chapters.length} hoofdstukken</small></div></article><article><RefreshCw/><div><b>Gegevens vernieuwen</b><small>Haal de nieuwste gegevens opnieuw op</small></div><button onClick={reload}>Vernieuwen</button></article></div></>
}

function exportCsv(articles,chapters){
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`
  const header=['Artikel','Titel','Hoofdstuk','Omschrijving','Celstraf','Boete','Maatregel','Inbeslagname','Ernst','Trefwoorden','Status']
  const rows=articles.map(a=>[a.article_number,a.title,chapters.find(c=>c.id===a.chapter_id)?.title||'',a.description,a.jail,a.fine,a.points,a.seize,a.severity,(a.tags||[]).join(', '),a.is_published?'Gepubliceerd':'Concept'])
  const csv='\ufeff'+[header,...rows].map(r=>r.map(esc).join(';')).join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download=`goudhaven-wetboek-${todayKey(new Date())}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)
}


const url = window.GH_SUPABASE_URL;
const key = window.GH_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(url && key && !String(key).startsWith('PLAK_'));
const supabaseClient = configured && window.supabase
  ? window.supabase.createClient(url, key)
  : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <App supabase={supabaseClient} configured={configured} />
);
