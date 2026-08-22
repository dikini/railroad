# Ash EBNF Conformance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make railroad accept and render every Ash AD-0003 `ebnf` fence form from a self-contained conformance corpus while retaining `=` compatibility.

**Architecture:** Normalize `=` and `::=` into one tokenizer assignment token consumed by the existing shared parser. Replace absolute-path Ash corpus checks with a local explanatory Markdown fixture, then exercise Ash-authored syntax through the shared compiler and both VS Code and Rehype adapters.

**Tech Stack:** ESM JavaScript, Node.js test runner, Markdown fixtures, bundled LibRRD parser, esbuild, sbt/Scala.js.

---

### Task 1: Add failing assignment-operator compiler tests

**Files:**
- Modify: `test/ebnf.test.mjs`

**Step 1: Write the equivalence test**

Add a focused test that compiles the same production once with `=` and once
with `::=` and requires deep equality:

```js
test('accepts Ash and compatibility production assignments', () => {
  const compatible = compileEbnf('rule = "x" ;');
  const ash = compileEbnf('rule ::= "x" ;');

  assert.deepEqual(ash, compatible);
});
```

**Step 2: Run the focused test to verify it fails**

Run:
`node --test --test-name-pattern='production assignments' test/ebnf.test.mjs`

Expected: FAIL with `EBNF error at 1:6: unexpected character ":"` because the
tokenizer does not recognize `::=`.

**Step 3: Add an Ash-assignment diagnostic test**

Add a test requiring malformed `rule ::= ;` to report the semicolon's source
location and an expected-expression message:

```js
assert.throws(
  () => compileEbnf('rule ::= ;'),
  /EBNF error at 1:10: expected an expression/
);
```

This remains RED until `::=` is tokenized.

**Step 4: Commit the RED tests**

```bash
git add test/ebnf.test.mjs
git commit -m "test: cover EBNF production assignments"
```

### Task 2: Add the self-contained Ash conformance fixture

**Files:**
- Create: `test/fixtures/ash-ebnf-conformance.md`
- Create: `test/ash-conformance.test.mjs`
- Modify: `test/ebnf.test.mjs`

**Step 1: Write the local Markdown fixture**

Create three or more bare `ebnf` fences, each immediately accompanied by prose
that explains its productions. Use `::=` and terminating semicolons throughout.
Across the fixture, cover:

- multiple productions in one fence and a production spanning lines;
- sequences, alternatives, and `( ... )` groups;
- `[ ... ]` optional groups and `{ ... }` repetitions;
- postfix `?`, `*`, and `+`;
- positive or negated character classes;
- slash-delimited display regexes.

Include the AD example:

```ebnf
expression ::= term { ("+" | "-") term } ;
term ::= factor { ("*" | "/") factor } ;
```

**Step 2: Replace external corpus tests**

Remove the two tests in `test/ebnf.test.mjs` that read
`/home/dikini/Projects/ash/docs/spec/SPEC-095b-TARGET-GRAMMAR.md`. Move Ash
contract coverage to `test/ash-conformance.test.mjs`, which reads only the
local fixture.

**Step 3: Test every local fence and diagram**

Extract every bare `ebnf` fence from the local Markdown file, assert the exact
fixture fence count, and assert that every fence compiles. Flatten the
productions and pass every emitted `rrd` value to `LibRRD.parseDiagram`, using
the production name in assertion messages.

**Step 4: Run the fixture test to verify it fails correctly**

Run: `node --test test/ash-conformance.test.mjs`

Expected: FAIL on the first `::=` at its source location, not on file loading
or fixture extraction.

**Step 5: Commit the RED fixture coverage**

```bash
git add test/fixtures/ash-ebnf-conformance.md test/ash-conformance.test.mjs test/ebnf.test.mjs
git commit -m "test: add Ash EBNF conformance fixture"
```

### Task 3: Normalize both assignment spellings in the shared compiler

**Files:**
- Modify: `src/ebnf.js`

**Step 1: Tokenize assignments with longest match first**

Before single-character punctuation, recognize `::=` and emit:

```js
token('assignment', '::=', startLine, startColumn);
```

Advance all three characters. Recognize `=` separately and emit the same
`assignment` token type with value `=`. Remove `=` from the generic punctuation
set.

**Step 2: Consume the shared token in productions**

Change `Parser.document()` from:

```js
this.expect('=');
```

to:

```js
this.expect('assignment');
```

Do not modify expression parsing or RRD compilation.

**Step 3: Run focused compiler tests**

Run:
`node --test --test-name-pattern='production assignments|Ash assignment' test/ebnf.test.mjs`

Expected: PASS for equivalence and source-located malformed-Ash diagnostics.

Run: `node --test test/ash-conformance.test.mjs`

Expected: PASS; every local fixture fence compiles and every emitted diagram is
accepted by LibRRD.

**Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests pass with no external Ash checkout dependency.

**Step 5: Commit the compiler fix**

```bash
git add src/ebnf.js
git commit -m "fix: accept Ash EBNF assignments"
```

### Task 4: Cover both host integrations and update documentation

**Files:**
- Modify: `test/fence.test.mjs`
- Modify: `test/extension.test.mjs`
- Modify: `test/rehype.test.mjs`
- Modify: `README.md`

**Step 1: Exercise `::=` through both integration paths**

Change representative EBNF sources in the Markdown-It extension/fence tests
and Rehype labeled-diagram test from `=` to `::=`. Keep focused compiler tests
using both spellings so compatibility remains explicit.

**Step 2: Update README examples and syntax prose**

Use `::=` in the main EBNF example and Rehype pipeline example. Replace the
statement that `::=` is rejected with wording that Ash-authored grammars use
`::=`, while `=` remains accepted for compatibility with other documents.
Keep both initial integration paths documented.

**Step 3: Run integration and documentation checks**

Run:
`node --test test/fence.test.mjs test/extension.test.mjs test/rehype.test.mjs`

Expected: PASS with Ash-authored fences rendered by both integrations.

Run: `npm test`

Expected: all tests pass.

**Step 4: Commit integration and documentation changes**

```bash
git add README.md test/fence.test.mjs test/extension.test.mjs test/rehype.test.mjs
git commit -m "docs: document Ash EBNF assignments"
```

### Task 5: Verify the complete branch

**Files:**
- Review: all files above

**Step 1: Inspect scope and whitespace**

Run:
`git diff --check main...HEAD && git diff --stat main...HEAD && git status --short`

Expected: no whitespace errors, a clean worktree, and only the planned parser,
tests, fixture, README, design, and plan changes.

**Step 2: Run all tests**

Run: `npm test`

Expected: all tests pass with zero failures.

**Step 3: Build all deliverables**

Ensure the ignored `vendor/librrd-main/project/build.properties` selects the
repository-compatible sbt 1.11.2 setup, then run: `npm run build`

Expected: exit 0 with the VS Code extension, preview bundle, and Rehype entry
point built successfully.

**Step 4: Verify the actual AD fence**

Run a read-only Node script that extracts `ebnf` fences from
`/home/dikini/Projects/ash-lang/docs/decisions/AD-0003-formal-notation-fences.md`
and compiles each with `compileEbnf`.

Expected: one fence, zero compilation failures. This is an extra local
verification; committed tests remain self-contained.
