import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    HelperText,
    IconButton,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useThemeMode } from "../../../../theme/ThemeProvider";
import { ThemeToggle } from "../../../../theme/ThemeToggle";
import { useAuth } from "../context/authContext";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "ForgotPassword">;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOLD = "#FFD700";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Navigation>();
  const { requestPasswordReset, loading, error, clearError } = useAuth();
  const theme = useTheme();
  const { isDarkMode } = useThemeMode();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const disableAction = loading || submitting;
  const helperColor = isDarkMode ? "rgba(250,250,250,0.75)" : "rgba(13,13,13,0.7)";

  const handleSubmit = async () => {
    if (!emailRegex.test(email.trim())) return;

    try {
      clearError();
      setInfoMessage(null);
      setSubmitting(true);
      const result = await requestPasswordReset(email.trim().toLowerCase());
      setInfoMessage(result.message);
      navigation.navigate("ResetPassword");
    } catch (err) {
      console.error("Forgot password error", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StarryBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inner}>
              <View style={styles.headerRow}>
                <IconButton
                  icon="arrow-left"
                  size={28}
                  onPress={() => navigation.goBack()}
                  iconColor={GOLD}
                  style={styles.backButton}
                />
                <ThemeToggle />
              </View>

              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="lock-reset" size={48} color={GOLD} />
              </View>

              <Text style={[styles.title, { color: theme.colors.onBackground }]}>¿Olvidaste tu contraseña?</Text>
              <Text style={[styles.subtitle, { color: helperColor }]}>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </Text>

              <TextInput
                mode="outlined"
                label="Correo electrónico"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearError();
                  setInfoMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email-outline" color={GOLD} />}
                style={styles.input}
                outlineStyle={styles.outline}
                textColor={theme.colors.onSurface}
              />

              {error && !submitting ? (
                <HelperText type="error" visible style={styles.helper}>
                  {error}
                </HelperText>
              ) : null}

              {infoMessage ? (
                <HelperText type="info" visible style={styles.helper}>
                  {infoMessage}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={disableAction || !emailRegex.test(email.trim())}
                loading={disableAction && emailRegex.test(email.trim())}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
              >
                Enviar Enlace
              </Button>

              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: helperColor }]} />
                <Text style={[styles.dividerLabel, { color: helperColor }]}>o</Text>
                <View style={[styles.divider, { backgroundColor: helperColor }]} />
              </View>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate("ResetPassword")}
                disabled={disableAction}
                style={styles.secondaryButton}
                textColor={GOLD}
              >
                Ya tengo un enlace de recuperación
              </Button>

              <Text
                style={[styles.backLink, { color: helperColor }]}
                onPress={() => navigation.goBack()}
              >
                Volver al inicio de sesión
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {(loading || submitting) && (
          <View style={styles.overlay}>
            <ActivityIndicator animating size="large" />
          </View>
        )}
      </SafeAreaView>
    </StarryBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 32 : 12,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    margin: -8,
  },
  heroIcon: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,215,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    marginBottom: 12,
  },
  outline: {
    borderRadius: 14,
  },
  helper: {
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 14,
    marginTop: 12,
  },
  primaryButtonContent: {
    paddingVertical: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 14,
    borderColor: GOLD,
    marginTop: 4,
  },
  backLink: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
