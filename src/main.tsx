import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: "red"}}><h1>Error:</h1><pre>{this.state.error.message}</pre><pre>{this.state.error.stack}</pre></div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(<ErrorBoundary><App /></ErrorBoundary>);
