import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/app";

import "./index.scss";

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  // In development StrictMode runs effects twice, which exposes missing cleanup before views add
  // effects of their own, such as for the AP's interactive API.
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
