import type * as z from "zod";

/** Tool definition for signer MCP (no HTTP client; pure crypto). */
export type McpSignerToolDef<TSchema extends z.ZodTypeAny> = {
    name: string;
    description: string;
    inputSchema: TSchema;
    handler: (input: z.infer<TSchema>) => Promise<{ content: { type: "text"; text: string }[] }>;
};
