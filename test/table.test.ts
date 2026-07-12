import { describe, expect, it } from "vitest";
import { formatTable } from "../src/table.js";

describe("formatTable", () => {
  it("right-aligns selected columns", () => {
    expect(
      formatTable(
        ["name", "total_eth", "run"],
        [
          ["ari.eth", "0.3543", "2"],
          ["euan.eth", "18.4175", "12"],
        ],
        ["left", "right", "right"],
      ),
    ).toBe(
      [
        "name      total_eth  run",
        "--------  ---------  ---",
        "ari.eth      0.3543    2",
        "euan.eth    18.4175   12",
      ].join("\n"),
    );
  });
});
