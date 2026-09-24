import { evmSignTool } from "./evm-sign/index.js";
import { tronSignTool } from "./tron-sign/index.js";
import { utxoSignTool } from "./utxo-sign/index.js";
import { xrpSignTool } from "./xrp-sign/index.js";
import { kaspaSignTool } from "./kaspa-sign/index.js";
import { svmSignTool } from "./svm-sign/index.js";
import { tezosSignTool } from "./tezos-sign/index.js";

export const tools = [evmSignTool, utxoSignTool, tronSignTool, xrpSignTool, kaspaSignTool, svmSignTool, tezosSignTool] as const;
