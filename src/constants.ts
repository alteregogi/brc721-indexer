export const IS_TESTNET = process.env.NETWORK === "testnet";

export const DEFAULT_STATE = IS_TESTNET
  ? {
      id: "1",
      run: 1,
      checksum: "",
      hash: "0000000000000005d160ce5f37790eeea8f12a1370a85ef24ced6ee454a1ef35", // brc721 testnet genesis block hash
      height: 2437791,
      fallbackHeight: 2437791,
    }
  : {
      id: "1",
      run: 1,
      checksum: "",
      hash: "00000000000000000001de804f036647861c819b404a78bf0246eb104e0e0987", // brc721 livenet genesis block hash
      height: 789817,
      fallbackHeight: 789890,
    };

export const VERIFICATION_ERRORS = {
  NOT_JSON: "NOT_JSON",
  NOT_OWNER: "NOT_OWNER",
  MAX_SUPPLY: "MAX_SUPPLY",
  UNKNOWN_TYPE: "UNKNOWN_TYPE",
  BAD_SIGNATURE: "BAD_SIGNATURE",
  REVEAL_SCHEMA: "REVEAL_SCHEMA",
  CONTENT_SCHEMA: "CONTENT_SCHEMA",
  MAX_PER_ADDRESS: "MAX_PER_ADDRESS",
  OUTDATED_REVEAL: "OUTDATED_REVEAL",
  NOT_JSON_CONTENT: "NOT_JSON_CONTENT",
  MAX_BLOCK_HEIGHT: "MAX_BLOCK_HEIGHT",
  COLLECTION_SCHEMA: "COLLECTION_SCHEMA",
  DIFFERENT_VERSION: "DIFFERENT_VERSION",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  INSCRIPTION_SCHEMA: "INSCRIPTION_SCHEMA",
  NO_COLLECTION_MANIFEST: "NO_COLLECTION_MANIFEST",
};

export const CONSTS = {
  BRC721: "BRC721",
  REVEAL: "reveal",
  COLLECTION: "collection",
  INSCRIPTION: "inscription",
};
