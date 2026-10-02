export enum TokenType {
  // Structure
  LEFT_BRACE = "LEFT_BRACE",
  RIGHT_BRACE = "RIGHT_BRACE",
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  COLON = "COLON",
  SLASH = "SLASH",
  DOT = "DOT",

  // Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",

  EQUAL = "EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",

  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",

  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",

  BANG = "BANG",
  BANG_EQUAL = "BANG_EQUAL",

  // Literals
  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  NUMBER = "NUMBER",

  // Keywords
  ASSET = "ASSET",
  MARKET = "MARKET",
  RULE = "RULE",
  REQUIRE = "REQUIRE",

  LET = "LET",
  PRINT = "PRINT",

  TRUE = "TRUE",
  FALSE = "FALSE",

  // Future StockVault keywords
  MINT = "MINT",
  REDEEM = "REDEEM",
  TRANSFER = "TRANSFER",
  TO = "TO",

  // Special
  NEWLINE = "NEWLINE",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;

  /**
   * Exact source text that produced this token.
   */
  lexeme: string;

  /**
   * Parsed literal value where applicable.
   *
   * Examples:
   * STRING -> "Apple Inc."
   * NUMBER -> 1000
   * TRUE   -> true
   */
  literal: string | number | boolean | null;

  /**
   * 1-based source position.
   */
  line: number;
  column: number;
}

export function tokenTypeName(
  type: TokenType,
): string {
  return type;
}