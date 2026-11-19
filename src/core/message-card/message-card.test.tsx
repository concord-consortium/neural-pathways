import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MessageCard } from "./message-card";

const noop = () => undefined;

function card(position: number, total = 3, handlers = { onPrev: noop, onNext: noop }) {
  return (
    <MessageCard position={position} total={total} onPrev={handlers.onPrev} onNext={handlers.onNext}>
      <p>The body</p>
    </MessageCard>
  );
}

function renderCard(position: number, total = 3) {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  const view = render(card(position, total, { onPrev, onNext }));
  return { ...view, onPrev, onNext };
}

describe("MessageCard", () => {
  it("shows which message of how many, and says it to screen readers", () => {
    renderCard(0);
    expect(screen.getByRole("heading", { name: "Message" })).toBeInTheDocument();
    // The visual count is hidden from screen readers; the status says it in words instead.
    expect(screen.getByText("1 / 3")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Message 1 of 3");
  });

  it("shows its body", () => {
    renderCard(0);
    expect(screen.getByText("The body")).toBeInTheDocument();
  });

  it("updates the same status when the message changes, so it is announced", () => {
    const { rerender } = renderCard(0);
    const status = screen.getByRole("status");
    rerender(card(1));
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("Message 2 of 3");
  });

  it("keeps focus on Next while stepping", () => {
    const { rerender } = renderCard(0);
    const next = screen.getByRole("button", { name: "Next message" });
    next.focus();
    rerender(card(1));
    expect(screen.getByRole("button", { name: "Next message" })).toBe(next);
    expect(next).toHaveFocus();
  });

  it("can't go back from the first message", () => {
    const { onPrev, onNext } = renderCard(0);
    const prev = screen.getByRole("button", { name: "Previous message" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    // Not disabled, so it stays in the tab order.
    expect(prev).toBeEnabled();
    fireEvent.click(prev);
    expect(onPrev).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("can't go forward from the last message", () => {
    const { onPrev, onNext } = renderCard(2);
    const next = screen.getByRole("button", { name: "Next message" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Previous message" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("can go both ways from a message in the middle", () => {
    const { onPrev, onNext } = renderCard(1);
    const prev = screen.getByRole("button", { name: "Previous message" });
    const next = screen.getByRole("button", { name: "Next message" });
    expect(prev).toHaveAttribute("aria-disabled", "false");
    expect(next).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("can't go either way when there is only one message", () => {
    const { onPrev, onNext } = renderCard(0, 1);
    const prev = screen.getByRole("button", { name: "Previous message" });
    const next = screen.getByRole("button", { name: "Next message" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  describe("with no messages", () => {
    it("says nothing matches, in place of the header and body", () => {
      renderCard(-1, 0);
      expect(screen.getByRole("region", { name: "Message" }))
        .toHaveTextContent("No messages match that search.");
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText("The body")).not.toBeInTheDocument();
    });

    it("keeps the status, empty, so the change to and from it is announced", () => {
      const { rerender } = renderCard(0);
      const status = screen.getByRole("status");
      rerender(card(-1, 0));
      expect(screen.getByRole("status")).toBe(status);
      expect(status.textContent).toBe("");
      rerender(card(0));
      expect(status).toHaveTextContent("Message 1 of 3");
    });
  });
});
