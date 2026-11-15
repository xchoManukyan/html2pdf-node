'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { collect, resolve } = require('../lib/assets');
const { fixtures } = require('./helpers');

test('resolve', () => {
  assert.equal(resolve('pages/sub.html', '../css/style.css'), 'css/style.css');
  assert.equal(resolve('pages/sub.html', '/img/logo.svg?v=2#x'), 'img/logo.svg');
  assert.equal(resolve('index.html', 'a%20b.png'), 'a b.png');
  assert.equal(resolve('index.html', '../../etc/passwd'), null);
  assert.equal(resolve('index.html', 'https://example.com/a.png'), null);
  assert.equal(resolve('index.html', 'data:image/png;base64,AAAA'), null);
  assert.equal(resolve('index.html', '//cdn.example.com/x.css'), null);
});

test('collects the files a document refers to, inside the base path only', () => {
  const site = path.join(fixtures, 'site');
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  const files = collect(site, 'index.html', html);
  assert.ok(files.has('css/style.css'));
  assert.ok(files.has('img/logo.svg'));
  assert.ok(!files.has('img/missing.png'), 'missing files are left for the converter to report');
  const outside = collect(site, 'index.html', '<img src="../../../package.json"><style>a{background:url(img/logo.svg)}</style>');
  assert.deepEqual([...outside.keys()], ['img/logo.svg']);
});
