import React, { useCallback, useId, useLayoutEffect, useMemo } from "react";
import { Observer, observer } from "mobx-react-lite";
import { ConversationCard } from "../../core/conversation-card/conversation-card";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { toyNetwork } from "../../core/network/toy-network";
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

/** Units in each drawn layer. */
const COLUMN_SIZES = toyNetwork.layers.map(layer => layer.biases.length);
const TIMELINE = traceTimeline(COLUMN_SIZES);

/** Follow one conversation through the network, a layer at a time. */
export const TraceACase: React.FC = observer(function TraceACase() {
  const shared = useSharedState();
  // Correct the shared conversation when the list arrives, not in a useEffect: see docs/undo.md.
  // There is no filter yet, so the list is every conversation.
  const onLoaded = useCallback(
    (index: S3Index) => shared.ensureValidConversation(index.items.map(item => item.id)), [shared]);
  const indexState = useDatasetIndex(alien3Dataset, { onLoaded });

  return (
    <div className="trace-a-case">
      <h1 className="trace-a-case__title">Trace a Case</h1>
      {indexState.status === "loading" && <p>Loading conversations…</p>}
      {indexState.status === "error" &&
        <p role="alert">
          The conversations could not be {indexState.failed === "load" ? "loaded" : "shown"}: {indexState.error.message}
        </p>}
      {indexState.status === "ready" && <TraceACaseBody index={indexState.index} />}
    </div>
  );
});

const TraceACaseBody = observer(function TraceACaseBody({ index }: { index: S3Index }) {
  const shared = useSharedState();
  const state = useViewState(TraceACaseState);
  const ids = useMemo(() => index.items.map(item => item.id), [index]);
  const { passes, scales } = indexPasses(toyNetwork, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, so an invalid id never reaches the screen.
  const currentId = validConversationId(shared.conversationId, ids);
  const player = useMemo(
    () => (currentId === undefined ? undefined : new StepPlayer(TIMELINE, traceProgress(state, currentId))),
    [state, currentId]);
  // Stop the old player when the conversation changes or the view unmounts. A layout effect, so its
  // run can't play another frame, and save, after the change is committed.
  useLayoutEffect(() => () => player?.stop(), [player]);

  const position = currentId === undefined ? -1 : ids.indexOf(currentId);
  if (position < 0 || !player) {
    return <p>No conversations.</p>;
  }
  const goTo = (to: number) => shared.setConversationId(ids[to]);

  // The card comes first, so the tab order matches the stacked layout as well as the wide one.
  return (
    <div className="trace-a-case__layout">
      <div className="trace-a-case__case">
        <ConversationCard conversation={index.items[position]} position={position} total={ids.length}
          onPrev={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />
      </div>
      <div className="trace-a-case__steps">
        <StepRow player={player} buttons={TRACE_BUTTONS} />
      </div>
      <section className="trace-a-case__network" aria-labelledby={networkHeadId}>
        <h2 id={networkHeadId} className="trace-a-case__network-head">The Network</h2>
        <div className="trace-a-case__diagram">
          <Observer>
            {() => (
              <NetworkDiagram network={toyNetwork} pass={passes[position]} scales={scales}
                outputLabels={alien3Dataset.classificationLabels} scene={player.scene} />
            )}
          </Observer>
        </div>
      </section>
    </div>
  );
});
