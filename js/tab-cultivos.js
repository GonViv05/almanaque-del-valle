// Tabla de cultivos + calculadora de costo/beneficio.
const PROCESS = [['raw', T('Sin procesar')], ['wine', T('Vino (barril)')], ['juice', T('Jugo (barril)')], ['jelly', T('Mermelada (tarro)')], ['pickles', T('Encurtido (tarro)')], ['dried', T('Fruta seca (deshidratador)')], ['keg', T('Barril (cerveza, café…)')]];
const fertOf = id => D.fert.find(f => f.id === id) || null;
const fertPrice = f => f ? (bestShop(f.sources)?.price ?? 0) : 0;
function calcState() {
  state.calc ||= { crop: D.crops[0].id, qty: 20, day: state.day, season: state.season, fert: '', seedSrc: 'auto', seedCustom: 0, process: 'raw', greenhouse: false, replant: true, budget: 0, sort: 'perDay', only: true };
  return state.calc;
}
function seedPriceFor(crop, c) {
  if (c.seedSrc === 'custom') return Number(c.seedCustom) || 0;
  if (c.seedSrc !== 'auto') { const s = crop.sources.find(x => x.key === c.seedSrc); if (s && s.price != null) return s.price; }
  return bestShop(crop.sources)?.price ?? 0;
}
function simFor(crop, c) {
  const f = fertOf(c.fert), farm = state.farm;
  return Calc.simulate(crop, { day: Number(c.day), season: Number(c.season), level: Number(farm.level), qty: Math.max(1, Number(c.qty) || 1), fert: f ? { kind: f.kind, val: f.val } : null, agriculturist: farm.agri, tiller: farm.tiller, artisan: farm.artisan, greenhouse: c.greenhouse, replant: c.replant, process: c.process, kegFixed: D.kegFixed, objectPrice: id => obj(id).p, seedPrice: seedPriceFor(crop, c), fertPrice: fertPrice(f) });
}
function pct(x) { return dec((x * 100).toFixed(1)) + '%'; }
function cropRows(c) {
  const rows = D.crops.map(cr => { const price = seedPriceFor(cr, c); return { cr, ok: c.greenhouse || cr.seasons.includes(Number(c.season)), r: simFor(cr, c), price, known: price > 0 || c.seedSrc === 'custom' }; });
  const f = rows.filter(x => !c.only || x.ok);
  const key = c.sort;
  const val = x => key === 'name' ? x.cr.name : key === 'growth' ? x.r.growth : key === 'net' ? x.r.net : key === 'seed' ? x.price : key === 'sell' ? x.cr.price : x.r.perDay;
  f.sort((a, b) => (key === 'net' || key === 'perDay') && a.known !== b.known ? (a.known ? -1 : 1) : key === 'name' ? a.cr.name.localeCompare(b.cr.name, LANG) : (key === 'growth' || key === 'seed' ? val(a) - val(b) : val(b) - val(a)));
  return f;
}
function cropsTable(c) {
  const rows = cropRows(c);
  if (!rows.length) return `<p class="empty">${T('Ningún cultivo crece en esta estación con estos filtros. Probá con otra estación o activá el invernadero.')}</p>`;
  const th = (k, t, cl = '') => `<th class="${cl}" data-sort="${k}" aria-sort="${c.sort === k ? 'descending' : 'none'}">${t}${c.sort === k ? ' ▾' : ''}</th>`;
  return `<table><thead><tr><th></th>${th('name', T('Cultivo'))}<th>${T('Estación')}</th>${th('growth', T('Días'), 'n')}<th class="n">${T('Rebrote')}</th>${th('seed', T('Semilla'), 'n')}${th('sell', T('Venta'), 'n')}<th class="n">${T('Cosechas')}</th>${th('net', T('Neto'), 'n')}${th('perDay', T('Oro/día'), 'n')}</tr></thead><tbody>
  ${rows.map(({ cr, r, ok, price, known }) => `<tr data-crop="${cr.id}" class="${cr.id === c.crop ? 'sel' : ''}${ok ? '' : ' off'}" tabindex="0"><td data-tip="o:${cr.item}">${itemSpr(cr.item, 2)}</td><td>${esc(cr.name)}${cr.indoor ? ` <span class="tag">${T('interior')}</span>` : ''}${cr.sources.some(s => s.key === 'SeedShop' && s.cond.some(x => x.year)) ? ` <span class="tag">${T('año {y}', { y: 2 })}</span>` : ''}</td><td class="nowrap">${cr.seasons.map(s => seasonIcon(s, 2)).join(' ')}</td><td class="n">${r.growth}</td><td class="n">${cr.regrow > 0 ? cr.regrow : '—'}</td><td class="n">${price ? gold(price) : '—'}</td><td class="n">${gold(cr.price)}</td><td class="n">${r.harvests}</td><td class="n ${known ? (r.net >= 0 ? 'pos' : 'neg') : 'muted'}">${known ? num(r.net) : '—'}</td><td class="n ${known ? (r.perDay >= 0 ? 'pos' : 'neg') : 'muted'}">${known ? num(r.perDay) : '—'}</td></tr>`).join('')}</tbody></table>`;
}
function calcPanel(c) {
  const crop = D.crops.find(x => x.id === c.crop); const r = simFor(crop, c); const seedOpts = [['auto', T('El más barato')], ...crop.sources.filter(s => s.price != null).map(s => [s.key, `${s.shop}: ${num(s.price)} ${T('o')}${s.cond.some(x => x.year) ? ` (${T('año {y}', { y: 2 })})` : ''}`]), ['custom', T('Precio manual')]];
  const trade = crop.sources.filter(s => s.trade).map(s => `${s.shop}: ${s.trade[1]} × ${obj(s.trade[0])?.n || s.trade[0]}`);
  const phases = Calc.growthPhases(crop.phases, fertOf(c.fert)?.kind === 'speed' ? fertOf(c.fert).val : 0, state.farm.agri, false);
  const stages = phases.map((d, i) => d > 0 ? `<div class="stage">${cropStage(crop, i === 0 ? 0 : i + 1)}<span>${d} d</span></div>` : '').join('');
  const q = r.chances; const maxSeeds = (seedPriceFor(crop, c) + fertPrice(fertOf(c.fert))) > 0 && Number(c.budget) > 0 ? Math.floor(Number(c.budget) / (seedPriceFor(crop, c) + fertPrice(fertOf(c.fert)))) : null;
  const notes = [];
  if (crop.regrow > 0) notes.push(T('Rebrota cada {n} días.', { n: crop.regrow }));
  if (crop.raised) notes.push(T('Crece en enrejado: no se puede caminar por encima.'));
  if (crop.paddy) notes.push(T('Cultivo de arrozal: junto al agua crece un 25% más rápido.'));
  if (crop.giant) notes.push(T('Puede formar cultivo gigante.'));
  if (!crop.sources.some(s => s.price != null) && !trade.length) notes.push(T('Ninguna tienda la vende a precio fijo.'));
  if (trade.length) notes.push(T('Trueque: {l}.', { l: trade.join(', ') }));
  if (crop.indoor) notes.push(T('Solo se planta en interiores (maceta) o en la Isla Jengibre.'));
  for (const s of crop.sources) if (s.cond.some(x => x.year)) notes.push(T('En {t}: {c}.', { t: s.shop, c: condText(s.cond.filter(x => x.year)) }));
  if (!seedPriceFor(crop, c) && c.seedSrc !== 'custom') notes.push(T('La inversión no incluye semillas porque no tienen precio fijo. Cargá un precio manual.'));
  const chosen = D.crops.indexOf(crop);
  return `
  <div class="row between"><h2>${esc(crop.name)}</h2>${itemSpr(crop.item, 3)}</div>
  <p class="small muted">${esc(obj(crop.item).d)}</p>
  <div class="strip">${stages}<div class="stage">${cropStage(crop, crop.regrow > 0 ? 6 : phases.length + 1)}<span>${T('Cosecha')}</span></div></div>
  <p class="small">${notes.join(' ')}</p>
  <div class="fields">
    <label class="field"><span>${T('Cultivo')}</span>${dd('crop', D.crops.map(x => [x.id, x.name]), c.crop, T('Cultivo'))}</label>
    <label class="field"><span>${T('Cantidad de semillas')}</span><input class="input" type="number" min="1" data-f="qty" value="${esc(c.qty)}"></label>
    <label class="field"><span>${T('Día de siembra')}</span><input class="input" type="number" min="1" max="28" data-f="day" value="${esc(c.day)}"></label>
    <label class="field"><span>${T('Abono')}</span>${dd('fert', [['', T('Ninguno')], ...D.fert.map(f => [f.id, `${f.name}${fertPrice(f) ? ` (${num(fertPrice(f))} ${T('o')})` : ''}`])], c.fert, T('Abono'))}</label>
    <label class="field"><span>${T('Semilla comprada en')}</span>${dd('seedSrc', seedOpts, c.seedSrc, T('Tienda'))}</label>
    <label class="field"><span>${T('Precio manual')}</span><input class="input" type="number" min="0" data-f="seedCustom" value="${esc(c.seedCustom)}"></label>
    <label class="field"><span>${T('Qué hacés con la cosecha')}</span>${dd('process', PROCESS.filter(p => p[0] === 'raw' || Calc.processed(crop, p[0], D.kegFixed)), c.process, T('Procesado'))}</label>
    <label class="field"><span>${T('Oro disponible')}</span><input class="input" type="number" min="0" data-f="budget" value="${esc(c.budget)}"></label>
  </div>
  ${maxSeeds != null ? `<div class="row between small"><span>${T('Te alcanza para {n} semillas', { n: num(maxSeeds) })}</span><button type="button" class="btn" data-use-max="${maxSeeds}">${T('Usar esa cantidad')}</button></div>` : ''}
  <div class="row" style="margin-top:8px">
    <label class="chk"><input type="checkbox" data-c="greenhouse" ${c.greenhouse ? 'checked' : ''}><i></i>${T('Invernadero (1 año)')}</label>
    <label class="chk"><input type="checkbox" data-c="replant" ${c.replant ? 'checked' : ''}><i></i>${T('Replantar')}</label>
  </div>
  <div class="sum">
    <dl class="kv"><dt>${T('Crece en')}</dt><dd>${T('{n} días', { n: r.growth })}</dd><dt>${T('Cosechas')}</dt><dd>${r.harvests} (${T('días {l}', { l: r.harvestDays.join(', ') || '—' })})</dd><dt>${T('Unidades totales')}</dt><dd>${num(r.units)}</dd>
    <dt>${ui('qs', 16, 16)} ${T('Plata')}</dt><dd>${pct(q.silver)}</dd><dt>${ui('qg', 16, 16)} ${T('Oro')}</dt><dd>${pct(q.gold)}</dd><dt>${ui('qi', 16, 16)} ${T('Iridio')}</dt><dd>${pct(q.iridium)}</dd>
    <dt>${T('Semillas')}</dt><dd>${gold(r.seedCost)}</dd><dt>${T('Abono')}</dt><dd>${gold(r.fertCost)}</dd><dt>${T('Ingreso estimado')}</dt><dd>${gold(r.revenue)}</dd></dl>
    <div class="row between"><span>${T('Ganancia')}</span><span class="big ${r.net >= 0 ? 'pos' : 'neg'}">${num(r.net)}</span></div>
    <div class="row between small"><span>${T('Por día: {n}', { n: num(r.perDay) })}</span><span>${T('Retorno: {n}', { n: r.roi == null ? '—' : Math.round(r.roi * 100) + '%' })}</span></div>
    ${r.harvests === 0 ? `<p class="neg small">${T('Con esta fecha no llega a madurar antes de que termine la estación.')}</p>` : ''}
    <button type="button" class="btn" data-add-farm style="margin-top:8px">${T('Agregar a Mi Granja')}</button>
  </div>`;
}
TABS.cultivos = {
  label: T('Cultivos'), icon: () => itemSpr('24', 2),
  render(v) {
    const c = calcState();
    const farm = state.farm;
    v.innerHTML = `<div class="split"><section>
      <div class="bar-filters">${seasonBar('cs', c.season)}
        <label class="field"><span>${T('Nivel de agricultura')}</span>${dd('level', [...Array(15).keys()].map(i => [i, i]), farm.level, T('Nivel'))}</label>
        <label class="chk" data-tip="t:${esc(D.prof.Tiller.desc)}"><input type="checkbox" data-p="tiller" ${farm.tiller ? 'checked' : ''}><i></i>${esc(D.prof.Tiller.name)}</label>
        <label class="chk" data-tip="t:${esc(D.prof.Agriculturist.desc || T('Los cultivos crecen un 10% más rápido.'))}"><input type="checkbox" data-p="agri" ${farm.agri ? 'checked' : ''}><i></i>${esc(D.prof.Agriculturist.name)}</label>
        <label class="chk" data-tip="t:${esc(D.prof.Artisan.desc)}"><input type="checkbox" data-p="artisan" ${farm.artisan ? 'checked' : ''}><i></i>${esc(D.prof.Artisan.name)}</label>
        <label class="chk"><input type="checkbox" data-c="only" ${c.only ? 'checked' : ''}><i></i>${T('Solo de esta estación')}</label>
      </div>
      <div class="tscroll" id="ctable">${cropsTable(c)}</div>
      <h3>${T('Árboles frutales')}</h3><div class="grid">${D.trees.map(t => t.item ? `<div class="item-row" style="width:300px" data-tip="o:${t.item}">${itemSpr(t.item, 2)}<span class="small">${esc(t.name)}: ${t.seasons.map(s => seasonIcon(s, 2)).join('')} ${bestShop(t.sources) ? gold(bestShop(t.sources).price) : ''}</span></div>` : '').join('')}</div>
    </section><aside class="panel" id="cpanel">${calcPanel(c)}</aside></div>`;
    const refresh = () => { save(); $('#ctable', v).innerHTML = cropsTable(c); };
    const repanel = () => { $('#cpanel', v).innerHTML = calcPanel(c); };
    v.addEventListener('click', e => {
      const sb = e.target.closest('[data-cs]'); if (sb) { c.season = Number(sb.dataset.cs); $$('[data-cs]', v).forEach(b => b.setAttribute('aria-pressed', b === sb)); refresh(); repanel(); return; }
      const th = e.target.closest('th[data-sort]'); if (th) { c.sort = th.dataset.sort; refresh(); return; }
      const tr = e.target.closest('tr[data-crop]'); if (tr) { c.crop = tr.dataset.crop; c.process = 'raw'; c.seedSrc = 'auto'; refresh(); repanel(); return; }
      const m = e.target.closest('[data-use-max]'); if (m) { c.qty = Number(m.dataset.useMax); refresh(); repanel(); return; }
      if (e.target.closest('[data-add-farm]')) {
        const f = c.fert || null;
        state.plantings.push({ id: Date.now(), crop: c.crop, qty: Math.max(1, Number(c.qty) || 1), day: Number(c.day), season: Number(c.season), year: state.year, fert: f, seedSrc: c.seedSrc, seedCustom: c.seedCustom, process: c.process, greenhouse: c.greenhouse, replant: c.replant });
        save(); e.target.closest('[data-add-farm]').textContent = T('Agregado a Mi Granja');
      }
    });
    v.addEventListener('keydown', e => { const tr = e.target.closest('tr[data-crop]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tr.click(); } });
    v.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.p) { farm[t.dataset.p] = t.checked; refresh(); repanel(); return; }
      if (t.dataset.c) { c[t.dataset.c] = t.checked; refresh(); repanel(); return; }
    });
    v.addEventListener('input', e => { const t = e.target; if (t.dataset.f) { c[t.dataset.f] = t.value; if (t.dataset.f === 'day') c.day = Math.min(28, Math.max(1, Number(t.value) || 1)); save(); $('#ctable', v).innerHTML = cropsTable(c); const keep = t.dataset.f; repanel(); const n = $(`[data-f="${keep}"]`, v); n.focus(); } });
    v.addEventListener('ddchange', e => { const { id, value } = e.detail; if (id === 'level') farm.level = Number(value); else c[id] = value; if (id === 'crop') { c.process = 'raw'; c.seedSrc = 'auto'; } refresh(); repanel(); });
  },
};
