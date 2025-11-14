import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, IconButton, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Group } from "@/src/domain/models/Group";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";
import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

type RouteParams = {
  courseId: string;
};

export const PeerReviewSelectGroupScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [courseState, courseController] = useCourseController();
  const [groupState, groupController] = useGroupController();
  const [categoryState, categoryController] = useCategoryController();
  const [activityState, activityController] = useActivityController();
  const [membershipState, membershipController] = useMembershipController();
  const di = useDI();
  
  // Validar que los hooks devuelvan valores válidos
  if (!courseController || !groupController || !categoryController || !activityController || !membershipController) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Inicializando...
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  const membershipRepository = di.resolve<MembershipRepository>(TOKENS.MembershipRepository);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myGroups, setMyGroups] = useState<Group[]>([]);

  const reviewActivityIds = useMemo(() => {
    if (!courseId || !activityState) return [];
    try {
      const activities = activityState.studentActivitiesByCourse?.[courseId] ?? [];
      if (!Array.isArray(activities)) return [];
      return activities
        .filter((a) => a?.reviewing && !a?.privateReview)
        .map((a) => a?.id)
        .filter((id): id is string => Boolean(id));
    } catch {
      return [];
    }
  }, [activityState, courseId]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId || !user?.id) return;

      setLoading(true);
      try {
        await Promise.all([
          courseController.getCourseById(courseId, { force }),
          groupController.loadByCourse(courseId, { force }),
          categoryController.loadByCourse(courseId, { force }),
          activityController.loadForStudent(courseId, { force }),
        ]);

        // Obtener grupos del usuario
        const allGroups = groupController.groupsForCourse(courseId);
        const myMemberships = await membershipRepository.getMembershipsByUserId(user.id);
        const myGroupIds = new Set(myMemberships.map((m) => m.groupId));

        // Precargar membresías para los grupos del curso
        if (allGroups.length > 0) {
          const groupIds = allGroups.map((g) => g.id);
          await membershipController.preloadMembershipsForGroups(groupIds);
        }

        const groups = allGroups.filter((group) => {
          if (group.courseId !== courseId) return false;
          return myGroupIds.has(group.id);
        });

        setMyGroups(groups);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      courseId,
      user?.id,
      courseController,
      groupController,
      categoryController,
      activityController,
      membershipController,
      membershipRepository,
    ],
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

  const handleSelectGroup = useCallback(
    (group: Group) => {
      if (reviewActivityIds.length === 0) {
        return;
      }
      navigation.navigate("PeerReviewGroupSummary", {
        courseId,
        groupId: group.id,
        groupName: group.name,
        activityIds: reviewActivityIds,
      });
    },
    [courseId, navigation, reviewActivityIds],
  );

  const course = courseState?.coursesCache?.[courseId];
  const categories = useMemo(() => {
    try {
      return categoryController.categoriesFor(courseId) ?? [];
    } catch {
      return [];
    }
  }, [categoryController, courseId]);
  
  const categoryMap = useMemo(() => {
    try {
      if (!Array.isArray(categories)) return new Map();
      return new Map(categories.map((cat) => [cat.id, cat]));
    } catch {
      return new Map();
    }
  }, [categories]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando grupos...
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

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
          {/* Header */}
          <View style={styles.headerRow}>
            <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
            <View style={styles.headerDetails}>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                Seleccionar Grupo
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {course?.name ?? "Curso"}
              </Text>
            </View>
          </View>

          {reviewActivityIds.length === 0 ? (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No hay actividades públicas de peer review en este curso.
              </Text>
            </View>
          ) : myGroups.length === 0 ? (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No perteneces a ningún grupo en este curso.
              </Text>
            </View>
          ) : (
            <View style={styles.groupsList}>
              {myGroups.map((group) => {
                const category = categoryMap.get(group.categoryId);
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupCard,
                      { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" },
                    ]}
                    onPress={() => handleSelectGroup(group)}
                  >
                    <View style={styles.groupCardContent}>
                      <Text style={[styles.groupCardTitle, { color: theme.colors.onSurface }]}>
                        {group.name}
                      </Text>
                      {category && (
                        <Text style={[styles.groupCardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                          Categoría: {category.name}
                        </Text>
                      )}
                    </View>
                    <IconButton icon="chevron-right" size={24} iconColor={GOLD} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

const GOLD = "#FFD700";

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  headerDetails: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  groupsList: {
    gap: 12,
  },
  groupCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupCardContent: {
    flex: 1,
  },
  groupCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  groupCardSubtitle: {
    fontSize: 14,
  },
});

