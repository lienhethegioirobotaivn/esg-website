export interface SourcePage {
  readonly page: number;
  readonly normalized: string;
}

export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/(?<=\d)[.,](?=\d)/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function parseSourceText(text: string): SourcePage[] {
  const pages: SourcePage[] = [];
  const pattern = /\[Trang (\d+)\]\n([\s\S]*?)(?=\n\[Trang \d+\]\n|$)/g;
  for (const match of text.matchAll(pattern)) {
    pages.push({
      page: Number(match[1]),
      normalized: normalize(match[2] ?? ""),
    });
  }
  return pages;
}

export function locateQuote(
  pages: readonly SourcePage[],
  quote: string,
): number | null {
  const pieces = quote
    .split(/\.{3}|…/)
    .map(normalize)
    .filter((piece) => piece.length >= 6);
  if (pieces.length === 0) {
    return null;
  }
  const firstPage = pages.find((page) => page.normalized.includes(pieces[0] ?? ""));
  if (firstPage === undefined) {
    return null;
  }
  const rest = pieces.slice(1);
  const allFound = rest.every((piece) =>
    pages.some((page) => page.normalized.includes(piece)),
  );
  return allFound ? firstPage.page : null;
}

export function quoteContainsNumber(quote: string, number: string): boolean {
  const digits = number.replace(/\D/g, "");
  return digits !== "" && normalize(quote).replace(/ /g, "").includes(digits);
}
