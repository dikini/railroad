# EBNF Comments and Character Classes Design

## Goal

Accept `(* ... *)` comments and regex-style character classes in EBNF fences so
grammar diagrams can display lexical productions such as `[^\n\r#:=]+` without
expanding the class into alternatives.

## Scope

- Recognize and discard `(* ... *)` comments, including comments spanning lines.
- Recognize a character class as one terminal whose label preserves its source
  spelling, for example `[^\n\r#:=]`.
- Let the existing postfix quantifiers apply to character classes, so `+` renders
  as one-or-more repetitions of the single class terminal.
- Report unterminated comments and character classes at their opening source
  locations.

## Non-goals

- `::=` remains unsupported; productions continue to use `=`.
- Semicolons remain required production terminators.
- Character classes are presentation-level lexical terminals, not expanded or
  interpreted as a regular-expression engine.

## Parsing design

The tokenizer will skip `(* ... *)` comments before emitting parser tokens. It
will emit a dedicated `characterClass` token for bracketed content that has
regex-class syntax. Ordinary EBNF optional groups (`[ expression ]`) retain
their current tokens and parsing behavior. The parser will turn a
`characterClass` token into the same literal AST representation used for quoted
terminals, preserving the original brackets in the rendered label. Existing
postfix handling then applies without a new AST node.

## Validation

Tests will first prove that the current parser rejects the new syntax. The
implementation will then add focused tests for line and multi-line comments,
character-class rendering with `+`, optional-group compatibility, and
location-aware errors for unterminated constructs. The complete test suite and
build will run before handoff.
