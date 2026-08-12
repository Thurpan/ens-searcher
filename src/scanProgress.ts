import type { ScanProgress } from "./scanCore.js";

interface ScanProgressOutput {
  isTTY?: boolean;
  write(chunk: string): unknown;
}

export function createScanProgressReporter(
  output: ScanProgressOutput,
): ((progress: ScanProgress) => void) | undefined {
  if (!output.isTTY) {
    return undefined;
  }

  let lastLineLength = 0;

  return (progress: ScanProgress): void => {
    const line = formatScanProgress(progress);
    const padding = " ".repeat(Math.max(0, lastLineLength - line.length));

    output.write(`\r${line}${padding}`);
    lastLineLength = line.length;

    if (progress.processedCount >= progress.totalCount) {
      output.write("\n");
      lastLineLength = 0;
    }
  };
}

export function formatScanProgress(progress: ScanProgress, barWidth = 28): string {
  const totalCount = Math.max(0, progress.totalCount);
  const processedCount = Math.min(Math.max(0, progress.processedCount), totalCount);
  const ratio = totalCount === 0 ? 1 : processedCount / totalCount;
  const filledWidth = Math.round(ratio * barWidth);
  const emptyWidth = barWidth - filledWidth;
  const bar = `${"#".repeat(filledWidth)}${"-".repeat(emptyWidth)}`;
  const percentage = (ratio * 100).toFixed(1);

  return `Scanning [${bar}] ${processedCount}/${totalCount} names (${percentage}%)`;
}

export function formatElapsedTime(elapsedMs: number): string {
  const safeElapsedMs = Math.max(0, Math.round(elapsedMs));

  if (safeElapsedMs < 1000) {
    return `${safeElapsedMs}ms`;
  }

  const totalSeconds = Math.floor(safeElapsedMs / 1000);

  if (totalSeconds < 60) {
    const seconds = Math.floor(safeElapsedMs / 100) / 10;
    return `${seconds.toFixed(1)}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
