import assert from "node:assert/strict";

import { VaultManifestCompiler } from "../src/compiler/manifest.js";
import { VaultLexer } from "../src/lexer/lexer.js";
import { TokenType } from "../src/lexer/token.js";
import { VaultAstParser } from "../src/parser/parser.js";
import { VaultInterpreter } from "../src/runtime/interpreter.js";
import {
  RuleContext,
  VaultRuleEngine,
} from "../src/runtime/rule-engine.js";

let passed = 0;
let failed = 0;

function test(
  name: string,
  callback: () => void,
): void {
  try {
    callback();

    passed++;

    console.log(`[PASS] ${name}`);
  } catch (error) {
    failed++;

    console.log(`[FAIL] ${name}`);

    if (error instanceof Error) {
      console.log(`  ${error.message}`);
    } else {
      console.log(`  ${String(error)}`);
    }
  }
}

function parse(source: string) {
  const lexer = new VaultLexer();

  const tokens = lexer.tokenize(source);

  const parser = new VaultAstParser();

  return parser.parse(tokens);
}

function run(source: string) {
  const program = parse(source);

  const interpreter =
    new VaultInterpreter();

  return interpreter.run(program);
}

function compile(source: string) {
  const program = parse(source);

  const compiler =
    new VaultManifestCompiler();

  return compiler.compile(program);
}

function evaluateRule(
  source: string,
  ruleName: string,
  context: RuleContext,
) {
  const program = parse(source);

  const engine =
    new VaultRuleEngine();

  return engine.evaluate(
    program,
    ruleName,
    context,
  );
}

console.log();

console.log(
  "VaultScript v0.4.0 Test Suite",
);

console.log(
  "-----------------------------",
);

console.log();

/* =========================================================
 * LEXER
 * ======================================================= */

test(
  "Lexer: tokenizes VaultScript",
  () => {
    const lexer = new VaultLexer();

    const tokens = lexer.tokenize(`
asset AAPL {
  price: 255
}
`);

    assert.ok(
      tokens.some(
        (token) =>
          token.type ===
          TokenType.ASSET,
      ),
    );

    assert.ok(
      tokens.some(
        (token) =>
          token.type ===
            TokenType.NUMBER &&
          token.literal === 255,
      ),
    );

    assert.equal(
      tokens[tokens.length - 1].type,
      TokenType.EOF,
    );
  },
);

/* =========================================================
 * PARSER
 * ======================================================= */

test(
  "Parser: parses assets",
  () => {
    const program = parse(`
asset AAPL {
  name: "Apple Inc."
  type: equity
}
`);

    assert.equal(
      program.body.length,
      1,
    );

    const asset =
      program.body[0];

    assert.equal(
      asset.type,
      "AssetDeclaration",
    );

    if (
      asset.type !==
      "AssetDeclaration"
    ) {
      throw new Error(
        "Expected AssetDeclaration.",
      );
    }

    assert.equal(
      asset.symbol,
      "AAPL",
    );

    assert.equal(
      asset.properties.length,
      2,
    );
  },
);

test(
  "Parser: parses markets",
  () => {
    const program = parse(`
market AAPL/USD {
  oracle: stockvault
  currency: USD
}
`);

    const market =
      program.body[0];

    assert.equal(
      market.type,
      "MarketDeclaration",
    );

    if (
      market.type !==
      "MarketDeclaration"
    ) {
      throw new Error(
        "Expected MarketDeclaration.",
      );
    }

    assert.equal(
      market.base,
      "AAPL",
    );

    assert.equal(
      market.quote,
      "USD",
    );

    assert.equal(
      market.properties.length,
      2,
    );
  },
);

test(
  "Parser: parses rules",
  () => {
    const program = parse(`
rule transfer {
  require verified == true
  require amount > 0
  require balance >= amount
}
`);

    const rule =
      program.body[0];

    assert.equal(
      rule.type,
      "RuleDeclaration",
    );

    if (
      rule.type !==
      "RuleDeclaration"
    ) {
      throw new Error(
        "Expected RuleDeclaration.",
      );
    }

    assert.equal(
      rule.name,
      "transfer",
    );

    assert.equal(
      rule.requirements.length,
      3,
    );
  },
);

/* =========================================================
 * RUNTIME
 * ======================================================= */

test(
  "Runtime: evaluates variables",
  () => {
    const result = run(`
let shares = 10
print shares
`);

    assert.equal(
      result.variables.shares,
      10,
    );

    assert.deepEqual(
      result.output,
      [10],
    );
  },
);

test(
  "Runtime: reads asset properties",
  () => {
    const result = run(`
asset AAPL {
  name: "Apple Inc."
  price: 255
}

print AAPL.name
print AAPL.price
`);

    assert.deepEqual(
      result.output,
      [
        "Apple Inc.",
        255,
      ],
    );
  },
);

test(
  "Runtime: evaluates arithmetic",
  () => {
    const result = run(`
asset AAPL {
  price: 255
}

let shares = 10

print shares * AAPL.price
`);

    assert.deepEqual(
      result.output,
      [2550],
    );
  },
);

