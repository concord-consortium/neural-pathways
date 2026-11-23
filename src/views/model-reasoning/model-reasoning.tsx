import React, { useCallback, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { alien3Dataset, alien3FitName, alien3WordScoreMax } from "../../core/datasets/alien3-dataset";
import { FilterBar } from "../../core/filter/filter-bar";
import { idsFor, messageFilterFor } from "../../core/filter/message-filter";
import { useMessageFilter } from "../../core/filter/use-message-filter";
import { MessageCard } from "../../core/message-card/message-card";
import { WordContributionLegend } from "../../core/message-card/word-contribution-legend";
import { messageWords } from "../../core/message-text";
import { validMessageId } from "../../core/state/message";
import { useSharedState } from "../../core/state/view-state-context";
import { S3Index, S3Item } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { useWordScores } from "../../core/use-word-scores";
import { ViewTitle } from "../../core/view-title/view-title";
import { ModelReasoningReadings } from "./model-reasoning-readings";
import about from "./about.md";
import "./model-reasoning.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const MODEL_REASONING_TITLE = "Neural Pathway View of Model Reasoning";

/**
 * The index's fit, whose word scores the view loads, and its scale maximum, or the error reading them.
 * It also builds the index's filter, which the body uses, since a mount with the index already loaded
 * renders the body before onLoaded would.
 */
function readScale(index: S3Index): { fitName: string; max: number } | { error: Error } {
  try {
    messageFilterFor(index);
    return { fitName: alien3FitName(index), max: alien3WordScoreMax(index) };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** A message's words read by each pathway, colored by how much each word pushes it up or down. */
export const ModelReasoning: React.FC = observer(function ModelReasoning() {
  const shared = useSharedState();
  // Corrects the shared message when the list arrives, as looking-inside.tsx does.
  const onLoaded = useCallback((index: S3Index) => {
    shared.ensureValidMessage(idsFor(messageFilterFor(index), shared.query ?? ""));
  }, [shared]);
  const indexState = useDatasetIndex(alien3Dataset, { onLoaded });
  // Checked on every mount, as looking-inside.tsx checks its network.
  const scale = useMemo(
    () => (indexState.status === "ready" ? readScale(indexState.index) : undefined), [indexState]);

  return (
    <div className="model-reasoning">
      <ViewTitle className="model-reasoning__title">{MODEL_REASONING_TITLE}</ViewTitle>
      {indexState.status === "loading" && <p>Loading messages…</p>}
      {indexState.status === "error" &&
        <p role="alert">
          The messages could not be {indexState.failed === "load" ? "loaded" : "shown"}: {indexState.error.message}
        </p>}
      {scale && "error" in scale &&
        <p role="alert">The messages could not be shown: {scale.error.message}</p>}
      {indexState.status === "ready" && scale && !("error" in scale) &&
        <ModelReasoningBody index={indexState.index} fitName={scale.fitName} max={scale.max} />}
    </div>
  );
});

interface ModelReasoningBodyProps {
  index: S3Index;
  fitName: string;
  max: number;
}

const ModelReasoningBody = observer(function ModelReasoningBody({ index, fitName, max }: ModelReasoningBodyProps) {
  const shared = useSharedState();
  const { ids, bar } = useMessageFilter(messageFilterFor(index));
  const itemById = useMemo(() => new Map(index.items.map(item => [item.id, item])), [index]);

  if (index.items.length === 0) {
    return <p>No messages.</p>;
  }
  // The shown message, found as in looking-inside.tsx.
  const currentId = validMessageId(shared.messageId, ids);
  const listPosition = currentId === undefined ? -1 : ids.indexOf(currentId);
  const shown = listPosition < 0 || currentId === undefined ? undefined : itemById.get(currentId);
  const goTo = (to: number) => shared.setMessageId(ids[to]);

  // The filter comes first, with About at the right end of its row, over the card.
  return (
    <div className="model-reasoning__layout">
      <div className="model-reasoning__filter-row">
        <div className="model-reasoning__filter">
          <FilterBar {...bar} />
        </div>
        <AboutButton title={MODEL_REASONING_TITLE} markdown={about} />
      </div>
      <div className="model-reasoning__message">
        <MessageCard position={listPosition} total={ids.length}
          onPrev={() => goTo(listPosition - 1)} onNext={() => goTo(listPosition + 1)}>
          {shown && <ModelReasoningMessage item={shown} fitName={fitName} max={max} />}
        </MessageCard>
      </div>
    </div>
  );
});

interface ModelReasoningMessageProps {
  item: S3Item;
  fitName: string;
  max: number;
}

/** The card's body: the legend over the message's readings, or over an alert if its scores fail. */
const ModelReasoningMessage: React.FC<ModelReasoningMessageProps> = ({ item, fitName, max }) => {
  const scores = useWordScores(alien3Dataset, fitName, item);
  const words = useMemo(() => messageWords(item.text), [item.text]);
  return (
    <>
      <WordContributionLegend max={max} />
      {scores.status === "error"
        ? (
          <p role="alert">
            The word scores could not be {scores.failed === "load" ? "loaded" : "shown"}: {scores.error.message}
          </p>
        )
        : <ModelReasoningReadings key={item.id} words={words}
          scores={scores.status === "ready" ? scores.scores : undefined} max={max} />}
    </>
  );
};
