import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  </ErrorBoundary>
);