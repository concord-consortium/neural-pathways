import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Observer, observer } from "mobx-react-lite";
import { AboutButton } from "../../core/about/about-button";
import { ViewTitle } from "../../core/view-title/view-title";
import { ActivationLegend } from "../../core/activation-legend/activation-legend";
import { AnimationControls } from "../../core/animation-controls/animation-controls";
import { MessageCard } from "../../core/message-card/message-card";
import { MessageWords } from "../../core/message-card/message-words";
import { ActualLabel } from "../../core/message-card/actual-label";
import { ObservationNotes } from "../../core/message-card/observation-notes";
import { alien3Dataset, alien3Network } from "../../core/datasets/alien3-dataset";
import { messageFilterFor, idsFor } from "../../core/filter/message-filter";
import { FilterBar } from "../../core/filter/filter-bar";
import { useMessageFilter } from "../../core/filter/use-message-filter";
import { ForwardPass } from "../../core/network/forward";
import { indexPasses } from "../../core/network/index-passes";
import { Network } from "../../core/network/network";
import { MIN_HEIGHT } from "../../core/network-diagram/layout";
import { NetworkDiagram } from "../../core/network-diagram/network-diagram";
import { NeuronInteraction } from "../../core/network-diagram/neuron-targets";
import { sameNeuron, NeuronRef } from "../../core/network-diagram/neuron";
import { messageWords } from "../../core/message-text";
import { validMessageId } from "../../core/state/message";
import { LookingInsideState } from "./looking-inside-state";
import { useSharedState, useViewState } from "../../core/state/view-state-context";
import { S3Index } from "../../core/types/s3-data";
import { useDatasetIndex } from "../../core/use-dataset-index";
import { StepPlayer } from "../../core/steps/step-player";
import { StepButtonGroup } from "../../core/steps/step-button-group";
import { LOOKING_INSIDE_BUTTONS, lookingInsideProgress, lookingInsideTimeline } from "./looking-inside-steps";
import { WordFlightOverlay } from "./word-flight-overlay";
import { ReadoutBox } from "./readout-box";
import { promptText, readoutText } from "./readout-text";
import about from "./about.md";
import "./looking-inside.scss";

/** The view's title, in its heading, its About and the app's list of views. */
export const LOOKING_INSIDE_TITLE = "Looking Inside a Neural Network";

/** Gives the stylesheet the diagram's smallest layout, which it sizes the network panel from. */
const LAYOUT_STYLE = { "--diagram-min-height": `${MIN_HEIGHT}px` } as React.CSSProperties;

/** What the student has pointed at in the diagram, for one message. */
interface NeuronAttention {
  /** The message this belongs to; another message's attention counts for nothing. */
  messageId: string | undefined;
  pinned?: NeuronRef;
  hovered?: NeuronRef;
  /** The neuron with keyboard focus (`:focus-visible`), not one a click focused. */
  focused?: NeuronRef;
  /** The neuron that last had focus, from the keyboard or a click, which holds the Tab stop. */
  lastFocused?: NeuronRef;
}

const NO_ATTENTION: NeuronAttention = { messageId: undefined };

