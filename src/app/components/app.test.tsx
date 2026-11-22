import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import { App } from "./app";
import { VIEWS } from "../views";
import { AppState } from "../state/app-state";

// Looking Inside a Neural Network, the default view, loads the messages. Leave them loading: these
// tests are about the app shell, not the view.
jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn(() => new Promise(() => undefined)) }));

// replaceState changes the URL without firing hashchange, so each test controls events itself.
function setUrl(url: string) {
  window.history.replaceState(null, "", url);
}

describe("App", () => {
  afterEach(() => setUrl("/"));

  describe("standalone mode", () => {
    it("lists every view in the nav and selects the first by default", () => {
      setUrl("/");
      render(<App appState={new AppState()} />);
      const nav = screen.getByRole("navigation", { name: "Views" });
      const links = within(nav).getAllByRole("link");
      expect(links.map(link => link.textContent)).toEqual(VIEWS.map(view => view.title));
      expect(within(nav).getByRole("link", { name: "Looking Inside a Neural Network" }))
        .toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("heading", { name: "Looking Inside a Neural Network" })).toBeInTheDocument();
    });

    it("shows the view's title as its h1", () => {
      setUrl("/");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("heading", { level: 1, name: "Looking Inside a Neural Network" })).toBeInTheDocument();
    });

    it("links each nav item to its view hash", () => {
      setUrl("/");
      render(<App appState={new AppState()} />);
      const nav = screen.getByRole("navigation", { name: "Views" });
      expect(within(nav).getByRole("link", { name: "Correlations" })).toHaveAttribute("href", "#view=correlations");
    });

    it("selects the view named in the hash", () => {
      setUrl("/#view=correlations");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("heading", { name: "Correlations" })).toBeInTheDocument();
      const nav = screen.getByRole("navigation", { name: "Views" });
      expect(within(nav).getByRole("link", { name: "Correlations" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("link", { name: "Looking Inside a Neural Network" }))
        .not.toHaveAttribute("aria-current");
    });

    it("follows hash changes, such as back and forward", () => {
      setUrl("/");
      render(<App appState={new AppState()} />);
      act(() => {
        setUrl("/#view=model-reasoning");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(screen.getByRole("heading", { name: "Neural Pathway View of Model Reasoning" })).toBeInTheDocument();
    });

    it("starts a newly selected view at the top and announces it", () => {
      setUrl("/");
      render(<App appState={new AppState()} />);
      const main = screen.getByRole("main");
      main.scrollTop = 200;
      act(() => {
        setUrl("/#view=correlations");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(main.scrollTop).toBe(0);
      expect(screen.getByRole("status")).toHaveTextContent("Correlations");
    });

    it("titles the page after the selected view", () => {
      setUrl("/#view=correlations");
      render(<App appState={new AppState()} />);
      expect(document.title).toBe("Correlations – Neural Pathways");
      act(() => {
        setUrl("/#view=nope");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(document.title).toBe("Neural Pathways");
    });

    it("selects the first view when the hash has no view key", () => {
      setUrl("/#correlations");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("heading", { name: "Looking Inside a Neural Network" })).toBeInTheDocument();
    });

    it("keeps the nav and shows an unknown-view message for an unknown hash id", () => {
      setUrl("/#view=nope");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
      expect(screen.getByText(/Unknown view "nope"/)).toBeInTheDocument();
    });
  });

  describe("interactive mode", () => {
    it("shows only that view, with no nav", () => {
      setUrl("/?interactive=correlations");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("button", { name: "About Correlations" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("leaves the view's title out, since the Activity Player's title bar names it", () => {
      for (const view of VIEWS) {
        setUrl(`/?interactive=${view.id}`);
        const { unmount } = render(<App appState={new AppState()} />);
        expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
        unmount();
      }
    });

    it("titles the page after the view", () => {
      setUrl("/?interactive=correlations");
      render(<App appState={new AppState()} />);
      expect(document.title).toBe("Correlations – Neural Pathways");
    });

    it("ignores the standalone hash", () => {
      setUrl("/?interactive=correlations#view=looking-inside");
      render(<App appState={new AppState()} />);
      expect(screen.getByRole("button", { name: "About Correlations" })).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("shows an unknown-view message listing the valid ids for an unknown id", () => {
      setUrl("/?interactive=Correlations");
      render(<App appState={new AppState()} />);
      expect(screen.getByText(/Unknown view "Correlations"/)).toBeInTheDocument();
      for (const view of VIEWS) {
        expect(screen.getByText(view.id)).toBeInTheDocument();
      }
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("treats an empty interactive param as an unknown view, not as standalone", () => {
      setUrl("/?interactive=");
      render(<App appState={new AppState()} />);
      expect(screen.getByText(/Unknown view ""/)).toBeInTheDocument();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });
  });
});
