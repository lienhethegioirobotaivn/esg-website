import type { TranslationLocale } from "../database/schema/index.js";
import type { TermMapping } from "./glossary.js";

export const TRANSLATOR = Symbol("TRANSLATOR");

export interface TranslationRequest {
  locale: TranslationLocale;
  texts: readonly string[];
  keep: readonly string[];
  terms: readonly TermMapping[];
}

export interface Translator {
  translate(request: TranslationRequest): Promise<(string | null)[]>;
}

export class TranslatorError extends Error {
  constructor(
    message: string,
    readonly rateLimited: boolean = false,
  ) {
    super(message);
    this.name = "TranslatorError";
  }
}
