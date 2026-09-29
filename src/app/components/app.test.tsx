import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import { App } from "./app";
import { VIEWS } from "../views";

// replaceState changes the URL without firing hashchange, so each test controls events itself.
function setUrl(url: string) {
  window.history.replaceState(null, "", url);
}

describe("App", () => {
  afterEach(() => setUrl("/"));

  describe("standalone mode", () => {
    it("lists every view in the nav and selects the first by default", () => {
      setUrl("/");
      render(<App />);
      const nav = screen.getByRole("navigation", { name: "Views" });
      const links = within(nav).getAllByRole("link");
      expect(links.map(link => link.textContent)).toEqual(VIEWS.map(view => view.title));
      expect(within(nav).getByRole("link", { name: "Trace a Case" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("heading", { name: "Trace a Case" })).toBeInTheDocument();
    });

    it("links each nav item to its view hash", () => {
      setUrl("/");
      render(<App />);
      const nav = screen.getByRole("navigation", { name: "Views" });
      expect(within(nav).getByRole("link", { name: "Correlations" })).toHaveAttribute("href", "#view=correlations");
    });

    it("selects the view named in the hash", () => {
      setUrl("/#view=correlations");
      render(<App />);
      expect(screen.getByRole("heading", { name: "Correlations" })).toBeInTheDocument();
      const nav = screen.getByRole("navigation", { name: "Views" });
      expect(within(nav).getByRole("link", { name: "Correlations" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("link", { name: "Trace a Case" })).not.toHaveAttribute("aria-current");
    });

    it("follows hash changes, such as back and forward", () => {
      setUrl("/");
      render(<App />);
      act(() => {
        setUrl("/#view=prediction-chain");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByRole("heading", { name: "Prediction Chain" })).toBeInTheDocument();
    });

    it("selects the first view when the hash has no view key", () => {
      setUrl("/#correlations");
      render(<App />);
      expect(screen.getByRole("heading", { name: "Trace a Case" })).toBeInTheDocument();
    });

    it("keeps the nav and shows an unknown-view message for an unknown hash id", () => {
      setUrl("/#view=nope");
      render(<App />);
      expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
      expect(screen.getByText(/Unknown view "nope"/)).toBeInTheDocument();
    });
  });

  describe("interactive mode", () => {
    it("shows only that view, with no nav", () => {
      setUrl("/?interactive=correlations");
      render(<App />);
      expect(screen.getByRole("heading", { name: "Correlations" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("ignores the standalone hash", () => {
      setUrl("/?interactive=correlations#view=trace-a-case");
      render(<App />);
      expect(screen.getByRole("heading", { name: "Correlations" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("shows an unknown-view message listing the valid ids for an unknown id", () => {
      setUrl("/?interactive=Correlations");
      render(<App />);
      expect(screen.getByText(/Unknown view "Correlations"/)).toBeInTheDocument();
      for (const view of VIEWS) {
        expect(screen.getByText(view.id)).toBeInTheDocument();
      }
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("treats an empty interactive param as an unknown view, not as standalone", () => {
      setUrl("/?interactive=");
      render(<App />);
      expect(screen.getByText(/Unknown view ""/)).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
  });
});
