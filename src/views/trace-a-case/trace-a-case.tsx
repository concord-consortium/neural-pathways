import React, { useCallback, useId, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ConversationCard } from "../../core/conversation-card/conversation-card";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { indexPasses } from "../../core/network/index-passes";
import { toyNetwork } from "../../core/network/toy-network";
import { NetworkDiagram } from "../../core/network-diagram/network-diagram";
import { fullScene } from "../../core/network-diagram/scene";
import { validConversationId } from "../../core/state/conversation";
import { useSharedState } from "../../core/state/view-state-context";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import "./trace-a-case.scss";

const FULL_SCENE = fullScene(toyNetwork.layers.map(layer => layer.biases.length));

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
  const ids = useMemo(() => index.items.map(item => item.id), [index]);
  const { passes, scales } = indexPasses(toyNetwork, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, so an invalid id never reaches the screen.
  const currentId = validConversationId(shared.conversationId, ids);

  const position = currentId === undefined ? -1 : ids.indexOf(currentId);
  if (position < 0) {
    return <p>No conversations.</p>;
  }
  const goTo = (to: number) => shared.setConversationId(ids[to]);

  return (
    <div className="trace-a-case__layout">
      <div className="trace-a-case__case">
        <ConversationCard conversation={index.items[position]} position={position} total={ids.length}
          onPrev={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />
      </div>
      <section className="trace-a-case__network" aria-labelledby={networkHeadId}>
        <h2 id={networkHeadId} className="trace-a-case__network-head">The Network</h2>
        <div className="trace-a-case__diagram">
          <NetworkDiagram network={toyNetwork} pass={passes[position]} scales={scales}
            outputLabels={alien3Dataset.classificationLabels} scene={FULL_SCENE} />
        </div>
      </section>
    </div>
  );
});
