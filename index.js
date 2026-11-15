'use strict';

// HTML to PDF for Node.js: flexbox, grid, Tailwind and Bootstrap, right-to-left
// and Indic scripts, fillable forms, signatures, barcodes, PDF/A. The
// rendering is done by html2pdf-core, a self-contained converter binary
// installed with this package (no Chrome).

const fs = require('node:fs');
const path = require('node:path');
const { coreVersion, findBinary } = require('./lib/binary');
const { binaryVersion, convertWithBinary } = require('./lib/convert');
const { ConversionError, Html2PdfError, TimeoutError } = require('./lib/errors');
const { HttpClient } = require('./lib/http');
const { Result } = require('./lib/result');

/**
 * Converts HTML to PDF. Resolves with a Result (result.pdf is a Buffer).
 * @param {string|Buffer} html
 * @param {object} [options]
 */
function convert(html, options = {}) {
  return convertWithBinary(html, options);
}

/**
 * Converts an HTML file. Its stylesheets, images and fonts load from its folder, or from anywhere inside
 * options.basePath.
 * @param {string} file
 * @param {object} [options]
 */
async function convertFile(file, options = {}) {
  const html = await fs.promises.readFile(file);
  const opts = { ...options };
  if (opts.basePath === undefined || opts.basePath === null) {
    opts.basePath = path.dirname(path.resolve(file));
  }
  return convertWithBinary(html, opts, file);
}

module.exports = {
  convert,
  convertFile,
  HttpClient,
  Result,
  Html2PdfError,
  ConversionError,
  TimeoutError,
  findBinary,
  coreVersion,
  binaryVersion,
  /** Pass as signature.certificate with HttpClient: the server signs with its own certificate. */
  SERVER_CERTIFICATE: '',
};
