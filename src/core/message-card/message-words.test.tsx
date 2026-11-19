import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageWords } from "./message-words";

describe("MessageWords", () => {
  it("puts each word in its own span", () => {
    render(<MessageWords text={"yandor quissa\nblikka"} />);
    for (const word of ["yandor", "quissa", "blikka"]) {
      expect(screen.getByText(word)).toBeInstanceOf(HTMLSpanElement);
    }
  });

  it("reads as one paragraph, one space between words", () => {
    render(<MessageWords text={"yandor  quissa\n\nblikka\tmurrash"} />);
    expect(screen.getByRole("paragraph"))
      .toHaveTextContent(/^yandor quissa blikka murrash$/, { normalizeWhitespace: false });
  });
});
