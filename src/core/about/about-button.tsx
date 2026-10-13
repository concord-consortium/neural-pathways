import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { useKeyboardScrollable } from "../use-keyboard-scrollable";
import { CloseIcon, InfoIcon } from "./about-icons";
import { placeDialog } from "./place-dialog";
import "./about-button.scss";

interface AboutButtonProps {
  /** The view's title, as its h1 shows it. The button and the dialog are named from it. */
  title: string;
  /** The view's About text, as markdown. */
  markdown: string;
}

/**
 * A view's About button, and the modal dialog it opens with the view's About text. Whether it is open
 * isn't kept: coming back to the view finds it closed.
 */
export const AboutButton: React.FC<AboutButtonProps> = ({ title, markdown }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const [bodyRef, bodyProps] = useKeyboardScrollable<HTMLDivElement>();
  // The text is HTML set as is, which is safe only because it comes from the views' about.md files,
  // reviewed with the code. Never pass a student's text or the data here.
  const html = useMemo(() => marked.parse(markdown, { async: false }), [markdown]);

  // In the window's coordinates, without its scrollbars, as a top-layer dialog is laid out.
  const place = useCallback(() => {
    const button = buttonRef.current;
    const dialog = dialogRef.current;
    if (!button || !dialog) {
      return;
    }
    const view = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    // Measured without the last placement's limit, which a resize may have outgrown.
    dialog.style.maxHeight = "";
    const { top, left, maxHeight } =
      placeDialog(button.getBoundingClientRect(), dialog.getBoundingClientRect(), view);
    dialog.style.top = `${top}px`;
    dialog.style.left = `${left}px`;
    dialog.style.maxHeight = `${maxHeight}px`;
  }, []);

  // The dialog's content renders with `open`, so it is there to measure and focus. Focus goes to
  // Close, as in the prototype.
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    dialogRef.current?.showModal();
    place();
    closeRef.current?.focus();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, place]);

  // Every way of closing, Escape included, ends here. Focus goes back to About explicitly: Safari
  // doesn't focus a button when it is clicked, so it wouldn't restore focus to it.
  const onClose = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  // A modal dialog makes the rest of the page inert, but Tab past its last control still leaves it,
  // for the browser's own controls, or for the page around an Interactive's iframe. This wraps Tab
  // around the dialog's controls instead, as the prototype does.
  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const stops = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, [tabindex='0']"));
    const first = stops[0];
    const last = stops[stops.length - 1];
    // A click on the text leaves focus on the dialog itself, outside its controls, so Tab starts at
    // one end of them.
    if (!stops.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  // A click on the backdrop lands on the dialog element itself, outside its box.
  const onDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) {
      event.currentTarget.close();
    }
  };

  return (
    <>
      <button ref={buttonRef} type="button" className={`about-button${open ? " about-button--open" : ""}`}
        aria-label={`About ${title}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <InfoIcon className="about-button__icon" />
        About
      </button>
      <dialog ref={dialogRef} className="about-dialog" aria-labelledby={headingId} onClose={onClose}
        onClick={onDialogClick} onKeyDown={onDialogKeyDown}>
        {open &&
          <>
            <div className="about-dialog__header">
              <InfoIcon className="about-dialog__icon" />
              <h2 id={headingId} className="about-dialog__title">About {title}</h2>
              <button ref={closeRef} type="button" className="about-dialog__close" aria-label="Close"
                onClick={() => dialogRef.current?.close()}>
                <CloseIcon />
              </button>
            </div>
            <div ref={bodyRef} className="about-dialog__body" role="group" aria-labelledby={headingId}
              {...bodyProps}
              // eslint-disable-next-line react/no-danger -- reviewed text from the repo: see `html`
              dangerouslySetInnerHTML={{ __html: html }} />
          </>}
      </dialog>
    </>
  );
};