test(
  "Runtime: respects arithmetic precedence",
  () => {
    const result = run(`
print 10 + 5 * 2
print (10 + 5) * 2
`);

    assert.deepEqual(
      result.output,
      [
        20,
        30,
      ],
    );
  },
);

/* =========================================================
 * COMPILER
 * ======================================================= */

test(
  "Compiler: builds StockVault manifest",
  () => {
    const manifest = compile(`
asset AAPL {
  name: "Apple Inc."
  type: equity
  ticker: "AAPL"
}

market AAPL/USD {
  oracle: stockvault
  currency: USD
}

rule transfer {
  require verified == true
  require amount > 0
}
`);

    
    assert.equal(
      manifest.vaultscript,
      "0.4.0",
    );

    assert.equal(
      manifest.assets.length,
      1,
    );

    assert.equal(
      manifest.markets.length,
      1,
    );

    assert.equal(
      manifest.rules.length,
      1,
    );

    assert.equal(
      manifest.assets[0].symbol,
      "AAPL",
    );

    assert.equal(
      manifest.markets[0].pair,
      "AAPL/USD",
    );

    assert.equal(
      manifest.rules[0].name,
      "transfer",
    );

    assert.equal(
      manifest.rules[0]
        .requirements.length,
      2,
    );
  },
);

/* =========================================================
 * RULE ENGINE
 * ======================================================= */

const transferRule = `
rule transfer {
  require verified == true
  require amount > 0
  require balance >= amount
}
`;

test(
  "Rule Engine: allows valid transfer",
  () => {
    const result =
      evaluateRule(
        transferRule,
        "transfer",
        {
          verified: true,
          amount: 10,
          balance: 50,
        },
      );

    assert.equal(
      result.rule,
      "transfer",
    );

    assert.equal(
      result.allowed,
      true,
    );

    assert.equal(
      result.requirements.length,
      3,
    );

    assert.deepEqual(
      result.requirements.map(
        (requirement) =>
          requirement.passed,
      ),
      [
        true,
        true,
        true,
      ],
    );
  },
);

test(
  "Rule Engine: denies insufficient balance",
  () => {
    const result =
      evaluateRule(
        transferRule,
        "transfer",
        {
          verified: true,
          amount: 100,
          balance: 50,
        },
      );

    assert.equal(
      result.allowed,
      false,
    );

    assert.deepEqual(
      result.requirements.map(
        (requirement) =>
          requirement.passed,
      ),
      [
        true,
        true,
        false,
      ],
    );
  },
);

test(
  "Rule Engine: denies unverified transfer",
  () => {
    const result =
      evaluateRule(
        transferRule,
        "transfer",
        {
          verified: false,
          amount: 10,
          balance: 50,
        },
      );

    assert.equal(
      result.allowed,
      false,
    );

    assert.deepEqual(
      result.requirements.map(
        (requirement) =>
          requirement.passed,
      ),
      [
        false,
        true,
        true,
      ],
    );
  },
);

test(
  "Rule Engine: rejects missing context",
  () => {
    assert.throws(
      () =>
        evaluateRule(
          transferRule,
          "transfer",
          {
            verified: true,
            amount: 10,
          },
        ),
      /Missing context value "balance"/,
    );
  },
);

test(
  "Rule Engine: rejects unknown rule",
  () => {
    assert.throws(
      () =>
        evaluateRule(
          transferRule,
          "mint",
          {
            verified: true,
            amount: 10,
            balance: 50,
          },
        ),
      /Rule "mint" was not found/,
    );
  },
);

test(
  "Rule Engine: evaluates arithmetic expressions",
  () => {
    const result =
      evaluateRule(
        `
rule transfer {
  require amount * price <= balance
}
`,
        "transfer",
        {
          amount: 2,
          price: 25,
          balance: 100,
        },
      );

    assert.equal(
      result.allowed,
      true,
    );

    assert.equal(
      result.requirements[0]
        .passed,
      true,
    );

    assert.equal(
      result.requirements[0]
        .expression,
      "amount * price <= balance",
    );
  },
);

/* =========================================================
 * ERROR HANDLING
 * ======================================================= */

test(
  "Errors: rejects invalid syntax",
  () => {
    assert.throws(
      () =>
        parse(`
asset AAPL {
  price 255
}
`),
      /Expected ":"/,
    );
  },
);

test(
  "Errors: rejects unknown assets",
  () => {
    assert.throws(
      () =>
        run(`
print UNKNOWN.price
`),
      /Unknown asset "UNKNOWN"/,
    );
  },
);

test(
  "Errors: rejects missing asset properties",
  () => {
    assert.throws(
      () =>
        run(`
asset AAPL {
  price: 255
}

print AAPL.name
`),
      /has no property "name"/,
    );
  },
);

test(
  "Errors: rejects division by zero",
  () => {
    assert.throws(
      () =>
        run(`
print 10 / 0
`),
      /Division by zero/,
    );
  },
);

/* =========================================================
 * SUMMARY
 * ======================================================= */

console.log();

console.log(
  "-----------------------------",
);

console.log(
  `${passed} passed`,
);

console.log(
  `${failed} failed`,
);

console.log();

if (failed > 0) {
  process.exit(1);
}
