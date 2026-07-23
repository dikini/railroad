import test from 'node:test';
import assert from 'node:assert/strict';

import { isRrdFence, renderRrdPlaceholder } from '../src/fence.js';

test('recognizes rrd fences and ignores other language identifiers', () => {
  assert.equal(isRrdFence('rrd'), true);
  assert.equal(isRrdFence('rrd extra'), true);
  assert.equal(isRrdFence('railroad'), false);
  assert.equal(isRrdFence(''), false);
});

test('renders a safe placeholder that round-trips Unicode RRD source', () => {
  const source = '("λ" [expression])';
  const html = renderRrdPlaceholder(source);

  assert.match(html, /^<div class="rrd-diagram" data-rrd="[A-Za-z0-9_-]+"><\/div>$/);
  const encoded = html.match(/data-rrd="([A-Za-z0-9_-]+)"/)?.[1];
  assert.equal(Buffer.from(encoded, 'base64url').toString('utf8'), source);
});
