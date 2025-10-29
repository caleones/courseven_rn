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
import {
    ActivityIndicator,
    Button,
    HelperText,
    List,
    RadioButton,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { Category } from "@/src/domain/models/Category";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const GROUPING_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "random", label: "Aleatoria" },
] as const;

type GroupingValue = (typeof GROUPING_OPTIONS)[number]["value"];

type FormState = {
  courseId: string;
  name: string;
  description: string;
  grouping: GroupingValue;
  maxMembers: string;
};

const EMPTY_FORM: FormState = {
  courseId: "",
  name: "",
  description: "",
  grouping: "manual",
  maxMembers: "",
};

export default function CreateCategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useTheme();

  const [courseState, courseController] = useCourseController();
  const [categoryState, categoryController] = useCategoryController();

  const { courseId: initialCourseId } = (route.params ?? {}) as { courseId?: string };

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    courseId: initialCourseId ?? EMPTY_FORM.courseId,
  }));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseState.teacherCourses.length === 0) {
      void courseController.loadMyTeachingCourses({ force: true });
    }
  }, [courseController, courseState.teacherCourses.length]);

  useEffect(() => {
    if (!form.courseId && courseState.teacherCourses.length > 0) {
      setForm((prev) => ({ ...prev, courseId: courseState.teacherCourses[0].id }));
    }
  }, [courseState.teacherCourses, form.courseId]);

  const categoriesForCourse = useMemo(() => {
    if (!form.courseId) {
      return [] as Category[];
    }
    return categoryState.categoriesByCourse[form.courseId] ?? [];
  }, [categoryState.categoriesByCourse, form.courseId]);

  useEffect(() => {
    if (!form.courseId) return;
    void categoryController.loadByCourse(form.courseId);
  }, [categoryController, form.courseId]);

  const isLoading = courseState.isLoading || categoryState.isLoading;

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = useCallback((): string | null => {
    if (!form.courseId) {
      return "Selecciona un curso";
    }
    if (form.name.trim().length === 0) {
      return "Ingresa un nombre";
    }
    if (!GROUPING_OPTIONS.some((option) => option.value === form.grouping)) {
      return "Selecciona un método de agrupación";
    }
    if (form.maxMembers.trim().length > 0) {
      const parsed = Number.parseInt(form.maxMembers, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return "Ingresa un máximo válido";
      }
    }
    return null;
  }, [form.courseId, form.grouping, form.maxMembers, form.name]);

  const submit = useCallback(async () => {
    setTouched(true);
    setError(null);
    categoryController.clearError();

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const canProceed = await courseController.ensureCourseActiveOrWarn(
      form.courseId,
      "categorías",
    );
    if (!canProceed) {
      setError("Debes habilitar el curso antes de crear categorías");
      return;
    }

    const maxMembersNumber = form.maxMembers.trim().length
      ? Number.parseInt(form.maxMembers, 10)
      : null;

    const created = await categoryController.createCategory({
      name: form.name.trim(),
      description: form.description.trim() || null,
      courseId: form.courseId,
      groupingMethod: form.grouping,
      maxMembersPerGroup: maxMembersNumber,
    });

    const snapshot = categoryController.getSnapshot();
    if (created) {
      Alert.alert("Categoría creada", "La categoría se creó correctamente", [
        {
          text: "Ver lista",
          onPress: () => {
            setForm((prev) => ({
              ...EMPTY_FORM,
              courseId: prev.courseId,
            }));
          },
        },
        {
          text: "Volver",
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }

    const message = snapshot.error || "No se pudo crear la categoría";
    setError(message);
  }, [categoryController, courseController, form, navigation, validate]);

  const helperText = useMemo(() => {
    if (!touched) {
      return "Completa los datos para crear una categoría";
    }
    if (error) {
      return error;
    }
    return categoryState.error ?? "";
  }, [categoryState.error, error, touched]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Nueva categoría</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>Selecciona el curso y completa la información para crear la categoría.</Text>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Curso</Text>
            {courseState.isLoading && courseState.teacherCourses.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : courseState.teacherCourses.length === 0 ? (
              <Text style={{ color: theme.colors.error }}>
                No tienes cursos disponibles. Crea un curso primero.
              </Text>
            ) : (
              <RadioButton.Group
                onValueChange={(value) => handleChange("courseId", value)}
                value={form.courseId}
              >
                <List.Section style={{ marginTop: 4 }}>
                  {courseState.teacherCourses.map((course) => (
                    <List.Item
                      key={course.id}
                      title={course.name}
                      description={`Código: ${course.joinCode}`}
                      left={(props) => <List.Icon {...props} icon="book" />}
                      right={() => (
                        <RadioButton.Android value={course.id} />
                      )}
                      onPress={() => handleChange("courseId", course.id)}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                  ))}
                </List.Section>
              </RadioButton.Group>
            )}
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
            />
            <TextInput
              label="Descripción"
              mode="outlined"
              value={form.description}
              onChangeText={(value) => handleChange("description", value)}
              style={{ marginTop: 12 }}
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Método de agrupación</Text>
            <RadioButton.Group
              onValueChange={(value) => handleChange("grouping", value as GroupingValue)}
              value={form.grouping}
            >
              <List.Section style={{ marginTop: 4 }}>
                {GROUPING_OPTIONS.map((option) => (
                  <List.Item
                    key={option.value}
                    title={option.label}
                    left={(props) => <List.Icon {...props} icon="account-group" />}
                    right={() => (
                      <RadioButton.Android value={option.value} />
                    )}
                    onPress={() => handleChange("grouping", option.value)}
                    style={{ backgroundColor: theme.colors.surface }}
                  />
                ))}
              </List.Section>
            </RadioButton.Group>
          </View>

          <View style={styles.section}>
            <TextInput
              label="Máximo de miembros"
              mode="outlined"
              value={form.maxMembers}
              onChangeText={(value) => handleChange("maxMembers", value.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          <HelperText type={error ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {helperText}
          </HelperText>

          <Button
            mode="contained"
            icon="plus"
            onPress={submit}
            loading={isLoading}
            disabled={isLoading || courseState.teacherCourses.length === 0}
          >
            Crear categoría
          </Button>

          <View style={styles.section}>
            <Text style={[styles.listTitle, { color: theme.colors.onSurface }]}>
              Categorías del curso seleccionado
            </Text>
            {categoryState.isLoading && categoriesForCourse.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : categoriesForCourse.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No hay categorías registradas aún.
              </Text>
            ) : (
              <List.Section>
                {categoriesForCourse.map((category) => (
                  <List.Item
                    key={category.id}
                    title={category.name}
                    description={category.description ?? "Sin descripción"}
                    left={(props) => <List.Icon {...props} icon="shape" />}
                    right={() => (
                      <View style={styles.categoryMeta}>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                          {category.groupingMethod === "manual" ? "Manual" : "Aleatoria"}
                        </Text>
                        {typeof category.maxMembersPerGroup === "number" && (
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                            Máx {category.maxMembersPerGroup}
                          </Text>
                        )}
                      </View>
                    )}
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
    opacity: 0.8,
  },
  section: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
});
