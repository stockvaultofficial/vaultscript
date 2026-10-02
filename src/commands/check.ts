import fs from "node:fs";
import path from "node:path";

import { VaultLexer } from "../lexer/lexer.js";
import { VaultAstParser } from "../parser/parser.js";

export function checkCommand(
  filename: string,
): void {
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

  const source = fs.readFileSync(
    filepath,
    "utf8",
  );

  const lexer = new VaultLexer();
  const tokens = lexer.tokenize(source);

  const parser = new VaultAstParser();
  const program = parser.parse(tokens);

  const assets = program.body.filter(
    (statement) =>
      statement.type ===
      "AssetDeclaration",
  ).length;

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

  const variables = program.body.filter(
    (statement) =>
      statement.type ===
      "VariableDeclaration",
  ).length;

  console.log();

  console.log(
    `✓ ${path.basename(filepath)} is valid VaultScript`,
  );

  console.log(
    `  ${assets} asset${
      assets === 1 ? "" : "s"
    }`,
  );

  console.log(
    `  ${markets} market${
      markets === 1 ? "" : "s"
    }`,
  );

  console.log(
    `  ${rules} rule${
      rules === 1 ? "" : "s"
    }`,
  );

  console.log(
    `  ${variables} variable${
      variables === 1 ? "" : "s"
    }`,
  );
}