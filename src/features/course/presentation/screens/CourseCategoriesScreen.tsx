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
import { Category } from "@/src/domain/models/Category";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", DATE_FORMAT).format(date);
};

type RouteParams = {
  courseId: string;
  isTeacher?: boolean;
};

const CourseCategoriesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, isTeacher = false } = (route.params ?? {}) as RouteParams;

  const theme = useTheme();
  const [, courseController] = useCourseController();
  const [categoryState, categoryController] = useCategoryController();
  const [groupState, groupController] = useGroupController();

  const [courseTitle, setCourseTitle] = useState("Curso");
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => {
    if (!courseId) return [] as Category[];
    return categoryController.categoriesFor(courseId);
  }, [categoryController, courseId]);

  const groupsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    const groups = courseId ? groupController.groupsForCourse(courseId) : [];
    for (const group of groups) {
      map.set(group.categoryId, (map.get(group.categoryId) ?? 0) + 1);
    }
    return map;
  }, [courseId, groupController]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId) return;
      const course = await courseController.getCourseById(courseId);
      if (course) {
        setCourseTitle(course.name);
      }
      await Promise.all([
        categoryController.loadByCourse(courseId, { force }),
        groupController.loadByCourse(courseId, { force }),
      ]);
    },
    [categoryController, courseController, courseId, groupController],
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

  const handleCreateCategory = useCallback(() => {
    if (!courseId) return;
    navigation.navigate("CreateCategory", { courseId });
  }, [courseId, navigation]);

  const handleOpenCategory = useCallback(
    (category: Category) => {
      if (!courseId || !isTeacher) return;
      navigation.navigate("EditCategory", { courseId, categoryId: category.id });
    },
    [courseId, isTeacher, navigation],
  );

  const loading = (categoryState.isLoading || groupState.isLoading) && categories.length === 0;

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
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Categorías</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {courseTitle} • {categories.length} categoría{categories.length === 1 ? "" : "s"}
              </Text>
            </View>
            {isTeacher ? (
              <Button mode="contained" onPress={handleCreateCategory} uppercase={false}>
                Nueva
              </Button>
            ) : null}
          </View>

          {categoryState.error || groupState.error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {categoryState.error ?? groupState.error}
            </Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Cargando categorías…</Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No hay categorías</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Crea categorías para agrupar actividades y grupos.
              </Text>
              {isTeacher ? (
                <Button mode="contained" onPress={handleCreateCategory} style={styles.emptyButton} uppercase={false}>
                  Crear categoría
                </Button>
              ) : null}
            </View>
          ) : (
            <List.Section>
              {categories.map((category) => {
                const groupCount = groupsByCategory.get(category.id) ?? 0;
                const createdAt = formatDate(category.createdAt);
                return (
                  <List.Item
                    key={category.id}
                    title={category.name}
                    description={`${category.description ?? "Sin descripción"}\nCreada: ${createdAt}`}
                    descriptionNumberOfLines={3}
                    left={(props) => <List.Icon {...props} icon="shape" />}
                    right={(props) => (
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemMetaText, { color: theme.colors.onSurfaceVariant }]}>
                          {groupCount} grupo{groupCount === 1 ? "" : "s"}
                        </Text>
                      </View>
                    )}
                    onPress={() => handleOpenCategory(category)}
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

export default CourseCategoriesScreen;

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
