import React, { useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { ConversationCard } from "../../core/conversation-card/conversation-card";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { forward } from "../../core/network/forward";
import { networkScales } from "../../core/network/network-scales";
import { toyNetwork } from "../../core/network/toy-network";
import { NetworkDiagram } from "../../core/network-diagram/network-diagram";
import { validConversationId } from "../../core/state/conversation";
import { TraceACaseState } from "./trace-a-case-state";
import { useSharedState, useViewState } from "../../core/state/view-state-context";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { StepRow } from "./step-row";
import { StepPlayer } from "./step-player";
import "./trace-a-case.scss";

/** Units in each drawn layer. Fixed, as StepPlayer requires. */
const COLUMN_SIZES = toyNetwork.layers.map(layer => layer.biases.length);

/** Follow one conversation through the network, a layer at a time. */
export const TraceACase: React.FC = observer(function TraceACase() {
  const shared = useSharedState();
  // Correct the shared conversation when the list arrives, not in a render effect: see
  // docs/undo.md. There is no filter yet, so the list is every conversation.
  const onLoaded = useCallback(
    (index: S3Index) => shared.ensureValidConversation(index.items.map(item => item.id)), [shared]);
  const indexState = useDatasetIndex(alien3Dataset, { onLoaded });

  return (
    <div className="trace-a-case">
      <h1 className="trace-a-case__title">Trace a Case</h1>
      {indexState.status === "loading" && <p>Loading conversations…</p>}
      {indexState.status === "error" &&
        <p role="alert">The conversations could not be loaded: {indexState.error.message}</p>}
      {indexState.status === "ready" && <TraceACaseBody index={indexState.index} />}
    </div>
  );
});

const TraceACaseBody = observer(function TraceACaseBody({ index }: { index: S3Index }) {
  const shared = useSharedState();
  const state = useViewState(TraceACaseState);
  const ids = useMemo(() => index.items.map(item => item.id), [index]);
  const passes = useMemo(() => index.items.map(item => forward(toyNetwork, item.text)), [index]);
  const scales = useMemo(() => networkScales(toyNetwork, passes), [passes]);
  // Shown even before the store's correction lands, so an invalid id never reaches the screen.
  const currentId = validConversationId(shared.conversationId, ids);
  // One player for the view. It holds nothing between steps, so stopping it on unmount is enough.
  const [player] = useState(() => new StepPlayer(COLUMN_SIZES, state, shared));
  useEffect(() => () => player.stop(), [player]);

  const position = currentId === undefined ? -1 : ids.indexOf(currentId);
  if (position < 0) {
    return <p>No conversations.</p>;
  }
  const id = ids[position];
  const goTo = (to: number) => shared.setConversationId(ids[to]);

  return (
    <div className="trace-a-case__layout">
      <div className="trace-a-case__steps">
        <StepRow shownStep={player.shownStep(id)} onStep={step => player.play(id, step)}
          onReset={() => player.reset(id)} />
      </div>
      <div className="trace-a-case__case">
        <ConversationCard conversation={index.items[position]} position={position} total={ids.length}
          onPrev={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />
      </div>
      <section className="trace-a-case__network" aria-label="The Network">
        <h2 className="trace-a-case__network-head">The Network</h2>
        <div className="trace-a-case__diagram">
          <NetworkDiagram network={toyNetwork} pass={passes[position]} scales={scales}
            outputLabels={alien3Dataset.classificationLabels} scene={player.scene(id)} />
        </div>
      </section>
    </div>
  );
});
