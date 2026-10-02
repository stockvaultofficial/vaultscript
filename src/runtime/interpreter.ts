import {
  AssetDeclarationNode,
  ExpressionNode,
  ProgramNode,
} from "../parser/ast.js";

export type RuntimePrimitive =
  | string
  | number
  | boolean;

export interface RuntimeAsset {
  symbol: string;
  properties: Record<
    string,
    RuntimePrimitive
  >;
}

export interface RuntimeResult {
  variables: Record<
    string,
    RuntimePrimitive
  >;

  assets: RuntimeAsset[];

  output: RuntimePrimitive[];
}

export interface RuntimeContext {
  variables?: Record<
    string,
    RuntimePrimitive
  >;
}

export class VaultRuntimeError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(
      line !== undefined &&
        column !== undefined
        ? `VaultScript Runtime Error [line ${line}, column ${column}]: ${message}`
        : `VaultScript Runtime Error: ${message}`,
    );

    this.name = "VaultRuntimeError";
  }
}

export class VaultInterpreter {
  private variables: Record<
    string,
    RuntimePrimitive
  > = {};

  private assets = new Map<
    string,
    RuntimeAsset
  >();

  private output: RuntimePrimitive[] = [];

  run(
    program: ProgramNode,
    context: RuntimeContext = {},
  ): RuntimeResult {
    this.variables = {
      ...(context.variables ?? {}),
    };

    this.assets = new Map();

    this.output = [];

    for (const statement of program.body) {
      switch (statement.type) {
        case "VariableDeclaration": {
          if (
            Object.prototype.hasOwnProperty.call(
              this.variables,
              statement.name,
            )
          ) {
            throw new VaultRuntimeError(
              `Variable "${statement.name}" already exists.`,
              statement.token.line,
              statement.token.column,
            );
          }

          const value = this.evaluate(
            statement.initializer,
          );

          this.variables[statement.name] =
            value;

          break;
        }

        case "AssetDeclaration": {
          this.loadAsset(statement);
          break;
        }

        case "PrintStatement": {
          const value = this.evaluate(
            statement.expression,
          );

          this.output.push(value);

          break;
        }

        /*
         * Markets and rules are declarations.
         *
         * They will be used by the compiler and
         * later StockVault execution layers, but
         * they do not perform runtime work yet.
         */
        case "MarketDeclaration":
        case "RuleDeclaration":
          break;
      }
    }

    return {
      variables: {
        ...this.variables,
      },

      assets: Array.from(
        this.assets.values(),
      ).map((asset) => ({
        symbol: asset.symbol,

        properties: {
          ...asset.properties,
        },
      })),

      output: [...this.output],
    };
  }

