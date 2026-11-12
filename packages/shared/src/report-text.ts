export type ReportTranslator = (
  text: string,
  vars?: Record<string, string | number>,
) => string;

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(
  text: string,
  vars?: Record<string, string | number>,
): string {
  if (vars === undefined) {
    return text;
  }
  return text.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export const identityTranslator: ReportTranslator = interpolate;

let active: ReportTranslator = identityTranslator;

export function t(text: string, vars?: Record<string, string | number>): string {
  return active(text, vars);
}

export function withTranslator<T>(
  translator: ReportTranslator | undefined,
  run: () => T,
): T {
  const previous = active;
  active = translator ?? identityTranslator;
  try {
    return run();
  } finally {
    active = previous;
  }
}
