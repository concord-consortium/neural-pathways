import React from "react";
import { ApSettings, ApSize, isTwoColumn, primaryOnLeft } from "../ap-sizing";

interface ApPageProps {
  settings: ApSettings;
  size: ApSize;
  viewId: string;
  viewTitle: string;
}

/**
 * A copy of the Activity Player's page around one managed interactive: the page, the section and
 * its columns at their real widths, and the interactive's title bar, iframe and buttons. Nothing is scaled
 * to fit; a page wider than the window scrolls sideways, as the Activity Player's does.
 */
export const ApPage: React.FC<ApPageProps> = ({ settings, size, viewId, viewTitle }) => {
  const twoColumn = isTwoColumn(settings.layout);
  const column = twoColumn ? settings.column : "primary";

  const interactive = (
    <div className="ap-page__column" style={{ width: size.columnWidth }}>
      <div className="ap-page__interactive" style={{ width: size.iframeWidth }}>
        <div className="ap-page__bar"><h2>{viewTitle}</h2></div>
        <iframe
          src={`index.html?interactive=${viewId}`}
          title={viewTitle}
          style={{ width: size.iframeWidth, height: size.iframeHeight }}
        />
        <div className="ap-page__buttons" />
      </div>
    </div>
  );

  let section = interactive;
  if (twoColumn) {
    const other = column === "primary" ? "secondary" : "primary";
    const otherWidth = other === "primary" ? size.primaryWidth : size.secondaryWidth ?? 0;
    const placeholder = (
      <div className="ap-page__column ap-page__other" style={{ width: otherWidth }}>
        {other === "primary" ? "Primary column" : "Secondary column"}
      </div>
    );
    const interactiveFirst = (column === "primary") === primaryOnLeft(settings.layout);
    section = interactiveFirst ? <>{interactive}{placeholder}</> : <>{placeholder}{interactive}</>;
  }

  return (
    <div className="ap-page">
      <div className="ap-page__activity" style={{ width: size.pageWidth ?? undefined }}>
        <div className="ap-page__section">{section}</div>
      </div>
    </div>
  );
};
