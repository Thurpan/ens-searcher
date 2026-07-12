import { describe, expect, it } from "vitest";
import {
  normalizeCandidate,
  parseNamesFile,
  prepareCandidates,
} from "../src/input.js";

describe("input parsing", () => {
  it("parses names and ignores blank lines and comments", () => {
    const candidates = parseNamesFile(`
      # ignored
      alpha

      beta.eth # inline comment
    `);

    expect(candidates).toEqual([
      { lineNumber: 3, originalInput: "alpha" },
      { lineNumber: 5, originalInput: "beta.eth" },
    ]);
  });

  it("strips .eth suffixes and normalizes labels", () => {
    const candidate = normalizeCandidate("Foo.eth");

    expect(candidate).toMatchObject({
      kind: "ready",
      normalizedLabel: "foo",
      fullName: "foo.eth",
    });
  });

  it("rejects subnames", () => {
    const candidate = normalizeCandidate("a.b.eth");

    expect(candidate).toMatchObject({
      kind: "invalid",
      errorMessage: "Subnames are not supported in v1",
    });
  });

  it("marks ENS normalization failures invalid", () => {
    const candidate = normalizeCandidate("bad\u0000name");

    expect(candidate.kind).toBe("invalid");
    if (candidate.kind !== "invalid") {
      throw new Error("Expected invalid candidate");
    }

    expect(candidate.errorMessage).toContain("ENS normalization failed");
  });

  it("deduplicates ready names by normalized label", () => {
    const prepared = prepareCandidates([
      { lineNumber: 1, originalInput: "Foo" },
      { lineNumber: 2, originalInput: "foo.eth" },
      { lineNumber: 3, originalInput: "bar" },
    ]);

    expect(prepared).toHaveLength(2);
    expect(prepared.map((candidate) => candidate.originalInput)).toEqual([
      "Foo",
      "bar",
    ]);
  });
});
