import test from 'node:test';
import assert from 'node:assert/strict';

import { isEbnfFence, isRrdFence, renderEbnfPlaceholders, renderRrdPlaceholder } from '../src/fence.js';

test('recognizes rrd fences and ignores other language identifiers', () => {
  assert.equal(isRrdFence('rrd'), true);
  assert.equal(isRrdFence('rrd extra'), true);
  assert.equal(isRrdFence('railroad'), false);
  assert.equal(isRrdFence(''), false);
});

test('recognizes EBNF fences and ignores other language identifiers', () => {
  assert.equal(isEbnfFence('ebnf'), true);
  assert.equal(isEbnfFence('ebnf target'), true);
  assert.equal(isEbnfFence('rrd'), false);
  assert.equal(isEbnfFence(''), false);
});

test('renders a safe placeholder that round-trips Unicode RRD source', () => {
  const source = '("λ" [expression])';
  const html = renderRrdPlaceholder(source);

  assert.match(html, /^<div class="rrd-diagram" data-rrd="[A-Za-z0-9_-]+"><\/div>$/);
  const encoded = html.match(/data-rrd="([A-Za-z0-9_-]+)"/)?.[1];
  assert.equal(Buffer.from(encoded, 'base64url').toString('utf8'), source);
});

test('renders one RRD placeholder per EBNF production', () => {
  const html = renderEbnfPlaceholders('first = "a" ; second = first | "b" ;');

  assert.match(html, /<section class="rrd-production"><h4>first<\/h4><div class="rrd-diagram"/);
  assert.match(html, /<section class="rrd-production"><h4>second<\/h4><div class="rrd-diagram"/);
  assert.equal((html.match(/class="rrd-diagram"/g) ?? []).length, 2);
});

test('renders an escaped preview error when EBNF cannot be compiled', () => {
  const html = renderEbnfPlaceholders('rule = < ;');

  assert.match(html, /^<pre class="rrd-error">EBNF error at 1:8:/);
  assert.doesNotMatch(html, /< ;/);
});
