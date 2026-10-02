import { Token } from "../lexer/token.js";

/**
 * Every VaultScript AST node has a type and
 * remembers where it appeared in the source.
 */
export interface BaseNode {
  type: string;
  token: Token;
}

/* =========================================================
 * PROGRAM
 * ======================================================= */

export interface ProgramNode extends BaseNode {
  type: "Program";
  body: StatementNode[];
}

/* =========================================================
 * STATEMENTS
 * ======================================================= */

export type StatementNode =
  | AssetDeclarationNode
  | MarketDeclarationNode
  | RuleDeclarationNode
  | VariableDeclarationNode
  | PrintStatementNode;

/* =========================================================
 * ASSET
 *
 * asset AAPL {
 *   name: "Apple Inc."
 *   type: equity
 * }
 * ======================================================= */

export interface AssetDeclarationNode
  extends BaseNode {
  type: "AssetDeclaration";

  symbol: string;

  properties: PropertyNode[];
}

/* =========================================================
 * MARKET
 *
 * market AAPL/USD {
 *   oracle: stockvault
 *   currency: USD
 * }
 * ======================================================= */

export interface MarketDeclarationNode
  extends BaseNode {
  type: "MarketDeclaration";

  base: string;
  quote: string;

  properties: PropertyNode[];
}

/* =========================================================
 * RULE
 *
 * rule transfer {
 *   require verified == true
 *   require amount > 0
 * }
 * ======================================================= */

export interface RuleDeclarationNode
  extends BaseNode {
  type: "RuleDeclaration";

  name: string;

  requirements: RequireStatementNode[];
}

/* =========================================================
 * REQUIRE
 * ======================================================= */

export interface RequireStatementNode
  extends BaseNode {
  type: "RequireStatement";

  expression: ExpressionNode;
}

/* =========================================================
 * PROPERTY
 *
 * price: 255
 * oracle: stockvault
 * ======================================================= */

export interface PropertyNode
  extends BaseNode {
  type: "Property";

  name: string;

  value: ExpressionNode;
}

/* =========================================================
 * VARIABLE
 *
 * let shares = 10
 * ======================================================= */

export interface VariableDeclarationNode
  extends BaseNode {
  type: "VariableDeclaration";

  name: string;

  initializer: ExpressionNode;
}

/* =========================================================
 * PRINT
 *
 * print AAPL.price
 * ======================================================= */

export interface PrintStatementNode
  extends BaseNode {
  type: "PrintStatement";

  expression: ExpressionNode;
}

/* =========================================================
 * EXPRESSIONS
 * ======================================================= */

export type ExpressionNode =
  | LiteralExpressionNode
  | IdentifierExpressionNode
  | MemberExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | GroupingExpressionNode;

/* =========================================================
 * LITERAL
 *
 * "Apple Inc."
 * 255
 * true
 * ======================================================= */

export interface LiteralExpressionNode
  extends BaseNode {
  type: "LiteralExpression";

  value: string | number | boolean;
}

/* =========================================================
 * IDENTIFIER
 *
 * equity
 * balance
 * amount
 * stockvault
 * ======================================================= */

export interface IdentifierExpressionNode
  extends BaseNode {
  type: "IdentifierExpression";

  name: string;
}

/* =========================================================
 * MEMBER
 *
 * AAPL.price
 * TSLA.name
 * ======================================================= */

export interface MemberExpressionNode
  extends BaseNode {
  type: "MemberExpression";

  object: string;
  property: string;
}

/* =========================================================
 * BINARY
 *
 * balance >= amount
 * verified == true
 * shares * AAPL.price
 * ======================================================= */

export interface BinaryExpressionNode
  extends BaseNode {
  type: "BinaryExpression";

  left: ExpressionNode;

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
    | "<=";

  right: ExpressionNode;
}

/* =========================================================
 * UNARY
 *
 * !verified
 * -100
 * ======================================================= */

export interface UnaryExpressionNode
  extends BaseNode {
  type: "UnaryExpression";

  operator: "!" | "-";

  operand: ExpressionNode;
}

/* =========================================================
 * GROUPING
 *
 * (balance + pending)
 * ======================================================= */

export interface GroupingExpressionNode
  extends BaseNode {
  type: "GroupingExpression";

  expression: ExpressionNode;
}