import {
  ExpressionNode,
  ProgramNode,
  RuleDeclarationNode,
} from "../parser/ast.js";

export type RuleContextValue =
  | string
  | number
  | boolean;

export type RuleContext = Record<
  string,
  RuleContextValue
>;

export interface RuleRequirementResult {
  passed: boolean;
  expression: string;
  value: RuleContextValue;
}

export interface RuleEvaluationResult {
  rule: string;
  allowed: boolean;
  requirements: RuleRequirementResult[];
}

export class VaultRuleError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(
      line !== undefined &&
        column !== undefined
        ? `VaultScript Rule Error [line ${line}, column ${column}]: ${message}`
        : `VaultScript Rule Error: ${message}`,
    );

    this.name = "VaultRuleError";
  }
}

export class VaultRuleEngine {
  evaluate(
    program: ProgramNode,
    ruleName: string,
    context: RuleContext,
  ): RuleEvaluationResult {
    const rule = this.findRule(
      program,
      ruleName,
    );

    const requirements =
      rule.requirements.map(
        (requirement) => {
          const value =
            this.evaluateExpression(
              requirement.expression,
              context,
            );

          if (
            typeof value !== "boolean"
          ) {
            throw new VaultRuleError(
              `Requirement in rule "${ruleName}" must evaluate to a boolean.`,
              requirement.token.line,
              requirement.token.column,
            );
          }

          return {
            passed: value,
            expression:
              this.expressionToString(
                requirement.expression,
              ),
            value,
          };
        },
      );

    return {
      rule: rule.name,

      allowed: requirements.every(
        (requirement) =>
          requirement.passed,
      ),

      requirements,
    };
  }

  private findRule(
    program: ProgramNode,
    ruleName: string,
  ): RuleDeclarationNode {
    const rule = program.body.find(
      (
        statement,
      ): statement is RuleDeclarationNode =>
        statement.type ===
          "RuleDeclaration" &&
        statement.name === ruleName,
    );

    if (!rule) {
      throw new VaultRuleError(
        `Rule "${ruleName}" was not found.`,
      );
    }

    return rule;
  }

  private evaluateExpression(
    expression: ExpressionNode,
    context: RuleContext,
  ): RuleContextValue {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      case "IdentifierExpression": {
        if (
          !Object.prototype.hasOwnProperty.call(
            context,
            expression.name,
          )
        ) {
          throw new VaultRuleError(
            `Missing context value "${expression.name}".`,
            expression.token.line,
            expression.token.column,
          );
        }

        return context[
          expression.name
        ];
      }

      case "MemberExpression":
        throw new VaultRuleError(
          `Member expression "${expression.object}.${expression.property}" is not supported in rule contexts yet.`,
          expression.token.line,
          expression.token.column,
        );

      case "GroupingExpression":
        return this.evaluateExpression(
          expression.expression,
          context,
        );

      case "UnaryExpression": {
        const operand =
          this.evaluateExpression(
            expression.operand,
            context,
          );

        if (
          expression.operator === "!"
        ) {
          if (
            typeof operand !==
            "boolean"
          ) {
            throw new VaultRuleError(
              'Operator "!" requires a boolean.',
              expression.token.line,
              expression.token.column,
            );
          }

          return !operand;
        }

        if (
          typeof operand !== "number"
        ) {
          throw new VaultRuleError(
            'Unary "-" requires a number.',
            expression.token.line,
            expression.token.column,
          );
        }

        return -operand;
      }

      case "BinaryExpression": {
        const left =
          this.evaluateExpression(
            expression.left,
            context,
          );

        const right =
          this.evaluateExpression(
            expression.right,
            context,
          );

        return this.evaluateBinary(
          left,
          expression.operator,
          right,
          expression.token.line,
          expression.token.column,
        );
      }
    }
  }

  private evaluateBinary(
    left: RuleContextValue,
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
    right: RuleContextValue,
    line: number,
    column: number,
  ): RuleContextValue {
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

        throw new VaultRuleError(
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
          throw new VaultRuleError(
            'Operator "/" requires numbers.',
            line,
            column,
          );
        }

        if (right === 0) {
          throw new VaultRuleError(
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
    left: RuleContextValue,
    right: RuleContextValue,
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
      throw new VaultRuleError(
        `Operator "${operator}" requires numbers.`,
        line,
        column,
      );
    }

    return operation(left, right);
  }

  private numericComparison(
    left: RuleContextValue,
    right: RuleContextValue,
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
      throw new VaultRuleError(
        `Operator "${operator}" requires numbers.`,
        line,
        column,
      );
    }

    return comparison(left, right);
  }

  private expressionToString(
    expression: ExpressionNode,
  ): string {
    switch (expression.type) {
      case "LiteralExpression":
        if (
          typeof expression.value ===
          "string"
        ) {
          return `"${expression.value}"`;
        }

        return String(
          expression.value,
        );

      case "IdentifierExpression":
        return expression.name;

      case "MemberExpression":
        return `${expression.object}.${expression.property}`;

      case "GroupingExpression":
        return `(${this.expressionToString(
          expression.expression,
        )})`;

      case "UnaryExpression":
        return `${expression.operator}${this.expressionToString(
          expression.operand,
        )}`;

      case "BinaryExpression":
        return `${this.expressionToString(
          expression.left,
        )} ${expression.operator} ${this.expressionToString(
          expression.right,
        )}`;
    }
  }
}