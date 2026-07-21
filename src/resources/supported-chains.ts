import type { SupportedChainsResource } from "@cryptoapis-io/mcp-shared";

/**
 * Supported blockchains, networks, and actions for the signer package.
 * Signer supports local-only signing for EVM, UTXO, Tron, XRP, Kaspa, and Solana chains.
 */
export const supportedChains: SupportedChainsResource = {
    evm: {
        blockchains: [
            "ethereum",
            "ethereum-classic",
            "binance-smart-chain",
            "polygon",
            "avalanche",
            "arbitrum",
            "base",
            "optimism",
            "tron",
        ],
        networks: {
            ethereum: ["mainnet", "sepolia"],
            "ethereum-classic": ["mainnet", "mordor"],
            "binance-smart-chain": ["mainnet", "testnet"],
            polygon: ["mainnet", "amoy"],
            avalanche: ["mainnet", "fuji"],
            arbitrum: ["mainnet", "sepolia"],
            base: ["mainnet", "sepolia"],
            optimism: ["mainnet", "sepolia"],
            tron: ["mainnet", "nile"],
        },
        actions: {
            sign: [
                "ethereum",
                "ethereum-classic",
                "binance-smart-chain",
                "polygon",
                "avalanche",
                "arbitrum",
                "base",
                "optimism",
                "tron",
            ],
        },
    },
    utxo: {
        blockchains: [
            "bitcoin",
            "bitcoin-cash",
            "litecoin",
            "dogecoin",
            "dash",
            "zcash",
        ],
        networks: {
            bitcoin: ["mainnet", "testnet"],
            "bitcoin-cash": ["mainnet", "testnet"],
            litecoin: ["mainnet", "testnet"],
            dogecoin: ["mainnet", "testnet"],
            dash: ["mainnet", "testnet"],
            zcash: ["mainnet", "testnet"],
        },
        actions: {
            sign: ["bitcoin", "bitcoin-cash", "litecoin", "dogecoin", "dash", "zcash"],
        },
    },
    tron: {
        blockchains: ["tron"],
        networks: {
            tron: ["mainnet", "nile"],
        },
        actions: {
            sign: ["tron"],
        },
    },
    xrp: {
        blockchains: ["xrp"],
        networks: {
            xrp: ["mainnet", "testnet"],
        },
        actions: {
            sign: ["xrp"],
        },
    },
    kaspa: {
        blockchains: ["kaspa"],
        networks: {
            kaspa: ["mainnet"],
        },
        actions: {
            sign: ["kaspa"],
        },
    },
    svm: {
        blockchains: ["solana"],
        networks: {
            solana: ["mainnet", "devnet"],
        },
        actions: {
            sign: ["solana"],
        },
    },
};
