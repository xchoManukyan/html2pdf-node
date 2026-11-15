'use strict';

// Options of a conversion, validated and turned into command-line arguments
// (binary) or form fields (HTTP server), the same way as the PHP package.

const fs = require('node:fs');
const path = require('node:path');
const { Html2PdfError } = require('./errors');

const PAPER_SIZES = ['A3', 'A4', 'A5', 'LETTER', 'LEGAL'];
const LIBRARIES = ['tailwind', 'bootstrap5', 'bootstrap4', 'none'];
const ENCRYPTIONS = ['aes-256', 'aes-128', 'rc4-128'];
const KNOWN = ['paperSize', 'orientation', 'marginMm', 'pageNumbers', 'viewportWidth', 'cssLibraries', 'remoteEnabled',
  'basePath', 'userPassword', 'ownerPassword', 'permissions', 'encryption', 'pdfA', 'fillableForms', 'signature',
  'timeout'];
const SIGNATURE_KEYS = ['certificate', 'privateKey', 'reason', 'location', 'contact', 'name'];

function fail(message) {
  throw new Html2PdfError(message);
}

function number(n) {
  return String(Math.round(n * 100) / 100);
}

function millimetres(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 10 || v > 9999) {
    fail('Custom paper sides must be 10-9999 mm');
  }
  return number(v);
}

/**
 * Validates options and fills in the defaults.
 * @param {object} [input]
 */
function normalize(input = {}) {
  for (const key of Object.keys(input)) {
    if (!KNOWN.includes(key)) {
      fail(`Unknown option "${key}"`);
    }
  }
  const o = {
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    pageNumbers: false,
    viewportWidth: null,
    cssLibraries: [],
    remoteEnabled: false,
    basePath: null,
    userPassword: null,
    ownerPassword: null,
    permissions: { print: true, copy: true, modify: true },
    encryption: 'aes-256',
    pdfA: false,
    fillableForms: false,
    signature: null,
    timeout: 60,
  };

  if (input.paperSize !== undefined) {
    let size = input.paperSize;
    if (Array.isArray(size)) {
      if (size.length !== 2) {
        fail('A custom paper size is [width, height] in millimetres');
      }
      size = `${millimetres(size[0])}x${millimetres(size[1])}`;
    }
    const upper = String(size).trim().toUpperCase();
    if (!PAPER_SIZES.includes(upper) && !/^\d{2,4}(\.\d+)?X\d{2,4}(\.\d+)?$/.test(upper)) {
      fail(`Unsupported paper size "${size}": use A3, A4, A5, Letter, Legal or WIDTHxHEIGHT in mm`);
    }
    o.paperSize = upper;
  }
  if (input.orientation !== undefined) {
    const v = String(input.orientation).trim().toLowerCase();
    if (v !== 'portrait' && v !== 'landscape') {
      fail(`Orientation must be "portrait" or "landscape", got "${input.orientation}"`);
    }
    o.orientation = v;
  }
  if (input.marginMm !== undefined) {
    if (typeof input.marginMm !== 'number' || input.marginMm < 5 || input.marginMm > 50) {
      fail('The margin must be between 5 and 50 mm; use CSS @page { margin: ... } for other values');
    }
    o.marginMm = input.marginMm;
  }
  if (input.viewportWidth !== undefined && input.viewportWidth !== null) {
    const v = input.viewportWidth;
    if (!Number.isInteger(v) || v < 240 || v > 3840) {
      fail('The viewport width must be an integer between 240 and 3840 px');
    }
    o.viewportWidth = v;
  }
  if (input.cssLibraries !== undefined) {
    const list = typeof input.cssLibraries === 'string'
      ? input.cssLibraries.split(/[\s,;]+/)
      : Array.from(input.cssLibraries);
    const libs = new Set();
    for (const raw of list) {
      let lib = String(raw).trim().toLowerCase();
      if (lib === '' || lib === 'auto') continue;
      if (lib === 'bootstrap') lib = 'bootstrap5';
      if (!LIBRARIES.includes(lib)) {
        fail(`Unknown CSS library "${lib}": use tailwind, bootstrap5, bootstrap4 or none`);
      }
      libs.add(lib);
    }
    if (libs.has('none') && libs.size > 1) {
      fail('"none" cannot be combined with other CSS libraries');
    }
    o.cssLibraries = [...libs];
  }
  if (input.basePath !== undefined && input.basePath !== null) {
    let real = null;
    try {
      real = fs.realpathSync(input.basePath);
    } catch {
      // reported below
    }
    if (real === null || !fs.statSync(real).isDirectory()) {
      fail(`The base path "${input.basePath}" is not a folder`);
    }
    o.basePath = real;
  }
  for (const key of ['pageNumbers', 'remoteEnabled', 'pdfA', 'fillableForms']) {
    if (input[key] !== undefined) o[key] = Boolean(input[key]);
  }
  for (const key of ['userPassword', 'ownerPassword']) {
    if (input[key]) o[key] = String(input[key]);
  }
  if (input.permissions !== undefined) {
    o.permissions = { print: true, copy: true, modify: true, ...input.permissions };
  }
  if (input.encryption !== undefined) {
    const v = String(input.encryption).trim().toLowerCase();
    if (!ENCRYPTIONS.includes(v)) {
      fail(`Unknown encryption "${input.encryption}": use aes-256, aes-128 or rc4-128`);
    }
    o.encryption = v;
  }
  if (input.signature) {
    const s = input.signature;
    for (const key of Object.keys(s)) {
      if (!SIGNATURE_KEYS.includes(key)) {
        fail(`Unknown signature detail "${key}": use ${SIGNATURE_KEYS.join(', ')}`);
      }
    }
    const certificate = s.certificate || '';
    const privateKey = s.privateKey || certificate;
    for (const file of [certificate, privateKey]) {
      if (file === '') continue;
      try {
        fs.accessSync(file, fs.constants.R_OK);
      } catch {
        fail(`Cannot read the signing file "${file}"`);
      }
    }
    o.signature = {
      certificate,
      privateKey,
      reason: s.reason || '',
      location: s.location || '',
      contact: s.contact || '',
      name: s.name || '',
    };
  }
  if (input.timeout !== undefined) {
    if (!(input.timeout >= 1)) fail('The timeout must be at least 1 second');
    o.timeout = input.timeout;
  }

  const p = o.permissions;
  const encrypted = o.userPassword !== null || o.ownerPassword !== null || !p.print || !p.copy || !p.modify;
  if (o.pdfA && encrypted) {
    fail('PDF/A documents cannot be encrypted: remove the password and permissions, or turn off PDF/A');
  }
  if (o.pdfA && o.fillableForms) {
    fail('Fillable forms cannot be combined with PDF/A: turn one of them off');
  }
  return o;
}

