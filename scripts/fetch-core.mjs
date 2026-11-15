// Puts the pinned converter (html2pdf-core) binaries into .core/, verified
// against core.json. Used for the tests and to build the platform packages.
//
//   node scripts/fetch-core.mjs                 this machine's binary, from the GitHub release
//   node scripts/fetch-core.mjs --all           all six platforms
//   node scripts/fetch-core.mjs --local DIR     from a core checkout's dist/ (scripts/build.sh), e.g. ../html2pdf-core
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = JSON.parse(readFileSync(join(root, 'core.json'), 'utf8'));
const platforms = {
  'linux-x64': 'html2pdf-linux-amd64',
  'linux-arm64': 'html2pdf-linux-arm64',
  'darwin-x64': 'html2pdf-darwin-amd64',
  'darwin-arm64': 'html2pdf-darwin-arm64',
  'win32-x64': 'html2pdf-windows-amd64.exe',
  'win32-arm64': 'html2pdf-windows-arm64.exe',
};

const args = process.argv.slice(2);
const local = args.includes('--local') ? args[args.indexOf('--local') + 1] : null;
const files = args.includes('--all') || local
  ? Object.values(platforms)
  : [platforms[`${process.platform}-${process.arch}`]];
if (files.includes(undefined)) {
  throw new Error(`no converter binary is published for ${process.platform}-${process.arch}`);
}

const out = join(root, '.core');
mkdirSync(out, { recursive: true });
for (const file of files) {
  const target = join(out, file);
  let data;
  if (local) {
    const source = join(local, 'dist', file);
    if (!existsSync(source)) throw new Error(`${source} is missing: run sh scripts/build.sh in ${local}`);
    data = readFileSync(source);
  } else {
    const url = `https://github.com/xchoManukyan/html2pdf-core/releases/download/v${core.version}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
  }
  const sum = createHash('sha256').update(data).digest('hex');
  if (sum !== core.files[file]?.sha256) {
    throw new Error(`${file}: checksum ${sum} is not the one pinned in core.json for ${core.version}`);
  }
  writeFileSync(target, data);
  chmodSync(target, 0o755);
  console.log(`${file}  verified  ${data.length} bytes`);
}
