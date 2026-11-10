// Crafteos: las recetas de fabricación que ya sabés, con lo que te alcanza; las bloqueadas, a pedido.
function recetaSlot(r, s, k) {
  const cls = ['slot', r.key === s.sel && 'sel', k === false && 'locked', k && alcanza(r) > 0 && 'can'].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" data-rec="${esc(r.key)}" data-tip="t:${esc(r.name)}${k === false ? T(' (sin aprender)') : ''}" aria-label="${esc(r.name)}">${recSpr(r, 3)}${k && alcanza(r) > 0 ? digitos(alcanza(r)) : ''}</button>`;
}
TABS.crafteo = {
  label: T('Crafteos'), icon: () => spr('big', 32, 512, 16, 32, 1),
  render(v) {
    const s = state._craft ||= { sel: null, q: '', locked: false, can: false };
    const todas = D.recipes.filter(r => !r.cook), leidas = recetasLeidas();
    const draw = () => {
      const q = norm(s.q);
      const sab = todas.filter(r => sabida(r) !== false), bloq = todas.filter(r => sabida(r) === false);
      const filtra = l => l.filter(r => (!q || norm(r.name).includes(q)) && (!s.can || alcanza(r) > 0));
      const a = filtra(sab), b = s.locked ? filtra(bloq) : [];
      if (!s.sel || !todas.some(r => r.key === s.sel)) s.sel = (a[0] || b[0])?.key || null;
      v.innerHTML = `<div class="split"><section>
        <div class="bar-filters"><label class="field" style="width:280px"><span>${T('Buscar')}</span><input class="input" id="cq" value="${esc(s.q)}" placeholder="${T('Nombre')}"></label>
        ${leidas ? `<label class="chk"><input type="checkbox" id="ccan" ${s.can ? 'checked' : ''}><i></i>${T('Solo las que puedo hacer')}</label>
        <button type="button" class="btn" id="clock" aria-pressed="${s.locked}">${s.locked ? T('Ocultar las que no desbloqueaste ({n})', { n: bloq.length }) : T('Ver las que no desbloqueaste ({n})', { n: bloq.length })}</button>` : ''}</div>
        ${leidas ? `<p class="small muted">${T('Sabés {a} de {t} recetas. El número en cada casilla es cuántas podés hacer con lo que tenés.', { a: sab.length, t: todas.length })}</p>`
          : `<p class="small muted">${T('Sin partida leída: se muestran todas las recetas. Activá el vigía y dormí una vez en el juego para ver solo las tuyas.')}</p>`}
        <div class="grid">${a.map(r => recetaSlot(r, s, sabida(r))).join('') || `<p class="empty">${T('Ninguna receta coincide.')}</p>`}</div>
        ${b.length ? `<h3>${T('Sin desbloquear')}</h3><div class="grid">${b.map(r => recetaSlot(r, s, false)).join('')}</div>` : ''}
      </section><aside class="panel">${recetaPanel(todas.find(r => r.key === s.sel))}</aside></div>`;
    };
    draw();
    v.addEventListener('click', e => {
      const r = e.target.closest('[data-rec]'); if (r) { s.sel = r.dataset.rec; draw(); $(`[data-rec="${CSS.escape(s.sel)}"]`, v)?.focus(); return; }
      if (e.target.closest('#clock')) { s.locked = !s.locked; draw(); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'cq') { s.q = e.target.value; draw(); const i = $('#cq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    v.addEventListener('change', e => { if (e.target.id === 'ccan') { s.can = e.target.checked; draw(); } });
  },
};
