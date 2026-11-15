# html2pdf for Node.js

[![CI](https://github.com/xchoManukyan/html2pdf-node/actions/workflows/ci.yml/badge.svg)](https://github.com/xchoManukyan/html2pdf-node/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xchomanukyan/html2pdf)](https://www.npmjs.com/package/@xchomanukyan/html2pdf)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

HTML to PDF without Chrome: flexbox and grid, Tailwind and Bootstrap (detected automatically), SVG, WebP and web
fonts, right-to-left and Indic scripts, fillable forms, digital signatures, barcodes, PDF/A and AES-256 encryption.
The rendering is done by [html2pdf-core](https://github.com/xchoManukyan/html2pdf-core), a self-contained converter
also used by the [PHP package](https://github.com/xchoManukyan/html2pdf-php). No dependencies, no install scripts.

```js
const fs = require('node:fs');
const { convert } = require('@xchomanukyan/html2pdf'); // or: import { convert } from '@xchomanukyan/html2pdf'

const { pdf } = await convert('<h1 class="text-3xl font-bold">Invoice 1042</h1>', { paperSize: 'A4' });
await fs.promises.writeFile('invoice.pdf', pdf);
```

## Installation

```bash
npm install @xchomanukyan/html2pdf
```

Node.js 18.17 or later, on Linux, macOS or Windows (x64 or ARM64). The converter binary comes in a small package for
each platform (`@xchomanukyan/html2pdf-linux-x64` and so on), and npm installs only the one for your machine. The
package checks its SHA-256 checksum against the pinned converter version before the first use.

- Install on the operating system that runs the code. A `node_modules` folder copied from a Mac into a Linux image
  has the wrong binary: run `npm ci` in the image.
- Don't use `--omit=optional` / `--no-optional`: the binaries are optional dependencies.
- `HTML2PDF_BINARY=/path/to/html2pdf-linux-amd64` uses a binary of your own instead (not checked).

## Usage

```js
const { convert, convertFile } = require('@xchomanukyan/html2pdf');

// a file with its stylesheets, images and fonts (they load from its folder)
const result = await convertFile('/var/www/templates/invoice.html');

// options
const { pdf } = await convert(html, {
  paperSize: 'A4',              // A3, A4, A5, Letter, Legal, [80, 200] or '80x200' (mm)
  orientation: 'landscape',
  marginMm: 10,                 // 5-50; CSS @page rules in the document win
  pageNumbers: true,            // "Page X of Y" at the bottom
  viewportWidth: 1280,          // lay out like a 1280px browser window, scaled to the paper
  cssLibraries: ['bootstrap5'], // default []: detect from the page
  basePath: '/var/www/templates', // local files the document may read (nothing outside)
  remoteEnabled: true,          // download http(s) images, CSS, fonts
  userPassword: 'open-me',      // password to open the PDF (AES-256)
  permissions: { print: true, copy: false, modify: false },
  timeout: 30,                  // seconds
});
```

More options:

```js
await convert(html, { fillableForms: true });  // inputs, checkboxes, radio buttons, selects, textareas become PDF fields
await convert(html, { pdfA: true });           // PDF/A-2b for archiving (needs installed or @font-face fonts)
await convert(html, { encryption: 'aes-128' }); // with a password: AES-256 by default; AES-128 or RC4 for old readers
await convert(html, {
  signature: { certificate: 'cert.pem', privateKey: 'key.pem', reason: 'Approved', location: 'Head office' },
});
```

**Signatures** are PAdES baseline signatures (CMS with SHA-256) over the whole file. The certificate and key are PEM
files (RSA or ECDSA; the key without a password; both may be in one file). To convert a `.p12`/`.pfx`:
`openssl pkcs12 -in signer.p12 -nodes -out signer.pem`. A self-signed certificate shows as "validity unknown" until
the reader trusts it.

**In the HTML:** `dir="rtl"` for Arabic, Hebrew, Persian and Urdu; Hindi, Bengali, Tamil and the other Indic scripts
are shaped with the font's OpenType rules; `hyphens: auto` with a `lang` attribute hyphenates 76 language variants;
`<barcode code="..." type="QR">` draws QR codes, Code 128, EAN-13 and more (mPDF's syntax).

### What happened during the conversion

```js
const result = await convert(html);
result.pdf;               // Buffer
result.missingResources;  // ['img/missing.png']
result.failures;          // [{ ref: 'img/missing.png', reason: 'resource not found' }]
result.cssLibraries;      // [{ lib: 'bootstrap5', source: 'classes' }]
result.renderTimeMs;
```

Errors are `Html2PdfError`; a rejected document (empty, not HTML, too large) is a `ConversionError`, a conversion that
took too long a `TimeoutError`. All three are exported.

## Converter server instead of the binary

When several applications should share one converter, run it as a service (any html2pdf-core binary,
`html2pdf-linux-amd64 -addr :8080`) and use the client:

```js
const { HttpClient, SERVER_CERTIFICATE } = require('@xchomanukyan/html2pdf');

const client = new HttpClient('http://pdf-service:8080', { headers: { Authorization: 'Bearer SECRET' } });
const { pdf } = await client.convertFile('templates/invoice.html'); // its local files are uploaded with it
await client.convert(html, { signature: { certificate: SERVER_CERTIFICATE, reason: 'Approved' } });
```

The server reads no local files, so with a base path the client uploads the stylesheets, images and fonts the
document refers to (inside the base path only). It signs with the certificate it was started with
(`-sign-cert cert.pem -sign-key key.pem -sign-token SECRET`), and only for requests that send the secret as above, so
the key stays on the server and nobody else who can reach it can sign documents in your name. Apart from signing it
has no authentication: keep it on an internal network, or pass headers for an authenticating proxy the same way.
`-max-jobs N` limits the conversions it runs at once (default: the number of CPUs).

## Development

```bash
npm run fetch-core        # the pinned converter for this machine, into .core/ (verified)
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for working with an unreleased converter and releasing.

## Licence

MIT, see [LICENSE](LICENSE). The converter binary contains code and data from other projects (Bootstrap, Tailwind
CSS, the Brotli dictionary, hyphenation patterns), listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
