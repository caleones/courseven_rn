import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import AuthFlow from "./src/AuthFlow";

import { DIProvider } from "./src/core/di/DIProvider";
import { AuthProvider } from "./src/features/auth/presentation/context/authContext";
import { ProductProvider } from "./src/features/products/presentation/context/productContext";
import { ThemeProvider, useThemeMode } from "./src/theme/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, isDarkMode } = useThemeMode();

  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
      primary: theme.colors.primary,
      notification: theme.colors.error,
    },
  };

  return (
    <DIProvider>
      <AuthProvider>
        <ProductProvider>
          <NavigationContainer theme={navigationTheme}>
            <AuthFlow />
          </NavigationContainer>
        </ProductProvider>
      </AuthProvider>
    </DIProvider>
  );
}