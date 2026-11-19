import React, { useCallback, useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { MessageCard } from "../../core/message-card/message-card";
import { MessageWords } from "../../core/message-card/message-words";
import { ActualLabel } from "../../core/message-card/actual-label";
import { ObservationNotes } from "../../core/message-card/observation-notes";
import { alien3Dataset, alien3Network } from "../../core/datasets/alien3-dataset";
import { messageFilterFor, idsFor } from "../../core/filter/message-filter";
import { FilterBar } from "../../core/filter/filter-bar";
import { useMessageFilter } from "../../core/filter/use-message-filter";
import { indexPasses } from "../../core/network/index-passes";
import { Network } from "../../core/network/network";
import { MIN_HEIGHT } from "../../core/network-diagram/layout";
import { NetworkDiagram } from "../../core/network-diagram/network-diagram";
import { validMessageId } from "../../core/state/message";
import { LookingInsideState } from "./looking-inside-state";
import { useSharedState, useViewState } from "../../core/state/view-state-context";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { StepPlayer } from "../../core/steps/step-player";
import { StepButtonGroup } from "../../core/steps/step-button-group";
import { TRACE_BUTTONS, traceProgress, traceTimeline } from "./looking-inside-steps";
import about from "./about.md";
import "./looking-inside.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const LOOKING_INSIDE_TITLE = "Looking Inside a Neural Network";

/** Gives the stylesheet the diagram's smallest layout, which it sizes the network panel from. */
const LAYOUT_STYLE = { "--diagram-min-height": `${MIN_HEIGHT}px` } as React.CSSProperties;

/** The index's fitted network, or the error reading it. */
function readNetwork(index: S3Index): { network: Network } | { error: Error } {
  try {
    return { network: alien3Network(index) };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Follow one message through the network, a layer at a time. */
export const LookingInside: React.FC = observer(function LookingInside() {
  const shared = useSharedState();
  // Correct the shared message when the list arrives, not in a useEffect: see docs/undo.md.
  // The list is the stored query's matches: a query still being typed never moves the stored
  // message.
  const onLoaded = useCallback((index: S3Index) => {
    shared.ensureValidMessage(idsFor(messageFilterFor(index), shared.query ?? ""));
  }, [shared]);
  const indexState = useDatasetIndex(alien3Dataset, { onLoaded });
  // Checked when the index is ready, on every mount, so data without a network shows the alert rather
  // than breaking the view.
  const fromIndex = useMemo(
    () => (indexState.status === "ready" ? readNetwork(indexState.index) : undefined), [indexState]);

  return (
    <div className="looking-inside">
      <h1 className="looking-inside__title">{LOOKING_INSIDE_TITLE}</h1>
      {indexState.status === "loading" && <p>Loading messages…</p>}
      {indexState.status === "error" &&
        <p role="alert">
          The messages could not be {indexState.failed === "load" ? "loaded" : "shown"}: {indexState.error.message}
        </p>}
      {fromIndex && "error" in fromIndex &&
        <p role="alert">The messages could not be shown: {fromIndex.error.message}</p>}
      {indexState.status === "ready" && fromIndex && !("error" in fromIndex) &&
        <LookingInsideBody index={indexState.index} network={fromIndex.network} />}
    </div>
  );
});

const LookingInsideBody = observer(function LookingInsideBody(
  { index, network }: { index: S3Index; network: Network },
) {
  const shared = useSharedState();
  const state = useViewState(LookingInsideState);
  const { ids, bar } = useMessageFilter(messageFilterFor(index));
  // A message's place among all of them, which its pass is stored by. Its place in `ids`
  // changes with the query.
  const placeById = useMemo(() => new Map(index.items.map((item, i) => [item.id, i])), [index]);
  const timeline = useMemo(() => traceTimeline(network.layers.map(layer => layer.biases.length)), [network]);
  const { passes, scales } = indexPasses(network, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, and while a query is being typed, so an id
  // the list doesn't include never reaches the screen.
  const currentId = validMessageId(shared.messageId, ids);
  const listPosition = currentId === undefined ? -1 : ids.indexOf(currentId);
  // No message is shown when nothing matches: the empty list leaves the stored id in place.
  const shownId = listPosition < 0 ? undefined : currentId;
  const player = useMemo(
    () => (shownId === undefined ? undefined : new StepPlayer(timeline, traceProgress(state, shownId), state)),
    [timeline, state, shownId]);
  // Stop the old player when the message changes or the view unmounts. A layout effect, so its
  // run can't finish and store its marker after the change is committed.
  useLayoutEffect(() => () => player?.stop(), [player]);

  if (index.items.length === 0) {
    return <p>No messages.</p>;
  }
  const goTo = (to: number) => shared.setMessageId(ids[to]);
  const place = shownId === undefined ? undefined : placeById.get(shownId);
  const shown = place === undefined ? undefined : index.items[place];

  // The filter comes first: it sits over the card in both layouts. The card comes before the steps,
  // so the tab order matches the stacked layout as well as the wide one. When nothing matches the
  // card says so, and the steps and the network are left out, but the step row stays to hold About.
  return (
    <div className="looking-inside__layout" style={LAYOUT_STYLE}>
      <div className="looking-inside__filter-row">
        <FilterBar {...bar} />
      </div>
      <div className="looking-inside__message">
        <MessageCard position={listPosition} total={ids.length}
          onPrev={() => goTo(listPosition - 1)} onNext={() => goTo(listPosition + 1)}>
          {shown &&
            <>
              <MessageWords text={shown.text} />
              <ActualLabel target={shown.target} labels={alien3Dataset.classificationLabels} />
              <ObservationNotes observation={shown.observation} open={state.notesOpen}
                onOpenChange={open => state.setNotesOpen(open)} />
            </>}
        </MessageCard>
      </div>
      <div className="looking-inside__step-row">
        {player && place !== undefined && <StepButtonGroup player={player} buttons={TRACE_BUTTONS} />}
        <div className="looking-inside__about">
          <AboutButton title={LOOKING_INSIDE_TITLE} markdown={about} />
        </div>
      </div>
      {player && place !== undefined &&
        <section className="looking-inside__network" aria-labelledby={networkHeadId}>
          <div className="looking-inside__network-head">
            <h2 id={networkHeadId} className="looking-inside__network-title">The Network</h2>
            <AnimationControls animated={state} />
          </div>
          <div className="looking-inside__diagram">
            <Observer>
              {() => (
                <NetworkDiagram network={network} pass={passes[place]} scales={scales}
                  outputLabels={alien3Dataset.classificationLabels} scene={player.scene}
                  headingId={networkHeadId} />
              )}
            </Observer>
          </div>
        </section>}
    </div>
  );
});
