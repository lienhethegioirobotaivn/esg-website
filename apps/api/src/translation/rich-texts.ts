function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function core(text: string): { lead: string; body: string; tail: string } {
  const body = text.trim();
  if (body === "") {
    return { lead: "", body: "", tail: "" };
  }
  const start = text.indexOf(body);
  return { lead: text.slice(0, start), body, tail: text.slice(start + body.length) };
}

function walk(node: unknown, visit: (text: string) => string): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => walk(item, visit));
  }
  if (!isRecord(node)) {
    return node;
  }
  const text = node["text"];
  if (node["type"] === "text" && typeof text === "string") {
    const { lead, body, tail } = core(text);
    return { ...node, text: body === "" ? text : `${lead}${visit(body)}${tail}` };
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    next[key] = walk(value, visit);
  }
  const rawAttrs = next["attrs"];
  if (node["type"] === "image" && isRecord(rawAttrs)) {
    const attrs = { ...rawAttrs };
    for (const field of ["alt", "caption"]) {
      const current = attrs[field];
      if (typeof current === "string" && current.trim() !== "") {
        attrs[field] = visit(current);
      }
    }
    next["attrs"] = attrs;
  }
  return next;
}

export function collectRichTexts(doc: unknown): string[] {
  const texts: string[] = [];
  walk(doc, (text) => {
    texts.push(text);
    return text;
  });
  return texts;
}

export function applyRichTexts<T>(doc: T, map: ReadonlyMap<string, string>): T {
  return walk(doc, (text) => map.get(text) ?? text) as T;
}
