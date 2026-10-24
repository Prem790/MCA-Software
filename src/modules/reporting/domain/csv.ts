// CSV is intended for spreadsheet viewing, not lossless reimport. Never interpolate raw separators or formulas.
function cell(input: string | number | boolean | null) {
  const value = String(input ?? "").toWellFormed();
  const normalized = value.normalize("NFKC");
  const first = normalized.codePointAt(0) ?? 32;
  const dangerous = first < 32 || /^[=+@-]/.test(normalized.trimStart());
  const text = dangerous ? "'" + value : value;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(
  headers: string[],
  rows: (string | number | boolean | null)[][],
) {
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") +
    "\r\n"
  );
}
