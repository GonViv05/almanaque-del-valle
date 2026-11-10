// Objetos: todo lo que el juego registra como ítem, por tipo y categoría, con la ficha de cada uno al costado.
const OTIPOS = [['all', T('Todo')], ['O', T('Objetos§tipo')], ['BC', T('Objetos grandes')], ['W', T('Armas')], ['B', T('Calzado')], ['H', T('Sombreros')], ['R', T('Ropa')], ['T', T('Herramientas')], ['TR', T('Baratijas')], ['F', T('Muebles')]];
const OTROS = T('Otros');
const OORDEN = Object.fromEntries(OTIPOS.map(([k], i) => [k, i]));
let OLISTA = null;
function listaObjetos() {
  if (OLISTA) return OLISTA;
  const out = [];
  for (const [id, o] of Object.entries(D.objects)) if (!o.x) out.push({ id, k: 'O', g: o.g || OTROS, n: o.n });
  for (const [id, o] of Object.entries(D.items || {})) if (!o.x) out.push({ id, k: o.k === 'S' || o.k === 'P' ? 'R' : o.k, g: o.g, n: o.n });
  for (const x of out) x.q = norm(x.n);
  return (OLISTA = out.sort((a, b) => OORDEN[a.k] - OORDEN[b.k] || a.n.localeCompare(b.n, LANG)));
}
TABS.objetos = {
  label: T('Objetos'), icon: () => itemSpr('102', 2),
  render(v) {
    const s = state._obj ||= { k: 'all', g: 'all', q: '', sel: '24' };
    const lista = listaObjetos();
    // Las categorías salen del tipo elegido, con cuántos objetos hay en cada una; las más grandes primero.
    const grupos = () => {
      const c = new Map();
      for (const x of lista) if (s.k === 'all' || x.k === s.k) c.set(x.g, (c.get(x.g) || 0) + 1);
      return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], LANG));
    };
    const panel = () => `<aside class="panel" id="opanel" aria-live="polite">${obj(s.sel) ? fichaHtml(s.sel, true) : `<p class="empty">${T('Elegí un objeto para ver su ficha.')}</p>`}</aside>`;
    const draw = () => {
      const q = norm(s.q.trim()), gs = grupos();
      if (s.g !== 'all' && !gs.some(([g]) => g === s.g)) s.g = 'all';
      const l = lista.filter(x => (s.k === 'all' || x.k === s.k) && (s.g === 'all' || x.g === s.g) && (!q || x.q.includes(q)));
      // Secciones por tipo y, dentro de cada tipo, de la categoría más grande a la más chica ("Otros" al final).
      const secc = new Map(), tam = new Map();
      for (const x of lista) tam.set(x.k + '|' + x.g, (tam.get(x.k + '|' + x.g) || 0) + 1);
      for (const x of l) { const g = x.k + '|' + x.g; if (!secc.has(g)) secc.set(g, []); secc.get(g).push(x); }
      const orden = [...secc].sort(([a, xa], [b, xb]) => OORDEN[xa[0].k] - OORDEN[xb[0].k] || (xa[0].g === OTROS) - (xb[0].g === OTROS) || tam.get(b) - tam.get(a) || a.localeCompare(b, LANG));
      v.innerHTML = `<div class="split"><section>
        <div class="bar-filters"><label class="field" style="width:280px"><span>${T('Buscar')}</span><input class="input" id="oq" value="${esc(s.q)}" placeholder="${T('Nombre')}" autocomplete="off"></label>
          <label class="field"><span>${T('Tipo')}</span>${dd('otipo', OTIPOS, s.k, T('Tipo de objeto'))}</label>
          <label class="field"><span>${T('Categoría')}</span>${dd('ogrupo', [['all', T('Todas')], ...gs.map(([g, n]) => [g, `${g} (${n})`])], s.g, T('Categoría'))}</label></div>
        <p class="small muted">${T('{l}, sacados de los archivos del juego. Tocá uno para ver de dónde sale y para qué sirve.', { l: l.length === lista.length ? T('Los {n} objetos del juego', { n: num(lista.length) }) : T('{a} de {n} objetos', { a: num(l.length), n: num(lista.length) }) })}</p>
        ${l.length ? orden.map(([, xs]) => `<h3>${esc(xs[0].g)} <span class="small muted">(${xs.length})</span></h3><div class="grid">${xs.map(x => slot(x.id, { act: 'obj', sel: x.id === s.sel })).join('')}</div>`).join('') : `<p class="empty">${T('Ningún objeto coincide.')}</p>`}
      </section>${panel()}</div>`;
    };
    draw();
    // En pantallas angostas el panel queda abajo de todo: ahí la ficha se abre flotando.
    const apilado = () => matchMedia('(max-width: 1080px)').matches;
    const elegir = id => {
      s.sel = id; save();
      $$('.slot.sel', v).forEach(b => b.classList.remove('sel'));
      $(`.slot[data-act="obj"][data-id="${CSS.escape(id)}"]`, v)?.classList.add('sel');
      if (apilado()) return fichaObjeto(id);
      $('#opanel', v).outerHTML = panel(); $('#opanel', v).scrollTop = 0;
    };
    v.addEventListener('click', e => {
      const b = e.target.closest('.slot[data-act="obj"]'); if (b) return elegir(b.dataset.id);
      if (!e.target.closest('#opanel')) return;
      if (accionFicha(e)) return;
      // Dentro del panel, un objeto mencionado se abre en el mismo panel.
      const f = e.target.closest('[data-ficha], .slot[data-id]:not([data-act])');
      if (f && obj(f.dataset.ficha || f.dataset.id)) { e.stopPropagation(); elegir(f.dataset.ficha || f.dataset.id); }
    });
    v.addEventListener('input', e => { if (e.target.id === 'oq') { s.q = e.target.value; draw(); const i = $('#oq', v); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    v.addEventListener('ddchange', e => {
      if (e.detail.id === 'otipo') { s.k = e.detail.value; s.g = 'all'; }
      if (e.detail.id === 'ogrupo') s.g = e.detail.value;
      save(); draw(); $(`[data-dd="${e.detail.id}"] button`, v)?.focus();
    });
  },
};
