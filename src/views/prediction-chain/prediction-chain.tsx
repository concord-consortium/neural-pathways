import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const PREDICTION_CHAIN_TITLE = "Prediction Chain";

export const PredictionChain: React.FC = () => (
  <ViewPlaceholder className="prediction-chain" title={PREDICTION_CHAIN_TITLE} about={about} />
);
