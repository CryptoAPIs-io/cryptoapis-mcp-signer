// Tron signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto). This file is now ONLY the MCP tool wrapper; the sign functions + the structured
// signed-transaction type are imported + re-exported.
import { tronSignFromDetails, tronSignUnsignedHex } from "@cryptoapis-io/offline-signer/tron";
import type { TronSignedTransaction } from "@cryptoapis-io/offline-signer/tron";
import type { TronSignToolInput } from "./schema.js";
import { TronSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { tronSignFromDetails, tronSignUnsignedHex };
export type { TronSignedTransaction };

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
