# Ash EBNF conformance examples

The following arithmetic productions describe expressions as sums and differences of
terms, and terms as products and quotients of factors.

```ebnf
expression ::= term { ("+" | "-") term } ;
term ::= factor { ("*" | "/") factor } ;
```

This call production describes a parenthesized argument list that may be absent and,
when present, may contain repeated comma-separated arguments. The decorated statement
shows a postfix optional annotation, and the production spans multiple lines.

```ebnf
call ::= identifier "("
         [ argument { "," argument } ]
         ")" ;
decorated_statement ::= annotation? statement ;
```

These lexical productions describe an identifier using positive character classes and
comment text using a negated class. Their postfix operators allow zero or more trailing
identifier characters and require one or more comment characters.

```ebnf
identifier ::= [a-zA-Z_] [a-zA-Z0-9_]* ;
comment_text ::= [^\n\r]+ ;
```

These productions display the intended regular expressions for integer and decimal
tokens as slash-delimited terminals in their railroad diagrams.

```ebnf
integer ::= /[0-9]+/ ;
decimal ::= /[0-9]+(?:\.[0-9]+)?/ ;
```
