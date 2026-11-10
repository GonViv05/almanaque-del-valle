// Animales: ciclo de vida, producción y edificios.
const HARV = { 0: T('Lo deja en el suelo durante la noche'), 1: null, 2: T('Lo desentierra cuando está afuera') };
// Nombre de la herramienta: en inglés queda el del juego tal cual.
const TOOL = LANG === 'en' ? {} : { 'Milk Pail': 'Cubeta lechera', Shears: 'Tijeras de esquilar' };
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
const asDays = m => dec((m / 1600).toFixed(1));
TABS.animales = {
  label: T('Animales'), icon: () => itemSpr('184', 2),
  render(v) {
    const cards = D.animals.map(a => {
      const how = a.harvest === 1 ? T('Se recoge con {h}', { h: TOOL[a.tool] || a.tool }) : HARV[a.harvest];
      return `<article class="acard"><div class="row between"><h2>${esc(a.name)}</h2>${animalSprite(a, false, 2)}</div>
      <div class="tl">${a.baby ? animalSprite(a, true, 2) : ''}<span>${T('Cría')}</span>${ui('right', 24, 22)}<span>${T('{n} días', { n: a.mature })}</span>${ui('right', 24, 22)}<span>${T('Adulto')}</span>${ui('right', 24, 22)}<span>${a.produce === 1 ? T('Produce cada día') : T('Produce cada {n} días', { n: a.produce })}</span></div>
      ${a.prod.map(p => productRow(p, '')).join('')}${a.deluxe.map(p => productRow(p, T('mejor producto'))).join('')}
      <dl class="kv small"><dt>${T('Vive en')}</dt><dd>${esc(a.houseN)}</dd><dt>${T('Compra')}</dt><dd>${a.buy > 0 ? gold(a.buy) + (a.viaBuy ? ` <span class="small muted">${T('(al azar, como {x})', { x: esc(lc(a.viaBuy)) })}</span>` : '') : T('No se compra')}</dd><dt>${T('Venta (adulto)')}</dt><dd>${gold(a.sell)}</dd><dt>${T('Obtención')}</dt><dd>${esc(how)}</dd>${a.eggs.length ? `<dt>${T('Incubación')}</dt><dd>${T('{m} min (≈{d} días)', { m: num(eggMinutes(a)), d: asDays(eggMinutes(a)) })}</dd>` : ''}<dt>${T('Tiene crías')}</dt><dd>${a.preg ? T('Sí') : T('No')}</dd></dl></article>`;
    }).join('');
    const order = ['Coop', 'Big Coop', 'Deluxe Coop', 'Barn', 'Big Barn', 'Deluxe Barn', 'Silo'];
    const bld = order.map(k => { const b = D.buildings[k]; return `<tr><td>${esc(b.name)}</td><td class="n">${gold(b.cost)}</td><td>${b.mats.map(([i, n]) => `<span data-tip="o:${i}">${itemSpr(i, 2)}</span> ${n}`).join(' ')}</td><td class="n">${b.days} d</td><td class="n">${b.cap ?? '—'}</td></tr>`; }).join('');
    v.innerHTML = `<h2>${T('Ciclo de vida y producción')}</h2><div class="anim">${cards}</div>
      <h2 style="margin-top:16px">${T('Edificios')}</h2><div style="overflow-x:auto"><table style="max-width:900px"><thead><tr><th>${T('Edificio')}</th><th class="n">${T('Costo')}</th><th>${T('Materiales')}</th><th class="n">${T('Obra')}</th><th class="n">${T('Capacidad')}</th></tr></thead><tbody>${bld}</tbody></table></div>`;
  },
};
