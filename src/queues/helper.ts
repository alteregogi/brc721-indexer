import { getblock } from "../rpc/getblock";
import { getblockhash } from "../rpc/getblockhash";
import { GetRawTransactionResultVerbosity2 } from "../rpc/types";
import { GetBlockResult, GetBlockHashResult } from "../rpc/types";

export const getBlock = async (
  hash: string,
  fallbackHeight?: number
): Promise<GetBlockResult<GetRawTransactionResultVerbosity2>> => {
  const BLOCK_NOT_FOUND_CODE = -5;
  const { result, error } = await getblock(hash);
  if (fallbackHeight && error && error.code === BLOCK_NOT_FOUND_CODE) {
    const fallbackHash = await getBlockHash(fallbackHeight);
    return getBlock(fallbackHash, fallbackHeight - 20);
  }

  if (error) throw new Error(error.message);
  if (!result) throw new Error("Result is null, no error");
  return result;
};

export const getBlockHash = async (
  height: number
): Promise<GetBlockHashResult> => {
  const { result, error } = await getblockhash(height);

  if (error) throw new Error(error.message);
  if (!result) throw new Error("Result is null, no error");

  return result;
};
