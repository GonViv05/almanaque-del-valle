// Idioma de la app: español o inglés. Se elige con los botones ES/EN y se recuerda; la primera vez, el del navegador.
// Los textos de la app pasan por T('texto en español'): en inglés se buscan en EN (js/i18n-en.js); el español es la clave.
const IDIOMA_KEY = 'almanaque-idioma';
const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'es' || q === 'en') return q;
  try { const l = localStorage.getItem(IDIOMA_KEY); if (l === 'es' || l === 'en') return l; } catch { /* sin almacenamiento */ }
  return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
})();
document.documentElement.lang = LANG;
// "texto§contexto" separa dos usos del mismo texto en español que en inglés se dicen distinto (lunes / Mondays).
function T(s, v) {
  let r = s.split('§')[0];
  if (LANG === 'en' && typeof EN !== 'undefined') { if (EN[s] != null) r = EN[s]; else (window.sinTraducir ||= new Set()).add(s); }
  if (v) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  return r;
}
function cambiarIdioma(l) {
  try { localStorage.setItem(IDIOMA_KEY, l); } catch { /* sin almacenamiento: queda en la dirección */ }
  const u = new URL(location.href); u.searchParams.delete('lang');
  try { if (localStorage.getItem(IDIOMA_KEY) !== l) u.searchParams.set('lang', l); } catch { u.searchParams.set('lang', l); }
  location.href = u.href;
}
const lc = s => LANG === 'en' ? s : s.toLowerCase();  // estaciones y días: en inglés van con mayúscula
const dec = x => LANG === 'en' ? String(x) : String(x).replace('.', ',');
const comillas = s => LANG === 'en' ? `“${s}”` : `«${s}»`;
