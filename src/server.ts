import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpLogger } from "@cryptoapis-io/mcp-shared";
import { tools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const CRYPTOAPIS_SERVER_INFO = {
    name: "mcp-signer",
    version: "0.1.0",
    title: "MCP Signer (EVM, UTXO, Tron, XRP)",
    websiteUrl: "https://developers.cryptoapis.io",
    icons: [
        { src: "https://cryptoapis.io/cryptoapis/images/logo.svg", mimeType: "image/svg+xml", sizes: ["any"], theme: "light" as const },
        { src: "https://cryptoapis.io/cryptoapis/images/logo-black.svg", mimeType: "image/svg+xml", sizes: ["any"], theme: "dark" as const },
    ],
};

/** Extract the blockchain family from a tool name (e.g. "evm_sign" → "evm"). */
function chainFromToolName(name: string): string {
    return name.replace(/_sign$/, "");
}

/**
 * Build and run the signer MCP server. Stdio-only (no HTTP) for security:
 * private keys are passed per request and no network server is exposed.
 */
export async function startSignerServer(): Promise<void> {
    const server = new McpServer(CRYPTOAPIS_SERVER_INFO);
    const logger = new McpLogger((params) => server.sendLoggingMessage(params), CRYPTOAPIS_SERVER_INFO.name);

    for (const t of tools) {
        const chain = chainFromToolName(t.name);
        server.registerTool(
            t.name,
            { description: t.description, inputSchema: t.inputSchema },
            async (input: unknown) => {
                logger.logDebug({ tool: t.name, event: "tool_call", input });
                const result = await (t.handler as (input: unknown) => Promise<{ content: { type: "text"; text: string }[] }>)(input)
                    .catch((err: unknown) => {
                        logger.logError(err instanceof Error ? err.message : String(err), { tool: t.name, chain });
                        throw err;
                    });
                logger.logInfo({ tool: t.name, chain });
                return result;
            },
        );
    }

    registerResources(server);
    registerPrompts(server);

    await server.connect(new StdioServerTransport());
    logger.logInfo("mcp-signer running (stdio only, no HTTP)");
}
