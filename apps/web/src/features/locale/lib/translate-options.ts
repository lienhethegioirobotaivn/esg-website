import type { TFunction } from "./translate";

interface Option {
  readonly value: string;
  readonly label: string;
}

export function translateOptions(
  options: readonly Option[],
  t: TFunction,
): { value: string; label: string }[] {
  return options.map(({ value, label }) => ({ value, label: t(label) }));
}
