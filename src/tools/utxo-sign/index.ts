// UTXO signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto — legacy raw-sign, BCH FORKID, Zcash Sapling all live there now). This file is ONLY
// the MCP tool wrapper; the two sign functions are imported and re-exported under the local
// names `runFromDetails`/`runUnsignedHex` that src/index.ts aliases.
import { utxoSignFromDetails, utxoSignUnsignedHex } from "@cryptoapis-io/offline-signer/utxo";
import type { UtxoSignToolInput } from "./schema.js";
import { UtxoSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { utxoSignFromDetails as runFromDetails, utxoSignUnsignedHex as runUnsignedHex };

export const utxoSignTool: McpSignerToolDef<typeof UtxoSignToolSchema> = {
    name: "utxo_sign",
    description:
        "Sign a UTXO transaction (bitcoin, bitcoin-cash, litecoin, dogecoin, dash, zcash). Two actions: (1) sign-from-details: sign from prepared transaction object (e.g. HD wallet prepare-transaction); (2) sign-unsigned-hex: sign from raw unsigned tx hex (provide inputs metadata: script, satoshis per input). Private key is passed as parameter (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: UtxoSignToolSchema,
    handler: async (input: UtxoSignToolInput) => {
        const result =
            input.action === "sign-from-details" ? utxoSignFromDetails(input) : utxoSignUnsignedHex(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
