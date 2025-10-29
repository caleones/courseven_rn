import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    Button,
    HelperText,
    IconButton,
    List,
    RadioButton,
    Text,
    useTheme,
} from "react-native-paper";

import { Category } from "@/src/domain/models/Category";
import { Group } from "@/src/domain/models/Group";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";

export default function JoinGroupScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();

  const { courseId: initialCourseId } = (route.params ?? {}) as { courseId?: string };

  const [enrollmentState, enrollmentController] = useEnrollmentController();
  const [categoryState, categoryController] = useCategoryController();
  const [groupState, groupController] = useGroupController();
  const [membershipState, membershipController] = useMembershipController();

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedCategoryIdsRef = useRef(new Set<string>());
  const loadedGroupCountsRef = useRef(new Set<string>());
  const loadedMembershipsRef = useRef(new Set<string>());

  useEffect(() => {
    if (enrollmentState.myEnrollments.length === 0) {
      void enrollmentController.loadMyEnrollments({ force: true });
    }
  }, [enrollmentController, enrollmentState.myEnrollments.length]);

  useEffect(() => {
    if (!selectedCourseId && enrollmentState.myEnrollments.length > 0) {
      setSelectedCourseId(enrollmentState.myEnrollments[0].courseId);
    }
  }, [enrollmentState.myEnrollments, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId) {
      return;
    }
    loadedCategoryIdsRef.current.clear();
    loadedGroupCountsRef.current.clear();
    loadedMembershipsRef.current.clear();
    setError(null);
    void categoryController.loadByCourse(selectedCourseId);
    void groupController.loadByCourse(selectedCourseId, { force: true });
  }, [categoryController, groupController, selectedCourseId]);

  const categories = useMemo(() => {
    if (!selectedCourseId) {
      return [] as Category[];
    }
    return categoryController.categoriesFor(selectedCourseId).filter((category) => category.isActive);
  }, [categoryController, selectedCourseId]);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }
    const toLoad = categories
      .map((category) => category.id)
      .filter((id) => !loadedCategoryIdsRef.current.has(id));
    if (toLoad.length === 0) {
      return;
    }
    toLoad.forEach((id) => loadedCategoryIdsRef.current.add(id));
    toLoad.forEach((id) => {
      void groupController.loadByCategory(id);
    });
  }, [categories, groupController]);

  const groupsByCategory = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const category of categories) {
      map.set(category.id, groupController.groupsForCategory(category.id));
    }
    return map;
  }, [categories, groupController]);

  useEffect(() => {
    const allGroupIds = Array.from(groupsByCategory.values()).flat().map((group) => group.id);
    if (allGroupIds.length === 0) {
      return;
    }
    const missingCounts = allGroupIds.filter((id) => !loadedGroupCountsRef.current.has(id));
    if (missingCounts.length > 0) {
      missingCounts.forEach((id) => loadedGroupCountsRef.current.add(id));
      void membershipController.preloadMemberCountsForGroups(allGroupIds);
    }

    const missingMemberships = allGroupIds.filter((id) => !loadedMembershipsRef.current.has(id));
    if (missingMemberships.length > 0) {
      missingMemberships.forEach((id) => loadedMembershipsRef.current.add(id));
      void membershipController.preloadMembershipsForGroups(allGroupIds);
    }
  }, [groupsByCategory, membershipController]);

  const learningCourses = useMemo(() => {
    if (enrollmentState.myEnrollments.length === 0) {
      return [] as { courseId: string; enrollmentId: string }[];
    }
    return enrollmentState.myEnrollments.map((enrollment) => ({
      courseId: enrollment.courseId,
      enrollmentId: enrollment.id,
    }));
  }, [enrollmentState.myEnrollments]);

  const handleRefresh = useCallback(async () => {
    if (!selectedCourseId) {
      return;
    }
    setRefreshing(true);
    try {
      loadedCategoryIdsRef.current.clear();
      loadedGroupCountsRef.current.clear();
      loadedMembershipsRef.current.clear();
      await Promise.all([
        categoryController.loadByCourse(selectedCourseId, { force: true }),
        groupController.loadByCourse(selectedCourseId, { force: true }),
      ]);
      const categoriesForCourse = categoryController.categoriesFor(selectedCourseId);
      await Promise.all(
        categoriesForCourse.map((category) => groupController.loadByCategory(category.id, { force: true })),
      );
      const allGroupIds = categoriesForCourse
        .flatMap((category) => groupController.groupsForCategory(category.id))
        .map((group) => group.id);
      if (allGroupIds.length > 0) {
        await membershipController.preloadMemberCountsForGroups(allGroupIds);
        await membershipController.preloadMembershipsForGroups(allGroupIds);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setRefreshing(false);
    }
  }, [categoryController, groupController, membershipController, selectedCourseId]);

  const handleJoinGroup = useCallback(
    async (groupId: string) => {
      setError(null);
      const membership = await membershipController.joinGroup(groupId);
      const snapshot = membershipController.getSnapshot();
      if (membership) {
        Alert.alert("Te uniste al grupo", "Ahora haces parte de este grupo.");
        return;
      }
      const message = snapshot.error ?? "No fue posible unirse al grupo";
      setError(message);
    },
    [membershipController],
  );

  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourseId(courseId);
  }, []);

  const activeCourseCount = learningCourses.length;

  const headerCourseName = selectedCourseId
    ? enrollmentController.getCourseTitle(selectedCourseId) || selectedCourseId
    : "Curso";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
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
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Unirme a un grupo</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.onSurface }]}>Selecciona uno de tus cursos ({activeCourseCount}) y únete a un grupo disponible.</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />

        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Cursos inscritos</Text>
        {learningCourses.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No estás inscrito en cursos activos.
          </Text>
        ) : (
          <RadioButton.Group onValueChange={handleSelectCourse} value={selectedCourseId}>
            <List.Section>
              {learningCourses.map((item) => {
                const courseName = enrollmentController.getCourseTitle(item.courseId);
                return (
                  <List.Item
                    key={item.enrollmentId}
                    title={courseName}
                    description={`ID de inscripción: ${item.enrollmentId}`}
                    left={(props) => <List.Icon {...props} icon="school" />}
                    right={() => <RadioButton.Android value={item.courseId} />}
                    onPress={() => handleSelectCourse(item.courseId)}
                    style={{ backgroundColor: theme.colors.surface }}
                  />
                );
              })}
            </List.Section>
          </RadioButton.Group>
        )}

        <View style={{ height: 24 }} />

        {selectedCourseId ? (
          <View style={styles.courseSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Categorías del curso {headerCourseName}
            </Text>
            {categoryState.isLoading && categories.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : categories.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No hay categorías disponibles para este curso.
              </Text>
            ) : (
              categories.map((category) => {
                const groups = groupsByCategory.get(category.id) ?? [];
                return (
                  <View key={category.id} style={styles.categoryCard}>
                    <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}> {category.name}</Text>
                    <Text style={[styles.categoryDescription, { color: theme.colors.onSurfaceVariant }]}>
                      {category.description ?? "Sin descripción"}
                    </Text>
                    {groupState.isLoading && groups.length === 0 ? (
                      <ActivityIndicator style={{ marginVertical: 16 }} />
                    ) : groups.length === 0 ? (
                      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                        No hay grupos creados para esta categoría.
                      </Text>
                    ) : (
                      <List.Section style={{ marginTop: 12 }}>
                        {groups.map((group) => {
                          const memberCount = membershipState.groupMemberCounts[group.id];
                          const joined = membershipController.hasJoined(group.id);
                          const isManual = category.groupingMethod.toLowerCase() === "manual";
                          return (
                            <List.Item
                              key={group.id}
                              title={group.name}
                              description={
                                isManual
                                  ? "Ingreso manual permitido"
                                  : "Asignación automática"
                              }
                              left={(props) => <List.Icon {...props} icon="account-group" />}
                              right={() => (
                                <View style={styles.groupActions}>
                                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                                    {typeof memberCount === "number" ? `${memberCount} miembro(s)` : "-"}
                                  </Text>
                                  <Button
                                    mode={joined ? "contained-tonal" : "contained"}
                                    compact
                                    disabled={joined || !isManual || membershipState.isLoading}
                                    onPress={() => handleJoinGroup(group.id)}
                                    style={{ marginTop: 4 }}
                                  >
                                    {joined ? "Ya perteneces" : "Unirme"}
                                  </Button>
                                </View>
                              )}
                              style={{ backgroundColor: theme.colors.surface }}
                            />
                          );
                        })}
                      </List.Section>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        <HelperText type={error ? "error" : "info"} visible style={{ marginTop: 16 }}>
          {error ? error : "Selecciona un curso y únete a un grupo disponible."}
        </HelperText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.75,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  courseSection: {
    gap: 16,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#00000011",
    backgroundColor: "transparent",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  categoryDescription: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.7,
  },
  groupActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 120,
  },
});
