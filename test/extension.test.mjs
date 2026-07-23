import test from 'node:test';
import assert from 'node:assert/strict';

import { configureMarkdownIt } from '../src/extension.js';

test('replaces rrd fences while preserving the existing fence renderer', () => {
  const md = {
    renderer: {
      rules: {
        fence: (tokens, index) => `fallback:${tokens[index].info}`
      }
    }
  };

  configureMarkdownIt(md);

  assert.equal(md.renderer.rules.fence([{ info: 'javascript', content: 'x' }], 0), 'fallback:javascript');
  assert.match(md.renderer.rules.fence([{ info: 'rrd', content: '("x")' }], 0), /class="rrd-diagram"/);
});
