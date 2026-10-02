import {
  Token,
  TokenType,
} from "../lexer/token.js";

import {
  AssetDeclarationNode,
  BinaryExpressionNode,
  ExpressionNode,
  GroupingExpressionNode,
  IdentifierExpressionNode,
  LiteralExpressionNode,
  MarketDeclarationNode,
  MemberExpressionNode,
  PrintStatementNode,
  ProgramNode,
  PropertyNode,
  RequireStatementNode,
  RuleDeclarationNode,
  StatementNode,
  UnaryExpressionNode,
  VariableDeclarationNode,
} from "./ast.js";

export class VaultParserError extends Error {
  constructor(
    message: string,
    public readonly token: Token,
  ) {
    super(
      `VaultScript Parser Error [line ${token.line}, column ${token.column}]: ${message}`,
    );

    this.name = "VaultParserError";
  }
}

export class VaultAstParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(tokens: Token[]): ProgramNode {
    this.tokens = tokens;
    this.current = 0;

    this.skipNewlines();

    const firstToken =
      this.tokens[0] ??
      this.createFallbackToken();

    const body: StatementNode[] = [];

    while (!this.isAtEnd()) {
      body.push(this.statement());

      this.skipNewlines();
    }

    return {
      type: "Program",
      token: firstToken,
      body,
    };
  }

  /* =======================================================
   * STATEMENTS
   * ===================================================== */

  private statement(): StatementNode {
    if (this.match(TokenType.ASSET)) {
      return this.assetDeclaration(
        this.previous(),
      );
    }

    if (this.match(TokenType.MARKET)) {
      return this.marketDeclaration(
        this.previous(),
      );
    }

    if (this.match(TokenType.RULE)) {
      return this.ruleDeclaration(
        this.previous(),
      );
    }

    if (this.match(TokenType.LET)) {
      return this.variableDeclaration(
        this.previous(),
      );
    }

    if (this.match(TokenType.PRINT)) {
      return this.printStatement(
        this.previous(),
      );
    }

    throw this.error(
      this.peek(),
      `Unexpected statement "${this.peek().lexeme}".`,
    );
  }

  /* =======================================================
   * ASSET
   *
   * asset AAPL {
   *   name: "Apple Inc."
   *   type: equity
   * }
   * ===================================================== */

  private assetDeclaration(
    keyword: Token,
  ): AssetDeclarationNode {
    const symbol = this.consume(
      TokenType.IDENTIFIER,
      "Expected asset symbol after 'asset'.",
    );

    this.consume(
      TokenType.LEFT_BRACE,
      `Expected "{" after asset "${symbol.lexeme}".`,
    );

    this.skipNewlines();

    const properties: PropertyNode[] = [];

    while (
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      properties.push(
        this.propertyDeclaration(),
      );

      this.skipNewlines();
    }

    this.consume(
      TokenType.RIGHT_BRACE,
      `Expected "}" after asset "${symbol.lexeme}".`,
    );

    return {
      type: "AssetDeclaration",
      token: keyword,
      symbol: symbol.lexeme,
      properties,
    };
  }

  /* =======================================================
   * MARKET
   *
   * market AAPL/USD {
   *   oracle: stockvault
   * }
   * ===================================================== */

  private marketDeclaration(
    keyword: Token,
  ): MarketDeclarationNode {
    const base = this.consume(
      TokenType.IDENTIFIER,
      "Expected base asset after 'market'.",
    );

    this.consume(
      TokenType.SLASH,
      `Expected "/" after market base "${base.lexeme}".`,
    );

    const quote = this.consume(
      TokenType.IDENTIFIER,
      "Expected quote asset after '/'.",
    );

    this.consume(
      TokenType.LEFT_BRACE,
      `Expected "{" after market "${base.lexeme}/${quote.lexeme}".`,
    );

    this.skipNewlines();

    const properties: PropertyNode[] = [];

    while (
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      properties.push(
        this.propertyDeclaration(),
      );

      this.skipNewlines();
    }

    this.consume(
      TokenType.RIGHT_BRACE,
      `Expected "}" after market "${base.lexeme}/${quote.lexeme}".`,
    );

    return {
      type: "MarketDeclaration",
      token: keyword,
      base: base.lexeme,
      quote: quote.lexeme,
      properties,
    };
  }

  /* =======================================================
   * RULE
   *
   * rule transfer {
   *   require verified == true
   *   require amount > 0
   * }
   * ===================================================== */

  private ruleDeclaration(
    keyword: Token,
  ): RuleDeclarationNode {
    const name = this.consumeRuleName();

    this.consume(
      TokenType.LEFT_BRACE,
      `Expected "{" after rule "${name.lexeme}".`,
    );

    this.skipNewlines();

    const requirements: RequireStatementNode[] =
      [];

    while (
      !this.check(TokenType.RIGHT_BRACE) &&
      !this.isAtEnd()
    ) {
      const requireToken = this.consume(
        TokenType.REQUIRE,
        `Expected "require" inside rule "${name.lexeme}".`,
      );

      const expression =
        this.expression();

      requirements.push({
        type: "RequireStatement",
        token: requireToken,
        expression,
      });

      this.consumeStatementEnd(
        'Expected a new line after "require" expression.',
      );

      this.skipNewlines();
    }

    this.consume(
      TokenType.RIGHT_BRACE,
      `Expected "}" after rule "${name.lexeme}".`,
    );

    return {
      type: "RuleDeclaration",
      token: keyword,
      name: name.lexeme,
      requirements,
    };
  }

  /*
   * Some words such as "transfer" and "redeem"
   * are reserved VaultScript keywords, but we also
   * intentionally allow them as rule names:
   *
   * rule transfer { ... }
   * rule redeem { ... }
   */
  private consumeRuleName(): Token {
    if (
      this.match(
        TokenType.IDENTIFIER,
        TokenType.TRANSFER,
        TokenType.REDEEM,
        TokenType.MINT,
      )
    ) {
      return this.previous();
    }

    throw this.error(
      this.peek(),
      "Expected rule name after 'rule'.",
    );
  }

  /* =======================================================
   * PROPERTY
   *
   * price: 255
   * type: equity
   * ===================================================== */

  private propertyDeclaration(): PropertyNode {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected property name.",
    );

    this.consume(
      TokenType.COLON,
      `Expected ":" after property "${name.lexeme}".`,
    );

    const value = this.expression();

    this.consumeStatementEnd(
      `Expected a new line after property "${name.lexeme}".`,
    );

    return {
      type: "Property",
      token: name,
      name: name.lexeme,
      value,
    };
  }

  /* =======================================================
   * VARIABLE
   *
   * let shares = 10
   * ===================================================== */

  private variableDeclaration(
    keyword: Token,
  ): VariableDeclarationNode {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected variable name after 'let'.",
    );

    this.consume(
      TokenType.EQUAL,
      `Expected "=" after variable "${name.lexeme}".`,
    );

    const initializer = this.expression();

    this.consumeStatementEnd(
      `Expected a new line after variable "${name.lexeme}".`,
    );

    return {
      type: "VariableDeclaration",
      token: keyword,
      name: name.lexeme,
      initializer,
    };
  }

  /* =======================================================
   * PRINT
   *
   * print AAPL.price
   * ===================================================== */

  private printStatement(
    keyword: Token,
  ): PrintStatementNode {
    const expression = this.expression();

    this.consumeStatementEnd(
      'Expected a new line after "print" expression.',
    );

    return {
      type: "PrintStatement",
      token: keyword,
      expression,
    };
  }

  /* =======================================================
   * EXPRESSIONS
   *
   * Precedence:
   *
   * equality
   * comparison
   * term
   * factor
   * unary
   * primary
   * ===================================================== */

  private expression(): ExpressionNode {
    return this.equality();
  }

  private equality(): ExpressionNode {
    let expression = this.comparison();

    while (
      this.match(
        TokenType.EQUAL_EQUAL,
        TokenType.BANG_EQUAL,
      )
    ) {
      const operator = this.previous();

      const right = this.comparison();

      expression = this.binary(
        expression,
        operator,
        right,
      );
    }

    return expression;
  }

  private comparison(): ExpressionNode {
    let expression = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      )
    ) {
      const operator = this.previous();

      const right = this.term();

      expression = this.binary(
        expression,
        operator,
        right,
      );
    }

    return expression;
  }

  private term(): ExpressionNode {
    let expression = this.factor();

    while (
      this.match(
        TokenType.PLUS,
        TokenType.MINUS,
      )
    ) {
      const operator = this.previous();

      const right = this.factor();

      expression = this.binary(
        expression,
        operator,
        right,
      );
    }

    return expression;
  }

  private factor(): ExpressionNode {
    let expression = this.unary();

    while (
      this.match(
        TokenType.STAR,
        TokenType.SLASH,
      )
    ) {
      const operator = this.previous();

      const right = this.unary();

      expression = this.binary(
        expression,
        operator,
        right,
      );
    }

    return expression;
  }

  private unary(): ExpressionNode {
    if (
      this.match(
        TokenType.BANG,
        TokenType.MINUS,
      )
    ) {
      const operator = this.previous();

      const operand = this.unary();

      const node: UnaryExpressionNode = {
        type: "UnaryExpression",
        token: operator,
        operator:
          operator.type === TokenType.BANG
            ? "!"
            : "-",
        operand,
      };

      return node;
    }

    return this.primary();
  }

  private primary(): ExpressionNode {
    if (this.match(TokenType.TRUE)) {
      return this.literal(
        this.previous(),
        true,
      );
    }

    if (this.match(TokenType.FALSE)) {
      return this.literal(
        this.previous(),
        false,
      );
    }

    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();

      return this.literal(
        token,
        token.literal as number,
      );
    }

    if (this.match(TokenType.STRING)) {
      const token = this.previous();

      return this.literal(
        token,
        token.literal as string,
      );
    }

    /*
     * Bare identifiers are deliberately supported.
     *
     * This makes:
     *
     * type: equity
     * oracle: stockvault
     * currency: USD
     *
     * valid VaultScript.
     */
    if (this.match(TokenType.IDENTIFIER)) {
      const identifier = this.previous();

      if (this.match(TokenType.DOT)) {
        const property = this.consume(
          TokenType.IDENTIFIER,
          `Expected property name after "${identifier.lexeme}.".`,
        );

        const node: MemberExpressionNode = {
          type: "MemberExpression",
          token: identifier,
          object: identifier.lexeme,
          property: property.lexeme,
        };

        return node;
      }

      const node: IdentifierExpressionNode = {
        type: "IdentifierExpression",
        token: identifier,
        name: identifier.lexeme,
      };

      return node;
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const opening = this.previous();

      const expression = this.expression();

      this.consume(
        TokenType.RIGHT_PAREN,
        'Expected ")" after expression.',
      );

      const node: GroupingExpressionNode = {
        type: "GroupingExpression",
        token: opening,
        expression,
      };

      return node;
    }

    throw this.error(
      this.peek(),
      `Expected expression but found "${this.peek().lexeme}".`,
    );
  }

  /* =======================================================
   * AST HELPERS
   * ===================================================== */

  private literal(
    token: Token,
    value: string | number | boolean,
  ): LiteralExpressionNode {
    return {
      type: "LiteralExpression",
      token,
      value,
    };
  }

  private binary(
    left: ExpressionNode,
    operator: Token,
    right: ExpressionNode,
  ): BinaryExpressionNode {
    const operatorMap: Partial<
      Record<
        TokenType,
        BinaryExpressionNode["operator"]
      >
    > = {
      [TokenType.PLUS]: "+",
      [TokenType.MINUS]: "-",
      [TokenType.STAR]: "*",
      [TokenType.SLASH]: "/",

      [TokenType.EQUAL_EQUAL]: "==",
      [TokenType.BANG_EQUAL]: "!=",

      [TokenType.GREATER]: ">",
      [TokenType.GREATER_EQUAL]: ">=",

      [TokenType.LESS]: "<",
      [TokenType.LESS_EQUAL]: "<=",
    };

    const mappedOperator =
      operatorMap[operator.type];

    if (!mappedOperator) {
      throw this.error(
        operator,
        `Unsupported operator "${operator.lexeme}".`,
      );
    }

    return {
      type: "BinaryExpression",
      token: operator,
      left,
      operator: mappedOperator,
      right,
    };
  }

  /* =======================================================
   * TOKEN HELPERS
   * ===================================================== */

  private match(
    ...types: TokenType[]
  ): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private consume(
    type: TokenType,
    message: string,
  ): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw this.error(
      this.peek(),
      message,
    );
  }

  private consumeStatementEnd(
    message: string,
  ): void {
    if (
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.RIGHT_BRACE) ||
      this.check(TokenType.EOF)
    ) {
      return;
    }

    throw this.error(
      this.peek(),
      message,
    );
  }

  private skipNewlines(): void {
    while (
      this.match(TokenType.NEWLINE)
    ) {
      // Deliberately empty.
    }
  }

  private check(
    type: TokenType,
  ): boolean {
    if (this.isAtEnd()) {
      return type === TokenType.EOF;
    }

    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }

    return this.previous();
  }

  private isAtEnd(): boolean {
    return (
      this.peek().type === TokenType.EOF
    );
  }

  private peek(): Token {
    return (
      this.tokens[this.current] ??
      this.tokens[
        this.tokens.length - 1
      ] ??
      this.createFallbackToken()
    );
  }

  private previous(): Token {
    return (
      this.tokens[this.current - 1] ??
      this.createFallbackToken()
    );
  }

  private error(
    token: Token,
    message: string,
  ): VaultParserError {
    return new VaultParserError(
      message,
      token,
    );
  }

  private createFallbackToken(): Token {
    return {
      type: TokenType.EOF,
      lexeme: "",
      literal: null,
      line: 1,
      column: 1,
    };
  }
}