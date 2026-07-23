import test from 'node:test';
import assert from 'node:assert/strict';

import { targetWidth, viewBoxFor } from '../src/preview.js';

test('uses the available width when it can accommodate the diagram', () => {
  assert.equal(targetWidth(840, 300), 840);
});

test('preserves librrd minimum content width in a narrow preview', () => {
  assert.equal(targetWidth(240, 300), 300);
});

test('uses at least one pixel when a hidden preview reports zero width', () => {
  assert.equal(targetWidth(0, 0), 1);
});

test('creates a viewBox from librrd SVG bounds', () => {
  assert.equal(viewBoxFor({ x: 0, y: 0, width: 800, height: 22 }), '0 0 800 22');
});
