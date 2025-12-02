import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
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
import { Group } from "@/src/domain/models/Group";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
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

const CourseGroupsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, isTeacher = false } = (route.params ?? {}) as RouteParams;

  const theme = useTheme();
  const [, courseController] = useCourseController();
  const [categoryState, categoryController] = useCategoryController();
  const [groupState, groupController] = useGroupController();
  const [membershipState, membershipController] = useMembershipController();

  const [courseTitle, setCourseTitle] = useState("Curso");
  const [refreshing, setRefreshing] = useState(false);

  const categories = useMemo(() => {
    if (!courseId) return [] as Category[];
    return categoryController.categoriesFor(courseId).filter((category) => category.isActive);
  }, [categoryController, courseId]);

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const groups = useMemo(() => {
    if (!courseId) return [] as Group[];
    return groupController
      .groupsForCourse(courseId)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courseId, groupController]);

  const groupsByCategory = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const group of groups) {
      const existing = map.get(group.categoryId);
      if (existing) {
        existing.push(group);
      } else {
        map.set(group.categoryId, [group]);
      }
    }
    return map;
  }, [groups]);

  const joinedGroupIds = useMemo(() => new Set(membershipState.myGroupIds), [membershipState.myGroupIds]);
  const memberCounts = membershipState.groupMemberCounts;

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
      const loadedGroups = groupController.groupsForCourse(courseId);
      const groupIds = loadedGroups.map((group) => group.id);
      if (groupIds.length > 0) {
        await Promise.all([
          membershipController.preloadMemberCountsForGroups(groupIds),
          membershipController.preloadMembershipsForGroups(groupIds),
        ]);
      }
    },
    [categoryController, courseController, courseId, groupController, membershipController],
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

  const handleCreateGroup = useCallback(() => {
    if (!courseId) return;
    navigation.navigate("CreateGroup", { courseId });
  }, [courseId, navigation]);

  const handleJoinGroup = useCallback(
    async (groupId: string) => {
      const result = await membershipController.joinGroup(groupId);
      const snapshot = membershipController.getSnapshot();
      if (result) {
        Alert.alert("¡Unido!", "Te has unido al grupo exitosamente.");
        // Actualizar los datos después de unirse
        await loadData({ force: true });
      } else if (snapshot.error) {
        Alert.alert("Error", snapshot.error);
      } else {
        Alert.alert("Error", "No fue posible unirse al grupo.");
      }
    },
    [membershipController, loadData],
  );

  const loading =
    (categoryState.isLoading || groupState.isLoading || membershipState.isLoading) && groups.length === 0;

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
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Grupos</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {courseTitle} • {groups.length} grupo{groups.length === 1 ? "" : "s"}
              </Text>
            </View>
            {isTeacher ? (
              <Button mode="contained" onPress={handleCreateGroup} uppercase={false}>
                Nuevo
              </Button>
            ) : null}
          </View>

          {groupState.error || membershipState.error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {groupState.error ?? membershipState.error}
            </Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Cargando grupos…</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No hay grupos</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {isTeacher
                  ? "Crea un grupo para organizar a tus estudiantes."
                  : "Aún no hay grupos disponibles para este curso."}
              </Text>
              {isTeacher ? (
                <Button mode="contained" onPress={handleCreateGroup} style={styles.emptyButton} uppercase={false}>
                  Crear grupo
                </Button>
              ) : null}
            </View>
          ) : (
            <View>
              {categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No hay categorías</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Los grupos se organizan por categorías. Aún no hay categorías en este curso.
                  </Text>
                </View>
              ) : (
                categories.map((category) => {
                  const categoryGroups = groupsByCategory.get(category.id) ?? [];
                  if (categoryGroups.length === 0) {
                    return null;
                  }
                  return (
                    <View key={category.id} style={styles.categorySection}>
                      <View style={styles.categoryHeader}>
                        <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                          {category.name}
                        </Text>
                        <Text style={[styles.categorySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                          {category.description || "Sin descripción"}
                        </Text>
                        <View style={styles.categoryMeta}>
                          <Text style={[styles.categoryMetaText, { color: theme.colors.onSurfaceVariant }]}>
                            Método: {category.groupingMethod.toLowerCase() === "manual" ? "Manual" : "Aleatorio"}
                          </Text>
                          {typeof category.maxMembersPerGroup === "number" && category.maxMembersPerGroup > 0 && (
                            <Text style={[styles.categoryMetaText, { color: theme.colors.onSurfaceVariant }]}>
                              • Máx: {category.maxMembersPerGroup} miembros
                            </Text>
                          )}
                        </View>
                      </View>
                      <List.Section style={styles.groupsList}>
                        {categoryGroups.map((group) => {
                          const memberCount = memberCounts[group.id];
                          const joined = joinedGroupIds.has(group.id);
                          const isManual = category.groupingMethod.toLowerCase() === "manual";
                          const canJoin = isManual && !joined && group.isActive;
                          return (
                            <List.Item
                              key={group.id}
                              title={group.name}
                              description={`Creado: ${formatDate(group.createdAt)}`}
                              descriptionNumberOfLines={2}
                              left={(props) => <List.Icon {...props} icon="account-group" />}
                              right={() => (
                                <View style={styles.itemMeta}>
                                  <Text style={[styles.itemMetaText, { color: theme.colors.onSurfaceVariant }]}> 
                                    {typeof memberCount === "number" ? `${memberCount} miembro${memberCount === 1 ? "" : "s"}` : "Sin datos"}
                                  </Text>
                                  {isTeacher ? (
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                      <Text
                                        style={[
                                          styles.statusText,
                                          { color: group.isActive ? theme.colors.primary : theme.colors.onSurfaceVariant },
                                        ]}
                                      >
                                        {group.isActive ? "Activo" : "Archivado"}
                                      </Text>
                                      <IconButton
                                        icon="pencil"
                                        size={20}
                                        onPress={() =>
                                          navigation.navigate("EditGroup", {
                                            groupId: group.id,
                                            courseId,
                                            categoryId: group.categoryId,
                                          })
                                        }
                                        accessibilityLabel="Editar grupo"
                                        style={{ marginLeft: 8 }}
                                      />
                                    </View>
                                  ) : (
                                    <Button
                                      mode={joined ? "contained-tonal" : "contained"}
                                      compact
                                      uppercase={false}
                                      onPress={() => handleJoinGroup(group.id)}
                                      disabled={!canJoin || membershipState.isLoading}
                                      style={styles.joinButton}
                                    >
                                      {joined ? "Ya perteneces" : !isManual ? "Asignación automática" : "Unirme"}
                                    </Button>
                                  )}
                                </View>
                              )}
                              style={styles.listItem}
                            />
                          );
                        })}
                      </List.Section>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

export default CourseGroupsScreen;

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
  statusText: {
    marginTop: 6,
    fontSize: 12,
  },
  joinButton: {
    marginTop: 6,
  },
  categorySection: {
    marginTop: 24,
  },
  categoryHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#00000011",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryMetaText: {
    fontSize: 12,
  },
  groupsList: {
    marginTop: 8,
  },
});
