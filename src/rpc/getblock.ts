import { bitcoinRPC } from "./index";

import {
  BitcoinRPCRes,
  GetBlockResult,
  GetRawTransactionResultVerbosity2,
} from "./types";

export async function getblock(
  hash: string
): Promise<BitcoinRPCRes<GetBlockResult<GetRawTransactionResultVerbosity2>>> {
  const verbosity = 3;
  return await bitcoinRPC("getblock", [hash, verbosity]);
}
