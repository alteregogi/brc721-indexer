import { cloneDeep } from "lodash";
import prisma from "../libs/__mocks__/prisma";
import { expect, test, vi, describe } from "vitest";
import { CollectionManifest, RevealManifest } from "@prisma/client";

import { VERIFICATION_ERRORS } from "../constants";
import { TxInscription } from "../services/inscriptions";
import { indexBRC721Inscription } from "../services/brc721";

vi.mock("../libs/prisma");

const pubkey =
  "0297715cd77cdbad806db9f79d8ebe2d12b5aea61b62811d042a6beb1a5cd80972";
const privkey =
  "6f9365940336767dfb406e0c6e192b1e238e63c8ce3330da487aa1c16bb9dc2b";

const InscriptionContentValid = {
  type: "inscription",
  protocol: { version: "1.0.0", name: "BRC721" },
  content: JSON.stringify({
    collectionInscriptionId:
      "f6fadfe24145d9eefbf2390401afa0b88ace8bfd0cd7c1715d650e5646b0a66ci0",
    price: 11000,
    initialOwnerAddress:
      "bc1pm57tpxmdtqcvmtm60rpa4nmjw3urtcwjpp9g2q3n8j4mt39evahsdhs2zr",
  }),
  contentSignature:
    "30450221009d41cc1162418d915a04b797565a2914acb97eee951d23be2a6e98ebba69f9d402202a9e3b6735c136c196d42fff68f336ff43bdc1f27dc78250f5e39c4ad3be77a6",
};
const CollectionContentValid = {
  name: "test",
  symbol: "test",
  maxSupply: 10,
  maxPerAddress: 1,
  type: "collection",
  maxBlockHeight: 100000000,
  paymentAddress: "address-0",
  signerPublicKey: pubkey,
  protocol: { version: "1.0.0", name: "BRC721" },
};
const RevealContentValid = {
  type: "reveal",
  protocol: { version: "1.0.0", name: "BRC721" },
  content: JSON.stringify(
    {
      weight: 2,
      metadataURL: "https://brc721.com/api/genesis/",
      collectionInscriptionId:
        "5fb1f2cfadca40e6d3e8b5c9ee54dd121b7ff32da092cf34ada7b0598bccaae8i0",
    },
    null,
    0
  ),
  contentSignature:
    "30450220299c1c353de499ae055ce87bc09622abbda361c52ac6060bcaf73867b1fd908d022100e6c9e883ed0cebb5463acabb1ee20fbee0c33dca0c512c33cc04883b9a642cf1",
};

const TxInscriptionValid: TxInscription = {
  txid: "1",
  inscriptionIndex: 0,
  inscriptionContent: JSON.stringify(InscriptionContentValid),
  index: 0,
  blockHeight: 10,
  vout: [
    {
      n: 0,
      value: 0.0001,
      scriptPubKey: {
        address:
          "bc1pm57tpxmdtqcvmtm60rpa4nmjw3urtcwjpp9g2q3n8j4mt39evahsdhs2zr",
      },
    },
    {
      n: 1,
      value: 0.00011,
      scriptPubKey: {
        address: "address-3",
      },
    },
  ],
};
const TxCollectionValid: TxInscription = {
  txid: "1",
  index: 0,
  blockHeight: 10,
  inscriptionIndex: 0,
  inscriptionContent: JSON.stringify(CollectionContentValid),
  vout: [
    {
      n: 0,
      value: 0.0001,
      scriptPubKey: {
        address: "address-1",
      },
    },
    {
      n: 1,
      value: 0.00011,
      scriptPubKey: {
        address: "address-3",
      },
    },
  ],
};
const TxRevealValid: TxInscription = {
  txid: "1",
  index: 0,
  blockHeight: 10,
  inscriptionIndex: 0,
  inscriptionContent: JSON.stringify(RevealContentValid),
  vout: [
    {
      n: 0,
      value: 0.0001,
      scriptPubKey: {
        address: "address-1",
      },
    },
  ],
};

