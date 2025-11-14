import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, IconButton, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Assessment } from "@/src/domain/models/Assessment";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { ScoreAverages } from "@/src/domain/models/PeerReviewSummaries";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useAssessmentRepository } from "@/src/data/repositories/hooks/useAssessmentRepository";
import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { MembershipRepository } from "@/src/domain/repositories/MembershipRepository";

type RouteParams = {
  courseId: string;
  activityId: string;
};

const GOLD = "#FFD700";

export const PeerReviewMisResultadosScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, activityId } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [activityState, activityController] = useActivityController();
  const [groupState, groupController] = useGroupController();
  const assessmentRepository = useAssessmentRepository();
  const di = useDI();
  const membershipRepository = di.resolve<MembershipRepository>(TOKENS.MembershipRepository);

  const [activity, setActivity] = useState<CourseActivity | null>(null);
  const [groupAverages, setGroupAverages] = useState<ScoreAverages | null>(null);
  const [receivedAssessments, setReceivedAssessments] = useState<Assessment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

        // Cargar grupos
        await groupController.loadByCourse(courseId, { force });

        // Obtener el grupo del usuario para esta categoría
        if (loadedActivity?.categoryId) {
          const groups = groupController.groupsForCourse(courseId);
          const myMemberships = await membershipRepository.getMembershipsByUserId(user.id);
          const myGroupIds = new Set(myMemberships.map((m) => m.groupId));

          const myGroupForCategory = groups.find((group) => {
            if (group.categoryId !== loadedActivity.categoryId) return false;
            return myGroupIds.has(group.id);
          });

          if (myGroupForCategory) {
            // Calcular el resumen de la actividad para obtener promedios del grupo
            const activitySummary = await assessmentRepository.computeActivitySummary(activityId);
            const groupStats = activitySummary.groups.find((g) => g.groupId === myGroupForCategory.id);
            if (groupStats) {
              setGroupAverages(groupStats.averages);
            }

            // Obtener evaluaciones recibidas por el estudiante
            const received = await assessmentRepository.getAssessmentsReceivedByStudent(activityId, user.id);
            // Ordenar por fecha de creación (más recientes primero)
            const sorted = [...received].sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            });
            setReceivedAssessments(sorted);
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
      courseId,
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

  if (loading || !activity) {
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
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Mis Resultados</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurface }]}>{activity.title}</Text>
            </View>
          </View>

          {/* Promedio del Grupo */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <IconButton
                  icon="account-group"
                  size={20}
                  iconColor={GOLD}
                  style={styles.cardIcon}
                />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Promedio del Grupo</Text>
              </View>
            </View>
            {groupAverages ? (
              <View style={styles.metricsContainer}>
                <View style={styles.metricsRow}>
                  <MetricTag label="OVERALL" value={groupAverages.overall} theme={theme} />
                  <MetricTag label="PUNTUALIDAD" value={groupAverages.punctuality} theme={theme} />
                </View>
                <View style={styles.metricsRow}>
                  <MetricTag label="CONTRIBUCIONES" value={groupAverages.contributions} theme={theme} />
                  <MetricTag label="COMPROMISO" value={groupAverages.commitment} theme={theme} />
                </View>
                <View style={styles.metricsRow}>
                  <MetricTag label="ACTITUD" value={groupAverages.attitude} theme={theme} />
                </View>
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Sin datos aún
              </Text>
            )}
          </View>

          {/* Evaluaciones Que Recibí */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: GOLD + "33" }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <IconButton
                  icon="file-document-outline"
                  size={20}
                  iconColor={GOLD}
                  style={styles.cardIcon}
                />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  Evaluaciones que Recibí ({receivedAssessments.length})
                </Text>
              </View>
            </View>
            {receivedAssessments.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                Aún no recibes evaluaciones
              </Text>
            ) : (
              <View style={styles.assessmentsList}>
                {receivedAssessments.map((assessment, index) => (
                  <TouchableOpacity
                    key={assessment.id}
                    style={[
                      styles.assessmentItem,
                      { backgroundColor: theme.colors.surfaceVariant, borderColor: GOLD + "33" },
                    ]}
                  >
                    <View style={styles.assessmentContent}>
                      <Text style={[styles.assessmentTitle, { color: theme.colors.onSurface }]}>
                        Evaluación {index + 1}
                      </Text>
                      <Text style={[styles.assessmentSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Promedio {assessment.overallScorePersisted?.toFixed(1) ?? "0.0"} · P:{assessment.punctualityScore} C:{assessment.contributionsScore} Cm:{assessment.commitmentScore} A:{assessment.attitudeScore}
                      </Text>
                    </View>
                    <IconButton
                      icon="eye"
                      size={18}
                      iconColor={GOLD}
                      style={styles.eyeIcon}
                    />
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
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 26,
    fontWeight: "700",
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
  assessmentsList: {
    gap: 12,
  },
  assessmentItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assessmentContent: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  assessmentSubtitle: {
    fontSize: 12,
  },
  eyeIcon: {
    margin: 0,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});

