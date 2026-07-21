/**
 * Verify the x402 signing paths added to mcp-signer round-trip against the ACTUAL
 * x402 facilitator verification logic:
 *   1. EVM  — evm_sign `sign-typed-data` (EIP-712 EIP-3009 TransferWithAuthorization)
 *             → recovered by @cryptoapis/x402-evm eip3009.verifyAuthorization (viem).
 *   2. SVM  — svm_sign `partial-sign` (base64 TransferChecked partial sign)
 *             → accepted by @cryptoapis/x402-svm validateTokenTransfer.
 *
 * Self-contained (generates its own keys, no network). Run:
 *   pnpm run test:x402-sign
 * Exits non-zero if either round-trip fails.
 *
 * The x402 libs are resolved relative to this monorepo's sibling repos; adjust
 * X402_EVM_DIR / X402_SVM_DIR if your checkout layout differs.
 */

import { Wallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { evmSignTypedData } from "../src/tools/evm-sign/index.js";
import { svmPartialSign } from "../src/tools/svm-sign/index.js";

// Sibling x402 lib repos (same parent dir as cryptoapis-mcp).
const X402_EVM = "../../../../cryptoapis-x402-evm/src/eip3009.js";
const X402_SVM_TC = "../../../../cryptoapis-x402-svm/src/transferChecked.js";
const X402_SVM_VAL = "../../../../cryptoapis-x402-svm/src/txValidation.js";

async function verifyEvm(): Promise<boolean> {
    // @ts-expect-error — JS sibling lib, no types.
    const { verifyAuthorization, TRANSFER_WITH_AUTHORIZATION_TYPES } = await import(X402_EVM);
    const wallet = Wallet.createRandom();
    const from = wallet.address;
    const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 8453,
        verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    };
    const message = {
        from,
        to: "0x2222222222222222222222222222222222222222",
        value: "1000000",
        validAfter: "0",
        validBefore: "9999999999",
        nonce: "0x" + "11".repeat(32),
    };
    const { signature } = await evmSignTypedData({
        action: "sign-typed-data",
        privateKey: wallet.privateKey,
        domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message,
    });
    const res = await verifyAuthorization({ authorization: message, signature, domain });
    const ok = res.valid === true && res.recovered.toLowerCase() === from.toLowerCase();
    console.log(`  EVM eip712: valid=${res.valid} recovered==from=${ok}`);
    return ok;
}

async function verifySvm(): Promise<boolean> {
    // @ts-expect-error — JS sibling libs, no types.
    const { buildTokenTransfer, serializeUnsigned } = await import(X402_SVM_TC);
    // @ts-expect-error — JS sibling lib, no types.
    const { validateTokenTransfer } = await import(X402_SVM_VAL);
    const buyer = Keypair.generate();
    const merchant = Keypair.generate();
    const feePayer = Keypair.generate();
    const mint = Keypair.generate().publicKey;
    const AMOUNT = "1000000";
    const DECIMALS = 6;

    const tx = buildTokenTransfer({
        payer: buyer.publicKey,
        payTo: merchant.publicKey,
        mint,
        amount: AMOUNT,
        decimals: DECIMALS,
        feePayer: feePayer.publicKey,
        recentBlockhash: "GfVcyD4kkTrj4bKc7WA9sZCin9JDbdT4Za5Rm3zErc32",
    });
    const { transaction: signedB64 } = svmPartialSign({
        action: "partial-sign",
        secretKeyBase58: bs58.encode(buyer.secretKey),
        transaction: serializeUnsigned(tx),
    });
    const res = validateTokenTransfer({
        base64Tx: signedB64,
        expected: {
            mint: mint.toBase58(),
            payTo: merchant.publicKey.toBase58(),
            amount: AMOUNT,
            decimals: DECIMALS,
            feePayer: feePayer.publicKey.toBase58(),
            tokenProgram: "spl-token",
        },
    });
    const ok = res.valid === true && res.payer === buyer.publicKey.toBase58();
    console.log(`  SVM partial-sign: valid=${res.valid} payer==buyer=${ok}`);
    return ok;
}

async function main() {
    console.log("x402 signer round-trips (signer output verified against the facilitator):");
    const evmOk = await verifyEvm();
    const svmOk = await verifySvm();
    if (evmOk && svmOk) {
        console.log("✅ both x402 signing paths round-trip against the facilitator");
        process.exit(0);
    }
    console.error("❌ an x402 signing path failed to verify");
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
