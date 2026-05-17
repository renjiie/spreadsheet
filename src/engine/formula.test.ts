import { describe, expect, it } from "vitest";
import { DEFAULT_GRID } from "./types";
import { parseFormula } from "./formula";

describe("formula parser", () => {
  it("parses arithmetic precedence and extracts reference dependencies", () => {
    const parsed = parseFormula("A1+B2*C3", DEFAULT_GRID);

    expect(parsed.ast).toMatchObject({
      type: "binary",
      operator: "+",
      left: { type: "ref", cellId: "A1" },
      right: {
        type: "binary",
        operator: "*",
        left: { type: "ref", cellId: "B2" },
        right: { type: "ref", cellId: "C3" }
      }
    });
    expect([...parsed.dependencies].sort()).toEqual(["A1", "B2", "C3"]);
  });

  it("parses function ranges and expands range dependencies", () => {
    const parsed = parseFormula("SUM(A1:B2, C3)", DEFAULT_GRID);

    expect(parsed.ast).toMatchObject({
      type: "function",
      name: "SUM",
      args: [
        { type: "range", from: "A1", to: "B2" },
        { type: "ref", cellId: "C3" }
      ]
    });
    expect([...parsed.dependencies].sort()).toEqual(["A1", "A2", "B1", "B2", "C3"]);
  });

  it("rejects malformed formulas, unsupported functions, and out-of-grid references", () => {
    expect(() => parseFormula("1/", DEFAULT_GRID)).toThrow();
    expect(() => parseFormula("MEDIAN(A1:A2)", DEFAULT_GRID)).toThrow();
    expect(() => parseFormula("AA1", DEFAULT_GRID)).toThrow();
  });
});
