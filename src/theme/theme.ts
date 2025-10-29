import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

const GOLD = "#FFD700";
const DARK_GOLD = "#B8860B";
const LIGHT_GOLD = "#FFF8DC";
const PREMIUM_BLACK = "#0D0D0D";
const PREMIUM_WHITE = "#FAFAFA";
const DARK_GREY = "#242424";
const SOFT_GREY = "#F5F5F5";
const MEDIUM_GREY = "#757575";

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: GOLD,
    onPrimary: PREMIUM_BLACK,
    primaryContainer: LIGHT_GOLD,
    onPrimaryContainer: PREMIUM_BLACK,
    secondary: DARK_GOLD,
    onSecondary: PREMIUM_WHITE,
    secondaryContainer: "#FFE7A3",
    onSecondaryContainer: PREMIUM_BLACK,
    background: SOFT_GREY,
    onBackground: PREMIUM_BLACK,
    surface: PREMIUM_WHITE,
    onSurface: PREMIUM_BLACK,
    surfaceVariant: "#E6E6E6",
    onSurfaceVariant: MEDIUM_GREY,
    outline: "#D0B46F",
    outlineVariant: "#E6D7A7",
    inverseSurface: PREMIUM_BLACK,
    inverseOnSurface: PREMIUM_WHITE,
    shadow: "#000000",
    scrim: "#000000",
    error: "#D32F2F",
    onError: PREMIUM_WHITE,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: GOLD,
    onPrimary: PREMIUM_BLACK,
    primaryContainer: "#665400",
    onPrimaryContainer: LIGHT_GOLD,
    secondary: LIGHT_GOLD,
    onSecondary: PREMIUM_BLACK,
    secondaryContainer: "#3A3000",
    onSecondaryContainer: LIGHT_GOLD,
    background: PREMIUM_BLACK,
    onBackground: PREMIUM_WHITE,
    surface: DARK_GREY,
    onSurface: PREMIUM_WHITE,
    surfaceVariant: "#1A1A1A",
    onSurfaceVariant: "#D3D3D3",
    outline: "#574B1A",
    outlineVariant: "#332B10",
    inverseSurface: PREMIUM_WHITE,
    inverseOnSurface: PREMIUM_BLACK,
    shadow: "#000000",
    scrim: "#000000",
    error: "#CF6679",
    onError: PREMIUM_BLACK,
  },
};