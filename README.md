# VaultScript

**A lightweight language for defining tokenized real-world assets on StockVault.**

VaultScript is an experimental domain-specific language (DSL) designed for the StockVault ecosystem.

It provides a simple, human-readable way to describe assets, validate asset definitions, execute VaultScript programs, and compile `.vault` files into structured StockVault manifests.

> VaultScript is currently under active development.

---

## Example

Create a file called `apple.vault`:

```vault
asset AAPL {
    name: "Apple Inc."
    type: "equity"
    ticker: "AAPL"
    price: 255
    supply: 1000000
    tokenized: true
}

print AAPL.name
print AAPL.price
```

Run it:

```bash
vault run apple.vault
```

Output:

```text
VaultScript
────────────────────────────
✓ Asset loaded: AAPL

Apple Inc.
255

✓ Executed apple.vault
```

---

## CLI

VaultScript currently supports three core commands.

### Run

Execute a VaultScript program:

```bash
vault run examples/demo.vault
```

### Check

Validate a `.vault` file:

```bash
vault check examples/demo.vault
```

Example:

```text
✓ demo.vault is valid VaultScript
  2 assets
  1 variable
```

### Compile

Compile VaultScript into a StockVault manifest:

```bash
vault compile examples/demo.vault
```

This generates:

```text
demo.vault.json
```

Example manifest:

```json
{
  "vaultscript": "0.2.0",
  "assets": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "type": "equity",
      "ticker": "AAPL",
      "price": 255,
      "supply": 1000000,
      "tokenized": true
    }
  ]
}
```

---

## Language

### Variables

```vault
let shares = 10
```

### Assets

```vault
asset TSLA {
    name: "Tesla Inc."
    type: "equity"
    ticker: "TSLA"
    price: 450
    supply: 500000
    tokenized: true
}
```

### Asset properties

```vault
print TSLA.name
print TSLA.price
```

### Arithmetic

```vault
let shares = 10

print shares * TSLA.price
```

### Comments

```vault
// This is a VaultScript comment
```

---

## File extension

VaultScript programs use:

```text
.vault
```

Example:

```text
portfolio.vault
apple.vault
tokenized-assets.vault
```

---

## Development

Clone the repository and install dependencies:

```bash
npm install
```

Build VaultScript:

```bash
npm run build
```

Link the CLI locally:

```bash
npm link
```

You can then use:

```bash
vault --version
vault --help
```

---

## Roadmap

VaultScript is being developed toward richer StockVault-native primitives including:

```vault
market AAPL/USD {
    oracle: stockvault
}

rule transfer {
    require verified
    require amount > 0
}

rule redeem {
    require balance >= amount
}
```

Planned areas include:

- Asset definitions
- Markets
- Oracle configuration
- Validation rules
- Tokenization manifests
- Mint and redemption instructions
- StockVault SDK integration
- Smart contract tooling

---

## Status

**VaultScript v0.2.0**

VaultScript is experimental software and its syntax may change before a stable release.

It should not currently be used to represent legally binding ownership, execute financial transactions, or deploy production financial contracts.

---

## StockVault

VaultScript is developed as part of the **StockVault** ecosystem.

StockVault is building infrastructure for bringing real-world assets on-chain.

---

## License

MIT
