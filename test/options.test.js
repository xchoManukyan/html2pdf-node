'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { Html2PdfError } = require('../lib/errors');
const options = require('../lib/options');
const { fixtures, signing } = require('./helpers');

test('defaults', () => {
  const o = options.normalize();
  assert.deepEqual(options.toArguments(o), ['-size', 'A4', '-margin', '15', '-css', 'auto', '-encryption', 'aes-256']);
  assert.deepEqual(options.passwordEnv(o), {});
});

test('all options become arguments', () => {
  const o = options.normalize({
    paperSize: [80, 200], orientation: 'Landscape', marginMm: 10, pageNumbers: true, viewportWidth: 1280,
    cssLibraries: 'bootstrap tailwind', remoteEnabled: true, permissions: { copy: false }, encryption: 'AES-128',
    fillableForms: true, basePath: path.join(fixtures, 'site'),
  });
  assert.deepEqual(options.toArguments(o), [
    '-size', '80X200', '-margin', '10', '-css', 'bootstrap5,tailwind', '-encryption', 'aes-128', '-landscape',
    '-numbers', '-viewport', '1280', '-remote', '-no-copy', '-forms', '-root', o.basePath,
  ]);
});

test('passwords stay out of the arguments', () => {
  const o = options.normalize({ userPassword: 'open sesame', ownerPassword: 'owner' });
  assert.ok(!options.toArguments(o).includes('open sesame'));
  assert.deepEqual(options.passwordEnv(o), { HTML2PDF_USER_PASSWORD: 'open sesame', HTML2PDF_OWNER_PASSWORD: 'owner' });
});

test('signature', () => {
  const o = options.normalize({ signature: { ...signing(), location: 'Head office' } });
  const args = options.toArguments(o);
  assert.equal(args[args.indexOf('-sign-key') + 1], signing().privateKey);
  assert.equal(args[args.indexOf('-sign-reason') + 1], 'Approved');
  const f = options.toFormFields(o);
  assert.deepEqual([f.sign, f.signReason, f.signLocation], ['true', 'Approved', 'Head office']);
  // the server signs with its own certificate: only the details are sent
  const server = options.normalize({ signature: { certificate: '', reason: 'x' } });
  assert.equal(options.toFormFields(server).sign, 'true');
  assert.throws(() => options.toArguments(server), Html2PdfError);
});

test('form fields', () => {
  const f = options.toFormFields(options.normalize({ cssLibraries: ['bootstrap5', 'tailwind'], permissions: { copy: false } }));
  assert.deepEqual(f.cssLib, ['bootstrap5', 'tailwind']);
  assert.equal(f.denyCopy, 'true');
  assert.equal(f.denyPrint, 'false');
  assert.equal(f.forms, 'false');
});

test('invalid options are rejected', () => {
  for (const bad of [
    { paperSize: 'A9' }, { orientation: 'sideways' }, { marginMm: 2 }, { viewportWidth: 100 },
    { cssLibraries: 'foundation' }, { cssLibraries: 'none,tailwind' }, { encryption: 'des' },
    { basePath: path.join(fixtures, 'nope') }, { timeout: 0 }, { colour: 'red' },
    { signature: { certificate: path.join(fixtures, 'signing', 'missing.pem') } },
    { signature: { certificate: signing().certificate, colour: 'red' } },
    { pdfA: true, userPassword: 'x' }, { pdfA: true, fillableForms: true },
  ]) {
    assert.throws(() => options.normalize(bad), Html2PdfError, JSON.stringify(bad));
  }
});

test('document name inside the base path', () => {
  const o = options.normalize({ basePath: path.join(fixtures, 'site') });
  assert.equal(options.documentName(o, path.join(fixtures, 'site', 'pages', 'sub.html')), 'pages/sub.html');
  assert.throws(() => options.documentName(o, __filename), Html2PdfError);
  assert.equal(options.documentName(options.normalize(), undefined), 'document.html');
});
