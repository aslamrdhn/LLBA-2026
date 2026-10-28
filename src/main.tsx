import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./firebase.ts";
import { UiModeProvider } from "./context/UiModeContext.tsx";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  });
}

// Suppress benign Firebase popup closure rejections from bubbling as uncaught errors
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (
    reason?.code === "auth/popup-closed-by-user" ||
    reason?.code === "auth/cancelled-popup-request" ||
    (typeof reason?.message === "string" &&
      (reason.message.includes("auth/popup-closed-by-user") ||
        reason.message.includes("auth/cancelled-popup-request")))
  ) {
    event.preventDefault();
    console.info("Firebase Auth popup closed or cancelled by user.");
  }
});

import { AppProviders } from "./providers.tsx";

// --- API Interceptor for CSRF & 401 Handing ---
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, "fetch", {
    configurable: true,
    writable: true,
    enumerable: true,
    value: async function (...args: any[]) {
      const [resource, rawConfig] = args;
      let config = rawConfig;

      if (typeof resource === "string" && resource.startsWith("/api/")) {
        config = config || {};
        config.credentials = "include";

        // Attach CSRF token for mutations
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
        const csrfToken = csrfMatch ? csrfMatch[1] : null;

        const headers = new Headers(config.headers);
        const jwtToken = localStorage.getItem("ledgerline_jwt_token");
        if (jwtToken && jwtToken !== "null" && jwtToken !== "undefined") {
          headers.set("Authorization", `Bearer ${jwtToken}`);
        } else {
          headers.delete("Authorization");
        }

        if (
          config.method &&
          !["GET", "HEAD", "OPTIONS", "TRACE"].includes(
            config.method.toUpperCase(),
          )
        ) {
          if (csrfToken) {
            headers.set("x-csrf-token", csrfToken);
          }
        }
        config.headers = headers;

        let response = await originalFetch(resource, config);

        // Transparent token refresh
        if (
          response.status === 401 &&
          resource.startsWith("/api/") &&
          resource !== "/api/login" &&
          resource !== "/api/refresh-token" &&
          resource !== "/api/google-auth"
        ) {
          const refreshRes = await originalFetch("/api/refresh-token", {
            method: "POST",
            credentials: "include",
          });
          if (refreshRes.ok) {
            // Retry the original request implicitly
            response = await originalFetch(resource, config);
          } else {
            // If refresh fails, optionally trigger logout
            window.dispatchEvent(new Event("auth-expired"));
          }
        }

        return response;
      }

      return await originalFetch(args[0], args[1]);
    },
  });
} catch (e) {
  console.warn("Could not modify window.fetch for credentials", e);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <UiModeProvider>
        <App />
      </UiModeProvider>
    </AppProviders>
  </StrictMode>,
);
