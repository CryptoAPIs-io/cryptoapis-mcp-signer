/**
 * Build an unsigned ETH Sepolia (legacy) transaction and test signing via evmSign.
 *
 * Usage:
 *   SEPOLIA_PRIVATE_KEY=0x... pnpm run test:sepolia-sign
 *   Or with a test key (no real funds): pnpm run test:sepolia-sign
 *
 * Uses a dummy to address and 0 value; replace with real recipient/amount for real txs.
 */

import { Transaction } from "ethers";
import { evmSign } from "../src/tools/evm-sign/index.js";

const SEPOLIA_CHAIN_ID = 11155111n;
const TO_ADDRESS = "0x0000000000000000000000000000000000000002";
const GAS_LIMIT = 21000n;
const GAS_PRICE_WEI = 25n * 10n ** 9n; // 25 gwei

function buildUnsignedSepoliaTx(): string {
    const tx = Transaction.from({
        type: 0,
        nonce: 0,
        to: TO_ADDRESS,
        value: 0n,
        gasLimit: GAS_LIMIT,
        gasPrice: GAS_PRICE_WEI,
        chainId: SEPOLIA_CHAIN_ID,
    });
    const hex = tx.unsignedSerialized;
    return hex.startsWith("0x") ? hex.slice(2) : hex;
}

async function main() {
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY ?? process.env.TEST_PRIVATE_KEY;
    if (!privateKey) {
        console.error("Set SEPOLIA_PRIVATE_KEY or TEST_PRIVATE_KEY to run signing test.");
        process.exit(1);
    }

    const unsignedHex = buildUnsignedSepoliaTx();
    console.log("Unsigned tx hex (Sepolia legacy, no 0x):", unsignedHex.slice(0, 80) + "...");

    const result = await evmSign({
        privateKey,
        blockchain: "ethereum",
        network: "sepolia",
        unsignedTransactionHex: unsignedHex,
    });
    console.log("Signed tx hex (no 0x):", result.signedTransactionHex.slice(0, 80) + "...");
    console.log("Signing test OK.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

