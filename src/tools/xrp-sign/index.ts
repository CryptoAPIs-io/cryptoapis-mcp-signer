import type {
    XrpSignFromDetailsInput,
    XrpSignToolInput,
    XrpSignUnsignedHexInput,
} from "./schema.js";
import { XrpSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

async function xrpSignFromDetails(
    input: XrpSignFromDetailsInput
): Promise<{ signedTransactionHex: string; signedTransactionHash: string }> {
    const { Wallet } = await import("xrpl");
    const wallet = Wallet.fromSeed(input.secret);
    const signed = wallet.sign(input.transaction as Parameters<typeof wallet.sign>[0]);
    return {
        signedTransactionHex: signed.tx_blob,
        signedTransactionHash: signed.hash,
    };
}

async function xrpSignUnsignedHex(
    input: XrpSignUnsignedHexInput
): Promise<{ signedTransactionHex: string; signedTransactionHash: string }> {
    const xrpl = await import("xrpl");
    const hex = input.unsignedTransactionHex.startsWith("0x") ? input.unsignedTransactionHex.slice(2) : input.unsignedTransactionHex;
    const txObj = xrpl.decode(hex) as Parameters<InstanceType<typeof xrpl.Wallet>["sign"]>[0];
    const wallet = xrpl.Wallet.fromSeed(input.secret);
    const signed = wallet.sign(txObj);
    return {
        signedTransactionHex: signed.tx_blob,
        signedTransactionHash: signed.hash,
    };
}

export const xrpSignTool: McpSignerToolDef<typeof XrpSignToolSchema> = {
    name: "xrp_sign",
    description:
        "Sign an XRP (Ripple) transaction. Two actions: (1) sign-from-details: sign from transaction object (JSON); (2) sign-unsigned-hex: sign from raw unsigned tx hex (XRPL serialized). Returns signedTransactionHex and signedTransactionHash. Secret is passed as parameter (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: XrpSignToolSchema,
    handler: async (input: XrpSignToolInput) => {
        const result =
            input.action === "sign-from-details"
                ? await xrpSignFromDetails(input)
                : await xrpSignUnsignedHex(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};

