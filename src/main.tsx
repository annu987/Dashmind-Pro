import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Root Element Check
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Create Root
const root = ReactDOM.createRoot(rootElement);

// Render App
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);