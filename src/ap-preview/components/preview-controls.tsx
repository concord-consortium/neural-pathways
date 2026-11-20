import React, { useId } from "react";
import {
  ApSettings, AspectRatioMethod, Column, FixedWidthLayout, SECTION_LAYOUTS, SectionLayout, isResponsive, isTwoColumn,
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
  const setNative = (key: keyof Pick<ApSettings, "nativeWidth" | "nativeHeight">, value: string) => {
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) set({ [key]: n });
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
              <div className="ap-preview__field">
                <label htmlFor={`${id}-width`}>Width</label>
                <input id={`${id}-width`} type="number" min="1" step="1" value={state.nativeWidth}
                  onChange={e => setNative("nativeWidth", e.target.value)} />
              </div>
              <div className="ap-preview__field">
                <label htmlFor={`${id}-height`}>Height</label>
                <input id={`${id}-height`} type="number" min="1" step="1" value={state.nativeHeight}
                  onChange={e => setNative("nativeHeight", e.target.value)} />
              </div>
            </>}
        </fieldset>
      </div>
    </div>
  );
};
