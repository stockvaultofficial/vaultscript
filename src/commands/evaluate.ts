import fs from "node:fs";
import path from "node:path";

import { VaultLexer } from "../lexer/lexer.js";
import { VaultAstParser } from "../parser/parser.js";
import {
  RuleContext,
  VaultRuleEngine,
} from "../runtime/rule-engine.js";

export function evaluateCommand(
  ruleName: string,
  filename: string,
  contextFilename: string,
): void {
  const filepath = resolveFile(
    filename,
    ".vault",
  );

  const contextPath = resolveFile(
    contextFilename,
    ".json",
  );

  const source = fs.readFileSync(
    filepath,
    "utf8",
  );

  const contextSource = fs.readFileSync(
    contextPath,
    "utf8",
  );

  const context =
    parseContext(contextSource);

  const lexer = new VaultLexer();

  const tokens =
    lexer.tokenize(source);

  const parser =
    new VaultAstParser();

  const program =
    parser.parse(tokens);

  const engine =
    new VaultRuleEngine();

  const result =
    engine.evaluate(
      program,
      ruleName,
      context,
    );

  console.log();

  console.log(
    "VaultScript Rule Evaluation",
  );

  console.log(
    "────────────────────────────",
  );

  console.log();

  console.log(
    `Rule: ${result.rule}`,
  );

  console.log();

  for (
    const requirement of
    result.requirements
  ) {
    console.log(
      `${
        requirement.passed
          ? "✓"
          : "✗"
      } ${requirement.expression}`,
    );
  }

  console.log();

  console.log(
    result.allowed
      ? `✓ ${result.rule} allowed`
      : `✗ ${result.rule} denied`,
  );
}

function parseContext(
  source: string,
): RuleContext {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      "Context file contains invalid JSON.",
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Context must be a JSON object.",
    );
  }

  const context: RuleContext = {};

  for (
    const [key, value] of
    Object.entries(parsed)
  ) {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(
        `Context value "${key}" must be a string, number, or boolean.`,
      );
    }

    context[key] = value;
  }

  return context;
}

function resolveFile(
  filename: string,
  extension: string,
): string {
  const filepath = path.resolve(
    process.cwd(),
    filename,
  );

  if (!fs.existsSync(filepath)) {
    throw new Error(
      `File not found: ${filepath}`,
    );
  }

  if (
    !filepath
      .toLowerCase()
      .endsWith(extension)
  ) {
    throw new Error(
      `Expected a ${extension} file.`,
    );
  }

  return filepath;
}