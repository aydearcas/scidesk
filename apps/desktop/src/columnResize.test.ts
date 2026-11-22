// Moving a column border (record 0053).
import { describe, expect, it } from "vitest";
import { MIN_WIDTH, moveBorder } from "./columnResize.ts";

describe("moveBorder", () => {
  it("the two columns share their width; the others keep theirs", () => {
    expect(moveBorder([40, 30, 30], 0, 10)).toEqual([50, 20, 30]);
    expect(moveBorder([40, 30, 30], 1, -5.55)).toEqual([40, 24.5, 35.5]);
  });
  it("no column gets narrower than the minimum", () => {
    expect(moveBorder([40, 30, 30], 0, 50)).toEqual([70 - MIN_WIDTH, MIN_WIDTH, 30]);
    expect(moveBorder([40, 30, 30], 0, -80)).toEqual([MIN_WIDTH, 70 - MIN_WIDTH, 30]);
  });
});
