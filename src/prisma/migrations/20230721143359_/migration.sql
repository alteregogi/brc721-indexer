-- CreateTable
CREATE TABLE "CollectionManifest" (
    "blockHeight" INTEGER NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "maxSupply" INTEGER,
    "maxPerAddress" INTEGER,
    "maxBlockHeight" INTEGER,
    "position" INTEGER,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "paymentAddress" TEXT NOT NULL,
    "signerPublicKey" TEXT NOT NULL,
    "inscriberAddress" TEXT NOT NULL,
    "reindexing" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscriptionManifest" (
    "blockHeight" INTEGER NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "position" INTEGER,
    "price" INTEGER,
    "raw" JSONB NOT NULL,
    "verificationErrors" JSONB,
    "inscriberAddress" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "initialOwnerAddress" TEXT,
    "id" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "media" JSONB,
    "revealWeight" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reindexing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satPointVout" INTEGER,
    "satPointOffset" INTEGER,
    "ownerAddress" TEXT,
    "satPointTxId" TEXT,

    CONSTRAINT "InscriptionManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevealManifest" (
    "blockHeight" INTEGER NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "verificationErrors" JSONB,
    "inscriberAddress" TEXT NOT NULL,
    "metadataURL" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reindexing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RevealManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "run" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "fallbackHeight" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatPoint" (
    "id" TEXT NOT NULL,
    "vout" INTEGER,
    "offset" INTEGER,
    "ownerAddress" TEXT,
    "blockHeight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inscriptionManifestId" TEXT NOT NULL,
    "txId" TEXT,

    CONSTRAINT "SatPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checksum" (
    "checksum" TEXT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checksum_pkey" PRIMARY KEY ("blockHeight")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionManifest_id_key" ON "CollectionManifest"("id");

-- CreateIndex
CREATE UNIQUE INDEX "InscriptionManifest_id_key" ON "InscriptionManifest"("id");

-- CreateIndex
CREATE INDEX "InscriptionManifest_collectionId_idx" ON "InscriptionManifest"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "RevealManifest_id_key" ON "RevealManifest"("id");

-- CreateIndex
CREATE INDEX "RevealManifest_collectionId_idx" ON "RevealManifest"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "State_id_key" ON "State"("id");

-- CreateIndex
CREATE INDEX "SatPoint_inscriptionManifestId_idx" ON "SatPoint"("inscriptionManifestId");

-- CreateIndex
CREATE UNIQUE INDEX "SatPoint_txId_vout_offset_inscriptionManifestId_key" ON "SatPoint"("txId", "vout", "offset", "inscriptionManifestId");
