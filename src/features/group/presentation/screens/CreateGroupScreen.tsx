import { useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Group } from "@/src/domain/models/Group";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";

const MIN_NAME_LENGTH = 3;

type FormState = {
  courseId: string;
  categoryId: string;
  name: string;
};

const EMPTY_FORM: FormState = {
  courseId: "",
  categoryId: "",
  name: "",
};

export default function CreateGroupScreen() {
  const theme = useTheme();
  const route = useRoute();

  const { courseId: initialCourseId, categoryId: initialCategoryId } = (route.params ?? {}) as {
    courseId?: string;
    categoryId?: string;
  };

  const [courseState, courseController] = useCourseController();
  const [categoryState, categoryController] = useCategoryController();
  const [groupState, groupController] = useGroupController();
  const [membershipState, membershipController] = useMembershipController();

  const [form, setForm] = useState<FormState>(() => ({
    courseId: initialCourseId ?? EMPTY_FORM.courseId,
    categoryId: initialCategoryId ?? EMPTY_FORM.categoryId,
    name: EMPTY_FORM.name,
  }));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedCategoryIdsRef = useRef(new Set<string>());
  const loadedGroupCountsRef = useRef(new Set<string>());
  const initializedCourseRef = useRef(false);

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

  useEffect(() => {
    if (!form.courseId) {
      return;
    }
    loadedCategoryIdsRef.current.clear();
    loadedGroupCountsRef.current.clear();
    if (initializedCourseRef.current) {
      setForm((prev) => ({ ...prev, categoryId: "" }));
    } else {
      initializedCourseRef.current = true;
    }
    void categoryController.loadByCourse(form.courseId);
  }, [categoryController, form.courseId]);

  const categories = useMemo(() => {
    if (!form.courseId) {
      return [] as Category[];
    }
    return categoryController.categoriesFor(form.courseId);
  }, [categoryController, form.courseId]);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    if (!form.categoryId) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
      return;
    }

    const exists = categories.some((category) => category.id === form.categoryId);
    if (!exists) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);

  useEffect(() => {
    if (!form.categoryId) {
      return;
    }
    if (!loadedCategoryIdsRef.current.has(form.categoryId)) {
      loadedCategoryIdsRef.current.add(form.categoryId);
      void groupController.loadByCategory(form.categoryId);
    }
  }, [form.categoryId, groupController]);

  const groups = useMemo(() => {
    if (!form.categoryId) {
      return [] as Group[];
    }
    return groupController.groupsForCategory(form.categoryId);
  }, [groupController, form.categoryId]);

  useEffect(() => {
    if (groups.length === 0) {
      return;
    }
    const groupIds = groups.map((group) => group.id);
    const missingCounts = groupIds.filter((id) => !loadedGroupCountsRef.current.has(id));
    if (missingCounts.length === 0) {
      return;
    }
    missingCounts.forEach((id) => loadedGroupCountsRef.current.add(id));
    void membershipController.preloadMemberCountsForGroups(groupIds);
  }, [groups, membershipController]);

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = useCallback((): string | null => {
    if (!form.courseId) {
      return "Selecciona un curso";
    }
    if (!form.categoryId) {
      return "Selecciona una categoría";
    }
    if (form.name.trim().length < MIN_NAME_LENGTH) {
      return "El nombre es muy corto";
    }
    return null;
  }, [form.categoryId, form.courseId, form.name]);

  const submit = useCallback(async () => {
    setTouched(true);
    setError(null);
    groupController.clearError();

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const canProceed = await courseController.ensureCourseActiveOrWarn(
      form.courseId,
      "grupos",
    );
    if (!canProceed) {
      setError("Debes habilitar el curso antes de crear grupos");
      return;
    }

    const created = await groupController.createGroup({
      name: form.name.trim(),
      courseId: form.courseId,
      categoryId: form.categoryId,
    });

    const snapshot = groupController.getSnapshot();

    if (created) {
      setForm((prev) => ({ ...prev, name: "" }));
      Alert.alert("Grupo creado", "El grupo se creó correctamente", [
        {
          text: "Aceptar",
          onPress: () => {
            void membershipController.preloadMemberCountsForGroups([created.id]);
          },
        },
      ]);
      return;
    }

    setError(snapshot.error ?? "No se pudo crear el grupo");
  }, [courseController, form, groupController, membershipController, validate]);

  const helperText = useMemo(() => {
    if (!touched) {
      return "Completa los datos para crear un grupo";
    }
    if (error) {
      return error;
    }
    return groupState.error ?? "";
  }, [error, groupState.error, touched]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Nuevo grupo</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>Selecciona el curso y la categoría para crear un grupo de trabajo.</Text>

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
                      right={() => <RadioButton.Android value={course.id} />}
                      onPress={() => handleChange("courseId", course.id)}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                  ))}
                </List.Section>
              </RadioButton.Group>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Categoría</Text>
            {form.courseId && categoryState.isLoading && categories.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : categories.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No hay categorías para este curso. Crea una categoría primero.
              </Text>
            ) : (
              <RadioButton.Group
                onValueChange={(value) => handleChange("categoryId", value)}
                value={form.categoryId}
              >
                <List.Section style={{ marginTop: 4 }}>
                  {categories.map((category) => (
                    <List.Item
                      key={category.id}
                      title={category.name}
                      description={category.description ?? "Sin descripción"}
                      left={(props) => <List.Icon {...props} icon="shape" />}
                      right={() => <RadioButton.Android value={category.id} />}
                      onPress={() => handleChange("categoryId", category.id)}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                  ))}
                </List.Section>
              </RadioButton.Group>
            )}
          </View>

          <View style={styles.section}>
            <TextInput
              label="Nombre del grupo"
              mode="outlined"
              value={form.name}
              onChangeText={(value) => handleChange("name", value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </View>

          <HelperText type={error ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {helperText}
          </HelperText>

          <Button
            mode="contained"
            icon="account-group"
            onPress={submit}
            loading={groupState.isLoading}
            disabled={groupState.isLoading || categories.length === 0}
          >
            Crear grupo
          </Button>

          <View style={styles.section}>
            <Text style={[styles.listTitle, { color: theme.colors.onSurface }]}>
              Grupos de la categoría seleccionada
            </Text>
            {groupState.isLoading && groups.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : groups.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No hay grupos registrados aún.
              </Text>
            ) : (
              <List.Section>
                {groups.map((group) => {
                  const memberCount = membershipState.groupMemberCounts[group.id];
                  return (
                    <List.Item
                      key={group.id}
                      title={group.name}
                      description={`Creado: ${new Date(group.createdAt).toLocaleString("es-CO")}`}
                      left={(props) => <List.Icon {...props} icon="account-group" />}
                      right={() => (
                        <View style={styles.groupMeta}>
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                            {typeof memberCount === "number" ? `${memberCount} miembro(s)` : "Cargando"}
                          </Text>
                          {!group.isActive && (
                            <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                              Inactivo
                            </Text>
                          )}
                        </View>
                      )}
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                  );
                })}
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
  groupMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
});
