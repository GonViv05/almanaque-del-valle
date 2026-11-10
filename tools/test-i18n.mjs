// Que todo texto que pasa por T('...') tenga su traducción en js/i18n-en.js, y que las {variables} coincidan.
// Uso: node tools/test-i18n.mjs
import fs from 'node:fs'; import vm from 'node:vm';
const R = new URL('../', import.meta.url);
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('js/i18n-en.js', R), 'utf8') + ';globalThis.EN = EN;', ctx);
const EN = ctx.EN;
const lit = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\x60((?:[^\x60\\$]|\\.)*)\x60`;
const reT = new RegExp(String.raw`\bT\(\s*(?:` + lit + ')', 'g');                                        // T('texto'
const reTern = new RegExp(String.raw`\bT\(\s*[\w.!?=<>&|\[\]' ]+?\?\s*(?:` + lit + String.raw`)\s*:\s*(?:` + lit + ')', 'g');  // T(c ? 'a' : 'b'
const claves = new Map();
for (const f of fs.readdirSync(new URL('js/', R))) {
  if (!f.endsWith('.js') || f.startsWith('i18n')) continue;
  const src = fs.readFileSync(new URL('js/' + f, R), 'utf8');
  const un = s => s.replace(/\\(.)/g, '$1');
  for (const m of src.matchAll(reT)) { const k = un(m[1] ?? m[2] ?? m[3]); claves.set(k, f); }
  for (const m of src.matchAll(reTern)) for (const k of m.slice(1).filter(x => x != null)) claves.set(un(k), f);
}
let faltan = 0, vars = 0;
const llaves = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const [k, f] of claves) {
  if (!(k in EN)) { console.log(`falta (${f}): ${JSON.stringify(k)}`); faltan++; continue; }
  if (llaves(k) !== llaves(EN[k])) { console.log(`variables distintas (${f}): ${JSON.stringify(k)} -> ${JSON.stringify(EN[k])}`); vars++; }
}
const sobran = Object.keys(EN).filter(k => !claves.has(k));
console.log(`${claves.size} textos con T(), ${Object.keys(EN).length} traducciones; faltan ${faltan}, variables mal ${vars}; sin uso directo ${sobran.length} (claves armadas en tiempo de ejecución)`);
if (faltan || vars) process.exit(1);
