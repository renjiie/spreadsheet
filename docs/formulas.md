# Formula Parsing and Evaluation

## Formula Syntax

Formulas begin with `=`.

Supported expressions:

- Cell references: `=A1`, `=B3`
- Arithmetic: `=A1+B2*C3`
- Parentheses: `=(A1+B1)*2`
- Ranges inside functions: `=SUM(A1:A5)`
- Functions: `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`

## Parser Strategy

The parser uses a tokenizer and recursive descent parser:

- Additive precedence: `+`, `-`
- Multiplicative precedence: `*`, `/`
- Unary negation
- Primary values: numbers, references, ranges, functions, and grouped expressions

The parser also extracts dependencies while parsing references and ranges.

## Evaluation Strategy

Evaluation is numeric for formulas. Referenced text and empty cells contribute `0` in arithmetic expressions. Range functions ignore text and empty cells.

Error handling:

- Malformed formula: `#ERROR!`
- Unsupported function: `#ERROR!`
- Invalid reference outside the configured grid: `#ERROR!`
- Division by zero: `#ERROR!`
- Circular dependency: `CIRCULAR REF`
