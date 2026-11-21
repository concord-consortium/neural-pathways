import React from "react";
import { createRoot } from "react-dom/client";
import { ApPreview } from "./components/ap-preview";

import "./ap-preview.scss";

const container = document.getElementById("app");
if (container) {
  createRoot(container).render(<ApPreview />);
}
