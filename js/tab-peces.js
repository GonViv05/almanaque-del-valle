// Peces: filtros por estación, clima, hora y zona; registro de capturas.
function fishMatches(f, s) {
  if (s.q && !f.name.toLowerCase().includes(s.q.toLowerCase())) return false;
  if (s.hide && state.caught[f.id]) return false;
  if (f.trap) return s.trap;
  if (s.season !== 'all' && !fishIn(f, Number(s.season), s.loc)) return false;
  if (s.weather !== 'any' && f.weather !== 'both' && f.weather !== s.weather) return false;
  if (s.hour !== 'any') { const h = Number(s.hour); if (!f.times.some(([a, b]) => h >= a && h < b)) return false; }
  if (s.loc !== 'all' && !f.where.some(w => w.loc === s.loc)) return false;
  return true;
}
function fishPrices(f) {
  const m = state.farm.angler ? 1.5 : state.farm.fisher ? 1.25 : 1;
  return [0, 1, 2, 3].map(q => `<span class="gold">${q ? ui(['', 'qs', 'qg', 'qi'][q], 16, 16) : ''}${num(Calc.unitPrice(f.price, q, m))}</span>`).join(' ');
}
function fishPanel(f) {
  if (!f) return `<p class="empty">${T('Elegí un pez para ver dónde y cuándo pescarlo.')}</p>`;
  const use = bundleUse[f.id], lov = lovers(f.id);
  const body = f.trap ? `<dl class="kv"><dt>${T('Se atrapa con')}</dt><dd>${T('Nasa')}</dd><dt>${T('Agua')}</dt><dd>${f.water === 'ocean' ? T('Mar') : T('Agua dulce')}</dd></dl>` : `
    <h3>${T('Dónde')}</h3>${f.where.map(w => `<div class="item-row"><span>${esc(w.loc)}${w.area ? ` (${esc(w.area)})` : ''} · ${zoneSeasons(w.ss)}${w.lvl ? ` · ${T('nivel {n}', { n: w.lvl })}` : ''}${w.cond?.some(c => c.quest) ? ` · ${T('misión de Qi')}` : ''}${w.boss ? ` · ${T('legendario')}` : ''}${w.manual ? ` <span class="manual small">${T('(nota manual)')}</span>` : ''}</span></div>`).join('') || `<p>${T('El juego no registra una zona fija.')}</p>`}
    <dl class="kv"><dt>${T('Horario')}</dt><dd>${hourRange(f.times)}</dd><dt>${T('Estación')}</dt><dd>${f.seasons.map(s => seasonIcon(s, 2)).join(' ')}${f.where.some(w => w.isl) ? ` <span class="tag">${T('isla: todo el año')}</span>` : ''}</dd><dt>${T('Clima')}</dt><dd>${WEATHER[f.weather]}</dd><dt>${T('Nivel mínimo')}</dt><dd>${f.lvl}</dd><dt>${T('Dificultad')}</dt><dd>${f.diff} · ${f.beh}</dd><dt>${T('Tamaño')}</dt><dd>${T('{a}–{b} pulgadas', { a: f.minS, b: f.maxS })}</dd></dl>`;
  return `<div class="row between"><h2>${esc(f.name)}</h2>${itemSpr(f.id, 3)}</div><p class="small muted">${esc(f.desc)}</p>${body}
    <h3>${T('Precio')}</h3><div class="row">${fishPrices(f)}</div>
    <div class="row" style="margin-top:6px"><label class="chk" data-tip="t:${esc(D.prof.Fisher.desc)}"><input type="checkbox" data-pf="fisher" ${state.farm.fisher ? 'checked' : ''}><i></i>${esc(D.prof.Fisher.name)}</label><label class="chk" data-tip="t:${esc(D.prof.Angler.desc)}"><input type="checkbox" data-pf="angler" ${state.farm.angler ? 'checked' : ''}><i></i>${esc(D.prof.Angler.name)}</label></div>
    ${use ? `<h3>${T('Lote')}</h3><p class="small">${esc(use.join(', '))}</p>` : ''}
    ${lov.length ? `<h3>${T('Le encanta a')}</h3><div class="row">${lov.map(v => portraitMini(v, 1, esc(v.name))).join('')}</div>` : ''}
    <div class="sum"><label class="chk"${partida() ? ` data-tip="t:${T('Sale de tu partida')}"` : ''}><input type="checkbox" data-catch="${f.id}" ${state.caught[f.id] ? 'checked' : ''}${partida() ? ' disabled' : ''}><i></i>${T('Ya lo pesqué')}</label></div>`;
}
TABS.peces = {
  label: T('Peces'), icon: () => itemSpr('128', 2),
  render(v) {
    const s = state._fish ||= { season: state.season, weather: 'any', hour: 'any', loc: 'all', q: '', hide: false, trap: true, sel: null };
    const locs = [...new Set(D.fish.flatMap(f => (f.where || []).map(w => w.loc)))].sort((a, b) => a.localeCompare(b, LANG));
    const hours = [['any', T('Cualquier hora')], ...[600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400].map(h => [h, `${h / 100 >= 24 ? h / 100 - 24 : h / 100}:00`])];
    v.innerHTML = `<div class="split"><section>
      <div class="bar-filters">${seasonBar('fs', s.season, true)}
        <label class="field"><span>${T('Clima')}</span>${dd('weather', [['any', T('Cualquiera')], ['sunny', T('Soleado')], ['rainy', T('Lluvia')]], s.weather, T('Clima'))}</label>
        <label class="field"><span>${T('Hora')}</span>${dd('hour', hours, s.hour, T('Hora'))}</label>
        <label class="field"><span>${T('Zona')}</span>${dd('loc', [['all', T('Todas')], ...locs.map(l => [l, l])], s.loc, T('Zona'))}</label>
        <label class="field" style="width:220px"><span>${T('Buscar')}</span><input class="input" id="fq" value="${esc(s.q)}" placeholder="${T('Nombre')}"></label>
        <label class="chk"><input type="checkbox" id="fh" ${s.hide ? 'checked' : ''}><i></i>${T('Ocultar atrapados')}</label>
      </div><div id="flist"></div></section><aside class="panel" id="fpanel"></aside></div>`;
    const draw = () => {
      const list = D.fish.filter(f => fishMatches(f, s)); const rod = list.filter(f => !f.trap), trap = list.filter(f => f.trap);
      const cnt = D.fish.filter(f => state.caught[f.id]).length;
      $('#flist', v).innerHTML = `<p class="small muted">${T('{n} resultados. Registrados: {c} de {t}.', { n: list.length, c: cnt, t: D.fish.length })}</p>
        ${rod.length ? `<div class="grid">${rod.map(f => slot(f.id, { sel: s.sel === f.id, done: state.caught[f.id], act: 'fish' })).join('')}</div>` : `<p class="empty">${T('Ningún pez coincide. Probá con otra hora, clima o zona.')}</p>`}
        ${trap.length ? `<h3>${T('Con nasa')}</h3><div class="grid">${trap.map(f => slot(f.id, { sel: s.sel === f.id, done: state.caught[f.id], act: 'fish' })).join('')}</div>` : ''}`;
      $('#fpanel', v).innerHTML = fishPanel(D.fish.find(f => f.id === s.sel));
    };
    draw();
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-fs]'); if (b) { s.season = b.dataset.fs === 'all' ? 'all' : Number(b.dataset.fs); $$('[data-fs]', v).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); return; }
      const f = e.target.closest('[data-act=fish]'); if (f) { s.sel = f.dataset.id; draw(); }
    });
    v.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'fh') { s.hide = t.checked; draw(); }
      if (t.dataset.catch) { if (t.checked) state.caught[t.dataset.catch] = 1; else delete state.caught[t.dataset.catch]; save(); draw(); }
      if (t.dataset.pf) { state.farm[t.dataset.pf] = t.checked; save(); draw(); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'fq') { s.q = e.target.value; draw(); } });
    v.addEventListener('ddchange', e => { s[e.detail.id] = e.detail.value; draw(); });
  },
};
