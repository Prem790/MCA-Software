export function documentName(value: string) {
  // A filename is a display label, never a storage path or executable header value.
  return Array.from(value.normalize("NFKC").toWellFormed())
    .map((char) => {
      const code = char.codePointAt(0)!;
      return code < 32 || code === 127 || char === "/" || char === "\\"
        ? "_"
        : char;
    })
    .slice(0, 200)
    .join("")
    .trim();
}
export function documentMediaType(
  name: string,
  bytes: Uint8Array,
): string | null {
  const extension = name.split(".").at(-1)?.toLowerCase();
  const starts = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (extension === "pdf" && starts(37, 80, 68, 70, 45))
    return "application/pdf";
  if (extension === "png" && starts(137, 80, 78, 71, 13, 10, 26, 10))
    return "image/png";
  if (["jpg", "jpeg"].includes(extension ?? "") && starts(255, 216, 255))
    return "image/jpeg";
  if (extension === "txt") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (
        !Array.from(text).some((char) => {
          const code = char.codePointAt(0)!;
          return code < 32 && ![9, 10, 13].includes(code);
        })
      )
        return "text/plain";
    } catch {
      return null;
    }
  }
  return null;
}
