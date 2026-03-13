import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { formatSupportedChains } from "@cryptoapis-io/mcp-shared";
import { supportedChains } from "../resources/supported-chains.js";

const CHAIN_TO_TOOL: Record<string, string> = {
    evm: "evm_sign",
    utxo: "utxo_sign",
    tron: "tron_sign",
    xrp: "xrp_sign",
};

export function registerPrompts(server: McpServer): void {
    server.registerPrompt(
        "sign-transaction",
        {
            description: "Sign a raw transaction locally without network transmission",
            argsSchema: {
                chain: z.enum(["evm", "utxo", "tron", "xrp"]).describe("Blockchain family to sign for"),
            },
        },
        (args): GetPromptResult => {
            const tool = CHAIN_TO_TOOL[args.chain] ?? `${args.chain}_sign`;

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Sign a transaction locally using the ${args.chain} signing tool (${tool}). This operation is performed entirely locally — private keys are never transmitted over the network. You will need the unsigned transaction data and the private key. SECURITY: Never store, log, or display private keys. After signing, the result can be broadcast using broadcast_signed_transaction.\n\n${formatSupportedChains(supportedChains)}`,
                        },
                    },
                ],
            };
        },
    );
}