  evaluate(
    expression: ExpressionNode,
  ): RuntimePrimitive {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      case "IdentifierExpression":
        return this.evaluateIdentifier(
          expression.name,
          expression.token.line,
          expression.token.column,
        );

      case "MemberExpression":
        return this.evaluateMember(
          expression.object,
          expression.property,
          expression.token.line,
          expression.token.column,
        );

      case "BinaryExpression": {
        const left = this.evaluate(
          expression.left,
        );

        const right = this.evaluate(
          expression.right,
        );

        return this.evaluateBinary(
          left,
          expression.operator,
          right,
          expression.token.line,
          expression.token.column,
        );
      }

      case "UnaryExpression": {
  const operand = this.evaluate(
    expression.operand,
  );

  if (expression.operator === "!") {
    if (typeof operand !== "boolean") {
      throw new VaultRuntimeError(
        'Operator "!" requires a boolean.',
        expression.token.line,
        expression.token.column,
      );
    }

    return !operand;
  }

  if (typeof operand !== "number") {
    throw new VaultRuntimeError(
      'Unary "-" requires a number.',
      expression.token.line,
      expression.token.column,
    );
  }

  return -operand;
}

      case "GroupingExpression":
        return this.evaluate(
          expression.expression,
        );
    }
  }

  private loadAsset(
    declaration: AssetDeclarationNode,
  ): void {
    if (
      this.assets.has(
        declaration.symbol,
      )
    ) {
      throw new VaultRuntimeError(
        `Asset "${declaration.symbol}" already exists.`,
        declaration.token.line,
        declaration.token.column,
      );
    }

    const properties: Record<
      string,
      RuntimePrimitive
    > = {};

    for (
      const property of
      declaration.properties
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          properties,
          property.name,
        )
      ) {
        throw new VaultRuntimeError(
          `Duplicate property "${property.name}" on asset "${declaration.symbol}".`,
          property.token.line,
          property.token.column,
        );
      }

      properties[property.name] =
        this.evaluatePropertyValue(
          property.value,
        );
    }

    this.assets.set(
      declaration.symbol,
      {
        symbol: declaration.symbol,
        properties,
      },
    );
  }

  /*
   * Asset declaration properties intentionally
   * allow bare identifiers as symbolic values:
   *
   * type: equity
   * currency: USD
   * oracle: stockvault
   *
   * At runtime these become strings rather than
   * variable lookups.
   */
  private evaluatePropertyValue(
    expression: ExpressionNode,
  ): RuntimePrimitive {
    if (
      expression.type ===
      "IdentifierExpression"
    ) {
      return expression.name;
    }

    return this.evaluate(expression);
  }

  private evaluateIdentifier(
    name: string,
    line: number,
    column: number,
  ): RuntimePrimitive {
    if (
      Object.prototype.hasOwnProperty.call(
        this.variables,
        name,
      )
    ) {
      return this.variables[name];
    }

    throw new VaultRuntimeError(
      `Unknown identifier "${name}".`,
      line,
      column,
    );
  }

  private evaluateMember(
    object: string,
    property: string,
    line: number,
    column: number,
  ): RuntimePrimitive {
    const asset =
      this.assets.get(object);

    if (!asset) {
      throw new VaultRuntimeError(
        `Unknown asset "${object}".`,
        line,
        column,
      );
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        asset.properties,
        property,
      )
    ) {
      throw new VaultRuntimeError(
        `Asset "${object}" has no property "${property}".`,
        line,
        column,
      );
    }

    return asset.properties[property];
  }

  private evaluateBinary(
    left: RuntimePrimitive,
    operator:
      | "+"
      | "-"
      | "*"
      | "/"
      | "=="
      | "!="
      | ">"
      | ">="
      | "<"
      | "<=",
    right: RuntimePrimitive,
    line: number,
    column: number,
  ): RuntimePrimitive {
    switch (operator) {
      case "==":
        return left === right;

      case "!=":
        return left !== right;

      case "+":
        if (
          typeof left === "number" &&
          typeof right === "number"
        ) {
          return left + right;
        }

        if (
          typeof left === "string" &&
          typeof right === "string"
        ) {
          return left + right;
        }

        throw new VaultRuntimeError(
          'Operator "+" requires two numbers or two strings.',
          line,
          column,
        );

      case "-":
        return this.numericOperation(
          left,
          right,
          operator,
          (a, b) => a - b,
          line,
          column,
        );

      case "*":
        return this.numericOperation(
          left,
          right,
          operator,
          (a, b) => a * b,
          line,
          column,
        );

      case "/":
        if (
          typeof left !== "number" ||
          typeof right !== "number"
        ) {
          throw new VaultRuntimeError(
            'Operator "/" requires numbers.',
            line,
            column,
          );
        }

        if (right === 0) {
          throw new VaultRuntimeError(
            "Division by zero.",
            line,
            column,
          );
        }

        return left / right;

      case ">":
        return this.numericComparison(
          left,
          right,
          operator,
          (a, b) => a > b,
          line,
          column,
        );

      case ">=":
        return this.numericComparison(
          left,
          right,
          operator,
          (a, b) => a >= b,
          line,
          column,
        );

      case "<":
        return this.numericComparison(
          left,
          right,
          operator,
          (a, b) => a < b,
          line,
          column,
        );

      case "<=":
        return this.numericComparison(
          left,
          right,
          operator,
          (a, b) => a <= b,
          line,
          column,
        );
    }
  }

  private numericOperation(
    left: RuntimePrimitive,
    right: RuntimePrimitive,
    operator: string,
    operation: (
      left: number,
      right: number,
    ) => number,
    line: number,
    column: number,
  ): number {
    if (
      typeof left !== "number" ||
      typeof right !== "number"
    ) {
      throw new VaultRuntimeError(
        `Operator "${operator}" requires numbers.`,
        line,
        column,
      );
    }

    return operation(left, right);
  }

  private numericComparison(
    left: RuntimePrimitive,
    right: RuntimePrimitive,
    operator: string,
    comparison: (
      left: number,
      right: number,
    ) => boolean,
    line: number,
    column: number,
  ): boolean {
    if (
      typeof left !== "number" ||
      typeof right !== "number"
    ) {
      throw new VaultRuntimeError(
        `Operator "${operator}" requires numbers.`,
        line,
        column,
      );
    }

    return comparison(left, right);
  }
}