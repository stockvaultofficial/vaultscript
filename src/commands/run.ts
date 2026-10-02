import fs from "node:fs";
import path from "node:path";

import { VaultLexer } from "../lexer/lexer.js";
import { VaultAstParser } from "../parser/parser.js";
import { VaultInterpreter } from "../runtime/interpreter.js";

export function runCommand(
  filename: string,
): void {
  const filepath =
    resolveVaultFile(filename);

  const source = fs.readFileSync(
    filepath,
    "utf8",
  );

  const lexer = new VaultLexer();
  const tokens = lexer.tokenize(source);

  const parser = new VaultAstParser();
  const program = parser.parse(tokens);

  const interpreter =
    new VaultInterpreter();

  const result =
    interpreter.run(program);

  console.log();

  console.log("VaultScript");

  console.log(
    "────────────────────────────",
  );

  for (const asset of result.assets) {
    console.log(
      `✓ Asset loaded: ${asset.symbol}`,
    );
  }

  if (
    result.assets.length > 0 &&
    result.output.length > 0
  ) {
    console.log();
  }

  for (const value of result.output) {
    console.log(value);
  }

  console.log();

  console.log(
    `✓ Executed ${path.basename(filepath)}`,
  );

  console.log(
    `  ${result.assets.length} asset${
      result.assets.length === 1 ? "" : "s"
    }`,
  );

  const markets = program.body.filter(
    (statement) =>
      statement.type ===
      "MarketDeclaration",
  ).length;

  const rules = program.body.filter(
    (statement) =>
      statement.type ===
      "RuleDeclaration",
  ).length;

  if (markets > 0) {
    console.log(
      `  ${markets} market${
        markets === 1 ? "" : "s"
      }`,
    );
  }

  if (rules > 0) {
    console.log(
      `  ${rules} rule${
        rules === 1 ? "" : "s"
      }`,
    );
  }
}

function resolveVaultFile(
  filename: string,
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

  if (!filepath.endsWith(".vault")) {
    throw new Error(
      "VaultScript files must use the .vault extension.",
    );
  }

  return filepath;
}