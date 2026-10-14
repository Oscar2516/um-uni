/* ===== Página Organización ===== */
const ORG_W = 1889, ORG_H = 2000;   // dimensiones de referencia de las zonas clicables
const GRP = {
  alta:     {t:'Alta dirección',        c:'#6b1414'},
  especial: {t:'Órganos especiales y de control', c:'#5a5d63'},
  organo:   {t:'Órganos y unidades',    c:'#ead9a6'},
  unidad:   {t:'Unidades dependientes', c:'#dcdce0'},
  desc:     {t:'Órganos desconcentrados', c:'#f4ecd6'}
};
const OI = {
  org:I.org, list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  book:'<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
  design:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.5 3 6"/>',
  docs:I.doc, bank:I.build, units:I.org, gear:I.gear
};

function guessResp(u){
  if(u.resp) return u.resp;
  if(/^Direcci[oó]n/i.test(u.name)) return 'Director(a)';
  if(/^Oficina/i.test(u.name)) return 'Jefe(a) de Oficina';
  if(/^(Unidad|Centro|Instituto)/i.test(u.name)) return 'Jefe(a) de Unidad';
  return '—';
}

async function renderOrg(){
  const A = Object.fromEntries(ORG.arts.map(a=>[a.n,a]));
  const U = ORG.units;
  U.forEach(u=>{ u.name = A[u.nat].t.replace(/\s*\(INICTEL\)$/,''); });
  const byId = Object.fromEntries(U.map(u=>[u.id,u]));
  const st = {view:'organigrama', sel:null, tab:'general', zoom:1};

  document.querySelector('.hero').style.display='none';
  $('#cards').style.display='none';
  document.querySelector('main').classList.add('wide');

  /* KPI: valores de la pestaña Resumen (org_*) o calculados del organigrama */
  const res = await loadResumen();
  const rv = k => { const r=res.find(x=>norm(x.clave)===k); return r&&r.cifra!==''?r.cifra:null; };
  const nOrg = U.filter(u=>/^[ÓO]rgano/.test(u.tipo)).length;
  let nProc = rv('org_procesos');
  if(nProc==null){ try{ nProc=(await sheet(CFG.tabs.procesos)).rows.length }catch(e){ nProc='—' } }
  const kp = [
    ['Órganos', rv('org_organos') ?? nOrg, OI.bank],
    ['Unidades', rv('org_unidades') ?? (U.length-nOrg), OI.units],
    ['Procesos relacionados', nProc, OI.gear],
    ['Puestos (MCC)', rv('org_puestos') ?? '—', OI.people]
  ];

  const views = [
    ['organigrama','Organigrama',OI.org],
    ['unidades','Órganos y unidades',OI.list],
    ['rof','ROF',OI.book],
    ['diseno','Diseño organizacional',OI.design],
    ['cargos','Cargos y puestos',OI.people],
    ['docs','Documentos relacionados',OI.docs]
  ];

  $('#inner').innerHTML = `
  <div class="org">
    <aside class="side">
      <div class="sh">${svgIcon(OI.org)}Organización</div>
      ${views.map(v=>`<button data-v="${v[0]}">${svgIcon(v[2])}${v[1]}</button>`).join('')}
    </aside>
    <section>
      <div class="ohead">
        <div><h1>ORGANIZACIÓN UNI</h1><p>La estructura que permite que la Universidad funcione</p></div>
        <div class="kpis">${kp.map(k=>`<div class="kpi2">${svgIcon(k[2])}<div><small>${k[0]}</small><b>${esc(k[1])}</b></div></div>`).join('')}</div>
      </div>
      <div id="view"></div>
    </section>
  </div>`;

  document.querySelectorAll('.side [data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
  function setView(v){
    st.view=v;
    document.querySelectorAll('.side [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
    ({organigrama:viewChart,unidades:viewUnits,rof:viewRof,docs:viewDocs}[v]||(()=>viewSoon(v)))();
  }

  /* ---------- Organigrama ---------- */
  function viewChart(){
    $('#view').innerHTML = `<div class="chartgrid">
      <div class="chartbox" id="cbox">
        <div class="ctools">
          <h2>Organigrama UNI</h2><span class="tag">Propuesto 2026</span>
          <div class="srch"><input id="os" type="search" placeholder="Buscar órgano o unidad…" autocomplete="off"><ul id="osr"></ul></div>
          <button class="btn" id="bFit">Ajustar</button>
          <button class="btn" id="bFull" title="Pantalla completa">⛶</button>
        </div>
        <div class="zoom"><button id="zi" aria-label="Acercar">+</button><button id="zo" aria-label="Alejar">−</button></div>
        <div class="vp" id="vp"><div class="stage" id="stage" style="width:${st.zoom*100}%">
          <img src="${esc(CFG.orgImage||'img/organigrama.jpg')}" alt="Organigrama UNI" draggable="false">
          ${U.map(u=>{const b=u.box;return `<button class="hs" data-id="${u.id}" title="${esc(u.name)}" aria-label="${esc(u.name)}" style="left:${b[0]/ORG_W*100}%;top:${b[1]/ORG_H*100}%;width:${(b[2]-b[0])/ORG_W*100}%;height:${(b[3]-b[1])/ORG_H*100}%"></button>`}).join('')}
        </div></div>
        <div class="legend">${Object.values(GRP).map(g=>`<span><i style="background:${g.c}"></i>${g.t}</span>`).join('')}</div>
      </div>
      <aside class="detail" id="detail"></aside>
    </div>`;
    const vp=$('#vp'), stage=$('#stage');

    stage.querySelectorAll('.hs').forEach(h=>h.onclick=()=>{ if(!vp._moved) select(h.dataset.id); });
    let sx,sy,sl,sT,down=false;
    vp.addEventListener('mousedown',e=>{down=true;vp._moved=false;sx=e.clientX;sy=e.clientY;sl=vp.scrollLeft;sT=vp.scrollTop});
    window.addEventListener('mouseup',()=>{down=false;vp.classList.remove('drag');setTimeout(()=>vp._moved=false,0)});
    window.addEventListener('mousemove',e=>{
      if(!down||!document.body.contains(vp)) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      if(Math.abs(dx)+Math.abs(dy)>5){ vp._moved=true; vp.classList.add('drag'); }
      if(vp._moved){ vp.scrollLeft=sl-dx; vp.scrollTop=sT-dy; }
    });

    const setZoom=z=>{ st.zoom=Math.max(1,Math.min(4,z)); stage.style.width=st.zoom*100+'%'; };
    $('#zi').onclick=()=>setZoom(st.zoom+.5);
    $('#zo').onclick=()=>setZoom(st.zoom-.5);
    $('#bFit').onclick=()=>{ setZoom(1); vp.scrollTo({left:0,top:0}); };
    $('#bFull').onclick=()=>{ const b=$('#cbox'); try{ document.fullscreenElement?document.exitFullscreen():b.requestFullscreen() }catch(e){ toast('Pantalla completa no disponible en este entorno.') } };

    const os=$('#os'), osr=$('#osr');
    os.oninput=()=>{
      const q=norm(os.value.trim());
      if(q.length<1){ osr.classList.remove('on'); return; }
      const m=U.filter(u=>norm(u.name+' '+u.sig).includes(q)).slice(0,10);
      osr.innerHTML=m.length?m.map(u=>`<li data-id="${u.id}">${esc(u.name)}<small>${esc(u.sig)}</small></li>`).join(''):'<li>Sin resultados</li>';
      osr.classList.add('on');
    };
    osr.onclick=e=>{ const li=e.target.closest('li[data-id]'); if(!li) return; osr.classList.remove('on'); os.value=''; setZoom(Math.max(st.zoom,2)); select(li.dataset.id,true); };
    document.addEventListener('click',e=>{ if(!e.target.closest('.srch')) osr.classList.remove('on'); });

    renderDetail();
    if(st.sel) markSel(true);
  }

  function markSel(scroll){
    const stage=$('#stage'); if(!stage) return;
    stage.querySelectorAll('.hs').forEach(h=>h.classList.toggle('sel',h.dataset.id===st.sel));
    const h=stage.querySelector('.hs.sel'), vp=$('#vp');
    if(h&&scroll) setTimeout(()=>vp.scrollTo({left:h.offsetLeft+h.offsetWidth/2-vp.clientWidth/2, top:h.offsetTop+h.offsetHeight/2-vp.clientHeight/2, behavior:'smooth'}), 230);
  }
  function select(id,scroll){
    st.sel=id; st.tab='general';
    if(st.view!=='organigrama'){ setView('organigrama'); return; }
    markSel(scroll); renderDetail();
    try{ history.replaceState(null,'','#'+id) }catch(e){}
  }

  /* ---------- Detalle ---------- */
  function para(lines){
    if(!lines.length) return '';
    const [first,...rest]=lines;
    const bl=[]; let out=`<p>${esc(first)}</p>`;
    rest.forEach(l=>{ if(/:\s*$/.test(l)||l.length>110){ if(bl.length){out+='<ul>'+bl.splice(0).map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>'} out+=`<p>${esc(l)}</p>` } else bl.push(l) });
    if(bl.length) out+='<ul>'+bl.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
    return out;
  }
  const artTitle = a => `Artículo ${a.n}.º – ${esc(a.t)}`;
  function funcs(a){
    let b=a.b.slice(), intro='';
    if(b.length && (/:\s*$/.test(b[0])||/^Considerando/.test(b[0]))) intro=`<p>${esc(b.shift())}</p>`;
    const L=i=>i<26?String.fromCharCode(97+i):String.fromCharCode(97+Math.floor(i/26)-1)+String.fromCharCode(97+i%26);
    return intro+`<ul class="fl">${b.map((x,i)=>`<li><span class="k">${L(i)}</span><span>${esc(x)}</span></li>`).join('')}</ul>`;
  }
  const kids = id => U.filter(x=>x.parent===id);
  function tbl(head,rows){
    return `<div class="tw"><table class="mt"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${head.map((_,i)=>`<td>${linkify(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  async function related(tab,u){
    const t=await sheet(CFG.tabs[tab]);
    const esr=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), L='A-Za-zÁÉÍÓÚÑáéíóúñ';
    const re=u.sig.length>=3?new RegExp(`(^|[^${L}])${esr(u.sig)}($|[^${L}])`,'i'):null;
    const nn=norm(u.name);
    return {head:t.head, rows:t.rows.filter(r=>{const j=r.join(' | '); return (re&&re.test(j))||norm(j).includes(nn)})};
  }

  function renderDetail(){
    const d=$('#detail'); if(!d) return;
    const u=byId[st.sel];
    if(!u){
      d.innerHTML=`<div class="dh"><h3>DETALLE DE LA UNIDAD</h3></div><div class="dempty">Haz clic en cualquier órgano o unidad del organigrama para ver su información general, funciones y unidades a su cargo.</div>`;
      return;
    }
    const tabs=[['general','Información general'],['funciones','Funciones'],['unidades','Unidades a su cargo'],['procesos','Procesos'],['normativa','Normativa']];
    d.innerHTML=`<div class="dh"><h3>${esc(u.name.toUpperCase())}</h3><button id="dx" aria-label="Cerrar">✕</button></div>
      <div class="tabs">${tabs.map(t=>`<button data-t="${t[0]}" class="${t[0]===st.tab?'on':''}">${t[1]}</button>`).join('')}</div>
      <div class="db" id="db"></div>`;
    $('#dx').onclick=()=>{ st.sel=null; markSel(); renderDetail(); };
    d.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ st.tab=b.dataset.t; renderDetail(); });
    tab(u);
  }
  async function tab(u){
    const db=$('#db'), nat=A[u.nat], fn=A[u.fn], ex=u.extra?A[u.extra]:null;
    if(st.tab==='general'){
      db.innerHTML=`
        <div class="ucard"><span class="ico">${svgIcon(OI.bank)}</span><b>${esc(u.name.toUpperCase())}</b><span class="pill">Propuesta 2026</span></div>
        <table class="kv">
          <tr><td>Siglas</td><td>${esc(u.sig)}</td></tr>
          <tr><td>Dependencia</td><td>${esc(u.dep)}</td></tr>
          <tr><td>Base legal</td><td>ROF UNI (2026) – Artículo ${nat.n}.º</td></tr>
          <tr><td>Tipo de órgano</td><td>${esc(u.tipo)}</td></tr>
          <tr><td>Responsable</td><td>${esc(guessResp(u))}</td></tr>
        </table>
        <h4>${artTitle(nat)}</h4>
        <div class="nat">${para(nat.b)}</div>
        ${ex?`<h4>${artTitle(ex)}</h4><div class="nat">${para(ex.b)}</div>`:''}`;
    }else if(st.tab==='funciones'){
      db.innerHTML=`<h4>${artTitle(fn)}</h4>${funcs(fn)}`;
    }else if(st.tab==='unidades'){
      const k=kids(u.id);
      db.innerHTML = k.length
        ? `<ul class="ulist">${k.map(c=>`<li data-id="${c.id}"><span>${esc(c.name)}</span><small>${esc(c.sig)}</small></li>`).join('')}</ul>`
        : '<div class="empty">Esta unidad no tiene unidades a su cargo en el organigrama.</div>';
      if(ex&&!k.length) db.innerHTML+=`<h4>${artTitle(ex)}</h4><div class="nat">${para(ex.b)}</div>`;
      db.querySelectorAll('li[data-id]').forEach(li=>li.onclick=()=>select(li.dataset.id,true));
    }else{
      const tabName = st.tab==='procesos'?'procesos':'normativa';
      let html = st.tab==='normativa' ? `<p><b>Base legal de la estructura:</b> Reglamento de Organización y Funciones (ROF) UNI 2026 – Artículos ${nat.n}.º y ${fn.n}.º.</p>` : '';
      db.innerHTML = html+'<div class="empty">Cargando…</div>';
      try{
        const r=await related(tabName,u);
        if(!document.body.contains(db)||st.tab!==tabName) return;
        db.innerHTML = html+(r.rows.length?tbl(r.head,r.rows):`<div class="empty">No hay ${tabName} asociados a esta unidad en el Google Sheets. Para vincularlos, incluye la sigla «${esc(u.sig)}» o el nombre de la unidad en alguna columna de la pestaña «${esc(CFG.tabs[tabName])}».</div>`);
      }catch(e){
        db.innerHTML = html+'<div class="empty">No se pudo leer la pestaña «'+esc(CFG.tabs[tabName])+'» del Google Sheets.</div>';
      }
    }
  }

  /* ---------- Otras vistas ---------- */
  function viewUnits(){
    $('#view').innerHTML=`<div class="panel"><div class="tools"><input type="search" id="uf" placeholder="Filtrar órganos y unidades…"><span id="uc"></span></div>
      <div class="tw"><table><thead><tr><th>Siglas</th><th>Nombre</th><th>Tipo</th><th>Dependencia</th></tr></thead>
      <tbody id="ub">${U.map(u=>`<tr data-id="${u.id}" style="cursor:pointer"><td><b>${esc(u.sig)}</b></td><td>${esc(u.name)}</td><td>${esc(u.tipo)}</td><td>${esc(u.dep)}</td></tr>`).join('')}</tbody></table></div></div>`;
    const cnt=()=>$('#uc').textContent=[...$('#ub').rows].filter(r=>!r.hidden).length+' registros'; cnt();
    $('#uf').oninput=e=>{const q=norm(e.target.value);[...$('#ub').rows].forEach(r=>r.hidden=q&&!norm(r.textContent).includes(q));cnt()};
    $('#ub').onclick=e=>{const tr=e.target.closest('tr[data-id]'); if(tr) select(tr.dataset.id,true)};
  }
  function viewRof(){
    const arts=ORG.arts;
    $('#view').innerHTML=`<div class="panel"><div class="tools"><input type="search" id="rf" placeholder="Buscar en el ROF (artículo, unidad, función)…"><span id="rc"></span></div>
      <div class="rofs" id="rl">${arts.map(a=>`<details data-s="${esc(norm(a.t+' '+a.b.join(' ')))}"><summary>Artículo ${a.n}.º – ${esc(a.t)}</summary>${para(a.b)}</details>`).join('')}</div></div>`;
    const cnt=()=>$('#rc').textContent=[...document.querySelectorAll('#rl details')].filter(d=>!d.hidden).length+' artículos'; cnt();
    $('#rf').oninput=e=>{const q=norm(e.target.value);document.querySelectorAll('#rl details').forEach(d=>d.hidden=q&&!d.dataset.s.includes(q));cnt()};
  }
  async function viewDocs(){
    $('#view').innerHTML='<div class="panel"><div class="empty">Cargando…</div></div>';
    try{
      const t=await sheet(CFG.tabs.organizacion);
      $('#view').innerHTML = t.rows.length ? `<div class="panel">${tbl(t.head,t.rows)}</div>` : '<div class="panel"><div class="empty">La pestaña «'+esc(CFG.tabs.organizacion)+'» no tiene registros todavía.</div></div>';
    }catch(e){
      $('#view').innerHTML='<div class="panel"><div class="note">Aún no hay documentos relacionados: agrega filas en la pestaña «'+esc(CFG.tabs.organizacion)+'» del Google Sheets.</div></div>';
    }
  }
  function viewSoon(v){
    const n=(views.find(x=>x[0]===v)||[])[1]||'';
    $('#view').innerHTML=`<div class="panel"><h2 style="margin-top:0">${esc(n)}</h2><div class="empty">Contenido en preparación.</div></div>`;
  }

  setView('organigrama');
  const h=(location.hash||'').slice(1);
  if(h && byId[h]) select(h,true);
}
