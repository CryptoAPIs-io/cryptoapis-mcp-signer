import { evmSignTool } from "./evm-sign/index.js";
import { tronSignTool } from "./tron-sign/index.js";
import { utxoSignTool } from "./utxo-sign/index.js";
import { xrpSignTool } from "./xrp-sign/index.js";

export const tools = [evmSignTool, utxoSignTool, tronSignTool, xrpSignTool] as const;
