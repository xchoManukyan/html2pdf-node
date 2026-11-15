'use strict';

// Collects the local files a document refers to (stylesheets, images, fonts,
// and what stylesheets import) inside the base path, so they can be sent to
// a converter server that cannot read the files itself. The same rules as
// the PHP package's AssetCollector.

const fs = require('node:fs');
const path = require('node:path');

const MAX_TOTAL = 45 << 20;

const HTML_REFS = /\b(?:href|src|poster|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi;
const SRCSET = /\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const CSS_REFS = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi;
const STYLE_BLOCKS = /<style\b[^>]*>([\s\S]*?)<\/style>|\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** The first non-empty group of every match. */
function matches(pattern, text) {
  const out = [];
  for (const m of text.matchAll(pattern)) {
    for (let i = 1; i < m.length; i++) {
      if (m[i]) {
        out.push(m[i]);
        break;
      }
    }
  }
  return out;
}

/** Resolves ref relative to the document or stylesheet `from` (paths inside the base path, with "/"). */
function resolve(from, ref) {
  ref = decodeEntities(ref).trim().replace(/[?#][\s\S]*$/, '');
  if (ref === '' || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) {
    return null;
  }
  try {
    ref = decodeURIComponent(ref);
  } catch {
    // keep it as written
  }
  const slash = from.lastIndexOf('/');
  const dir = ref[0] === '/' || slash < 0 ? '' : from.slice(0, slash);
  const parts = [];
  for (const part of `${dir}/${ref}`.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null; // above the base path
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.length ? parts.join('/') : null;
}

/**
 * @param {string} basePath  folder the files must be inside
 * @param {string} documentName  the document's path inside it
 * @param {string} html
 * @returns {Map<string, Buffer>} path inside the base path -> content
 */
function collect(basePath, documentName, html) {
  const root = fs.realpathSync(basePath);
  const files = new Map();
  let total = 0;
  const queue = [];

  let refs = matches(HTML_REFS, html);
  for (const set of matches(SRCSET, html)) {
    for (const candidate of set.split(',')) {
      refs.push(candidate.trim().split(/\s+/)[0] || '');
    }
  }
  for (const css of matches(STYLE_BLOCKS, html)) {
    refs = refs.concat(matches(CSS_REFS, css));
  }
  for (const ref of refs) queue.push([documentName, ref]);

  while (queue.length) {
    const [from, ref] = queue.shift();
    const rel = resolve(from, ref);
    if (rel === null || rel === documentName || files.has(rel)) continue;
    let real;
    try {
      real = fs.realpathSync(path.join(root, rel));
    } catch {
      continue; // the converter reports it as missing
    }
    if (!real.startsWith(root + path.sep)) continue; // outside the base path
    let stat;
    try {
      stat = fs.statSync(real);
    } catch {
      continue;
    }
    if (!stat.isFile() || total + stat.size > MAX_TOTAL) continue;
    const content = fs.readFileSync(real);
    files.set(rel, content);
    total += stat.size;
    if (/\.css$/i.test(rel)) {
      for (const inner of matches(CSS_REFS, content.toString('utf8'))) queue.push([rel, inner]);
    }
  }
  return files;
}

module.exports = { collect, resolve };
