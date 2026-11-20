import React, { useRef } from "react";
import { ForwardPass } from "../network/forward";
import { NetworkLayout } from "./layout";
import {
  formatActivation, neuronName, NeuronRef, NeuronRings, OUTPUT_ORDER, sameNeuron, unitAt
} from "./neuron";
import { neuronAfterKey } from "./neuron-navigation";

/** How a view takes part in the neurons' hover, focus and pin. */
export interface NeuronInteraction {
  /** Columns 0 to reachedColumns − 1 answer; the rest don't. */
  reachedColumns: number;
  /** The reached neuron holding the Tab stop, or none. */
  tabStop?: NeuronRef;
  rings: NeuronRings;
  onHover(neuron: NeuronRef | undefined): void;
  /**
   * A neuron took focus, or none has it. `visible` is true for keyboard focus, which the ring and the
   * highlight show; a click focuses a neuron too, but only moves the Tab stop.
   */
  onFocusChange(neuron: NeuronRef | undefined, visible: boolean): void;
  onToggle(neuron: NeuronRef): void;
  onClear(): void;
}

/** Each target is this much wider than its circle, so neighbors in a row don't leave a gap. */
const TARGET_EXTRA_WIDTH = 10;

/**
 * Whether an element's focus is keyboard focus: the browser's `:focus-visible`, which a click doesn't
 * set and Tab does. An engine without it counts any focus.
 */
function hasVisibleFocus(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return element === document.activeElement;
  }
}

interface NeuronTargetsProps {
  layout: NetworkLayout;
  pass: ForwardPass;
  outputLabels: Record<number, string>;
  interaction: NeuronInteraction;
}

/**
 * Invisible targets above the drawing, one per neuron, as the prototype draws them: each is one row's
 * pitch tall so that moving down a column doesn't flicker. A reached neuron's target is a button;
 * the rest are hidden from assistive technology and answer nothing. Each output pill is a further
 * mouse target for its neuron. The reached neurons are one Tab stop (a roving tabindex), and the
 * arrow keys move between them.
 */
export const NeuronTargets: React.FC<NeuronTargetsProps> = ({ layout, pass, outputLabels, interaction }) => {
  const layerRef = useRef<SVGGElement>(null);
  const lastColumn = layout.nodes.length - 1;
  const { reachedColumns, tabStop, rings, onHover, onFocusChange, onToggle, onClear } = interaction;

  const focusNeuron = (neuron: NeuronRef) => {
    const selector = `[data-column="${neuron.column}"][data-unit="${neuron.unit}"]`;
    layerRef.current?.querySelector<SVGGElement>(selector)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, neuron: NeuronRef) => {
    // Leave browser and OS shortcuts such as Alt+Left (Back) alone.
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    // A key pressed on a neuron a click focused makes its focus keyboard focus, as browsers do for
    // :focus-visible, so the ring shows where the keys act.
    onFocusChange(neuron, true);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(neuron);
    } else if (event.key === "Escape") {
      onClear();
    } else {
      const next = neuronAfterKey(neuron, event.key, layout, reachedColumns);
      if (next) {
        event.preventDefault();
        focusNeuron(next);
      }
    }
  };

  const targets: React.ReactElement[] = [];
  layout.nodes.forEach((column, c) => {
    column.forEach((node, row) => {
      const unit = unitAt(c, row, lastColumn);
      const neuron: NeuronRef = { column: c, unit };
      const pitch = column.length > 1 ? column[1].y - column[0].y : layout.radius * 4;
      const reached = c < reachedColumns;
      const value = pass.layers[c][unit];
      const rect = (
        <rect data-testid={`neuron-target-${c}-${unit}`}
          className={reached ? "network-diagram__target network-diagram__target--reached" : "network-diagram__target"}
          x={node.x - layout.radius - TARGET_EXTRA_WIDTH / 2} y={node.y - pitch / 2}
          width={layout.radius * 2 + TARGET_EXTRA_WIDTH} height={pitch}
          fill="transparent" pointerEvents="all"
          onClick={event => {
            event.stopPropagation();
            if (reached) {
              onToggle(neuron);
            }
          }}>
          <title>
            {reached ? `Activation: ${formatActivation(value)}` : neuronName(neuron, lastColumn, outputLabels)}
          </title>
        </rect>
      );
      targets.push(reached ? (
        <g key={`${c}-${unit}`} role="button" aria-pressed={sameNeuron(rings.pinned, neuron)}
          aria-label={`${neuronName(neuron, lastColumn, outputLabels)}, activation ${formatActivation(value)}`}
          tabIndex={sameNeuron(tabStop, neuron) ? 0 : -1} data-column={c} data-unit={unit}
          onPointerEnter={() => onHover(neuron)} onPointerLeave={() => onHover(undefined)}
          onFocus={event => onFocusChange(neuron, hasVisibleFocus(event.currentTarget))}
          onBlur={() => onFocusChange(undefined, false)}
          onKeyDown={event => onKeyDown(event, neuron)}>
          {rect}
        </g>
      ) : (
        <g key={`${c}-${unit}`} aria-hidden="true">{rect}</g>
      ));
    });
  });

  return (
    <g ref={layerRef} className="network-diagram__targets">
      {targets}
      {layout.pills.map((box, row) => {
        const unit = OUTPUT_ORDER[row];
        const neuron: NeuronRef = { column: lastColumn, unit };
        const reached = lastColumn < reachedColumns;
        return (
          <rect key={`pill-${unit}`} data-testid={`pill-target-${unit}`} aria-hidden="true"
            className={reached ? "network-diagram__target network-diagram__target--reached" : "network-diagram__target"}
            x={box.x} y={box.y} width={box.width} height={box.height}
            fill="transparent" pointerEvents="all"
            onPointerEnter={reached ? () => onHover(neuron) : undefined}
            onPointerLeave={reached ? () => onHover(undefined) : undefined}
            onClick={event => {
              event.stopPropagation();
              if (reached) {
                onToggle(neuron);
              }
            }} />
        );
      })}
    </g>
  );
};
