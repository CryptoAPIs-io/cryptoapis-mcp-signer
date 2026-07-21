// SVM signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto). This file is now ONLY the MCP tool wrapper; the sign function is imported + re-exported.
import { svmPartialSign } from "@cryptoapis-io/offline-signer/solana";
import type { SvmSignToolInput } from "./schema.js";
import { SvmSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { svmPartialSign };

export const svmSignTool: McpSignerToolDef<typeof SvmSignToolSchema> = {
    name: "svm_sign",
    description:
        "Partial-sign a Solana (SVM) x402 payment transaction locally (@solana/web3.js). One action: partial-sign — deserialize the base64 UNSIGNED TransferChecked tx from the x402 buyer /authorize (scheme svm-transaction), add ONLY the source-authority (buyer) signature, and re-serialize to base64. The feePayer slot stays UNSIGNED — the facilitator signs it at settle. Returns { transaction } (base64). Secret key is base58, passed as parameter (never from env). SECURITY: keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: SvmSignToolSchema,
    handler: async (input: SvmSignToolInput) => {
        const result = svmPartialSign(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
