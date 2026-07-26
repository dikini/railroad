# EBNF Regex Literals Design

## Goal

Support visual-only regular-expression terminals in EBNF fences without changing
the existing EBNF expression semantics.

## Syntax

- A positive or negated character class—such as `[a-zA-Z_]` or
  `[^\n\r#:=]`—is a single terminal.
- A slash-delimited regex literal—such as
  `/[a-zA-Z_][a-zA-Z0-9_]*/` or `/\d+(?:\.\d+)?/`—is a single terminal.
  Its contents are preserved verbatim; the EBNF compiler never interprets regex
  operators, groups, alternatives, or escapes.
- Existing EBNF grouping and postfix `+`, `*`, and `?` remain unchanged.
  A regex literal may therefore be followed by an EBNF quantifier.

## Tokenization

The tokenizer will recognize a character class before EBNF optional-group
punctuation. It will consume through an unescaped closing bracket and classify
the bracketed text as a terminal when it contains regex-only syntax (for
example a range hyphen, a negation marker, or an escape). A plain
`[ expression ]` remains an EBNF optional group.

A regex literal begins with `/` and ends at the next unescaped `/` on the
same line. Unterminated character classes and regex literals report the
opening source location.

## Rendering and errors

Both forms use the existing literal AST and RRD terminal rendering. A label
containing one quote style uses the other terminal delimiter. Labels containing
both single and double quotes produce a clear error because librrd's terminal
grammar provides no quote escape sequence.

## Validation

Tests will cover positive and negated classes, escaped closing brackets,
slash-delimited regex preservation, EBNF quantifiers applied to regex
literals, optional-group compatibility, malformed source locations, and
librrd validity. Existing grammar fixtures must remain valid.

