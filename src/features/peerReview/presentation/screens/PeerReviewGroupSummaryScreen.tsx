import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, IconButton, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { GroupCrossActivityStats, ScoreAverages, StudentCrossActivityStats } from "@/src/domain/models/PeerReviewSummaries";
import { Membership } from "@/src/domain/models/Membership";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useAssessmentRepository } from "@/src/data/repositories/hooks/useAssessmentRepository";
import useComputeCourseSummary from "@/src/features/peerReview/hooks/useComputeCourseSummary";
import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

type RouteParams = {
  courseId: string;
  groupId: string;
  groupName?: string;
  activityIds: string[];
};

const GOLD = "#FFD700";

export const PeerReviewGroupSummaryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, groupId, groupName: routeGroupName, activityIds } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [courseState, courseController] = useCourseController();
  const [activityState, activityController] = useActivityController();
  const [groupState, groupController] = useGroupController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();
  const assessmentRepository = useAssessmentRepository();
  const di = useDI();
  const { execute: computeCourseSummary } = useComputeCourseSummary();
  
  // Validar que los hooks devuelvan valores válidos
  if (!courseController || !groupController || !activityController || !enrollmentController) {
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

  const [groupStats, setGroupStats] = useState<GroupCrossActivityStats | null>(null);
  const [studentStats, setStudentStats] = useState<Map<string, StudentCrossActivityStats>>(new Map());
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activities, setActivities] = useState<CourseActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  const course = courseState?.coursesCache?.[courseId];
  const groups = groupController?.groupsForCourse?.(courseId) ?? [];
  const group = groups.find((g) => g.id === groupId);
  const groupName = routeGroupName || group?.name || "Grupo";

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId || !groupId || activityIds.length === 0) return;

      setLoading(true);
      try {
        await Promise.all([
          courseController.getCourseById(courseId, { force }),
          groupController.loadByCourse(courseId, { force }),
          activityController.loadForStudent(courseId, { force }),
        ]);

        // Cargar resumen del curso (usecase de dominio)
        const summary = await computeCourseSummary(activityIds);
        const foundGroupStats = summary.groups.find((g) => g.groupId === groupId);
        setGroupStats(foundGroupStats || null);

        // Crear mapa de estadísticas por estudiante
        const statsMap = new Map<string, StudentCrossActivityStats>();
        for (const student of summary.students) {
          statsMap.set(student.studentId, student);
        }
        setStudentStats(statsMap);

        // Obtener actividades consideradas
        const allActivities = activityState?.studentActivitiesByCourse?.[courseId] ?? [];
        const considered = allActivities.filter((a) => activityIds.includes(a.id));
        setActivities(considered);

        // Cargar miembros del grupo
        setMembersLoading(true);
        try {
          const members = await membershipRepository.getMembershipsByGroupId(groupId);
          for (const member of members) {
            await enrollmentController.ensureUserLoaded(member.userId);
          }
          setMemberships(members);
        } catch (error) {
          console.error("Error loading members:", error);
        } finally {
          setMembersLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      courseId,
      groupId,
      activityIds,
      courseController,
      groupController,
      activityController,
      assessmentRepository,
      computeCourseSummary,
      membershipRepository,
      enrollmentController,
      activityState?.studentActivitiesByCourse,
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando resultados...
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
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{groupName}</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {course ? `Promedios globales · ${course.name}` : "Promedios de Peer Review"}
              </Text>
            </View>
          </View>

          {/* Promedio del Grupo */}
          {groupStats && groupStats.assessmentsCount > 0 ? (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <IconButton
                    icon="insights"
                    size={20}
                    iconColor={GOLD}
                    style={styles.cardIcon}
                  />
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                    Promedios del grupo ({groupStats.assessmentsCount}{" "}
                    {groupStats.assessmentsCount === 1 ? "evaluación" : "evaluaciones"})
                  </Text>
                </View>
              </View>
              <View style={styles.metricsContainer}>
                <View style={styles.metricsRow}>
                  <MetricTag label="OVERALL" value={groupStats.averages.overall} theme={theme} />
                  <MetricTag label="PUNTUALIDAD" value={groupStats.averages.punctuality} theme={theme} />
                </View>
                <View style={styles.metricsRow}>
                  <MetricTag label="CONTRIBUCIONES" value={groupStats.averages.contributions} theme={theme} />
                  <MetricTag label="COMPROMISO" value={groupStats.averages.commitment} theme={theme} />
                </View>
                <View style={styles.metricsRow}>
                  <MetricTag label="ACTITUD" value={groupStats.averages.attitude} theme={theme} />
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Sin evaluaciones registradas
              </Text>
            </View>
          )}

          {/* Resumen */}
          {groupStats && groupStats.assessmentsCount > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <IconButton
                    icon="article-outline"
                    size={20}
                    iconColor={GOLD}
                    style={styles.cardIcon}
                  />
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Resumen</Text>
                </View>
              </View>
              <View style={styles.summaryContent}>
                <SummaryRow
                  label="Evaluaciones registradas"
                  value={groupStats.assessmentsCount.toString()}
                  theme={theme}
                />
                <SummaryRow
                  label="Actividades consideradas"
                  value={activityIds.length.toString()}
                  theme={theme}
                />
                <SummaryRow
                  label="Integrantes detectados"
                  value={memberships.length.toString()}
                  theme={theme}
                />
              </View>
            </View>
          )}

          {/* Integrantes */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <IconButton
                  icon="account-group"
                  size={20}
                  iconColor={GOLD}
                  style={styles.cardIcon}
                />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Integrantes</Text>
              </View>
            </View>
            {membersLoading ? (
              <View style={styles.loadingMembers}>
                <ActivityIndicator size="small" />
              </View>
            ) : memberships.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                El grupo aún no tiene integrantes registrados.
              </Text>
            ) : (
              <View style={styles.membersList}>
                {[...memberships]
                  .sort((a, b) => {
                    try {
                      const nameA = enrollmentController?.userName?.(a.userId)?.toLowerCase() ?? "";
                      const nameB = enrollmentController?.userName?.(b.userId)?.toLowerCase() ?? "";
                      return nameA.localeCompare(nameB);
                    } catch {
                      return 0;
                    }
                  })
                  .map((membership) => {
                    const studentStat = studentStats.get(membership.userId);
                    const userName = enrollmentController?.userName?.(membership.userId) ?? membership.userId;
                    return (
                      <View
                        key={membership.userId}
                        style={[
                          styles.memberItem,
                          { backgroundColor: theme.colors.surfaceVariant, borderColor: GOLD + "33" },
                        ]}
                      >
                        <View style={styles.memberHeader}>
                          <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
                            {userName}
                          </Text>
                          {studentStat && (
                            <Text style={[styles.memberCount, { color: theme.colors.onSurfaceVariant }]}>
                              {studentStat.assessmentsReceived}{" "}
                              {studentStat.assessmentsReceived === 1 ? "evaluación" : "evaluaciones"}
                            </Text>
                          )}
                        </View>
                        {studentStat ? (
                          <View style={styles.memberMetrics}>
                            <MetricTag label="OVERALL" value={studentStat.averages.overall} theme={theme} />
                            <MetricTag
                              label="PUNTUALIDAD"
                              value={studentStat.averages.punctuality}
                              theme={theme}
                            />
                            <MetricTag
                              label="CONTRIBUCIONES"
                              value={studentStat.averages.contributions}
                              theme={theme}
                            />
                            <MetricTag
                              label="COMPROMISO"
                              value={studentStat.averages.commitment}
                              theme={theme}
                            />
                            <MetricTag label="ACTITUD" value={studentStat.averages.attitude} theme={theme} />
                          </View>
                        ) : (
                          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                            Sin evaluaciones registradas en las actividades públicas.
                          </Text>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Actividades Consideradas */}
          {activities.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <IconButton
                    icon="list-alt"
                    size={20}
                    iconColor={GOLD}
                    style={styles.cardIcon}
                  />
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                    Actividades consideradas ({activities.length})
                  </Text>
                </View>
              </View>
              <View style={styles.activitiesList}>
                {activities.map((activity) => {
                  const dueDate = activity.dueDate
                    ? new Date(activity.dueDate).toISOString().split("T")[0]
                    : null;
                  return (
                    <View key={activity.id} style={styles.activityItem}>
                      <IconButton icon="task-alt" size={18} iconColor={GOLD} style={styles.activityIcon} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]}>
                          {activity.title}
                        </Text>
                        {dueDate && (
                          <Text style={[styles.activitySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                            Cierre: {dueDate}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

type MetricTagProps = {
  label: string;
  value: number;
  theme: any;
};

const MetricTag: React.FC<MetricTagProps> = ({ label, value, theme }) => {
  return (
    <View
      style={[
        styles.metricTag,
        { backgroundColor: theme.colors.surface, borderColor: GOLD + "73" },
      ]}
    >
      <Text style={[styles.metricLabel, { color: GOLD + "F2" }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
        {value.toFixed(2)}
      </Text>
    </View>
  );
};

type SummaryRowProps = {
  label: string;
  value: string;
  theme: any;
};

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, theme }) => {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
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
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    margin: 0,
    marginRight: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricsContainer: {
    gap: 8,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  metricTag: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 120,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryContent: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingMembers: {
    paddingVertical: 24,
    alignItems: "center",
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  memberHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  memberMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activitiesList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    margin: 0,
    marginRight: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  activitySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});

