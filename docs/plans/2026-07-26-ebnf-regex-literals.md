# EBNF Regex Literals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render positive regex character classes and slash-delimited full regex expressions as visual-only EBNF terminals.

**Architecture:** Extend src/ebnf.js tokenization with unambiguous raw-character-class detection and slash-delimited regex-literal scanning. Both token types become the existing literal AST, so regex syntax is displayed rather than interpreted, and existing EBNF postfix quantifiers still apply.

**Tech Stack:** Node.js ESM, Node test runner, librrd.

---

### Task 1: Support positive character classes without breaking optionals

**Files:**
- Modify: test/ebnf.test.mjs
- Modify: src/ebnf.js

**Step 1: Write the failing test**

Add a test for a positive range class and an EBNF optional reference.

~~~js
test('compiles positive regex character classes without changing optional groups', () => {
  assert.deepEqual(compileEbnf(
    'identifier = [a-zA-Z_][a-zA-Z0-9_]* ; maybe = [identifier] ;'
  ), [
    { name: 'identifier', rrd: '("[a-zA-Z_]" (- "[a-zA-Z0-9_]" ()))' },
    { name: 'maybe', rrd: '(+ [identifier] ())' }
  ]);
});
~~~

Also assert that LibRRD accepts the identifier diagram.

**Step 2: Run the focused test**

Run: node --test --test-name-pattern='positive regex character classes' test/ebnf.test.mjs

Expected: FAIL with an unexpected hyphen character from [a-zA-Z_].

**Step 3: Implement minimal class recognition**

Scan a bracketed expression through its first unescaped closing bracket. Emit characterClass only when its contents are unambiguously regex-like: leading caret, a backslash escape, or a range hyphen. Otherwise keep the existing bracket punctuation so [identifier] remains an EBNF optional group. Preserve the existing opening-location error for an unterminated recognized class.

**Step 4: Run EBNF tests**

Run: node --test test/ebnf.test.mjs

Expected: PASS.

**Step 5: Commit**

~~~bash
git add src/ebnf.js test/ebnf.test.mjs
git commit -m "feat: support positive EBNF character classes"
~~~

### Task 2: Add slash-delimited visual regex literals

**Files:**
- Modify: test/ebnf.test.mjs
- Modify: src/ebnf.js

**Step 1: Write failing tests**

Add a test proving a complex regex stays one terminal and an EBNF postfix quantifier still applies.

~~~js
test('compiles slash-delimited regex literals as visual terminals', () => {
  const productions = compileEbnf('number = /\\d+(?:\\.\\d+)?/+ ;');

  assert.deepEqual(productions, [{
    name: 'number',
    rrd: '("/\\d+(?:\\.\\d+)?/" (- "/\\d+(?:\\.\\d+)?/" ()))'
  }]);
  assert.doesNotThrow(() => LibRRD.parseDiagram(productions[0].rrd));
});
~~~

Also cover an escaped slash, such as /https?:\\/\\/[^\\s]+/, proving only an unescaped slash closes the literal.

**Step 2: Run the focused test**

Run: node --test --test-name-pattern='slash-delimited regex literals' test/ebnf.test.mjs

Expected: FAIL with an unexpected slash character.

**Step 3: Implement minimal regex-literal scanning**

Before ordinary punctuation, scan a slash-started token through the next unescaped slash on the same line. Preserve delimiters and all contents in a regexLiteral token. On newline or EOF, throw an unterminated regex literal EBNF error at the opening source location. Route regexLiteral through the existing literal AST path.

**Step 4: Run EBNF tests**

Run: node --test test/ebnf.test.mjs

Expected: PASS.

**Step 5: Commit**

~~~bash
git add src/ebnf.js test/ebnf.test.mjs
git commit -m "feat: render slash-delimited regex literals"
~~~

### Task 3: Cover errors, renderer limits, and documentation

**Files:**
- Modify: test/ebnf.test.mjs
- Modify: README.md
- Modify: src/ebnf.js only if tests expose a defect

**Step 1: Write failing tests**

Add exact-location coverage for an unterminated slash literal and clear renderer-limit coverage for a regex containing both quote delimiters.

~~~js
assert.throws(
  () => compileEbnf('pattern = /abc'),
  /EBNF error at 1:11: unterminated regex literal/
);
assert.throws(
  () => compileEbnf("pattern = /[\"']/ ;"),
  /RRD terminals cannot contain both single and double quotes/
);
~~~

**Step 2: Run focused tests**

Run: node --test --test-name-pattern='regex literal errors' test/ebnf.test.mjs

Expected: FAIL until the scanner reports the required opening location.

**Step 3: Implement only needed error handling and document syntax**

Make only corrections required by the tests. Update README with raw unambiguous classes, slash-delimited regex literals, visual-only semantics, and the librrd quote-delimiter limitation.

**Step 4: Run full verification**

Run: . "$HOME/.profile" && npm run check

Expected: exit code 0; all tests pass and the package bundles successfully.

**Step 5: Commit**

~~~bash
git add src/ebnf.js test/ebnf.test.mjs README.md
git commit -m "docs: specify EBNF regex literal syntax"
~~~
