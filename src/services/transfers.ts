import prisma from "../libs/prisma";
import { FindTransfersTx, InputVerbosity2 } from "../rpc/types";
import { OutPoint, findInscriptionsOnOutpoint } from "./brc721";

export type NormalTransfer = {
  type: "normal";
  txId: string;
  vout: number;
  offset: number;
  ownerAddress?: string;
  inscriptionId: string;
};
export type UnboundTransfer = {
  type: "unbound";
  inscriptionId: string;
};

type Transfer = NormalTransfer | UnboundTransfer;

export const TRANSFER_ERRORS = {
  UNDO_DATA: "UNDO_DATA",
};

export const findTxInscriptionsTransfers = async (
  tx: FindTransfersTx
): Promise<Transfer[]> => {
  const transfers: Transfer[] = [];

  tx.vin = tx.vin.filter((i) => i.txid !== undefined && !i.coinbase);
  tx.vin.forEach((input, index) => {
    if (input.prevout === undefined) {
      console.log(`vin[${index}]`, { input });
      throw new Error(TRANSFER_ERRORS.UNDO_DATA);
    }
  });

  tx.vout = tx.vout.map((o) => ({ ...o, value: o.value * 1e8 }));
  tx.vin = tx.vin.map((i) => ({ ...i, value: i.prevout!.value * 1e8 }));
  const inputs = tx.vin as InputVerbosity2[];

  let inputsOffset = 0;
  let restUnbound = false;
  for await (const input of inputs) {
    const outpoint: OutPoint = { txid: input.txid, vout: input.vout };
    const inscriptions = await findInscriptionsOnOutpoint(outpoint);

    if (!restUnbound) {
      inscriptions.sort((a, b) => a.satPointOffset! - b.satPointOffset!);
    }

    for await (const inscription of inscriptions) {
      const satPointOffset = inscription.satPointOffset as number;
      let offset = inputsOffset + satPointOffset;

      if (restUnbound) {
        transfers.push({
          type: "unbound",
          inscriptionId: inscription.id,
        });
        continue;
      }

      let outputN = -1;
      for (let i = 0; i < tx.vout.length; i++) {
        if (tx.vout[i].value <= offset) {
          offset -= tx.vout[i].value;
          continue;
        }
        outputN = i;
        break;
      }

      // not unbound
      if (outputN >= 0) {
        const output = tx.vout[outputN];

        transfers.push({
          type: "normal",
          offset,
          txId: tx.txid,
          vout: outputN,
          inscriptionId: inscription.id,
          ownerAddress: output.scriptPubKey.address,
        });

        continue;
      }

      // unbound
      restUnbound = true;
      transfers.push({
        type: "unbound",
        inscriptionId: inscription.id,
      });

      inputsOffset += input.value;
    }
  }

  return transfers;
};

export const indexTxInscriptionsTransfers = async (
  transfers: Transfer[],
  blockHeight: number
): Promise<void> => {
  for await (const transfer of transfers) {
    if (transfer.type === "normal") {
      const { inscriptionId, offset } = transfer;
      const { txId, vout, ownerAddress } = transfer;

      await prisma.inscriptionManifest.update({
        where: { id: inscriptionId },
        data: {
          ownerAddress,
          satPointTxId: txId,
          satPointVout: vout,
          satPointOffset: offset,
          SatPoint: {
            upsert: {
              where: {
                txId_vout_offset_inscriptionManifestId: {
                  txId,
                  vout,
                  offset,
                  inscriptionManifestId: inscriptionId,
                },
              },
              create: {
                txId,
                vout,
                offset,
                blockHeight,
                ownerAddress,
              },
              update: {
                blockHeight,
              },
            },
          },
        },
      });
    }
    if (transfer.type === "unbound") {
      const { inscriptionId } = transfer;
      await prisma.inscriptionManifest.update({
        where: { id: inscriptionId },
        data: {
          ownerAddress: null,
          satPointTxId: null,
          satPointVout: null,
          satPointOffset: null,
          SatPoint: {
            create: {
              blockHeight,
              vout: null,
              txId: null,
              offset: null,
              ownerAddress: null,
            },
          },
        },
      });
    }
  }
};
