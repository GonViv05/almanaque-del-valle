// Utilidades compartidas: estado guardado, sprites, tooltips, desplegables.
const D = window.SDV;
const STORE = 'almanaque-sdv-v1';
const DEFAULTS = { season: 0, day: 1, year: 1, tab: 'granja', plantings: [], caught: {}, bundles: {}, calc: null, farm: { level: 0, tiller: false, agri: false, artisan: false, fisher: false, angler: false } };
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

function spr(sheet, x, y, w, h, scale) {
  const [W, H] = SHEETS[sheet];
  return `<i class="spr" style="width:${w * scale}px;height:${h * scale}px;background-image:url(assets/sheets/${sheet}.png);background-position:-${x * scale}px -${y * scale}px;background-size:${W * scale}px ${H * scale}px"></i>`;
}
const obj = id => D.objects[id];
function itemSpr(id, scale = 3) { const o = obj(id); if (!o) return ''; return spr(o.s[0], o.s[1], o.s[2], 16, 16, scale); }
function cropStage(c, frame, scale = 2) {
  const col = c.sprite % 2, row = Math.floor(c.sprite / 2);
  return spr('crops', col * 128 + frame * 16, row * 32, 16, 32, scale);
}
const ui = (name, w, h) => `<i class="ui" style="width:${w}px;height:${h}px;background-image:url(assets/ui/${name}.png)"></i>`;
const seasonIcon = (s, z = 3) => ui('s' + s, 12 * z, 8 * z);
const coin = (z = 2) => ui('coin', 9 * z, 10 * z);
const gold = n => `<span class="gold">${coin()}${num(n)}</span>`;
const qStar = q => q ? `<span class="q">${ui(['', 'qs', 'qg', 'qi'][q], 18, 18)}</span>` : '';
function slot(id, o = {}) {
  const cls = ['slot', o.sel && 'sel', o.done && 'done', o.dim && 'dim'].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-tip="o:${esc(id)}" data-id="${esc(id)}"${o.act ? ` data-act="${o.act}"` : ''} aria-label="${esc(obj(id)?.n || id)}">${itemSpr(id, 3)}${qStar(o.q)}${o.n > 1 ? `<span class="num">${o.n}</span>` : ''}</button>`;
}
const condText = cs => (cs || []).map(c => c.year ? `desde el año ${c.year}` : c.season ? `solo en ${seasonNames(c.season).toLowerCase()}` : c.dow ? `solo ${c.dow.map(d => ({ Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sábados', Sunday: 'domingos' }[d] || d)).join(', ')}` : c.quest ? 'misión de Qi' : 'con condición especial').join(', ');
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
  const s = D.sources[id] || {}, out = [];
  if (s.crop) { const c = D.crops.find(x => x.id === s.crop.seed); const b = bestShop(c.sources); out.push(`Cultivo de ${seasonNames(s.crop.seasons)}. Semilla: ${c.seed}${b ? ` (${num(b.price)} o en ${b.shop})` : ''}.`); }
  if (s.tree) { const t = D.trees.find(x => x.id === s.tree.id); out.push(`Árbol frutal (${t.sapling}), da fruta en ${seasonNames(s.tree.seasons)}.`); }
  if (s.fish) { const f = D.fish.find(x => x.id === id); if (f.trap) out.push(`Nasa en ${f.water === 'ocean' ? 'mar' : 'agua dulce'}.`); else out.push(`Pesca en ${fishWhere(f).join('; ') || 'sin zona registrada'}. De ${hourRange(f.times)}, clima: ${WEATHER[f.weather].toLowerCase()}.`); }
  if (s.forage) { const m = new Map(); for (const [l, se] of s.forage) { if (!m.has(l)) m.set(l, new Set()); m.get(l).add(se); } out.push('Recolección: ' + [...m].map(([l, ss]) => `${l}${[...ss].some(x => x != null) ? ' (' + [...ss].filter(x => x != null).map(x => SEASONS[x]).join(', ') + ')' : ''}`).join('; ') + '.'); }
  if (s.animal) out.push(`Producto de: ${s.animal.join(', ')}.`);
  if (s.mach) out.push(s.mach.map(m => `Se hace en ${m.m}${m.inp.length ? ` con ${m.inp.map(i => obj(i).n).join(' o ')}` : ''}`).join('. ') + '.');
  if (s.mon) out.push(`Botín de: ${s.mon.join(', ')}.`);
  if (s.geo) out.push(`Dentro de: ${s.geo.join(', ')}.`);
  if (s.shop) { const l = s.shop.filter(x => x.price != null || x.trade).map(x => `${x.shop}${x.price != null ? ` (${num(x.price)} o)` : x.trade ? ` (${x.trade[1]} × ${obj(x.trade[0])?.n || x.trade[0]})` : ''}`); if (l.length) out.push(`Se compra en: ${[...new Set(l)].join(', ')}.`); }
  if (s.craft) out.push(`${s.craft.cook ? 'Receta de cocina' : 'Fabricación'}: ${s.craft.ing.map(([i, n]) => `${n} × ${i.startsWith('-') ? 'cualquiera de la categoría' : (obj(i)?.n || i)}`).join(', ')}.`);
  if (s.note) out.push(`<span class="manual">${esc(s.note)} (nota manual: no viene en los datos del juego)</span>`);
  return out.length ? out : ['El juego no registra de dónde sale este objeto.'];
}
const bundleUse = (() => { const m = {}; for (const r of D.rooms) for (const b of r.bundles) for (const i of b.items) if (i.id) (m[i.id] ||= []).push(`${b.name} (${r.name})`); return m; })();
const lovers = id => D.villagers.filter(v => v.gift.love.includes(id));

// ---------- tooltip
const tip = $('#tip');
function tipHtml(spec) {
  const [k, ...rest] = spec.split(':'); const v = rest.join(':');
  if (k === 't') return `<p>${esc(v)}</p>`;
  if (k === 'o') {
    const o = obj(v); if (!o) return '';
    const prices = o.p > 0 ? `<hr><div class="row">${gold(o.p)}${(o.c === -75 || o.c === -79 || o.c === -80 || o.c === -4 || o.c === -5 || o.c === -6 || o.c === -18 || o.c === -14 || o.c === -81) ? [1, 2, 3].map(q => `<span class="gold">${ui(['', 'qs', 'qg', 'qi'][q], 16, 16)}${num(Math.floor(o.p * Calc.QUALITY[q]))}</span>`).join('') : ''}</div>` : '';
    const bu = bundleUse[v] ? `<p class="muted">Lote: ${esc(bundleUse[v].join(', '))}</p>` : '';
    return `<div class="t">${esc(o.n)}</div><p class="muted">${esc(o.cn)}</p><p>${esc(o.d)}</p>${prices}${bu}`;
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
