// Centro Cívico: salas, lotes, progreso y cómo conseguir cada objeto.
const bKey = (r, b) => `${r.id}/${b.id}`;
function bundleDone(r, b) { const m = state.bundles[bKey(r, b)] || {}; return Object.keys(m).filter(k => m[k]).length; }
function bundleIcon(b, z = 2) { const i = Number(b.id); return spr('junimo', (i % 20) * 32, 180 + Math.floor(i / 20) * 32, 32, 32, z); }
function bundlePanel(r, b) {
  if (!b) return `<p class="empty">${T('Elegí un lote para ver qué pide y cómo conseguirlo.')}</p>`;
  const m = state.bundles[bKey(r, b)] || {}, done = bundleDone(r, b), ro = lotesDeLaPartida() ? ' disabled' : '';
  const rw = b.reward ? (b.reward.kind === 'b' ? `${b.reward.s ? spr('big', b.reward.s[0], b.reward.s[1], 16, 32, 2) : ''} ${esc(b.reward.name)} × ${b.reward.n}` : `${itemSpr(b.reward.id, 2)} ${esc(b.reward.name)} × ${b.reward.n}`) : '—';
  return `<div class="row between"><h2>${esc(b.name)}</h2>${bundleIcon(b, 2)}</div>
    <p>${T('{d} de {n} entregados', { d: done, n: b.slots })}${b.slots < b.items.length ? T(' (elegís {n} de {t})', { n: b.slots, t: b.items.length }) : ''}</p>
    <div class="item-row">${T('Recompensa:')} ${rw}</div>
    <h3>${T('Qué pide')}</h3>
    ${b.items.map((it, i) => it.gold ? `<label class="chk"><input type="checkbox" data-b="${i}" ${m[i] ? 'checked' : ''}${ro}><i></i>${gold(it.gold)}</label><div class="how">${T('Se paga con oro.')}</div>` : `<div class="item-row"><label class="chk"><input type="checkbox" data-b="${i}" ${m[i] ? 'checked' : ''}${ro}><i></i></label>${slot(it.id, { n: it.n, q: it.q })}<span>${esc(obj(it.id).n)}${it.n > 1 ? ` × ${it.n}` : ''}${it.q ? ` <span class="small muted">${T('(calidad {q} o mejor)', { q: ['', T('plata'), T('oro'), T('iridio')][it.q] })}</span>` : ''}</span></div><div class="how">${howTo(it.id).join(' ')}</div>`).join('')}`;
}
function remixHtml() {
  return D.remix.map(a => `<details><summary>${esc(a.name)}</summary>${[...a.sets.flat(), ...a.random].map(b => `<h3>${esc(b.name)} <span class="small muted">(${T('{a} de {b}', { a: b.req > 0 ? b.req : b.pick, b: b.items.length })})</span></h3><div class="grid">${b.items.filter(i => i.id).map(i => slot(i.id, { n: i.n, q: i.q })).join('')}</div>`).join('')}</details>`).join('');
}
TABS.centro = {
  label: T('Centro Cívico'), icon: () => spr('junimo', 0, 180, 32, 32, 1),
  render(v) {
    const s = state._cc ||= { room: D.rooms[0].id, bundle: D.rooms[0].bundles[0].id };
    const room = () => D.rooms.find(r => r.id === s.room);
    v.innerHTML = `<div class="split"><section><div id="crooms" class="row" role="group" aria-label="${T('Salas')}"></div><div id="cgrid"></div></section><aside class="panel" id="cpanel"></aside></div>
      <details style="margin-top:14px"><summary><h2 style="display:inline">${T('Lotes mezclados')}</h2></summary><p class="small">${T('Variantes que usa la opción avanzada de lotes mezclados. Cada partida elige una combinación propia.')}</p>${remixHtml()}</details>`;
    const draw = () => {
      const r = room(); const roomDone = x => x.bundles.filter(b => bundleDone(x, b) >= b.slots).length;
      $('#crooms', v).innerHTML = D.rooms.map(x => `<button type="button" class="btn" data-r="${esc(x.id)}" aria-pressed="${x.id === s.room}">${esc(x.name)} <span class="small muted">${roomDone(x)}/${x.bundles.length}</span></button>`).join('');
      $('#cgrid', v).innerHTML = `<div class="note" style="margin-top:8px"><div class="bundles">${r.bundles.map(b => { const d = bundleDone(r, b); return `<button type="button" class="bundle${b.id === s.bundle ? ' sel' : ''}${d >= b.slots ? ' full' : ''}" data-bd="${b.id}">${bundleIcon(b, 2)}<span>${esc(b.name)}</span><span class="prog"><i style="width:${Math.min(100, d * 100 / b.slots)}%"></i></span></button>`; }).join('')}</div></div>
        <p>${r.reward ? T('Recompensa de la sala: {r}', { r: esc(r.reward) }) : T('Esta sala se habilita al terminar las demás.')}</p>`;
      $('#cpanel', v).innerHTML = bundlePanel(r, r.bundles.find(b => b.id === s.bundle));
    };
    draw();
    v.addEventListener('click', e => {
      const a = e.target.closest('[data-r]'); if (a) { s.room = a.dataset.r; s.bundle = room().bundles[0].id; draw(); return; }
      const b = e.target.closest('[data-bd]'); if (b) { s.bundle = b.dataset.bd; draw(); }
    });
    v.addEventListener('change', e => {
      const t = e.target; if (t.dataset.b == null) return;
      const r = room(), b = r.bundles.find(x => x.id === s.bundle); const k = bKey(r, b); const m = state.bundles[k] ||= {};
      m[t.dataset.b] = t.checked; save(); draw();
    });
  },
};
