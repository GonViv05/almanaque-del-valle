// Buscador global: objetos, aldeanos (y dónde están a la hora elegida), recetas y festivales.
// "/" o Ctrl+K lo enfocan; flechas para moverse, Enter abre la ficha, Escape cierra.
let INDICE = null;
function indice() {
  if (INDICE) return INDICE;
  const out = [], vistos = new Set();
  for (const v of D.villagers) out.push({ k: 'npc', id: v.id, n: v.name });
  for (const r of D.recipes) if (r.big) out.push({ k: 'rec', id: r.key, n: r.name });
  for (const [id, o] of Object.entries(D.objects)) { if (!o.n || o.x || vistos.has(o.n)) continue; vistos.add(o.n); out.push({ k: 'obj', id, n: o.n }); }
  for (const [id, o] of Object.entries(D.items || {})) { const key = o.k + o.n; if (o.x || vistos.has(key) || (o.k === 'BC' && D.recipes.some(r => r.big && r.name === o.n))) continue; vistos.add(key); out.push({ k: 'obj', id, n: o.n }); }
  for (const f of D.festivals) out.push({ k: 'fest', id: f.id, n: f.name });
  for (const x of out) x.q = norm(x.n);
  return (INDICE = out);
}
const PRI = { npc: 0, fest: 1, rec: 2, obj: 2 };
function buscar(q) {
  q = norm(q.trim()); if (!q) return [];
  return indice().map(x => { const i = x.q.indexOf(q); return i < 0 ? null : { x, sc: x.q === q ? 0 : i === 0 ? 1 : /[\s(-]/.test(x.q[i - 1]) ? 2 : 3 }; }).filter(Boolean)
    .sort((a, b) => a.sc - b.sc || PRI[a.x.k] - PRI[b.x.k] || a.x.n.length - b.x.n.length || a.x.n.localeCompare(b.x.n)).slice(0, 10).map(r => r.x);
}
const diasFest = f => T('{d} de {s}', { d: `${f.d[0]}${f.d.length > 1 ? `–${f.d.at(-1)}` : ''}`, s: lc(SEASONS[f.s]) });
function resultado(x, i) {
  let ic = '', sub = '', k = '';
  if (x.k === 'npc') { const v = vil(x.id), { sch } = agendaDel(v, state.season, state.day); ic = face(v, 40); k = T('Aldeano'); const fe = festivalesDel(state.season, state.day).find(f => !f.passive);
    sub = fe && sch ? T('Ese día va a {f}', { f: fe.name }) : sch ? T('A las {h}: {l}', { h: hora(state.hora), l: dondeA(v, sch, state.hora).loc || T('en su casa') }) : T('Siempre en {l}', { l: v.home || T('el mismo lugar') }); }
  if (x.k === 'obj') { const o = obj(x.id); ic = itemSpr(x.id, 2); k = o.g || o.cn || T('Objeto'); sub = D.recipes.some(r => !r.big && r.id === x.id) ? T('Tiene receta') : ''; }
  if (x.k === 'rec') { const r = D.recipes.find(r => r.key === x.id); ic = recSpr(r, 2); k = T('Fabricación'); sub = sabida(r) === false ? T('Sin aprender') : ''; }
  if (x.k === 'fest') { const f = D.festivals.find(f => f.id === x.id); ic = `<i class="ui" style="width:20px;height:20px;background-image:url(assets/ui/star.png)"></i>`; k = T('Festival'); sub = diasFest(f); }
  return `<li role="option" id="bres-${i}" data-i="${i}" aria-selected="false">${ic}<span>${esc(x.n)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span><span class="k">${esc(k)}</span></li>`;
}

$('#buscar').innerHTML = `<label class="sr" for="bq">${T('Buscar en el almanaque')}</label><input class="input" id="bq" type="search" placeholder="${T('Buscar objeto, aldeano, receta… ( / )')}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="bres" aria-autocomplete="list"><ul id="bres" role="listbox" aria-label="${T('Resultados')}" hidden></ul>`;
const bq = $('#bq'), bres = $('#bres');
let bLista = [], bAct = -1;
function pintarResultados() {
  bLista = buscar(bq.value); bAct = bLista.length ? 0 : -1;
  bres.innerHTML = bLista.length ? bLista.map(resultado).join('') : (bq.value.trim() ? `<li class="vacio" aria-disabled="true">${T('Nada coincide con la búsqueda.')}</li>` : '');
  bres.hidden = !bq.value.trim(); bq.setAttribute('aria-expanded', String(!bres.hidden)); marcar();
}
function marcar() {
  $$('li[data-i]', bres).forEach(li => li.setAttribute('aria-selected', String(Number(li.dataset.i) === bAct)));
  const li = $(`#bres-${bAct}`); if (li) { bq.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } else bq.removeAttribute('aria-activedescendant');
}
function cerrarResultados() { bres.hidden = true; bq.setAttribute('aria-expanded', 'false'); }
bq.addEventListener('input', pintarResultados);
bq.addEventListener('focus', () => { if (bq.value.trim()) pintarResultados(); });
bq.addEventListener('blur', () => setTimeout(cerrarResultados, 150));
bq.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && bLista.length) { e.preventDefault(); bAct = (bAct + 1) % bLista.length; marcar(); }
  else if (e.key === 'ArrowUp' && bLista.length) { e.preventDefault(); bAct = (bAct - 1 + bLista.length) % bLista.length; marcar(); }
  else if (e.key === 'Enter' && bAct >= 0) { e.preventDefault(); abrirResultado(bLista[bAct]); }
  else if (e.key === 'Escape') { e.stopPropagation(); if (!bres.hidden) cerrarResultados(); else { bq.value = ''; bq.blur(); } }
});
bres.addEventListener('mousedown', e => e.preventDefault());  // que el clic no le saque el foco al campo antes de elegir
bres.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) abrirResultado(bLista[Number(li.dataset.i)]); });
document.addEventListener('keydown', e => {
  const escribiendo = e.target.closest?.('input, textarea, [contenteditable]');
  if ((e.key === '/' && !escribiendo) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); cerrarFicha(); bq.focus(); bq.select(); }
});
function abrirResultado(x) {
  if (!x) return;
  cerrarResultados(); bq.blur();
  if (x.k === 'npc') fichaAldeano(x.id);
  else if (x.k === 'obj') fichaObjeto(x.id);
  else if (x.k === 'rec') irAReceta(x.id);
  else if (x.k === 'fest') { const f = D.festivals.find(f => f.id === x.id); abrirCalendario(f.s, state.year, f.d[0]); }
}

