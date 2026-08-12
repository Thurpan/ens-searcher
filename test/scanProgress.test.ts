import { describe, expect, it, vi } from "vitest";
import {
  createScanProgressReporter,
  formatElapsedTime,
  formatScanProgress,
} from "../src/scanProgress.js";

describe("createScanProgressReporter", () => {
  it("writes progress and a final newline to interactive outputs", () => {
    const write = vi.fn();
    const reportProgress = createScanProgressReporter({ isTTY: true, write });
    const initialProgress = {
      processedCount: 0,
      totalCount: 1,
      skippedExistingCount: 0,
    };
    const completedProgress = {
      processedCount: 1,
      totalCount: 1,
      skippedExistingCount: 0,
    };

    reportProgress?.(initialProgress);
    reportProgress?.(completedProgress);

    expect(write.mock.calls).toEqual([
      [`\r${formatScanProgress(initialProgress)}`],
      [`\r${formatScanProgress(completedProgress)}`],
      ["\n"],
    ]);
  });

  it("does not create a reporter for non-interactive outputs", () => {
    expect(
      createScanProgressReporter({ isTTY: false, write: vi.fn() }),
    ).toBeUndefined();
  });
});

describe("formatScanProgress", () => {
  it("formats a fixed-width scan progress bar", () => {
    expect(
      formatScanProgress(
        {
          processedCount: 5,
          totalCount: 10,
          skippedExistingCount: 0,
        },
        10,
      ),
    ).toBe("Scanning [#####-----] 5/10 names (50.0%)");
  });

  it("treats an empty scan as complete", () => {
    expect(
      formatScanProgress(
        {
          processedCount: 0,
          totalCount: 0,
          skippedExistingCount: 10,
        },
        10,
      ),
    ).toBe("Scanning [##########] 0/0 names (100.0%)");
  });
});

describe("formatElapsedTime", () => {
  it("formats elapsed milliseconds and seconds", () => {
    expect(formatElapsedTime(999)).toBe("999ms");
    expect(formatElapsedTime(1234)).toBe("1.2s");
    expect(formatElapsedTime(59_999)).toBe("59.9s");
  });

  it("formats elapsed minutes and hours", () => {
    expect(formatElapsedTime(61_000)).toBe("1m 1s");
    expect(formatElapsedTime(3_661_000)).toBe("1h 1m 1s");
  });
});
