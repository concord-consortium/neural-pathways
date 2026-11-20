import React, { useId, useState } from "react";
import {
  AspectRatioMethod, Column, FixedWidthLayout, SECTION_LAYOUTS, SectionLayout, isResponsive, isTwoColumn,
} from "../ap-sizing";
import { PRESETS, PreviewState, matchingPreset } from "../preview-state";

// LARA's labels, so the settings read as an author sees them (fixed_width_layout.rb:2-11,
// section-layout-utils.ts:31-40, aspect-ratio-chooser.tsx:4-8).
const PAGE_LABELS: Record<FixedWidthLayout, string> = {
  "1100px": "Standard (1100px)",
  "ipad_friendly": "iPad Friendly (960px)",
};
const LAYOUT_LABELS: Record<SectionLayout, string> = {
  "full-width": "full-width (single column)",
  "60-40": "60-40 (primary on left)",
  "40-60": "40-60 (primary on right)",
  "70-30": "70-30 (primary on left)",
  "30-70": "30-70 (primary on right)",
  "responsive-30-70": "responsive-30-70 (primary on right)",
  "responsive-50-50": "responsive-50-50 (primary on right)",
  "responsive-full-width": "responsive-full-width (single column)",
};
const ASPECT_LABELS: Record<AspectRatioMethod, string> = {
  DEFAULT: "Default aspect ratio, or set by interactive",
  MANUAL: "Manually set the native width & height",
  MAX: "Use all available space for the interactive",
};

interface NativeSizeInputProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}

/**
 * A native width or height. What is typed is kept as a draft and applied on blur or Enter, so the
 * field can be cleared and retyped, and the iframe doesn't pass through the sizes typed on the way
 * (typing 800 passes 8, which would make it thousands of pixels tall). A draft that isn't a positive
 * whole number is dropped for the last valid size.
 */
const NativeSizeInput: React.FC<NativeSizeInputProps> = ({ label, value, onCommit }) => {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    if (/^[1-9]\d*$/.test(draft)) onCommit(Number(draft));
    setDraft(null);
  };
  return (
    <div className="ap-preview__field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type="number" min="1" step="1" value={draft ?? value}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); }}
      />
    </div>
  );
};

interface PreviewControlsProps {
  state: PreviewState;
  views: readonly { id: string; title: string }[];
  onChange: (state: PreviewState) => void;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({ state, views, onChange }) => {
  const id = useId();
  const set = (changes: Partial<PreviewState>) => onChange({ ...state, ...changes });
  const preset = matchingPreset(state);
  const responsive = isResponsive(state.layout);

  const choosePreset = (presetId: string) => {
    const chosen = PRESETS.find(p => p.id === presetId);
    if (chosen) set(chosen.settings);
  };

  return (
    <div className="ap-preview__control-rows">
      <div className="ap-preview__row">
        <div className="ap-preview__field">
          <label htmlFor={`${id}-view`}>View</label>
          <select id={`${id}-view`} value={state.viewId} onChange={e => set({ viewId: e.target.value })}>
            {views.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
          </select>
        </div>
        <div className="ap-preview__field">
          <label htmlFor={`${id}-preset`}>Preset</label>
          <select id={`${id}-preset`} value={preset?.id ?? ""} onChange={e => choosePreset(e.target.value)}>
            <option value="">Choose a preset</option>
            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="ap-preview__row">
        <fieldset className="ap-preview__group">
          <legend>Page and section</legend>
          <div className="ap-preview__field">
            <label htmlFor={`${id}-page`}>Activity Page Fixed Width</label>
            <select
              id={`${id}-page`} value={state.fixedWidthLayout} disabled={responsive}
              aria-describedby={responsive ? `${id}-page-note` : undefined}
              onChange={e => set({ fixedWidthLayout: e.target.value as FixedWidthLayout })}
            >
              {Object.entries(PAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {responsive &&
              <span id={`${id}-page-note`} className="ap-preview__note">
                Not used: a responsive section makes the page full width
              </span>}
          </div>
          <div className="ap-preview__field">
            <label htmlFor={`${id}-layout`}>Layout</label>
            <select id={`${id}-layout`} value={state.layout}
              onChange={e => set({ layout: e.target.value as SectionLayout })}>
              {SECTION_LAYOUTS.map(layout => <option key={layout} value={layout}>{LAYOUT_LABELS[layout]}</option>)}
            </select>
          </div>
          {isTwoColumn(state.layout) &&
            <div className="ap-preview__field">
              <label htmlFor={`${id}-column`}>Interactive&apos;s column</label>
              <select id={`${id}-column`} value={state.column}
                onChange={e => set({ column: e.target.value as Column })}>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>}
        </fieldset>

        <fieldset className="ap-preview__group">
          <legend>Interactive</legend>
          <div className="ap-preview__field">
            <label htmlFor={`${id}-aspect`}>Aspect Ratio</label>
            <select id={`${id}-aspect`} value={state.aspectRatioMethod}
              onChange={e => set({ aspectRatioMethod: e.target.value as AspectRatioMethod })}>
              {Object.entries(ASPECT_LABELS).map(([value, label]) =>
                <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {state.aspectRatioMethod === "MANUAL" &&
            <>
              <NativeSizeInput label="Width" value={state.nativeWidth} onCommit={nativeWidth => set({ nativeWidth })} />
              <NativeSizeInput label="Height" value={state.nativeHeight}
                onCommit={nativeHeight => set({ nativeHeight })} />
            </>}
        </fieldset>
      </div>
    </div>
  );
};
