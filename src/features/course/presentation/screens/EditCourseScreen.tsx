import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { useCourseController } from "@/src/features/course/hooks/useCourseController";

type RouteParams = {
  courseId: string;
};

const MIN_NAME_LENGTH = 3;

export default function EditCourseScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId } = (route.params ?? {}) as RouteParams;
  const [courseState, courseController] = useCourseController();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    (async () => {
      if (courseId) {
        const existing = await courseController.getCourseById(courseId);
        if (existing) {
          setName(existing.name);
          setDescription(existing.description ?? "");
        }
      }
    })();
  }, [courseController, courseId]);

  const validate = useCallback((): string | null => {
    if (name.trim().length < MIN_NAME_LENGTH) {
      return "El nombre es muy corto";
    }
    if (description.trim().length === 0) {
      return "Ingresa una descripción";
    }
    return null;
  }, [name, description]);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!courseId) {
      setError("Identificador de curso inválido");
      return;
    }
    const existing = await courseController.getCourseById(courseId);
    if (!existing) {
      setError("No se pudo obtener el curso");
      return;
    }
    const updated = await courseController.updateCourse({
      ...existing,
      name: name.trim(),
      description: description.trim(),
    });
    const snapshot = courseController.getSnapshot();
    if (updated) {
      Alert.alert("Curso actualizado", "El curso se actualizó correctamente.", [
        {
          text: "Aceptar",
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      setError(snapshot.error ?? "No se pudo actualizar el curso");
    }
  }, [courseController, courseId, name, description, navigation, validate]);

  const helperText = useMemo(() => {
    if (!touched) {
      return "Edita los campos para actualizar el curso";
    }
    return error ?? "";
  }, [touched, error]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Editar curso</Text>
          <View style={styles.section}>
            <TextInput
              label="Nombre"
              mode="outlined"
              value={name}
              onChangeText={(value) => setName(value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            <TextInput
              label="Descripción"
              mode="outlined"
              value={description}
              onChangeText={(value) => setDescription(value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              multiline
              numberOfLines={4}
              style={{ marginTop: 12 }}
            />
          </View>
          <HelperText type={error ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {helperText}
          </HelperText>
          <Button
            mode="contained"
            icon="content-save"
            onPress={handleSubmit}
            loading={courseState.isLoading}
            disabled={courseState.isLoading}
          >
            Guardar cambios
          </Button>
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
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  section: {
    gap: 16,
  },
});