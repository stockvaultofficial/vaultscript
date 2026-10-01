#!/usr/bin/env node
import { checkCommand } from "./commands/check.js";
import { compileCommand } from "./commands/compile.js";
import { runCommand } from "./commands/run.js";
const VERSION = "0.2.0";
function showLogo() {
    console.log(`
██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
██║   ██║███████║██║   ██║██║     ██║
╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║
 ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║
  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝

VaultScript ${VERSION}
StockVault Developer Language
`);
}
function showHelp() {
    showLogo();
    console.log(`Usage:

  vault <command> [file]

Commands:

  run <file>       Execute a .vault program
  check <file>     Validate VaultScript syntax
  compile <file>   Compile to a StockVault manifest

Options:

  --version        Show VaultScript version
  --help           Show this help

Examples:

  vault run examples/demo.vault
  vault check examples/demo.vault
  vault compile examples/demo.vault
`);
}
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const filename = args[1];
    if (!command ||
        command === "--help" ||
        command === "-h") {
        showHelp();
        return;
    }
    if (command === "--version" ||
        command === "-v") {
        console.log(`VaultScript ${VERSION}`);
        return;
    }
    if (command !== "run" &&
        command !== "check" &&
        command !== "compile") {
        console.error(`VaultScript Error: Unknown command "${command}"`);
        console.error('Run "vault --help" for available commands.');
        process.exit(1);
    }
    if (!filename) {
        console.error(`VaultScript Error: "${command}" requires a .vault file.`);
        process.exit(1);
    }
    try {
        switch (command) {
            case "run":
                runCommand(filename);
                break;
            case "check":
                checkCommand(filename);
                break;
            case "compile":
                compileCommand(filename);
                break;
        }
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : String(error);
        console.error();
        console.error(`VaultScript Error: ${message}`);
        console.error();
        process.exit(1);
    }
}
main();
