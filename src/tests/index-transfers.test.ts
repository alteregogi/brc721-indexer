import { cloneDeep } from "lodash";
import { expect, test, vi, describe } from "vitest";

import {
  FindTransfersTx,
  GetRawTransactionInputVerbosity2,
  GetRawTransactionOutput,
} from "../rpc/types";

import * as brc721 from "../services/brc721";
import {
  TRANSFER_ERRORS,
  findTxInscriptionsTransfers,
} from "../services/transfers";

describe("Inscription transfer indexer", () => {
  const vin: GetRawTransactionInputVerbosity2 = {
    coinbase: "",
    sequence: 0,
    vout: 0,
    txid: "0",
    txinwitness: [],
    prevout: {
      generated: false,
      height: 0,
      value: 0,
      scriptPubKey: {
        asm: "",
        desc: "",
        hex: "",
        type: "",
      },
    },
  };
  const vout: GetRawTransactionOutput = {
    n: 0,
    value: 10,
    scriptPubKey: {
      asm: "",
      desc: "",
      hex: "",
      type: "",
    },
  };
  const txTemplate: FindTransfersTx = {
    txid: "1",
    vin: [vin],
    vout: [vout],
  };

  test("should skip coinbase tx inputs", async () => {
    const tx = cloneDeep(txTemplate);
    const spy = vi.spyOn(brc721, "findInscriptionsOnOutpoint");

    spy.mockResolvedValue([
      { id: "1", satPointOffset: 1 },
      { id: "2", satPointOffset: 2 },
    ]);

    tx.vin[1] = cloneDeep(tx.vin[0]);
    tx.vin[2] = cloneDeep(tx.vin[0]);

    tx.vin[2].txid = ""; // The transaction id (if not coinbase transaction)
    tx.vin[1].coinbase = "coinbase"; // The coinbase data (only present if this is a coinbase transaction)

    await findTxInscriptionsTransfers(tx);

    expect(spy).toBeCalledTimes(1);
  });

  test("should throw error if missing undo data", async () => {
    const tx = cloneDeep(txTemplate);
    const txVin = [{ ...vin, prevout: undefined }]; // prevout will miss if no undo data

    expect(() =>
      findTxInscriptionsTransfers({ ...tx, vin: txVin })
    ).rejects.toThrowError(TRANSFER_ERRORS.UNDO_DATA);
  });

  test("should return unbound transfer if inscribed sat spent on fee", async () => {
    const tx = cloneDeep(txTemplate);
    tx.vout[0].value = 0.0000001;
    tx.vin[0].prevout!.value = 0.0000002;

    const spy = vi.spyOn(brc721, "findInscriptionsOnOutpoint");
    spy.mockResolvedValueOnce([
      { id: "0", satPointOffset: 9 },
      { id: "1", satPointOffset: 10 },
      { id: "2", satPointOffset: 11 },
      { id: "3", satPointOffset: 12 },
    ]);
    expect(await findTxInscriptionsTransfers(tx)).toMatchObject([
      { type: "normal", inscriptionId: "0" },
      { type: "unbound", inscriptionId: "1" },
      { type: "unbound", inscriptionId: "2" },
      { type: "unbound", inscriptionId: "3" },
    ]);
  });

  test("should return normal transfer if sat not spent on fees", async () => {
    const tx = cloneDeep(txTemplate);
    tx.vout[0].value = 0.0000001; // first output with 10 sats
    tx.vout.push({ ...vout, value: 0.00000005 }); // second with 5 sats
    tx.vin[0].prevout!.value = 0.0000002; // input with 20 sats

    const spy = vi.spyOn(brc721, "findInscriptionsOnOutpoint");

    spy.mockResolvedValueOnce([{ id: "1", satPointOffset: 11 }]);
    const transfers1 = await findTxInscriptionsTransfers(tx);

    expect(transfers1.length).toBe(1);
    expect(transfers1[0]).toHaveProperty("type", "normal");
    expect(transfers1[0]).toHaveProperty("offset", 1);

    spy.mockResolvedValueOnce([{ id: "1", satPointOffset: 9 }]);
    const transfers2 = await findTxInscriptionsTransfers(tx);

    expect(transfers2.length).toBe(1);
    expect(transfers2[0]).toHaveProperty("type", "normal");
    expect(transfers2[0]).toHaveProperty("offset", 9);
  });
});
