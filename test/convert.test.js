'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { testBinary, signing } = require('./helpers');

testBinary();
const html2pdf = require('..');
const { conversionTests } = require('./conversions');

conversionTests('binary', () => ({ convert: html2pdf.convert, convertFile: html2pdf.convertFile, signing }));

test('binary: the binary is the pinned converter version', async () => {
  assert.equal(await html2pdf.binaryVersion(), html2pdf.coreVersion());
});

test('binary: a missing HTML2PDF_BINARY is reported', async () => {
  const saved = process.env.HTML2PDF_BINARY;
  process.env.HTML2PDF_BINARY = 'no-such-binary';
  try {
    await assert.rejects(html2pdf.convert('<p>x</p>'), html2pdf.Html2PdfError);
  } finally {
    process.env.HTML2PDF_BINARY = saved;
  }
});

test('binary: the ES module exports', async () => {
  const esm = await import('../index.mjs');
  assert.equal(typeof esm.convert, 'function');
  assert.equal(esm.default.convert, html2pdf.convert);
});
