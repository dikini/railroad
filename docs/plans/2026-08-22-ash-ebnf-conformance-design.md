# Ash EBNF conformance design

## Goal

Make railroad compile every `ebnf` fence form required by Ash AD-0003 while
keeping `=` compatibility and making the conformance suite independent of an
external Ash checkout.

## Approach

Add a self-contained Markdown fixture under `test/fixtures/`. Every `ebnf`
fence has explanatory prose and uses the Ash-authored `::=` assignment form.
Across the fixture, examples cover multiline productions, semicolon
termination, alternatives, grouping, optional and repeated expressions,
postfix quantifiers, character classes, and slash-delimited display regexes.
Tests extract every fence, compile every production, and validate each emitted
RRD diagram with the bundled LibRRD parser.

Replace the current absolute-path Ash specification tests with the local
fixture checks. Focused compiler tests separately prove that `=` and `::=`
produce identical output, preserving compatibility for existing documents.

Tokenize both source spellings as a single assignment token. The tokenizer
checks `::=` before one-character punctuation so longest-match behavior is
explicit, and the parser expects the shared assignment token. Parsing,
compilation, diagnostics, and both the VS Code and Rehype adapters continue to
share `src/ebnf.js`; no host-specific syntax handling is added.

Update README examples to use `::=` and document `=` as compatibility syntax.
Update integration tests to exercise Ash-authored fences through both host
paths while the focused compiler tests retain coverage of `=`.

## Error handling

Existing source-located EBNF errors and error-rendering behavior remain in
place. Malformed assignment spellings still fail at the first unexpected or
missing token, while valid `=` and `::=` spellings enter the same parser path.

## Verification

Use test-driven development: first add equality tests, integration examples,
and the local conformance fixture and observe failures on `::=`. Then implement
the assignment token and rerun focused tests. Finish with the complete test
suite and `npm run build`, covering the shared compiler and both initial host
integrations.