// ---------- ficha flotante
const velo = $('#velo'), ficha = $('#ficha');
let fichaPrev = null;
function abrirFicha(html) {
  if (velo.hidden) fichaPrev = document.activeElement;
  hideTip(); if (!calpop.hidden) { calVista.vuelta = null; cerrarCal(false); }
  ficha.innerHTML = `<button type="button" class="cerrar" data-cerrar aria-label="${T('Cerrar')}">${ui('cancel', 44, 44)}</button>${html}`;
  velo.hidden = false; ficha.scrollTop = 0; ficha.focus();
}
function cerrarFicha() {
  if (velo.hidden) return;
  velo.hidden = true; ficha.innerHTML = ''; hideTip();
  if (fichaPrev?.isConnected) fichaPrev.focus(); fichaPrev = null;
}
function irATab(k) { cerrarFicha(); state.tab = k; save(); renderTabs(); render(); scrollTo(0, 0); $('#view').focus(); }
function irAReceta(key) {
  const r = D.recipes.find(x => x.key === key); if (!r) return;
  const bloq = sabida(r) === false;
  if (r.cook) state._coc = Object.assign({ season: null }, state._coc, { sel: key, q: '', locked: (state._coc?.locked) || bloq });
  else state._craft = Object.assign({}, state._craft, { sel: key, q: '', can: false, locked: (state._craft?.locked) || bloq });
  irATab(r.cook ? 'cocina' : 'crafteo');
}
velo.addEventListener('click', e => {
  if (e.target === velo || e.target.closest('[data-cerrar]')) return cerrarFicha();
  accionFicha(e);
});
// Botones de las fichas (de la ventana flotante o del panel de Objetos) que llevan a otra pestaña o ficha.
function accionFicha(e) {
  const m = e.target.closest('[data-ir-maq]'); if (m) { state._art = Object.assign({ q: '' }, state._art, { sel: 'm:' + m.dataset.irMaq }); irATab('artesanales'); return true; }
  const r = e.target.closest('[data-ir-receta]'); if (r) { irAReceta(r.dataset.irReceta); return true; }
  const n = e.target.closest('[data-ficha-npc]'); if (n) { fichaAldeano(n.dataset.fichaNpc); return true; }
  const a = e.target.closest('[data-ir-aldeano]'); if (a) { state._vil = Object.assign({ taste: 'love', q: '', birth: false }, state._vil, { sel: a.dataset.irAldeano, sched: null, q: '' }); irATab('aldeanos'); return true; }
  const p = e.target.closest('[data-ir-pez]'); if (p) { state._fish = Object.assign({ trap: true }, state._fish, { sel: p.dataset.irPez, season: 'all', weather: 'any', hour: 'any', loc: 'all', q: '', hide: false }); irATab('peces'); return true; }
  const c = e.target.closest('[data-ir-cultivo]'); if (c) { state.calc = Object.assign({}, state.calc, { crop: c.dataset.irCultivo }); irATab('cultivos'); return true; }
  const ar = e.target.closest('[data-ir-art]'); if (ar) { state._art = Object.assign({ q: '' }, state._art, { sel: 'i:' + ar.dataset.irArt }); irATab('artesanales'); return true; }
  const k = e.target.closest('[data-ir-cal]'); if (k) { const id = k.dataset.irCal; cerrarFicha(); abrirCalendario(state.season, state.year, state.day, id ? () => fichaAldeano(id) : null); return true; }
  return false;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !velo.hidden && !e.target.closest?.('.dd')) cerrarFicha(); });
