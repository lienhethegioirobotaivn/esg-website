import type { ZodError } from "zod";

export function flattenIssues(error: ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in messages)) {
      messages[key] = issue.message;
    }
  }
  return messages;
}
