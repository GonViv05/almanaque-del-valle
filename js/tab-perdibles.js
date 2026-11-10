// Perdibles: lo que hay que conseguir en cada estación para el Centro Cívico, y qué conviene plantar y pescar.
function bundleItems() {
  const m = new Map();
  for (const r of D.rooms) for (const b of r.bundles) b.items.forEach((it, i) => { if (!it.id) return; if (!m.has(it.id)) m.set(it.id, []); m.get(it.id).push({ r, b, i, it }); });
  return m;
}
const entregado = u => !!(state.bundles[bKey(u.r, u.b)] || {})[u.i] || bundleDone(u.r, u.b) >= u.b.slots;
// Monstruos no descartan: el botín es azaroso y no reemplaza la cosecha o la pesca de la estación.
const fuenteFija = a => a.always.some(x => x !== 'monstruo');
function perdibles(S) {
  const solo = [], ultima = []; let hechos = 0;
  for (const [id, usos] of bundleItems()) {
    const a = D.sources[id]?.av; if (!a || !a.ss.length || a.ss.length === 4 || fuenteFija(a) || Math.max(...a.ss) !== S) continue;
    const pend = usos.filter(u => !entregado(u));
    if (!pend.length) { hechos++; continue; }
    (a.ss.length === 1 ? solo : ultima).push({ id, a, pend });
  }
  return { solo, ultima, hechos };
}
function perdibleRow({ id, a, pend }) {
  const s = D.sources[id], tags = [];
  if (s.crop) tags.push(T('también en invernadero'));
  if (a.always.includes('monstruo')) tags.push(T('también de monstruos'));
  if (a.ss.length > 1) tags.push(seasonNames(a.ss));
  const seed = s.crop && cropBySeed(s.crop.seed);
  if (seed && seed.sources.length && seed.sources.every(x => x.cond.some(c => c.year))) tags.push(T('semilla desde el año 2'));
  const q = Math.max(...pend.map(u => u.it.q)), n = Math.max(...pend.map(u => u.it.n));
  return `<div class="item-row">${slot(id, { n, q })}<span>${esc(obj(id).n)} ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}<br><span class="small muted">${[...new Set(pend.map(u => `${u.b.name} (${u.r.name})`))].map(esc).join(', ')}</span></span></div><div class="how">${howTo(id).join(' ')}</div>`;
}
function bestCrops(S, s) {
  const c0 = { qty: 1, day: S === state.season ? state.day : 1, season: S, fert: '', seedSrc: 'auto', seedCustom: 0, process: 'raw', greenhouse: false, replant: true };
  const rows = D.crops.filter(c => c.seasons.includes(S) && !c.indoor).map(cr => {
    const raw = simFor(cr, c0); let best = { k: 'raw', r: raw };
    for (const [k] of PROCESS) if (k !== 'raw' && Calc.processed(cr, k, D.kegFixed)) { const r = simFor(cr, { ...c0, process: k }); if (r.perDay > best.r.perDay) best = { k, r }; }
    return { cr, raw, best, price: seedPriceFor(cr, c0) };
  }).filter(x => x.raw.harvests > 0);
  const v = x => s.sort === 'best' ? x.best.r.perDay : x.raw.perDay;
  return rows.sort((a, b) => (a.price > 0) !== (b.price > 0) ? (a.price > 0 ? -1 : 1) : v(b) - v(a));
}
function cropsRanking(S, s) {
  const rows = bestCrops(S, s);
  if (!rows.length) return `<p class="empty">${T('Ya no llega a madurar nada de esta estación. Mirá la próxima.')}</p>`;
  const th = (k, t) => `<th class="n" data-psort="${k}" aria-sort="${s.sort === k ? 'descending' : 'none'}">${t}${s.sort === k ? ' ▾' : ''}</th>`;
  const label = k => PROCESS.find(p => p[0] === k)?.[1] || '';
  return `<div class="tscroll" style="min-height:0;max-height:560px"><table><thead><tr><th></th><th>${T('Cultivo')}</th><th class="n">${T('Días')}</th><th class="n">${T('Semilla')}</th>${th('raw', T('Venta directa'))}${th('best', T('Procesado'))}</tr></thead><tbody>
    ${rows.map(({ cr, raw, best, price }) => { const k = price > 0; return `<tr><td data-tip="o:${cr.item}">${itemSpr(cr.item, 2)}</td><td>${esc(cr.name)}${cr.seasons.length > 1 ? ` <span class="nowrap">${cr.seasons.map(x => seasonIcon(x, 1)).join('')}</span>` : ''}${cr.sources.some(x => x.key === 'SeedShop' && x.cond.some(c => c.year)) ? ` <span class="tag">${T('año {y}', { y: 2 })}</span>` : ''}</td><td class="n">${raw.growth}</td><td class="n">${k ? gold(price) : '—'}</td><td class="n ${k ? '' : 'muted'}">${k ? num(raw.perDay) : '—'}</td><td class="n ${k ? '' : 'muted'}" data-tip="t:${esc(label(best.k))}">${k ? (best.k === 'raw' ? T('igual') : num(best.r.perDay)) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function fishRanking(S) {
  const m = state.farm.angler ? 1.5 : state.farm.fisher ? 1.25 : 1;
  const rows = D.fish.filter(f => !f.trap && fishIn(f, S)).sort((a, b) => b.price - a.price).slice(0, 10);
  return rows.map(f => `<div class="item-row">${slot(f.id, { done: state.caught[f.id] })}<span>${esc(f.name)}${f.legend ? ` <span class="tag">${T('legendario')}</span>` : ''} ${gold(Calc.unitPrice(f.price, 0, m))}<br><span class="small muted">${esc(f.where.filter(w => !w.quest && !w.isl && w.ss.includes(S)).map(w => w.loc).filter((x, i, l) => l.indexOf(x) === i).join(', ') || T('Isla Jengibre'))}. ${hourRange(f.times)}</span></span></div>`).join('');
}
TABS.perdibles = {
  label: T('Perdibles'), icon: () => itemSpr('410', 2),
  render(v) {
    const s = state._perd ||= { season: null, sort: 'raw' };
    if (s.season == null || s.stamp !== state.stamp) { s.season = state.season; s.stamp = state.stamp; }
    const draw = () => {
      const S = s.season, { solo, ultima, hechos } = perdibles(S), actual = S === state.season, faltan = 28 - state.day;
      v.innerHTML = `<div class="bar-filters">${seasonBar('ps', S)}${actual ? `<span>${faltan === 1 ? T('Queda 1 día de {s}.', { s: lc(SEASONS[S]) }) : T('Quedan {n} días de {s}.', { n: faltan, s: lc(SEASONS[S]) })}</span>` : ''}</div>
      <div class="ccgrid"><section>
        <h2>${T('Solo en {s}', { s: lc(SEASONS[S]) })}</h2><p class="small muted">${T('Para el Centro Cívico. Si se te pasa, hay que esperar un año.')}${hechos ? T(' Ya entregaste {n}.', { n: hechos }) : ''}</p>
        ${solo.map(perdibleRow).join('') || `<p class="empty">${T('No te falta nada exclusivo de esta estación.')}</p>`}
        ${ultima.length ? `<h2 style="margin-top:14px">${T('Última oportunidad del año')}</h2><p class="small muted">${T('Salen en varias estaciones, y esta es la última.')}</p>${ultima.map(perdibleRow).join('')}` : ''}
      </section><section>
        <h2>${T('Más rentable')}</h2><p class="small muted">${T('Oro por casilla y por día, sembrando {c} sin abono, con tus niveles. Procesar requiere barriles o tarros.', { c: actual ? T('hoy (día {d})', { d: state.day }) : T('el día 1') })}</p>
        ${cropsRanking(S, s)}
        <h3>${T('Peces mejor pagados')}</h3>${fishRanking(S)}
      </section></div>`;
    };
    draw();
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-ps]'); if (b) { s.season = Number(b.dataset.ps); draw(); return; }
      const th = e.target.closest('th[data-psort]'); if (th) { s.sort = th.dataset.psort; draw(); }
    });
  },
};
