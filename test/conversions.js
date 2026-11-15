'use strict';

// Conversion tests shared by the binary (convert.test.js) and the server
// (http.test.js): each run converts real documents.

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { ConversionError } = require('../lib/errors');
const { fixtures } = require('./helpers');

/**
 * @param {string} label
 * @param {() => {convert: Function, convertFile: Function, signing: () => object}} make
 */
function conversionTests(label, make) {
  const pdf = async (html, opts) => (await make().convert(html, opts)).pdf.toString('latin1');

  test(`${label}: converts HTML to PDF`, async () => {
    const result = await make().convert('<h1 class="text-3xl font-bold">Invoice 1042</h1>');
    assert.ok(Buffer.isBuffer(result.pdf));
    assert.equal(result.pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(result.renderTimeMs >= 0);
  });

  test(`${label}: a file with its stylesheets and images`, async () => {
    const result = await make().convertFile(path.join(fixtures, 'site', 'index.html'));
    assert.deepEqual(result.missingResources, ['img/missing.png']);
    assert.match(result.failures[0].reason, /not found/);
  });

  test(`${label}: a page in a subfolder of the base path`, async () => {
    const result = await make().convertFile(path.join(fixtures, 'site', 'pages', 'sub.html'),
      { basePath: path.join(fixtures, 'site') });
    assert.equal(result.pdf.subarray(0, 5).toString(), '%PDF-');
  });

  test(`${label}: paper size and orientation`, async () => {
    assert.match(await pdf('<p>x</p>', { paperSize: 'Letter', orientation: 'landscape' }), /\/MediaBox \[0 0 792 612\]/);
  });

  test(`${label}: AES-256 by default, AES-128 on request`, async () => {
    assert.match(await pdf('<p>x</p>', { userPassword: 'secret' }), /\/V 5 \/R 6/);
    assert.match(await pdf('<p>x</p>', { userPassword: 'secret', encryption: 'aes-128' }), /\/V 4 \/R 4/);
  });

  test(`${label}: PDF/A`, async (t) => {
    let out;
    try {
      out = await pdf('<p style="font-family: Arial, sans-serif">Archive</p>', { pdfA: true });
    } catch (err) {
      if (err instanceof ConversionError) {
        t.skip(`no installed fonts to embed: ${err.message}`);
        return;
      }
      throw err;
    }
    assert.match(out, /<pdfaid:part>2<\/pdfaid:part>/);
  });

  test(`${label}: fillable forms`, async () => {
    const html = '<form><input name="customer" value="Ada"><input type="checkbox" name="ok" checked>' +
      '<select name="plan"><option>A</option><option selected>B</option></select></form>';
    const out = await pdf(html, { fillableForms: true });
    assert.match(out, /\/FT \/Tx \/T \(customer\)/);
    assert.match(out, /\/FT \/Ch \/T \(plan\)/);
    assert.ok(!(await pdf(html)).includes('/AcroForm'));
  });

  test(`${label}: digital signature`, async () => {
    const out = await pdf('<p>Contract</p>', { signature: make().signing() });
    assert.match(out, /\/SubFilter \/ETSI\.CAdES\.detached/);
    assert.match(out, /\/Reason \(Approved\)/);
    const m = out.match(/\/ByteRange \[0 (\d+) (\d+) (\d+)\s*\]/);
    assert.ok(m, 'byte range');
    assert.equal(Number(m[2]) + Number(m[3]), out.length, 'the signed ranges cover the whole file');
  });

  test(`${label}: barcodes and complex scripts`, async () => {
    const result = await make().convert('<p dir="rtl">مرحبا</p><p>हिन्दी</p><barcode code="https://example.com" type="QR">');
    assert.equal(result.pdf.subarray(0, 5).toString(), '%PDF-');
  });

  test(`${label}: an empty document is rejected`, async () => {
    await assert.rejects(make().convert('   '), ConversionError);
  });
}

module.exports = { conversionTests };
