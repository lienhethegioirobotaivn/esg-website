export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let index = 0; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (inQuotes) {
      if (char === '"') {
        if (source.charAt(index + 1) === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source.charAt(index + 1) === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export interface SheetTable {
  readonly headers: readonly string[];
  readonly rows: readonly Readonly<Record<string, string>>[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function describeGrid(grid: readonly (readonly string[])[]): string {
  return grid
    .slice(0, 4)
    .map((row) => row.slice(0, 3).join(" | ").slice(0, 80))
    .join(" // ");
}

export function toTable(
  grid: readonly (readonly string[])[],
  firstHeader: string,
  tabName = "",
): SheetTable {
  const target = normalize(firstHeader);
  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => normalize(cell) === target),
  );
  if (headerIndex < 0) {
    throw new Error(
      `Không tìm thấy cột "${firstHeader}" trong tab "${tabName}". Các dòng đầu nhận được: ${describeGrid(grid)}`,
    );
  }
  const headers = (grid[headerIndex] ?? []).map((header) => header.trim());
  const rows = grid.slice(headerIndex + 1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, column) => {
      if (header !== "") {
        record[header] = (row[column] ?? "").trim();
      }
    });
    return record;
  });
  return { headers, rows };
}
