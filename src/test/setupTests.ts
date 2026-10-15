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
