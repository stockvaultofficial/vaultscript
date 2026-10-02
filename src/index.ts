#!/usr/bin/env node

import { checkCommand } from "./commands/check.js";
import { compileCommand } from "./commands/compile.js";
import { evaluateCommand } from "./commands/evaluate.js";
import { runCommand } from "./commands/run.js";

const VERSION = "0.4.0";

function showLogo(): void {
  console.log(`
 __      __         _ _    _____           _       _
 \\ \\    / /        | | |  / ____|         (_)     | |
  \\ \\  / /_ _ _   _| | |_| (___   ___ _ __ _ _ __ | |_
   \\ \\/ / _\` | | | | | __|\\___ \\ / __| '__| | '_ \\| __|
    \\  / (_| | |_| | | |_ ____) | (__| |  | | |_) | |_
     \\/ \\__,_|\\__,_|_|\\__|_____/ \\___|_|  |_| .__/ \\__|
                                              | |
                                              |_|

VaultScript v${VERSION}
The language for StockVault.
`);
}

function showHelp(): void {
  showLogo();

  console.log(`Usage:

  vault <command> [arguments]

Commands:

  run <file>
      Execute a .vault program

  check <file>
      Validate VaultScript syntax

  compile <file>
      Compile to a StockVault manifest

  evaluate <rule> <file> --context <file>
      Evaluate a VaultScript rule against JSON context

Options:

  --version
      Show VaultScript version

  --help
      Show this help

Examples:

  vault run examples/stockvault.vault

  vault check examples/stockvault.vault

  vault compile examples/stockvault.vault

  vault evaluate transfer examples/stockvault.vault --context examples/transfer-context.json
`);
}

function main(): void {
  const args =
    process.argv.slice(2);

  const command = args[0];

  if (
    !command ||
    command === "--help" ||
    command === "-h"
  ) {
    showHelp();
    return;
  }

  if (
    command === "--version" ||
    command === "-v"
  ) {
    console.log(
      `VaultScript ${VERSION}`,
    );

    return;
  }

  try {
    switch (command) {
      case "run": {
        const filename = args[1];

        if (!filename) {
          throw new Error(
            '"run" requires a .vault file.',
          );
        }

        runCommand(filename);

        break;
      }

      case "check": {
        const filename = args[1];

        if (!filename) {
          throw new Error(
            '"check" requires a .vault file.',
          );
        }

        checkCommand(filename);

        break;
      }

      case "compile": {
        const filename = args[1];

        if (!filename) {
          throw new Error(
            '"compile" requires a .vault file.',
          );
        }

        compileCommand(filename);

        break;
      }

      case "evaluate": {
        const ruleName = args[1];
        const filename = args[2];

        if (!ruleName) {
          throw new Error(
            '"evaluate" requires a rule name.',
          );
        }

        if (!filename) {
          throw new Error(
            '"evaluate" requires a .vault file.',
          );
        }

        const contextFlagIndex =
          args.indexOf("--context");

        if (
          contextFlagIndex === -1 ||
          !args[
            contextFlagIndex + 1
          ]
        ) {
          throw new Error(
            '"evaluate" requires --context <file>.',
          );
        }

        const contextFilename =
          args[
            contextFlagIndex + 1
          ];

        evaluateCommand(
          ruleName,
          filename,
          contextFilename,
        );

        break;
      }

      default:
        throw new Error(
          `Unknown command "${command}". Run "vault --help" for available commands.`,
        );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error();

    console.error(
      `VaultScript Error: ${message}`,
    );

    console.error();

    process.exit(1);
  }
}

main();
