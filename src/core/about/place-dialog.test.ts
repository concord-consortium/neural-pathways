import { placeDialog } from "./place-dialog";

const dialog = { width: 400, height: 300 };
const view = { width: 1024, height: 562 };

describe("placeDialog", () => {
  it("hangs the dialog 6 px below the button, right edges aligned", () => {
    expect(placeDialog({ right: 1000, bottom: 120 }, dialog, view)).toEqual({ top: 126, left: 600 });
  });

  it("keeps it 10 px inside the window's left edge when the button is near it", () => {
    expect(placeDialog({ right: 200, bottom: 120 }, dialog, view)).toEqual({ top: 126, left: 10 });
  });

  it("keeps it 10 px inside the window's right edge", () => {
    expect(placeDialog({ right: 1024, bottom: 120 }, dialog, view)).toEqual({ top: 126, left: 614 });
  });

  it("moves it up until it fits when the button is too low", () => {
    expect(placeDialog({ right: 1000, bottom: 500 }, dialog, view)).toEqual({ top: 252, left: 600 });
  });

  it("moves it up when the button is below the window", () => {
    expect(placeDialog({ right: 1000, bottom: 1400 }, dialog, view)).toEqual({ top: 252, left: 600 });
  });

  it("never puts it above the window's top margin", () => {
    expect(placeDialog({ right: 1000, bottom: 120 }, { width: 400, height: 600 }, view))
      .toEqual({ top: 10, left: 600 });
  });

  it("puts it at the left margin when the window is narrower than it", () => {
    expect(placeDialog({ right: 300, bottom: 120 }, { width: 300, height: 300 }, { width: 320, height: 562 }))
      .toEqual({ top: 126, left: 10 });
  });
});
