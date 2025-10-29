import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";

export default function CalendarScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Calendario
          </Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
            Funcionalidad próximamente disponible
          </Text>
        </View>
      </ScrollView>
      <BottomNavigationDock currentIndex={1} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 16,
  },
});
