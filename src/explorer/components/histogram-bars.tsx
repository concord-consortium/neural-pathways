import React from "react";
import "./histogram-bars.scss";

interface HistogramHit {
  /** The calling view's own class, carried alongside the shared one. */
  className: string;
  testId: string;
  /** Native tooltip text for one bar, e.g. from barTitle. */
  title: (index: number, count: number) => string;
}

interface HistogramBarsProps {
  /** One count per bin, in bin order. The bars split the width evenly between them. */
  counts: number[];
  /** Height in user units; the svg then scales to whatever box its class gives it. */
  height: number;
  /**
   * Class for the <svg>. Each view frames and sizes its own chart — a 48px
   * bordered panel and a 20px bare sparkline share nothing there — so the box
   * styling stays in the caller's stylesheet, and only the bars are shared.
   */
  className: string;
  testId?: string;
  /** The calling view's own class for a bar, carried alongside the shared one. */
  barClassName?: string;
  barTestId: string;
  /**
   * Full-height hover targets over the bars. Omitted entirely by a chart with
   * nothing to say on hover, such as the field list's sparkline.
   */
  hit?: HistogramHit;
  /** Names the chart for assistive tech. Without it the chart is presentational. */
  ariaLabel?: string;
}

/**
 * The body of a histogram: one bar per bin, scaled against this chart's OWN
 * peak, never a peak shared with another chart.
 *
 * The shared peak is the tempting mistake and this is the one place to state
 * why it is wrong: a 145-item selection drawn against a 3,000-item baseline on
 * a shared peak flattens the selection into an unreadable line — and the
 * selection is the interesting one. Every caller prints its own n beside the
 * chart, so the size difference stays on screen in the text.
 */
export const HistogramBars: React.FC<HistogramBarsProps> = ({
  counts, height, className, testId, barClassName, barTestId, hit, ariaLabel,
}) => {
  // reduce rather than Math.max(...counts): this codebase has hit the spread
  // argument ceiling before, and a bin count is not worth the risk.
  const peak = counts.reduce((max, count) => (count > max ? count : max), 0);
  const barWidth = counts.length > 0 ? 100 / counts.length : 100;

  return (
    <svg
      className={`explorer-histogram-bars ${className}`}
      data-testid={testId}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
    >
      {counts.map((count, i) => {
        const barHeight = peak === 0 ? 0 : (count / peak) * height;
        return (
          <rect
            key={`bar-${i}`}
            className={`explorer-histogram-bar${barClassName ? ` ${barClassName}` : ""}`}
            data-testid={barTestId}
            x={i * barWidth}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
          />
        );
      })}
      {/* Painted after the bars so they sit on top, and full height so an empty
          bin is still hoverable — "nothing here" is information. */}
      {hit && counts.map((count, i) => (
        <rect
          key={`hit-${i}`}
          className={`explorer-histogram-hit ${hit.className}`}
          data-testid={hit.testId}
          x={i * barWidth}
          y={0}
          width={barWidth}
          height={height}
        >
          <title>{hit.title(i, count)}</title>
        </rect>
      ))}
    </svg>
  );
};