// Que Tab no se escape de la ficha mientras está abierta.
velo.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const f = $$('button, input, [tabindex="0"]', ficha).filter(x => !x.disabled && x.offsetParent); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
  else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
});

// ---------- ficha de aldeano: dónde está el día elegido en el almanaque, a la hora que elijas
const aMin = t => (Math.floor(t / 100) - 6) * 60 + t % 100, aHora = m => (6 + Math.floor(m / 60)) * 100 + m % 60;
function fichaAldeano(id) {
  const v = vil(id); if (!v) return;
  const fecha = T('{dow} {d} de {s}, año {y}', { dow: lc(DOW[(state.day - 1) % 7]), d: state.day, s: lc(SEASONS[state.season]), y: state.year });
  const ama = (v.personal.love.length ? v.personal.love : v.gift.love).slice(0, 8);
  abrirFicha(`<div class="vcard">${face(v, 128)}<div><h2 id="ficha-t">${esc(v.name)}</h2>
      <p>${T('Cumpleaños: {d} de {s}', { d: v.bd, s: SEASONS[v.bs] })} ${seasonIcon(v.bs, 2)}</p><p>${T('Vive en: {l}', { l: esc(v.home || '—') })}</p>
      ${partida()?.amistad?.[v.id] ? `<p>${ui('heart', 21, 18)} ${corazones(v.id)} ${corazones(v.id) === 1 ? T('corazón') : T('corazones')}</p>` : ''}</div></div>
    <h3>${T('Dónde está el {f}', { f: esc(fecha) })} <button type="button" class="btn mini" data-ir-cal="${esc(v.id)}">${T('Cambiar día')}</button></h3>
    ${v.sched.length ? `<label class="field"><span>${T('Hora:')} <span id="hlabel">${hora(state.hora)}</span></span><input type="range" id="hrange" min="0" max="1200" step="10" value="${aMin(state.hora)}" aria-label="${T('Hora del día')}" aria-valuetext="${hora(state.hora)}"></label>` : ''}
    <div id="hres" aria-live="polite"></div>
    <h3>${T('Le encanta')}</h3><div class="grid">${ama.map(i => slot(i)).join('')}</div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn" data-ir-aldeano="${esc(v.id)}">${T('Ver regalos y agenda completa')}</button></div>`);
  dibujaDonde(v);
  $('#hrange', ficha)?.addEventListener('input', e => {
    state.hora = aHora(Number(e.target.value)); save();
    $('#hlabel', ficha).textContent = hora(state.hora); e.target.setAttribute('aria-valuetext', hora(state.hora)); dibujaDonde(v);
  });
}
function dibujaDonde(v) {
  const box = $('#hres', ficha), t = state.hora, { sch, rain } = agendaDel(v, state.season, state.day);
  const fest = festivalesDel(state.season, state.day).filter(f => !f.passive);
  const aviso = fest.map(f => `<p class="small tag">${T('Ese día es {f}: durante el festival los aldeanos van ahí y no siguen esta agenda.', { f: esc(f.name) })}</p>`).join('');
  if (!sch) { box.innerHTML = `${aviso}<p class="donde">${esc(v.home || T('Siempre en el mismo lugar'))}</p><p class="small muted">${T('No tiene agenda de movimientos: siempre está en el mismo lugar.')}</p>`; return; }
  const w = dondeA(v, sch, t), H = corazones(v.id);
  let wr = rain && rain !== sch ? dondeA(v, rain, t) : null;
  if (wr && wr.loc === w.loc) wr = null;  // con lluvia estaría en el mismo lugar
  const casa = !w.loc || w.loc === v.home;
  const cuando = w.desde == null ? T('Todavía no salió de su casa.') : T(w.bed ? 'A las {h} se fue a dormir.' : casa ? 'Desde las {h} está en su casa o volviendo.' : 'A las {h} salió hacia ahí; puede estar todavía en camino.', { h: hora(w.desde) });
  box.innerHTML = `${aviso}<p class="donde">${esc(w.loc || T('En su casa'))}</p><p class="small muted">${cuando}</p>
    ${wr ? `<p class="small">${T('Si llueve: {l}', { l: esc(wr.loc || T('en su casa')) })}${wr.desde != null ? T(' (desde las {h})', { h: hora(wr.desde) }) : ''}</p>` : ''}
    <details><summary class="small muted">${T('Agenda de ese día ({l})', { l: esc(sch.label) })}</summary><div class="tline small" style="margin-top:6px">${sch.rows.map(r => { const now = r.t === w.desde ? ' class="now"' : ''; return `<span${now}>${hora(r.t)}</span><span${now}>${esc(r.loc || '—')}${r.bed ? T(' (a dormir)') : ''}</span>`; }).join('')}</div></details>
    <p class="small muted">${T('Elegida como lo hace el juego: por fecha, día de la semana{h}. Los eventos y las misiones pueden cambiarla.', { h: H ? T(' y tus {n} corazones', { n: H }) : '' })}</p>`;
}

