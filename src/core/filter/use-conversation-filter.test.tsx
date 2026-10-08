import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { observer } from "mobx-react-lite";
import { SharedState } from "../state/shared-state";
import { ViewStateProvider } from "../state/view-state-context";
import { conversationFilterFor } from "./conversation-filter";
import { FilterBar } from "./filter-bar";
import { useConversationFilter } from "./use-conversation-filter";
import { filterTestIndex } from "./__fixtures__/filter-test-index";

const filter = conversationFilterFor(filterTestIndex());

const Probe = observer(function Probe() {
  const { ids, bar } = useConversationFilter(filter);
  return (
    <>
      <FilterBar {...bar} />
      <output data-testid="ids">{ids.join(",")}</output>
    </>
  );
});

function showProbe(shared: SharedState) {
  return render(
    <ViewStateProvider viewId="probe" view={undefined} shared={shared}>
      <Probe />
    </ViewStateProvider>,
  );
}

const input = () => screen.getByRole("textbox", { name: "Filter" });
const shownIds = () => screen.getByTestId("ids").textContent;
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });

describe("useConversationFilter", () => {
  it("shows every conversation when no query is set", () => {
    showProbe(new SharedState({}));
    expect(shownIds()).toBe("aaa111,bbb222,ccc333,ddd444");
    expect(input()).toHaveAccessibleDescription("4");
    expect(input()).toHaveValue("");
  });

  it("shows the stored query's matches", () => {
    showProbe(new SharedState({ query: "model_correct:0" }));
    expect(shownIds()).toBe("bbb222,ddd444");
    expect(input()).toHaveAccessibleDescription("2 of 4");
    expect(input()).toHaveValue("model_correct:0");
  });

  it("follows the text as it is typed, without storing it or moving the conversation", () => {
    const shared = new SharedState({ conversationId: "ccc333" });
    showProbe(shared);
    type("yandor");
    expect(shownIds()).toBe("aaa111,bbb222,ddd444");
    expect(input()).toHaveAccessibleDescription("3 of 4");
    expect(shared.query).toBeUndefined();
    expect(shared.queryDraft).toBe("yandor");
    expect(shared.conversationId).toBe("ccc333");
  });

  it("shows an unreadable draft's error over the stored query's matches", () => {
    showProbe(new SharedState({ query: "model_correct:0" }));
    type("model_correct:0 AND (");
    expect(input()).toHaveAccessibleDescription("Incomplete query");
    expect(shownIds()).toBe("bbb222,ddd444");
  });

  it("shows a stored query's error, with every conversation, when it can't be read", () => {
    showProbe(new SharedState({ query: "bogus:1" }));
    expect(input()).toHaveAccessibleDescription("Unknown field: bogus");
    expect(shownIds()).toBe("aaa111,bbb222,ccc333,ddd444");
  });

  it("shows a readable draft's matches over a stored query that can't be read", () => {
    showProbe(new SharedState({ query: "bogus:1" }));
    type("n:2");
    expect(input()).toHaveAccessibleDescription("1 of 4");
    expect(shownIds()).toBe("bbb222");
  });

  it("stores the draft and corrects the conversation on Enter", () => {
    const shared = new SharedState({ conversationId: "ccc333" });
    showProbe(shared);
    type("yandor");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(shared.query).toBe("yandor");
    expect(shared.queryDraft).toBeUndefined();
    expect(shared.conversationId).toBe("aaa111");
  });

  it("stores the draft on blur", () => {
    const shared = new SharedState({});
    showProbe(shared);
    type("n:2");
    fireEvent.blur(input());
    expect(shared.query).toBe("n:2");
  });

  it("stores nothing on blur when the box wasn't edited, so an unset query stays unset", () => {
    const shared = new SharedState({});
    showProbe(shared);
    fireEvent.blur(input());
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(shared.query).toBeUndefined();
  });

  it("stores a cleared box as an empty query, showing every conversation", () => {
    const shared = new SharedState({ query: "n:2" });
    showProbe(shared);
    type("");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(shared.query).toBe("");
    expect(shownIds()).toBe("aaa111,bbb222,ccc333,ddd444");
  });

  it("doesn't store a draft it can't read, and keeps it", () => {
    const shared = new SharedState({ query: "n:2" });
    showProbe(shared);
    type("(n:3");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(shared.query).toBe("n:2");
    expect(shared.queryDraft).toBe("(n:3");
    expect(input()).toHaveValue("(n:3");
  });

  it("puts the stored query back on Escape", () => {
    const shared = new SharedState({ query: "n:2" });
    showProbe(shared);
    type("(n:3");
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(shared.queryDraft).toBeUndefined();
    expect(input()).toHaveValue("n:2");
    expect(shownIds()).toBe("bbb222");
  });

  it("shows a draft left by another view", () => {
    const shared = new SharedState({});
    shared.setQueryDraft("(n:3");
    showProbe(shared);
    expect(input()).toHaveValue("(n:3");
    expect(input()).toHaveAccessibleDescription("Incomplete query");
  });
});
