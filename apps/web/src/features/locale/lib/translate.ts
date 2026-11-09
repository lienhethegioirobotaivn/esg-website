export type Messages = Readonly<Record<string, string>>;

export type TranslateVars = Readonly<Record<string, string | number>>;

export type TFunction = (source: string, vars?: TranslateVars) => string;

export function msg(source: string): string {
  return source;
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : match,
  );
}

export function createT(messages: Messages): TFunction {
  return (source, vars) => interpolate(messages[source] ?? source, vars);
}
