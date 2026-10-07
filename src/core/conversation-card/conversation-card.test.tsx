import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConversationCard } from "./conversation-card";
import { S3Item } from "../types/s3-data";

const conversation: S3Item = {
  id: "361e65b1002a",
  sources: { alien3: [0] },
  text: "yandor quissa\nblikka murrash\naloven sooma nimbar",
  target: 0,
  target_label: "wait",
  pathway_scores: {},
  pathway_variance_fractions: {},
};

function renderCard(position: number, total = 3) {
  const onPrev = jest.fn();
  const onNext = jest.fn();
  render(<ConversationCard conversation={conversation} position={position} total={total}
    onPrev={onPrev} onNext={onNext} />);
  return { onPrev, onNext };
}

describe("ConversationCard", () => {
  it("shows which conversation of how many", () => {
    renderCard(0);
    expect(screen.getByRole("heading", { name: "Conversation" })).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("shows the words as one paragraph", () => {
    renderCard(0);
    expect(screen.getByText("yandor quissa blikka murrash aloven sooma nimbar")).toBeInTheDocument();
  });

  it("can't go back from the first conversation", () => {
    const { onPrev, onNext } = renderCard(0);
    const prev = screen.getByRole("button", { name: "Previous conversation" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    // Not disabled, so it stays in the tab order.
    expect(prev).toBeEnabled();
    fireEvent.click(prev);
    expect(onPrev).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("can't go forward from the last conversation", () => {
    const { onPrev, onNext } = renderCard(2);
    const next = screen.getByRole("button", { name: "Next conversation" });
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("can go both ways from a conversation in the middle", () => {
    const { onPrev, onNext } = renderCard(1);
    const prev = screen.getByRole("button", { name: "Previous conversation" });
    const next = screen.getByRole("button", { name: "Next conversation" });
    expect(prev).toHaveAttribute("aria-disabled", "false");
    expect(next).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("can't go either way when there is only one conversation", () => {
    const { onPrev, onNext } = renderCard(0, 1);
    const prev = screen.getByRole("button", { name: "Previous conversation" });
    const next = screen.getByRole("button", { name: "Next conversation" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });
});
