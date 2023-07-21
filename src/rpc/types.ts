export type GetRawTransactionOutput = {
  value: number; // The value in BTC
  n: number; // index
  scriptPubKey: {
    asm: string; // Disassembly of the public key script
    desc: string; // Inferred descriptor for the output
    hex: string; // The raw public key script bytes, hex-encoded
    address?: string; // (optional) The Bitcoin address (only if a well-defined address exists)
    type: string; // The type (one of: nonstandard, pubkey, pubkeyhash, scripthash, multisig, nulldata, witness_v0_scripthash, witness_v0_keyhash, witness_v1_taproot, witness_unknown)
  };
};
export interface GetRawTransactionInputVerbosity1 {
  coinbase?: string; // (optional) The coinbase value (only if coinbase transaction)
  txid?: string; // (optional) The transaction id (if not coinbase transaction)
  vout: number; // (optional) The output number (if not coinbase transaction)
  scriptSig?: {
    // (json object, optional) The script (if not coinbase transaction)
    asm: string; // Disassembly of the signature script
    hex: string; // The raw signature script bytes, hex-encoded
  };
  txinwitness?: string[]; // (optional),
  sequence: number; // The script sequence number
}
export interface GetRawTransactionInputVerbosity2
  extends GetRawTransactionInputVerbosity1 {
  prevout?: {
    // (optional) The previous output, omitted if block undo data is not available
    generated: boolean; // Coinbase or not
    height: number; // The height of the prevout
    value: number; // The value in BTC
    scriptPubKey: {
      asm: string; // Disassembly of the public key script
      desc: string; // Inferred descriptor for the output
      hex: string; // The raw public key script bytes, hex-encoded
      address?: string; // (optional) The Bitcoin address (only if a well-defined address exists)
      type: string; // The type (one of: nonstandard, pubkey, pubkeyhash, scripthash, multisig, nulldata, witness_v0_scripthash, witness_v0_keyhash, witness_v1_taproot, witness_unknown)
    };
  };
}

export interface InputVerbosity2 extends GetRawTransactionInputVerbosity1 {
  txid: string;
  value: number; // The value in BTC
  prevout: {
    generated: boolean; // Coinbase or not
    height: number; // The height of the prevout
    value: number; // The value in BTC
    scriptPubKey: {
      asm: string; // Disassembly of the public key script
      desc: string; // Inferred descriptor for the output
      hex: string; // The raw public key script bytes, hex-encoded
      address?: string; // (optional) The Bitcoin address (only if a well-defined address exists)
      type: string; // The type (one of: nonstandard, pubkey, pubkeyhash, scripthash, multisig, nulldata, witness_v0_scripthash, witness_v0_keyhash, witness_v1_taproot, witness_unknown)
    };
  };
}

export interface GetRawTransactionResultVerbosity1 {
  in_active_chain: boolean; // (optional) Whether specified block is in the active chain or not (only present with explicit "blockhash" argument)
  blockhash: string; // (string, optional) the block hash
  confirmations: number; // (numeric, optional) The confirmations
  blocktime: number; //  (numeric, optional) The block time expressed in UNIX epoch time
  time: number; //(numeric, optional) Same as "blocktime"
  hex: string; //(string) The serialized, hex-encoded data for 'txid'
  txid: string; //(string) The transaction id (same as provided)
  hash: string; // (string) The transaction hash (differs from txid for witness transactions)
  size: number; // (numeric) The serialized transaction size
  vsize: number; // (numeric) The virtual transaction size (differs from size for witness transactions)
  weight: number; // (numeric) The transaction's weight (between vsize*4-3 and vsize*4)
  version: number; // (numeric) The version
  locktime: number; // (numeric) The lock time
  vin: GetRawTransactionInputVerbosity1[];
  vout: GetRawTransactionOutput[];
}
export interface GetRawTransactionResultVerbosity2
  extends GetRawTransactionResultVerbosity1 {
  vin: GetRawTransactionInputVerbosity2[];
  fee?: number; // (optional) transaction fee in BTC, omitted if block undo data is not available
}

export interface FindTransfersTx {
  txid: string;
  vout: GetRawTransactionOutput[];
  vin: GetRawTransactionInputVerbosity2[];
}

export interface BitcoinRPCRes<T> {
  result: T | null;
  error: BitcoinRPCError | null;
  id: string;
}

interface BitcoinRPCError {
  code: number;
  message: string;
}

export type GetBlockResult<Tx> = {
  hash: string; // the block hash (same as provided)
  confirmations: number; // The number of confirmations, or -1 if the block is not on the main chain
  size: number; // The block size
  strippedsize: number; // The block size excluding witness data
  weight: number; // The block weight as defined in BIP 141
  height: number; // The block height or index
  version: number; // The block version
  versionHex: string; // The block version formatted in hexadecimal
  merkleroot: string; // The merkle root
  tx: Tx[];
  time: number; // The block time expressed in UNIX epoch time
  mediantime: number; // The median block time expressed in UNIX epoch time
  nonce: number; // The nonce
  bits: string; // The bits
  difficulty: number; // The difficulty
  chainwork: string; // Expected number of hashes required to produce the chain up to this block (in hex)
  nTx: number; // The number of transactions in the block
  previousblockhash?: string; // (optional) The hash of the previous block (if available)
  nextblockhash?: string; // (optional) The hash of the next block (if available)
};

export type GetBlockHashResult = string;
