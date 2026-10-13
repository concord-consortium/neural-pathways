import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

export const PredictionChain: React.FC = () => (
  <ViewPlaceholder className="prediction-chain" title="Prediction Chain" about={about} />
);
