# @cryptoapis-io/mcp-signer

MCP server for **local transaction signing** across EVM, UTXO, Tron, XRP, Kaspa, Solana and Tezos. No Crypto APIs HTTP calls — signing happens entirely on your machine. No API key required.

## Security

- **Stdio only** — no HTTP transport. The server does not listen on any port.
- **Private keys in tool input** — each tool receives `privateKey` / `privateKeys` / `secret` as parameters. Keys are never read from environment variables.
- **No network calls** — all signing is done locally using cryptographic libraries.

## Installation

```bash
npm install @cryptoapis-io/mcp-signer
```

Or install all Crypto APIs MCP servers: `npm install @cryptoapis-io/mcp`

## Usage

```bash
npx @cryptoapis-io/mcp-signer
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "cryptoapis-signer": {
      "command": "npx",
      "args": ["-y", "@cryptoapis-io/mcp-signer"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "cryptoapis-signer": {
      "command": "npx",
      "args": ["-y", "@cryptoapis-io/mcp-signer"]
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx @cryptoapis-io/mcp-signer
```

## Available Tools

### `evm_sign`

Sign an EVM transaction (Ethereum, Ethereum Classic, BSC, Polygon, Avalanche (C-Chain), Arbitrum, Base, Optimism, Tron).

| Action | Description |
|--------|-------------|
| `sign-from-details` | Sign from structured transaction fields (to, value, gasLimit, etc.) |
| `sign-unsigned-hex` | Sign a pre-built unsigned transaction hex |
| `sign-typed-data` | Sign an EIP-712 typed-data message (the x402 gasless path — e.g. the EIP-3009 `TransferWithAuthorization` from the x402 buyer `/authorize`). Returns `{ signature }`, not a tx. |

### `utxo_sign`

Sign a UTXO transaction (Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, Dash, Zcash).

| Action | Description |
|--------|-------------|
| `sign-from-details` | Sign from a prepared transaction object (inputs, outputs) |
| `sign-unsigned-hex` | Sign a raw unsigned transaction hex with input descriptors |

### `tron_sign`

Sign a Tron transaction using secp256k1 (no TronWeb dependency).

| Action | Description |
|--------|-------------|
| `sign-from-details` | Sign from a transaction object with `raw_data_hex` |
| `sign-unsigned-hex` | Sign a pre-built unsigned transaction hex |

### `xrp_sign`

Sign an XRP transaction.

| Action | Description |
|--------|-------------|
| `sign-from-details` | Sign from structured XRP transaction fields |
| `sign-unsigned-hex` | Sign a pre-built unsigned transaction hex |

### `kaspa_sign`

Sign a Kaspa transaction using schnorr (BIP340) via `kaspa-wasm`. Mainnet only.

| Action | Description |
|--------|-------------|
| `sign-from-details` | Sign a prepared Kaspa transaction (from the prepare-transaction API) |

### `svm_sign`

Partial-sign a Solana (SVM) x402 payment transaction — the buyer's source-authority signature only
(the facilitator's feePayer slot stays unsigned, signed at settle).

| Action | Description |
|--------|-------------|
| `partial-sign` | Deserialize the base64 unsigned TransferChecked tx from the x402 buyer `/authorize` (scheme `svm-transaction`), add the buyer signature, re-serialize to base64. Returns `{ transaction }`. |

### `tezos_sign`

Sign a Tezos operation for tz1 (ed25519), tz2 (secp256k1) or tz3 (P-256) keys (`edsk…` / `spsk…` / `p2sk…`).

| Action | Description |
|--------|-------------|
| `sign-forged-operation` | Sign the `forgedOperation` hex from `prepare_transactions_tezos`. The operation is decoded first: only reveal/transaction ops from the key's own address are signed, and the optional `expected` (`destination`, `amount` in mutez, `maxFee`) must match. Returns `{ signedOperation, operationHash, signature, … }`; broadcast `signedOperation`. |

Most tools return `signedTransactionHex` — ready to broadcast with `@cryptoapis-io/mcp-broadcast`. The
x402 paths return `{ signature }` (EVM typed-data) or `{ transaction }` (SVM) instead.

## Dependencies

| Package | Purpose |
|---------|---------|
| `ethers` | EVM transaction signing |
| `bitcoinjs-lib` + `ecpair` + `tiny-secp256k1` | UTXO transaction signing |
| `elliptic` | Tron transaction signing (secp256k1) |
| `xrpl` | XRP transaction signing |

## License

MIT
