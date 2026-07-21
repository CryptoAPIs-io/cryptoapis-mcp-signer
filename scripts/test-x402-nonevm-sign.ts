/**
 * Harden the NON-EVM x402 signer paths: sign a real payment with each family's
 * mcp-signer tool and validate the result with that family's ACTUAL facilitator
 * validator — fully offline (the network-only fee-band check is skipped when no
 * prevout resolver is passed). Covers XRP (native + IOU) and UTXO. SVM is covered by
 * `test:x402-sign`; Kaspa needs kaspa-wasm address derivation (its own lib test does it).
 *
 * Run: pnpm run test:x402-nonevm-sign  (exits non-zero on any mismatch).
 */

import pkg from "xrpl";
import { xrpSignFromDetails } from "../src/tools/xrp-sign/index.js";
import { runFromDetails as utxoSignFromDetails } from "../src/tools/utxo-sign/index.js";

const { Wallet: XrplWallet } = pkg;

const X402_XRP_VAL = "../../../../cryptoapis-x402-xrp/src/txValidation.js";
const X402_UTXO_VAL = "../../../../cryptoapis-x402-utxo/src/txValidation.js";

/** XRP native + IOU: build an unsigned Payment, sign it, validate as the facilitator does. */
async function verifyXrp(): Promise<boolean> {
    // @ts-expect-error — JS sibling lib, no types.
    const { validatePayment } = await import(X402_XRP_VAL);
    const buyer = XrplWallet.generate();
    const merchant = XrplWallet.generate();

    const baseTx = {
        TransactionType: "Payment",
        Account: buyer.address,
        Destination: merchant.address,
        Fee: "12",
        Sequence: 1,
        LastLedgerSequence: 100_000,
        SigningPubKey: "",
    };

    // NATIVE: Amount is a drops string.
    const nativeTx = { ...baseTx, Amount: "1000000" };
    const nativeSigned = await xrpSignFromDetails({ action: "sign-from-details", secret: buyer.seed as string, transaction: nativeTx });
    const nativeRes = validatePayment({ txBlob: nativeSigned.signedTransactionHex, expected: { payTo: merchant.address, amount: "1000000", asset: "native" } });
    const nativeOk = nativeRes.valid === true && nativeRes.payer === buyer.address;
    console.log(`  XRP native: valid=${nativeRes.valid} payer==buyer=${nativeOk} ${nativeRes.reason ?? ""}`);

    // IOU: Amount is { currency, issuer, value }. RLUSD = 40-hex currency.
    const RLUSD = "524C555344000000000000000000000000000000";
    const issuer = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
    const iouTx = { ...baseTx, Amount: { currency: RLUSD, issuer, value: "25.5" } };
    const iouSigned = await xrpSignFromDetails({ action: "sign-from-details", secret: buyer.seed as string, transaction: iouTx });
    const iouRes = validatePayment({ txBlob: iouSigned.signedTransactionHex, expected: { payTo: merchant.address, amount: "25.5", asset: `${RLUSD}.${issuer}` } });
    const iouOk = iouRes.valid === true && iouRes.payer === buyer.address;
    console.log(`  XRP IOU:    valid=${iouRes.valid} payer==buyer=${iouOk} ${iouRes.reason ?? ""}`);

    return nativeOk && iouOk;
}

/** UTXO (bitcoin testnet): build a 1-in/1-out native tx to payTo, sign it, validate. */
async function verifyUtxo(): Promise<boolean> {
    // @ts-expect-error — JS sibling lib, no types.
    const { validateNativeTransfer } = await import(X402_UTXO_VAL);
    // Deterministic testnet WIF + its P2PKH address (merchant = payTo).
    const bitcoin = await import("bitcoinjs-lib");
    const ecc = await import("tiny-secp256k1");
    const { ECPairFactory } = await import("ecpair");
    const ECPair = ECPairFactory(ecc);
    const net = bitcoin.networks.testnet;

    const buyerPair = ECPair.makeRandom({ network: net });
    const merchantPair = ECPair.makeRandom({ network: net });
    // bitcoinjs v7 publicKey is a Uint8Array — wrap in Buffer for payments.p2pkh.
    const buyerP2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(buyerPair.publicKey), network: net });
    const merchantP2pkh = bitcoin.payments.p2pkh({ pubkey: Buffer.from(merchantPair.publicKey), network: net });
    const payTo = merchantP2pkh.address as string;
    const amount = 60000;

    // Sign the PREPARED-TX form the buyer actually receives (legacy P2PKH → the
    // raw-Transaction path handles it; sign-unsigned-hex's Psbt path can't). One
    // input (buyer's prevout) → one output to the merchant.
    const signed = utxoSignFromDetails({
        action: "sign-from-details",
        blockchain: "bitcoin",
        network: "testnet",
        privateKeys: [buyerPair.toWIF()],
        preparedTransaction: {
            // Buffer.from(...) then hex — a v7 Uint8Array's .toString("hex") is NOT hex.
            inputs: [{ transactionId: Buffer.alloc(32, 7).toString("hex"), outputIndex: 0, script: Buffer.from(buyerP2pkh.output!).toString("hex"), satoshis: 100000 }],
            outputs: [{ address: payTo, satoshis: amount }],
        },
    });

    const res = await validateNativeTransfer({
        rawTxHex: signed.signedTransactionHex,
        expected: { bitcoinNetwork: "testnet", payTo, amount: String(amount) },
    });
    const ok = res.valid === true;
    console.log(`  UTXO:       valid=${res.valid} ${res.reason ?? ""}`);
    return ok;
}

async function main() {
    console.log("x402 non-EVM signer round-trips (signer output validated by the facilitator):");
    const xrpOk = await verifyXrp();
    const utxoOk = await verifyUtxo();
    if (xrpOk && utxoOk) { console.log("✅ XRP + UTXO x402 signing paths round-trip against the facilitator"); process.exit(0); }
    console.error("❌ a non-EVM signing path failed"); process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
