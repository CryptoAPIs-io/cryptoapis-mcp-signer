import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { getNetworkForUtxo } from "./utxo-networks.js";
import type {
    UtxoSignFromDetailsInput,
    UtxoSignToolInput,
    UtxoSignUnsignedHexInput,
} from "./schema.js";
import { UtxoSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

const ECPair = ECPairFactory(ecc);

type PreparedInput = {
    address?: string;
    outputIndex?: number;
    satoshis?: number;
    script?: string;
    transactionId?: string;
};
type PreparedOutput = { address?: string; satoshis?: number; script?: string };
type PreparedItem = {
    inputs?: PreparedInput[];
    outputs?: PreparedOutput[];
    version?: number;
    locktime?: number;
};

function reverseBuffer(buf: Buffer): Buffer {
    return Buffer.from(buf.reverse());
}

function runFromDetails(input: UtxoSignFromDetailsInput): { signedTransactionHex: string } {
    const item = input.preparedTransaction as PreparedItem;
    const inputs = item.inputs ?? [];
    const outputs = item.outputs ?? [];
    if (inputs.length !== input.privateKeys.length) {
        throw new Error(`Expected ${inputs.length} private keys for ${inputs.length} inputs, got ${input.privateKeys.length}`);
    }

    const network = getNetworkForUtxo(input.blockchain, input.network);
    const psbt = new bitcoin.Psbt({ network });

    for (const inp of inputs) {
        const txId = inp.transactionId ?? "";
        const hash = txId.length === 64 ? reverseBuffer(Buffer.from(txId, "hex")) : Buffer.from(txId, "hex").reverse();
        const scriptHex = inp.script ?? "";
        const script = Buffer.from(scriptHex.startsWith("0x") ? scriptHex.slice(2) : scriptHex, "hex");
        const value = inp.satoshis ?? 0;
        psbt.addInput({
            hash,
            index: inp.outputIndex ?? 0,
            witnessUtxo: { script, value: BigInt(value) },
        });
    }

    for (const out of outputs) {
        const value = BigInt(out.satoshis ?? 0);
        const scriptHex = out.script ?? "";
        if (scriptHex) {
            const script = Buffer.from(scriptHex.startsWith("0x") ? scriptHex.slice(2) : scriptHex, "hex");
            psbt.addOutput({ script, value });
        } else if (out.address) {
            psbt.addOutput({ address: out.address, value });
        } else {
            throw new Error("Output must have address or script");
        }
    }

    if (item.locktime != null) psbt.setLocktime(item.locktime);
    if (item.version != null) psbt.setVersion(item.version);

    for (let i = 0; i < input.privateKeys.length; i++) {
        const wif = input.privateKeys[i];
        if (!wif) throw new Error(`Missing private key at index ${i}`);
        const keyPair = ECPair.fromWIF(wif, network);
        psbt.signInput(i, keyPair);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    return { signedTransactionHex: tx.toHex() };
}

function runUnsignedHex(input: UtxoSignUnsignedHexInput): { signedTransactionHex: string } {
    const hex = input.unsignedTransactionHex.startsWith("0x") ? input.unsignedTransactionHex.slice(2) : input.unsignedTransactionHex;
    const tx = bitcoin.Transaction.fromHex(hex);
    if (tx.ins.length !== input.privateKeys.length || tx.ins.length !== input.inputs.length) {
        throw new Error(
            `Input count mismatch: tx has ${tx.ins.length} inputs, got ${input.privateKeys.length} keys and ${input.inputs.length} input descriptors`
        );
    }

    const network = getNetworkForUtxo(input.blockchain, input.network);
    const psbt = new bitcoin.Psbt({ network });

    for (let i = 0; i < tx.ins.length; i++) {
        const inp = tx.ins[i];
        const meta = input.inputs[i];
        if (!inp || !meta) throw new Error(`Missing input or descriptor at index ${i}`);
        const script = Buffer.from(meta.script.startsWith("0x") ? meta.script.slice(2) : meta.script, "hex");
        psbt.addInput({
            hash: Buffer.from(inp.hash),
            index: inp.index,
            witnessUtxo: { script, value: BigInt(meta.satoshis) },
        });
    }

    for (const out of tx.outs) {
        psbt.addOutput({ script: Buffer.from(out.script), value: out.value });
    }

    psbt.setVersion(tx.version);
    psbt.setLocktime(tx.locktime);

    for (let i = 0; i < input.privateKeys.length; i++) {
        const wif = input.privateKeys[i];
        if (!wif) throw new Error(`Missing private key at index ${i}`);
        const keyPair = ECPair.fromWIF(wif, network);
        psbt.signInput(i, keyPair);
    }

    psbt.finalizeAllInputs();
    const signedTx = psbt.extractTransaction();
    return { signedTransactionHex: signedTx.toHex() };
}

export const utxoSignTool: McpSignerToolDef<typeof UtxoSignToolSchema> = {
    name: "utxo_sign",
    description:
        "Sign a UTXO transaction (bitcoin, bitcoin-cash, litecoin, dogecoin, dash, zcash). Two actions: (1) sign-from-details: sign from prepared transaction object (e.g. HD wallet prepare-transaction); (2) sign-unsigned-hex: sign from raw unsigned tx hex (provide inputs metadata: script, satoshis per input). Private key is passed as parameter (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: UtxoSignToolSchema,
    handler: async (input: UtxoSignToolInput) => {
        const result =
            input.action === "sign-from-details" ? runFromDetails(input) : runUnsignedHex(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
