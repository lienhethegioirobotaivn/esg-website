import { readFileSync } from "node:fs";

import { parseGlossary } from "../../src/features/locale/lib/glossary";
import type { Glossary } from "../../src/features/locale/lib/glossary";

export * from "../../src/features/locale/lib/glossary";

export function loadGlossary(file: string): Glossary {
  return parseGlossary(JSON.parse(readFileSync(file, "utf8")));
}
