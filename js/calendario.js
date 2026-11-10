// Calendario: el tablero del pueblo con cumpleaños y festivales. Un clic (o Enter) elige el día;
// flechas para moverse, RePág/AvPág cambian de estación, Escape cierra.
const CAL = { x: 37, y: 49, c: 32, w: 301, h: 198 };  // grilla del tablero (Billboard.png) en píxeles del juego
const calpop = $('#calpop');
let calVista = null;
const calZ = () => innerWidth < 700 ? 1 : 2;
function abrirCalendario(s = state.season, y = state.year, foco = state.day, vuelta = null) {
  cerrarFicha?.(); hideTip();
  calVista = { s, y, foco, vuelta };
  calpop.hidden = false; dibujaCal();
}
function cerrarCal(devolverFoco = true) {
  if (calpop.hidden) return;
  calpop.hidden = true; calpop.innerHTML = ''; hideTip();
  const vuelta = calVista?.vuelta; calVista = null;
  if (vuelta) vuelta(); else if (devolverFoco) $('#hud [data-cal]')?.focus();
}
function calMover(d) {  // d puede salirse del mes: pasa a la estación vecina
  const v = calVista;
  while (d < 1) { d += 28; if (v.s === 0) { if (v.y === 1) { d = 1; break; } v.s = 3; v.y--; } else v.s--; }
  while (d > 28) { d -= 28; if (v.s === 3) { v.s = 0; v.y++; } else v.s++; }
  v.foco = d; dibujaCal();
}
function dibujaCal() {
  const { s, y, foco } = calVista, z = calZ(), pf = partida()?.fecha;
  const celdas = [];
  for (let d = 1; d <= 28; d++) {
    const c = (d - 1) % 7, r = Math.floor((d - 1) / 7);
    const bd = D.villagers.filter(v => v.bs === s && v.bd === d), fe = festivalesDel(s, d);
    const sel = s === state.season && y === state.year && d === state.day, hoy = pf && pf.s === s && pf.y === y && pf.d === d;
    const tip = [...fe.map(f => f.name), ...bd.map(v => T('Cumpleaños de {n}', { n: v.name })), hoy ? T('Día de la partida') : ''].filter(Boolean).join(' · ');
    celdas.push(`<button type="button" class="cd${sel ? ' sel' : ''}${hoy ? ' hoy' : ''}" data-cd="${d}" tabindex="${d === foco ? 0 : -1}"
      style="left:${(CAL.x + c * CAL.c + 1) * z}px;top:${(CAL.y + r * CAL.c + 1) * z}px;width:${(CAL.c - 1) * z}px;height:${(CAL.c - 1) * z}px"
      aria-label="${DOW[c]} ${d}${tip ? ': ' + esc(tip) : ''}"${sel ? ' aria-current="date"' : ''}${tip ? ` data-tip="t:${esc(tip)}"` : ''}>${fe.map(() => `<i class="ui" style="width:${10 * z}px;height:${10 * z}px;background-image:url(assets/ui/star.png)"></i>`).join('')}${bd.map(v => face(v, 14 * z)).join('')}</button>`);
  }
  const lista = D.festivals.filter(f => f.s === s).sort((a, b) => a.d[0] - b.d[0]);
  calpop.innerHTML = `<div class="calbar">
      <button type="button" class="iconb" data-cy="-1" aria-label="${T('Año anterior')}"${y === 1 ? ' disabled' : ''}><img src="assets/ui/left.png" alt=""></button>
      <span class="calano">${T('Año {y}', { y })}</span>
      <button type="button" class="iconb" data-cy="1" aria-label="${T('Año siguiente')}"><img src="assets/ui/right.png" alt=""></button>
      <span class="row" role="group" aria-label="${T('Estación')}">${SEASONS.map((n, i) => `<button type="button" class="btn" data-cs="${i}" aria-pressed="${i === s}" aria-label="${n}" data-tip="t:${n}">${seasonIcon(i)}</button>`).join('')}</span>
      <button type="button" class="cerrar" data-ccerrar aria-label="${T('Cerrar calendario')}">${ui('cancel', 44, 44)}</button>
    </div>
    <div class="board" role="grid" aria-label="${SEASONS[s]}, ${T('año {y}', { y })}" style="width:${CAL.w * z}px;height:${CAL.h * z}px">${celdas.join('')}</div>
    <div class="calfoot small">
      ${pf ? `<button type="button" class="btn" data-choy>${T('Ir al día de la partida ({f})', { f: T('{d} de {s}', { d: pf.d, s: lc(SEASONS[pf.s]) }) + ', ' + T('año {y}', { y: pf.y }) })}</button>` : ''}
      <p class="muted"><span class="sw sel"></span>${T('día elegido')}${pf ? ` <span class="sw hoy"></span>${T('día de la partida')}` : ''} · <i class="ui" style="width:16px;height:16px;background-image:url(assets/ui/star.png)"></i> ${T('festival')} · ${T('retrato: cumpleaños')}</p>
      ${lista.length ? `<p>${lista.map(f => `${esc(f.name)}: ${diasFest(f)}`).join(' · ')}</p>` : ''}
    </div>`;
  $(`[data-cd="${foco}"]`, calpop)?.focus();
}
function elegirDia(d) {
  state.season = calVista.s; state.year = calVista.y; state.day = d;
  save(); renderHud(); render(); cerrarCal();
}
calpop.addEventListener('click', e => {
  const c = e.target.closest('[data-cd]'); if (c) return elegirDia(Number(c.dataset.cd));
  const s = e.target.closest('[data-cs]'); if (s) { calVista.s = Number(s.dataset.cs); return dibujaCal(); }
  const y = e.target.closest('[data-cy]'); if (y) { calVista.y = Math.max(1, calVista.y + Number(y.dataset.cy)); return dibujaCal(); }
  if (e.target.closest('[data-choy]')) { const f = partida().fecha; Object.assign(calVista, { s: f.s, y: f.y }); return elegirDia(f.d); }
  if (e.target.closest('[data-ccerrar]')) { calVista.vuelta = null; cerrarCal(); }
});
calpop.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); calVista.vuelta = null; return cerrarCal(); }
  const c = e.target.closest('[data-cd]');
  if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); return calMover(calVista.foco + (e.key === 'PageUp' ? -28 : 28)); }
  if (!c) return;
  const d = Number(c.dataset.cd), mov = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return elegirDia(d); }
  if (mov) { e.preventDefault(); calMover(d + mov); }
  else if (e.key === 'Home') { e.preventDefault(); calMover(d - (d - 1) % 7); }
  else if (e.key === 'End') { e.preventDefault(); calMover(d + 6 - (d - 1) % 7); }
});
document.addEventListener('mousedown', e => {
  if (!calpop.hidden && !e.target.closest('#calpop, [data-cal]')) { calVista.vuelta = null; cerrarCal(false); }
});
addEventListener('resize', () => { if (!calpop.hidden) dibujaCal(); });
