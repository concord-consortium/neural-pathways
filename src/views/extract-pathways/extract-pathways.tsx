import React, { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { ViewTitle } from "../../core/view-title/view-title";
import { ActivationLegend } from "../../core/activation-legend/activation-legend";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { alien3Dataset, alien3Loadings, alien3Network } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { LoadingLegend } from "../../core/loading-legend/loading-legend";
import { Network } from "../../core/network/network";
import { useViewState } from "../../core/state/view-state-context";
import { StepPlayer } from "../../core/steps/step-player";
import { StepButtonGroup } from "../../core/steps/step-button-group";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { useElementSize } from "../../core/use-element-size";
import { deckSize } from "./deck-layout";
import { ExtractDrawing } from "./extract-drawing";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { extractButtons, extractProgress, MAX_COLLECTED } from "./extract-steps";
import { ExtractScene } from "./extract-scene";
import { extractTimeline } from "./extract-timeline";
import { loadingLegendReveal } from "./loading-legend-reveal";
import { checkLoadingsShape, Loadings } from "./pathways-layout";
import { PathwaysPick } from "./pick";
import about from "./about.md";
import "./extract-pathways.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const EXTRACT_PATHWAYS_TITLE = "Extract the Neural Pathways";

const PANEL_TITLE = "The Neural Network → Activated Pathways";

type FromIndex = { network: Network; loadings: Loadings } | { error: Error };

/** The index's fitted network and loadings, or the error reading them. */
function readFromIndex(index: S3Index): FromIndex {
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
 * Lift the hidden neurons out of the network, collect messages' activations from them into a
 * deck, and draw the three pathways from it.
 */
export const ExtractPathways: React.FC = observer(function ExtractPathways() {
  const indexState = useDatasetIndex(alien3Dataset);
  // Checked when the index is ready, on every mount, so data without a network or loadings shows the
  // alert rather than breaking the view.
  const fromIndex = useMemo(
    () => (indexState.status === "ready" ? readFromIndex(indexState.index) : undefined), [indexState]);
  return (
    <div className="extract-pathways">
      <ViewTitle className="extract-pathways__title">{EXTRACT_PATHWAYS_TITLE}</ViewTitle>
      {indexState.status === "loading" && <p>Loading messages…</p>}
      {indexState.status === "error" &&
        <p role="alert">The messages could not be loaded: {indexState.error.message}</p>}
      {fromIndex && "error" in fromIndex &&
        <p role="alert">The messages could not be shown: {fromIndex.error.message}</p>}
      {indexState.status === "ready" && fromIndex && !("error" in fromIndex) &&
        <ExtractPathwaysBody index={indexState.index} network={fromIndex.network} loadings={fromIndex.loadings} />}
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
  const [pick, setPick] = useState<PathwaysPick>();
  const stepsRef = useRef<HTMLDivElement>(null);

  // Any step press clears the pick, and most also remove the targets. Safari doesn't focus a clicked
  // button, so focus on a target would fall to the page; it goes to the pressed button, as elsewhere.
  const onStepPress = (key: string) => {
    if (document.activeElement?.closest(".pick-targets")) {
      stepsRef.current?.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)?.focus();
    }
    setPick(undefined);
  };

  if (passes.length === 0) {
    return <p>No messages.</p>;
  }

  return (
    <>
      <div className="extract-pathways__step-row">
        <div ref={stepsRef} className="extract-pathways__steps">
          <StepButtonGroup player={player} buttons={buttons} onPress={onStepPress} />
        </div>
        <div className="extract-pathways__about">
          <AboutButton title={EXTRACT_PATHWAYS_TITLE} markdown={about} />
        </div>
      </div>
      <section className="extract-pathways__network" aria-labelledby={panelHeadId}>
        <div className="extract-pathways__network-head">
          <h2 id={panelHeadId} className="extract-pathways__network-title">{PANEL_TITLE}</h2>
          <div className="extract-pathways__network-tools">
            <ActivationLegend />
            <LoadingLegendSlot player={player} />
            <span className="extract-pathways__network-rule" aria-hidden="true" />
            <AnimationControls animated={state} />
          </div>
        </div>
        <div className="extract-pathways__drawing">
          {/* Reads the player on its own, so the view's body doesn't re-render while a run plays. */}
          <Observer>
            {() => (
              <ExtractDrawing network={network} passes={passes} scales={scales}
                outputLabels={alien3Dataset.classificationLabels} scene={player.scene} headingId={panelHeadId}
                deckSize={size} loadings={loadings} pick={pick} onPick={setPick}
                atRest={player.currentRun === undefined} />
            )}
          </Observer>
        </div>
      </section>
    </>
  );
});

/**
 * The loading legend, which slides open and fades in with the pathways' lines. It stays out of the
 * layout until they start, so no gap opens for it beside the activation legend. Reads the player's
 * scene on its own, as the drawing does.
 */
const LoadingLegendSlot = observer(function LoadingLegendSlot({ player }: { player: StepPlayer<ExtractScene> }) {
  const [setNatural, natural] = useElementSize<HTMLDivElement>({ width: 0, height: 0 });
  const reveal = loadingLegendReveal(player.scene);
  let style: React.CSSProperties;
  if (!reveal) {
    style = { display: "none" };
  } else if (reveal.width === 1) {
    style = { opacity: reveal.opacity };
  } else {
    // Until the legend is measured it takes no width, so the head doesn't hold its full width for a
    // frame.
    style = { overflow: "hidden", opacity: reveal.opacity, width: reveal.width * natural.width };
  }
  return (
    <div className="extract-pathways__loading-legend" style={style}>
      <div ref={setNatural} className="extract-pathways__loading-legend-natural">
        <LoadingLegend />
      </div>
    </div>
  );
});
