const CJK_CHAR = /[\u3400-\u9fff\uf900-\ufaff\uff01-\uff60\u3001-\u303f]/;
const OPENING = /^[（《「『“‘〈【〔]$/;
const CLOSING = /^[，。、；：！？）》」』”’〉】〕…·]$/;
const ASCII_HYPHEN = /-/g;
const TRUE_HYPHEN = "\u2010";

export function splitCjkWord(word: string): string[] {
  if (!CJK_CHAR.test(word)) {
    return [word];
  }
  const pieces: string[] = [];
  let latin = "";
  for (const char of Array.from(word)) {
    if (CJK_CHAR.test(char)) {
      if (latin) {
        pieces.push(latin);
        latin = "";
      }
      pieces.push(char);
    } else {
      latin += char;
    }
  }
  if (latin) {
    pieces.push(latin);
  }
  const merged: string[] = [];
  let carry = "";
  for (const piece of pieces) {
    if (CLOSING.test(piece) && merged.length > 0) {
      merged[merged.length - 1] += piece;
    } else if (OPENING.test(piece)) {
      carry += piece;
    } else {
      merged.push(carry + piece);
      carry = "";
    }
  }
  if (carry) {
    merged.push(carry);
  }
  return merged;
}

export function softenHyphens(text: string): string {
  return text.replace(ASCII_HYPHEN, TRUE_HYPHEN);
}

export function mapStrings<T>(value: T, transform: (text: string) => string): T {
  if (typeof value === "string") {
    return transform(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => mapStrings(item, transform)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, transform)]),
    ) as T;
  }
  return value;
}
