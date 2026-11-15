'use strict';

// Finds the converter binary (html2pdf-core) for this machine. It comes
// from the platform package npm installed with this one (one of the
// optionalDependencies), and is used only if its SHA-256 checksum is the
// one pinned in core.json. HTML2PDF_BINARY points at a binary of your own
// instead (not checked).

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Html2PdfError } = require('./errors');

const core = require('../core.json');

const SCOPE = '@xchomanukyan';

/** Node platform-arch -> release file name of html2pdf-core. */
const PLATFORMS = {
  'linux-x64': 'html2pdf-linux-amd64',
  'linux-arm64': 'html2pdf-linux-arm64',
  'darwin-x64': 'html2pdf-darwin-amd64',
  'darwin-arm64': 'html2pdf-darwin-arm64',
  'win32-x64': 'html2pdf-windows-amd64.exe',
  'win32-arm64': 'html2pdf-windows-arm64.exe',
};

/** The npm package with the binary for a platform, e.g. "@xchomanukyan/html2pdf-linux-x64". */
function platformPackage(platform = `${process.platform}-${process.arch}`) {
  return `${SCOPE}/html2pdf-${platform}`;
}

/** The converter version this package pins. */
function coreVersion() {
  return core.version;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

let verified = null;

/** Returns the path of the converter binary, verifying it once per process. */
function findBinary() {
  const own = process.env.HTML2PDF_BINARY;
  if (own) {
    if (!fs.existsSync(own)) {
      throw new Html2PdfError(`HTML2PDF_BINARY points to "${own}", which does not exist`);
    }
    return own;
  }
  if (verified) {
    return verified;
  }
  const platform = `${process.platform}-${process.arch}`;
  const file = PLATFORMS[platform];
  if (!file) {
    throw new Html2PdfError(`No converter binary is published for ${platform}. Build one from html2pdf-core ` +
      '(sh scripts/build.sh --host) and set HTML2PDF_BINARY.');
  }
  let binary;
  try {
    const pkgDir = path.dirname(require.resolve(`${platformPackage(platform)}/package.json`));
    binary = path.join(pkgDir, 'bin', file);
  } catch {
    throw new Html2PdfError(`The converter package ${platformPackage(platform)} is not installed. It is an optional ` +
      'dependency: install without --omit=optional, on the operating system that runs the code (a node_modules ' +
      'folder copied from another system has the wrong binary). Or set HTML2PDF_BINARY.');
  }
  const expected = core.files[file] && core.files[file].sha256;
  if (!fs.existsSync(binary) || sha256(binary) !== expected) {
    throw new Html2PdfError(`${binary} is not the converter ${core.version} this package expects ` +
      '(checksum mismatch); reinstall the package.');
  }
  verified = binary;
  return binary;
}

module.exports = { findBinary, platformPackage, coreVersion, sha256, PLATFORMS };
