import {
  GetBlockResult,
  GetRawTransactionResultVerbosity2,
} from "../rpc/types";

export interface TxInscription {
  txid: string;
  index: number;
  blockHeight: number;
  inscriptionIndex: number;
  inscriptionContent: string;
  vout: {
    n: number; // index
    value: number; // The value in BTC
    scriptPubKey: {
      address?: string; // (optional) The Bitcoin address (only if a well-defined address exists)
    };
  }[];
}

export const findInscriptionsInBlock = (
  block: GetBlockResult<GetRawTransactionResultVerbosity2>
): TxInscription[] => {
  const { tx: txs, height: blockHeight } = block;
  const txInscsriptions: TxInscription[] = [];

  txs.forEach((tx, index) => {
    const inscriptionContent = findInscriptionsInTx(tx);
    if (!inscriptionContent) return;

    txInscsriptions.push({
      ...tx,
      index,
      blockHeight,
      inscriptionContent,
      inscriptionIndex: 0,
    });
  });

  return txInscsriptions;
};

const TAPROOT_ANNEX_PREFIX_HEX = "50";
export const findInscriptionsInTx = (
  tx: GetRawTransactionResultVerbosity2
): string | void => {
  const [input] = tx.vin;
  const witness = input.txinwitness;
  if (!witness) return;
  if (!witness.length) return;
  if (witness.length === 1) return;
  const last = witness[witness.length - 1];
  const annex = last.slice(0, 2) === TAPROOT_ANNEX_PREFIX_HEX;
  if (witness.length === 2 && annex) return;

  const scriptHex = annex
    ? witness[witness.length - 1]
    : witness[witness.length - 2];
  if (!scriptHex) return;

  // no 0x00 in inscription content
  const script = Buffer.from(scriptHex, "hex");
  const opZeroIndex = script.lastIndexOf(new Uint8Array([0x00]));
  const scriptStart = script.subarray(0, opZeroIndex);
  const opFalseIndex = scriptStart.lastIndexOf(new Uint8Array([0x00]));
  const ord = script.subarray(opFalseIndex + 3, opFalseIndex + 6);
  if (ord.toString("ascii") !== "ord") return;

  const opPush = script.at(opZeroIndex + 1);
  if (!opPush) return;

  const pushdataLength = bitcoinPushdataBytelength(opPush);
  if (!pushdataLength) return;

  const contentStartIndex = opZeroIndex + 2 + pushdataLength;
  const inscriptionBuffer = script.subarray(contentStartIndex, -1);
  const inscriptionContent = inscriptionBuffer.toString("utf-8");

  return inscriptionContent;
};

function bitcoinPushdataBytelength(opPush: number) {
  if (opPush >= 1 && opPush <= 75) return opPush;
  if (opPush === 76) return 1;
  if (opPush === 77) return 2;
  if (opPush === 78) return 4;
  return null;
}
