// Desempaqueta los .xnb del juego instalado a tools/.raw (JSON y PNG). Solo lee la carpeta del juego.
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { unpackToFiles, setReaders, addReaders, addSchemes, addEnum } from './node_modules/xnb/dist/core/xnb-core.module.js';
import * as Base from './node_modules/xnb/dist/readers/xnb-readers.module.js';
import * as SDV from './node_modules/xnb/dist/plugins/stardewvalley/index.module.js';

const CONTENT = process.env.SDV_CONTENT || path.join(os.homedir(), '.local/share/Steam/steamapps/common/Stardew Valley/Content');
const OUT = path.resolve('.raw');
setReaders({ ...Base });
addReaders(SDV.readers);
addSchemes(SDV.schemes);
addEnum(SDV.enums);
// Esquemas 1.6.15 generados desde StardewValley.GameData.dll (ver 00-schemas.py): pisan a los de la librería.
const gen = JSON.parse(await readFile(new URL('./schemes.json', import.meta.url), 'utf8'));
addEnum(gen.enums);
addSchemes(gen.schemes);
class ColorReader extends Base.BaseReader {
  static isTypeOf(t) { return t === 'Microsoft.Xna.Framework.Content.ColorReader' || t === 'Microsoft.Xna.Framework.Color'; }
  static type() { return 'Color'; }
  isValueType() { return true; }
  get type() { return 'Color'; }
  read(b) { return b.readUInt32(); }
}
addReaders({ ColorReader });

const WANT = [
  /^Data\/[^/]+\.xnb$/, /^Data\/.*\.es-ES\.xnb$/,
  /^Strings\/.*\.xnb$/,
  /^Characters\/schedules\/[^.]+\.xnb$/,
  /^Maps\/(springobjects|MenuTiles|Festivals)\.xnb$/,
  /^TileSheets\/(crops|fruitTrees|Craftables|tools|animations|BuffsIcons|emotes|Objects_2|weapons|furniture(_2|_3)?|(joja|junimo|retro|wizard)_furniture|FreeCactuses)\.xnb$/,
  /^Characters\/Farmer\/(hats|shirts|pants)\.xnb$/,
  /^LooseSprites\/.*\.xnb$/,
  /^Portraits\/[^.]+\.xnb$/,
  /^Characters\/[^/.]+\.xnb$/,
  /^Animals\/[^.]+\.xnb$/,
  /^Fonts\/(SmallFont|SpriteFont1|tinyFont|tinyFontBorder)(\.es-ES)?\.xnb$/,
  /^Minigames\/TitleButtons\.xnb$/,
];
const skip = /\.(de-DE|fr-FR|hu-HU|it-IT|ja-JP|ko-KR|pt-BR|ru-RU|tr-TR|zh-CN)\.xnb$/;

async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }
let ok = 0; const bad = [];
for await (const f of walk(CONTENT)) {
  const rel = path.relative(CONTENT, f).replaceAll('\\', '/');
  if (!rel.endsWith('.xnb') || skip.test(rel) || !WANT.some(r => r.test(rel))) continue;
  try {
    const buf = await readFile(f);
    const ab = new Uint8Array(buf);
    const base = rel.replace(/\.xnb$/, '');
    const outs = await unpackToFiles(ab, { fileName: path.basename(base), yaml: false });
    for (const o of outs) {
      const name = o.name ?? path.basename(base);
      const out = path.join(OUT, path.dirname(base), `${o.extension === 'json' ? path.basename(base) : (name.endsWith('.'+o.extension)? name.slice(0,-o.extension.length-1): name)}.${o.extension}`);
      await mkdir(path.dirname(out), { recursive: true });
      const d = o.data;
      await writeFile(out, d instanceof Blob ? Buffer.from(await d.arrayBuffer()) : (typeof d === 'string' ? d : Buffer.from(d)));
    }
    ok++;
  } catch (e) { bad.push([rel, e.message]); }
}
console.log('ok', ok, 'fallidos', bad.length);
for (const b of bad.slice(0, 40)) console.log(b.join('  -> '));
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, '_errores.json'), JSON.stringify(bad, null, 1));
