import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";

import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";

const MIN_CODE_LENGTH = 4;

export default function JoinCourseScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [state, controller] = useEnrollmentController();

  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validateCode = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "Ingresa el código";
    }
    if (trimmed.length < MIN_CODE_LENGTH) {
      return "El código es muy corto";
    }
    return null;
  }, []);

  const helperText = useMemo(() => {
    if (!touched) {
      return "Ingresa el join code proporcionado por tu profesor.";
    }
    if (fieldError) {
      return fieldError;
    }
    return "Ingresa el join code proporcionado por tu profesor.";
  }, [fieldError, touched]);

  const handleJoin = useCallback(async () => {
    setTouched(true);
    const validation = validateCode(code);
    if (validation) {
      setFieldError(validation);
      return;
    }

    controller.clearError();
    setFieldError(null);

    const normalizedCode = code.trim();
    const result = await controller.joinByCode(normalizedCode);
    const snapshot = controller.getSnapshot();

    if (result) {
      Alert.alert("¡Te uniste al curso!", "Inscripción creada correctamente", [
        {
          text: "Aceptar",
          onPress: () => navigation.navigate("Home"),
        },
      ]);
      setCode("");
    } else if (snapshot.error) {
      setFieldError(snapshot.error);
    } else {
      setFieldError("No se pudo unir al curso. Intenta nuevamente.");
    }
  }, [code, controller, navigation, validateCode]);

  const isLoading = state.isLoading;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
              Unirme a un curso
            </Text>
            <Text style={[styles.description, { color: theme.colors.onSurface }]}>Ingresa el código de ingreso (join code) proporcionado por tu profesor.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Código de ingreso"
              value={code}
              onChangeText={(value) => {
                const next = value.toUpperCase();
                setCode(next);
                if (touched) {
                  setFieldError(validateCode(next));
                }
              }}
              maxLength={6}
              mode="outlined"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onBlur={() => {
                setTouched(true);
                setFieldError(validateCode(code));
              }}
              right={<TextInput.Icon icon="key" />}
            />
            <HelperText type={fieldError ? "error" : "info"} visible style={{ marginTop: 8 }}>
              {helperText}
            </HelperText>

            <Button
              mode="contained"
              icon="login"
              onPress={handleJoin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
            >
              {isLoading ? "Uniendo..." : "Unirme al curso"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    opacity: 0.75,
    marginTop: 12,
  },
  form: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 16,
  },
});
