import React from "react";
import ReactDOM from "react-dom/client";
import FloorCritic from "./FloorCritic.jsx";

// Reset default margins
const style = document.createElement("style");
style.textContent = `
  html, body { margin: 0; padding: 0; background: #0a0a0f; overscroll-behavior: none; }
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FloorCritic />
  </React.StrictMode>
);
