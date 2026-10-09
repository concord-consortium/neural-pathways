import React from "react";
import { render, screen } from "@testing-library/react";
import { ConversationWords } from "./conversation-words";

describe("ConversationWords", () => {
  it("puts each word in its own span", () => {
    render(<ConversationWords text={"yandor quissa\nblikka"} />);
    for (const word of ["yandor", "quissa", "blikka"]) {
      expect(screen.getByText(word)).toBeInstanceOf(HTMLSpanElement);
    }
  });

  it("reads as one paragraph, one space between words", () => {
    render(<ConversationWords text={"yandor  quissa\n\nblikka\tmurrash"} />);
    expect(screen.getByRole("paragraph"))
      .toHaveTextContent(/^yandor quissa blikka murrash$/, { normalizeWhitespace: false });
  });
});
