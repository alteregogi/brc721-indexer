import { Queue, Worker } from "bullmq";

import { BlockJob } from "./types";
import { processor } from "./processor";
import { REDIS_CONNECTION } from "./constant";

const queueName = "block";

export const blockQueue = new Queue<BlockJob>(queueName, {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    // removeOnFail: true,
    // removeOnComplete: true,
    // attempts: Number.MAX_SAFE_INTEGER,
    // backoff: { type: "fixed", delay: 10000 },
  },
});

export const blockWorker = new Worker(queueName, processor, {
  concurrency: 1,
  autorun: false,
  connection: REDIS_CONNECTION,
});
