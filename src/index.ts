require("dotenv").config();

import prisma from "./libs/prisma";
import { DEFAULT_STATE } from "./constants";
import { blockQueue, blockWorker } from "./queues";
import { bullBoardServer, bullBoardServerPort } from "./queues/board";
import { BlockJobType } from "./queues/types";

const main = async () => {
  await blockQueue.drain(true);
  await blockQueue.clean(0, 0, "failed");
  await blockQueue.clean(0, 0, "active");

  const { hash, run } = await prisma.state.upsert({
    where: { id: DEFAULT_STATE.id },
    create: DEFAULT_STATE,
    update: { run: { increment: 1 } },
  });

  await blockQueue.add(
    `block:${hash}`,
    { type: BlockJobType.IndexBlock, run, hash },
    { timestamp: Date.now() }
  );
};

blockWorker.run();
blockWorker.once("ready", () => {
  console.log("blockWorker is ready");
  main();
});

if (process.env.NODE_ENV === "development") {
  bullBoardServer.listen(bullBoardServerPort);
  console.log(`Bull Dashboard running on ${bullBoardServerPort}`);
}
