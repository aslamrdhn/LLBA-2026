import React, { StrictMode } from "react";
import { UiModeProvider } from "../context/UiModeContext";
import { AppProviders as RootProviders } from "../providers";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <RootProviders>
      <UiModeProvider>{children}</UiModeProvider>
    </RootProviders>
  );
}
