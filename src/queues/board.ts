import express from "express";
import { blockQueue } from "./index";
import { createBullBoard } from "@bull-board/api";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

const boardPath = "/admin/queues";
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(boardPath);

export const bullBoardServer = express();
export const bullBoardServerPort = 3000;

createBullBoard({
  serverAdapter: serverAdapter,
  queues: [new BullMQAdapter(blockQueue)],
});

bullBoardServer.use(boardPath, serverAdapter.getRouter());
