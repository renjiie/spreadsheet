import { assertCellInGrid, expandRange, normalizeCellId } from "./address";
import type { CellId, GridDimensions } from "./types";

export type FormulaAst =
  | { type: "number"; value: number }
  | { type: "ref"; cellId: CellId }
  | { type: "range"; from: CellId; to: CellId }
  | { type: "binary"; operator: "+" | "-" | "*" | "/"; left: FormulaAst; right: FormulaAst }
  | { type: "unary"; operator: "-"; expression: FormulaAst }
  | { type: "function"; name: string; args: FormulaAst[] };

export type ParsedFormula = {
  ast: FormulaAst;
  dependencies: Set<CellId>;
};

type Token =
  | { type: "number"; value: string }
  | { type: "cell"; value: string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," }
  | { type: "colon"; value: ":" }
  | { type: "eof"; value: "" };

const SUPPORTED_FUNCTIONS = new Set(["SUM", "AVERAGE", "MIN", "MAX", "COUNT"]);

export function parseFormula(source: string, dimensions: GridDimensions): ParsedFormula {
  const parser = new FormulaParser(tokenize(source), dimensions);
  return parser.parse();
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[\d.]/.test(source[index])) {
        index += 1;
      }
      const value = source.slice(start, index);
      if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value)) {
        throw new Error(`Invalid number: ${value}`);
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z]/.test(source[index])) {
        index += 1;
      }
      while (index < source.length && /\d/.test(source[index])) {
        index += 1;
      }
      const value = source.slice(start, index).toUpperCase();
      tokens.push(/\d/.test(value) ? { type: "cell", value } : { type: "identifier", value });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    if (char === ":") {
      tokens.push({ type: "colon", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class FormulaParser {
  private index = 0;
  private readonly dependencies = new Set<CellId>();

  constructor(
    private readonly tokens: Token[],
    private readonly dimensions: GridDimensions
  ) {}

  parse(): ParsedFormula {
    const ast = this.parseExpression();
    this.expect("eof");
    return { ast, dependencies: this.dependencies };
  }

  private parseExpression(): FormulaAst {
    return this.parseAdditive();
  }

  private parseAdditive(): FormulaAst {
    let left = this.parseMultiplicative();

    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous().value as "+" | "-";
      const right = this.parseMultiplicative();
      left = { type: "binary", operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): FormulaAst {
    let left = this.parseUnary();

    while (this.matchOperator("*") || this.matchOperator("/")) {
      const operator = this.previous().value as "*" | "/";
      const right = this.parseUnary();
      left = { type: "binary", operator, left, right };
    }

    return left;
  }

  private parseUnary(): FormulaAst {
    if (this.matchOperator("-")) {
      return { type: "unary", operator: "-", expression: this.parseUnary() };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAst {
    if (this.match("number")) {
      return { type: "number", value: Number(this.previous().value) };
    }

    if (this.match("cell")) {
      const from = assertCellInGrid(this.previous().value, this.dimensions);

      if (this.match("colon")) {
        const toToken = this.consume("cell", "Expected a cell reference after ':'");
        const to = assertCellInGrid(toToken.value, this.dimensions);
        for (const cellId of expandRange(`${from}:${to}`, this.dimensions)) {
          this.dependencies.add(cellId);
        }
        return { type: "range", from, to };
      }

      this.dependencies.add(normalizeCellId(from));
      return { type: "ref", cellId: normalizeCellId(from) };
    }

    if (this.match("identifier")) {
      const name = this.previous().value;

      if (!SUPPORTED_FUNCTIONS.has(name)) {
        throw new Error(`Unsupported function: ${name}`);
      }

      this.consumeParen("(", "Expected '(' after function name");
      const args: FormulaAst[] = [];
      if (!this.checkParen(")")) {
        do {
          args.push(this.parseExpression());
        } while (this.match("comma"));
      }
      this.consumeParen(")", "Expected ')' after function arguments");
      return { type: "function", name, args };
    }

    if (this.matchParen("(")) {
      const expression = this.parseExpression();
      this.consumeParen(")", "Expected ')' after expression");
      return expression;
    }

    throw new Error(`Unexpected token: ${this.peek().type}`);
  }

  private match(type: Token["type"]): boolean {
    if (!this.check(type)) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private matchOperator(operator: "+" | "-" | "*" | "/"): boolean {
    if (this.peek().type === "operator" && this.peek().value === operator) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchParen(paren: "(" | ")"): boolean {
    if (this.checkParen(paren)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private check(type: Token["type"]): boolean {
    return this.peek().type === type;
  }

  private checkParen(paren: "(" | ")"): boolean {
    return this.peek().type === "paren" && this.peek().value === paren;
  }

  private consume(type: Token["type"], message: string): Token {
    if (this.check(type)) {
      this.index += 1;
      return this.previous();
    }
    throw new Error(message);
  }

  private consumeParen(paren: "(" | ")", message: string): void {
    if (!this.matchParen(paren)) {
      throw new Error(message);
    }
  }

  private expect(type: Token["type"]): void {
    if (!this.match(type)) {
      throw new Error(`Expected ${type}`);
    }
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private previous(): Token {
    return this.tokens[this.index - 1];
  }
}
