// XRP signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto). This file is now ONLY the MCP tool wrapper; the sign functions are imported + re-exported.
import { xrpSignFromDetails, xrpSignUnsignedHex } from "@cryptoapis-io/offline-signer/xrp";
import type { XrpSignToolInput } from "./schema.js";
import { XrpSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { xrpSignFromDetails, xrpSignUnsignedHex };

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
