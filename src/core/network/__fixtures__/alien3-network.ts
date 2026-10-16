import { alien3Loadings } from "../../datasets/alien3-dataset";
import { S3FaFit, S3Index } from "../../types/s3-data";
import { Network } from "../network";
import snapshot from "./alien3-network.json";

// The network the generator fitted to alien3, and its fit, as one run emitted them (see the JSON's
// note). Tests use it so they never read dist/.

export const fixtureNetwork = snapshot.network as Network;

/** Index metadata carrying the snapshot's fit and network, for an index a test builds. */
export const fixtureMetadata: S3Index["metadata"] = {
  fa_fits: { [snapshot.fitName]: snapshot.fit as S3FaFit },
  review_sets: {},
  network: fixtureNetwork,
};

/** The snapshot's loadings as the views take them, [neuron][pathway]. */
export const fixtureLoadings = alien3Loadings({ metadata: fixtureMetadata, items: [] });
