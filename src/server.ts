import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools/index.js";

const SERVER_INFO = {
    name: "mcp-signer",
    version: "0.1.0",
    title: "MCP Signer (EVM, UTXO, Tron, XRP)",
};

/**
 * Build and run the signer MCP server. Stdio-only (no HTTP) for security:
 * private keys are passed per request and no network server is exposed.
 */
export async function startSignerServer(): Promise<void> {
    const server = new McpServer(SERVER_INFO);

    for (const t of tools) {
        server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema }, t.handler);
    }

    await server.connect(new StdioServerTransport());
    console.error("mcp-signer running (stdio only, no HTTP)");
}
