import { test } from "node:test";
import assert from "node:assert/strict";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";

import { utxoSignTool } from "../dist/tools/utxo-sign/index.js";
import { UtxoSignToolSchema } from "../dist/tools/utxo-sign/schema.js";

const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

// Zcash NU6.3 / NU7 consensus branch IDs and their mainnet/testnet activation heights
// (see @cryptoapis-io/offline-signer's zcash-network-upgrades.js).
const NU6_3_BRANCH_ID = 0x37a5165b;
const NU7_BRANCH_ID = 0x77190ad9;

/**
 * Build a P2PKH prepared tx (1-in, 2-out) + WIF.
 *
 * Zcash's real pubKeyHash/scriptHash prefixes don't fit ECPair's byte-sized network
 * validation, and a P2PKH script doesn't encode the network at all, so bitcoin's own
 * mainnet/testnet networks (whose WIF byte matches zcash's: 0x80/0xef) are used to
 * generate the key + script for zcash too.
 */
function buildPrepared(network) {
    const net = network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const keyPair = ECPair.makeRandom({ network: net });
    const { output } = bitcoin.payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey), network: net });
    const scriptHex = Buffer.from(output).toString("hex");
    return {
        prepared: {
            version: 1,
            locktime: 0,
            inputs: [{ transactionId: "a".repeat(64), outputIndex: 0, script: scriptHex, satoshis: 100000 }],
            outputs: [
                { script: scriptHex, satoshis: 60000 },
                { script: scriptHex, satoshis: 39000 },
            ],
        },
        wif: keyPair.toWIF(),
    };
}

function baseInput(overrides) {
    const { prepared, wif } = buildPrepared(overrides.network ?? "mainnet");
    return {
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: [wif],
        preparedTransaction: prepared,
        ...overrides,
    };
}

test("UtxoSignToolSchema keeps targetHeight and consensusBranchId on sign-from-details", () => {
    const parsed = UtxoSignToolSchema.parse({
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: ["L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ"],
        preparedTransaction: { inputs: [], outputs: [] },
        targetHeight: 3543405,
    });
    assert.strictEqual(parsed.targetHeight, 3543405);
    assert.strictEqual(parsed.consensusBranchId, undefined);

    const parsed2 = UtxoSignToolSchema.parse({
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: ["L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ"],
        preparedTransaction: { inputs: [], outputs: [] },
        consensusBranchId: NU7_BRANCH_ID,
    });
    assert.strictEqual(parsed2.consensusBranchId, NU7_BRANCH_ID);
    assert.strictEqual(parsed2.targetHeight, undefined);
});

test("UtxoSignToolSchema rejects a non-positive or non-integer targetHeight", () => {
    const base = {
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: ["L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ"],
        preparedTransaction: { inputs: [], outputs: [] },
    };
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, targetHeight: 0 }).success, false);
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, targetHeight: 1.5 }).success, false);
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, targetHeight: 3543405 }).success, true);
});

test("UtxoSignToolSchema rejects an out-of-range consensusBranchId", () => {
    const base = {
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: ["L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ"],
        preparedTransaction: { inputs: [], outputs: [] },
    };
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, consensusBranchId: -1 }).success, false);
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, consensusBranchId: 2 ** 32 }).success, false);
    assert.strictEqual(UtxoSignToolSchema.safeParse({ ...base, consensusBranchId: 0xffffffff }).success, true);
});

test("the utxo_sign description mentions targetHeight and consensusBranchId", () => {
    assert.ok(utxoSignTool.description.includes("targetHeight"));
    assert.ok(utxoSignTool.description.includes("consensusBranchId"));
});

test("zcash mainnet signs as v5 with the NU6.3 branch ID just below NU7 activation", async () => {
    const input = baseInput({ network: "mainnet", targetHeight: 3543404 });
    const res = await utxoSignTool.handler(input);
    const hex = JSON.parse(res.content[0].text).signedTransactionHex;
    assert.strictEqual(hex.slice(0, 8), "05000080");
    assert.strictEqual(hex.slice(16, 24), "5b16a537");
});

test("zcash mainnet signs with the NU7 branch ID at NU7 activation", async () => {
    const input = baseInput({ network: "mainnet", targetHeight: 3543405 });
    const res = await utxoSignTool.handler(input);
    const hex = JSON.parse(res.content[0].text).signedTransactionHex;
    assert.strictEqual(hex.slice(0, 8), "05000080");
    assert.strictEqual(hex.slice(16, 24), "d90a1977");
});

test("zcash testnet signs with the NU6.3 branch ID just below NU7 activation", async () => {
    const input = baseInput({ network: "testnet", targetHeight: 4465025 });
    const res = await utxoSignTool.handler(input);
    const hex = JSON.parse(res.content[0].text).signedTransactionHex;
    assert.strictEqual(hex.slice(16, 24), "5b16a537");
});

test("zcash testnet signs with the NU7 branch ID at NU7 activation", async () => {
    const input = baseInput({ network: "testnet", targetHeight: 4465026 });
    const res = await utxoSignTool.handler(input);
    const hex = JSON.parse(res.content[0].text).signedTransactionHex;
    assert.strictEqual(hex.slice(16, 24), "d90a1977");
});

test("an explicit consensusBranchId gives byte-identical output to the equivalent targetHeight", async () => {
    const { prepared, wif } = buildPrepared("mainnet");
    const common = {
        action: "sign-from-details",
        blockchain: "zcash",
        network: "mainnet",
        privateKeys: [wif],
        preparedTransaction: prepared,
    };

    const byHeight = await utxoSignTool.handler({ ...common, targetHeight: 3543405 });
    const byBranchId = await utxoSignTool.handler({ ...common, consensusBranchId: NU7_BRANCH_ID });

    const hexByHeight = JSON.parse(byHeight.content[0].text).signedTransactionHex;
    const hexByBranchId = JSON.parse(byBranchId.content[0].text).signedTransactionHex;
    assert.strictEqual(hexByBranchId, hexByHeight);
});

test("zcash with neither targetHeight nor consensusBranchId is rejected", async () => {
    const input = baseInput({ network: "mainnet" });
    await assert.rejects(() => utxoSignTool.handler(input));
});

test("zcash with both targetHeight and consensusBranchId is rejected", async () => {
    const input = baseInput({ network: "mainnet", targetHeight: 3543405, consensusBranchId: NU7_BRANCH_ID });
    await assert.rejects(() => utxoSignTool.handler(input));
});

test("bitcoin sign-from-details without targetHeight/consensusBranchId still signs", async () => {
    const net = bitcoin.networks.testnet;
    const keyPair = ECPair.makeRandom({ network: net });
    const { output } = bitcoin.payments.p2pkh({ pubkey: Buffer.from(keyPair.publicKey), network: net });
    const scriptHex = Buffer.from(output).toString("hex");
    const input = {
        action: "sign-from-details",
        blockchain: "bitcoin",
        network: "testnet",
        privateKeys: [keyPair.toWIF()],
        preparedTransaction: {
            version: 1,
            locktime: 0,
            inputs: [{ transactionId: "a".repeat(64), outputIndex: 0, script: scriptHex, satoshis: 100000 }],
            outputs: [{ script: scriptHex, satoshis: 99000 }],
        },
    };
    const res = await utxoSignTool.handler(input);
    const hex = JSON.parse(res.content[0].text).signedTransactionHex;
    const decoded = bitcoin.Transaction.fromHex(hex);
    assert.strictEqual(decoded.ins.length, 1);
    assert.strictEqual(decoded.outs.length, 1);
});
