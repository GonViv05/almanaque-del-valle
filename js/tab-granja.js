// Mi Granja: siembras guardadas, calendario de cosechas y resumen del día.
function plantingInfo(p) {
  const crop = D.crops.find(c => c.id === p.crop); if (!crop) return null;
  const f = fertOf(p.fert), c = { qty: p.qty, day: p.day, season: p.season, fert: p.fert, seedSrc: p.seedSrc, seedCustom: p.seedCustom, process: p.process, greenhouse: p.greenhouse, replant: p.replant };
  const r = simFor(crop, c);
  const events = r.harvestDays.map(d => { const off = Math.floor((d - 1) / 28); const s = (p.season + off) % 4; return { abs: d, season: s, year: p.year + Math.floor((p.season + off) / 4), day: d - off * 28 }; });
  return { crop, f, r, events };
}
function eventsFor(season, year, day) {
  const out = [];
  for (const p of state.plantings) { const i = plantingInfo(p); if (!i) continue; for (const e of i.events) if (e.season === season && e.year === year && (day == null || e.day === day)) out.push({ p, i, e }); }
  return out;
}
const cropBySeed = id => D.crops.find(c => c.id === id);
// Cosechas de lo que está plantado en la partida; los rebrotes se repiten hasta fin de mes.
function realHarvestsOn(season, year, day) {
  const P = partida(), out = [];
  if (!P || season !== P.fecha.s || year !== P.fecha.y) return out;
  for (const c of P.cultivos) {
    const cr = cropBySeed(c.seed); if (!cr) continue;
    for (let d = P.fecha.d + c.falta; d <= day; d += cr.regrow) { if (d === day) out.push({ crop: cr, n: c.n }); if (cr.regrow <= 0) break; }
  }
  return out;
}
function noLlega(c, cr, P) { return c.loc === 'Farm' && c.falta > Calc.seasonsAvailable(cr, P.fecha.s) * 28 - P.fecha.d; }
function realCrops() {
  const P = partida(); if (!P) return '';
  const g = new Map();
  for (const c of P.cultivos) { const k = c.seed + '|' + c.falta; if (g.has(k)) g.get(k).n += c.n; else g.set(k, { ...c }); }
  const rows = [...g.values()].map(c => { const cr = cropBySeed(c.seed); if (!cr) return ''; const when = P.fecha.d + c.falta; return `<tr><td data-tip="o:${cr.item}">${itemSpr(cr.item, 2)}</td><td>${esc(cr.name)}</td><td class="n">${c.n}</td><td>${c.falta === 0 ? T('Lista hoy') : T('En {n} {d}', { n: c.falta, d: c.falta === 1 ? T('día') : T('días') }) + (when <= 28 ? T(' (día {d})', { d: when }) : '')}</td><td>${noLlega(c, cr, P) ? `<span class="neg small">${T('No llega antes de fin de estación')}</span>` : ''}</td></tr>`; }).join('');
  const total = P.cultivos.reduce((a, c) => a + c.n, 0);
  return `<h2>${T('En tu granja')}</h2><p class="small muted">${T('Partida {g}: {n} plantas{m}. Se actualiza sola cada vez que dormís.', { g: esc(P.granja), n: total, m: P.muertos ? T(', {n} muertas', { n: P.muertos }) : '' })}</p>
    ${rows ? `<table><thead><tr><th></th><th>${T('Cultivo')}</th><th class="n">${T('Cant.')}</th><th>${T('Cosecha')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="empty">${T('No hay nada plantado.')}</p>`}
    <h2 style="margin-top:14px">${T('Plan de siembras')}</h2>`;
}
function birthdaysOn(season, day) { return D.villagers.filter(v => v.bs === season && v.bd === day); }
const portraitMini = (v, z = 1, tip = T('Cumpleaños de {n}', { n: esc(v.name) })) => `<i class="ui" data-tip="t:${tip}" style="width:${32 * z}px;height:${32 * z}px;background-image:url(assets/portraits/${esc(v.tex)}.png);background-size:${v.pw / 2 * z}px auto"></i>`;
function farmCalendar() {
  const cells = [];
  for (let d = 1; d <= 28; d++) {
    const ev = eventsFor(state.season, state.year, d); const bd = birthdaysOn(state.season, d);
    const grouped = new Map(); for (const x of ev) grouped.set(x.i.crop.item, (grouped.get(x.i.crop.item) || 0) + x.p.qty);
    for (const x of realHarvestsOn(state.season, state.year, d)) grouped.set(x.crop.item, (grouped.get(x.crop.item) || 0) + x.n);
    cells.push(`<div class="day${d === state.day ? ' today' : ''}"><button type="button" class="n" data-day="${d}" aria-label="${T('Ir al día {d}', { d })}">${d}</button><div class="evs">${[...grouped].map(([id, q]) => `<span data-tip="t:${T('Cosechar {x} ({n} plantas)', { x: esc(obj(id).n), n: q })}">${itemSpr(id, 2)}</span>`).join('')}${bd.map(v => portraitMini(v)).join('')}</div></div>`);
  }
  return `<div class="cal">${DOW.map(d => `<b>${d.slice(0, 3)}</b>`).join('')}${cells.join('')}</div>`;
}
function todayPanel() {
  const ev = eventsFor(state.season, state.year, state.day), bd = birthdaysOn(state.season, state.day), real = realHarvestsOn(state.season, state.year, state.day);
  const man = state.day < 28 ? birthdaysOn(state.season, state.day + 1) : birthdaysOn((state.season + 1) % 4, 1);
  const cumple = (v, t) => `<h3>${t}</h3><div class="item-row">${portraitMini(v, 2)}<span>${T('{n} ama: {l}', { n: esc(v.name), l: v.personal.love.slice(0, 3).map(i => esc(obj(i)?.n || i)).join(', ') })}</span></div>`;
  const next = []; for (let d = state.day + 1; d <= 28 && next.length < 4; d++) { const e = eventsFor(state.season, state.year, d); if (e.length) next.push([d, e]); }
  const fishNow = D.fish.filter(f => !f.trap && fishIn(f, state.season)).length;
  const crops = D.crops.filter(c => c.seasons.includes(state.season)).length;
  return `<h2>${T('{d} de {s}', { d: state.day, s: SEASONS[state.season] })}</h2>
    ${ev.length || real.length ? `<h3>${T('Para cosechar hoy')}</h3>${real.map(x => `<div class="item-row">${itemSpr(x.crop.item, 2)}<span>${esc(x.crop.name)} × ${x.n}</span></div>`).join('')}${ev.map(x => `<div class="item-row">${itemSpr(x.i.crop.item, 2)}<span>${esc(x.i.crop.name)} × ${x.p.qty} <span class="small muted">${T('(plan)')}</span></span></div>`).join('')}` : `<p>${T('Hoy no hay cosechas programadas.')}</p>`}
    ${bd.map(v => cumple(v, T('Hoy cumple'))).join('')}${man.map(v => cumple(v, T('Mañana cumple'))).join('')}
    ${next.length ? `<h3>${T('Próximas cosechas')}</h3>${next.map(([d, e]) => `<p class="small">${T('Día {d}: {l}', { d, l: [...new Set(e.map(x => x.i.crop.name))].map(esc).join(', ') })}</p>`).join('')}` : ''}
    <h3>${T('En esta estación')}</h3><p class="small">${T('{c} cultivos para plantar y {f} peces disponibles.', { c: crops, f: fishNow })}</p>`;
}
function plantingList() {
  if (!state.plantings.length) return `<p class="empty">${T('Todavía no cargaste siembras. Agregá la primera con este formulario o desde la calculadora de Cultivos.')}</p>`;
  let cost = 0, rev = 0;
  const rows = state.plantings.map(p => {
    const i = plantingInfo(p); if (!i) return ''; cost += i.r.cost; rev += i.r.revenue;
    const next = i.events.find(e => e.year > state.year || (e.year === state.year && (e.season > state.season || (e.season === state.season && e.day >= state.day))));
    return `<tr><td data-tip="o:${i.crop.item}">${itemSpr(i.crop.item, 2)}</td><td>${esc(i.crop.name)}</td><td class="n">${p.qty}</td><td>${p.day} ${seasonIcon(p.season, 2)} ${T('año {y}', { y: p.year })}</td><td>${esc(i.f?.name || '—')}</td><td>${next ? `${next.day} ${seasonIcon(next.season, 2)}` : T('Terminada')}</td><td class="n">${i.r.harvests}</td><td class="n ${i.r.net >= 0 ? 'pos' : 'neg'}">${num(i.r.net)}</td><td><button type="button" class="btn" data-del="${p.id}" aria-label="${T('Borrar siembra de {x}', { x: esc(i.crop.name) })}">${T('Borrar')}</button></td></tr>`;
  }).join('');
  return `<table><thead><tr><th></th><th>${T('Cultivo')}</th><th class="n">${T('Cant.')}</th><th>${T('Sembrado')}</th><th>${T('Abono')}</th><th>${T('Próx. cosecha')}</th><th class="n">${T('Cosechas')}</th><th class="n">${T('Neto')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <div class="row between sum"><span>${T('Inversión:')} ${gold(cost)}</span><span>${T('Ingreso estimado:')} ${gold(rev)}</span><span class="big ${rev - cost >= 0 ? 'pos' : 'neg'}">${num(rev - cost)}</span></div>`;
}
TABS.granja = {
  label: T('Mi Granja'), icon: () => itemSpr('472', 2),
  render(v) {
    const noY2 = c => !c.sources.some(s => s.cond.some(x => x.year));
    const form = state._form ||= { crop: D.crops.find(c => c.seasons.includes(state.season) && noY2(c))?.id, qty: 15, fert: '' };
    const avail = D.crops.filter(c => c.seasons.includes(state.season));
    if (!avail.some(c => c.id === form.crop)) form.crop = (avail.find(noY2) || avail[0])?.id;
    v.innerHTML = `<div class="split"><section>
      ${realCrops()}${partida() ? '' : `<h2>${T('Siembras')}</h2>`}
      <div class="bar-filters">
        <label class="field"><span>${T('Cultivo de {s}', { s: lc(SEASONS[state.season]) })}</span>${dd('crop', avail.map(c => [c.id, c.name]), form.crop, T('Cultivo'))}</label>
        <label class="field" style="width:130px"><span>${T('Cantidad')}</span><input class="input" id="pq" type="number" min="1" value="${form.qty}"></label>
        <label class="field"><span>${T('Abono')}</span>${dd('fert', [['', T('Ninguno')], ...D.fert.map(f => [f.id, f.name])], form.fert, T('Abono'))}</label>
        <button type="button" class="btn" id="padd">${T('Sembrar el día {d}', { d: state.day })}</button>
      </div>
      <div id="plist">${plantingList()}</div>
      <h2 style="margin-top:14px">${T('Calendario de {s}', { s: lc(SEASONS[state.season]) })}</h2>
      <div id="fcal">${farmCalendar()}</div>
    </section><aside class="panel" id="fday">${todayPanel()}</aside></div>`;
    v.addEventListener('ddchange', e => { form[e.detail.id] = e.detail.value; });
    v.addEventListener('input', e => { if (e.target.id === 'pq') form.qty = e.target.value; });
    v.addEventListener('click', e => {
      if (e.target.closest('#padd')) { if (!form.crop) return; state.plantings.push({ id: Date.now(), crop: form.crop, qty: Math.max(1, Number(form.qty) || 1), day: state.day, season: state.season, year: state.year, fert: form.fert || null, seedSrc: 'auto', seedCustom: 0, process: 'raw', greenhouse: false, replant: true }); save(); render(); return; }
      const del = e.target.closest('[data-del]'); if (del) { state.plantings = state.plantings.filter(p => String(p.id) !== del.dataset.del); save(); render(); return; }
      const dy = e.target.closest('[data-day]'); if (dy) { state.day = Number(dy.dataset.day); save(); renderHud(); render(); }
    });
  },
};
