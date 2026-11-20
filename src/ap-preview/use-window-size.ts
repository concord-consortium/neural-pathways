import { useEffect, useState } from "react";
import { ApWindow } from "./ap-sizing";

function measure(): ApWindow {
  // clientWidth, not innerWidth: like the Activity Player's #app, it leaves out a classic scrollbar.
  return { width: document.documentElement.clientWidth, height: window.innerHeight };
}

/**
 * The window's size as the Activity Player sees it. A scrollbar appearing or going changes
 * clientWidth without a resize event, so a ResizeObserver on the root element watches for that.
 */
export function useWindowSize(): ApWindow {
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const update = () => setSize(previous => {
      const next = measure();
      return next.width === previous.width && next.height === previous.height ? previous : next;
    });
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, []);
  return size;
}