const CollectionManifestValid: CollectionManifest = {
  id: "1",
  raw: {},
  name: "1",
  symbol: "1",
  position: 1,
  maxSupply: 10,
  blockHeight: 1,
  maxPerAddress: 1,
  version: "1.0.0",
  reindexing: false,
  maxBlockHeight: 20,
  transactionIndex: 0,
  updatedAt: new Date(),
  createdAt: new Date(),
  paymentAddress: "address-3",
  inscriberAddress: "address-2",
  signerPublicKey: pubkey,
};
const RevealManifestValid: RevealManifest = {
  id: "1",
  raw: {},
  weight: 1,
  valid: true,
  blockHeight: 1,
  version: "1.0.0",
  reindexing: false,
  transactionIndex: 0,
  updatedAt: new Date(),
  createdAt: new Date(),
  collectionId: "1",
  verificationErrors: [],
  inscriberAddress: "address-2",
  metadataURL: "https://brc721.com/api/genesis/",
};

describe("BRC721 indexer", () => {
  test("fails if inscription content is not JSON", async () => {
    const invalidTxInscription = cloneDeep(TxInscriptionValid);
    invalidTxInscription.inscriptionContent = "";

    prisma.collectionManifest.findFirst.mockResolvedValueOnce(
      CollectionManifestValid
    );

    await expect(
      indexBRC721Inscription(invalidTxInscription)
    ).resolves.toStrictEqual({
      type: "error",
      error: VERIFICATION_ERRORS.NOT_JSON,
    });
  });

  describe("CollectionManifest", async () => {
    test("has no errors if CollectionManifest is valid", async () => {
      const result = await indexBRC721Inscription(TxCollectionValid);
      expect(result.type).toBe("success-collection");
    });

    test("fails if CollectionManifest scheme is not valid", async () => {
      const collectionTx = cloneDeep(TxCollectionValid);
      const invalidInscriptionContent = JSON.stringify({
        symbol: "test",
        maxSupply: 10,
        maxPerAddress: 1,
        type: "collection",
        maxBlockHeight: 100000000,
        paymentAddress: "address-0",
        signerPublicKey: "signerPublicKey",
        protocol: { version: "1.0.0", name: "BRC721" },
      }); // no name field

      collectionTx.inscriptionContent = invalidInscriptionContent;

      await expect(indexBRC721Inscription(collectionTx)).resolves.toStrictEqual(
        {
          type: "error",
          error: VERIFICATION_ERRORS.COLLECTION_SCHEMA,
        }
      );
    });
  });

  describe("InscriptionManifest", () => {
    test("has no errors if InscriptionManifest is valid", async () => {
      prisma.collectionManifest.findFirst.mockResolvedValue(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxInscriptionValid)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [],
      });
    });

    test("fails if not valid scheme", async () => {
      const TxInscription = cloneDeep(TxInscriptionValid);
      TxInscription.inscriptionContent = JSON.stringify({
        type: "inscription",
        protocol: { version: "1.0.0", name: "BRC721" },
        content: JSON.stringify({
          price: 11000,
          initialOwnerAddress: "address-1",
          collectionInscriptionId: "1",
        }),
      });

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxInscription)
      ).resolves.toStrictEqual({
        type: "error",
        error: VERIFICATION_ERRORS.INSCRIPTION_SCHEMA,
      });
    });

    test("fails if not valid content scheme", async () => {
      const invalidTxInscription = cloneDeep(TxInscriptionValid);
      invalidTxInscription.inscriptionContent = JSON.stringify({
        type: "inscription",
        protocol: { version: "1.0.0", name: "BRC721" },
        content: JSON.stringify({
          price: 11000,
          initialOwnerAddress: "address-1",
        }),
        contentSignature:
          "f52a0ec5220aa79fb3bf4c0ffcd13af2fee2acd381d7f0c88ae5b574e341fc41298105462c2d9365ae26f4515151ae71cb5fbccd3a77dc567e602628a33491f8",
      });

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(invalidTxInscription)
      ).resolves.toStrictEqual({
        type: "error",
        error: VERIFICATION_ERRORS.CONTENT_SCHEMA,
      });
    });

    test("fails if not valid owner", async () => {
      const invalidTxInscription = cloneDeep(TxInscriptionValid);
      const address = invalidTxInscription.vout[0].scriptPubKey.address;
      invalidTxInscription.vout[0].scriptPubKey.address = `${address}-new`;

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(invalidTxInscription)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [VERIFICATION_ERRORS.NOT_OWNER],
      });
    });

    test("fails if no collection manifest", async () => {
      // default mocked value is null
      await expect(
        indexBRC721Inscription(TxInscriptionValid)
      ).resolves.toStrictEqual({
        type: "error",
        error: VERIFICATION_ERRORS.NO_COLLECTION_MANIFEST,
      });
    });

    test("fails if different protocol version", async () => {
      const collectionTx = cloneDeep(CollectionManifestValid);
      collectionTx.version = collectionTx.version + "-new";
      prisma.collectionManifest.findFirst.mockResolvedValueOnce(collectionTx);

      await expect(
        indexBRC721Inscription(TxInscriptionValid)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [VERIFICATION_ERRORS.DIFFERENT_VERSION],
      });
    });

    test("fails if bad signature", async () => {
      const TxInscription = cloneDeep(TxInscriptionValid);
      const InscriptionContentInvalid = cloneDeep(InscriptionContentValid);

      // bad content signature
      InscriptionContentInvalid.contentSignature = "1";
      TxInscription.inscriptionContent = JSON.stringify(
        InscriptionContentInvalid
      );

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxInscription)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [VERIFICATION_ERRORS.BAD_SIGNATURE],
      });
    });

    test("fails if inscription block heigh more than max", async () => {
      const TxInscription = cloneDeep(TxInscriptionValid);
      const CollectionManifestInvalid = cloneDeep(CollectionManifestValid);
      CollectionManifestInvalid.maxBlockHeight = TxInscription.blockHeight - 1;

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestInvalid
      );

      await expect(
        indexBRC721Inscription(TxInscriptionValid)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [VERIFICATION_ERRORS.MAX_BLOCK_HEIGHT],
      });
    });

    test("fails if price requirement not met", async () => {
      const TxInscription = cloneDeep(TxInscriptionValid);
      TxInscription.vout[1].value = 0.0001;

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxInscription)
      ).resolves.toMatchObject({
        type: "success-inscription",
        verificationErrors: [VERIFICATION_ERRORS.INSUFFICIENT_FUNDS],
      });
    });

    test("fails if max supply requirement not met", async () => {
      if (CollectionManifestValid.maxSupply) {
        const TxInscription = cloneDeep(TxInscriptionValid);

        prisma.inscriptionManifest.count.mockResolvedValueOnce(
          CollectionManifestValid.maxSupply + 1
        );

        if (CollectionManifestValid.maxPerAddress) {
          prisma.inscriptionManifest.count.mockResolvedValueOnce(
            CollectionManifestValid.maxPerAddress - 1
          );
        }

        prisma.collectionManifest.findFirst.mockResolvedValueOnce(
          CollectionManifestValid
        );

        await expect(
          indexBRC721Inscription(TxInscription)
        ).resolves.toMatchObject({
          type: "success-inscription",
          verificationErrors: [VERIFICATION_ERRORS.MAX_SUPPLY],
        });
      }
    });

    test("fails if max per address requirement not met", async () => {
      if (CollectionManifestValid.maxPerAddress) {
        const TxInscription = cloneDeep(TxInscriptionValid);

        if (CollectionManifestValid.maxSupply) {
          prisma.inscriptionManifest.count.mockResolvedValueOnce(
            CollectionManifestValid.maxSupply - 1
          );
        }

        prisma.inscriptionManifest.count.mockResolvedValueOnce(
          CollectionManifestValid.maxPerAddress + 1
        );

        prisma.collectionManifest.findFirst.mockResolvedValueOnce(
          CollectionManifestValid
        );

        await expect(
          indexBRC721Inscription(TxInscription)
        ).resolves.toMatchObject({
          type: "success-inscription",
          verificationErrors: [VERIFICATION_ERRORS.MAX_PER_ADDRESS],
        });
      }
    });
  });

  describe("RevealManifest", () => {
    test("has no errors if RevealManifest is valid", async () => {
      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      prisma.revealManifest.findFirst.mockResolvedValueOnce(null);
      prisma.revealManifest.upsert.mockResolvedValueOnce(RevealManifestValid);

      await expect(
        indexBRC721Inscription(TxRevealValid)
      ).resolves.toMatchObject({
        type: "success-reveal",
        verificationErrors: [],
      });
    });

    test("fails if RevealManifest schema is not valid", async () => {
      const TxRevealInvalid = cloneDeep(TxRevealValid);
      TxRevealInvalid.inscriptionContent = JSON.stringify({
        type: "reveal",
        protocol: { version: "1.0.0", name: "BRC721" },
        content: JSON.stringify({
          weight: 2,
          metadataURL: "metadataURL-1",
          collectionInscriptionId: "2",
        }),
      });

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxRevealInvalid)
      ).resolves.toMatchObject({
        type: "error",
        error: VERIFICATION_ERRORS.REVEAL_SCHEMA,
      });
    });

    test("fails if RevealManifest content schema is not valid", async () => {
      const TxRevealInvalid = cloneDeep(TxRevealValid);
      TxRevealInvalid.inscriptionContent = JSON.stringify({
        type: "reveal",
        protocol: { version: "1.0.0", name: "BRC721" },
        content: JSON.stringify({
          weight: 2,
          metadataURL: "metadataURL-1",
          // missing  collectionInscriptionId: "2",
        }),
        contentSignature:
          "b5ac5611c70046db201f5e14a015547f67dcf624b33ebedf05029d7a846b5b115fa73b53383d9242af6969763043cf5246335921db314192028aa8d3739ff86b",
      });

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxRevealInvalid)
      ).resolves.toMatchObject({
        type: "error",
        error: VERIFICATION_ERRORS.CONTENT_SCHEMA,
      });
    });

    test("fails if no collection found", async () => {
      await expect(
        indexBRC721Inscription(TxRevealValid)
      ).resolves.toMatchObject({
        type: "error",
        error: VERIFICATION_ERRORS.NO_COLLECTION_MANIFEST,
      });
    });

    test("fails if different protocol version", async () => {
      const CollectionManifest = cloneDeep(CollectionManifestValid);
      CollectionManifest.version = CollectionManifest.version + "-new";

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifest
      );

      await expect(
        indexBRC721Inscription(TxRevealValid)
      ).resolves.toMatchObject({
        type: "success-reveal",
        verificationErrors: [VERIFICATION_ERRORS.DIFFERENT_VERSION],
      });
    });

    test("fails if bad signature", async () => {
      const TxRevealInvalid = cloneDeep(TxRevealValid);
      const RevealContentInalid = cloneDeep(RevealContentValid);
      RevealContentInalid.contentSignature = "bad-signature";
      TxRevealInvalid.inscriptionContent = JSON.stringify(RevealContentInalid);

      prisma.collectionManifest.findFirst.mockResolvedValueOnce(
        CollectionManifestValid
      );

      await expect(
        indexBRC721Inscription(TxRevealInvalid)
      ).resolves.toMatchObject({
        type: "success-reveal",
        verificationErrors: [VERIFICATION_ERRORS.BAD_SIGNATURE],
      });
    });
  });
});
