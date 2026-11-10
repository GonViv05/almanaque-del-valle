// Cocina: qué podés cocinar ya, qué conviene en la estación (ingredientes de temporada) y cómo se aprende cada receta.
TABS.cocina = {
  label: T('Cocina'), icon: () => itemSpr('194', 2),
  render(v) {
    const s = state._coc ||= { sel: null, q: '', locked: false, season: null };
    if (s.season == null || s.stamp !== state.stamp) { s.season = state.season; s.stamp = state.stamp; }
    const todas = D.recipes.filter(r => r.cook), leidas = recetasLeidas(), hay = !!partida()?.inventario;
    const draw = () => {
      const S = s.season, q = norm(s.q);
      const vis = todas.filter(r => (!q || norm(r.name).includes(q)) && (s.locked || sabida(r) !== false));
      const faltan = r => r.ing.filter(([i]) => !ingEnEstacion(i, S)).length;
      const ya = hay ? vis.filter(r => sabida(r) !== false && alcanza(r) > 0) : [];
      const temporada = vis.filter(r => !ya.includes(r) && !faltan(r)).sort((a, b) => (sabida(b) !== false) - (sabida(a) !== false) || a.ing.length - b.ing.length);
      const fuera = vis.filter(r => !ya.includes(r) && faltan(r)).sort((a, b) => faltan(a) - faltan(b));
      if (!s.sel || !todas.some(r => r.key === s.sel)) s.sel = (ya[0] || temporada[0] || fuera[0])?.key || null;
      const bloq = todas.filter(r => sabida(r) === false).length;
      const grid = l => `<div class="grid">${l.map(r => recetaSlot(r, s, sabida(r))).join('')}</div>`;
      v.innerHTML = `<div class="split"><section>
        <div class="bar-filters">${seasonBar('cs', S)}<label class="field" style="width:240px"><span>${T('Buscar')}</span><input class="input" id="kq" value="${esc(s.q)}" placeholder="${T('Nombre')}"></label>
        ${leidas ? `<button type="button" class="btn" id="klock" aria-pressed="${s.locked}">${s.locked ? T('Ocultar las que no sabés ({n})', { n: bloq }) : T('Ver las que no sabés ({n})', { n: bloq })}</button>` : ''}</div>
        ${leidas ? `<p class="small muted">${T('Sabés {a} de {t} recetas de cocina.', { a: todas.length - bloq, t: todas.length })}</p>` : `<p class="small muted">${T('Sin partida leída: se muestran todas las recetas.')}</p>`}
        ${hay ? `<h2>${T('Podés cocinar ya')}</h2>${ya.length ? grid(ya) : `<p class="small">${T('Con lo que tenés guardado no alcanza para ninguna receta que sepas.')}</p>`}` : ''}
        <h2 style="margin-top:12px">${T('De temporada en {s}', { s: lc(SEASONS[S]) })}</h2>
        <p class="small muted">${T('Todos los ingredientes se consiguen en esta estación (cosecha, pesca, recolección, animales, máquinas o tiendas).')}</p>
        ${temporada.length ? grid(temporada) : `<p class="empty">${T('Ninguna receta con todos los ingredientes de esta estación.')}</p>`}
        ${fuera.length ? `<h3>${T('Con ingredientes de otra estación')}</h3><p class="small muted">${T('Sirven si guardaste esos ingredientes. Primero las que menos te faltan.')}</p>${grid(fuera)}` : ''}
      </section><aside class="panel">${recetaPanel(todas.find(r => r.key === s.sel), S)}</aside></div>`;
    };
    draw();
    v.addEventListener('click', e => {
      const r = e.target.closest('[data-rec]'); if (r) { s.sel = r.dataset.rec; draw(); $(`[data-rec="${CSS.escape(s.sel)}"]`, v)?.focus(); return; }
      const b = e.target.closest('[data-cs]'); if (b) { s.season = Number(b.dataset.cs); draw(); return; }
      if (e.target.closest('#klock')) { s.locked = !s.locked; draw(); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'kq') { s.q = e.target.value; draw(); const i = $('#kq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
  },
};
