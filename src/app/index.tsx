import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/app";
import { AppState } from "./state/app-state";

import "./index.scss";

const container = document.getElementById("app");
if (container) {
  // One AppState for the life of the page. It is created here, outside React, because its
  // constructor registers a root store and StrictMode runs a useState initializer twice.
  const appState = new AppState();
  const root = createRoot(container);
  // In development StrictMode runs effects twice, which exposes missing cleanup before views add
  // effects of their own, such as for the AP's interactive API.
  root.render(
    <React.StrictMode>
      <App appState={appState} />
    </React.StrictMode>
  );
}
