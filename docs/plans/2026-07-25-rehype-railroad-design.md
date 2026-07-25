# Rehype Railroad Diagram Plugin Design

## Goal

Add a Rehype plugin that replaces Markdown-generated `rrd` and `ebnf` code fences with static, self-contained SVG railroad diagrams, while preserving the VS Code Markdown extension.

## Context

The existing extension detects `rrd` and `ebnf` fences in Markdown-It, compiles EBNF with `src/ebnf.js`, and defers SVG rendering to a browser-side librrd bundle. Rehype instead receives a HAST HTML tree, conventionally containing `pre > code.language-rrd` or `pre > code.language-ebnf` after Markdown is converted to HTML.

## Chosen approach

The new plugin will transform matching HAST code blocks at build time:

1. Locate a `pre` element whose only meaningful child is a `code` element carrying `language-rrd` or `language-ebnf`.
2. Read the code node text. For `rrd`, use it directly; for `ebnf`, call the existing `compileEbnf` helper and produce one diagram per grammar production.
3. Render each RRD program with bundled librrd at a configured fixed width and convert its generated SVG DOM into a HAST element tree.
4. Replace the source `pre` with a `figure.rrd-diagram`; EBNF production diagrams include a `figcaption` naming the production. Other fences remain unchanged.
5. Report parse or render errors with `file.message` and replace the source with a readable `pre.rrd-error` block.

The plugin will use a lightweight server-side DOM implementation only while librrd renders, restoring the caller's global DOM bindings afterwards. SVG is generated during the Rehype pipeline, so output has no JavaScript runtime dependency.

## Alternatives considered

- **Client-side placeholders:** reuses the extension exactly but requires every generated site to ship and initialize a browser bundle.
- **Low-level helpers only:** minimizes package code but pushes HAST traversal and error handling onto each user.
- **Build-time SVG (chosen):** creates portable output, follows Rehype's tree-transformer model, and reuses the compiler and librrd vendor source already in this repository.

## Public interface

The package will export a default `rehypeRailroad` attacher. Its optional settings are:

- `width` — SVG layout width, defaulting to 800 pixels.
- `stylesheet` — librrd layout stylesheet, defaulting to the style used by the VS Code preview.

## Validation

Integration tests will run a real unified/remark/Rehype pipeline. They will prove RRD and EBNF transformations create SVG, multiple EBNF productions stay labeled, unrelated code remains unchanged, and malformed input produces both a diagnostic and safe error markup. The complete package test/build check will remain green.
