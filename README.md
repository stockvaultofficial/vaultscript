# VaultScript

> **The language for StockVault. Define, validate and compile tokenized real-world assets with `.vault` files.**

VaultScript is an experimental domain-specific language (DSL) being developed for the **StockVault ecosystem**.

It provides a human-readable way to describe tokenized assets, markets, validation rules and runtime instructions, then compile those definitions into structured StockVault manifests.

```text
.vault source
      ↓
    Lexer
      ↓
    Tokens
      ↓
    Parser
      ↓
     AST
    ↙   ↘
Runtime  Compiler
           ↓
   StockVault Manifest
```

**Current version: `0.3.0`**

---

## Example

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

Run it:

```bash
vault run example.vault
```

Output:

```text
VaultScript
────────────────────────────
✓ Asset loaded: AAPL

Apple Inc.
255
2550

✓ Executed example.vault
  1 asset
  1 market
  1 rule
```

---

# CLI

VaultScript currently provides three core commands.

## Run

Execute a `.vault` program:

```bash
vault run examples/stockvault.vault
```

---

## Check

Validate VaultScript syntax:

```bash
vault check examples/stockvault.vault
```

Example:

```text
✓ stockvault.vault is valid VaultScript
  2 assets
  2 markets
  2 rules
  1 variable
```

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

Example:

```text
✓ Compiled stockvault.vault
→ stockvault.vault.json
→ 2 assets
→ 2 markets
→ 2 rules
```

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

Asset properties support strings, numbers, booleans and symbolic identifiers.

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

The compiler represents this as structured data containing the pair, base asset, quote asset and configured properties.

---

## Rules

Rules describe requirements that can later be consumed by StockVault infrastructure.

```vault
rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

Rules are compiled into structured expression trees rather than being stored as raw text.

For example:

```vault
require balance >= amount
```

is represented conceptually as:

```text
BinaryExpression
├── left: balance
├── operator: >=
└── right: amount
```

This allows future StockVault systems to inspect, validate and execute rule definitions programmatically.

---

## Variables

```vault
let shares = 10
```

Variables can be referenced by runtime expressions:

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

VaultScript supports unary negation and boolean inversion.

```vault
print -100
```

Rules and future runtime contexts can also use:

```vault
!verified
```

---

## Grouping

Expressions can be grouped with parentheses:

```vault
print (10 + 5) * 2
```

---

## Comments

Single-line comments use:

```vault
// VaultScript comment
```

---

# File Extension

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

Generated `.vault.json` files are ignored by the repository by default.

---

# Compiler

VaultScript `0.3.0` uses a lexer, parser and Abstract Syntax Tree instead of directly interpreting source text.

The pipeline is:

```text
Source
  │
  ▼
Lexer
  │
  ▼
Tokens
  │
  ▼
Parser
  │
  ▼
AST
  ├─────────────┐
  ▼             ▼
Runtime      Compiler
                │
                ▼
        StockVault Manifest
```

This architecture is designed to make VaultScript extensible as the StockVault protocol evolves.

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

VaultScript produces a manifest similar to:

```json
{
  "vaultscript": "0.3.0",
  "assets": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "type": "equity",
      "ticker": "AAPL"
    }
  ],
  "markets": [
    {
      "pair": "AAPL/USD",
      "base": "AAPL",
      "quote": "USD",
      "oracle": "stockvault"
    }
  ],
  "rules": [
    {
      "name": "transfer",
      "requirements": [
        {
          "expression": {
            "type": "binary",
            "operator": "==",
            "left": {
              "type": "identifier",
              "name": "verified"
            },
            "right": {
              "type": "literal",
              "value": true
            }
          }
        }
      ]
    }
  ]
}
```

The actual generated manifest also contains a `generatedAt` timestamp.

---

# Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Link the CLI locally:

```bash
npm link
```

Then:

```bash
vault --version
```

```text
VaultScript 0.3.0
```

View CLI help:

```bash
vault --help
```

---

# Project Structure

```text
vaultscript/
├── examples/
│   ├── demo.vault
│   └── stockvault.vault
│
├── src/
│   ├── commands/
│   │   ├── check.ts
│   │   ├── compile.ts
│   │   └── run.ts
│   │
│   ├── compiler/
│   │   └── manifest.ts
│   │
│   ├── lexer/
│   │   ├── lexer.ts
│   │   └── token.ts
│   │
│   ├── parser/
│   │   ├── ast.ts
│   │   └── parser.ts
│   │
│   ├── runtime/
│   │   └── interpreter.ts
│   │
│   └── index.ts
│
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

---

# Roadmap

VaultScript is being developed toward richer StockVault-native primitives.

Potential future syntax includes:

```vault
asset AAPL {
    type: equity
    ticker: "AAPL"
}

market AAPL/USD {
    oracle: stockvault
}

rule transfer {
    require verified == true
    require amount > 0
    require balance >= amount
}
```

Future development areas include:

- Typed asset schemas
- Market definitions
- Oracle configuration
- Rule evaluation
- Runtime contexts
- Addresses
- Tokenization instructions
- Mint instructions
- Redemption instructions
- Transfer policies
- Contract bindings
- StockVault SDK integration
- Smart contract tooling
- Improved diagnostics
- Automated language tests
- Developer tooling
- Syntax highlighting

---

# Status

**VaultScript v0.3.0**

VaultScript is experimental software under active development.

Its syntax, compiler output and runtime behavior may change before a stable release.

VaultScript should not currently be used to represent legally binding ownership, execute financial transactions, or deploy production financial contracts.

---

# StockVault

VaultScript is being developed as part of the **StockVault ecosystem**.

StockVault is building infrastructure for bringing real-world assets and traditional financial assets on-chain.

---

# License

MIT
