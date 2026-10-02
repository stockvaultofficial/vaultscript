import {
  Token,
  TokenType,
} from "./token.js";

export class VaultLexerError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(
      `VaultScript Lexer Error [line ${line}, column ${column}]: ${message}`,
    );

    this.name = "VaultLexerError";
  }
}

const KEYWORDS: Record<string, TokenType> = {
  asset: TokenType.ASSET,
  market: TokenType.MARKET,
  rule: TokenType.RULE,
  require: TokenType.REQUIRE,

  let: TokenType.LET,
  print: TokenType.PRINT,

  true: TokenType.TRUE,
  false: TokenType.FALSE,

  mint: TokenType.MINT,
  redeem: TokenType.REDEEM,
  transfer: TokenType.TRANSFER,
  to: TokenType.TO,
};

export class VaultLexer {
  private source = "";

  private tokens: Token[] = [];

  private start = 0;
  private current = 0;

  private line = 1;
  private column = 1;

  private tokenLine = 1;
  private tokenColumn = 1;

  tokenize(source: string): Token[] {
    this.source = source;

    this.tokens = [];

    this.start = 0;
    this.current = 0;

    this.line = 1;
    this.column = 1;

    this.tokenLine = 1;
    this.tokenColumn = 1;

    while (!this.isAtEnd()) {
      this.start = this.current;

      this.tokenLine = this.line;
      this.tokenColumn = this.column;

      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      literal: null,
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const character = this.advance();

    switch (character) {
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        return;

      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        return;

      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        return;

      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        return;

      case ":":
        this.addToken(TokenType.COLON);
        return;

      case ".":
        this.addToken(TokenType.DOT);
        return;

      case "+":
        this.addToken(TokenType.PLUS);
        return;

      case "-":
        this.addToken(TokenType.MINUS);
        return;

      case "*":
        this.addToken(TokenType.STAR);
        return;

      case "=":
        this.addToken(
          this.match("=")
            ? TokenType.EQUAL_EQUAL
            : TokenType.EQUAL,
        );

        return;

      case ">":
        this.addToken(
          this.match("=")
            ? TokenType.GREATER_EQUAL
            : TokenType.GREATER,
        );

        return;

      case "<":
        this.addToken(
          this.match("=")
            ? TokenType.LESS_EQUAL
            : TokenType.LESS,
        );

        return;

      case "!":
        this.addToken(
          this.match("=")
            ? TokenType.BANG_EQUAL
            : TokenType.BANG,
        );

        return;

      case "/":
        if (this.match("/")) {
          this.skipComment();
          return;
        }

        this.addToken(TokenType.SLASH);
        return;

      case '"':
      case "'":
        this.scanString(character);
        return;

      case " ":
      case "\t":
      case "\r":
        return;

      case "\n":
        this.addToken(TokenType.NEWLINE);

        this.line++;
        this.column = 1;

        return;

      default:
        break;
    }

    if (this.isDigit(character)) {
      this.scanNumber();
      return;
    }

    if (this.isIdentifierStart(character)) {
      this.scanIdentifier();
      return;
    }

    throw new VaultLexerError(
      `Unexpected character "${character}"`,
      this.tokenLine,
      this.tokenColumn,
    );
  }

  private scanString(
    quoteCharacter: string,
  ): void {
    let value = "";

    while (!this.isAtEnd()) {
      const character = this.peek();

      if (character === quoteCharacter) {
        this.advance();

        this.addToken(
          TokenType.STRING,
          value,
        );

        return;
      }

      if (character === "\n") {
        throw new VaultLexerError(
          "Strings cannot span multiple lines.",
          this.tokenLine,
          this.tokenColumn,
        );
      }

      if (character === "\\") {
        this.advance();

        if (this.isAtEnd()) {
          break;
        }

        const escaped = this.advance();

        switch (escaped) {
          case "n":
            value += "\n";
            break;

          case "t":
            value += "\t";
            break;

          case "r":
            value += "\r";
            break;

          case '"':
            value += '"';
            break;

          case "'":
            value += "'";
            break;

          case "\\":
            value += "\\";
            break;

          default:
            value += escaped;
            break;
        }

        continue;
      }

      value += this.advance();
    }

    throw new VaultLexerError(
      "Unterminated string.",
      this.tokenLine,
      this.tokenColumn,
    );
  }

  private scanNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (
      this.peek() === "." &&
      this.isDigit(this.peekNext())
    ) {
      this.advance();

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const text = this.source.slice(
      this.start,
      this.current,
    );

    const value = Number(text);

    if (!Number.isFinite(value)) {
      throw new VaultLexerError(
        `Invalid number "${text}"`,
        this.tokenLine,
        this.tokenColumn,
      );
    }

    this.addToken(
      TokenType.NUMBER,
      value,
    );
  }

  private scanIdentifier(): void {
    while (
      this.isIdentifierPart(this.peek())
    ) {
      this.advance();
    }

    const text = this.source.slice(
      this.start,
      this.current,
    );

    const keywordType = KEYWORDS[text];

    if (keywordType) {
      switch (keywordType) {
        case TokenType.TRUE:
          this.addToken(
            TokenType.TRUE,
            true,
          );

          return;

        case TokenType.FALSE:
          this.addToken(
            TokenType.FALSE,
            false,
          );

          return;

        default:
          this.addToken(keywordType);
          return;
      }
    }

    this.addToken(
      TokenType.IDENTIFIER,
      text,
    );
  }

  private skipComment(): void {
    while (
      this.peek() !== "\n" &&
      !this.isAtEnd()
    ) {
      this.advance();
    }
  }

  private addToken(
    type: TokenType,
    literal: string | number | boolean | null = null,
  ): void {
    const lexeme = this.source.slice(
      this.start,
      this.current,
    );

    this.tokens.push({
      type,
      lexeme,
      literal,
      line: this.tokenLine,
      column: this.tokenColumn,
    });
  }

  private advance(): string {
    const character =
      this.source[this.current] ?? "\0";

    this.current++;
    this.column++;

    return character;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    if (
      this.source[this.current] !== expected
    ) {
      return false;
    }

    this.current++;
    this.column++;

    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return "\0";
    }

    return this.source[this.current];
  }

  private peekNext(): string {
    if (
      this.current + 1 >=
      this.source.length
    ) {
      return "\0";
    }

    return this.source[
      this.current + 1
    ];
  }

  private isAtEnd(): boolean {
    return (
      this.current >= this.source.length
    );
  }

  private isDigit(
    character: string,
  ): boolean {
    return (
      character >= "0" &&
      character <= "9"
    );
  }

  private isAlpha(
    character: string,
  ): boolean {
    return (
      (character >= "a" &&
        character <= "z") ||
      (character >= "A" &&
        character <= "Z")
    );
  }

  private isIdentifierStart(
    character: string,
  ): boolean {
    return (
      this.isAlpha(character) ||
      character === "_"
    );
  }

  private isIdentifierPart(
    character: string,
  ): boolean {
    return (
      this.isIdentifierStart(character) ||
      this.isDigit(character)
    );
  }
}