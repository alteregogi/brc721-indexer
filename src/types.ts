export type CollectionManifest = {
  protocol: {
    name: "BRC721";
    version: string;
  };

  name: string;
  symbol: string;
  type: "collection";

  paymentAddress: string;
  signerPublicKey: string;

  maxSupply?: number;
  maxPerAddress?: number;
  maxBlockHeight?: number;
};

export type InscriptionManifest = {
  protocol: {
    name: "BRC721";
    version: string;
  };

  type: "inscription";
  contentSignature: string;

  content: {
    collectionInscriptionId: string;

    price?: number;
    initialOwnerAddress?: string;
  };
};

export type RevealManifest = {
  protocol: {
    name: "BRC721";
    version: string;
  };

  type: "reveal";
  contentSignature: string;

  content: {
    weight: number;
    metadataURL: string;
    collectionInscriptionId: string;
  };
};
