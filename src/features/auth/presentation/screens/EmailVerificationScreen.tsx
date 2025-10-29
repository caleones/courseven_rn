import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Text,
    useTheme,
} from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useAuth } from "../context/authContext";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "EmailVerification">;
type Route = RouteProp<AuthStackParamList, "EmailVerification">;

const CODE_LENGTH = 6;
const TOTAL_SECONDS = 300;
const RESEND_AVAILABLE_AT = TOTAL_SECONDS - 30;

export default function EmailVerificationScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { verifyEmail, signup, loading, error, clearError } = useAuth();
  const theme = useTheme();

  const { email, password, firstName, lastName, username } = route.params;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputsRef = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          Alert.alert(
            "Tiempo expirado",
            "El código de verificación ha expirado. Regístrate nuevamente para recibir uno nuevo.",
            [{ text: "Aceptar", onPress: () => navigation.goBack() }],
          );
          return 0;
        }
        const next = prev - 1;
        if (next <= RESEND_AVAILABLE_AT) {
          setCanResend(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigation]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  const handleDigitChange = (index: number, value: string) => {
    clearError();
    const sanitized = value.replace(/[^0-9]/g, "");
    setDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized.slice(0, 1);
      return next;
    });

    if (sanitized && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      Alert.alert("Código incompleto", "Ingresa los 6 dígitos del código de verificación.");
      return;
    }

    try {
      clearError();
      setSubmitting(true);
      await verifyEmail({ email, password, firstName, lastName, username, code });
    } catch (err) {
      console.error("Email verification failed", err);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      setCanResend(false);
      await signup({ email, password, firstName, lastName, username });
      Alert.alert(
        "Código reenviado",
        "Hemos enviado un nuevo código a tu correo. Revisa tu bandeja de entrada y spam.",
      );
      setTimeLeft(TOTAL_SECONDS);
    } catch (err) {
      console.error("Resend code failed", err);
      setCanResend(true);
    }
  };

  const disableAction = loading || submitting;

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
                <Button
                  mode="text"
                  icon="arrow-left"
                  onPress={() => navigation.goBack()}
                  textColor={theme.colors.onBackground}
                  style={styles.backButton}
                  contentStyle={styles.backButtonContent}
                >
                  Atrás
                </Button>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Verificar Email</Text>
                <View style={styles.headerSpacer} />
              </View>

              <View style={styles.iconWrapper}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="email-check-outline" size={40} color="#FFD700" />
                </View>
              </View>

              <Text style={[styles.title, { color: theme.colors.onBackground }]}>Revisa tu correo</Text>
              <Text style={[styles.subtitle, { color: "rgba(250,250,250,0.8)" }]}>Te enviamos un código de verificación a:</Text>
              <Text style={styles.emailHighlight}>{email}</Text>
              <Text style={[styles.subtitle, { color: "rgba(250,250,250,0.6)" }]}>Revisa también tu carpeta de spam.</Text>

              <View style={styles.codeRow}>
                {digits.map((digit, index) => (
                  <View key={`digit-${index}`} style={styles.digitContainer}>
                    <TextInput
                      ref={(ref) => {
                        inputsRef.current[index] = ref;
                      }}
                      value={digit}
                      onChangeText={(value) => handleDigitChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={styles.digitInput}
                      placeholder="-"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                ))}
              </View>

              <View style={styles.timerCard}>
                <View style={styles.timerRow}>
                  <MaterialCommunityIcons name="timer-outline" size={18} color="#FFD700" />
                  <Text style={styles.timerLabel}>Tiempo restante</Text>
                  <Text style={styles.timerValue}>{formattedTime}</Text>
                </View>
              </View>

              {error ? (
                <Text style={styles.errorMessage}>{error}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleVerify}
                disabled={disableAction}
                loading={disableAction}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
              >
                Confirmar verificación
              </Button>

              <Button
                mode="outlined"
                onPress={handleResend}
                disabled={!canResend || disableAction}
                style={styles.secondaryButton}
                textColor="#FFD700"
              >
                {canResend ? "Reenviar código" : "Podrás reenviar en 30 segundos"}
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate("Login")}
                disabled={disableAction}
                labelStyle={styles.textButton}
              >
                Volver al inicio de sesión
              </Button>
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
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    borderRadius: 24,
  },
  backButtonContent: {
    flexDirection: "row-reverse",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 60,
  },
  iconWrapper: {
    marginTop: 36,
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,0,0.15)",
  },
  title: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    marginTop: 8,
  },
  emailHighlight: {
    textAlign: "center",
    color: "#FFD700",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 8,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
  },
  digitContainer: {
    width: 52,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  digitInput: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  timerCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerLabel: {
    marginLeft: 8,
    color: "#FFD700",
    fontWeight: "600",
  },
  timerValue: {
    marginLeft: "auto",
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorMessage: {
    marginTop: 16,
    textAlign: "center",
    color: "#FF6B6B",
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 14,
  },
  primaryButtonContent: {
    paddingVertical: 8,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    borderColor: "#FFD700",
  },
  textButton: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});
