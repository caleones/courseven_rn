import { useNavigation } from "@react-navigation/native";
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
import {
    Button,
    Chip,
    HelperText,
    List,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { Course } from "@/src/domain/models/Course";
import { CreateCourseUseCase } from "@/src/domain/usecases/course/CreateCourseUseCase";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const MIN_NAME_LENGTH = 3;

const INITIAL_FORM = {
  name: "",
  description: "",
};

type FormState = typeof INITIAL_FORM;

export default function CreateCourseScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [courseState, courseController] = useCourseController();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseState.teacherCourses.length === 0 && !courseState.isLoading) {
      void courseController.loadMyTeachingCourses({ force: true });
    }
  }, [courseController, courseState.isLoading, courseState.teacherCourses.length]);

  const activeCourses = useMemo(
    () => courseState.teacherCourses.filter((course) => course.isActive),
    [courseState.teacherCourses],
  );

  const remainingSlots = useMemo(() => {
    const left = CreateCourseUseCase.maxCoursesPerTeacher - courseState.teacherCourses.length;
    return left > 0 ? left : 0;
  }, [courseState.teacherCourses.length]);

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = useCallback((): string | null => {
    if (form.name.trim().length < MIN_NAME_LENGTH) {
      return "El nombre es muy corto";
    }
    if (form.description.trim().length === 0) {
      return "Ingresa una descripción";
    }
    return null;
  }, [form.description, form.name]);

  const submit = useCallback(async () => {
    setTouched(true);
    setError(null);
    courseController.clearError();

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const canCreate = await courseController.canCreateMoreCourses();
    if (!canCreate) {
      setError(
        `Has alcanzado el límite de ${CreateCourseUseCase.maxCoursesPerTeacher} cursos como profesor.`,
      );
      return;
    }

    const created = await courseController.createCourse({
      name: form.name.trim(),
      description: form.description.trim(),
    });

    const snapshot = courseController.getSnapshot();

    if (created) {
      setForm(INITIAL_FORM);
      Alert.alert(
        "Curso creado",
        `Tu código de ingreso es ${created.joinCode}`,
        [
          {
            text: "Ver curso",
            onPress: () => navigation.navigate("CourseDetail", { courseId: created.id }),
          },
          {
            text: "Continuar",
            style: "default",
          },
        ],
      );
      return;
    }

    setError(snapshot.error ?? "No se pudo crear el curso");
  }, [courseController, form.description, form.name, navigation, validate]);

  const helperText = useMemo(() => {
    if (!touched) {
      if (remainingSlots === 0) {
        return "Ya alcanzaste el máximo de cursos permitidos";
      }
      return "Completa la información para crear un nuevo curso";
    }
    if (error) {
      return error;
    }
    return courseState.error ?? "";
  }, [courseState.error, error, remainingSlots, touched]);

  const isLimitReached = remainingSlots === 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Crear curso</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Completa los datos y comparte el código de ingreso con tus estudiantes.
          </Text>

          <View style={styles.sectionHeader}>
            <Chip icon="counter" compact>{`${courseState.teacherCourses.length}/${CreateCourseUseCase.maxCoursesPerTeacher} cursos`}</Chip>
            <Chip icon="check" compact>
              {activeCourses.length} activos
            </Chip>
          </View>

          <View style={styles.section}>
            <TextInput
              label="Nombre"
              mode="outlined"
              value={form.name}
              onChangeText={(value) => handleChange("name", value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              returnKeyType="next"
              disabled={isLimitReached}
            />
            <TextInput
              label="Descripción"
              mode="outlined"
              value={form.description}
              onChangeText={(value) => handleChange("description", value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              multiline
              numberOfLines={4}
              style={{ marginTop: 12 }}
              disabled={isLimitReached}
            />
          </View>

          <HelperText type={error ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {helperText}
          </HelperText>

          <Button
            mode="contained"
            icon="school"
            onPress={submit}
            loading={courseState.isLoading}
            disabled={courseState.isLoading || isLimitReached}
          >
            Crear curso
          </Button>

          <View style={styles.section}>
            <Text style={[styles.listTitle, { color: theme.colors.onSurface }]}>Mis cursos</Text>
            {courseState.isLoading && courseState.teacherCourses.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                Cargando cursos...
              </Text>
            ) : courseState.teacherCourses.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                Aún no has creado cursos. ¡Comienza con el formulario superior!
              </Text>
            ) : (
              <List.Section style={{ marginTop: 8 }}>
                {courseState.teacherCourses.map((course: Course) => (
                  <List.Item
                    key={course.id}
                    title={course.name}
                    description={`Código: ${course.joinCode}`}
                    left={(props) => <List.Icon {...props} icon={course.isActive ? "book" : "book-off"} />}
                    right={() => (
                      <View style={styles.courseMeta}>
                        <Chip mode="outlined" icon={course.isActive ? "check" : "close"} compact>
                          {course.isActive ? "Activo" : "Inactivo"}
                        </Chip>
                      </View>
                    )}
                    onPress={() => navigation.navigate("CourseDetail", { courseId: course.id })}
                    style={{ backgroundColor: theme.colors.surface }}
                  />
                ))}
              </List.Section>
            )}
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
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  section: {
    gap: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  courseMeta: {
    justifyContent: "center",
    alignItems: "center",
  },
});
