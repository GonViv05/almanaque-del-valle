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
  if (!f) return `<p class="empty">Elegí un pez para ver dónde y cuándo pescarlo.</p>`;
  const use = bundleUse[f.id], lov = lovers(f.id);
  const body = f.trap ? `<dl class="kv"><dt>Se atrapa con</dt><dd>Nasa</dd><dt>Agua</dt><dd>${f.water === 'ocean' ? 'Mar' : 'Agua dulce'}</dd></dl>` : `
    <h3>Dónde</h3>${f.where.map(w => `<div class="item-row"><span>${esc(w.loc)}${w.area ? ` (${esc(w.area)})` : ''} · ${zoneSeasons(w.ss)}${w.lvl ? ` · nivel ${w.lvl}` : ''}${w.cond?.some(c => c.quest) ? ' · misión de Qi' : ''}${w.boss ? ' · legendario' : ''}${w.manual ? ' <span class="manual small">(nota manual)</span>' : ''}</span></div>`).join('') || '<p>El juego no registra una zona fija.</p>'}
    <dl class="kv"><dt>Horario</dt><dd>${hourRange(f.times)}</dd><dt>Estación</dt><dd>${f.seasons.map(s => seasonIcon(s, 2)).join(' ')}${f.where.some(w => w.isl) ? ' <span class="tag">isla: todo el año</span>' : ''}</dd><dt>Clima</dt><dd>${WEATHER[f.weather]}</dd><dt>Nivel mínimo</dt><dd>${f.lvl}</dd><dt>Dificultad</dt><dd>${f.diff} · ${f.beh}</dd><dt>Tamaño</dt><dd>${f.minS}–${f.maxS} pulgadas</dd></dl>`;
  return `<div class="row between"><h2>${esc(f.name)}</h2>${itemSpr(f.id, 3)}</div><p class="small muted">${esc(f.desc)}</p>${body}
    <h3>Precio</h3><div class="row">${fishPrices(f)}</div>
    <div class="row" style="margin-top:6px"><label class="chk" data-tip="t:${esc(D.prof.Fisher.desc)}"><input type="checkbox" data-pf="fisher" ${state.farm.fisher ? 'checked' : ''}><i></i>${esc(D.prof.Fisher.name)}</label><label class="chk" data-tip="t:${esc(D.prof.Angler.desc)}"><input type="checkbox" data-pf="angler" ${state.farm.angler ? 'checked' : ''}><i></i>${esc(D.prof.Angler.name)}</label></div>
    ${use ? `<h3>Lote</h3><p class="small">${esc(use.join(', '))}</p>` : ''}
    ${lov.length ? `<h3>Le encanta a</h3><div class="row">${lov.map(v => portraitMini(v).replace('Cumpleaños de ', '')).join('')}</div>` : ''}
    <div class="sum"><label class="chk"${partida() ? ' data-tip="t:Sale de tu partida"' : ''}><input type="checkbox" data-catch="${f.id}" ${state.caught[f.id] ? 'checked' : ''}${partida() ? ' disabled' : ''}><i></i>Ya lo pesqué</label></div>`;
}
TABS.peces = {
  label: 'Peces', icon: () => itemSpr('128', 2),
  render(v) {
    const s = state._fish ||= { season: state.season, weather: 'any', hour: 'any', loc: 'all', q: '', hide: false, trap: true, sel: null };
    const locs = [...new Set(D.fish.flatMap(f => (f.where || []).map(w => w.loc)))].sort((a, b) => a.localeCompare(b, 'es'));
    const hours = [['any', 'Cualquier hora'], ...[600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400].map(h => [h, `${h / 100 >= 24 ? h / 100 - 24 : h / 100}:00`])];
    v.innerHTML = `<div class="split"><section>
      <div class="bar-filters">${seasonBar('fs', s.season, true)}
        <label class="field"><span>Clima</span>${dd('weather', [['any', 'Cualquiera'], ['sunny', 'Soleado'], ['rainy', 'Lluvia']], s.weather, 'Clima')}</label>
        <label class="field"><span>Hora</span>${dd('hour', hours, s.hour, 'Hora')}</label>
        <label class="field"><span>Zona</span>${dd('loc', [['all', 'Todas'], ...locs.map(l => [l, l])], s.loc, 'Zona')}</label>
        <label class="field" style="width:220px"><span>Buscar</span><input class="input" id="fq" value="${esc(s.q)}" placeholder="Nombre"></label>
        <label class="chk"><input type="checkbox" id="fh" ${s.hide ? 'checked' : ''}><i></i>Ocultar atrapados</label>
      </div><div id="flist"></div></section><aside class="panel" id="fpanel"></aside></div>`;
    const draw = () => {
      const list = D.fish.filter(f => fishMatches(f, s)); const rod = list.filter(f => !f.trap), trap = list.filter(f => f.trap);
      const cnt = D.fish.filter(f => state.caught[f.id]).length;
      $('#flist', v).innerHTML = `<p class="small muted">${list.length} resultados. Registrados: ${cnt} de ${D.fish.length}.</p>
        ${rod.length ? `<div class="grid">${rod.map(f => slot(f.id, { sel: s.sel === f.id, done: state.caught[f.id], act: 'fish' })).join('')}</div>` : '<p class="empty">Ningún pez coincide. Probá con otra hora, clima o zona.</p>'}
        ${trap.length ? `<h3>Con nasa</h3><div class="grid">${trap.map(f => slot(f.id, { sel: s.sel === f.id, done: state.caught[f.id], act: 'fish' })).join('')}</div>` : ''}`;
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
