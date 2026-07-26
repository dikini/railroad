# EBNF Comments and Character Classes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow EBNF fences to use `(* ... *)` comments and display regex-style character classes as single terminals.

**Architecture:** Extend the existing single-pass tokenizer in `src/ebnf.js`. Comments are skipped; only a bracket form beginning `[^` becomes a `characterClass` token, while all other brackets remain EBNF optional-group tokens. The parser compiles a class as an ordinary literal, preserving the bracket spelling for diagram output.

**Tech Stack:** Node.js ESM, Node test runner, strict assertions, librrd.

---

### Task 1: Add comment acceptance tests

**Files:**
- Modify: `test/ebnf.test.mjs`
- Modify: `src/ebnf.js`

**Step 1: Write the failing test**

Add a test that compiles two productions separated by a multi-line `(* ... *)` comment and asserts the same RRD output as equivalent comment-free grammar.

```js
test('compiles productions separated by EBNF block comments', () => {
  assert.deepEqual(compileEbnf(`
    first = "a" ;
    (* annotation
       on another line *)
    second = first ;
  `), [
    { name: 'first', rrd: '("a")' },
    { name: 'second', rrd: '([first])' }
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/ebnf.test.mjs`

Expected: FAIL with an EBNF error at the opening `(` because block comments are not recognized.

**Step 3: Write minimal implementation**

In `tokenize`, before ordinary punctuation handling, consume from `(*` through the next `*)` while using `advance()` for every character. Throw `EbnfSyntaxError` at the opening position when EOF is reached first.

**Step 4: Run test to verify it passes**

Run: `node --test test/ebnf.test.mjs`

Expected: PASS, including the new comment test.

**Step 5: Commit**

```bash
git add src/ebnf.js test/ebnf.test.mjs
git commit -m "feat: accept EBNF block comments"
```

### Task 2: Add character-class parsing tests

**Files:**
- Modify: `test/ebnf.test.mjs`
- Modify: `src/ebnf.js`

**Step 1: Write the failing test**

Add a test demonstrating that `token = [^\n\r#:=]+ ;` produces one-or-more repetitions of a terminal labeled `[^\n\r#:=]`. In the same test, retain a normal optional group to prove it remains an optional EBNF construct.

```js
test('compiles regex-like character classes as single terminals', () => {
  assert.deepEqual(compileEbnf(
    'token = [^\\n\\r#:=]+ ; optional = [ "prefix" ] ;'
  ), [
    { name: 'token', rrd: '("[^\\n\\r#:=]" (- "[^\\n\\r#:=]" ()))' },
    { name: 'optional', rrd: '(+ "prefix" ())' }
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/ebnf.test.mjs`

Expected: FAIL because the tokenizer currently emits `[` as optional-group punctuation and the parser cannot consume a negated character class.

**Step 3: Write minimal implementation**

Add a `readCharacterClass` tokenizer branch before punctuation handling. When the input begins `[^`, consume through the unescaped closing bracket and emit `characterClass` with the original bracketed spelling. In `Parser.term`, accept that token and return a literal AST whose value is its spelling. Leave the existing `[` and `]` punctuation path in place for optional groups.

**Step 4: Run test to verify it passes**

Run: `node --test test/ebnf.test.mjs`

Expected: PASS, including character-class and optional-group assertions.

**Step 5: Commit**

```bash
git add src/ebnf.js test/ebnf.test.mjs
git commit -m "feat: render EBNF character classes"
```

### Task 3: Add malformed-input coverage and run full verification

**Files:**
- Modify: `test/ebnf.test.mjs`
- Modify: `src/ebnf.js` (only if needed to make the tests pass)

**Step 1: Write the failing tests**

Add one assertion for an unterminated block comment and one for an unterminated regex-like class. Each must check the EBNF error’s opening `line:column`.

```js
assert.throws(() => compileEbnf('(* note'), /EBNF error at 1:1: unterminated block comment/);
assert.throws(() => compileEbnf('token = [^\\n'), /EBNF error at 1:9: unterminated character class/);
```

**Step 2: Run test to verify it fails**

Run: `node --test test/ebnf.test.mjs`

Expected: FAIL until each opening-location error is implemented.

**Step 3: Implement only required error handling**

Ensure both tokenizer branches capture the source location before consuming and throw `EbnfSyntaxError` with the specified message when EOF occurs.

**Step 4: Run all verification**

Run: `npm run check`

Expected: exit code 0: all tests pass and the bundle builds.

**Step 5: Commit**

```bash
git add src/ebnf.js test/ebnf.test.mjs
git commit -m "test: cover malformed EBNF lexical constructs"
```