// ---------- ficha de objeto
function usaIngrediente(r, id, o) { return r.ing.some(([i]) => i === id || (i === '-777' ? WILD_SEEDS.includes(id) : /^-\d+$/.test(i) && Number(i) === o.c)); }
const GUSTO = [['love', T('Le encanta a')], ['like', T('Le gusta a')], ['dislike', T('No le gusta a')], ['hate', T('Lo odia')]];
const caras = vs => `<div class="grid">${vs.map(v => `<button type="button" class="slot" data-ficha-npc="${esc(v.id)}" data-tip="t:${esc(v.name)}" aria-label="${esc(v.name)}">${face(v, 48)}</button>`).join('')}</div>`;
const conCalidad = c => [-75, -79, -80, -81, -4, -5, -6, -18, -14].includes(c);
// Lo que muestra el juego al pasar el mouse por un arma o un calzado; lo demás, tal como viene en Data/Weapons.
function stats(o) {
  const l = [];
  if (o.k === 'W' && o.wt !== 4) {
    l.push(T('Daño {a}-{b}', { a: o.dmg[0], b: o.dmg[1] }));
    const v = o.wt === 2 ? o.spd + 8 : o.spd;
    if (o.spd !== (o.wt === 2 ? -8 : 0)) l.push(T('Velocidad {v}', { v: `${v > 0 ? '+' : ''}${Math.trunc(v / 2)}` }));
    if (o.df) l.push(T('Defensa +{n}', { n: o.df })); if (o.pr) l.push(T('Precisión +{n}', { n: o.pr })); if (o.aoe) l.push(T('Alcance +{n}', { n: o.aoe }));
    l.push(T('Probabilidad de golpe crítico: {n} %', { n: dec(Math.round(o.cc * 1000) / 10) }), T('Daño crítico: ×{n}', { n: dec(o.cm) }), T('Empuje: {n}', { n: dec(o.kb) }));
  }
  if (o.k === 'B') l.push(T('Defensa +{n}', { n: o.df }), T('Inmunidad +{n}', { n: o.im }));
  if (o.dye) l.push(T('Se puede teñir.'));
  if (o.forja) l.push(T('Se puede reforjar en el {a}.', { a: esc(D.names.anvil) }));
  return l.length ? `<h3>${T('Características')}</h3>${l.map(x => `<p class="small">${x}</p>`).join('')}` : '';
}
// Ficha de cualquier ítem: arriba lo que es, después de dónde sale, para qué sirve y a quién regalarlo.
function fichaHtml(id, enPanel) {
  const o = obj(id); if (!o) return '';
  const esO = esObjeto(id), hay = esO && !!partida()?.inventario;
  const rec = D.recipes.find(r => (r.big ? '(BC)' + r.id : r.id) === id && !(r.big && !id.startsWith('(BC)')));
  const usos = esO ? D.recipes.filter(r => usaIngrediente(r, id, o)) : [];
  const lotes = bundleUse[id], fish = esO && D.fish.find(f => f.id === id), crop = esO && D.crops.find(c => c.item === id), art = esO && opciones(id).length > 0;
  const maq = id.startsWith('(BC)') && D.artisan.find(a => '(BC)' + a.id === id);
  const comer = esO && o.e !== -300 && o.e !== 0 ? Math.ceil(o.e * 2.5) : null;
  const gustos = esO ? GUSTO.map(([k, t]) => [t, D.villagers.filter(v => v.gift[k].includes(id))]).filter(([, vs]) => vs.length) : [];
  const q = esO && o.p > 0 && conCalidad(o.c);
  return `<div class="item-row"><span class="slot">${itemSpr(id, 3)}</span><div><h2${enPanel ? '' : ' id="ficha-t"'} style="margin:0">${esc(o.n)}</h2>
      <span class="small muted">${esc(o.g || o.cn || T('Objeto'))}${esO && o.p > 0 ? T(' · se vende a {g}', { g: gold(o.p) }) : ''}${hay ? T(' · tenés {n}', { n: tengo(id) }) : ''}</span></div></div>
    ${o.d ? `<p>${esc(o.d)}</p>` : ''}
    ${q ? `<p class="small row">${T('Con calidad:')} ${[1, 2, 3].map(k => `<span class="gold">${ui(['', 'qs', 'qg', 'qi'][k], 16, 16)}${num(Math.floor(o.p * Calc.QUALITY[k]))}</span>`).join('')}</p>` : ''}
    ${comer != null ? `<p class="small">${T('Comerlo: energía {e}{s} (calidad normal).', { e: `${comer > 0 ? '+' : ''}${comer}`, s: comer > 0 ? T(', salud +{n}', { n: Math.floor(comer * 0.45) }) : '' })}</p>` : ''}
    ${o.bf ? `<p class="small">${T('Efecto: {l}', { l: o.bf.map(buffText).map(esc).join('; ') })}</p>` : ''}
    ${stats(o)}
    ${o.mu ? `<p class="small">${T('Se puede donar al museo.')}</p>` : ''}
    <h3>${T('Cómo conseguirlo')}</h3>${howTo(id).map(x => `<p class="small">${x}</p>`).join('')}
    ${rec ? `<p class="small">${sabida(rec) === false ? T('Todavía no sabés la receta.') : sabida(rec) ? T('Ya sabés la receta.') : ''} <button type="button" class="btn mini" data-ir-receta="${esc(rec.key)}">${T('Ver la receta')}</button></p>` : ''}
    ${usos.length ? `<h3>${T('Se usa en')}</h3><div class="grid">${usos.map(r => `<button type="button" class="slot" data-ir-receta="${esc(r.key)}" data-tip="t:${esc(r.name)}" aria-label="${esc(r.name)}">${recSpr(r, 3)}</button>`).join('')}</div>` : ''}
    ${lotes ? `<h3>${T('Centro Cívico')}</h3><p class="small">${esc(lotes.join(', '))}</p>` : ''}
    ${gustos.map(([t, vs]) => `<h3>${t}</h3>${caras(vs)}`).join('')}
    ${fish || crop || art || maq ? `<div class="row" style="margin-top:10px">${fish ? `<button type="button" class="btn" data-ir-pez="${esc(id)}">${T('Ver en Peces')}</button>` : ''}${crop ? `<button type="button" class="btn" data-ir-cultivo="${esc(crop.id)}">${T('Ver en Cultivos')}</button>` : ''}${art ? `<button type="button" class="btn" data-ir-art="${esc(id)}">${T('Qué hacer con esto')}</button>` : ''}${maq ? `<button type="button" class="btn" data-ir-maq="${esc(maq.id)}">${T('Ver en Artesanales')}</button>` : ''}</div>` : ''}`;
}
function fichaObjeto(id) { if (obj(id)) abrirFicha(fichaHtml(id)); }

