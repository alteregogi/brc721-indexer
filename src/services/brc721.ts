import { ec } from "elliptic";
import { sha256 } from "js-sha256";
import { validate } from "jsonschema";
import { Prisma } from "@prisma/client";

import { CONSTS, VERIFICATION_ERRORS } from "../constants";
import { InscriptionManifest, RevealManifest } from "../types";
import {
  collectionScheme,
  inscriptionContentScheme,
  inscriptionScheme,
  revealContentScheme,
  revealScheme,
} from "../schemes";

import prisma from "../libs/prisma";
import { TxInscription } from "./inscriptions";

export const indexBRC721Inscriptions = async (
  txInscriptions: TxInscription[]
): Promise<any[]> => {
  let results = [];
  for await (const inscriptionTx of txInscriptions) {
    results.push(indexBRC721Inscription(inscriptionTx));
  }

  return results;
};

export type IndexedBRC721Success = {
  manifest: any;
  verificationErrors: Prisma.JsonArray;
  type: "success-collection" | "success-inscription" | "success-reveal";
};

export type ErrorBRC721Success = {
  type: "error";
  error: string;
};

export const indexBRC721Inscription = async (
  txInscription: TxInscription
): Promise<IndexedBRC721Success | ErrorBRC721Success> => {
  const { inscriptionIndex, inscriptionContent } = txInscription;

  let inscription;
  try {
    inscription = JSON.parse(inscriptionContent);
  } catch (error) {
    return {
      type: "error",
      error: VERIFICATION_ERRORS.NOT_JSON,
    };
  }

  const verificationErrors: Prisma.JsonArray = [];

  if (inscription.type === CONSTS.COLLECTION) {
    if (!validate(inscription, collectionScheme).valid) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.COLLECTION_SCHEMA,
      };
    }

    const currentSupply = await prisma.collectionManifest.count({
      where: { reindexing: false },
    });

    const manifest = await prisma.collectionManifest.upsert({
      where: { id: `${txInscription.txid}i${inscriptionIndex}` },
      create: {
        raw: inscription,
        name: inscription.name,
        symbol: inscription.symbol,
        position: currentSupply + 1,
        maxSupply: inscription.maxSupply,
        version: inscription.protocol.version,
        transactionIndex: txInscription.index,
        blockHeight: txInscription.blockHeight,
        maxPerAddress: inscription.maxPerAddress,
        maxBlockHeight: inscription.maxBlockHeight,
        paymentAddress: inscription.paymentAddress,
        signerPublicKey: inscription.signerPublicKey,
        id: `${txInscription.txid}i${inscriptionIndex}`,
        inscriberAddress:
          txInscription.vout[0].scriptPubKey.address || "uknown",
      },
      update: {
        raw: inscription,
        reindexing: false,
        name: inscription.name,
        symbol: inscription.symbol,
        position: currentSupply + 1,
        maxSupply: inscription.maxSupply,
        blockHeight: txInscription.blockHeight,
        transactionIndex: txInscription.index,
        version: inscription.protocol.version,
        maxPerAddress: inscription.maxPerAddress,
        maxBlockHeight: inscription.maxBlockHeight,
        paymentAddress: inscription.paymentAddress,
        signerPublicKey: inscription.signerPublicKey,
        inscriberAddress: txInscription.vout[0].scriptPubKey.address,
      },
      select: {
        id: true,
        raw: true,
        name: true,
        symbol: true,
        version: true,
        position: true,
        maxSupply: true,
        blockHeight: true,
        maxPerAddress: true,
        maxBlockHeight: true,
        paymentAddress: true,
        signerPublicKey: true,
        transactionIndex: true,
        inscriberAddress: true,
      },
    });

    return { type: "success-collection", verificationErrors, manifest };
  }

  if (inscription.type === CONSTS.INSCRIPTION) {
    if (!validate(inscription, inscriptionScheme).valid) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.INSCRIPTION_SCHEMA,
      };
    }

    let inscriptionContent: InscriptionManifest["content"];
    try {
      inscriptionContent = JSON.parse(inscription.content);
    } catch (error) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.NOT_JSON_CONTENT,
      };
    }

    if (!validate(inscriptionContent, inscriptionContentScheme).valid) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.CONTENT_SCHEMA,
      };
    }

    if (inscriptionContent.initialOwnerAddress) {
      const inscriptionOwner = txInscription.vout[0].scriptPubKey.address;
      if (inscriptionContent.initialOwnerAddress !== inscriptionOwner) {
        verificationErrors.push(VERIFICATION_ERRORS.NOT_OWNER);
      }
    }

    const collection = await prisma.collectionManifest.findFirst({
      where: {
        id: inscriptionContent.collectionInscriptionId,
      },
    });

    if (!collection) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.NO_COLLECTION_MANIFEST,
      };
    }

    const inscriptionManifest = inscription as InscriptionManifest;
    if (inscriptionManifest.protocol.version !== collection.version) {
      verificationErrors.push(VERIFICATION_ERRORS.DIFFERENT_VERSION);
    }

    // Verify signature
    const secp256k1 = new ec("secp256k1");
    let publicKey = collection.signerPublicKey;
    const uncompressed = publicKey.length === 128;
    publicKey = uncompressed ? `04${publicKey}` : publicKey;
    const signature = inscriptionManifest.contentSignature;
    const verifyingKey = secp256k1.keyFromPublic(publicKey, "hex");
    const messageHash = sha256(Buffer.from(inscription.content, "utf8"));

    try {
      if (!verifyingKey.verify(messageHash, signature)) {
        verificationErrors.push(VERIFICATION_ERRORS.BAD_SIGNATURE);
      }
    } catch (error) {
      verificationErrors.push(VERIFICATION_ERRORS.BAD_SIGNATURE);
    }

    // Verify max block height
    if (collection.maxBlockHeight) {
      if (txInscription.blockHeight > collection.maxBlockHeight) {
        verificationErrors.push(VERIFICATION_ERRORS.MAX_BLOCK_HEIGHT);
      }
    }

    // Verify price
    if (inscriptionContent.price) {
      const payee = collection.paymentAddress;
      const outputs = txInscription.vout;
      const spendableValueInBtc = outputs
        .filter((o) => o.scriptPubKey.address === payee)
        .reduce((a, o) => a + o.value, 0);

      const spendableValueInSats = spendableValueInBtc * 1e8;
      if (spendableValueInSats < inscriptionContent.price) {
        verificationErrors.push(VERIFICATION_ERRORS.INSUFFICIENT_FUNDS);
      }
    }

    const currentSupply = await prisma.inscriptionManifest.count({
      where: { valid: true, reindexing: false, collectionId: collection.id },
    });

    // Verify max supply
    if (collection.maxSupply) {
      if (currentSupply + 1 > collection.maxSupply) {
        verificationErrors.push(VERIFICATION_ERRORS.MAX_SUPPLY);
      }
    }

    const inscriberAddress = txInscription.vout[0].scriptPubKey.address;

    // Verify max per address
    if (collection.maxPerAddress) {
      const currentPerAddress = await prisma.inscriptionManifest.count({
        where: {
          valid: true,
          inscriberAddress,
          reindexing: false,
          collectionId: collection.id,
        },
      });

      if (currentPerAddress + 1 > collection.maxPerAddress) {
        verificationErrors.push(VERIFICATION_ERRORS.MAX_PER_ADDRESS);
      }
    }

    const position = verificationErrors.length ? null : currentSupply + 1;

    const ownerAddress = txInscription.vout[0].scriptPubKey.address || "uknown";
    const manifest = await prisma.inscriptionManifest.upsert({
      where: { id: `${txInscription.txid}i${inscriptionIndex}` },
      create: {
        position,
        raw: inscription,
        verificationErrors,
        price: inscriptionContent.price,
        transactionIndex: txInscription.index,
        blockHeight: txInscription.blockHeight,
        version: inscription.protocol.version,
        valid: verificationErrors.length === 0,
        id: `${txInscription.txid}i${inscriptionIndex}`,
        CollectionManifest: { connect: { id: collection.id } },
        initialOwnerAddress: inscriptionContent.initialOwnerAddress,
        inscriberAddress:
          txInscription.vout[0].scriptPubKey.address || "uknown",

        ownerAddress,
        satPointVout: 0,
        satPointTxId: txInscription.txid,
        satPointOffset: 0,
        SatPoint: {
          create: {
            vout: 0,
            offset: 0,
            ownerAddress,
            txId: txInscription.txid,
            blockHeight: txInscription.blockHeight,
          },
        },
      },
      update: {
        position,
        raw: inscription,
        reindexing: false,
        verificationErrors,
        price: inscriptionContent.price,
        transactionIndex: txInscription.index,
        blockHeight: txInscription.blockHeight,
        version: inscription.protocol.version,
        valid: verificationErrors.length === 0,
        CollectionManifest: { connect: { id: collection.id } },
        initialOwnerAddress: inscriptionContent.initialOwnerAddress,
        inscriberAddress:
          txInscription.vout[0].scriptPubKey.address || "uknown",

        ownerAddress,
        satPointVout: 0,
        satPointTxId: txInscription.txid,
        satPointOffset: 0,
        SatPoint: {
          update: {
            where: {
              txId_vout_offset_inscriptionManifestId: {
                vout: 0,
                offset: 0,
                txId: txInscription.txid,
                inscriptionManifestId: `${txInscription.txid}i${inscriptionIndex}`,
              },
            },
            data: {
              vout: 0,
              offset: 0,
              ownerAddress,
              txId: txInscription.txid,
              blockHeight: txInscription.blockHeight,
            },
          },
        },
      },
      select: {
        id: true,
        raw: true,
        price: true,
        version: true,
        position: true,
        blockHeight: true,
        collectionId: true,
        satPointTxId: true,
        satPointVout: true,
        ownerAddress: true,
        satPointOffset: true,
        transactionIndex: true,
        inscriberAddress: true,
        verificationErrors: true,
        initialOwnerAddress: true,
      },
    });

    return { type: "success-inscription", verificationErrors, manifest };
  }

  if (inscription.type === CONSTS.REVEAL) {
    if (!validate(inscription, revealScheme).valid) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.REVEAL_SCHEMA,
      };
    }

    const revealContent = JSON.parse(
      inscription.content
    ) as RevealManifest["content"];

    if (!validate(revealContent, revealContentScheme).valid) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.CONTENT_SCHEMA,
      };
    }

    const collection = await prisma.collectionManifest.findFirst({
      where: { id: revealContent.collectionInscriptionId },
    });

    if (!collection) {
      return {
        type: "error",
        error: VERIFICATION_ERRORS.NO_COLLECTION_MANIFEST,
      };
    }

    const revealManifest = inscription as RevealManifest;

    if (revealManifest.protocol.version !== collection.version) {
      verificationErrors.push(VERIFICATION_ERRORS.DIFFERENT_VERSION);
    }

    // Verify signature
    const secp256k1 = new ec("secp256k1");
    let publicKey = collection.signerPublicKey;
    const uncompressed = publicKey.length === 128;
    publicKey = uncompressed ? `04${publicKey}` : publicKey;
    const signature = revealManifest.contentSignature;
    const verifyingKey = secp256k1.keyFromPublic(publicKey, "hex");
    const messageHash = sha256(Buffer.from(inscription.content, "utf8"));

    try {
      if (!verifyingKey.verify(messageHash, signature)) {
        verificationErrors.push(VERIFICATION_ERRORS.BAD_SIGNATURE);
      }
    } catch (error) {
      verificationErrors.push(VERIFICATION_ERRORS.BAD_SIGNATURE);
    }

    if (!verificationErrors.length) {
      await prisma.revealManifest.updateMany({
        where: { collectionId: collection.id },
        data: {
          verificationErrors: {
            push: VERIFICATION_ERRORS.OUTDATED_REVEAL,
          },
        },
      });
    }

    const validReveal = await prisma.revealManifest.findFirst({
      where: { valid: true, collectionId: collection.id },
    });

    const currentRevealWeight = validReveal
      ? validReveal.weight
      : Number.MIN_SAFE_INTEGER;

    const isValidNew =
      verificationErrors.length === 0 &&
      revealContent.weight > currentRevealWeight;

    const manifest = await prisma.revealManifest.upsert({
      where: { id: `${txInscription.txid}i${inscriptionIndex}` },
      create: {
        raw: inscription,
        valid: isValidNew,
        verificationErrors,
        weight: revealContent.weight,
        transactionIndex: txInscription.index,
        version: inscription.protocol.version,
        blockHeight: txInscription.blockHeight,
        metadataURL: revealContent.metadataURL,
        id: `${txInscription.txid}i${inscriptionIndex}`,
        CollectionManifest: { connect: { id: collection.id } },
        inscriberAddress:
          txInscription.vout[0].scriptPubKey.address || "uknown",
      },
      update: {
        raw: inscription,
        reindexing: false,
        verificationErrors,
        weight: revealContent.weight,
        transactionIndex: txInscription.index,
        version: inscription.protocol.version,
        blockHeight: txInscription.blockHeight,
        valid: verificationErrors.length === 0,
        metadataURL: revealContent.metadataURL,
        CollectionManifest: { connect: { id: collection.id } },
        inscriberAddress: txInscription.vout[0].scriptPubKey.address,
      },
      select: {
        id: true,
        raw: true,
        weight: true,
        version: true,
        blockHeight: true,
        collectionId: true,
        inscriberAddress: true,
        transactionIndex: true,
        verificationErrors: true,
      },
    });

    if (isValidNew) {
      await prisma.revealManifest.updateMany({
        where: { collectionId: collection.id, id: { not: manifest.id } },
        data: { valid: false },
      });
    }

    return { type: "success-reveal", verificationErrors, manifest };
  }

  return { type: "error", error: VERIFICATION_ERRORS.UNKNOWN_TYPE };
};

type InscriptionOnOutpoint = {
  id: string;
  satPointOffset: number | null; // should't be null
};

export const findInscriptionsOnOutpoint = async (
  outpoint: OutPoint
): Promise<InscriptionOnOutpoint[]> => {
  const { txid, vout } = outpoint;

  const inscriptions = await prisma.inscriptionManifest.findMany({
    where: { satPointTxId: txid, satPointVout: vout, valid: true },
  });

  return inscriptions.map((i) => ({
    id: i.id,
    satPointOffset: i.satPointOffset,
  }));
};

export type OutPoint = {
  txid: string;
  vout: number;
};
