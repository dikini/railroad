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
