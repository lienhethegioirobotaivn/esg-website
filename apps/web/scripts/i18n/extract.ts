import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const MARKER_NAMES = new Set(["t", "msg"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".next", "dist", "build"]);

function literalText(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isParenthesizedExpression(node)) {
    return literalText(node.expression);
  }
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literalText(node.left);
    const right = literalText(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  return null;
}

function listSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        files.push(...listSourceFiles(fullPath));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function extractSources(roots: string[]): Map<string, string[]> {
  const sources = new Map<string, string[]>();
  for (const root of roots) {
    for (const file of listSourceFiles(root)) {
      const text = readFileSync(file, "utf8");
      const kind = file.endsWith(".tsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS;
      const sourceFile = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        kind,
      );
      const visit = (node: ts.Node): void => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          MARKER_NAMES.has(node.expression.text)
        ) {
          const first = node.arguments[0];
          const value = first ? literalText(first) : null;
          if (value !== null && value.trim() !== "") {
            const where = sources.get(value) ?? [];
            where.push(path.relative(process.cwd(), file));
            sources.set(value, where);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
  }
  return sources;
}
