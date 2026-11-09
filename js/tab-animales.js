// Animales: ciclo de vida, producción y edificios.
const HARV = { 0: 'Lo deja en el suelo durante la noche', 1: null, 2: 'Lo desentierra cuando está afuera' };
const TOOL = { 'Milk Pail': 'Cubeta lechera', Shears: 'Tijeras de esquilar' };
function animalSprite(a, baby, z = 3) {
  const tex = baby && a.baby ? a.baby : a.tex; const w = a.w, h = a.h;
  return `<i class="ui" style="width:${w * z}px;height:${h * z}px;background-image:url('assets/animals/${esc(tex)}.png');background-position:0 0;background-size:${4 * w * z}px auto"></i>`;
}
function productRow(p, label) {
  const o = obj(p.id); if (!o) return '';
  const m = D.sources[p.id]?.mach;
  return `<div class="item-row" data-tip="o:${p.id}">${itemSpr(p.id, 2)}<span class="small">${esc(o.n)}${label ? ` (${label})` : ''} ${gold(o.p)}${m ? ` · ${esc(m[0].m)}` : ''}</span></div>`;
}
function eggMinutes(a) { const def = D.incubators['(BC)101'][0]; return a.incub > 0 ? a.incub : def; }
const asDays = m => (m / 1600).toFixed(1).replace('.', ',');
TABS.animales = {
  label: 'Animales', icon: () => itemSpr('184', 2),
  render(v) {
    const cards = D.animals.map(a => {
      const how = a.harvest === 1 ? `Se recoge con ${TOOL[a.tool] || a.tool}` : HARV[a.harvest];
      return `<article class="acard"><div class="row between"><h2>${esc(a.name)}</h2>${animalSprite(a, false, 2)}</div>
      <div class="tl">${a.baby ? animalSprite(a, true, 2) : ''}<span>Cría</span>${ui('right', 24, 22)}<span>${a.mature} días</span>${ui('right', 24, 22)}<span>Adulto</span>${ui('right', 24, 22)}<span>Produce cada ${a.produce} ${a.produce === 1 ? 'día' : 'días'}</span></div>
      ${a.prod.map(p => productRow(p, '')).join('')}${a.deluxe.map(p => productRow(p, 'mejor producto')).join('')}
      <dl class="kv small"><dt>Vive en</dt><dd>${esc(a.houseN)}</dd><dt>Compra</dt><dd>${a.buy > 0 ? gold(a.buy) + (a.viaBuy ? ` <span class="small muted">(al azar, como ${esc(a.viaBuy.toLowerCase())})</span>` : '') : 'No se compra'}</dd><dt>Venta (adulto)</dt><dd>${gold(a.sell)}</dd><dt>Obtención</dt><dd>${esc(how)}</dd>${a.eggs.length ? `<dt>Incubación</dt><dd>${num(eggMinutes(a))} min (≈${asDays(eggMinutes(a))} días)</dd>` : ''}<dt>Tiene crías</dt><dd>${a.preg ? 'Sí' : 'No'}</dd></dl></article>`;
    }).join('');
    const order = ['Coop', 'Big Coop', 'Deluxe Coop', 'Barn', 'Big Barn', 'Deluxe Barn', 'Silo'];
    const bld = order.map(k => { const b = D.buildings[k]; return `<tr><td>${esc(b.name)}</td><td class="n">${gold(b.cost)}</td><td>${b.mats.map(([i, n]) => `<span data-tip="o:${i}">${itemSpr(i, 2)}</span> ${n}`).join(' ')}</td><td class="n">${b.days} d</td><td class="n">${b.cap ?? '—'}</td></tr>`; }).join('');
    v.innerHTML = `<h2>Ciclo de vida y producción</h2><div class="anim">${cards}</div>
      <h2 style="margin-top:16px">Edificios</h2><div style="overflow-x:auto"><table style="max-width:900px"><thead><tr><th>Edificio</th><th class="n">Costo</th><th>Materiales</th><th class="n">Obra</th><th class="n">Capacidad</th></tr></thead><tbody>${bld}</tbody></table></div>`;
  },
};
