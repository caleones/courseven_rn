import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { MD3Theme, PaperProvider } from "react-native-paper";

import { darkTheme, lightTheme } from "./theme";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDarkMode: boolean;
  theme: MD3Theme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeContextValue | undefined>(undefined);

const resolveInitialMode = (systemScheme: ReturnType<typeof useColorScheme>): ThemeMode => {
  if (systemScheme === "light" || systemScheme === "dark") {
    return systemScheme;
  }
  // Default to dark to mirror the Flutter experience.
  return "dark";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() => resolveInitialMode(systemScheme));

  const theme = mode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      mode,
      isDarkMode: mode === "dark",
      theme,
      setMode,
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode, theme],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
}
