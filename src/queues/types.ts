export const enum BlockJobType {
  IndexBlock = "index-block",
  WaitNextBlock = "wait-next-block",
}

type WaitNextBlockJob = {
  run: number;
  hash: string;
  type: BlockJobType.WaitNextBlock;
};

type IndexBlockJob = {
  run: number;
  hash: string;
  type: BlockJobType.IndexBlock;
};

export type BlockJob = WaitNextBlockJob | IndexBlockJob;
