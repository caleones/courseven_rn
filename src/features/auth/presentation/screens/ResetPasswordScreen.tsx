import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
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
    ProgressBar,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useThemeMode } from "../../../../theme/ThemeProvider";
import { ThemeToggle } from "../../../../theme/ThemeToggle";
import { useAuth } from "../context/authContext";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "ResetPassword">;

const GOLD = "#FFD700";
const TOKEN_DURATION_SECONDS = 15 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const REQUIREMENTS = [
  { label: "Mínimo 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Al menos una mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Al menos una minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Al menos un número", test: (value: string) => /\d/.test(value) },
  { label: "Incluye un símbolo", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const INSTRUCTIONS = [
  "1. Abre el correo de ROBLE en tu bandeja",
  '2. Busca el botón "Restablecer Contraseña"',
  "3. Mantén presionado sobre el botón",
  '4. Selecciona "Copiar enlace" del menú',
  "5. Pega aquí la URL completa",
];

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Navigation>();
  const {
    resetPassword,
    validateResetToken,
    extractResetToken,
    loading,
    error,
    clearError,
  } = useAuth();
  const theme = useTheme();
  const { isDarkMode } = useThemeMode();

  const [resetUrl, setResetUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tokenSecondsRemaining, setTokenSecondsRemaining] = useState(TOKEN_DURATION_SECONDS);
  const [resendSecondsRemaining, setResendSecondsRemaining] = useState(RESEND_COOLDOWN_SECONDS);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTokenSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const disableAction = loading || submitting;

  const requirementStatus = useMemo(
    () => REQUIREMENTS.map((req) => ({ label: req.label, valid: req.test(password) })),
    [password],
  );

  const passwordValid = requirementStatus.every((item) => item.valid);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const tokenProgress = tokenSecondsRemaining / TOKEN_DURATION_SECONDS;

  const helperColor = isDarkMode ? "rgba(250,250,250,0.75)" : "rgba(13,13,13,0.7)";
  const mutedHelper = isDarkMode ? "rgba(250,250,250,0.5)" : "rgba(13,13,13,0.55)";
  const canRequestNewLink = resendSecondsRemaining <= 0 && !disableAction;

  const formattedTokenTime = useMemo(() => {
    const minutes = Math.floor(tokenSecondsRemaining / 60).toString().padStart(2, "0");
    const seconds = (tokenSecondsRemaining % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [tokenSecondsRemaining]);

  const handleSubmit = async () => {
    if (!passwordValid || !passwordsMatch) return;

    try {
      clearError();
      setLocalError(null);
      setSubmitting(true);

      const token = extractResetToken(resetUrl.trim());
      if (!token) {
        setLocalError("El enlace no es válido. Copia el enlace completo del correo.");
        return;
      }

      const tokenIsValid = await validateResetToken(token);
      if (!tokenIsValid) {
        setLocalError("El enlace ha expirado o no es válido. Solicita uno nuevo.");
        return;
      }

      await resetPassword({ token, newPassword: password.trim() });
      navigation.navigate("PasswordResetSuccess");
    } catch (err) {
      console.error("Reset password error", err);
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
                <MaterialCommunityIcons name="link-variant" size={64} color={GOLD} />
              </View>

              <Text style={[styles.title, { color: theme.colors.onBackground }]}>Pega tu enlace de recuperación</Text>
              <Text style={[styles.subtitle, { color: helperColor }]}>
                Ve al correo que recibiste de ROBLE, busca el botón {"\"Restablecer Contraseña\""}, mantén presionado sobre él y selecciona {"\"Copiar enlace\""}. Luego pega aquí la URL completa.
              </Text>

              <View
                style={[
                  styles.timerCard,
                  {
                    backgroundColor: isDarkMode ? "rgba(255,215,0,0.12)" : "rgba(255,215,0,0.18)",
                    borderColor: isDarkMode ? "rgba(255,215,0,0.4)" : "rgba(184,134,11,0.35)",
                  },
                ]}
              >
                <View style={styles.timerHeader}>
                  <MaterialCommunityIcons name="timer-outline" size={20} color={GOLD} />
                  <Text style={styles.timerLabel}>Tiempo restante</Text>
                  <Text style={[styles.timerValue, { color: theme.colors.onBackground }]}>{formattedTokenTime}</Text>
                </View>
                <ProgressBar progress={tokenProgress} color={GOLD} style={styles.progressBar} />
              </View>

              <View
                style={[
                  styles.instructionsCard,
                  {
                    backgroundColor: isDarkMode ? "rgba(60,48,18,0.65)" : "rgba(255,244,214,0.85)",
                    borderColor: isDarkMode ? "rgba(255,215,0,0.35)" : "rgba(184,134,11,0.35)",
                  },
                ]}
              >
                <Text style={styles.instructionsTitle}>📧 Pasos a seguir:</Text>
                {INSTRUCTIONS.map((step) => {
                  const segments = step.split("\"");
                  return (
                    <Text key={step} style={[styles.instructionsText, { color: helperColor }]}>
                      {segments.map((segment, index) => (
                        <React.Fragment key={`${step}-${index}`}>
                          {segment}
                          {index < segments.length - 1 ? "\"" : null}
                        </React.Fragment>
                      ))}
                    </Text>
                  );
                })}
              </View>

              <TextInput
                mode="outlined"
                label="Enlace de recuperación"
                value={resetUrl}
                onChangeText={(value) => {
                  setResetUrl(value);
                  clearError();
                  setLocalError(null);
                }}
                autoCapitalize="none"
                keyboardType="url"
                multiline
                left={<TextInput.Icon icon="link" color={GOLD} />}
                style={styles.input}
                outlineStyle={styles.outline}
                textColor={theme.colors.onSurface}
              />

              <TextInput
                mode="outlined"
                label="Nueva contraseña"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearError();
                }}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock-outline" color={GOLD} />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off-outline" : "eye-outline"}
                    color={GOLD}
                    onPress={() => setShowPassword((prev) => !prev)}
                  />
                }
                style={styles.input}
                outlineStyle={styles.outline}
                textColor={theme.colors.onSurface}
              />

              <TextInput
                mode="outlined"
                label="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearError();
                }}
                secureTextEntry={!showConfirmPassword}
                left={<TextInput.Icon icon="lock-check-outline" color={GOLD} />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    color={GOLD}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                  />
                }
                style={styles.input}
                outlineStyle={styles.outline}
                textColor={theme.colors.onSurface}
              />

              <View style={styles.requirements}>
                {requirementStatus.map((req) => (
                  <View key={req.label} style={styles.requirementRow}>
                    <MaterialCommunityIcons
                      name={req.valid ? "check-circle" : "checkbox-blank-circle-outline"}
                      size={20}
                      color={req.valid ? "#2E7D32" : helperColor}
                    />
                    <Text style={[styles.requirementText, { color: helperColor }]}>{req.label}</Text>
                  </View>
                ))}
              </View>

              {!passwordsMatch && confirmPassword.length > 0 ? (
                <HelperText type="error" visible style={styles.helper}>
                  Las contraseñas no coinciden.
                </HelperText>
              ) : null}

              {error ? (
                <HelperText type="error" visible style={styles.helper}>
                  {error}
                </HelperText>
              ) : null}

              {localError ? (
                <HelperText type="error" visible style={styles.helper}>
                  {localError}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={disableAction || !passwordValid || !passwordsMatch}
                loading={disableAction && passwordValid && passwordsMatch}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
              >
                Actualizar Contraseña
              </Button>

              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: isDarkMode ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.18)",
                    borderColor: isDarkMode ? "rgba(255,215,0,0.35)" : "rgba(184,134,11,0.35)",
                  },
                ]}
              >
                <MaterialCommunityIcons name="information-outline" size={24} color={GOLD} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: theme.colors.onBackground }]}>¿No encuentras el correo?</Text>
                  <Text style={[styles.infoText, { color: helperColor }]}>
                    Revisa tu carpeta de spam o correo no deseado. El correo puede tardar unos minutos en llegar.
                  </Text>
                  <Text
                    style={[
                      styles.infoAction,
                      { color: canRequestNewLink ? GOLD : mutedHelper },
                    ]}
                    onPress={() => {
                      if (canRequestNewLink) {
                        navigation.navigate("ForgotPassword");
                      }
                    }}
                  >
                    {canRequestNewLink
                      ? "Solicitar nuevo enlace"
                      : `Solicitar nuevo enlace en ${resendSecondsRemaining}s`}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.backLink, { color: helperColor }]}
                onPress={() => navigation.navigate("Login")}
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
    paddingBottom: 40,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  timerCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timerLabel: {
    marginLeft: 8,
    color: GOLD,
    fontWeight: "600",
    fontSize: 14,
  },
  timerValue: {
    marginLeft: "auto",
    fontWeight: "700",
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  instructionsCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontWeight: "700",
    marginBottom: 10,
    fontSize: 15,
    color: GOLD,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  input: {
    marginBottom: 16,
  },
  outline: {
    borderRadius: 14,
  },
  requirements: {
    marginTop: 12,
    marginBottom: 16,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  helper: {
    marginBottom: 8,
    fontSize: 13,
  },
  primaryButton: {
    borderRadius: 14,
    marginTop: 12,
  },
  primaryButtonContent: {
    paddingVertical: 10,
  },
  infoCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 24,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoAction: {
    marginTop: 12,
    fontWeight: "700",
    fontSize: 14,
  },
  backLink: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
});
