import {
  VaultAsset,
  VaultPrimitive,
  VaultProgram,
} from "./types.js";

export class VaultScriptError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
  ) {
    super(line ? `Line ${line}: ${message}` : message);

    this.name = "VaultScriptError";
  }
}

export class VaultParser {
  private variables: Record<string, VaultPrimitive> = {};
  private assets: VaultAsset[] = [];
  private prints: string[] = [];

  parse(source: string): VaultProgram {
    this.variables = {};
    this.assets = [];
    this.prints = [];

    const lines = source.split(/\r?\n/);

    let index = 0;

    while (index < lines.length) {
      const rawLine = lines[index];
      const line = this.cleanLine(rawLine);

      if (!line) {
        index++;
        continue;
      }

      if (line.startsWith("let ")) {
        this.parseVariable(line, index + 1);
        index++;
        continue;
      }

      if (line.startsWith("print ")) {
        this.prints.push(line.slice("print ".length).trim());
        index++;
        continue;
      }

      if (line.startsWith("asset ")) {
        index = this.parseAsset(lines, index);
        continue;
      }

      throw new VaultScriptError(
        `Unknown statement "${line}"`,
        index + 1,
      );
    }

    return {
      variables: this.variables,
      assets: this.assets,
      prints: this.prints,
    };
  }

  evaluate(
    expression: string,
    program?: VaultProgram,
  ): VaultPrimitive {
    const value = expression.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    const variables = program?.variables ?? this.variables;
    const assets = program?.assets ?? this.assets;

    if (Object.prototype.hasOwnProperty.call(variables, value)) {
      return variables[value];
    }

    const assetPropertyMatch = value.match(
      /^([A-Za-z0-9._-]+)\.([A-Za-z_]\w*)$/,
    );

    if (assetPropertyMatch) {
      const [, symbol, property] = assetPropertyMatch;

      const asset = assets.find(
        (item) => item.symbol === symbol,
      );

      if (!asset) {
        throw new VaultScriptError(
          `Unknown asset "${symbol}"`,
        );
      }

      if (
        !Object.prototype.hasOwnProperty.call(
          asset.properties,
          property,
        )
      ) {
        throw new VaultScriptError(
          `Asset "${symbol}" has no property "${property}"`,
        );
      }

      return asset.properties[property];
    }

    const arithmeticMatch = value.match(
      /^(.+?)\s*([+\-*/])\s*(.+)$/,
    );

    if (arithmeticMatch) {
      const [, leftRaw, operator, rightRaw] =
        arithmeticMatch;

      const left = this.evaluate(leftRaw, program);
      const right = this.evaluate(rightRaw, program);

      if (
        typeof left !== "number" ||
        typeof right !== "number"
      ) {
        throw new VaultScriptError(
          `Operator "${operator}" requires numbers`,
        );
      }

      switch (operator) {
        case "+":
          return left + right;

        case "-":
          return left - right;

        case "*":
          return left * right;

        case "/":
          if (right === 0) {
            throw new VaultScriptError(
              "Division by zero",
            );
          }

          return left / right;
      }
    }

    throw new VaultScriptError(
      `Unable to evaluate "${expression}"`,
    );
  }

  private cleanLine(line: string): string {
    let result = "";
    let quote: '"' | "'" | null = null;

    for (let i = 0; i < line.length; i++) {
      const character = line[i];
      const next = line[i + 1];

      if (
        (character === '"' || character === "'") &&
        line[i - 1] !== "\\"
      ) {
        if (quote === character) {
          quote = null;
        } else if (!quote) {
          quote = character;
        }
      }

      if (
        !quote &&
        character === "/" &&
        next === "/"
      ) {
        break;
      }

      result += character;
    }

    return result.trim();
  }

  private parseVariable(
    line: string,
    lineNumber: number,
  ): void {
    const match = line.match(
      /^let\s+([A-Za-z_]\w*)\s*=\s*(.+)$/,
    );

    if (!match) {
      throw new VaultScriptError(
        "Invalid variable declaration",
        lineNumber,
      );
    }

    const [, name, expression] = match;

    if (
      Object.prototype.hasOwnProperty.call(
        this.variables,
        name,
      )
    ) {
      throw new VaultScriptError(
        `Variable "${name}" already exists`,
        lineNumber,
      );
    }

    this.variables[name] = this.evaluate(expression);
  }

  private parseAsset(
    lines: string[],
    startIndex: number,
  ): number {
    const openingLine = this.cleanLine(
      lines[startIndex],
    );

    const match = openingLine.match(
      /^asset\s+["']?([A-Za-z0-9._-]+)["']?\s*\{$/,
    );

    if (!match) {
      throw new VaultScriptError(
        "Invalid asset declaration",
        startIndex + 1,
      );
    }

    const symbol = match[1];

    if (
      this.assets.some(
        (asset) => asset.symbol === symbol,
      )
    ) {
      throw new VaultScriptError(
        `Asset "${symbol}" already exists`,
        startIndex + 1,
      );
    }

    const asset: VaultAsset = {
      symbol,
      properties: {},
    };

    let index = startIndex + 1;

    while (index < lines.length) {
      const line = this.cleanLine(lines[index]);

      if (!line) {
        index++;
        continue;
      }

      if (line === "}") {
        this.assets.push(asset);
        return index + 1;
      }

      const propertyMatch = line.match(
        /^([A-Za-z_]\w*)\s*:\s*(.+)$/,
      );

      if (!propertyMatch) {
        throw new VaultScriptError(
          `Invalid asset property "${line}"`,
          index + 1,
        );
      }

      const [, property, expression] =
        propertyMatch;

      if (
        Object.prototype.hasOwnProperty.call(
          asset.properties,
          property,
        )
      ) {
        throw new VaultScriptError(
          `Duplicate property "${property}"`,
          index + 1,
        );
      }

      asset.properties[property] =
        this.evaluate(expression);

      index++;
    }

    throw new VaultScriptError(
      `Asset "${symbol}" is missing closing "}"`,
      startIndex + 1,
    );
  }
}