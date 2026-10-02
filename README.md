# VaultScript

> **The language for StockVault. Define, validate, evaluate and compile tokenized real-world assets with `.vault` files.**

VaultScript is an experimental domain-specific language (DSL) being developed for the **StockVault ecosystem**.

It provides a human-readable way to describe tokenized assets, markets, policy rules and runtime instructions, then validate, execute, evaluate and compile those definitions for StockVault infrastructure.

```text
.vault source
      |
      v
    Lexer
      |
      v
    Tokens
      |
      v
    Parser
      |
      v
     AST
   /  |  \
  v   v   v
Runtime   Rule Engine   Compiler
            |             |
            v             v
       ALLOW / DENY   StockVault Manifest
```

**Current version: `0.4.0`**

---

## Installation

Install VaultScript from npm:

```bash
npm install @stockvault/vaultscript
```

Or install it globally:

```bash
npm install -g @stockvault/vaultscript
```

Check the installed version:

```bash
vault --version
```

```text
VaultScript 0.4.0
```

---

# Quick Start

Create a file named `stockvault.vault`:

```vault
asset AAPL {
    name: "Apple Inc."
    type: equity
    ticker: "AAPL"
    price: 255
    decimals: 18
    tokenized: true
}

market AAPL/USD {
    oracle: stockvault
    currency: USD
}

rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}

let shares = 10

print AAPL.name
print AAPL.price
print shares * AAPL.price
```

Validate it:

```bash
vault check stockvault.vault
```

Run it:

```bash
vault run stockvault.vault
```

Compile it:

```bash
vault compile stockvault.vault
```

Evaluate a policy rule:

```bash
vault evaluate transfer stockvault.vault --context transfer-context.json
```

---

# CLI

VaultScript v0.4.0 provides four core commands:

```text
vault run
vault check
vault compile
vault evaluate
```

## Run

Execute runtime instructions inside a `.vault` program:

```bash
vault run examples/stockvault.vault
```

Example output:

```text
VaultScript
----------------------------

[Asset loaded: AAPL]
[Asset loaded: TSLA]

Apple Inc.
255
2550

Executed stockvault.vault
```

The exact CLI formatting may vary between releases.

---

## Check

Validate VaultScript syntax:

```bash
vault check examples/stockvault.vault
```

A valid program reports its parsed declarations, including assets, markets, rules and variables.

---

## Compile

Compile a VaultScript program into a structured StockVault manifest:

```bash
vault compile examples/stockvault.vault
```

This generates:

```text
stockvault.vault.json
```

The generated manifest contains structured representations of:

- Assets
- Markets
- Rules
- Rule expressions
- VaultScript version
- Generation timestamp

Generated `.vault.json` files are ignored by the repository by default.

---

## Evaluate

VaultScript v0.4.0 introduces executable policy evaluation.

A rule can be defined inside a `.vault` file:

```vault
rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

Create a JSON context:

```json
{
  "verified": true,
  "amount": 10,
  "balance": 50
}
```

Then evaluate the rule:

```bash
vault evaluate transfer examples/stockvault.vault --context examples/transfer-context.json
```

Example result:

```text
VaultScript Rule Evaluation
----------------------------

Rule: transfer

PASS verified == true
PASS amount > 0
PASS balance >= amount

transfer allowed
```

If the context contains:

```json
{
  "verified": true,
  "amount": 100,
  "balance": 50
}
```

the balance requirement fails:

```text
Rule: transfer

PASS verified == true
PASS amount > 0
FAIL balance >= amount

transfer denied
```

This allows StockVault policy decisions to be expressed in VaultScript while transaction-specific data is supplied separately at evaluation time.

---

# Rule Engine

The v0.4 rule engine evaluates VaultScript rules against JSON runtime context.

```text
Transaction / Action
        |
        v
 JSON Rule Context
        |
        v
 VaultScript Rule
        |
        v
   Rule Engine
      /    \
     v      v
  ALLOW    DENY
```

For example:

```vault
rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

can be evaluated using:

```json
{
  "verified": true,
  "amount": 25,
  "balance": 100
}
```

Every `require` expression is evaluated independently.

The overall rule is allowed only when **all requirements pass**.

Conceptually:

```text
requirement 1 = true
requirement 2 = true
requirement 3 = true
--------------------
rule = ALLOW
```

If any requirement evaluates to `false`:

```text
requirement 1 = true
requirement 2 = true
requirement 3 = false
--------------------
rule = DENY
```

