import { readFileSync } from "fs";

export const collectionScheme = JSON.parse(
  readFileSync("src/schemes/CollectionManifest.schema.json").toString()
);

export const inscriptionScheme = JSON.parse(
  readFileSync("src/schemes/InscriptionManifest.schema.json").toString()
);

export const inscriptionContentScheme = JSON.parse(
  readFileSync("src/schemes/InscriptionManifest.content.schema.json").toString()
);

export const revealScheme = JSON.parse(
  readFileSync("src/schemes/RevealManifest.schema.json").toString()
);

export const revealContentScheme = JSON.parse(
  readFileSync("src/schemes/RevealManifest.content.schema.json").toString()
);
