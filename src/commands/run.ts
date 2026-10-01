import fs from "node:fs";
import path from "node:path";

import { VaultParser } from "../core/parser.js";

export function runCommand(filename: string): void {
  const filepath = resolveVaultFile(filename);

  const source = fs.readFileSync(filepath, "utf8");

  const parser = new VaultParser();
  const program = parser.parse(source);

  console.log();
  console.log("VaultScript");
  console.log("────────────────────────────");

  for (const asset of program.assets) {
    console.log(`✓ Asset loaded: ${asset.symbol}`);
  }

  if (
    program.assets.length > 0 &&
    program.prints.length > 0
  ) {
    console.log();
  }

  for (const expression of program.prints) {
    const result = parser.evaluate(
      expression,
      program,
    );

    console.log(result);
  }

  console.log();
  console.log(
    `✓ Executed ${path.basename(filepath)}`,
  );
}

function resolveVaultFile(filename: string): string {
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