import React, { useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { toyNetwork } from "../../core/network/toy-network";
import { useViewState } from "../../core/state/view-state-context";
import { StepPlayer } from "../../core/steps/step-player";
import { StepRow } from "../../core/steps/step-row";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { ExtractDrawing } from "./extract-drawing";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { extractButtons, extractProgress, MAX_COLLECTED } from "./extract-steps";
import { extractTimeline } from "./extract-timeline";
import "./extract-pathways.scss";

/** Units in each drawn layer. */
const COLUMN_SIZES = toyNetwork.layers.map(layer => layer.biases.length);
const TIMELINE = extractTimeline(COLUMN_SIZES);
const PANEL_TITLE = "The Network → Activated Pathways";

/** Lift the hidden neurons out of the network and collect conversations' activations from them. */
export const ExtractPathways: React.FC = observer(function ExtractPathways() {
  const indexState = useDatasetIndex(alien3Dataset);
  return (
    <div className="extract-pathways">
      <h1 className="extract-pathways__title">Extract Pathways</h1>
      {indexState.status === "loading" && <p>Loading conversations…</p>}
      {indexState.status === "error" &&
        <p role="alert">The conversations could not be loaded: {indexState.error.message}</p>}
      {indexState.status === "ready" && <ExtractPathwaysBody index={indexState.index} />}
    </div>
  );
});

const ExtractPathwaysBody = observer(function ExtractPathwaysBody({ index }: { index: S3Index }) {
  const state = useViewState(ExtractPathwaysState);
  const panelHeadId = useId();
  const { passes, scales } = indexPasses(toyNetwork, index);
  const limit = Math.min(MAX_COLLECTED, passes.length);
  const buttons = useMemo(() => extractButtons(limit), [limit]);
  const player = useMemo(() => new StepPlayer(TIMELINE, extractProgress(state, limit)), [state, limit]);
  // Stop the player when the view unmounts. A layout effect, so no existing run can finish and
  // store its marker after the view is gone.
  useLayoutEffect(() => () => player.stop(), [player]);

  if (passes.length === 0) {
    return <p>No conversations.</p>;
  }

  return (
    <>
      <div className="extract-pathways__steps">
        <StepRow player={player} buttons={buttons} />
      </div>
      <section className="extract-pathways__network" aria-labelledby={panelHeadId}>
        <h2 id={panelHeadId} className="extract-pathways__network-head">{PANEL_TITLE}</h2>
        <div className="extract-pathways__drawing">
          <Observer>
            {() => (
              <ExtractDrawing network={toyNetwork} passes={passes} scales={scales}
                outputLabels={alien3Dataset.classificationLabels} scene={player.scene} headingId={panelHeadId} />
            )}
          </Observer>
        </div>
      </section>
    </>
  );
});
