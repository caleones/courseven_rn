import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const GOLD = "#FFD700";

type WelcomeCardProps = {
  cardColor: string;
  outlineColor: string;
  shadowColor: string;
  onSurfaceColor: string;
  userDisplayName: string;
  fullName: string;
  email: string;
};

export function WelcomeCard({
  cardColor,
  outlineColor,
  shadowColor,
  onSurfaceColor,
  userDisplayName,
  fullName,
  email,
}: WelcomeCardProps) {
  const subtitle = fullName.length > 0 ? fullName : userDisplayName;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardColor,
          borderColor: outlineColor,
          shadowColor,
        },
      ]}
    >
      <View style={styles.avatarWrapper}>
        <MaterialIcons name="person" size={28} color={GOLD} />
      </View>
      <View style={styles.textColumn}>
        <Text
          variant="titleLarge"
          style={[styles.title, { color: onSurfaceColor }]}
          numberOfLines={1}
        >
          Bienvenido
        </Text>
        <Text
          style={[styles.subtitle, { color: onSurfaceColor }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
        <Text style={[styles.email, { color: onSurfaceColor }]} numberOfLines={1}>
          {email}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,0,0.18)",
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  email: {
    marginTop: 2,
    fontSize: 13,
    opacity: 0.5,
  },
});
