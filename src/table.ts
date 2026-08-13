export type ColumnAlignment = "left" | "right";

export function formatTable(
  headers: string[],
  rows: string[][],
  alignments: ColumnAlignment[] = [],
): string {
  const widths = headers.map((header, columnIndex) =>
    Math.max(
      header.length,
      ...rows.map((row) => (row[columnIndex] ?? "").length),
    ),
  );
  const formatRow = (row: string[]) =>
    row
      .map((cell, index) => {
        const width = widths[index] ?? 0;
        return alignments[index] === "right" ? cell.padStart(width) : cell.padEnd(width);
      })
      .join("  ");
  const divider = widths.map((width) => "-".repeat(width)).join("  ");

  return [formatRow(headers), divider, ...rows.map(formatRow)].join("\n");
}
