import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { compileEbnf } from '../src/ebnf.js';
import { LibRRD } from '../vendor/librrd-main/api/librrd.js';

test('compiles EBNF terminals, references, sequences, and alternatives to RRD DSL', () => {
  const productions = compileEbnf('expression = term { ("+" | "-") term } ;');

  assert.deepEqual(productions, [{
    name: 'expression',
    rrd: '([term] (- ((+ "+" "-") [term]) ()))'
  }]);
});

test('compiles grouping, optional, repeated, and one-or-more EBNF forms', () => {
  const productions = compileEbnf('rule = [ "prefix" ] { item } tail+ suffix? ;');

  assert.deepEqual(productions, [{
    name: 'rule',
    rrd: '((+ "prefix" ()) (- [item] ()) ([tail] (- [tail] ())) (+ [suffix] ()))'
  }]);
});

test('compiles negated character classes as terminals without affecting optional groups', () => {
  const productions = compileEbnf('token = [^\\n\\r#:=]+ ; optional = [ "prefix" ] ;');

  assert.deepEqual(productions, [
    { name: 'token', rrd: '("[^\\n\\r#:=]" (- "[^\\n\\r#:=]" ()))' },
    { name: 'optional', rrd: '(+ "prefix" ())' }
  ]);
});

test('compiles positive regex character classes without changing optional groups', () => {
  const productions = compileEbnf(
    'identifier = [a-zA-Z_][a-zA-Z0-9_]* ; maybe = [identifier] ;'
  );

  assert.deepEqual(productions, [
    { name: 'identifier', rrd: '("[a-zA-Z_]" (- "[a-zA-Z0-9_]" ()))' },
    { name: 'maybe', rrd: '(+ [identifier] ())' }
  ]);
  assert.doesNotThrow(() => LibRRD.parseDiagram(productions[0].rrd));
});

test('keeps quoted literals containing regex syntax inside EBNF optionals', () => {
  const backslashLiteral = String.raw`a\b`;
  const productions = compileEbnf(
    `hyphen = [ "a-b" ] ; backslash = [ "${backslashLiteral}" ] ;`
  );

  assert.deepEqual(productions, [
    { name: 'hyphen', rrd: '(+ "a-b" ())' },
    { name: 'backslash', rrd: `(+ "${backslashLiteral}" ())` }
  ]);
});

test('compiles positive character classes with literal edge hyphens', () => {
  assert.deepEqual(compileEbnf('classes = [-a] [a-] [-] ;'), [
    { name: 'classes', rrd: '("[-a]" "[a-]" "[-]")' }
  ]);
});

test('compiles positive character classes with escaped brackets', () => {
  assert.deepEqual(compileEbnf(String.raw`close = [a\]] ; open = [\[] ;`), [
    { name: 'close', rrd: String.raw`("[a\]]")` },
    { name: 'open', rrd: String.raw`("[\[]")` }
  ]);
});

test('emits LibRRD-valid repeated character classes containing double quotes', () => {
  const productions = compileEbnf('rule = [^"]+ ;');

  assert.deepEqual(productions, [
    { name: 'rule', rrd: "('[^\"]' (- '[^\"]' ()))" }
  ]);
  assert.doesNotThrow(() => LibRRD.parseDiagram(productions[0].rrd));
});

test('rejects character classes containing both terminal quote delimiters', () => {
  assert.throws(
    () => compileEbnf(`rule = [^"']+ ;`),
    /RRD terminals cannot contain both single and double quotes/
  );
});

test('preserves escaped closing brackets in character classes', () => {
  assert.deepEqual(compileEbnf('token = [^\\]]+ ;'), [
    { name: 'token', rrd: '("[^\\]]" (- "[^\\]]" ()))' }
  ]);
});

test('reports an unterminated character class when its closing bracket is escaped', () => {
  assert.throws(
    () => compileEbnf('token = [^\\]'),
    /EBNF error at 1:9: unterminated character class/
  );
});

test('compiles several productions and ignores double-dash comments', () => {
  const productions = compileEbnf(`
    first = "a" ; -- annotation
    second = first | "b" ;
  `);

  assert.deepEqual(productions, [
    { name: 'first', rrd: '("a")' },
    { name: 'second', rrd: '(+ [first] "b")' }
  ]);
});

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

test('reports opening locations for unterminated EBNF lexical constructs', () => {
  assert.throws(
    () => compileEbnf('(* note'),
    /EBNF error at 1:1: unterminated block comment/
  );
  assert.throws(
    () => compileEbnf('token = [^\\n'),
    /EBNF error at 1:9: unterminated character class/
  );
});

test('reports EBNF syntax errors with a source location', () => {
  assert.throws(
    () => compileEbnf('rule = ( "unterminated" ;'),
    /EBNF error at 1:25:/
  );
});

test('compiles every EBNF fence in the Ash target grammar specification', () => {
  const specification = readFileSync(
    '/home/dikini/Projects/ash/docs/spec/SPEC-095b-TARGET-GRAMMAR.md',
    'utf8'
  );
  const fences = [...specification.matchAll(/```ebnf\n([\s\S]*?)```/g)].map((match) => match[1]);

  assert.equal(fences.length, 21);
  assert.doesNotThrow(() => fences.flatMap(compileEbnf));
  assert.equal(fences.flatMap(compileEbnf).length, 76);
});

test('emits librrd-valid diagrams for every Ash grammar production', () => {
  const specification = readFileSync(
    '/home/dikini/Projects/ash/docs/spec/SPEC-095b-TARGET-GRAMMAR.md',
    'utf8'
  );
  const productions = [...specification.matchAll(/```ebnf\n([\s\S]*?)```/g)]
    .flatMap((match) => compileEbnf(match[1]));

  for (const { name, rrd } of productions) {
    assert.doesNotThrow(() => LibRRD.parseDiagram(rrd), name);
  }
});
