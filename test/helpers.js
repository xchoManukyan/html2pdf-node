'use strict';

// Test setup: the converter binary comes from HTML2PDF_BINARY, or from .core/
// (npm run fetch-core, or npm run fetch-core -- --local ../html2pdf-core).

const fs = require('node:fs');
const path = require('node:path');
const { PLATFORMS } = require('../lib/binary');

const root = path.join(__dirname, '..');
const fixtures = path.join(__dirname, 'fixtures');

function testBinary() {
  if (process.env.HTML2PDF_BINARY) return process.env.HTML2PDF_BINARY;
  const file = PLATFORMS[`${process.platform}-${process.arch}`];
  const candidate = file && path.join(root, '.core', file);
  if (!candidate || !fs.existsSync(candidate)) {
    throw new Error('No converter binary for the tests: run "npm run fetch-core" (or set HTML2PDF_BINARY)');
  }
  process.env.HTML2PDF_BINARY = candidate;
  return candidate;
}

/** Options that sign with the test certificate. */
function signing() {
  return {
    certificate: path.join(fixtures, 'signing', 'test-cert.pem'),
    privateKey: path.join(fixtures, 'signing', 'test-key.pem'),
    reason: 'Approved',
  };
}

module.exports = { testBinary, signing, fixtures };
