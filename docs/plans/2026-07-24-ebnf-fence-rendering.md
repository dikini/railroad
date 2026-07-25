# EBNF Fence Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render `ebnf` Markdown fences as librrd railroad diagrams while preserving the existing `rrd` fence behavior.

**Architecture:** Parse EBNF in the Markdown-It extension layer into a small AST, compile each production into librrd's textual DSL, then emit the existing `.rrd-diagram` placeholders. A fence with multiple productions emits one labeled placeholder per production. The browser preview remains the sole owner of librrd layout and SVG rendering.

**Tech Stack:** Node.js ESM, VS Code Markdown-It extension API, Node test runner, bundled librrd JavaScript API.

---

### Task 1: Specify parser behavior with unit tests

**Files:**

- Create: `test/ebnf.test.mjs`
- Create: `src/ebnf.js`

**Step 1: Write failing tests**

Cover literals, nonterminal references, sequencing, alternatives, grouping, optionals, zero-or-more, one-or-more, postfix optional, comments, multiple productions, and syntax errors. Include all EBNF fences from `SPEC-095b-TARGET-GRAMMAR.md` as a corpus fixture.

**Step 2: Run tests to verify failure**

Run: `node --test test/ebnf.test.mjs`

Expected: FAIL because the parser/compiler module does not exist.

**Step 3: Implement the parser and compiler**

Implement tokenization with line/column positions, recursive-descent parsing, an AST, and RRD DSL generation. Render literals as terminal tokens and rule references as nonterminal tokens. Compile alternatives, optionals, repetition, and one-or-more using librrd sequence/stack primitives.

**Step 4: Run tests to verify success**

Run: `node --test test/ebnf.test.mjs`

Expected: PASS.

### Task 2: Add EBNF fence integration

**Files:**

- Modify: `src/fence.js`
- Modify: `src/extension.js`
- Modify: `test/fence.test.mjs`
- Modify: `test/extension.test.mjs`

**Step 1: Write failing integration tests**

Assert that `ebnf` is recognized, that a multi-production fence emits a labeled placeholder per production, and that `rrd` and unrelated fences retain their existing behavior.

**Step 2: Run tests to verify failure**

Run: `node --test test/fence.test.mjs test/extension.test.mjs`

Expected: FAIL because EBNF fences currently use the fallback renderer.

**Step 3: Implement minimal integration**

Add EBNF recognition and use the parser/compiler result to emit the existing base64url-backed placeholders. Render compilation failures as escaped Markdown preview error blocks.

**Step 4: Run tests to verify success**

Run: `node --test test/fence.test.mjs test/extension.test.mjs`

Expected: PASS.

### Task 3: Verify renderability and package build

**Files:**

- Modify only if tests expose a defect.

**Step 1: Validate the Ash corpus with librrd**

Compile every `ebnf` fence from `/home/dikini/Projects/ash/docs/spec/SPEC-095b-TARGET-GRAMMAR.md` and pass every generated diagram to `LibRRD.parseDiagram`.

**Step 2: Run the complete project check**

Run: `npm run check`

Expected: all tests pass and the extension bundles successfully.

**Step 3: Review the diff**

Run: `git diff --check && git diff -- src test docs/plans`

Expected: no whitespace errors and only EBNF-rendering-related changes.
