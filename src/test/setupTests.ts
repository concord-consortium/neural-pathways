import "@testing-library/jest-dom";

// jsdom has <dialog> but none of its methods. These do what the browser's do, short of the top layer.
// Tests in the node environment have no DOM at all.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom has no PointerEvent, and the plain Event that stands in for it drops `relatedTarget`, which
// says where the pointer went. A MouseEvent keeps it.
if (typeof window !== "undefined") {
  window.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
}
