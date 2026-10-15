import React, { useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { toyNetwork } from "../../core/network/toy-network";
import { useViewState } from "../../core/state/view-state-context";
import { StepPlayer } from "../../core/steps/step-player";
import { StepButtonGroup } from "../../core/steps/step-button-group";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { deckSize } from "./deck-layout";
import { ExtractDrawing } from "./extract-drawing";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { extractButtons, extractProgress, MAX_COLLECTED } from "./extract-steps";
import { extractTimeline } from "./extract-timeline";
import about from "./about.md";
import "./extract-pathways.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const EXTRACT_PATHWAYS_TITLE = "Extract Pathways";

/** Units in each drawn layer. */
const COLUMN_SIZES = toyNetwork.layers.map(layer => layer.biases.length);
const PANEL_TITLE = "The Network → Activated Pathways";

/** Lift the hidden neurons out of the network and collect conversations' activations from them. */
export const ExtractPathways: React.FC = observer(function ExtractPathways() {
  const indexState = useDatasetIndex(alien3Dataset);
  return (
    <div className="extract-pathways">
      <h1 className="extract-pathways__title">{EXTRACT_PATHWAYS_TITLE}</h1>
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
  const size = deckSize(passes.length);
  const buttons = useMemo(() => extractButtons(limit), [limit]);
  const timeline = useMemo(() => extractTimeline(COLUMN_SIZES, size), [size]);
  const player = useMemo(() => new StepPlayer(timeline, extractProgress(state, limit, size), state),
    [timeline, state, limit, size]);
  // Stop the player when the view unmounts. A layout effect, so no existing run can finish and
  // store its marker after the view is gone.
  useLayoutEffect(() => () => player.stop(), [player]);

  if (passes.length === 0) {
    return <p>No conversations.</p>;
  }

  return (
    <>
      <div className="extract-pathways__step-row">
        <div className="extract-pathways__steps">
          <StepButtonGroup player={player} buttons={buttons} />
        </div>
        <div className="extract-pathways__about">
          <AboutButton title={EXTRACT_PATHWAYS_TITLE} markdown={about} />
        </div>
      </div>
      <section className="extract-pathways__network" aria-labelledby={panelHeadId}>
        <div className="extract-pathways__network-head">
          <h2 id={panelHeadId} className="extract-pathways__network-title">{PANEL_TITLE}</h2>
          <AnimationControls animated={state} />
        </div>
        <div className="extract-pathways__drawing">
          <Observer>
            {() => (
              <ExtractDrawing network={toyNetwork} passes={passes} scales={scales}
                outputLabels={alien3Dataset.classificationLabels} scene={player.scene} headingId={panelHeadId}
                deckSize={size} />
            )}
          </Observer>
        </div>
      </section>
    </>
  );
});
