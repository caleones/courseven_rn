import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useThemeMode } from "../../../../theme/ThemeProvider";
import { ThemeToggle } from "../../../../theme/ThemeToggle";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "PasswordResetSuccess">;

const GOLD = "#FFD700";

export default function PasswordResetSuccessScreen() {
  const navigation = useNavigation<Navigation>();
  const theme = useTheme();
  const { isDarkMode } = useThemeMode();

  const helperColor = isDarkMode ? "rgba(250,250,250,0.75)" : "rgba(13,13,13,0.7)";

  return (
    <StarryBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Button
            mode="text"
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            textColor={theme.colors.onBackground}
            contentStyle={styles.backButtonContent}
          >
            Atrás
          </Button>
          <ThemeToggle />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="check-circle" size={80} color="#2E7D32" />
          </View>

          <Text style={[styles.title, { color: theme.colors.onBackground }]}>¡Contraseña cambiada!</Text>
          <Text style={[styles.subtitle, { color: helperColor }]}>Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva credencial.</Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate("Login")}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
          >
            Iniciar sesión
          </Button>

          <View
            style={[
              styles.tipCard,
              {
                borderColor: `${GOLD}3D`,
                backgroundColor: isDarkMode ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.15)",
              },
            ]}
          >
            <MaterialCommunityIcons name="shield-check" size={26} color={GOLD} />
            <Text style={[styles.tipTitle, { color: theme.colors.onBackground }]}>Consejo de seguridad</Text>
            <Text style={[styles.tipText, { color: helperColor }]}>Mantén tu contraseña privada y evita reutilizarla en otros servicios para proteger tu cuenta.</Text>
          </View>
        </View>
      </SafeAreaView>
    </StarryBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButtonContent: {
    flexDirection: "row-reverse",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    padding: 24,
    borderRadius: 999,
    backgroundColor: "rgba(46,125,50,0.15)",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginHorizontal: 12,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 14,
    alignSelf: "stretch",
  },
  primaryButtonContent: {
    paddingVertical: 10,
  },
  tipCard: {
    marginTop: 32,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tipText: {
    textAlign: "center",
    lineHeight: 20,
  },
});