The rule engine also rejects missing context values and unknown rules.

---

# Language

## Assets

Assets describe tokenizable financial or real-world assets.

```vault
asset AAPL {
    name: "Apple Inc."
    type: equity
    ticker: "AAPL"
    price: 255
    decimals: 18
    tokenized: true
}
```

Asset properties currently support:

```text
strings
numbers
booleans
symbolic identifiers
```

Examples:

```vault
type: equity
currency: USD
tokenized: true
```

---

## Markets

Markets describe relationships between assets and quote currencies.

```vault
market AAPL/USD {
    oracle: stockvault
    currency: USD
}
```

The compiler converts market declarations into structured manifest data containing the pair, base asset, quote asset and configured properties.

---

## Rules

Rules describe conditions that must pass before an action is allowed.

```vault
rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

Rules are represented internally as Abstract Syntax Tree expressions.

For example:

```vault
require balance >= amount
```

is represented conceptually as:

```text
BinaryExpression
|
+-- left: balance
+-- operator: >=
+-- right: amount
```

In v0.4.0 these expressions can be both:

```text
compiled into manifests
and
evaluated by the VaultScript rule engine
```

---

## Variables

Variables are declared with `let`:

```vault
let shares = 10
```

They can be referenced by runtime expressions:

```vault
print shares
```

or combined with asset properties:

```vault
print shares * AAPL.price
```

---

## Asset Properties

Asset properties can be accessed using member expressions:

```vault
print AAPL.name
print AAPL.price
```

---

## Arithmetic

VaultScript supports:

```text
+
-
*
/
```

Example:

```vault
let shares = 10

