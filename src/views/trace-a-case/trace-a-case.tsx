import React, { useCallback, useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { ConversationCard } from "../../core/conversation-card/conversation-card";
import { ConversationWords } from "../../core/conversation-card/conversation-words";
import { ActualLabel } from "../../core/conversation-card/actual-label";
import { ObservationNotes } from "../../core/conversation-card/observation-notes";
import { alien3Dataset, alien3Network } from "../../core/datasets/alien3-dataset";
import { conversationFilterFor, idsFor } from "../../core/filter/conversation-filter";
import { FilterBar } from "../../core/filter/filter-bar";
import { useConversationFilter } from "../../core/filter/use-conversation-filter";
import { indexPasses } from "../../core/network/index-passes";
import { Network } from "../../core/network/network";
import { MIN_HEIGHT } from "../../core/network-diagram/layout";
import { NetworkDiagram } from "../../core/network-diagram/network-diagram";
import { validConversationId } from "../../core/state/conversation";
import { TraceACaseState } from "./trace-a-case-state";
import { useSharedState, useViewState } from "../../core/state/view-state-context";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { StepPlayer } from "../../core/steps/step-player";
import { StepRow } from "../../core/steps/step-row";
import { TRACE_BUTTONS, traceProgress, traceTimeline } from "./trace-a-case-steps";
import "./trace-a-case.scss";

/** Gives the stylesheet the diagram's smallest layout, which it sizes the network panel from. */
const LAYOUT_STYLE = { "--diagram-min-height": `${MIN_HEIGHT}px` } as React.CSSProperties;

/** The index's fitted network, or why it has none. Doesn't throw, so the alert can be rendered on any mount. */
function readNetwork(index: S3Index): { network: Network } | { error: Error } {
  try {
    return { network: alien3Network(index) };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Follow one conversation through the network, a layer at a time. */
export const TraceACase: React.FC = observer(function TraceACase() {
  const shared = useSharedState();
  // Correct the shared conversation when the list arrives, not in a useEffect: see docs/undo.md.
  // The list is the stored query's matches: a query still being typed never moves the stored
  // conversation.
  const onLoaded = useCallback((index: S3Index) => {
    shared.ensureValidConversation(idsFor(conversationFilterFor(index), shared.query ?? ""));
  }, [shared]);
  const indexState = useDatasetIndex(alien3Dataset, { onLoaded });
  // Checked when the index is ready, on every mount, so data without a network shows the alert rather
  // than breaking the view.
  const fitted = useMemo(
    () => (indexState.status === "ready" ? readNetwork(indexState.index) : undefined), [indexState]);

  return (
    <div className="trace-a-case">
      <h1 className="trace-a-case__title">Trace a Case</h1>
      {indexState.status === "loading" && <p>Loading conversations…</p>}
      {indexState.status === "error" &&
        <p role="alert">
          The conversations could not be {indexState.failed === "load" ? "loaded" : "shown"}: {indexState.error.message}
        </p>}
      {fitted && "error" in fitted &&
        <p role="alert">The conversations could not be shown: {fitted.error.message}</p>}
      {indexState.status === "ready" && fitted && !("error" in fitted) &&
        <TraceACaseBody index={indexState.index} network={fitted.network} />}
    </div>
  );
});

const TraceACaseBody = observer(function TraceACaseBody({ index, network }: { index: S3Index; network: Network }) {
  const shared = useSharedState();
  const state = useViewState(TraceACaseState);
  const { ids, bar } = useConversationFilter(conversationFilterFor(index));
  // A conversation's place among all of them, which its pass is stored by. Its place in `ids`
  // changes with the query.
  const placeById = useMemo(() => new Map(index.items.map((item, i) => [item.id, i])), [index]);
  // The generated attributes a student can see. The derived target, prediction and
  // model_correct aren't among them, and the hidden ones wait to be commissioned.
  const indicatorAttributes = useMemo(() => (index.metadata.attributes ?? []).filter(a => !a.hidden), [index]);
  const timeline = useMemo(() => traceTimeline(network.layers.map(layer => layer.biases.length)), [network]);
  const { passes, scales } = indexPasses(network, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, and while a query is being typed, so an id
  // the list doesn't include never reaches the screen.
  const currentId = validConversationId(shared.conversationId, ids);
  const listPosition = currentId === undefined ? -1 : ids.indexOf(currentId);
  // No conversation is shown when nothing matches: the empty list leaves the stored id in place.
  const shownId = listPosition < 0 ? undefined : currentId;
  const player = useMemo(
    () => (shownId === undefined ? undefined : new StepPlayer(timeline, traceProgress(state, shownId), state)),
    [timeline, state, shownId]);
  // Stop the old player when the conversation changes or the view unmounts. A layout effect, so its
  // run can't finish and store its marker after the change is committed.
  useLayoutEffect(() => () => player?.stop(), [player]);

  if (index.items.length === 0) {
    return <p>No conversations.</p>;
  }
  const goTo = (to: number) => shared.setConversationId(ids[to]);
  const place = shownId === undefined ? undefined : placeById.get(shownId);
  const shown = place === undefined ? undefined : index.items[place];

  // The filter comes first: it sits over the card in both layouts. The card comes before the steps,
  // so the tab order matches the stacked layout as well as the wide one. When nothing matches the
  // card says so, and the steps and the network are left out.
  return (
    <div className="trace-a-case__layout" style={LAYOUT_STYLE}>
      <div className="trace-a-case__filter">
        <FilterBar {...bar} />
      </div>
      <div className="trace-a-case__conversation">
        <ConversationCard position={listPosition} total={ids.length}
          onPrev={() => goTo(listPosition - 1)} onNext={() => goTo(listPosition + 1)}>
          {shown &&
            <>
              <ConversationWords text={shown.text} />
              <ActualLabel target={shown.target} labels={alien3Dataset.classificationLabels} />
              <ObservationNotes observation={shown.observation} attributes={indicatorAttributes}
                values={shown.attributes} />
            </>}
        </ConversationCard>
      </div>
      {player && place !== undefined &&
        <>
          <div className="trace-a-case__steps">
            <StepRow player={player} buttons={TRACE_BUTTONS} />
          </div>
          <section className="trace-a-case__network" aria-labelledby={networkHeadId}>
            <div className="trace-a-case__network-head">
              <h2 id={networkHeadId} className="trace-a-case__network-title">The Network</h2>
              <AnimationControls animated={state} />
            </div>
            <div className="trace-a-case__diagram">
              <Observer>
                {() => (
                  <NetworkDiagram network={network} pass={passes[place]} scales={scales}
                    outputLabels={alien3Dataset.classificationLabels} scene={player.scene}
                    headingId={networkHeadId} />
                )}
              </Observer>
            </div>
          </section>
        </>}
    </div>
  );
});
