import React, { useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { alien3Dataset, alien3Loadings, alien3Network } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { Network } from "../../core/network/network";
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
import { checkLoadingsShape, Loadings } from "./pathways-layout";
import about from "./about.md";
import "./extract-pathways.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const EXTRACT_PATHWAYS_TITLE = "Extract Pathways";

const PANEL_TITLE = "The Network → Activated Pathways";

/** What the view draws from the index: its network and loadings, or why it can't. */
type Fitted = { network: Network; loadings: Loadings } | { error: Error };

/** Read the fitted network and loadings without throwing, so the alert can be rendered for bad data on any mount. */
function readFitted(index: S3Index): Fitted {
  try {
    const network = alien3Network(index);
    const loadings = alien3Loadings(index);
    // The lifted neurons are the columns between the first and the last, as the canvas draws them.
    const hiddenNeurons = network.layers.slice(1, -1).reduce((sum, layer) => sum + layer.biases.length, 0);
    checkLoadingsShape(loadings, hiddenNeurons);
    return { network, loadings };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Lift the hidden neurons out of the network, collect conversations' activations from them into a
 * deck, and draw the three pathways from it.
 */
export const ExtractPathways: React.FC = observer(function ExtractPathways() {
  const indexState = useDatasetIndex(alien3Dataset);
  // Checked when the index is ready, on every mount, so data without a network or loadings shows the
  // alert rather than breaking the view.
  const fitted = useMemo(
    () => (indexState.status === "ready" ? readFitted(indexState.index) : undefined), [indexState]);
  return (
    <div className="extract-pathways">
      <h1 className="extract-pathways__title">{EXTRACT_PATHWAYS_TITLE}</h1>
      {indexState.status === "loading" && <p>Loading conversations…</p>}
      {indexState.status === "error" &&
        <p role="alert">The conversations could not be loaded: {indexState.error.message}</p>}
      {fitted && "error" in fitted && <p role="alert">The conversations could not be shown: {fitted.error.message}</p>}
      {indexState.status === "ready" && fitted && !("error" in fitted) &&
        <ExtractPathwaysBody index={indexState.index} network={fitted.network} loadings={fitted.loadings} />}
    </div>
  );
});

interface BodyProps {
  index: S3Index;
  network: Network;
  loadings: Loadings;
}

const ExtractPathwaysBody = observer(function ExtractPathwaysBody({ index, network, loadings }: BodyProps) {
  const state = useViewState(ExtractPathwaysState);
  const panelHeadId = useId();
  const columnSizes = useMemo(() => network.layers.map(layer => layer.biases.length), [network]);
  const { passes, scales } = indexPasses(network, index);
  const limit = Math.min(MAX_COLLECTED, passes.length);
  const size = deckSize(passes.length);
  const buttons = useMemo(() => extractButtons(limit), [limit]);
  const timeline = useMemo(() => extractTimeline(columnSizes, size, loadings), [columnSizes, size, loadings]);
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
              <ExtractDrawing network={network} passes={passes} scales={scales}
                outputLabels={alien3Dataset.classificationLabels} scene={player.scene} headingId={panelHeadId}
                deckSize={size} loadings={loadings} />
            )}
          </Observer>
        </div>
      </section>
    </>
  );
});
