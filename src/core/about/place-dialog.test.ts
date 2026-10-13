import { placeDialog } from "./place-dialog";

const dialog = { width: 400, height: 300 };
const view = { width: 1024, height: 562 };

describe("placeDialog", () => {
  it("hangs the dialog 6 px below the button, right edges aligned, no taller than the room below", () => {
    expect(placeDialog({ right: 1000, bottom: 120 }, dialog, view))
      .toEqual({ top: 126, left: 600, maxHeight: 426 });
  });

  it("keeps it 10 px inside the window's left edge when the button is near it", () => {
    expect(placeDialog({ right: 200, bottom: 120 }, dialog, view))
      .toEqual({ top: 126, left: 10, maxHeight: 426 });
  });

  it("keeps it 10 px inside the window's right edge", () => {
    expect(placeDialog({ right: 1024, bottom: 120 }, dialog, view))
      .toEqual({ top: 126, left: 614, maxHeight: 426 });
  });

  it("keeps a tall dialog below the button, to scroll, while there is room for a useful part of it", () => {
    expect(placeDialog({ right: 1000, bottom: 300 }, { width: 400, height: 600 }, view))
      .toEqual({ top: 306, left: 600, maxHeight: 246 });
  });

  it("moves it up until it fits when there is too little room below the button", () => {
    expect(placeDialog({ right: 1000, bottom: 500 }, dialog, view))
      .toEqual({ top: 252, left: 600, maxHeight: 542 });
  });

  it("moves it up when the button is below the window", () => {
    expect(placeDialog({ right: 1000, bottom: 1400 }, dialog, view))
      .toEqual({ top: 252, left: 600, maxHeight: 542 });
  });

  it("puts a dialog taller than the window at the top margin, as tall as the window allows", () => {
    expect(placeDialog({ right: 1000, bottom: 500 }, { width: 400, height: 900 }, view))
      .toEqual({ top: 10, left: 600, maxHeight: 542 });
  });

  // The page can scroll under a modal dialog, so a resize can find the button above the window.
  it("keeps it inside the window when the button has scrolled above it", () => {
    expect(placeDialog({ right: 1000, bottom: -579 }, dialog, view))
      .toEqual({ top: 10, left: 600, maxHeight: 542 });
  });

  it("puts it at the left margin when the window is narrower than it", () => {
    expect(placeDialog({ right: 300, bottom: 120 }, { width: 300, height: 300 }, { width: 320, height: 562 }))
      .toEqual({ top: 126, left: 10, maxHeight: 426 });
  });
});