/** Command-line arguments for the binary (passwords go in the environment, see passwordEnv). */
function toArguments(o) {
  const args = ['-size', o.paperSize, '-margin', number(o.marginMm),
    '-css', o.cssLibraries.length ? o.cssLibraries.join(',') : 'auto', '-encryption', o.encryption];
  if (o.orientation === 'landscape') args.push('-landscape');
  if (o.pageNumbers) args.push('-numbers');
  if (o.viewportWidth !== null) args.push('-viewport', String(o.viewportWidth));
  if (o.remoteEnabled) args.push('-remote');
  if (!o.permissions.print) args.push('-no-print');
  if (!o.permissions.copy) args.push('-no-copy');
  if (!o.permissions.modify) args.push('-no-modify');
  if (o.pdfA) args.push('-pdfa');
  if (o.fillableForms) args.push('-forms');
  if (o.signature) {
    if (o.signature.certificate === '') {
      fail('Signing with the converter binary needs the certificate and key files');
    }
    args.push('-sign-cert', o.signature.certificate, '-sign-key', o.signature.privateKey);
    for (const detail of ['reason', 'location', 'contact', 'name']) {
      if (o.signature[detail] !== '') args.push(`-sign-${detail}`, o.signature[detail]);
    }
  }
  if (o.basePath !== null) args.push('-root', o.basePath);
  return args;
}

/** Environment variables with the passwords, so they never appear in the process list. */
function passwordEnv(o) {
  const env = {};
  if (o.userPassword !== null) env.HTML2PDF_USER_PASSWORD = o.userPassword;
  if (o.ownerPassword !== null) env.HTML2PDF_OWNER_PASSWORD = o.ownerPassword;
  return env;
}

/** Form fields for the converter's HTTP API; a list value repeats the field. */
function toFormFields(o) {
  const yes = (b) => (b ? 'true' : 'false');
  const s = o.signature;
  return {
    pageSize: o.paperSize,
    orientation: o.orientation,
    margin: number(o.marginMm),
    pageNumbers: yes(o.pageNumbers),
    viewport: o.viewportWidth === null ? '' : String(o.viewportWidth),
    cssLib: o.cssLibraries,
    allowRemote: yes(o.remoteEnabled),
    userPassword: o.userPassword || '',
    ownerPassword: o.ownerPassword || '',
    denyPrint: yes(!o.permissions.print),
    denyCopy: yes(!o.permissions.copy),
    denyModify: yes(!o.permissions.modify),
    encryption: o.encryption,
    pdfa: yes(o.pdfA),
    forms: yes(o.fillableForms),
    sign: yes(s !== null),
    signReason: s ? s.reason : '',
    signLocation: s ? s.location : '',
    signContact: s ? s.contact : '',
  };
}

/** The document's path inside the base path, for relative links ("document.html" without a file). */
function documentName(o, file) {
  if (!file || o.basePath === null) return 'document.html';
  const rel = path.relative(o.basePath, fs.realpathSync(file));
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    fail(`${file} is not inside the base path ${o.basePath}`);
  }
  return rel.split(path.sep).join('/');
}

module.exports = { normalize, toArguments, passwordEnv, toFormFields, documentName };
