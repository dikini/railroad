import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import rehypeRailroad from '../src/rehype.js';

function renderFixture(rrd, { width }) {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      width: String(width),
      role: 'img',
      ariaLabel: 'Railroad diagram',
      dataRrd: rrd
    },
    children: []
  };
}

async function render(markdown, options) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeRailroad, { renderer: renderFixture, ...options })
    .use(rehypeStringify)
    .process(markdown);
}

async function renderWithLibrrd(markdown, options) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeRailroad, options)
    .use(rehypeStringify)
    .process(markdown);
}

test('replaces an RRD fence with a static SVG railroad diagram', async () => {
  const file = await render('```rrd\n("function" [identifier])\n```');

  assert.match(String(file), /<figure class="rrd-diagram"><svg\b/);
  assert.match(String(file), /role="img"/);
  assert.match(String(file), /data-rrd="\(&#x22;function&#x22; \[identifier\]\)/);
  assert.equal(file.messages.length, 0);
});

test('renders every Ash-authored EBNF production in a fence as a labeled diagram', async () => {
  const file = await renderWithLibrrd('```ebnf\nfirst ::= "a" ;\nsecond ::= first | "b" ;\n```');

  assert.equal((String(file).match(/<figure class="rrd-diagram">/g) ?? []).length, 2);
  assert.match(String(file), /<figcaption>first<\/figcaption>/);
  assert.match(String(file), /<figcaption>second<\/figcaption>/);
  assert.match(String(file), /class="librrd-station librrd-terminal"/);
  assert.equal(file.messages.length, 0);
});

test('leaves ordinary code fences unchanged', async () => {
  const file = await render('```js\nconst value = 1;\n```');

  assert.match(String(file), /<pre><code class="language-js">const value = 1;\n<\/code><\/pre>/);
  assert.doesNotMatch(String(file), /rrd-diagram/);
});

test('reports malformed diagram input and escapes its error output', async () => {
  const file = await render('```ebnf\nrule = < ;\n```');

  assert.match(String(file), /<pre class="rrd-error">Railroad diagram error: EBNF error/);
  assert.match(String(file), /&#x3C;/);
  assert.equal(file.messages.length, 1);
  assert.match(file.messages[0].reason, /Railroad diagram error: EBNF error/);
});

test('uses the configured layout width', async () => {
  const file = await render('```rrd\n("x")\n```', { width: 320 });

  assert.match(String(file), /<svg[^>]*width="320"/);
});

test('renders SVG with the bundled librrd layout engine', async () => {
  const file = await renderWithLibrrd('```rrd\n("x")\n```');

  assert.match(String(file), /class="librrd-station librrd-terminal"/);
  assert.equal(file.messages.length, 0);
});

test('publishes the Rehype plugin as a bundled package entry point', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));

  assert.equal(manifest.exports['./rehype'], './dist/rehype.js');
  assert.match(manifest.description, /Rehype/);
});