// Cualquier casilla de objeto (sin otra acción propia) abre su ficha: de dónde sale, recetas, regalos.
document.addEventListener('click', e => {
  const c = e.target.closest('[data-cat]'); if (c) return fichaCategoria(c.dataset.cat);
  const f = e.target.closest('[data-ficha]'); if (f) return fichaObjeto(f.dataset.ficha);
  const sl = e.target.closest('.slot[data-id]:not([data-act])'); if (sl && obj(sl.dataset.id)) fichaObjeto(sl.dataset.id);
});
// Ingredientes del tipo "Huevo (cualquiera)": todos los objetos que sirven.
function fichaCategoria(cat) {
  const vistos = new Set();
  const ids = (cat === '-777' ? WILD_SEEDS : Object.keys(D.objects).filter(k => String(D.objects[k].c) === cat)).filter(k => { const o = obj(k); if (!o || o.p <= 0 || vistos.has(o.n)) return false; vistos.add(o.n); return true; });
  const hay = !!partida()?.inventario;
  abrirFicha(`<div class="item-row"><span class="slot">${ingSpr(cat, 3)}</span><div><h2 id="ficha-t" style="margin:0">${esc(ingName(cat))}</h2>${hay ? `<span class="small muted">${T('Tenés {n} en total', { n: tengo(cat) })}</span>` : ''}</div></div>
    <p>${T('Sirve cualquiera de estos. Tocá uno para ver cómo conseguirlo.')}</p>
    <div class="grid">${ids.map(i => slot(i, { n: hay ? tengo(i) : 0 })).join('')}</div>`);
}
