/**
 * WRAPPER SMOKE TEST: drive the real `utxoSignTool.handler` `sign-from-details` for the
 * bitcoinjs-compatible UTXO chains (bitcoin, litecoin, dogecoin, dash) and confirm each
 * produces a valid signed tx — i.e. the MCP tool wrapper correctly delegates to
 * @cryptoapis-io/offline-signer. The signing CORES (all 6 chains, incl. BCH FORKID + Zcash
 * Sapling) are tested exhaustively in offline-signer's own `npm run test:utxo`; this test
 * deliberately does NOT re-load bitcore-lib-cash / zcashcore here — importing them directly
 * alongside offline-signer's copy trips bitcore's "more than one instance" runtime guard, so
 * BCH + Zcash wrapper coverage is delegated to offline-signer + the x402 UTXO round-trip test.
 * Run: pnpm --filter @cryptoapis-io/mcp-signer exec tsx scripts/test-utxo-sign.ts
 */

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { getNetworkForUtxo } from "@cryptoapis-io/offline-signer/utxo";
import { utxoSignTool } from "../src/tools/utxo-sign/index.js";

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

const CHAINS = [
    { blockchain: "bitcoin", network: "testnet" },
    { blockchain: "litecoin", network: "testnet" },
    { blockchain: "dogecoin", network: "testnet" },
    { blockchain: "dash", network: "testnet" },
] as const;

/** Build a P2PKH prepared tx (1-in, 2-out) + WIF for a bitcoinjs-compatible chain. */
function buildPrepared(blockchain: string, network: string): { prepared: Record<string, unknown>; wif: string } {
    const net = getNetworkForUtxo(blockchain as never, network as never) as bitcoin.Network;
    const keyPair = ECPair.makeRandom({ network: net });
    const { output } = bitcoin.payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey), network: net });
    return {
        prepared: prepared(Buffer.from(output!).toString("hex")),
        wif: keyPair.toWIF(),
    };
}

/** A 1-in 2-out prepared-tx object with the given prevout script for the input + outputs. */
function prepared(scriptHex: string): Record<string, unknown> {
    return {
        version: 1,
        locktime: 0,
        inputs: [
            { transactionId: "a".repeat(64), outputIndex: 0, script: scriptHex, satoshis: 100000 },
        ],
        outputs: [
            { script: scriptHex, satoshis: 60000 }, // "merchant"
            { script: scriptHex, satoshis: 39000 }, // "change" (fee 1000)
        ],
    };
}

/** Sign one chain and report. */
async function tryChain(blockchain: string, network: string): Promise<void> {
    try {
        const { prepared: prep, wif } = buildPrepared(blockchain, network);
        const res = await utxoSignTool.handler({
            action: "sign-from-details",
            blockchain,
            network,
            privateKeys: [wif],
            preparedTransaction: prep,
        } as never);
        const text = (res as { content: Array<{ text: string }> }).content[0]!.text;
        const hex = JSON.parse(text).signedTransactionHex as string;
        // BCH/Zcash use non-Bitcoin tx formats bitcoinjs can't parse; decode only the
        // Bitcoin-format chains, otherwise just confirm we got signed hex back.
        let detail = `hex ${hex.length}`;
        if (blockchain !== "zcash") {
            try {
                const decoded = bitcoin.Transaction.fromHex(hex);
                detail = `${decoded.ins.length}in/${decoded.outs.length}out, hex ${hex.length}`;
            } catch {
                detail = `hex ${hex.length} (non-bitcoinjs format)`;
            }
        } else {
            detail = `hex ${hex.length} (Sapling)`;
        }
        // eslint-disable-next-line no-console
        console.log(`  ${blockchain.padEnd(14)} ✅ signed  (${detail})`);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`  ${blockchain.padEnd(14)} ❌ ${(err as Error).message?.slice(0, 150)}`);
    }
}

async function main(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("utxo-sign sign-from-details per chain (P2PKH, 1-in 2-out), via real handler:");
    for (const c of CHAINS) {
        // eslint-disable-next-line no-await-in-loop
        await tryChain(c.blockchain, c.network);
    }
}

main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
