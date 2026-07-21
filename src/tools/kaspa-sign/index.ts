// Kaspa signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto). This file is now ONLY the MCP tool wrapper; the sign function is imported and
// re-exported under the local name `runFromDetails` that src/index.ts aliases.
import { kaspaSignFromDetails } from "@cryptoapis-io/offline-signer/kaspa";
import type { KaspaSignToolInput } from "./schema.js";
import { KaspaSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { kaspaSignFromDetails as runFromDetails };

export const kaspaSignTool: McpSignerToolDef<typeof KaspaSignToolSchema> = {
    name: "kaspa_sign",
    description:
        "Sign a Kaspa (native KAS) transaction locally. Kaspa is a UTXO/blockDAG chain (schnorr signatures, mainnet only). Action sign-from-details: sign from a prepared transaction object (data.item from the Kaspa prepare-transaction API) — each input carries its prevout script + sompi. Returns the signed tx as JSON (the form the Kaspa broadcast service expects). Private keys (one per input) are passed as parameters (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: KaspaSignToolSchema,
    handler: async (input: KaspaSignToolInput) => {
        const result = kaspaSignFromDetails(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
