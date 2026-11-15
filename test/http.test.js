'use strict';

// The same conversions through the converter started as a server, which
// signs with the test certificate it was started with.

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const test = require('node:test');
const { fixtures, testBinary } = require('./helpers');
const { HttpClient, Html2PdfError, SERVER_CERTIFICATE } = require('..');
const { conversionTests } = require('./conversions');

let server;
let client;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    }).on('error', reject);
  });
}

async function waitFor(port) {
  for (let i = 0; i < 100; i++) {
    const ok = await new Promise((resolve) => {
      const c = net.connect(port, '127.0.0.1', () => { c.end(); resolve(true); }).on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('the converter server did not start');
}

test.before(async () => {
  const port = await freePort();
  server = spawn(testBinary(), ['-addr', `127.0.0.1:${port}`,
    '-sign-cert', path.join(fixtures, 'signing', 'test-cert.pem'),
    '-sign-key', path.join(fixtures, 'signing', 'test-key.pem')], { stdio: 'ignore', windowsHide: true });
  await waitFor(port);
  client = new HttpClient(`http://127.0.0.1:${port}`);
});

test.after(() => {
  if (server) server.kill();
});

conversionTests('server', () => ({
  convert: (html, opts) => client.convert(html, opts),
  convertFile: (file, opts) => client.convertFile(file, opts),
  signing: () => ({ certificate: SERVER_CERTIFICATE, reason: 'Approved' }),
}));

test('server: the URL must be http(s)', () => {
  assert.throws(() => new HttpClient('pdf-service:8080'), Html2PdfError);
});

test('server: an unreachable server is reported', async () => {
  const port = await freePort();
  await assert.rejects(new HttpClient(`http://127.0.0.1:${port}`).convert('<p>x</p>', { timeout: 5 }), Html2PdfError);
});
