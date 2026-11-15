// Pins the converter (html2pdf-core) version: writes its release checksums
// to core.json, which every installed binary is verified against.
//
//   node scripts/update-core.mjs 0.2.0              checksums.json of the core release v0.2.0
//   node scripts/update-core.mjs --local DIR        dist/checksums.json of a core checkout (development only)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [first, second] = process.argv.slice(2);
let text;
if (first === '--local') {
  if (!second) throw new Error('usage: update-core.mjs --local CORE_DIR');
  text = readFileSync(join(second, 'dist', 'checksums.json'), 'utf8');
} else {
  if (!first) throw new Error('usage: update-core.mjs VERSION | --local CORE_DIR');
  const url = `https://github.com/xchoManukyan/html2pdf-core/releases/download/v${first}/checksums.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  text = await res.text();
  if (JSON.parse(text).version !== first) throw new Error(`${url} is not for version ${first}`);
}
const core = JSON.parse(text);
if (Object.keys(core.files || {}).length !== 6) throw new Error('checksums.json should list six binaries');
writeFileSync(join(root, 'core.json'), text);
console.log(`converter version ${core.version} pinned in core.json`);
