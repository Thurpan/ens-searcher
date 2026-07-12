import { describe, expect, it } from "vitest";
import { parseQueryArgs, parseScanArgs } from "../src/args.js";

describe("parseScanArgs", () => {
  it("parses skip-existing scans", () => {
    expect(parseScanArgs(["--skip-existing"])).toMatchObject({
      skipExisting: true,
    });
  });
});

describe("parseQueryArgs", () => {
  it("parses all-status and manual ETH/USD flags", () => {
    expect(parseQueryArgs(["--all", "--eth-usd", "3500.25"])).toMatchObject({
      includeAll: true,
      ethUsdPrice: 3500.25,
    });
  });

  it("rejects invalid ETH/USD prices", () => {
    expect(() => parseQueryArgs(["--eth-usd", "0"])).toThrow(
      "--eth-usd must be a positive number",
    );
  });
});
