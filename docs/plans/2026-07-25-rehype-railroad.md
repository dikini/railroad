# Rehype Railroad Diagram Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an installable Rehype plugin that turns `rrd` and `ebnf` Markdown code fences into static librrd SVG diagrams without changing VS Code extension behavior.

**Architecture:** `src/rehype.js` will be a HAST transformer that recognizes `pre > code.language-rrd` and `pre > code.language-ebnf`, reuses `compileEbnf`, renders librrd in a temporary LinkeDOM document, and converts the resulting SVG DOM to HAST. It will replace matching fences with semantic figure markup and issue unified diagnostics for invalid source. The existing Markdown-It extension keeps its current placeholder-and-browser-renderer path.

**Tech Stack:** Node.js ESM, unified/Rehype HAST, LinkeDOM, bundled librrd API, Node test runner, esbuild.

---

### Task 1: Add the Rehype runtime and pipeline test dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Add package metadata and dependencies**

Add the published plugin entry point and runtime dependency:

```json
{
  "exports": {
    "./rehype": "./src/rehype.js"
  },
  "dependencies": {
    "linkedom": "^0.18.12"
  },
  "devDependencies": {
    "rehype-stringify": "^10.0.1",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.1.2",
    "unified": "^11.0.5"
  }
}
```

Use `npm install` to produce the matching lockfile; retain all existing VS Code metadata and scripts.

**Step 2: Verify installation**

Run: `npm install`

Expected: successful lockfile update with no removed existing dependencies.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add rehype plugin dependencies"
```

### Task 2: Specify fence transformation behavior with failing integration tests

**Files:**

- Create: `test/rehype.test.mjs`
- Create: `src/rehype.js`

**Step 1: Write the failing tests**

Create a helper that runs a real Markdown-to-HAST pipeline:

```js
async function render(markdown) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeRailroad)
    .use(rehypeStringify)
    .process(markdown);
  return file;
}
```

Add tests that assert:

- an `rrd` fence is replaced with `figure.rrd-diagram` containing `svg`, and the DSL source is absent;
- an `ebnf` fence creates an SVG with a production caption, including one figure per production;
- ordinary JavaScript fences remain `pre > code.language-js`;
- invalid RRD and EBNF source produces `pre.rrd-error`, escapes unsafe source, and adds a VFile message;
- passing `{width: 320}` affects the generated SVG layout width.

**Step 2: Run tests to verify they fail**

Run: `node --test test/rehype.test.mjs`

Expected: FAIL because `src/rehype.js` does not exist.

### Task 3: Implement a reusable static SVG renderer

**Files:**

- Create: `src/rehype.js`
- Test: `test/rehype.test.mjs`

**Step 1: Implement core helpers**

In `src/rehype.js`, export a default attacher and named `rehypeRailroad`. Define the default layout stylesheet already used by `src/preview-entry.js` and a width of `800`.

Implement helpers that:

```js
function textContent(node) { /* recursively join HAST text values */ }
function codeLanguage(code) { /* find language-rrd or language-ebnf in className */ }
function domToHast(node) { /* recursively map DOM element/text nodes into HAST */ }
function renderSvg(rrd, options) { /* render librrd in a temporary LinkeDOM document */ }
```

`renderSvg` must install `document`, `window`, and `Node` from a LinkeDOM document only for the call to `LibRRD.layOutToSVG`, then restore pre-existing global values in `finally`. Add `role="img"` and `aria-label="Railroad diagram"`; set a stable SVG `viewBox`, width, and height based on the rendered SVG attributes or bounds. Do not mutate the host application's globals permanently.

**Step 2: Implement HAST replacement**

Walk element children recursively. For each `pre` with exactly one non-whitespace `code` child, resolve its language and source text. For `rrd`, construct one `figure` from the source. For `ebnf`, call `compileEbnf` and construct one labeled figure per production. Replace the original child in its parent with the new node(s); never visit or alter nonmatching code blocks.

Represent one diagram as:

```js
{
  type: 'element',
  tagName: 'figure',
  properties: {className: ['rrd-diagram']},
  children: [
    ...(name ? [{type: 'element', tagName: 'figcaption', properties: {}, children: [{type: 'text', value: name}]}] : []),
    svg
  ]
}
```

**Step 3: Implement safe diagnostics**

On parse or render errors call `file.message('Railroad diagram error: …', pre)` and replace the fence with a `pre.rrd-error` containing text only. Do not emit source through `raw` HAST nodes.

**Step 4: Run focused tests**

Run: `node --test test/rehype.test.mjs`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/rehype.js test/rehype.test.mjs
git commit -m "feat: add rehype railroad plugin"
```

### Task 4: Verify public package exports and compatibility

**Files:**

- Modify: `test/rehype.test.mjs`
- Modify only if exposed by tests: `package.json`, `src/rehype.js`

**Step 1: Add package-boundary test**

Use `import('rrd-preview/rehype')` (or the current package self-reference) and assert its default export is a plugin attacher. This verifies consumers can use the advertised entry point rather than an internal source path.

**Step 2: Run focused tests**

Run: `node --test test/rehype.test.mjs`

Expected: PASS.

**Step 3: Run existing extension tests**

Run: `node --test test/extension.test.mjs test/fence.test.mjs test/ebnf.test.mjs test/preview.test.mjs`

Expected: PASS; existing VS Code fence behavior is unchanged.

**Step 4: Commit**

```bash
git add package.json package-lock.json src/rehype.js test/rehype.test.mjs
git commit -m "test: verify rehype plugin package export"
```

### Task 5: Document the extension and plugin

**Files:**

- Modify: `README.md`

**Step 1: Add description and usage**

Rewrite the introduction to describe both delivery modes: the VS Code extension and the `rrd-preview/rehype` plugin. Add an EBNF example and an RRD example. Include a complete unified pipeline:

```js
import rehypeRailroad from 'rrd-preview/rehype';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import {unified} from 'unified';

const html = String(await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeRailroad, {width: 800})
  .use(rehypeStringify)
  .process('```ebnf\\nexpression = term { ("+" | "-") term } ;\\n```'));
```

Document that the plugin must run after Markdown has become HAST, generates static SVG, accepts `width` and `stylesheet`, preserves other code blocks, and reports invalid diagrams as unified diagnostics.

**Step 2: Add references and styling guidance**

Link to Rehype, unified, librrd, and the RRD grammar/reference. Include neutral browser CSS for `.rrd-diagram`, `.rrd-diagram svg`, and `.rrd-error`; do not copy VS Code-specific CSS variables into site guidance.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document rehype railroad plugin"
```

### Task 6: Full verification and review

**Files:**

- Modify only if verification exposes defects.

**Step 1: Run the full check**

Run: `npm run check`

Expected: all Node tests pass and the VS Code extension bundle builds.

**Step 2: Exercise the generated HTML**

Run: `node --test test/rehype.test.mjs`

Expected: static SVG output, EBNF labels, errors, package export, and unchanged ordinary fences remain covered.

**Step 3: Review only task-scoped changes**

Run: `git diff --check HEAD~4..HEAD && git status --short`

Expected: no whitespace errors; existing untracked `.github/` and older plan document remain untouched.
