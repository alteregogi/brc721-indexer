import { Job, UnrecoverableError } from "bullmq";

import prisma from "../libs/prisma";
import { BlockJob, BlockJobType } from "./types";
import { getBlock } from "./helper";
import { blockQueue } from "./index";
import { DEFAULT_STATE } from "../constants";
import { findInscriptionsInBlock } from "../services/inscriptions";
import { indexBRC721Inscriptions } from "../services/brc721";
import { FALLBACK_DEPTH } from "./constant";
import { sha256 } from "js-sha256";
import {
  findTxInscriptionsTransfers,
  indexTxInscriptionsTransfers,
} from "../services/transfers";

export const processor = async (job: Job<BlockJob>) => {
  console.log(job.data.hash);
  const { type, hash, run } = job.data;
  try {
    if (type === BlockJobType.IndexBlock) {
      const start = new Date();
      const state = await prisma.state
        .findFirstOrThrow({
          where: { id: DEFAULT_STATE.id },
        })
        .catch(async () => {
          await blockQueue.close();
          throw new UnrecoverableError("ERROR: STATE");
        });

      if (state.run !== run) {
        return ERRORS.OLD_RUN;
      }

      const block = await getBlock(hash, state.fallbackHeight);
      const { nextblockhash, height } = block;
      const newInscriptions = findInscriptionsInBlock(block);
      await indexBRC721Inscriptions(newInscriptions);

      const blockTransfers = [];
      for await (const tx of block.tx) {
        const transfers = await findTxInscriptionsTransfers(tx);
        indexTxInscriptionsTransfers(transfers, block.height);
        blockTransfers.push(...transfers);
      }

      const results = [...newInscriptions, ...blockTransfers];
      const checksum = sha256(results.join());
      const stateChecksum = sha256(state.checksum + checksum);
      await prisma.checksum.upsert({
        where: { blockHeight: block.height },
        create: { blockHeight: block.height, blockHash: hash, checksum },
        update: { blockHash: hash, checksum },
      });

      await prisma.state.update({
        where: { id: DEFAULT_STATE.id },
        data: {
          hash: block.hash,
          height: block.height,
          checksum: stateChecksum,
          fallbackHeight: height - FALLBACK_DEPTH,
        },
      });

      if (!nextblockhash) {
        await blockQueue.add(
          `wait-next-block:${hash}`,
          { type: BlockJobType.WaitNextBlock, run, hash },
          { timestamp: Date.now() }
        );

        return "OK";
      }

      await blockQueue.add(
        `block:${nextblockhash}`,
        { type: BlockJobType.IndexBlock, run, hash: nextblockhash! },
        { timestamp: Date.now() }
      );

      console.log(new Date().getTime() - start.getTime(), "ms");
      return "OK";
    }
    if (type === BlockJobType.WaitNextBlock) {
      const state = await prisma.state
        .findFirstOrThrow({ where: { id: DEFAULT_STATE.id } })
        .catch(async () => {
          await blockQueue.close();
          throw new UnrecoverableError("ERROR: STATE");
        });

      if (state.run !== run) {
        return ERRORS.OLD_RUN;
      }

      const fallbackHeight = state.fallbackHeight;
      const { nextblockhash } = await getBlock(hash, fallbackHeight);

      if (!nextblockhash) {
        await blockQueue.add(
          `wait-next-block:${hash}`,
          { type: BlockJobType.WaitNextBlock, run, hash },
          { timestamp: Date.now(), delay: 30000 }
        );

        return "OK";
      }

      await blockQueue.add(
        `block:${nextblockhash}`,
        { type: BlockJobType.IndexBlock, run, hash: nextblockhash! },
        { timestamp: Date.now() }
      );

      return "OK";
    }
    throw new Error("UNKNOWN JOB TYPE");
  } catch (error) {
    console.error("UNHANDLED ERROR:", error);
    throw new UnrecoverableError("UNHANDLED ERROR");
  }
};

const ERRORS = {
  OLD_RUN: "OLD_RUN",
  CONFIRMATIONS: "CONFIRMATIONS",
};
