import {
  ExpressionNode,
  ProgramNode,
} from "../parser/ast.js";

export type ManifestPrimitive =
  | string
  | number
  | boolean;

export interface VaultManifestAsset {
  symbol: string;

  [property: string]:
    | ManifestPrimitive;
}

export interface VaultManifestMarket {
  pair: string;
  base: string;
  quote: string;

  [property: string]:
    | ManifestPrimitive;
}

export interface VaultManifestExpression {
  type:
    | "literal"
    | "identifier"
    | "member"
    | "binary"
    | "unary"
    | "grouping";

  value?: ManifestPrimitive;

  name?: string;

  object?: string;
  property?: string;

  operator?: string;

  left?: VaultManifestExpression;
  right?: VaultManifestExpression;

  operand?: VaultManifestExpression;

  expression?: VaultManifestExpression;
}

export interface VaultManifestRequirement {
  expression: VaultManifestExpression;
}

export interface VaultManifestRule {
  name: string;
  requirements: VaultManifestRequirement[];
}

export interface VaultManifest {
  vaultscript: "0.4.0";

  generatedAt: string;

  assets: VaultManifestAsset[];

  markets: VaultManifestMarket[];

  rules: VaultManifestRule[];
}

export class VaultManifestCompiler {
  compile(
    program: ProgramNode,
  ): VaultManifest {
    const assets: VaultManifestAsset[] = [];

    const markets: VaultManifestMarket[] = [];

    const rules: VaultManifestRule[] = [];

    for (const statement of program.body) {
      switch (statement.type) {
        case "AssetDeclaration": {
          const asset: VaultManifestAsset = {
            symbol: statement.symbol,
          };

          for (
            const property of
            statement.properties
          ) {
            asset[property.name] =
              this.compilePropertyValue(
                property.value,
              );
          }

          assets.push(asset);

          break;
        }

        case "MarketDeclaration": {
          const market: VaultManifestMarket = {
            pair: `${statement.base}/${statement.quote}`,
            base: statement.base,
            quote: statement.quote,
          };

          for (
            const property of
            statement.properties
          ) {
            market[property.name] =
              this.compilePropertyValue(
                property.value,
              );
          }

          markets.push(market);

          break;
        }

        case "RuleDeclaration": {
          rules.push({
            name: statement.name,

            requirements:
              statement.requirements.map(
                (requirement) => ({
                  expression:
                    this.compileExpression(
                      requirement.expression,
                    ),
                }),
              ),
          });

          break;
        }

        /*
         * Variables and print statements are runtime
         * instructions and are intentionally not
         * included in the deployment manifest.
         */
        case "VariableDeclaration":
        case "PrintStatement":
          break;
      }
    }

    return {
      vaultscript: "0.4.0",

      generatedAt:
        new Date().toISOString(),

      assets,

      markets,

      rules,
    };
  }

  private compilePropertyValue(
    expression: ExpressionNode,
  ): ManifestPrimitive {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      /*
       * Bare identifiers inside declarations are
       * symbolic values:
       *
       * type: equity
       * oracle: stockvault
       * currency: USD
       */
      case "IdentifierExpression":
        return expression.name;

      case "UnaryExpression": {
        if (
          expression.operator === "-" &&
          expression.operand.type ===
            "LiteralExpression" &&
          typeof expression.operand.value ===
            "number"
        ) {
          return -expression.operand.value;
        }

        throw this.compilerError(
          expression,
          "Asset and market property values must compile to a primitive value.",
        );
      }

      case "GroupingExpression":
        return this.compilePropertyValue(
          expression.expression,
        );

      default:
        throw this.compilerError(
          expression,
          "Asset and market property values must compile to a primitive value.",
        );
    }
  }

  private compileExpression(
    expression: ExpressionNode,
  ): VaultManifestExpression {
    switch (expression.type) {
      case "LiteralExpression":
        return {
          type: "literal",
          value: expression.value,
        };

      case "IdentifierExpression":
        return {
          type: "identifier",
          name: expression.name,
        };

      case "MemberExpression":
        return {
          type: "member",
          object: expression.object,
          property: expression.property,
        };

      case "BinaryExpression":
        return {
          type: "binary",

          operator: expression.operator,

          left: this.compileExpression(
            expression.left,
          ),

          right: this.compileExpression(
            expression.right,
          ),
        };

      case "UnaryExpression":
        return {
          type: "unary",

          operator: expression.operator,

          operand: this.compileExpression(
            expression.operand,
          ),
        };

      case "GroupingExpression":
        return {
          type: "grouping",

          expression:
            this.compileExpression(
              expression.expression,
            ),
        };
    }
  }

  private compilerError(
    expression: ExpressionNode,
    message: string,
  ): Error {
    return new Error(
      `VaultScript Compiler Error [line ${expression.token.line}, column ${expression.token.column}]: ${message}`,
    );
  }
}
