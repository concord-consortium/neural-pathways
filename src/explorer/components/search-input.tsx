import React, { useState, useRef, useEffect } from "react";
import "./search-input.scss";

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  hasError?: boolean;
  numPathways?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  query, onQueryChange, hasError, numPathways,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHelp) return;
    const handleClick = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showHelp]);

  const pathwayRange = numPathways
    ? `pathway_0 through pathway_${numPathways - 1}`
    : "pathway_0, pathway_1, ...";

  return (
    <div className={`search-input-container${hasError ? " search-input-error" : ""}`}>
      <input
        className="search-input-field"
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder="stars:5 AND pathway_0:>0.8"
      />
      <div className="search-input-help-wrapper" ref={helpRef}>
        <button
          className="search-input-help-button"
          onClick={() => setShowHelp(!showHelp)}
          aria-label="Search help"
          title="Search help"
        >
          ?
        </button>
        {showHelp && (
          <div className="search-input-help-dialog">
            <h3>Search Syntax</h3>
            <p>
              Uses <a href="https://github.com/gajus/liqe" target="_blank" rel="noreferrer">liqe</a> (Lucene-like) query syntax.
            </p>

            <h4>Fields</h4>
            <table>
              <tbody>
                <tr><td><code>text</code></td><td>Review text</td></tr>
                <tr><td><code>stars</code></td><td>Business rating (1-5)</td></tr>
                <tr><td><code>review_stars</code></td><td>Review rating (1-5)</td></tr>
                <tr><td><code>name</code></td><td>Business name</td></tr>
                <tr><td><code>city</code></td><td>City</td></tr>
                <tr><td><code>state</code></td><td>State</td></tr>
                <tr><td><code>categories</code></td><td>Business categories</td></tr>
                <tr><td><code>target_label</code></td><td>Classification label</td></tr>
                <tr><td><code>{pathwayRange}</code></td><td>Pathway scores (current fit)</td></tr>
                <tr><td><code>reconstruction_r2</code></td><td>Reconstruction R²</td></tr>
                <tr><td><code>has_word_scores</code></td><td>Has word scores for current fit (true/false)</td></tr>
              </tbody>
            </table>

            <h4>Operators</h4>
            <table>
              <tbody>
                <tr><td><code>field:value</code></td><td>Equals</td></tr>
                <tr><td><code>field:&gt;value</code></td><td>Greater than</td></tr>
                <tr><td><code>field:&gt;=value</code></td><td>Greater or equal</td></tr>
                <tr><td><code>field:&lt;value</code></td><td>Less than</td></tr>
                <tr><td><code>field:&lt;=value</code></td><td>Less or equal</td></tr>
                <tr><td><code>field:[a TO b]</code></td><td>Inclusive range</td></tr>
              </tbody>
            </table>

            <h4>Boolean</h4>
            <table>
              <tbody>
                <tr><td><code>AND</code></td><td>Both conditions</td></tr>
                <tr><td><code>OR</code></td><td>Either condition</td></tr>
                <tr><td><code>NOT</code></td><td>Negate condition</td></tr>
                <tr><td><code>()</code></td><td>Group conditions</td></tr>
              </tbody>
            </table>

            <h4>Examples</h4>
            <ul>
              <li><code>stars:5 AND pathway_0:&gt;0.8</code></li>
              <li><code>categories:Restaurant AND city:Phoenix</code></li>
              <li><code>text:pizza AND pathway_1:&gt;0.5</code></li>
              <li><code>review_stars:[1 TO 2] AND NOT target_label:positive</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
