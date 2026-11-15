'use strict';

// Conversion through a converter server (html2pdf-core started with
// -addr), for when several applications share one converter or child
// processes are not allowed.

const { collect } = require('./assets');
const { ConversionError, Html2PdfError, TimeoutError } = require('./errors');
const options = require('./options');
const { Result } = require('./result');

class HttpClient {
  /**
   * @param {string} baseUrl e.g. "http://pdf-service:8080"
   * @param {{headers?: Record<string, string>}} [config] extra request headers (e.g. for an authenticating proxy)
   */
  constructor(baseUrl, config = {}) {
    if (!/^https?:\/\//i.test(baseUrl)) {
      throw new Html2PdfError(`The converter URL must start with http:// or https://, got "${baseUrl}"`);
    }
    this.url = `${baseUrl.replace(/\/+$/, '')}/api/convert`;
    this.headers = config.headers || {};
  }

  /**
   * Converts a document. With basePath set, the files it refers to (inside basePath) are uploaded with it.
   * @param {string|Buffer} html
   * @param {object} [opts]
   * @param {string} [file] the document's file, for relative links (inside basePath)
   * @returns {Promise<Result>}
   */
  async convert(html, opts, file) {
    const o = options.normalize(opts);
    const doc = options.documentName(o, file);
    const text = Buffer.isBuffer(html) ? html.toString('utf8') : String(html);
    const form = new FormData();
    const files = new Map([[doc, Buffer.from(text, 'utf8')]]);
    if (o.basePath !== null) {
      for (const [p, content] of collect(o.basePath, doc, text)) files.set(p, content);
    }
    for (const [p, content] of files) {
      form.append('file', new Blob([content]), p.split('/').pop());
      form.append('path', p);
    }
    form.append('main', doc);
    for (const [name, value] of Object.entries(options.toFormFields(o))) {
      for (const v of Array.isArray(value) ? value : [value]) form.append(name, v);
    }

    let response;
    try {
      response = await fetch(this.url, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/pdf', ...this.headers },
        signal: AbortSignal.timeout(o.timeout * 1000),
      });
    } catch (err) {
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new TimeoutError(`The converter at ${this.url} did not answer within ${o.timeout} seconds`);
      }
      const cause = err && err.cause && err.cause.message ? `: ${err.cause.message}` : '';
      throw new Html2PdfError(`Could not reach the converter at ${this.url}${cause}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (response.status !== 200) {
      let message = `HTTP ${response.status}`;
      try {
        const error = JSON.parse(body.toString('utf8'));
        if (error && error.error) message = String(error.error);
      } catch {
        // not JSON
      }
      if ([400, 413, 422].includes(response.status)) {
        throw new ConversionError(message);
      }
      throw new Html2PdfError(`The converter answered ${message}`);
    }
    let failures = [];
    try {
      failures = JSON.parse(decodeURIComponent(response.headers.get('x-missing-details') || '[]')) || [];
    } catch {
      failures = [];
    }
    const libs = (response.headers.get('x-css-lib') || '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((entry) => {
        const [lib, source = ''] = entry.split(';').map((s) => s.trim());
        return { lib, source };
      });
    return new Result(body, libs, failures, Number(response.headers.get('x-render-time-ms')) || 0);
  }

  /**
   * Converts an HTML file; the files it refers to inside its folder (or options.basePath) are uploaded with it.
   * @param {string} file
   * @param {object} [opts]
   * @returns {Promise<Result>}
   */
  async convertFile(file, opts = {}) {
    const html = await require('node:fs').promises.readFile(file);
    const o = { ...opts };
    if (o.basePath === undefined || o.basePath === null) {
      o.basePath = require('node:path').dirname(require('node:path').resolve(file));
    }
    return this.convert(html, o, file);
  }
}

module.exports = { HttpClient };
