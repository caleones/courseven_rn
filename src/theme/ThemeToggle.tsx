import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

import { useThemeMode } from "./ThemeProvider";

const GOLD = "#FFD700";
const TOGGLE_RADIUS = 22;

type Option = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  mode: "light" | "dark";
};

const OPTIONS: Option[] = [
  { icon: "weather-sunny", mode: "light" },
  { icon: "weather-night", mode: "dark" },
];

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface + "CC",
          borderColor: `${GOLD}4D`,
        },
      ]}
    >
      {OPTIONS.map(({ icon, mode: option }) => {
        const isSelected = mode === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => setMode(option)}
            style={[
              styles.option,
              isSelected && {
                backgroundColor: GOLD,
                shadowColor: GOLD,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={isSelected ? "#0D0D0D" : theme.colors.onSurface + "B3"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: TOGGLE_RADIUS,
    borderWidth: 1,
    padding: 4,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: TOGGLE_RADIUS - 2,
    padding: 10,
    minWidth: TOGGLE_RADIUS * 2,
  },
});
