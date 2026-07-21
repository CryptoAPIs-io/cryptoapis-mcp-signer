// EVM signing logic lives in @cryptoapis-io/offline-signer (the standalone, non-AI signing
// library). This file is now ONLY the MCP tool wrapper — the sign functions are imported from
// the shared package so there is a single source of truth for the crypto (no duplication).
// Re-exported here so the test scripts + any consumers keep the same import surface.
import {
    evmSignUnsignedHex,
    evmSignFromDetails,
    evmSignTypedData,
} from "@cryptoapis-io/offline-signer/evm";
import type { EvmSignToolInput, EvmSignUnsignedHexInput } from "./schema.js";
import { EvmSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

export { evmSignUnsignedHex, evmSignFromDetails, evmSignTypedData };

/** Sign from unsigned tx hex. Exported for scripts; tool uses action "sign-unsigned-hex". */
export async function evmSign(input: {
    privateKey: string;
    unsignedTransactionHex: string;
    blockchain: EvmSignUnsignedHexInput["blockchain"];
    network: EvmSignUnsignedHexInput["network"];
}): Promise<{ signedTransactionHex: string }> {
    return evmSignUnsignedHex({
        action: "sign-unsigned-hex",
        privateKey: input.privateKey,
        blockchain: input.blockchain,
        network: input.network,
        unsignedTransactionHex: input.unsignedTransactionHex,
    });
}

export const evmSignTool: McpSignerToolDef<typeof EvmSignToolSchema> = {
    name: "evm_sign",
    description:
        "Sign an EVM transaction or EIP-712 typed-data message. Three actions: (1) sign-unsigned-hex: sign pre-built unsigned tx hex; (2) sign-from-details: build and sign from fields (blockchain, network, toAddress, value, gas, fee, etc.); (3) sign-typed-data: sign an EIP-712 typed-data message — the x402 GASLESS path, e.g. the EIP-3009 TransferWithAuthorization returned by the x402 buyer /authorize (scheme eip712). For (3) pass domain/types/primaryType/message verbatim; it returns a 65-byte signature (no tx built). Network names (e.g. ethereum+sepolia, polygon+mainnet) are mapped to chainId internally. Private key is always passed as parameter (never from env). SECURITY: Private keys may be logged by MCP clients or stored in conversation history — use only in trusted local environments.",
    inputSchema: EvmSignToolSchema,
    handler: async (input: EvmSignToolInput) => {
        let result: unknown;
        if (input.action === "sign-unsigned-hex") {
            result = await evmSignUnsignedHex(input);
        } else if (input.action === "sign-typed-data") {
            result = await evmSignTypedData(input);
        } else {
            result = await evmSignFromDetails(input);
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};
