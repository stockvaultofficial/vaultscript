import fs from "node:fs";
import path from "node:path";

import { VaultManifestCompiler } from "../compiler/manifest.js";
import { VaultLexer } from "../lexer/lexer.js";
import { VaultAstParser } from "../parser/parser.js";

export function compileCommand(
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

  const compiler =
    new VaultManifestCompiler();

  const manifest =
    compiler.compile(program);

  const parsed = path.parse(filepath);

  const outputFile = path.join(
    parsed.dir,
    `${parsed.name}.vault.json`,
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      manifest,
      null,
      2,
    ),
    "utf8",
  );

  console.log();

  console.log(
    `✓ Compiled ${path.basename(filepath)}`,
  );

  console.log(
    `→ ${path.basename(outputFile)}`,
  );

  console.log(
    `→ ${manifest.assets.length} asset${
      manifest.assets.length === 1
        ? ""
        : "s"
    }`,
  );

  console.log(
    `→ ${manifest.markets.length} market${
      manifest.markets.length === 1
        ? ""
        : "s"
    }`,
  );

  console.log(
    `→ ${manifest.rules.length} rule${
      manifest.rules.length === 1
        ? ""
        : "s"
    }`,
  );
}