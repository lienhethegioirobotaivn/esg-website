export type TargetLocale = "en" | "fr" | "zh";

type LocaleTerms = Partial<Record<TargetLocale, string>>;

export interface Glossary {
  keep: string[];
  exact: Record<string, LocaleTerms>;
  terms: Record<string, LocaleTerms>;
}

export interface Protected {
  html: string;
  tokens: string[];
}

export function parseGlossary(raw: unknown): Glossary {
  const parsed = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Glossary>;
  return {
    keep: parsed.keep ?? [],
    exact: parsed.exact ?? {},
    terms: parsed.terms ?? {},
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(matched: string, target: string): string {
  const first = matched.charAt(0);
  const isUpper = first !== first.toLowerCase() && first === first.toUpperCase();
  if (isUpper && /^[a-z]/.test(target)) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

export function exactTranslation(
  source: string,
  locale: TargetLocale,
  glossary: Glossary,
): string | null {
  return glossary.exact[source]?.[locale] ?? null;
}

export function protect(
  source: string,
  locale: TargetLocale,
  glossary: Glossary,
): Protected {
  const targets = new Map<string, string>();
  for (const [term, byLocale] of Object.entries(glossary.terms)) {
    const target = byLocale[locale];
    if (target) {
      targets.set(term.toLowerCase(), target);
    }
  }
  const words = [...glossary.keep, ...Object.keys(glossary.terms)]
    .filter((word) => word.trim() !== "")
    .sort((a, b) => b.length - a.length)
    .map(escapePattern);
  const placeholder = "\\{[A-Za-z0-9_]+\\}";
  const pattern = new RegExp(
    words.length > 0
      ? `(${placeholder})|(?<![\\p{L}\\p{N}])(${words.join("|")})(?![\\p{L}\\p{N}])`
      : `(${placeholder})`,
    "giu",
  );

  const tokens: string[] = [];
  let html = "";
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const matched = match[0];
    const index = match.index ?? 0;
    html += escapeHtml(source.slice(cursor, index));
    const mapped = targets.get(matched.toLowerCase());
    const value =
      match[1] !== undefined || mapped === undefined
        ? matched
        : matchCase(matched, mapped);
    tokens.push(value);
    html += `<span translate="no">${escapeHtml(value)}</span>`;
    cursor = index + matched.length;
  }
  html += escapeHtml(source.slice(cursor));
  return { html, tokens };
}

function countOccurrences(text: string, part: string): number {
  return part === "" ? 0 : text.split(part).length - 1;
}

export function restore(output: string, tokens: string[]): string | null {
  const text = decodeHtml(output.replace(/<\/?span[^>]*>/gi, "")).trim();
  const needed = new Map<string, number>();
  for (const token of tokens) {
    needed.set(token, (needed.get(token) ?? 0) + 1);
  }
  for (const [token, count] of needed) {
    if (countOccurrences(text, token) < count) {
      return null;
    }
  }
  return text === "" ? null : text;
}
