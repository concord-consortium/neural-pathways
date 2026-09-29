import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { fetchIndex } from "./data-loader";
import { alien3Dataset } from "./datasets/alien3-dataset";
import { S3Index } from "./types/s3-data";
import { clearDatasetIndexCache, useDatasetIndex } from "./use-dataset-index";

jest.mock("./data-loader", () => ({ fetchIndex: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;

const index: S3Index = { metadata: { fa_fits: {}, review_sets: {} }, items: [] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const Probe: React.FC<{ name: string; onLoaded?: (index: S3Index) => void }> = ({ name, onLoaded }) => {
  const state = useDatasetIndex(alien3Dataset, { onLoaded });
  const text = state.status === "error" ? `error: ${state.error.message}` : state.status;
  return <p>{`${name}: ${text}`}</p>;
};

describe("useDatasetIndex", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    mockedFetchIndex.mockReset();
  });

  it("fetches once for every component that asks", async () => {
    const load = deferred<S3Index>();
    mockedFetchIndex.mockReturnValue(load.promise);
    render(<><Probe name="a" /><Probe name="b" /></>);
    expect(screen.getByText("a: loading")).toBeInTheDocument();
    await act(async () => load.resolve(index));
    expect(screen.getByText("a: ready")).toBeInTheDocument();
    expect(screen.getByText("b: ready")).toBeInTheDocument();
    expect(mockedFetchIndex).toHaveBeenCalledTimes(1);
    expect(mockedFetchIndex).toHaveBeenCalledWith(alien3Dataset);
  });

  it("starts ready once the index has loaded", async () => {
    mockedFetchIndex.mockResolvedValue(index);
    const { unmount: unmountFirst } = render(<Probe name="a" />);
    await screen.findByText("a: ready");
    unmountFirst();
    render(<Probe name="b" />);
    expect(screen.getByText("b: ready")).toBeInTheDocument();
    expect(mockedFetchIndex).toHaveBeenCalledTimes(1);
  });

  it("calls onLoaded with the index on every mount", async () => {
    mockedFetchIndex.mockResolvedValue(index);
    const onLoaded = jest.fn();
    const { unmount: unmountFirst } = render(<Probe name="a" onLoaded={onLoaded} />);
    await screen.findByText("a: ready");
    expect(onLoaded).toHaveBeenCalledWith(index);
    unmountFirst();
    render(<Probe name="b" onLoaded={onLoaded} />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));
  });

  it("doesn't call onLoaded after unmount", async () => {
    const load = deferred<S3Index>();
    mockedFetchIndex.mockReturnValue(load.promise);
    const onLoaded = jest.fn();
    const { unmount } = render(<Probe name="a" onLoaded={onLoaded} />);
    unmount();
    await act(async () => load.resolve(index));
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("shows an error, and fetches again on the next mount", async () => {
    mockedFetchIndex.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(index);
    const { unmount: unmountFirst } = render(<Probe name="a" />);
    expect(await screen.findByText("a: error: boom")).toBeInTheDocument();
    unmountFirst();
    render(<Probe name="b" />);
    expect(await screen.findByText("b: ready")).toBeInTheDocument();
    expect(mockedFetchIndex).toHaveBeenCalledTimes(2);
  });

  it("shows an error when onLoaded throws", async () => {
    mockedFetchIndex.mockResolvedValue(index);
    const onLoaded = jest.fn(() => {
      throw new Error("bad list");
    });
    render(<Probe name="a" onLoaded={onLoaded} />);
    expect(await screen.findByText("a: error: bad list")).toBeInTheDocument();
  });
});
