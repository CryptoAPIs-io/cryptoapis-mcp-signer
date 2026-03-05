import { createHash } from "crypto";
import { createRequire } from "module";
import type {
    TronSignFromDetailsInput,
    TronSignToolInput,
    TronSignUnsignedHexInput,
} from "./schema.js";
import { TronSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";
import { encodeSignedTransaction, parseTransactionRawDataHex } from "./tron-protobuf.js";

const require = createRequire(import.meta.url);

/** Sign Tron rawDataHex with private key (secp256k1). Node crypto + elliptic (cryptoapis blockchain-signer-lib style). Returns 65-byte hex: r(32) + s(32) + recovery(1). */
function signTronRawDataHex(rawDataHex: string, privateKeyHex: string): string {
    const EC = require("elliptic").ec;
    const ec = new EC("secp256k1");
    const keyHex = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
    const hash = createHash("sha256").update(Buffer.from(rawDataHex, "hex")).digest("hex");
    const key = ec.keyFromPrivate(keyHex, "hex");
    const sig = key.sign(hash, { canonical: true });
    const rHex = sig.r.toString("hex").length % 2 ? "0" + sig.r.toString("hex") : sig.r.toString("hex");
    const sHex = sig.s.toString("hex").length % 2 ? "0" + sig.s.toString("hex") : sig.s.toString("hex");
    const recoveryParam = sig.recoveryParam ?? 0;
    return rHex.padStart(64, "0") + sHex.padStart(64, "0") + recoveryParam.toString(16);
}

function tronSignFromDetails(input: TronSignFromDetailsInput): { signedTransactionHex: string } {
    const key = input.privateKey.startsWith("0x") ? input.privateKey.slice(2) : input.privateKey;
    const tx = input.transaction as { raw_data_hex?: string; raw_data?: unknown; txID?: string; visible?: boolean };
    const rawDataHex = tx.raw_data_hex ?? (tx as { rawDataHex?: string }).rawDataHex;
    if (!rawDataHex) {
        throw new Error("Transaction must include raw_data_hex (or rawDataHex) for signing");
    }
    const rawHex = rawDataHex.startsWith("0x") ? rawDataHex.slice(2) : rawDataHex;
    const signature = signTronRawDataHex(rawHex, key);
    const signedTransactionHex = encodeSignedTransaction(rawHex, [signature]);
    return { signedTransactionHex };
}

function tronSignUnsignedHex(input: TronSignUnsignedHexInput): { signedTransactionHex: string } {
    const hex = input.unsignedTransactionHex.startsWith("0x") ? input.unsignedTransactionHex.slice(2) : input.unsignedTransactionHex;
    const key = input.privateKey.startsWith("0x") ? input.privateKey.slice(2) : input.privateKey;
    const rawDataBytes = parseTransactionRawDataHex(hex);
    const txIDHex = createHash("sha256").update(rawDataBytes).digest("hex");
    const EC = require("elliptic").ec;
    const ec = new EC("secp256k1");
    const keyObj = ec.keyFromPrivate(key.replace(/^0x/, ""), "hex");
    const sig = keyObj.sign(txIDHex, { canonical: true });
    const rHex = sig.r.toString("hex").length % 2 ? "0" + sig.r.toString("hex") : sig.r.toString("hex");
    const sHex = sig.s.toString("hex").length % 2 ? "0" + sig.s.toString("hex") : sig.s.toString("hex");
    const recoveryParam = sig.recoveryParam ?? 0;
    const sigHex = rHex.padStart(64, "0") + sHex.padStart(64, "0") + recoveryParam.toString(16);
    const rawDataHex = Buffer.from(rawDataBytes).toString("hex");
    const signedTransactionHex = encodeSignedTransaction(rawDataHex, [sigHex]);
    return { signedTransactionHex };
}

export const tronSignTool: McpSignerToolDef<typeof TronSignToolSchema> = {
    name: "tron_sign",
    description:
        "Sign a Tron transaction (no TronWeb): Node crypto (sha256) + elliptic (secp256k1) + minimal protobuf encode/decode. Two actions: (1) sign-from-details: sign from transaction object (must include raw_data_hex); (2) sign-unsigned-hex: sign from raw unsigned tx hex. Returns signedTransactionHex. Private key is passed as parameter (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: TronSignToolSchema,
    handler: async (input: TronSignToolInput) => {
        const result =
            input.action === "sign-from-details"
                ? tronSignFromDetails(input)
                : tronSignUnsignedHex(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};

