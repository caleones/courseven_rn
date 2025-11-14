import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Avatar, Button, IconButton, ProgressBar, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Assessment } from "@/src/domain/models/Assessment";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { Group } from "@/src/domain/models/Group";
import { Membership } from "@/src/domain/models/Membership";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";
import { useAssessmentRepository } from "@/src/data/repositories/hooks/useAssessmentRepository";
import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

type RouteParams = {
  courseId: string;
  activityId: string;
};

type PendingUser = {
  id: string;
  name: string;
  email?: string;
};

export const PeerReviewCalificarScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, activityId } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [activityState, activityController] = useActivityController();
  const [categoryState, categoryController] = useCategoryController();
  const [groupState, groupController] = useGroupController();
  const [membershipState, membershipController] = useMembershipController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();
  const assessmentRepository = useAssessmentRepository();
  const di = useDI();
  const membershipRepository = di.resolve<MembershipRepository>(TOKENS.MembershipRepository);

  const [activity, setActivity] = useState<CourseActivity | null>(null);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<Membership[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const category = useMemo(() => {
    if (!courseId || !activity?.categoryId) return null;
    return categoryController.categoriesFor(courseId).find((cat) => cat.id === activity.categoryId);
  }, [activity?.categoryId, categoryController, courseId]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId || !activityId || !user?.id) return;

      setLoading(true);
      try {
        // Cargar actividad
        await activityController.loadForStudent(courseId, { force });
        const loadedActivity = await activityController.getActivityById(activityId);
        if (loadedActivity) {
          setActivity(loadedActivity);
        }

        // Cargar categorías y grupos
        await Promise.all([
          categoryController.loadByCourse(courseId, { force }),
          groupController.loadByCourse(courseId, { force }),
        ]);

        // Obtener el grupo del usuario para esta categoría
        if (loadedActivity?.categoryId) {
          const groups = groupController.groupsForCourse(courseId);
          // Obtener las membresías del usuario directamente
          const myMemberships = await membershipRepository.getMembershipsByUserId(user.id);
          const myGroupIds = new Set(myMemberships.map((m) => m.groupId));
          
          const myGroupForCategory = groups.find((group) => {
            if (group.categoryId !== loadedActivity.categoryId) return false;
            return myGroupIds.has(group.id);
          });

          if (myGroupForCategory) {
            setMyGroup(myGroupForCategory);
            
            // Obtener miembros del grupo
            const allMemberships = await membershipRepository.getMembershipsByGroupId(
              myGroupForCategory.id,
            );
            // Filtrar el usuario actual
            const otherMembers = allMemberships.filter((m) => m.userId !== user.id);
            setGroupMembers(otherMembers);

            // Cargar nombres de usuarios
            for (const member of otherMembers) {
              await enrollmentController.ensureUserLoaded(member.userId);
            }

            // Obtener IDs de miembros del grupo
            const groupMemberIds = allMemberships.map((m) => m.userId);

            // Obtener usuarios pendientes usando listPendingPeerIds (más eficiente)
            let pendingIds: string[] = [];
            try {
              pendingIds = await assessmentRepository.listPendingPeerIds({
                activityId,
                groupId: myGroupForCategory.id,
                reviewerId: user.id,
                groupMemberIds,
              });
            } catch (error) {
              // Fallback: obtener calificaciones y calcular pendientes manualmente
              console.warn("Error usando listPendingPeerIds, usando fallback:", error);
              const existingAssessments = await assessmentRepository.getAssessmentsByReviewer(activityId, user.id);
              setAssessments(existingAssessments);
              const reviewedIds = new Set(existingAssessments.map((a) => a.studentId));
              pendingIds = groupMemberIds.filter((id) => id !== user.id && !reviewedIds.has(id));
            }

            // Obtener calificaciones ya realizadas para el progreso
            const existingAssessments = await assessmentRepository.getAssessmentsByReviewer(activityId, user.id);
            setAssessments(existingAssessments);

            // Crear lista de usuarios pendientes con nombres
            const pending: PendingUser[] = [];
            for (const memberId of pendingIds) {
              await enrollmentController.ensureUserLoaded(memberId);
              const userName = enrollmentController.userName(memberId);
              const userEmail = enrollmentController.userEmail(memberId);
              pending.push({
                id: memberId,
                name: userName,
                email: userEmail,
              });
            }
            setPendingUsers(pending);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      activityController,
      assessmentRepository,
      categoryController,
      courseId,
      enrollmentController,
      groupController,
      activityId,
      membershipRepository,
      user?.id,
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

  useEffect(() => {
    if (activityState.studentActivitiesByCourse[courseId]) {
      const found = activityState.studentActivitiesByCourse[courseId].find((a) => a.id === activityId);
      if (found) {
        setActivity(found);
      }
    }
  }, [activityState.studentActivitiesByCourse, activityId, courseId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleCalificarUser = useCallback(
    (userId: string) => {
      navigation.navigate("PeerReviewEvaluate", {
        courseId,
        activityId,
        userId,
        groupId: myGroup?.id,
      });
    },
    [courseId, activityId, myGroup?.id, navigation],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando...
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  if (!activity || !myGroup) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Calificar</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            No estás en un grupo para esta categoría o la actividad no existe.
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  const totalToReview = groupMembers.length;
  const reviewedCount = assessments.length;
  const progress = totalToReview > 0 ? reviewedCount / totalToReview : 0;

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
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Calificar</Text>
          </View>

          {/* Progreso */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Progreso
            </Text>
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
                {reviewedCount}/{totalToReview}
              </Text>
              <ProgressBar
                progress={progress}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          </View>

          {/* Pendientes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Pendientes</Text>
            {pendingUsers.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={[styles.emptyListText, { color: theme.colors.onSurfaceVariant }]}>
                  {totalToReview === 0
                    ? "No hay compañeros en tu grupo para calificar."
                    : "¡Has calificado a todos tus compañeros!"}
                </Text>
              </View>
            ) : (
              <View style={styles.usersList}>
                {pendingUsers.map((pendingUser) => (
                  <TouchableOpacity
                    key={pendingUser.id}
                    style={[
                      styles.userCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant ?? "#00000011",
                      },
                    ]}
                    onPress={() => handleCalificarUser(pendingUser.id)}
                  >
                    <Avatar.Text
                      size={48}
                      label={pendingUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                      style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                        {pendingUser.name}
                      </Text>
                      {pendingUser.email && (
                        <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                          {pendingUser.email}
                        </Text>
                      )}
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => handleCalificarUser(pendingUser.id)}
                      style={styles.calificarButton}
                      uppercase={false}
                    >
                      Calificar
                    </Button>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

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
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  progressContainer: {
    gap: 12,
  },
  progressText: {
    fontSize: 20,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyListContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 14,
    textAlign: "center",
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  avatar: {
    backgroundColor: "#FFD700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  calificarButton: {
    marginLeft: "auto",
  },
});

