import React, { useCallback, useId, useLayoutEffect, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { ConversationCard } from "../../core/conversation-card/conversation-card";
import { alien3Dataset } from "../../core/datasets/alien3-dataset";
import { conversationFilterFor, idsFor } from "../../core/filter/conversation-filter";
import { FilterBar } from "../../core/filter/filter-bar";
import { useConversationFilter } from "../../core/filter/use-conversation-filter";
import { ForwardPass } from "../../core/network/forward";
import { indexPasses } from "../../core/network/index-passes";
import { NetworkScales } from "../../core/network/network-scales";
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
  // Correct the shared conversation when the list arrives, not in a useEffect: see docs/undo.md.
  // The list is the stored query's matches: a query still being typed never moves the stored
  // conversation.
  const onLoaded = useCallback(
    (index: S3Index) => shared.ensureValidConversation(idsFor(conversationFilterFor(index), shared.query ?? "")),
    [shared]);
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
  const { ids, bar } = useConversationFilter(conversationFilterFor(index));
  // A conversation's place among all of them, which its pass is stored by. Its place in `ids`
  // changes with the query.
  const placeById = useMemo(() => new Map(index.items.map((item, i) => [item.id, i])), [index]);
  const { passes, scales } = indexPasses(toyNetwork, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, and while a query is being typed, so an id
  // the list doesn't include never reaches the screen.
  const currentId = validConversationId(shared.conversationId, ids);
  const position = currentId === undefined ? -1 : ids.indexOf(currentId);
  // No conversation is shown when nothing matches: the empty list leaves the stored id in place.
  const shownId = position < 0 ? undefined : currentId;
  const player = useMemo(
    () => (shownId === undefined ? undefined : new StepPlayer(COLUMN_SIZES, state, shownId)), [state, shownId]);
  // Stop the old player when the conversation changes or the view unmounts. A layout effect, so no
  // frame of its step can run, and save, after the change is committed.
  useLayoutEffect(() => () => player?.stop(), [player]);

  if (index.items.length === 0) {
    return <p>No conversations.</p>;
  }
  const goTo = (to: number) => shared.setConversationId(ids[to]);
  const place = shownId === undefined ? undefined : placeById.get(shownId);

  const noMatch = (
    <div className="trace-a-case__case">
      <p className="trace-a-case__no-match">No conversations match the filter.</p>
    </div>
  );
  // The card comes before the steps, so the tab order matches the stacked layout as well as the
  // wide one.
  const conversation = player && place !== undefined && (
    <>
      <div className="trace-a-case__case">
        <ConversationCard conversation={index.items[place]} position={position} total={ids.length}
          onPrev={() => goTo(position - 1)} onNext={() => goTo(position + 1)} />
      </div>
      <div className="trace-a-case__steps">
        <PlayerStepRow player={player} />
      </div>
      <section className="trace-a-case__network" aria-labelledby={networkHeadId}>
        <h2 id={networkHeadId} className="trace-a-case__network-head">The Network</h2>
        <div className="trace-a-case__diagram">
          <PlayerDiagram player={player} pass={passes[place]} scales={scales} />
        </div>
      </section>
    </>
  );

  // The filter comes first: it sits over the card in both layouts.
  return (
    <div className="trace-a-case__layout">
      <div className="trace-a-case__filter">
        <FilterBar {...bar} />
      </div>
      {conversation || noMatch}
    </div>
  );
});

// The player is read only in these two observers, so a step playing re-renders them and not the card.

const PlayerStepRow = observer(function PlayerStepRow({ player }: { player: StepPlayer }) {
  return <StepRow shownStep={player.shownStep} onStep={step => player.play(step)} onReset={() => player.reset()} />;
});

interface PlayerDiagramProps {
  player: StepPlayer;
  pass: ForwardPass;
  scales: NetworkScales;
}

const PlayerDiagram = observer(function PlayerDiagram({ player, pass, scales }: PlayerDiagramProps) {
  return (
    <NetworkDiagram network={toyNetwork} pass={pass} scales={scales}
      outputLabels={alien3Dataset.classificationLabels} scene={player.scene} />
  );
});