/** The five prompts, by the marker they are shown at. */
const PROMPT_MARKERS = [0, 1, 2, 3, 4];

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
      <ViewTitle className="looking-inside__title">{LOOKING_INSIDE_TITLE}</ViewTitle>
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
  const { passes, scales } = indexPasses(network, index);
  const networkHeadId = useId();
  // Shown even before the store's correction lands, and while a query is being typed, so an id
  // the list doesn't include never reaches the screen.
  const currentId = validMessageId(shared.messageId, ids);
  const listPosition = currentId === undefined ? -1 : ids.indexOf(currentId);
  // No message is shown when nothing matches: the empty list leaves the stored id in place.
  const shownId = listPosition < 0 ? undefined : currentId;
  const shownText = shownId === undefined ? undefined : index.items[placeById.get(shownId)!].text;
  const words = useMemo(() => (shownText === undefined ? [] : messageWords(shownText)), [shownText]);
  const wordCount = words.length;
  const place = shownId === undefined ? undefined : placeById.get(shownId);
  // What is hovered, focused and pinned belongs to the message shown. Keeping its id beside it
  // drops it all when the message changes, with no effect to clear it.
  const [storedAttention, setAttention] = useState<NeuronAttention>(NO_ATTENTION);
  if (storedAttention.messageId !== shownId) {
    // Adjusting state while rendering is React's way to reset it when a prop changes, with no effect.
    setAttention({ messageId: shownId });
  }
  const attention = storedAttention;
  // A change that leaves everything as it was keeps the state object, so a step press with nothing
  // pinned doesn't render the view again.
  const updateAttention = (change: Partial<NeuronAttention>) => setAttention(previous => {
    const unchanged = (Object.keys(change) as Exclude<keyof NeuronAttention, "messageId">[])
      .every(key => change[key] === previous[key] || sameNeuron(change[key], previous[key]));
    return unchanged ? previous : { ...previous, ...change };
  });
  const [readoutHeight, setReadoutHeight] = useState(0);
  const diagramRef = useRef<HTMLDivElement>(null);
  // The layout the word flights are drawn over and measured against.
  const [layoutElement, setLayoutElement] = useState<HTMLElement | null>(null);
  // The flights depend on how many words the message has, so the timeline does too.
  const timeline = useMemo(
    () => lookingInsideTimeline(network.layers.map(layer => layer.biases.length), wordCount), [network, wordCount]);
  const player = useMemo(
    () => (shownId === undefined ? undefined : new StepPlayer(timeline, lookingInsideProgress(state, shownId), state)),
    [timeline, state, shownId]);
  // Stop the old player when the message changes or the view unmounts. A layout effect, so its
  // run can't finish and store its marker after the change is committed.
  useLayoutEffect(() => () => player?.stop(), [player]);

  const lastColumn = network.layers.length - 1;
  const pass = place === undefined ? undefined : passes[place];
  // Every text the box can show for this message, so it can hold the height of the tallest. An input
  // neuron's readout has a second sentence from Step 2; every other neuron has one form.
  const candidates = useMemo(() => {
    if (!pass) return { prompts: [], readouts: [] };
    const labels = alien3Dataset.classificationLabels;
    const readouts: React.ReactNode[] = [];
    network.layers.forEach((layer, column) => {
      layer.biases.forEach((_, unit) => {
        const markers = column === 0 ? [1, 2] : [column === lastColumn ? 4 : column + 1];
        markers.forEach(marker => {
          readouts.push(readoutText({ column, unit }, marker, pass.layers[column][unit], lastColumn, labels));
        });
      });
    });
    return { prompts: PROMPT_MARKERS.map(promptText), readouts };
  }, [network, pass, lastColumn]);

  if (index.items.length === 0) {
    return <p>No messages.</p>;
  }
  const goTo = (to: number) => shared.setMessageId(ids[to]);
  const shown = place === undefined ? undefined : index.items[place];

  // What the marker says is reached is read where it is drawn, in an Observer, and in the handlers,
  // so a run moving the marker doesn't render the view and its message card again. While a run plays
  // the marker is the one it started from, so the neurons the run is reaching become live when it ends.
  const ifReached = (neuron: NeuronRef | undefined) =>
    neuron && player && neuron.column < player.marker ? neuron : undefined;
  const interaction = (): NeuronInteraction => {
    const reachedColumns = player?.marker ?? 0;
    const lastFocused = ifReached(attention.lastFocused);
    return {
      reachedColumns,
      tabStop: lastFocused ?? (reachedColumns >= 1 ? { column: 0, unit: 0 } : undefined),
      rings: {
        hovered: ifReached(attention.hovered), pinned: ifReached(attention.pinned),
        focused: ifReached(attention.focused),
      },
      onHover: hovered => updateAttention({ hovered }),
      // A blur reports no neuron, and an arrow key moves focus with a blur and then a focus. Any focus
      // takes the Tab stop; only keyboard focus rings and highlights the neuron, so a click that unpins
      // leaves nothing marked.
      onFocusChange: (neuron, visible) => updateAttention(
        neuron ? { focused: visible ? neuron : undefined, lastFocused: neuron } : { focused: undefined }),
      onToggle: neuron => updateAttention(
        { pinned: sameNeuron(ifReached(attention.pinned), neuron) ? undefined : neuron }),
      onClear: () => updateAttention({ pinned: undefined }),
    };
  };
  const clearReadout = () => {
    const pinned = ifReached(attention.pinned);
    updateAttention({ pinned: undefined });
    if (pinned) {
      // The Clear button is about to leave the page, so focus goes back to where the student was.
      // The drawing's own circles carry the same data attributes, so ask for the button.
      const selector = `[role="button"][data-column="${pinned.column}"][data-unit="${pinned.unit}"]`;
      diagramRef.current?.querySelector<SVGGElement>(selector)?.focus();
    }
  };
  // A press clears the pin: the readout would describe a step that is about to change. Reset also
  // takes the Tab stop back, since the neuron that held it is no longer reached.
  const onPress = (key: string) => {
    if (key === "reset") {
      updateAttention({ pinned: undefined, hovered: undefined, focused: undefined, lastFocused: undefined });
    } else if (attention.pinned) {
      // Only when there is a pin to clear: a state update with nothing to change still renders the view.
      updateAttention({ pinned: undefined });
    }
  };
  const contentFor = (shownPlayer: StepPlayer<unknown>, shownPass: ForwardPass) => {
    const pinned = ifReached(attention.pinned);
    return pinned
      ? readoutText(pinned, shownPlayer.marker, shownPass.layers[pinned.column][pinned.unit], lastColumn,
        alien3Dataset.classificationLabels)
      : shownPlayer.currentRun ? undefined : promptText(shownPlayer.marker);
  };
  // The filter comes first: it sits over the card in both layouts. The card comes before the steps,
  // so the tab order matches the stacked layout as well as the wide one. When nothing matches the
  // card says so, and the steps and the network are left out, but the step row stays to hold About.
  const layoutStyle = { ...LAYOUT_STYLE, "--readout-height": `${readoutHeight}px` } as React.CSSProperties;
  return (
    <div className="looking-inside__layout" style={layoutStyle} ref={setLayoutElement}>
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
        {player && place !== undefined && <StepButtonGroup player={player} buttons={LOOKING_INSIDE_BUTTONS} onPress={onPress} />}
        <div className="looking-inside__about">
          <AboutButton title={LOOKING_INSIDE_TITLE} markdown={about} />
        </div>
      </div>
      {player && place !== undefined &&
        <section className="looking-inside__network" aria-labelledby={networkHeadId}>
          <div className="looking-inside__network-head">
            <h2 id={networkHeadId} className="looking-inside__network-title">The Neural Network</h2>
            <div className="looking-inside__network-tools">
              <ActivationLegend />
              <span className="looking-inside__network-rule" aria-hidden="true" />
              <AnimationControls animated={state} />
            </div>
          </div>
          <div className="looking-inside__diagram" ref={diagramRef}>
            <Observer>
              {() => (
                <NetworkDiagram network={network} pass={passes[place]} scales={scales}
                  outputLabels={alien3Dataset.classificationLabels} scene={player.scene.network}
                  headingId={networkHeadId} interaction={interaction()} />
              )}
            </Observer>
          </div>
          <div className="looking-inside__readout">
            <Observer>
              {() => (
                <ReadoutBox content={contentFor(player, pass!)} candidates={candidates}
                  idle={!ifReached(attention.pinned)} onClear={ifReached(attention.pinned) ? clearReadout : undefined}
                  onHeightChange={setReadoutHeight} />
              )}
            </Observer>
          </div>
        </section>}
      {player &&
        <Observer>
          {() => <WordFlightOverlay time={player.scene.step1Time} words={words} container={layoutElement} />}
        </Observer>}
    </div>
  );
});
