// Artesanales: qué hace cada máquina, cuánto vale lo que sale y qué conviene hacer con lo que tenés.
// Reglas y tiempos salen de Data/Machines; los precios con sabor, de fórmulas del código (ver nota manual).
const maquinasPartida = () => partida()?.maquinas || null;
const caskDias = r => Math.ceil(56 / r.aging);
const FORMULA = { Wine: T('×3 el precio de la fruta'), Juice: T('×2,25 el precio del ingrediente'), Jelly: T('×2 + 50 el precio de la fruta'), Pickle: T('×2 + 50 el precio del ingrediente'), DriedFruit: T('×7,5 + 25 el precio de la fruta'), DriedMushroom: T('×7,5 + 25 el precio del hongo'), SmokedFish: T('×2 el precio del pez'), AgedRoe: T('×2 el precio de la hueva'), Honey: T('100 + ×2 el precio de la flor') };
const conArtesano = (v, out) => state.farm.artisan && obj(out)?.c === -26 ? Math.floor(v * 1.4) : v;
function nombreSabor(r, inId) {
  const t = D.flavNames[r.flav];
  if (r.flav === 'Honey' && !inId) return D.flavNames.HoneyWild || obj(r.out).n;
  return t && inId ? t.replace('{0}', obj(inId).n).trim() : obj(r.out)?.n || '';
}
// Valor de venta de lo que sale en una tanda, en la calidad que da la máquina y con la profesión Artesano si la tenés.
function artValor(r, inId) {
  const p = inId ? obj(inId)?.p || 0 : 0;
  if (r.aging) return conArtesano(Math.floor(p * Calc.QUALITY[3]), inId);  // tonel: hasta calidad iridio
  let v;
  switch (r.flav) {
    case 'Wine': v = Math.floor(p * 3); break;
    case 'Juice': v = Math.floor(p * 2.25); break;
    case 'Jelly': case 'Pickle': v = p * 2 + 50; break;
    case 'DriedFruit': case 'DriedMushroom': v = Math.floor(p * 7.5) + 25; break;
    case 'SmokedFish': v = p * 2; break;
    case 'Honey': v = inId ? 100 + p * 2 : 100; break;
    case 'AgedRoe': v = p * 2; break;
    default: v = r.out ? obj(r.out).p : 0;
  }
  return conArtesano(Math.floor(v * Calc.QUALITY[r.q || 0]), r.out) * r.stack;
}
function artTiempo(r) {
  if (r.aging) return T('{n} días hasta iridio', { n: caskDias(r) });
  if (r.days > 0) return r.days === 1 ? T('1 día') : T('{n} días', { n: r.days });
  if (r.min > 0 && r.min < 1440) { const h = Math.floor(r.min / 60), m = r.min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`; }
  if (r.min > 0) { const d = Math.round(r.min / 1440); return '≈ ' + (d === 1 ? T('1 día') : T('{n} días', { n: d })); }
  return '';
}
const COLMENA = () => D.artisan.find(m => m.rules.some(r => r.flav === 'Honey'));
// Todo lo que se puede hacer con un objeto, de lo que más paga por unidad a lo que menos.
function opciones(id) {
  const out = [];
  for (const m of D.artisan) {
    const r = m.rules.find(x => !x.only && x.inp.includes(id)); if (!r) continue;
    const valor = artValor(r, id);
    out.push({ m, r, valor, unidad: valor / r.n });
  }
  if (D.flowers.includes(id)) { const m = COLMENA(), r = m.rules[0]; out.push({ m, r, valor: artValor(r, id), unidad: artValor(r, id), flor: true }); }
  return out.sort((a, b) => b.unidad - a.unidad);
}
const ENTRADAS = () => [...new Set([...D.artisan.flatMap(m => m.rules.filter(r => !r.only).flatMap(r => r.inp)), ...D.flowers])].filter(i => obj(i));
function productoHtml(o, id) {
  const { m, r } = o;
  if (r.aging) return `${itemSpr(id, 2)} ${esc(obj(id).n)} ${qStar(3)}`;
  return `${itemSpr(r.out, 2)} ${esc(r.flav ? nombreSabor(r, id) : obj(r.out).n)}${r.stack > 1 ? ` × ${r.stack}` : ''}${r.q ? ` ${qStar(r.q)}` : ''}`;
}
function conLoQueTenes() {
  const rows = [];
  for (const [id, n] of Object.entries(inv())) {
    if (!obj(id)) continue;
    const op = opciones(id).find(o => !o.flor); if (!op) continue;
    const tandas = Math.floor(n / op.r.n), gana = op.valor - obj(id).p * op.r.n;
    if (tandas < 1 || gana <= 0) continue;
    rows.push({ id, n, op, gana, total: tandas * gana });
  }
  return rows.sort((a, b) => b.total - a.total).slice(0, 15);
}
function maqTengo(m) { const M = maquinasPartida(); return M ? M[m.id] || 0 : null; }
function panelItem(id) {
  const o = obj(id), ops = opciones(id), hay = !!partida()?.inventario;
  const filas = ops.map(op => { const dif = Math.floor(op.unidad) - o.p, t = maqTengo(op.m);
    return `<div class="opc"><div>${productoHtml(op, id)}<div class="small muted">${esc(op.m.name)} · ${artTiempo(op.r)}${op.r.n > 1 ? ` · ${T('con {n} unidades', { n: op.r.n })}` : ''}${op.flor ? ` · ${T('la flor no se gasta: tiene que estar plantada cerca')}` : ''}${t === 0 ? ` <span class="tag">${T('no tenés la máquina')}</span>` : ''}</div></div>
      <div class="n">${gold(Math.floor(op.unidad))}<div class="small ${dif > 0 ? 'pos' : 'neg'}">${dif > 0 ? '+' : ''}${num(dif)}</div></div></div>`; }).join('');
  return `<div class="item-row">${slot(id)}<div><h2 style="margin:0">${esc(o.n)}</h2><span class="small muted">${T('Venta directa')} ${gold(o.p)}${hay ? T(' · tenés {n}', { n: tengo(id) }) : ''}</span></div></div>
    ${ops.length ? `<h3>${T('Qué podés hacer')}</h3>${filas}
      <p class="small muted">${T('Valor de venta por cada unidad de {x} que ponés, en calidad normal{a}; debajo, cuánto ganás o perdés contra venderlo directo.', { x: esc(o.n), a: state.farm.artisan ? T(' y con {p}', { p: esc(D.prof.Artisan.name) }) : '' })}</p>` : `<p>${T('Ninguna máquina artesanal lo procesa.')}</p>`}
    <p><button type="button" class="btn mini" data-ficha="${esc(id)}">${T('Cómo conseguir {x}', { x: esc(o.n) })}</button></p>`;
}
function reglaHtml(m, r) {
  const ej = r.inp.length ? r.inp.reduce((a, i) => (artValor(r, i) > artValor(r, a) ? i : a), r.inp[0]) : null;
  const entradas = r.only ? `<span>${itemSpr('812', 2)} ${esc((D.flavNames.Roe || '{0}').replace('{0}', obj(r.only).n))}</span>`
    : r.inp.length && r.inp.length <= 4 ? `<span class="grid">${r.inp.map(i => slot(i, { n: r.n })).join('')}</span>`
    : r.inp.length ? `<details><summary>${esc(r.labels.join(T(' o ')) || T('Varios'))} (${r.inp.length})${r.n > 1 ? ` × ${r.n}` : ''}</summary><div class="grid">${r.inp.map(i => slot(i)).join('')}</div></details>` : '';
  let sale, precio;
  if (r.aging) { sale = T('Añeja hasta {q} iridio', { q: qStar(3) }); precio = `${T('{n} días', { n: caskDias(r) })} · ${T('precio ×2')}${ej ? ` (${gold(artValor(r, ej))})` : ''}`; }
  else if (r.flav === 'Honey') {
    sale = `${itemSpr(r.out, 2)} ${esc(obj(r.out).n)}`;
    precio = `${T('Cada {n} días', { n: r.days })}${r.noWinter ? T(', menos en invierno') : ''}. ${T('Sin flores cerca:')} ${esc(nombreSabor(r))} ${gold(artValor(r))}.`;
    return `<div class="regla"><div>${sale}</div><div class="small">${precio}<div class="grid" style="margin-top:4px">${D.flowers.map(f => `<button type="button" class="slot" data-ai="${esc(f)}" data-tip="t:${esc(nombreSabor(r, f))}: ${num(artValor(r, f))} ${T('oro')}" aria-label="${esc(nombreSabor(r, f))}">${itemSpr(f, 3)}</button>`).join('')}</div></div></div>`;
  } else {
    sale = r.out ? `${itemSpr(r.out, 2)} ${esc(r.flav ? nombreSabor(r, r.inp.length === 1 ? r.inp[0] : null) : obj(r.out).n)}${r.stack > 1 ? ` × ${r.stack}` : ''}${r.q ? ` ${qStar(r.q)}` : ''}` : '';
    precio = `${artTiempo(r)} · ${r.flav ? `${FORMULA[r.flav] || ''}${ej && r.inp.length > 1 ? ` (${T('máx.:')} ${esc(obj(ej).n)}, ${gold(artValor(r, ej))})` : ej ? ` (${gold(artValor(r, ej))})` : ''}` : gold(artValor(r, r.only || r.inp[0]))}`;
  }
  return `<div class="regla"><div>${entradas}</div><div><span class="arrow">${ui('right', 24, 22)}</span> ${sale}<div class="small muted">${precio}</div></div></div>`;
}
function panelMaquina(m) {
  const rec = D.recipes.find(r => r.key === m.recipe), k = rec ? sabida(rec) : null, t = maqTengo(m);
  return `<div class="item-row"><span class="slot">${spr('big', m.s[0], m.s[1], 16, 32, 2)}</span><div><h2 style="margin:0">${esc(m.name)}</h2>${t != null ? `<span class="small muted">${T('Tenés {n}', { n: t })}</span>` : ''}</div></div>
    ${m.desc ? `<p class="small">${esc(m.desc)}</p>` : ''}
    ${m.extra.length ? `<p class="small">${T('Cada tanda usa además')} ${m.extra.map(([i, n]) => `${n} × <button type="button" class="link" data-ficha="${esc(i)}">${esc(obj(i).n)}</button>`).join(', ')}.</p>` : ''}
    ${rec ? `<p class="small">${k ? T('Ya sabés fabricarla.') : k === false ? T('Todavía no sabés fabricarla.') : ''} <button type="button" class="btn mini" data-ir-receta="${esc(rec.key)}">${T('Ver la receta')}</button></p>${k ? '' : recetaComo(rec).map(x => `<p class="small">${x}</p>`).join('')}` : ''}
    <h3>${T('Qué procesa')}</h3>${m.rules.map(r => reglaHtml(m, r)).join('')}
    ${['precios', 'tiempo', ...(m.rules.some(r => r.aging) ? ['barrica'] : [])].map(n => D.artNotes[n] ? `<p class="small manual">${esc(D.artNotes[n])} ${T('(nota manual)')}</p>` : '').join('')}`;
}
TABS.artesanales = {
  label: T('Artesanales'), icon: () => spr('big', 64, 32, 16, 32, 1),
  render(v) {
    const s = state._art ||= { sel: 'm:12', q: '' };
    const hay = !!partida()?.inventario, entradas = ENTRADAS();
    const draw = () => {
      const [k, id] = s.sel.split(/:(.*)/s);
      const top = hay ? conLoQueTenes() : [];
      v.innerHTML = `<div class="split"><section>
        <div class="bar-filters"><label class="field" style="width:300px"><span>${T('¿Qué hago con…?')}</span><input class="input" id="aq" value="${esc(s.q)}" placeholder="${T('Uva, leche, salmón…')}" autocomplete="off"></label>
          <label class="chk" data-tip="t:${esc(D.prof.Artisan.desc)}"><input type="checkbox" id="aart" ${state.farm.artisan ? 'checked' : ''}><i></i>${esc(D.prof.Artisan.name)}</label></div>
        <div id="ares"></div>
        <h2>${T('Máquinas')}</h2><div class="maqs">${D.artisan.map(m => { const t = maqTengo(m), rec = D.recipes.find(r => r.key === m.recipe), kk = rec ? sabida(rec) : null;
          return `<button type="button" class="btn maq${k === 'm' && id === m.id ? ' on' : ''}" data-maq="${esc(m.id)}">${spr('big', m.s[0], m.s[1], 16, 32, 2)}<span>${esc(m.name)}<span class="small muted">${t ? T('Tenés {n}', { n: t }) : kk === false ? T('Sin receta') : kk ? T('Sabés la receta') : ''}</span></span></button>`; }).join('')}</div>
        ${hay ? `<h2 style="margin-top:12px">${T('Con lo que tenés')}</h2><p class="small muted">${T('Lo que más gana si lo procesás en vez de venderlo directo, según lo que hay en la mochila, los cofres y la heladera.')}</p>
          ${top.length ? `<table class="art-tabla"><thead><tr><th></th><th class="nom">${T('Objeto')}</th><th>${T('Mejor opción')}</th><th class="n">${T('Ganás de más')}</th></tr></thead><tbody>${top.map(x => `<tr data-ai="${esc(x.id)}"${k === 'i' && id === x.id ? ' class="sel"' : ''}><td>${slot(x.id, { n: x.n, act: 'ai' })}</td><td class="nom">${esc(obj(x.id).n)}</td><td class="small">${esc(x.op.m.name)}: ${productoHtml(x.op, x.id)}${maqTengo(x.op.m) === 0 ? ` <span class="tag">${T('no tenés la máquina')}</span>` : ''}</td><td class="n">${gold(x.total)}</td></tr>`).join('')}</tbody></table>`
          : `<p class="small">${T('Nada de lo que tenés gana más procesado.')}</p>`}` : ''}
      </section><aside class="panel">${k === 'i' && obj(id) ? panelItem(id) : panelMaquina(D.artisan.find(m => m.id === id) || D.artisan[0])}</aside></div>`;
      dibujaRes();
    };
    const dibujaRes = () => {
      const q = norm(s.q.trim()), box = $('#ares', v);
      const l = q ? entradas.filter(i => norm(obj(i).n).includes(q)).slice(0, 30) : [];
      box.innerHTML = q ? (l.length ? `<div class="grid">${l.map(i => slot(i, { act: 'ai' })).join('')}</div>` : `<p class="small">${T('Ninguna máquina artesanal procesa algo con ese nombre.')}</p>`) : '';
    };
    draw();
    v.addEventListener('click', e => {
      const m = e.target.closest('[data-maq]'); if (m) { s.sel = 'm:' + m.dataset.maq; draw(); return; }
      const a = e.target.closest('[data-act=ai], tr[data-ai], button[data-ai]'); if (a) { s.sel = 'i:' + (a.dataset.ai || a.dataset.id); draw(); $('.panel', v).scrollTop = 0; }
    });
    v.addEventListener('input', e => { if (e.target.id === 'aq') { s.q = e.target.value; dibujaRes(); } });
    v.addEventListener('change', e => { if (e.target.id === 'aart') { state.farm.artisan = e.target.checked; save(); draw(); } });
  },
};
