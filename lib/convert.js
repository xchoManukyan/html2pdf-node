'use strict';

// Conversion with the converter binary, run as a child process: the HTML
// goes to its standard input, the PDF to a temporary file, and a JSON
// report to its standard output.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findBinary } = require('./binary');
const { ConversionError, Html2PdfError, TimeoutError } = require('./errors');
const options = require('./options');
const { Result } = require('./result');

/**
 * Runs the binary. Resolves with the exit code and both outputs.
 * @returns {Promise<{code: number|null, stdout: string, stderr: string}>}
 */
function run(binary, args, stdin, env, timeoutSeconds) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(binary, args, { env: { ...process.env, ...env }, windowsHide: true });
    } catch (err) {
      reject(new Html2PdfError(`Could not start the converter "${binary}": ${err.message}`));
      return;
    }
    const out = [];
    const err = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutSeconds * 1000);
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Html2PdfError(`Could not start the converter "${binary}": ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new TimeoutError(`The conversion took longer than ${timeoutSeconds} seconds`));
        return;
      }
      resolve({ code, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
    });
    child.stdin.on('error', () => {}); // the converter may exit before reading everything
    child.stdin.end(stdin);
  });
}

/**
 * Converts an HTML document with the converter binary.
 * @param {string|Buffer} html
 * @param {object} [opts] see the README
 * @param {string} [file] the document's file, for relative links (inside basePath)
 * @returns {Promise<Result>}
 */
async function convertWithBinary(html, opts, file) {
  const o = options.normalize(opts);
  const binary = findBinary();
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'h2p-'));
  const pdfFile = path.join(dir, 'out.pdf');
  try {
    const args = ['-in', '-', '-out', pdfFile, '-json', '-doc', options.documentName(o, file), ...options.toArguments(o)];
    const { code, stdout, stderr } = await run(binary, args, html, options.passwordEnv(o), o.timeout);
    let report;
    try {
      report = JSON.parse(stdout);
    } catch {
      throw new Html2PdfError(`The converter failed (exit code ${code}): ${(stderr || stdout).trim()}`);
    }
    if (!report.ok) {
      throw new ConversionError(report.error || 'conversion failed');
    }
    const pdf = await fs.promises.readFile(pdfFile);
    if (pdf.length === 0) {
      throw new Html2PdfError('The converter did not write a PDF');
    }
    return new Result(pdf, report.cssLibs || [], report.failures || [], report.tookMs || 0);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
}

/** The version of the converter binary in use, e.g. "0.1.0". */
async function binaryVersion() {
  const { code, stdout, stderr } = await run(findBinary(), ['-version'], '', {}, 30);
  if (code !== 0) {
    throw new Html2PdfError(`The converter binary does not run: ${(stderr || stdout).trim()}`);
  }
  return stdout.trim();
}

module.exports = { convertWithBinary, binaryVersion };
