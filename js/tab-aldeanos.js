// Aldeanos: gustos, cumpleaños, zonas y agenda completa.
const TASTE = [['love', T('Le encanta')], ['like', T('Le gusta')], ['dislike', T('No le gusta')], ['hate', T('Odia')]];
function villagerPanel(v, s) {
  if (!v) return `<p class="empty">${T('Elegí un aldeano para ver sus gustos y por dónde anda.')}</p>`;
  const list = v.gift[s.taste] || [];
  const personalIds = new Set(v.personal[s.taste] || []);
  const personal = list.filter(i => personalIds.has(i)), rest = list.filter(i => !personalIds.has(i));
  const sch = v.sched.find(x => x.key === s.sched) || v.sched.find(x => x.key === SKEYS[state.season]) || v.sched[0];
  return `<div class="vcard"><i class="ui portrait" style="background-image:url(assets/portraits/${esc(v.tex)}.png);background-size:${v.pw * 3}px auto"></i><div>
    <h2>${esc(v.name)}</h2>
    <p>${T('Cumpleaños: {d} de {s}', { d: v.bd, s: SEASONS[v.bs] })} ${seasonIcon(v.bs, 2)}</p>
    <p>${T('Vive en: {l}', { l: esc(v.home || '—') })}</p>
    ${v.romance ? `<p>${ui('heart', 21, 18)} ${T('Se puede cortejar')}</p>` : ''}
  </div></div>
  <h3>${T('Zonas que frecuenta')}</h3>
  ${v.zones.length ? v.zones.map(z => `<div class="zone small"><span>${esc(z.n)}${z.home ? ` ${T('(casa)')}` : ''}</span><div class="track"><div class="fill" style="width:${z.pct}%"></div></div><span>${z.pct}%</span></div>`).join('') : `<p class="small">${T('No tiene agenda de movimientos: siempre está en el mismo lugar.')}</p>`}
  ${v.sched.length ? `<h3>${T('Agenda')}</h3>${dd('sched', v.sched.map(x => [x.key, x.label]), sch.key, T('Agenda'))}<div class="tline small" style="margin-top:6px">${sch.rows.map(r => `<span>${Math.floor(r.t / 100)}:${String(r.t % 100).padStart(2, '0')}</span><span>${esc(r.loc || '—')}${r.bed ? T(' (a dormir)') : ''}</span>`).join('')}</div>` : ''}
  <h3>${T('Regalos')}</h3>
  <div class="row">${TASTE.map(([k, l]) => `<button type="button" class="btn" data-t="${k}" aria-pressed="${s.taste === k}">${l}</button>`).join('')}</div>
  ${personal.length ? `<h3>${T('Personales')}</h3><div class="grid">${personal.map(i => slot(i)).join('')}</div>` : ''}
  ${rest.length ? `<details ${s.taste === 'love' ? 'open' : ''}><summary class="small muted">${T('Por gustos universales o categoría ({n})', { n: rest.length })}</summary><div class="grid">${rest.map(i => slot(i)).join('')}</div></details>` : ''}
  ${s.taste !== 'love' ? '' : `<p class="small muted">${T('Sin agregar a la lista: {n} objetos que le resultan neutros.', { n: v.gift.neutralN })}</p>`}`;
}
const SKEYS = ['spring', 'summer', 'fall', 'winter'];
TABS.aldeanos = {
  label: T('Aldeanos'), icon: () => ui('heart', 28, 24),
  render(v) {
    const s = state._vil ||= { sel: 'Abigail', taste: 'love', sched: null, q: '', birth: false };
    v.innerHTML = `<div class="split"><section>
      <div class="bar-filters"><label class="field" style="width:280px"><span>${T('Buscar')}</span><input class="input" id="vq" value="${esc(s.q)}" placeholder="${T('Nombre')}"></label>
      <label class="chk"><input type="checkbox" id="vb" ${s.birth ? 'checked' : ''}><i></i>${T('Cumplen en {s}', { s: lc(SEASONS[state.season]) })}</label></div>
      <div id="vlist" class="anim" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))"></div></section><aside class="panel" id="vpanel"></aside></div>`;
    const draw = () => {
      const q = s.q.toLowerCase();
      const list = D.villagers.filter(x => (!q || x.name.toLowerCase().includes(q)) && (!s.birth || x.bs === state.season));
      $('#vlist', v).innerHTML = list.length ? list.map(x => `<button type="button" class="btn${x.id === s.sel ? ' on' : ''}" data-v="${esc(x.id)}" style="flex-direction:column;height:auto;width:100%"><i class="ui" style="width:96px;height:96px;background-image:url(assets/portraits/${esc(x.tex)}.png);background-size:${x.pw * 1.5}px auto"></i><span>${esc(x.name)}</span><span class="small muted">${LANG === 'en' ? `${SEASONS[x.bs]} ${x.bd}` : `${x.bd} ${SEASONS[x.bs]}`}</span></button>`).join('') : `<p class="empty">${T('Ningún aldeano coincide con la búsqueda.')}</p>`;
      $('#vpanel', v).innerHTML = villagerPanel(D.villagers.find(x => x.id === s.sel), s);
    };
    draw();
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (b && b.classList.contains('btn')) { s.sel = b.dataset.v; s.sched = null; draw(); return; }
      const t = e.target.closest('[data-t]'); if (t) { s.taste = t.dataset.t; draw(); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'vq') { s.q = e.target.value; draw(); } });
    v.addEventListener('change', e => { if (e.target.id === 'vb') { s.birth = e.target.checked; draw(); } });
    v.addEventListener('ddchange', e => { if (e.detail.id === 'sched') { s.sched = e.detail.value; draw(); } });
  },
};
