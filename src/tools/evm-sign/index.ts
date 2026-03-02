import { getChainIdForNetwork } from "@cryptoapis-io/mcp-shared";
import { Transaction, Wallet } from "ethers";
import type { EvmSignFromDetailsInput, EvmSignToolInput, EvmSignUnsignedHexInput } from "./schema.js";
import { EvmSignToolSchema } from "./schema.js";
import type { McpSignerToolDef } from "../types.js";

function toBigInt(s: string): bigint {
    if (s.startsWith("0x") || s.startsWith("0X")) return BigInt(s);
    return BigInt(s);
}

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

export async function evmSignUnsignedHex(input: EvmSignUnsignedHexInput): Promise<{ signedTransactionHex: string }> {
    const hex = input.unsignedTransactionHex.startsWith("0x") ? input.unsignedTransactionHex : `0x${input.unsignedTransactionHex}`;
    const key = input.privateKey.startsWith("0x") ? input.privateKey : `0x${input.privateKey}`;
    const expectedChainId = BigInt(getChainIdForNetwork(input.blockchain, input.network));
    const unsignedTx = Transaction.from(hex);
    if (unsignedTx.chainId !== expectedChainId) {
        throw new Error(
            `Transaction chainId ${unsignedTx.chainId} does not match ${input.blockchain}/${input.network} (expected ${expectedChainId})`
        );
    }
    const wallet = new Wallet(key);
    const signedTx = await wallet.signTransaction(unsignedTx);
    const signedTransactionHex = signedTx.startsWith("0x") ? signedTx.slice(2) : signedTx;
    return { signedTransactionHex };
}

export async function evmSignFromDetails(input: EvmSignFromDetailsInput): Promise<{ signedTransactionHex: string }> {
    const key = input.privateKey.startsWith("0x") ? input.privateKey : `0x${input.privateKey}`;
    const wallet = new Wallet(key);
    const chainId = BigInt(getChainIdForNetwork(input.blockchain, input.network));
    const value = toBigInt(input.value);
    const to = input.toAddress && input.toAddress !== "" ? input.toAddress : undefined;
    const type = input.type ?? 0;
    const txLike: Parameters<typeof Transaction.from>[0] = {
        type,
        chainId,
        to,
        value,
        nonce: input.nonce,
        data: input.data ?? "0x",
        gasLimit: input.gasLimit != null ? toBigInt(input.gasLimit) : undefined,
    };
    if (type === 0) {
        if (input.gasPrice != null) txLike.gasPrice = toBigInt(input.gasPrice);
    } else {
        if (input.maxFeePerGas != null) txLike.maxFeePerGas = toBigInt(input.maxFeePerGas);
        if (input.maxPriorityFeePerGas != null) txLike.maxPriorityFeePerGas = toBigInt(input.maxPriorityFeePerGas);
    }
    const unsignedTx = Transaction.from(txLike);
    const signedTx = await wallet.signTransaction(unsignedTx);
    const signedTransactionHex = signedTx.startsWith("0x") ? signedTx.slice(2) : signedTx;
    return { signedTransactionHex };
}

export const evmSignTool: McpSignerToolDef<typeof EvmSignToolSchema> = {
    name: "evm_sign",
    description:
        "Sign an EVM transaction. Two actions: (1) sign-unsigned-hex: sign pre-built unsigned tx hex; (2) sign-from-details: build and sign from fields (blockchain, network, toAddress, value, gas, fee, etc.). Network names (e.g. ethereum+sepolia, polygon+mainnet) are mapped to chainId internally. Private key is always passed as parameter (never from env).",
    inputSchema: EvmSignToolSchema,
    handler: async (input: EvmSignToolInput) => {
        const result =
            input.action === "sign-unsigned-hex"
                ? await evmSignUnsignedHex(input)
                : await evmSignFromDetails(input);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
};

