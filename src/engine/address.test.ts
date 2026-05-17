import { describe, expect, it } from "vitest";
import {
  columnIndexToLabel,
  expandRange,
  parseCellId,
  toCellId
} from "./address";

describe("cell address utilities", () => {
  it("converts between row/column indexes and A1 labels", () => {
    expect(columnIndexToLabel(0)).toBe("A");
    expect(columnIndexToLabel(25)).toBe("Z");
    expect(toCellId(0, 0)).toBe("A1");
    expect(toCellId(99, 25)).toBe("Z100");
    expect(parseCellId("Z100")).toEqual({ row: 99, col: 25 });
  });

  it("expands rectangular ranges in row-major order", () => {
    expect(expandRange("A1:B2")).toEqual(["A1", "B1", "A2", "B2"]);
    expect(expandRange("B2:A1")).toEqual(["A1", "B1", "A2", "B2"]);
  });
});
