// Arranque: pestañas, reloj superior (fecha de la partida) y render.
const ORDER = ['granja', 'cultivos', 'peces', 'animales', 'aldeanos', 'crafteo', 'cocina', 'artesanales', 'objetos', 'centro', 'perdibles', 'stats'];
// Icono propio del botón de calendario, con los colores de la paleta.
const CAL_ICON = `<svg viewBox="0 0 16 16" width="44" height="44" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="2" width="14" height="13" fill="#5b2b0f"/><rect x="2" y="3" width="12" height="3" fill="#dc7b05"/><rect x="2" y="6" width="12" height="8" fill="#ffe9b8"/><rect x="4" y="1" width="2" height="3" fill="#221122"/><rect x="10" y="1" width="2" height="3" fill="#221122"/>${[3, 6, 9, 12].flatMap(x => [7, 10].map(y => `<rect x="${x}" y="${y}" width="2" height="2" fill="${x === 9 && y === 10 ? '#b14e05' : '#c98a3c'}"/>`)).join('')}</svg>`;
function renderHud() {
  $('#hud').innerHTML = `<div class="d">${DOW[(state.day - 1) % 7].slice(0, 3)}, ${state.day}</div><div class="s">${seasonIcon(state.season, 4)}</div><div class="y">Año ${state.year}</div>
    <div class="ctl"><button type="button" class="iconb calb" data-cal aria-label="Abrir calendario" aria-haspopup="dialog" data-tip="t:Calendario">${CAL_ICON}</button><button type="button" class="iconb" data-h="-1" aria-label="Día anterior" data-tip="t:Día anterior"><img src="assets/ui/left.png" alt=""></button><button type="button" class="iconb" data-s="1" aria-label="Siguiente estación" data-tip="t:Siguiente estación"><img src="assets/ui/up.png" alt="" style="width:32px"></button><button type="button" class="iconb" data-h="1" aria-label="Día siguiente" data-tip="t:Día siguiente"><img src="assets/ui/right.png" alt=""></button></div>`;
}
$('#hud').addEventListener('click', e => {
  if (e.target.closest('[data-cal]')) { if (calpop.hidden) abrirCalendario(); else cerrarCal(); return; }
  const h = e.target.closest('[data-h]'), s = e.target.closest('[data-s]');
  if (h) { let d = state.day + Number(h.dataset.h); if (d > 28) { d = 1; advance(); } if (d < 1) { d = 28; retreat(); } state.day = d; }
  else if (s) advance(); else return;
  save(); renderHud(); render();
});
function advance() { if (state.season === 3) { state.season = 0; state.year++; } else state.season++; }
function retreat() { if (state.season === 0) { if (state.year > 1) { state.season = 3; state.year--; } } else state.season--; }
function renderTabs() {
  const nav = $('#tabs'); nav.classList.remove('apretadas', 'iconos');
  nav.innerHTML = ORDER.map(k => `<button type="button" role="tab" class="tab" data-tab="${k}" aria-selected="${state.tab === k}" aria-label="${TABS[k].label}">${TABS[k].icon()}<span>${TABS[k].label}</span></button>`).join('');
  // Si no entran en una fila, primero se achica la letra y después quedan solo los íconos (con el nombre en el cartelito).
  const sobra = () => nav.scrollWidth > nav.clientWidth + 1;
  if (sobra()) nav.classList.add('apretadas');
  if (sobra()) { nav.classList.replace('apretadas', 'iconos'); $$('.tab', nav).forEach(b => { b.dataset.tip = 't:' + b.getAttribute('aria-label'); }); }
}
let anchoTabs = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - anchoTabs) > 20) { anchoTabs = innerWidth; renderTabs(); } });
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; state.tab = b.dataset.tab; save(); renderTabs(); render(); });
function render() {
  hideTip();
  const old = $('#view'); const v = old.cloneNode(false); old.replaceWith(v); // listeners limpios por pestaña
  TABS[state.tab].render(v);
}
function ocupado() { return document.activeElement?.matches('input:not([type=checkbox])') || !!$('.dd ul:not([hidden])'); }
function revisarPartida() {
  const s = document.createElement('script');
  s.src = 'data/partida.js?t=' + Date.now();
  s.onload = () => { s.remove(); if (ocupado()) return; if (syncFromSave()) { const y = scrollY; renderHud(); renderTabs(); render(); scrollTo(0, y); } };
  s.onerror = () => s.remove();
  document.head.append(s);
}
syncFromSave();
renderHud(); renderTabs(); render();
document.fonts?.ready.then(renderTabs);  // medir las pestañas con la fuente del juego ya cargada
setInterval(revisarPartida, 5000);
