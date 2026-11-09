// Arranque: pestañas, reloj superior (fecha de la partida) y render.
const ORDER = ['granja', 'cultivos', 'peces', 'animales', 'aldeanos', 'centro', 'perdibles', 'stats'];
function renderHud() {
  $('#hud').innerHTML = `<div class="d">${DOW[(state.day - 1) % 7].slice(0, 3)}, ${state.day}</div><div class="s">${seasonIcon(state.season, 4)}</div><div class="y">Año ${state.year}</div>
    <div class="ctl"><button type="button" class="iconb" data-h="-1" aria-label="Día anterior" data-tip="t:Día anterior"><img src="assets/ui/left.png" alt=""></button><button type="button" class="iconb" data-s="1" aria-label="Siguiente estación" data-tip="t:Siguiente estación"><img src="assets/ui/up.png" alt="" style="width:32px"></button><button type="button" class="iconb" data-h="1" aria-label="Día siguiente" data-tip="t:Día siguiente"><img src="assets/ui/right.png" alt=""></button></div>`;
}
$('#hud').addEventListener('click', e => {
  const h = e.target.closest('[data-h]'), s = e.target.closest('[data-s]');
  if (h) { let d = state.day + Number(h.dataset.h); if (d > 28) { d = 1; advance(); } if (d < 1) { d = 28; retreat(); } state.day = d; }
  else if (s) advance(); else return;
  save(); renderHud(); render();
});
function advance() { if (state.season === 3) { state.season = 0; state.year++; } else state.season++; }
function retreat() { if (state.season === 0) { if (state.year > 1) { state.season = 3; state.year--; } } else state.season--; }
function renderTabs() {
  $('#tabs').innerHTML = ORDER.map(k => `<button type="button" role="tab" class="tab" data-tab="${k}" aria-selected="${state.tab === k}">${TABS[k].icon()}<span>${TABS[k].label}</span></button>`).join('');
}
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
setInterval(revisarPartida, 5000);
