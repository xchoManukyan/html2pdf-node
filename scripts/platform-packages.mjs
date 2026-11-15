// Builds the six platform packages (@xchomanukyan/html2pdf-<os>-<cpu>) in
// npm/ from the verified binaries in .core/ (node scripts/fetch-core.mjs
// --all first). Each holds one converter binary; npm installs only the one
// matching the machine, through the main package's optionalDependencies.
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const core = JSON.parse(readFileSync(join(root, 'core.json'), 'utf8'));
const platforms = {
  'linux-x64': 'html2pdf-linux-amd64',
  'linux-arm64': 'html2pdf-linux-arm64',
  'darwin-x64': 'html2pdf-darwin-amd64',
  'darwin-arm64': 'html2pdf-darwin-arm64',
  'win32-x64': 'html2pdf-windows-amd64.exe',
  'win32-arm64': 'html2pdf-windows-arm64.exe',
};

rmSync(join(root, 'npm'), { recursive: true, force: true });
for (const [platform, file] of Object.entries(platforms)) {
  const [os, cpu] = platform.split('-');
  const name = `@xchomanukyan/html2pdf-${platform}`;
  if (pkg.optionalDependencies[name] !== pkg.version) {
    throw new Error(`package.json: optionalDependencies["${name}"] must be "${pkg.version}"`);
  }
  const dir = join(root, 'npm', platform);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  copyFileSync(join(root, '.core', file), join(dir, 'bin', file));
  chmodSync(join(dir, 'bin', file), 0o755);
  copyFileSync(join(root, 'LICENSE'), join(dir, 'LICENSE'));
  copyFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), join(dir, 'THIRD_PARTY_NOTICES.md'));
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({
    name,
    version: pkg.version,
    description: `The html2pdf converter ${core.version} (html2pdf-core) for ${platform}; installed by ${pkg.name}.`,
    homepage: pkg.homepage,
    repository: pkg.repository,
    license: 'MIT',
    os: [os],
    cpu: [cpu],
    files: ['bin/', 'LICENSE', 'THIRD_PARTY_NOTICES.md'],
    preferUnplugged: true,
  }, null, 2)}\n`);
  writeFileSync(join(dir, 'README.md'), `# ${name}\n\nThe converter binary of [${pkg.name}](https://www.npmjs.com/package/${pkg.name}) for ${platform} ` +
    `([html2pdf-core](https://github.com/xchoManukyan/html2pdf-core) ${core.version}). Install ${pkg.name} instead; ` +
    'npm adds this package on matching machines.\n');
  console.log(`npm/${platform}: ${name}@${pkg.version}`);
}
