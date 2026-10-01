import fs from "node:fs";
import path from "node:path";
import { VaultParser } from "../core/parser.js";
export function checkCommand(filename) {
    const filepath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
    }
    if (!filepath.endsWith(".vault")) {
        throw new Error("VaultScript files must use the .vault extension.");
    }
    const source = fs.readFileSync(filepath, "utf8");
    const parser = new VaultParser();
    const program = parser.parse(source);
    console.log();
    console.log(`✓ ${path.basename(filepath)} is valid VaultScript`);
    console.log(`  ${program.assets.length} asset${program.assets.length === 1 ? "" : "s"}`);
    console.log(`  ${Object.keys(program.variables).length} variable${Object.keys(program.variables).length === 1
        ? ""
        : "s"}`);
}
