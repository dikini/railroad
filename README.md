# RRD Preview

RRD Preview turns grammar code fences into [librrd](https://github.com/epfl-systemf/librrd) railroad diagrams. It includes two integrations that use the same EBNF compiler and librrd renderer:

- a Visual Studio Code extension that renders diagrams in VS Code's built-in Markdown preview;
- `rrd-preview/rehype`, a [Rehype](https://github.com/rehypejs/rehype) plugin that produces static SVG in an HTML build pipeline.

Use `rrd` fences for librrd's diagram DSL and `ebnf` fences for the supported EBNF grammar syntax. EBNF productions are compiled to RRD automatically; a fence containing several productions produces one labeled diagram per production.

````markdown
```rrd
("function" [identifier] "(" (- [parameter] ",") ")")
```

```ebnf
expression ::= term { ("+" | "-") term } ;
term ::= factor { ("*" | "/") factor } ;
```
````

### EBNF terminals

Ash-authored grammar productions use `::=` and end with `;`. The `=` assignment spelling remains accepted for compatibility with other documents. In addition to quoted terminals, unambiguous regex-like character classes are accepted as visual terminals, including `[a-zA-Z_]` and `[^\n]`. Postfix `+`, `*`, and `?` remain EBNF repetition operators, so `[a-zA-Z_]+` is shown as one-or-more occurrences of that class.

For a complete regex-shaped terminal, use slash delimiters, for example `/\d+/`. The contents are display-only: RRD Preview preserves them in the diagram but does not parse, validate, or execute regex syntax. Since librrd terminal labels must use either single or double quotes, a regex literal containing both quote delimiters (such as `/["']/`) produces a clear error.

## Rehype plugin

Install the package in the project that generates your HTML:

```sh
npm install rrd-preview
```

Run the plugin after the Markdown AST has been converted to HTML AST (HAST), normally after `remark-rehype`. It replaces `pre > code.language-rrd` and `pre > code.language-ebnf` nodes with `<figure class="rrd-diagram">` elements containing SVG. Other code fences are unchanged.

```js
import rehypeRailroad from 'rrd-preview/rehype';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import {unified} from 'unified';

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeRailroad, {width: 800})
  .use(rehypeStringify)
  .process('```ebnf\\nexpression ::= term { ("+" | "-") term } ;\\n```');

console.log(String(file));
```

The generated SVG is static: readers do not need a client-side librrd bundle or JavaScript. EBNF compilation and RRD parse failures are added to the unified VFile diagnostics and become readable, escaped `<pre class="rrd-error">` blocks in the generated HTML.

### Options

- `width` — layout width in pixels; defaults to `800`.
- `stylesheet` — librrd layout stylesheet. It defaults to the monospace, responsive layout used by the VS Code preview.

Add site styling as needed; this neutral baseline keeps diagrams readable without relying on VS Code theme variables:

```css
.rrd-diagram {
  margin-block: 1rem;
  max-width: 100%;
  overflow-x: auto;
}

.rrd-diagram svg {
  display: block;
  max-width: none;
}

.rrd-error {
  color: #b42318;
  white-space: pre-wrap;
}
```

## VS Code extension

Install the packaged extension, then open a Markdown preview. The same `rrd` and `ebnf` fences render automatically. The source remains an ordinary CommonMark code fence outside VS Code; VS Code diagrams reflow as the preview width changes.

## Local development

Building requires Node.js, Java 17+, and sbt. Install dependencies with `npm install`, then run `npm run check`. The build first generates librrd's JavaScript API, then bundles the VS Code preview and the Node-compatible Rehype entry point. Package a locally installable VSIX with `npm run package`.

Before publishing the VS Code extension, replace `publisher` in `package.json` with the identifier of your VS Code Marketplace publisher.

## References

- [Rehype](https://github.com/rehypejs/rehype) — HTML processor and plugin ecosystem used by `rrd-preview/rehype`.
- [unified](https://unifiedjs.com/) — the processor pipeline used with Remark and Rehype.
- [librrd](https://github.com/epfl-systemf/librrd) — the railroad diagram layout engine and RRD DSL implementation.
- [ISO/IEC 14977:1996](https://www.iso.org/standard/26153.html) — Extended BNF (EBNF) reference. This project supports the common terminals, references, sequences, alternatives, grouping, optional, repetition, and postfix quantifier forms documented by its tests.

## License notices

This project bundles librrd, which is MIT licensed. Distributed artifacts include `THIRD_PARTY_NOTICES.md`.