print shares * AAPL.price
```

Arithmetic expressions can also be used by the rule engine:

```vault
rule transfer {
    require amount * price <= balance
}
```

---

## Comparisons

VaultScript supports:

```text
==
!=
>
>=
<
<=
```

Example:

```vault
rule redeem {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

---

## Unary Expressions

VaultScript supports numeric negation:

```vault
print -100
```

and boolean inversion:

```vault
rule transfer {
    require !frozen
}
```

---

## Grouping

Expressions can be grouped using parentheses:

```vault
print (10 + 5) * 2
```

---

## Comments

Single-line comments use `//`:

```vault
// VaultScript comment
```

---

# Rule Context

Rule context is supplied as JSON.

Example:

```json
{
  "verified": true,
  "amount": 10,
  "balance": 50
}
```

Context values currently support:

```text
string
number
boolean
```

Arrays, objects and null values are not currently accepted as rule-context values.

If a rule references a value that is not present in the context, evaluation fails rather than silently assuming a value.

For example:

```vault
require balance >= amount
```

requires both:

```text
balance
amount
```

to exist in the supplied context.

---

# File Extensions

VaultScript source files use:

```text
.vault
```

Examples:

```text
stockvault.vault
portfolio.vault
tokenized-assets.vault
markets.vault
```

Compiled manifests use:

```text
.vault.json
```

Example:

```text
stockvault.vault.json
```

---

# Compiler Architecture

VaultScript v0.4.0 uses a lexer, parser and Abstract Syntax Tree rather than directly interpreting raw source text.

```text
Source
  |
  v
Lexer
  |
  v
Tokens
  |
  v
Parser
  |
  v
AST
  |
  +----------------+
  |                |
  v                v
Runtime         Compiler
  |
  +------+
         |
         v
    Rule Engine
```

The AST provides a common representation that can be consumed by different VaultScript components.

This architecture is intended to allow the language to evolve without requiring separate parsing logic for the runtime, compiler and policy engine.

---

# Manifest

Given:

```vault
asset AAPL {
    name: "Apple Inc."
    type: equity
    ticker: "AAPL"
}

market AAPL/USD {
    oracle: stockvault
}

rule transfer {
    require verified == true
    require amount > 0
}
```

VaultScript produces a manifest containing data similar to:

```json
{
  "vaultscript": "0.4.0",
  "generatedAt": "2026-10-02T00:00:00.000Z",
  "assets": [
    {
      "symbol": "AAPL",
      "properties": {
        "name": "Apple Inc.",
        "type": "equity",
        "ticker": "AAPL"
      }
    }
  ],
  "markets": [
    {
      "pair": "AAPL/USD",
      "base": "AAPL",
      "quote": "USD"
    }
  ],
  "rules": [
    {
      "name": "transfer",
      "requirements": []
    }
  ]
}
```

The exact manifest representation is defined by the current compiler implementation and may evolve while VaultScript remains experimental.

---

# Development

Install dependencies:

```bash
npm install
```

Build the production CLI:

```bash
npm run build
```

Run the complete automated test suite:

```bash
npm test
```

Current v0.4.0 test suite:

```text
19 passed
0 failed
```

Link the CLI locally:

```bash
npm link
```

Check the version:

```bash
vault --version
```

```text
VaultScript 0.4.0
```

View CLI help:

```bash
vault --help
```

---

# Project Structure

```text
vaultscript/
|
+-- examples/
|   +-- demo.vault
|   +-- stockvault.vault
|   +-- transfer-context.json
|
+-- src/
|   +-- commands/
|   |   +-- check.ts
|   |   +-- compile.ts
|   |   +-- evaluate.ts
|   |   +-- run.ts
|   |
|   +-- compiler/
|   |   +-- manifest.ts
|   |
|   +-- lexer/
|   |   +-- lexer.ts
|   |   +-- token.ts
|   |
|   +-- parser/
|   |   +-- ast.ts
|   |   +-- parser.ts
|   |
|   +-- runtime/
|   |   +-- interpreter.ts
|   |   +-- rule-engine.ts
|   |
|   +-- index.ts
|
+-- tests/
|   +-- vaultscript.test.ts
|
+-- .gitignore
+-- LICENSE
+-- package.json
+-- package-lock.json
+-- README.md
+-- tsconfig.json
+-- tsconfig.build.json
+-- tsconfig.test.json
```

---

# Automated Tests

VaultScript v0.4.0 currently tests:

```text
Lexer tokenization
Asset parsing
Market parsing
Rule parsing
Runtime variables
Asset property access
Arithmetic
Arithmetic precedence
Manifest compilation
Valid rule evaluation
Insufficient-balance rejection
Unverified-context rejection
Missing-context rejection
Unknown-rule rejection
Rule arithmetic
Invalid syntax
Unknown assets
Missing asset properties
Division by zero
```

Current result:

```text
19 passed
0 failed
```

---

# What's New in v0.4.0

VaultScript v0.4.0 introduces executable policy rules.

Major additions:

- Rule evaluation engine
- `vault evaluate` CLI command
- JSON runtime contexts
- Per-requirement PASS / FAIL evaluation
- ALLOW / DENY rule decisions
- Missing-context validation
- Unknown-rule validation
- Arithmetic inside rule expressions
- Expanded automated test suite
- Separate production and test TypeScript builds

Example:

```bash
vault evaluate transfer examples/stockvault.vault --context examples/transfer-context.json
```

This moves VaultScript beyond defining policy into evaluating policy against supplied runtime data.

---

# Current Limitations

VaultScript is still experimental.

The v0.4 rule engine intentionally supports a limited context model.

Current limitations include:

- Rule context values are limited to strings, numbers and booleans
- Nested context objects are not supported
- Member expressions are not yet supported inside rule contexts
- Rules do not directly execute blockchain transactions
- Rules do not currently call external oracles
- No smart-contract bindings are included yet
- No static type system yet
- No package/module system yet

These limitations keep the v0.4 execution model small and deterministic while the language architecture develops.

---

# Roadmap

Future development areas include:

- Typed asset schemas
- Typed rule contexts
- Nested context data
- Addresses
- Oracle integrations
- Mint policies
- Redemption policies
- Transfer policies
- Asset-level policy binding
- Contract bindings
- StockVault SDK integration
- Smart-contract tooling
- Improved compiler diagnostics
- Source locations in diagnostics
- Developer tooling
- Syntax highlighting
- Language Server Protocol support
- Additional automated tests

A future policy flow could look like:

```text
StockVault Transaction
        |
        v
Transaction Context
        |
        v
VaultScript Policy
        |
        v
Rule Evaluation
        |
    +---+---+
    |       |
    v       v
 ALLOW    DENY
    |
    v
StockVault Execution Layer
```

---

# Status

**VaultScript v0.4.0**

VaultScript is experimental software under active development.

Its syntax, compiler output, rule semantics and runtime behavior may change before a stable release.

VaultScript should not currently be used by itself to represent legally binding ownership, execute financial transactions or deploy production financial contracts.

---

# StockVault

VaultScript is being developed as part of the **StockVault ecosystem**.

StockVault is building infrastructure for bringing real-world assets and traditional financial assets on-chain.

---

# License

MIT