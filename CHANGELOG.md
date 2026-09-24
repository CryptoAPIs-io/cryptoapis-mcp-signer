# @cryptoapis-io/mcp-signer

## 0.5.0

### Minor Changes

- 1b45318: New `tezos_sign` tool: sign a Tezos operation (the `forgedOperation` from `prepare_transactions_tezos`) for tz1 (ed25519), tz2 (secp256k1) and tz3 (P-256) keys. The operation is decoded before signing and refused unless it contains only reveal/transaction ops from the key's own address and matches the optional `expected` destination, amount and fee cap. Built on `@cryptoapis-io/offline-signer` 0.2.0.

## 0.4.1

### Patch Changes

- Updated dependencies [3167621]
  - @cryptoapis-io/mcp-shared@0.4.0

## 0.4.0

### Minor Changes

- x402 signing paths + UTXO all-6-chains + single-source signing cores.

  - New `kaspa_sign` tool (schnorr via kaspa-wasm, mainnet).
  - `evm_sign` adds EIP-712 typed-data signing (the x402 gasless / EIP-3009 TransferWithAuthorization path).
  - `svm_sign` partial-signs the x402 SVM transaction (buyer signs, facilitator sponsors the fee).
  - `xrp_sign` covers native XRP + IOU stablecoins; `tron_sign` returns the structured TronWeb signed-tx.
  - `utxo_sign` works across all six UTXO chains (legacy raw-sign BTC/LTC/DOGE/DASH, BCH FORKID, Zcash Sapling).
  - The signing cores now live in `@cryptoapis-io/offline-signer` (imported per-chain); mcp-signer keeps only
    the MCP tool wrappers, eliminating the duplicated crypto the two repos previously kept in sync by hand.

## 0.3.0

### Minor Changes

- Add MCP logging, resources, and prompts across all packages. Add debug-level tool call logging, replace console.error with McpLogger, remove .refine() from schemas for MCP client compatibility, and fix supply-chain vulnerabilities.

### Patch Changes

- Updated dependencies
  - @cryptoapis-io/mcp-shared@0.3.0

## 0.2.4

### Patch Changes

- Fix supply-chain vulnerabilities: update @modelcontextprotocol/sdk to ^1.27.1, express to ^4.22.1, add security warning to signer tool descriptions
- Updated dependencies
  - @cryptoapis-io/mcp-shared@0.2.3

## 0.2.3

### Patch Changes

- Shorten package descriptions to meet MCP Registry 100-char limit

## 0.2.2

### Patch Changes

- Add MCP Registry metadata (mcpName, server.json)
- Updated dependencies
  - @cryptoapis-io/mcp-shared@0.2.2

## 0.2.1

### Patch Changes

- Rename Hosted MCP Server to Remote MCP Server in documentation
- Updated dependencies
  - @cryptoapis-io/mcp-shared@0.2.1

## 0.2.0

### Minor Changes

- Add User-Agent and x-source headers to identify MCP traffic

### Patch Changes

- Updated dependencies
  - @cryptoapis-io/mcp-shared@0.2.0
