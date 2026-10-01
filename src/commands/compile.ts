import fs from "node:fs";
import path from "node:path";

import { VaultParser } from "../core/parser.js";
import { VaultManifest } from "../core/types.js";

const VAULTSCRIPT_VERSION = "0.2.0";

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

  const source = fs.readFileSync(filepath, "utf8");

  const parser = new VaultParser();
  const program = parser.parse(source);

  const manifest: VaultManifest = {
    vaultscript: VAULTSCRIPT_VERSION,
    generatedAt: new Date().toISOString(),

    assets: program.assets.map((asset) => ({
      symbol: asset.symbol,
      ...asset.properties,
    })),
  };

  const parsed = path.parse(filepath);

  const outputFile = path.join(
    parsed.dir,
    `${parsed.name}.vault.json`,
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(manifest, null, 2),
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
    `→ ${program.assets.length} asset${
      program.assets.length === 1 ? "" : "s"
    }`,
  );
}