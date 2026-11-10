// Utilidades compartidas: estado guardado, sprites, tooltips, desplegables.
const D = window.SDV;
const STORE = 'almanaque-sdv-v1';
const DEFAULTS = { season: 0, day: 1, year: 1, tab: 'granja', plantings: [], caught: {}, bundles: {}, calc: null, hora: 1200, farm: { level: 0, tiller: false, agri: false, artisan: false, fisher: false, angler: false } };
const state = (() => {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE)) || {}); } catch { return Object.assign({}, DEFAULTS); }
})();
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* sin almacenamiento: la app sigue funcionando en memoria */ } }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const num = n => Math.round(n).toLocaleString('es-ES');
const SEASONS = D.seasons;
const DOW = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SHEETS = { o: [384, 624], o2: [128, 320], crops: [256, 1024], big: [128, 1472], junimo: [640, 308], trees: [432, 720] };
Object.assign(SHEETS, D.sheets);  // armas, herramientas, sombreros, muebles y ropa (pestaña Objetos)

function spr(sheet, x, y, w, h, scale) {
  const [W, H] = SHEETS[sheet];
  return `<i class="spr" style="width:${w * scale}px;height:${h * scale}px;background-image:url(assets/sheets/${sheet}.png);background-position:-${x * scale}px -${y * scale}px;background-size:${W * scale}px ${H * scale}px"></i>`;
}
// Objetos comunes por id ("24") y el resto de los ítems por id calificado ("(W)4", "(F)1226"...).
const obj = id => D.objects[id] || D.items?.[id];
const esObjeto = id => id in D.objects;
// Lo que no es de 16x16 (objetos grandes, sombreros, muebles) se achica para entrar en la casilla, como en el inventario.
function itemSpr(id, scale = 3) { const o = obj(id); if (!o) return ''; const [sh, x, y, w = 16, h = 16] = o.s; return spr(sh, x, y, w, h, Math.min(scale, 16 * scale / Math.max(w, h))); }
function cropStage(c, frame, scale = 2) {
  const col = c.sprite % 2, row = Math.floor(c.sprite / 2);
  return spr('crops', col * 128 + frame * 16, row * 32, 16, 32, scale);
}
const ui = (name, w, h) => `<i class="ui" style="width:${w}px;height:${h}px;background-image:url(assets/ui/${name}.png)"></i>`;
const seasonIcon = (s, z = 3) => ui('s' + s, 12 * z, 8 * z);
const coin = (z = 2) => ui('coin', 9 * z, 10 * z);
const gold = n => `<span class="gold">${coin()}${num(n)}</span>`;
const qStar = q => q ? `<span class="q">${ui(['', 'qs', 'qg', 'qi'][q], 18, 18)}</span>` : '';
// Números de las casillas con los dígitos chicos del juego (Cursors.png), como en el inventario.
const digitos = n => `<span class="num"><span class="sr">${n}</span>${String(n).split('').map(c => `<i aria-hidden="true" style="background-position:-${Number(c) * 15}px 0"></i>`).join('')}</span>`;
function slot(id, o = {}) {
  const cls = ['slot', o.sel && 'sel', o.done && 'done', o.dim && 'dim'].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-tip="o:${esc(id)}" data-id="${esc(id)}"${o.act ? ` data-act="${o.act}"` : ''} aria-label="${esc(obj(id)?.n || id)}">${itemSpr(id, 3)}${qStar(o.q)}${o.n > 1 ? digitos(o.n) : ''}</button>`;
}
const MUSEO_T = { Arch: 'artefactos', Minerals: 'minerales' };
const condText = cs => [...new Set((cs || []).map(c => c.year ? `desde el año ${c.year}` : c.year1 ? 'solo el primer año' : c.season ? `solo en ${seasonNames(c.season).toLowerCase()}` : c.dow ? `solo ${c.dow.map(d => ({ Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sábados', Sunday: 'domingos' }[d] || d)).join(', ')}`
  : c.dom ? `solo ${c.dom.map(d => d === 'even' ? 'los días pares' : d === 'odd' ? 'los días impares' : `el día ${d}`).join(', ')}` : c.mine ? `después de llegar al nivel ${c.mine} de la mina` : c.ach ? (c.ach === '*' ? 'con todos los logros' : `con el logro «${esc(c.ach)}»`)
  : c.house ? `con la casa ampliada ${c.house === 1 ? 'una vez' : `${c.house} veces`}` : c.museum ? `después de donar ${c.museum} ${c.types?.length ? c.types.map(t => MUSEO_T[t] || t).join(' y ') : 'objetos'} al museo` : c.skill ? `con nivel ${c.skill[1]} de ${esc(c.skill[0])}`
  : c.hearts ? `con ${c.hearts[1]} corazones con ${esc(c.hearts[0])}` : c.tras ? `después de conseguir la ${esc(c.tras)}` : c.days ? `después de ${c.days} días de juego` : c.quest ? 'misión de Qi' : 'con condición especial'))].join(', ');
function seasonNames(list) { return (list || []).map(s => SEASONS[s]).join(', '); }

// ---------- texto de "cómo conseguirlo", siempre desde los datos del juego
const bestShop = list => (list || []).filter(s => s.price != null && !s.currency && !s.trade).sort((a, b) => a.price - b.price)[0];
const islaOk = () => !window.PARTIDA?.ok || !!PARTIDA.isla;
// ¿Se puede pescar en esa estación? Por zona: la isla solo cuenta si ya llegaste, y la misión de Qi nunca.
function fishIn(f, n, loc = 'all') {
  const all = f.where || [];
  const z = loc !== 'all' ? all.filter(w => w.loc === loc) : all.filter(w => !w.quest && (!w.isl || islaOk()));
  return z.length ? z.some(w => w.ss.includes(n)) : f.seasons.includes(n);
}
const zoneSeasons = ss => ss.length === 4 ? 'todo el año' : seasonNames(ss);
function fishWhere(f) {
  if (!f.where?.length) return [];
  const g = new Map();
  for (const w of f.where) { if (w.quest) continue; const k = w.loc + (w.area ? ` (${w.area})` : ''); if (!g.has(k)) g.set(k, new Set()); w.ss.forEach(x => g.get(k).add(x)); }
  return [...g].map(([k, s]) => `${k}: ${zoneSeasons([...s].sort()).toLowerCase()}`);
}
function hourRange(t) { const f = x => { let h = Math.floor(x / 100); return `${h >= 24 ? h - 24 : h}:${String(x % 100).padStart(2, '0')}`; }; return t.map(([a, b]) => `${f(a)} a ${f(b)}`).join(' y '); }
const WEATHER = { both: 'Cualquiera', sunny: 'Soleado', rainy: 'Lluvia' };
function howTo(id) {
  const s = D.sources[id] || D.qsources?.[id] || {}, out = [], N = D.names || {};
  if (s.crop) { const c = D.crops.find(x => x.id === s.crop.seed); const b = bestShop(c.sources); out.push(`Cultivo de ${seasonNames(s.crop.seasons)}. Semilla: ${c.seed}${b ? ` (${num(b.price)} o en ${b.shop})` : ''}.`); }
  if (s.tree) { const t = D.trees.find(x => x.id === s.tree.id); out.push(`Árbol frutal (${t.sapling}), da fruta en ${seasonNames(s.tree.seasons)}.`); }
  if (s.fish) { const f = D.fish.find(x => x.id === id); if (f.trap) out.push(`Nasa en ${f.water === 'ocean' ? 'mar' : 'agua dulce'}.`); else out.push(`Pesca en ${fishWhere(f).join('; ') || 'sin zona registrada'}. De ${hourRange(f.times)}, clima: ${WEATHER[f.weather].toLowerCase()}.`); }
  if (s.forage) { const m = new Map(); for (const [l, se] of s.forage) { if (!m.has(l)) m.set(l, new Set()); m.get(l).add(se); } out.push('Recolección: ' + [...m].map(([l, ss]) => `${l}${[...ss].some(x => x != null) ? ' (' + [...ss].filter(x => x != null).map(x => SEASONS[x]).join(', ') + ')' : ''}`).join('; ') + '.'); }
  if (s.animal) out.push(`Producto de: ${s.animal.join(', ')}.`);
  if (s.tap) out.push(s.tap.map(t => `${D.tapper} en un árbol de ${obj(t.seed).n} (cada ${t.days} ${t.days === 1 ? 'día' : 'días'}${t.noWinter ? ', menos en invierno' : ''})`).join('. ') + '.');
  if (s.mach) out.push(s.mach.map(m => `Se hace en ${m.m}${m.inp.length ? ` con ${m.inp.map(i => obj(i).n).join(' o ')}` : ''}`).join('. ') + '.');
  if (s.mon) out.push(`Botín de: ${s.mon.join(', ')}.`);
  if (s.geo) out.push(`Dentro de: ${s.geo.join(', ')}.`);
  if (s.shop) { const l = s.shop.filter(x => x.price != null || x.trade).map(x => { const c = condText(x.cond); return `${x.shop}${x.price != null ? ` (${num(x.price)} ${MONEDA[x.currency] || 'o'}${c ? `, ${c}` : ''})` : x.trade ? ` (${x.trade[1]} × ${obj(x.trade[0])?.n || x.trade[0]}${c ? `, ${c}` : ''})` : ''}`; }); if (l.length) out.push(`Se compra en: ${[...new Set(l)].join('; ')}.`); }
  if (s.rot) { const m = new Map(); for (const r of s.rot) { const c = condText(r.cond); if (!m.has(r.shop)) m.set(r.shop, new Set()); m.get(r.shop).add(c); } out.push(`Puede salir entre los muebles que rotan en: ${[...m].map(([k, cs]) => cs.has('') ? k : `${k} (${[...cs].join('; ')})`).join(', ')}.`); }
  if (s.catal) out.push(`Gratis en el ${s.catal.join(' o en el ')}.`);
  if (s.slayer) out.push(`Recompensa del ${esc(N.adv)} por eliminar ${num(s.slayer.n)} ${esc(s.slayer.name)}${s.slayer.price > 0 ? `; después se compra ahí por ${num(s.slayer.price)} o` : ''}.`);
  if (s.museum) out.push(s.museum.map(m => `Recompensa del museo al donar ${m.map(x => typeof x === 'string' ? obj(x)?.n || x : x.t === 'any' ? `${x.n} objetos en total` : `${x.n} ${x.t === 'arch' ? 'artefactos' : 'minerales'}`).join(', ')}.`).join(' '));
  if (s.mail) out.push(`Llega por carta: ${s.mail.map(t => t ? `«${esc(t)}»` : 'sin título').join(', ')}.`);
  if (s.dig) out.push(`Puntos de excavación en: ${s.dig.join(', ')}.`);
  if (s.sew) { const fem = e => e.fem === 1 ? ', si tu personaje es mujer' : e.fem === 0 ? ', si tu personaje es hombre' : '', igual = s.sew.every(e => e.fem === s.sew[0].fem);
    out.push(`Se cose en la ${esc(N.sew)} con ${s.sew.map(e => `${e.base ? e.base.map(i => obj(i)?.n).join(' o ') : 'tela'} + ${e.cat ? `cualquier ${e.cat.toLowerCase()}` : e.ids.map(i => obj(i)?.n).join(' o ') + (e.mas ? ` (y ${e.mas} más)` : '')}${e.azar ? ', sale una prenda al azar' : ''}${igual ? '' : fem(e)}`).join('; ')}${igual ? fem(s.sew[0]) : ''}.`); }
  if (s.upg) out.push(`Mejora en la ${esc(N.smith)}${s.upg.de ? ` desde ${obj(s.upg.de)?.n || s.upg.de}` : ''}: ${num(s.upg.price)} o${s.upg.trade ? ` y ${s.upg.trade[1]} × ${obj(s.upg.trade[0])?.n}` : ''}.${s.upg.note ? ` <span class="manual">${esc(s.upg.note)} (nota manual)</span>` : ''}`);
  if (s.azar) out.push('Puede salir al azar, por ejemplo en los cofres del tesoro de las minas.');
  if (s.custom) out.push('Se puede elegir al crear el personaje.');
  const rb = !s.craft && id.startsWith('(BC)') && D.recipes.find(r => r.big && '(BC)' + r.id === id);
  if (rb) out.push(`Fabricación: ${rb.ing.map(([i, n]) => `${n} × ${D.catnames[i] || obj(i)?.n || i}`).join(', ')}.`);
  if (s.craft) out.push(`${s.craft.cook ? 'Receta de cocina' : 'Fabricación'}: ${s.craft.ing.map(([i, n]) => `${n} × ${i.startsWith('-') ? 'cualquiera de la categoría' : (obj(i)?.n || i)}`).join(', ')}.`);
  if (s.note) out.push(`<span class="manual">${esc(s.note)} (nota manual: no viene en los datos del juego)</span>`);
  return out.length ? out : ['El juego no registra de dónde sale este objeto.'];
}
const MONEDA = { 1: 'estrellas', 2: 'monedas de Qi', 4: 'gemas de Qi' };
const bundleUse = (() => { const m = {}; for (const r of D.rooms) for (const b of r.bundles) for (const i of b.items) if (i.id) (m[i.id] ||= []).push(`${b.name} (${r.name})`); return m; })();
const lovers = id => D.villagers.filter(v => v.gift.love.includes(id));

// ---------- tooltip
const tip = $('#tip');
function tipHtml(spec) {
  const [k, ...rest] = spec.split(':'); const v = rest.join(':');
  if (k === 't') return `<p>${esc(v)}</p>`;
  if (k === 'o') {
    const o = obj(v); if (!o) return '';
    const prices = esObjeto(v) && o.p > 0 ? `<hr><div class="row">${gold(o.p)}${(o.c === -75 || o.c === -79 || o.c === -80 || o.c === -4 || o.c === -5 || o.c === -6 || o.c === -18 || o.c === -14 || o.c === -81) ? [1, 2, 3].map(q => `<span class="gold">${ui(['', 'qs', 'qg', 'qi'][q], 16, 16)}${num(Math.floor(o.p * Calc.QUALITY[q]))}</span>`).join('') : ''}</div>` : '';
    const bu = bundleUse[v] ? `<p class="muted">Lote: ${esc(bundleUse[v].join(', '))}</p>` : '';
    return `<div class="t">${esc(o.n)}</div><p class="muted">${esc(o.g || o.cn)}</p>${o.d ? `<p>${esc(o.d)}</p>` : ''}${prices}${bu}`;
  }
  return '';
}
function moveTip(x, y) {
  const r = tip.getBoundingClientRect(); const px = Math.min(x + 26, innerWidth - r.width - 8), py = Math.min(y + 26, innerHeight - r.height - 8);
  tip.style.left = Math.max(4, px) + 'px'; tip.style.top = Math.max(4, py) + 'px';
}
let tipEl = null;
function showTip(el, x, y) { if (el !== tipEl) { tipEl = el; const h = tipHtml(el.dataset.tip); tip.innerHTML = h; tip.hidden = !h; } moveTip(x, y); }
function hideTip() { tipEl = null; tip.hidden = true; }
document.addEventListener('mousemove', e => { const el = e.target.closest?.('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.right, r.top); } });
document.addEventListener('focusout', hideTip);

// ---------- desplegable propio (el <select> nativo usaría el estilo del sistema)
function dd(id, options, value, label) {
  const cur = options.find(o => String(o[0]) === String(value)) || options[0];
  return `<div class="dd" data-dd="${id}" data-val="${esc(cur?.[0])}"><button type="button" aria-haspopup="listbox" aria-expanded="false"${label ? ` aria-label="${esc(label)}"` : ''}><span>${esc(cur?.[1] ?? '')}</span>${ui('ddarrow', 20, 22)}</button><ul role="listbox" hidden>${options.map(o => `<li role="option" tabindex="0" data-v="${esc(o[0])}" aria-selected="${String(o[0]) === String(value)}">${esc(o[1])}</li>`).join('')}</ul></div>`;
}
function closeDD() { $$('.dd ul:not([hidden])').forEach(u => { u.hidden = true; u.previousElementSibling.setAttribute('aria-expanded', 'false'); }); }
function pickDD(li) {
  const box = li.closest('.dd'); box.dataset.val = li.dataset.v; $('button span', box).textContent = li.textContent;
  $$('li', box).forEach(x => x.setAttribute('aria-selected', x === li)); closeDD();
  box.dispatchEvent(new CustomEvent('ddchange', { bubbles: true, detail: { id: box.dataset.dd, value: li.dataset.v } }));
  $('button', box).focus();
}
document.addEventListener('click', e => {
  const li = e.target.closest('.dd li'); if (li) return pickDD(li);
  const b = e.target.closest('.dd > button');
  if (b) { const u = b.nextElementSibling, was = u.hidden; closeDD(); u.hidden = !was; b.setAttribute('aria-expanded', was); if (was) ($('[aria-selected=true]', u) || u.firstChild).focus?.(); return; }
  closeDD();
});
document.addEventListener('keydown', e => {
  const li = e.target.closest?.('.dd li');
  if (e.key === 'Escape') { const open = $('.dd ul:not([hidden])'); if (open) { open.previousElementSibling.focus(); closeDD(); } return; }
  if (!li) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickDD(li); }
  if (e.key === 'ArrowDown') { e.preventDefault(); li.nextElementSibling?.focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); li.previousElementSibling?.focus(); }
});
const seasonBar = (id, val, withAll) => `<div class="row" role="group" aria-label="Estación">${withAll ? `<button type="button" class="btn" data-${id}="all" aria-pressed="${val === 'all'}">Todas</button>` : ''}${SEASONS.map((n, i) => `<button type="button" class="btn" data-${id}="${i}" aria-pressed="${String(val) === String(i)}" data-tip="t:${n}" aria-label="${n}">${seasonIcon(i)}</button>`).join('')}</div>`;
const TABS = {};

// ---------- partida real: la escribe tools/vigia.py en data/partida.js
const partida = () => window.PARTIDA?.ok ? window.PARTIDA : null;
const lotesDeLaPartida = () => !!partida()?.lotesOk;
// Trae fecha, niveles, peces y lotes. Solo cuando cambia el guardado: entre días podés mirar otras fechas.
function syncFromSave() {
  const P = partida(); if (!P || P.stamp === state.stamp) return false;
  state.stamp = P.stamp; state.season = P.fecha.s; state.day = P.fecha.d; state.year = P.fecha.y;
  Object.assign(state.farm, P.farm);
  state.caught = Object.fromEntries(Object.keys(P.peces).map(k => [k, 1]));
  if (P.lotesOk) state.bundles = JSON.parse(JSON.stringify(P.lotes));
  save(); return true;
}

// ---------- inventario y recetas de la partida (los escribe el vigía)
const hora = t => `${Math.floor(t / 100) % 24}:${String(t % 100).padStart(2, '0')}`;
const inv = () => partida()?.inventario || {};
const WILD_SEEDS = ['495', '496', '497', '498'];
// Cuánto tenés de un ingrediente; las categorías (-5 huevo, -4 pescado...) suman todo lo de esa categoría.
function tengo(id) {
  const I = inv();
  if (id === '-777') return WILD_SEEDS.reduce((a, k) => a + (I[k] || 0), 0);
  if (/^-\d+$/.test(id)) { const c = Number(id); return Object.entries(I).reduce((a, [k, n]) => a + (obj(k)?.c === c ? n : 0), 0); }
  return I[id] || 0;
}
const CAT_SPR = { '-5': '176', '-6': '184', '-4': '145', '-777': '495', '-2': '72', '-75': '24' };
const ingName = id => D.catnames[id] || obj(id)?.n || id;
const ingSpr = (id, z = 2) => itemSpr(CAT_SPR[id] || id, z);
function recSpr(r, z = 3) { return r.big ? spr('big', r.s[0], r.s[1], 16, 32, Math.max(1, z - 1)) : itemSpr(r.id, z); }
const recetasLeidas = () => !!partida()?.recetas;
// null si no hay partida: no sabemos qué recetas aprendiste.
function sabida(r) { const R = partida()?.recetas; if (!R) return null; return r.cook ? R.cook.includes(r.key) : r.key in R.craft; }
const alcanza = r => Math.min(...r.ing.map(([i, n]) => Math.floor(tengo(i) / n)));
// ¿Se consigue el ingrediente en esa estación? Las categorías y lo que sale de máquinas, animales o tiendas, siempre.
function ingEnEstacion(id, S) {
  if (D.catnames[id]) return true;
  const a = D.sources[id]?.av; if (!a) return true;
  return a.ss.includes(S) || a.always.length > 0;
}
function recetaComo(r) {
  const hayNota = r.how.some(h => h.k === 'note');
  const out = r.how.filter(h => !(hayNota && h.k === 'event' && !h.npc)).map(h => {
    switch (h.k) {
      case 'default': return 'La sabés desde el principio.';
      case 'skill': return `Al llegar a nivel ${h.lvl} de ${esc(h.skill)}.`;
      case 'friend': return `Llega por carta cuando tenés ${h.hearts} ${h.hearts === 1 ? 'corazón' : 'corazones'} con ${esc(h.npc)}.`;
      case 'tv': return `En el programa de cocina de la TV (episodio ${h.ep}).${D.tvNote ? ` <span class="manual">${esc(D.tvNote)} (nota manual)</span>` : ''}`;
      case 'shop': { const ev = h.cond.some(c => c.other?.startsWith('PLAYER_HAS_SEEN_EVENT')), c = ev ? 'una vez que viste el evento' : condText(h.cond); return `Se compra en ${esc(h.shop)}${h.price ? ` por ${gold(h.price)}` : h.trade ? ` a cambio de ${h.trade[1]} × ${esc(ingName(h.trade[0]))}` : ''}${c ? ` (${c})` : ''}.`; }
      case 'museum': return `Al donar ${h.items.map(i => esc(ingName(i))).join(', ')} al museo.`;
      case 'order': return `Recompensa del pedido especial de ${esc(h.npc)}: «${esc(h.name)}».`;
      case 'event': return `En un evento${h.npc ? ` con ${esc(h.npc)}${h.hearts ? ` (${h.hearts} corazones)` : ''}` : ''} en ${esc(h.loc)}.`;
      case 'note': return `<span class="manual">${esc(h.text)} (nota manual: no viene en los datos del juego)</span>`;
    }
    return '';
  }).filter(Boolean);
  return out.length ? out : ['El juego no registra cómo se aprende.'];
}
const BUFF = { FarmingLevel: 'Agricultura', FishingLevel: 'Pesca', MiningLevel: 'Minería', CombatLevel: 'Combate', LuckLevel: 'Suerte', ForagingLevel: 'Recolección', MaxStamina: 'Energía máx.', MagneticRadius: 'Magnetismo', Speed: 'Velocidad', Defense: 'Defensa', Attack: 'Ataque' };
const buffText = b => Object.entries(b.at).map(([k, v]) => `${BUFF[k] || k} ${v > 0 ? '+' : ''}${v}`).join(', ') + (b.min ? ` durante ${Math.floor(b.min / 60)} h${b.min % 60 ? ` ${b.min % 60} min` : ''}` : '');
// Panel de una receta: ingredientes con lo que tenés, cómo se aprende y qué tan seguido la usaste.
function recetaPanel(r, S) {
  if (!r) return '<p class="empty">Elegí una receta para ver sus ingredientes.</p>';
  const P = partida(), k = sabida(r), hay = !!P?.inventario;
  const veces = r.cook ? P?.recetas?.cocinadas?.[r.id] : P?.recetas?.craft?.[r.key];
  const filas = r.ing.map(([i, n]) => {
    const t = tengo(i), ok = t >= n, est = S == null || ingEnEstacion(i, S);
    return `<div class="item-row">${D.catnames[i] ? `<button type="button" class="slot" data-cat="${esc(i)}" data-tip="t:${esc(ingName(i))}" aria-label="${esc(ingName(i))}">${ingSpr(i, 3)}</button>` : slot(i)}<span>${n} × <button type="button" class="link" ${D.catnames[i] ? `data-cat="${esc(i)}"` : `data-ficha="${esc(i)}"`}>${esc(ingName(i))}</button>${hay ? ` <span class="small ${ok ? 'pos' : 'neg'}">(tenés ${t})</span>` : ''}${est ? '' : ' <span class="tag">fuera de temporada</span>'}</span></div>`;
  }).join('');
  return `<div class="item-row"><span class="slot">${recSpr(r, 3)}</span><div><h2 style="margin:0">${esc(r.name)}${r.n > 1 ? ` × ${r.n}` : ''}</h2>
      <span class="small muted">${r.cook ? 'Receta de cocina' : 'Fabricación'}${r.price ? ` · se vende a ${gold(r.price)}` : ''}</span></div></div>
    ${!r.big && obj(r.id)?.d ? `<p class="small">${esc(obj(r.id).d)}</p>` : ''}
    ${r.buffs.length ? `<p class="small">Efecto: ${r.buffs.map(buffText).map(esc).join('; ')}</p>` : ''}
    <h3>Ingredientes</h3><p class="small muted">Tocá un ingrediente para ver cómo conseguirlo.</p>${filas}
    ${hay && k ? `<p class="${alcanza(r) > 0 ? 'pos' : 'muted'}">${alcanza(r) > 0 ? `Con lo que tenés te alcanza para ${alcanza(r)}.` : 'Te faltan ingredientes.'}</p>` : ''}
    <h3>${k ? 'Cómo la aprendiste' : 'Cómo se aprende'}</h3>
    ${recetaComo(r).map(t => `<p class="small">${t}</p>`).join('')}
    ${veces ? `<p class="small muted">${r.cook ? 'La cocinaste' : 'La fabricaste'} ${veces} ${veces === 1 ? 'vez' : 'veces'}.</p>` : ''}
    ${hay ? '<p class="small muted">Cuenta lo que tenés en la mochila, los cofres y la heladera, según el último guardado.</p>' : ''}`;
}

// ---------- dónde anda cada aldeano: elige la agenda del día como el juego (fecha, corazones, día de la semana)
const SK = ['spring', 'summer', 'fall', 'winter'], DK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function corazones(id) { const a = partida()?.amistad?.[id]; return a ? Math.floor(a.pts / 250) : 0; }
function agendaDel(v, s, d) {
  if (!v.sched.length) return { sch: null, rain: null };
  const by = k => v.sched.find(x => x.key === k), H = Math.min(corazones(v.id), 14), dw = DK[(d - 1) % 7], S = SK[s];
  const conH = b => { for (let h = H; h > 0; h--) { const x = by(`${b}_${h}`); if (x) return x; } return null; };
  const fijo = by(`${S}_${d}`) || conH(String(d)) || by(String(d));
  if (fijo) return { sch: fijo, rain: null };
  const sch = conH(`${S}_${dw}`) || by(`${S}_${dw}`) || conH(dw) || by(dw) || by(S) || by(`spring_${dw}`) || by('spring') || by('default') || v.sched[0];
  return { sch, rain: s !== 3 ? by('rain') : null };  // en invierno nieva: no hay agenda de lluvia
}
function dondeA(v, sch, t) {
  let cur = null;
  for (const r of sch?.rows || []) if (r.t <= t) cur = r;
  return cur ? { loc: cur.loc || v.home, desde: cur.t, bed: cur.bed } : { loc: v.home, desde: null };
}
const festivalesDel = (s, d) => D.festivals.filter(f => f.s === s && f.d.includes(d));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const face = (v, px = 32) => `<i class="ui" style="width:${px}px;height:${px}px;background-image:url(assets/portraits/${esc(v.tex)}.png);background-size:${v.pw / 64 * px}px auto"></i>`;
const vil = id => D.villagers.find(v => v.id === id);
