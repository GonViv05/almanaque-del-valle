// Arranque: pestañas, reloj superior (fecha de la partida) y render.
const ORDER = ['granja', 'cultivos', 'peces', 'animales', 'aldeanos', 'crafteo', 'cocina', 'artesanales', 'objetos', 'centro', 'perdibles', 'stats'];
// Icono propio del botón de calendario, con los colores de la paleta.
const CAL_ICON = `<svg viewBox="0 0 16 16" width="44" height="44" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="2" width="14" height="13" fill="#5b2b0f"/><rect x="2" y="3" width="12" height="3" fill="#dc7b05"/><rect x="2" y="6" width="12" height="8" fill="#ffe9b8"/><rect x="4" y="1" width="2" height="3" fill="#221122"/><rect x="10" y="1" width="2" height="3" fill="#221122"/>${[3, 6, 9, 12].flatMap(x => [7, 10].map(y => `<rect x="${x}" y="${y}" width="2" height="2" fill="${x === 9 && y === 10 ? '#b14e05' : '#c98a3c'}"/>`)).join('')}</svg>`;
// Íconos de las redes del autor, dibujados en píxeles con la misma paleta (16x16, como el del calendario).
const px = (filas, color) => filas.flatMap((f, y) => [...f].map((c, x) => c === 'X' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>` : '')).join('');
const ICONO = (filas) => `<svg viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true">${filas}</svg>`;
const GH_ICON = ICONO(px(['.....XXXXXX.....', '...XXXXXXXXXX...', '..XXXXXXXXXXXX..', '.XXXXXXXXXXXXXX.', '.XXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXX.', '.XXXXXXXXXXXXXX.', '..XXXXXXXXXXXX..', '...XXXXXXXXXX...', '.....XXXXXX.....'], '#221122')
  + px(['', '', '', '....X......X....', '....XXXXXXXX....', '...XXXXXXXXXX...', '...XXXXXXXXXX...', '...XXXXXXXXXX...', '...XXXXXXXXXX...', '....XXXXXXXX....', '.....XXXXXX.....', '...X..XXXX......', '....XXXXXX......', '......XXXX......', '......XXXX......', ''], '#ffe9b8'));
const IG_ICON = ICONO(px(['...XXXXXXXXXX...', '.XXXXXXXXXXXXXX.', 'XXX..........XXX', 'XX.........XX.XX', 'XX....XXXX.XX.XX', 'XX...XX..XX...XX', 'XX..XX....XX..XX', 'XX..XX....XX..XX',
  'XX..XX....XX..XX', 'XX..XX....XX..XX', 'XX...XX..XX...XX', 'XX....XXXX....XX', 'XX............XX', 'XXX..........XXX', '.XXXXXXXXXXXXXX.', '...XXXXXXXXXX...'], '#5b2b0f'));
const REDES = [['https://github.com/GonViv05', 'GitHub', GH_ICON], ['https://www.instagram.com/gonzaviveros06/', 'Instagram', IG_ICON]];
// Título, idioma (ES/EN) y redes; los textos fijos de index.html pasan acá por la traducción.
function renderMarca() {
  document.title = T('Almanaque del Valle');
  $('#marca h1').textContent = T('Almanaque del Valle');
  $('#calpop').setAttribute('aria-label', T('Calendario')); $('#tabs').setAttribute('aria-label', T('Secciones'));
  const viejo = D.meta?.lang !== LANG ? `<p class="aviso-idioma">${T('Los datos del juego están en español: volvé a correr el instalador para tenerlos en inglés.')}</p>` : '';
  $('#redes').innerHTML = `<div class="idioma" role="group" aria-label="Idioma / Language">${[['es', 'ES', 'Español'], ['en', 'EN', 'English']].map(([k, t, n]) => `<button type="button" class="btn mini" data-idioma="${k}" lang="${k}" aria-pressed="${LANG === k}" aria-label="${n}" data-tip="t:${n}">${t}</button>`).join('')}</div>
    <div class="social">${REDES.map(([u, n, ic]) => `<a href="${u}" target="_blank" rel="noopener" aria-label="${n}" data-tip="t:${n}">${ic}</a>`).join('')}<span>${ui('heart', 21, 18)} ${T('Apoyá con un follow')}</span></div>${viejo}`;
}
$('#redes').addEventListener('click', e => { const b = e.target.closest('[data-idioma]'); if (b && b.dataset.idioma !== LANG) cambiarIdioma(b.dataset.idioma); });
function renderHud() {
  $('#hud').innerHTML = `<div class="d">${DOW[(state.day - 1) % 7].slice(0, 3)}, ${state.day}</div><div class="s">${seasonIcon(state.season, 4)}</div><div class="y">${T('Año {y}', { y: state.year })}</div>
    <div class="ctl"><button type="button" class="iconb calb" data-cal aria-label="${T('Abrir calendario')}" aria-haspopup="dialog" data-tip="t:${T('Calendario')}">${CAL_ICON}</button><button type="button" class="iconb" data-h="-1" aria-label="${T('Día anterior')}" data-tip="t:${T('Día anterior')}"><img src="assets/ui/left.png" alt=""></button><button type="button" class="iconb" data-s="1" aria-label="${T('Siguiente estación')}" data-tip="t:${T('Siguiente estación')}"><img src="assets/ui/up.png" alt="" style="width:32px"></button><button type="button" class="iconb" data-h="1" aria-label="${T('Día siguiente')}" data-tip="t:${T('Día siguiente')}"><img src="assets/ui/right.png" alt=""></button></div>`;
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
renderMarca(); renderHud(); renderTabs(); render();
document.fonts?.ready.then(renderTabs);  // medir las pestañas con la fuente del juego ya cargada
setInterval(revisarPartida, 5000);
