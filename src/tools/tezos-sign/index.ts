// Tezos signing logic lives in @cryptoapis-io/offline-signer (single source of truth for the
// crypto). This file is ONLY the MCP tool wrapper.
import { tezosSignForgedOperation } from "@cryptoapis-io/offline-signer/tezos";
import type { TezosSignToolInput } from "./schema.js";
import { TezosSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { tezosSignForgedOperation };

export const tezosSignTool: McpSignerToolDef<typeof TezosSignToolSchema> = {
    name: "tezos_sign",
    description:
        "Sign a Tezos operation locally for tz1 (ed25519), tz2 (secp256k1) or tz3 (P-256) keys. Action sign-forged-operation: pass the `forgedOperation` hex from prepare_transactions_tezos and the secret key (edsk…/spsk…/p2sk…). Before signing, the operation is decoded and checked: only reveal/transaction ops from the key's own address are signed, and `expected` (destination, amount in mutez, maxFee) must match — always pass what the user asked for. Returns signedOperation (hex to broadcast with broadcast_signed_transaction), operationHash (o…), signature and the decoded contents. SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: TezosSignToolSchema,
    handler: async (input: TezosSignToolInput) => {
        const result = await tezosSignForgedOperation({
            secretKey: input.secretKey,
            forgedOperation: input.forgedOperation,
            expected: input.expected,
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
