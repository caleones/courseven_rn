import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    IconButton,
    List,
    Text,
    useTheme,
} from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const MONTH_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", MONTH_FORMAT).format(date);
};

type RouteParams = {
  courseId: string;
  isTeacher?: boolean;
};

const CourseActivitiesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, isTeacher = false } = (route.params ?? {}) as RouteParams;

  const theme = useTheme();
  const [, courseController] = useCourseController();
  const [categoryState, categoryController] = useCategoryController();
  const [activityState, activityController] = useActivityController();

  const [courseTitle, setCourseTitle] = useState<string>("Curso");
  const [refreshing, setRefreshing] = useState(false);

  const activities = useMemo(() => {
    if (!courseId) return [] as CourseActivity[];
    return isTeacher
      ? activityController.activitiesForCourse(courseId)
      : activityController.studentActivitiesForCourse(courseId);
  }, [activityController, courseId, isTeacher]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId) return;
      const course = await courseController.getCourseById(courseId);
      if (course) {
        setCourseTitle(course.name);
      }
      await Promise.all([
        categoryController.loadByCourse(courseId, { force }),
        isTeacher
          ? activityController.loadByCourse(courseId, { force })
          : activityController.loadForStudent(courseId, { force }),
      ]);
    },
    [activityController, categoryController, courseController, courseId, isTeacher],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) {
          await loadData();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadData]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleCreateActivity = useCallback(() => {
    if (!courseId) return;
    navigation.navigate("CreateActivity", { courseId, lockCourse: true });
  }, [courseId, navigation]);

  const handleOpenActivity = useCallback(
    (activity: CourseActivity) => {
      if (!courseId) return;
      if (isTeacher) {
        navigation.navigate("EditActivity", { courseId, activityId: activity.id });
      } else {
        navigation.navigate("ActivityDetail", { courseId, activityId: activity.id });
      }
    },
    [courseId, isTeacher, navigation],
  );

  const loading = activityState.isLoading && activities.length === 0;
  const statusText = isTeacher
    ? `${activities.length} actividad${activities.length === 1 ? "" : "es"} creadas`
    : `${activities.length} actividad${activities.length === 1 ? "" : "es"} asignadas`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
        >
          <View style={styles.headerRow}>
            <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
            <View style={styles.headerDetails}>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Actividades</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {courseTitle} • {statusText}
              </Text>
            </View>
            {isTeacher ? (
              <Button mode="contained" onPress={handleCreateActivity} uppercase={false}>
                Nueva
              </Button>
            ) : null}
          </View>

          {activityState.error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}> {activityState.error}</Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                Cargando actividades…
              </Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No hay actividades</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {isTeacher
                  ? "Crea una actividad para comenzar."
                  : "Tu profesor aún no ha publicado actividades."}
              </Text>
              {isTeacher ? (
                <Button mode="contained" onPress={handleCreateActivity} style={styles.emptyButton} uppercase={false}>
                  Crear actividad
                </Button>
              ) : null}
            </View>
          ) : (
            <List.Section>
              {activities.map((activity) => {
                const dueDate = formatDateTime(activity.dueDate);
                const created = formatDateTime(activity.createdAt);
                const category = categoryController.categoriesFor(courseId).find((cat) => cat.id === activity.categoryId);
                const categoryName = category?.name ?? "Sin categoría";
                const description = activity.description ?? "Sin descripción";
                return (
                  <List.Item
                    key={activity.id}
                    title={activity.title}
                    description={`Categoría: ${categoryName}\n${description}\nEntrega: ${dueDate}`}
                    descriptionNumberOfLines={4}
                    left={(props) => <List.Icon {...props} icon="clipboard-text-outline" />}
                    right={(props) => (
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemMetaText, { color: theme.colors.onSurfaceVariant }]}>Creada {created}</Text>
                      </View>
                    )}
                    onPress={() => handleOpenActivity(activity)}
                    style={styles.listItem}
                  />
                );
              })}
            </List.Section>
          )}
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

export default CourseActivitiesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDetails: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    marginTop: 32,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#00000011",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 16,
  },
  listItem: {
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  itemMeta: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  itemMetaText: {
    fontSize: 12,
  },
});
