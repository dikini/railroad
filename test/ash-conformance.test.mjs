import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { compileEbnf } from '../src/ebnf.js';
import { LibRRD } from '../vendor/librrd-main/api/librrd.js';

const fixture = readFileSync(
  new URL('./fixtures/ash-ebnf-conformance.md', import.meta.url),
  'utf8'
);

const fences = [...fixture.matchAll(/^```ebnf\r?\n([\s\S]*?)^```$/gm)]
  .map((match) => match[1]);

test('compiles every EBNF fence in the self-contained Ash conformance fixture', () => {
  assert.equal(fences.length, 4, 'fixture must contain exactly four bare EBNF fences');

  const productions = fences.flatMap((source) => compileEbnf(source));
  assert.deepEqual(
    productions.map(({ name }) => name),
    [
      'expression',
      'term',
      'call',
      'decorated_statement',
      'identifier',
      'comment_text',
      'integer',
      'decimal'
    ],
    'fixture must contain the complete ordered production corpus'
  );

  for (const { name, rrd } of productions) {
    assert.doesNotThrow(() => LibRRD.parseDiagram(rrd), name);
  }
});
