import { bitcoinRPC } from "./index";
import { BitcoinRPCRes, GetBlockHashResult } from "./types";

export async function getblockhash(
  height: number
): Promise<BitcoinRPCRes<GetBlockHashResult>> {
  return await bitcoinRPC("getblockhash", [height]);
}
