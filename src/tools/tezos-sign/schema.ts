import * as z from "zod";

/** Tezos secret key (edsk… / spsk… / p2sk…). Never use env – pass as parameter only. */
const SecretKey = z
    .string()
    .min(1)
    .describe("Tezos secret key: edsk… (tz1, ed25519), spsk… (tz2, secp256k1) or p2sk… (tz3, P-256). Unencrypted only.");

export const TezosSignForgedOperationSchema = z.object({
    action: z.literal("sign-forged-operation").describe("Verify and sign a forged Tezos operation"),
    secretKey: SecretKey,
    forgedOperation: z
        .string()
        .regex(/^(0x)?[0-9a-fA-F]+$/)
        .describe("Forged unsigned operation hex: the `forgedOperation` returned by prepare_transactions_tezos"),
    expected: z
        .object({
            destination: z.string().optional().describe("Recipient (tz…/KT1…) you asked to send to; for FA1.2/FA2 transfers, the token contract"),
            amount: z.string().regex(/^\d+$/).optional().describe("Amount you asked for, in mutez (native XTZ transfers)"),
            maxFee: z.string().regex(/^\d+$/).optional().describe("Highest total fee you accept, in mutez"),
        })
        .strict()
        .optional()
        .describe("Values the operation MUST match or signing is refused. Pass what you requested, not values read back from the prepare response."),
});

export const TezosSignToolSchema = z.discriminatedUnion("action", [TezosSignForgedOperationSchema]);

export type TezosSignToolInput = z.infer<typeof TezosSignToolSchema>;
