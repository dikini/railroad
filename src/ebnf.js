class EbnfSyntaxError extends Error {
  constructor(token, message) {
    super(`EBNF error at ${token.line}:${token.column}: ${message}`);
    this.name = 'EbnfSyntaxError';
  }
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = () => {
    const character = source[index++];
    if (character === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return character;
  };

  const token = (type, value, startLine, startColumn) => {
    tokens.push({ type, value, line: startLine, column: startColumn });
  };

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      advance();
      continue;
    }

    if (source.startsWith('--', index)) {
      while (index < source.length && source[index] !== '\n') advance();
      continue;
    }

    const startLine = line;
    const startColumn = column;
    if ('=;|()[]{}?+*'.includes(character)) {
      advance();
      token(character, character, startLine, startColumn);
      continue;
    }

    if (character === '"') {
      advance();
      let value = '';
      while (index < source.length && source[index] !== '"') {
        if (source[index] === '\n') {
          throw new EbnfSyntaxError({ line: startLine, column: startColumn }, 'unterminated string literal');
        }
        value += advance();
      }
      if (index === source.length) {
        throw new EbnfSyntaxError({ line: startLine, column: startColumn }, 'unterminated string literal');
      }
      advance();
      token('string', value, startLine, startColumn);
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      let value = '';
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) value += advance();
      token('identifier', value, startLine, startColumn);
      continue;
    }

    throw new EbnfSyntaxError({ line: startLine, column: startColumn }, `unexpected character ${JSON.stringify(character)}`);
  }

  tokens.push({ type: 'eof', value: '', line, column });
  return tokens;
}

class Parser {
  constructor(source) {
    this.tokens = tokenize(source);
    this.index = 0;
  }

  current() {
    return this.tokens[this.index];
  }

  accept(type) {
    if (this.current().type !== type) return undefined;
    return this.tokens[this.index++];
  }

  expect(type) {
    const found = this.current();
    if (found.type !== type) throw new EbnfSyntaxError(found, `expected ${JSON.stringify(type)}`);
    this.index++;
    return found;
  }

  document() {
    const productions = [];
    while (this.current().type !== 'eof') {
      const name = this.expect('identifier').value;
      this.expect('=');
      const expression = this.expression(new Set([';']));
      this.expect(';');
      productions.push({ name, expression });
    }
    return productions;
  }

  expression(stop) {
    const alternatives = [this.sequence(new Set([...stop, '|']))];
    while (this.accept('|')) alternatives.push(this.sequence(new Set([...stop, '|'])));
    return alternatives.length === 1 ? alternatives[0] : { type: 'choice', alternatives };
  }

  sequence(stop) {
    const elements = [];
    while (!stop.has(this.current().type) && this.current().type !== 'eof') {
      elements.push(this.term());
    }
    if (elements.length === 0) throw new EbnfSyntaxError(this.current(), 'expected an expression');
    return elements.length === 1 ? elements[0] : { type: 'sequence', elements };
  }

  term() {
    const current = this.current();
    let expression;
    if (this.accept('string')) {
      expression = { type: 'literal', value: current.value };
    } else if (this.accept('identifier')) {
      expression = { type: 'reference', name: current.value };
    } else if (this.accept('(')) {
      expression = this.expression(new Set([')']));
      this.expect(')');
    } else if (this.accept('[')) {
      expression = { type: 'optional', expression: this.expression(new Set([']'])) };
      this.expect(']');
    } else if (this.accept('{')) {
      expression = { type: 'repeat', expression: this.expression(new Set(['}'])) };
      this.expect('}');
    } else {
      throw new EbnfSyntaxError(current, 'expected a terminal, nonterminal, or grouped expression');
    }

    if (this.accept('?')) return { type: 'optional', expression };
    if (this.accept('*')) return { type: 'repeat', expression };
    if (this.accept('+')) return { type: 'oneOrMore', expression };
    return expression;
  }
}

function terminal(value) {
  if (value.includes('"')) throw new Error('RRD terminals cannot contain double quotes');
  return `"${value}"`;
}

function compile(expression) {
  switch (expression.type) {
    case 'literal':
      return terminal(expression.value);
    case 'reference':
      return `[${expression.name}]`;
    case 'sequence':
      return `(${expression.elements.map(compile).join(' ')})`;
    case 'choice':
      return expression.alternatives.map(compile).reduce((left, right) => `(+ ${left} ${right})`);
    case 'optional':
      return `(+ ${compile(expression.expression)} ())`;
    case 'repeat':
      return `(- ${compile(expression.expression)} ())`;
    case 'oneOrMore': {
      const repeated = compile(expression.expression);
      return `(${repeated} (- ${repeated} ()))`;
    }
    default:
      throw new Error(`unknown EBNF expression type: ${expression.type}`);
  }
}

export function compileEbnf(source) {
  return new Parser(source).document().map(({ name, expression }) => ({
    name,
    rrd: ['literal', 'reference'].includes(expression.type)
      ? `(${compile(expression)})`
      : compile(expression)
  }));
}
