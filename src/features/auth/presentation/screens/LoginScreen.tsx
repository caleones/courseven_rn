import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
    Image,
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
    Checkbox,
    HelperText,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useThemeMode } from "../../../../theme/ThemeProvider";
import { ThemeToggle } from "../../../../theme/ThemeToggle";
import { useAuth } from "../context/authContext";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "Login">;

const GOLD = "#FFD700";

export default function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const { login, loading, error, clearError } = useAuth();
  const theme = useTheme();
  const { isDarkMode } = useThemeMode();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const disableAction = loading || submitting;

  const helperColor = useMemo(
    () => (isDarkMode ? "rgba(250,250,250,0.75)" : "rgba(13,13,13,0.75)"),
    [isDarkMode],
  );

  const subtitleColor = useMemo(
    () => (isDarkMode ? "rgba(250,250,250,0.7)" : "rgba(13,13,13,0.7)"),
    [isDarkMode],
  );

  const handleSubmit = async () => {
    const cleanedIdentifier = identifier.trim();
    const cleanedPassword = password.trim();
    if (!cleanedIdentifier || !cleanedPassword) {
      return;
    }
    try {
      clearError();
      setSubmitting(true);
      await login({
        identifier: cleanedIdentifier,
        password: cleanedPassword,
        keepLoggedIn,
      });
    } catch (err) {
      console.error("Login failed", err);
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
                <ThemeToggle />
              </View>

              <Image
                source={require("../../../../../assets/images/courseven_logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.title}>Ingresar</Text>
              <Text style={[styles.subtitle, { color: subtitleColor }]}>Accede a tu cuenta de CourSEVEN</Text>

              <TextInput
                mode="outlined"
                label="Email o nombre de usuario"
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  clearError();
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                style={styles.input}
                left={<TextInput.Icon icon="email-outline" color={GOLD} />}
                outlineStyle={styles.inputOutline}
                textColor={theme.colors.onSurface}
              />

              <TextInput
                mode="outlined"
                label="Contraseña"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearError();
                }}
                secureTextEntry={!passwordVisible}
                returnKeyType="done"
                style={styles.input}
                left={<TextInput.Icon icon="lock-outline" color={GOLD} />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    color={GOLD}
                    onPress={() => setPasswordVisible((prev) => !prev)}
                  />
                }
                outlineStyle={styles.inputOutline}
                textColor={theme.colors.onSurface}
              />

              {error && !submitting ? (
                <HelperText type="error" visible style={styles.helperError}>
                  {error}
                </HelperText>
              ) : null}

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={keepLoggedIn ? "checked" : "unchecked"}
                  onPress={() => setKeepLoggedIn((prev) => !prev)}
                  disabled={disableAction}
                  color={GOLD}
                />
                <Text style={[styles.checkboxLabel, { color: theme.colors.onSurface }]}>
                  Mantener sesión iniciada
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={disableAction || !identifier || !password}
                loading={disableAction && !!identifier && !!password}
                style={styles.primaryButton}
                contentStyle={styles.primaryButtonContent}
              >
                Ingresar
              </Button>

              <Text style={[styles.registerPrompt, { color: helperColor }]}>
                ¿No tienes cuenta?
                <Text style={styles.registerLink} onPress={() => navigation.navigate("Signup")}>
                  {" "}Regístrate
                </Text>
              </Text>

              <Text
                style={[styles.forgotLink, { color: helperColor }]}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                ¿Olvidaste tu contraseña?
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
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  logo: {
    width: 130,
    height: 130,
    alignSelf: "center",
    marginTop: 32,
  },
  title: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#FAFAFA",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    marginTop: 20,
  },
  inputOutline: {
    borderRadius: 14,
  },
  helperError: {
    marginTop: 8,
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 14,
    marginTop: 8,
  },
  primaryButtonContent: {
    paddingVertical: 8,
  },
  registerPrompt: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 15,
  },
  registerLink: {
    color: GOLD,
    fontWeight: "700",
  },
  forgotLink: {
    marginTop: 14,
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
