import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { Group } from "@/src/domain/models/Group";
import { CoursePeerReviewSummary, GroupCrossActivityStats, ScoreAverages } from "@/src/domain/models/PeerReviewSummaries";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { usePeerReviewController } from "@/src/features/peerReview/hooks/usePeerReviewController";

type RouteParams = {
  courseId: string;
  activityIds: string[];
};

const CoursePeerReviewSummaryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, activityIds } = (route.params ?? {}) as RouteParams;

  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [, courseController] = useCourseController();
  const [, activityController] = useActivityController();
  const [, groupController] = useGroupController();
  const [, enrollmentController] = useEnrollmentController();
  const [peerReviewState, peerReviewController] = usePeerReviewController();

  const [refreshing, setRefreshing] = useState(false);
  const [course, setCourse] = useState<any>(null);

  const currentActivityIds = useMemo(() => {
    if (activityIds && activityIds.length > 0) return activityIds;
    const activities = activityController.activitiesForCourse(courseId);
    return activities
      .filter((a) => a.reviewing && !a.privateReview)
      .map((a) => a.id);
  }, [activityIds, activityController, courseId]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId) return;
      const fetchedCourse = await courseController.getCourseById(courseId);
      if (fetchedCourse) {
        setCourse(fetchedCourse);
      }
      await groupController.loadByCourse(courseId, { force });
      await enrollmentController.loadEnrollmentsForCourse(courseId, { force });
      
      if (currentActivityIds.length === 0) {
        await activityController.loadByCourse(courseId, { force });
      }
      
      if (currentActivityIds.length > 0) {
        await peerReviewController.loadCourseSummary(courseId, currentActivityIds, force);
      }
    },
    [
      activityController,
      courseController,
      courseId,
      currentActivityIds,
      enrollmentController,
      groupController,
      peerReviewController,
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

  const groups = useMemo(() => {
    return groupController.groupsForCourse(courseId);
  }, [courseId, groupController]);

  const activities = useMemo(() => {
    return activityController.activitiesForCourse(courseId);
  }, [activityController, courseId]);

  const consideredActivities = useMemo(() => {
    return activities.filter((a) => currentActivityIds.includes(a.id));
  }, [activities, currentActivityIds]);

  const summary = peerReviewState.courseSummaries[courseId];

  const isLoading = peerReviewState.isLoading && !summary;

  const handleGroupTap = useCallback(
    (groupId: string, groupName: string) => {
      navigation.navigate("GroupPeerReviewSummary", {
        courseId,
        groupId,
        activityIds: currentActivityIds,
        groupName,
      });
    },
    [courseId, currentActivityIds, navigation],
  );

  const renderContent = () => {
    if (peerReviewState.error) {
      return (
        <SectionCard title="Error al cargar" icon="error-outline" theme={theme}>
          <Text style={{ color: theme.colors.error }}>{peerReviewState.error}</Text>
        </SectionCard>
      );
    }

    if (currentActivityIds.length === 0) {
      return (
        <SectionCard
          title="Sin actividades con peer review"
          icon="info-outline"
          theme={theme}
        >
          <Text>
            Configura actividades públicas de peer review para ver resultados a nivel curso.
          </Text>
        </SectionCard>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando resumen...
          </Text>
        </View>
      );
    }

    if (!summary) {
      return (
        <SectionCard title="Sin evaluaciones registradas" icon="info-outline" theme={theme}>
          <Text>
            Aún no hay evaluaciones registradas para las actividades consideradas.
          </Text>
        </SectionCard>
      );
    }

    return (
      <>
        {renderOverviewCard(summary, currentActivityIds.length, groups.length, theme)}
        {renderGroupsCard(summary.groups, groups, theme, handleGroupTap)}
        {consideredActivities.length > 0 && renderActivitiesSection(consideredActivities, theme)}
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 20) + 12,
              paddingBottom: 120 + insets.bottom,
            },
          ]}
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
            <View style={styles.headerTexts}>
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Resultados globales de peer review
              </Text>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                {course?.name ?? "Curso"}
              </Text>
            </View>
          </View>

          {renderContent()}
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

function weightedAverage(groups: GroupCrossActivityStats[]): ScoreAverages | null {
  let weightSum = 0;
  let punctuality = 0;
  let contributions = 0;
  let commitment = 0;
  let attitude = 0;
  let overall = 0;

  for (const g of groups) {
    const weight = g.assessmentsCount;
    if (weight <= 0) continue;
    weightSum += weight;
    punctuality += g.averages.punctuality * weight;
    contributions += g.averages.contributions * weight;
    commitment += g.averages.commitment * weight;
    attitude += g.averages.attitude * weight;
    overall += g.averages.overall * weight;
  }

  if (weightSum === 0) return null;

  const round = (value: number) => parseFloat((value / weightSum).toFixed(2));

  return {
    punctuality: round(punctuality),
    contributions: round(contributions),
    commitment: round(commitment),
    attitude: round(attitude),
    overall: round(overall),
  };
}

function renderOverviewCard(
  summary: CoursePeerReviewSummary,
  activityCount: number,
  totalGroupsCount: number,
  theme: any,
) {
  const averages = weightedAverage(summary.groups);
  if (!averages) return null;

  const totalAssessments = summary.groups.reduce((acc, g) => acc + g.assessmentsCount, 0);

  return (
    <SectionCard title="Panorama general" icon="insights" theme={theme}>
      <View style={styles.metricsWrap}>
        <MetricChip label="OVERALL" value={averages.overall} theme={theme} />
        <MetricChip label="PUNTUALIDAD" value={averages.punctuality} theme={theme} />
        <MetricChip label="CONTRIBUCIONES" value={averages.contributions} theme={theme} />
        <MetricChip label="COMPROMISO" value={averages.commitment} theme={theme} />
        <MetricChip label="ACTITUD" value={averages.attitude} theme={theme} />
      </View>
      <View style={[styles.metricsWrap, { marginTop: 16 }]}>
        <InfoChip label="EVALUACIONES" value={totalAssessments.toString()} theme={theme} />
        <InfoChip label="GRUPOS" value={totalGroupsCount.toString()} theme={theme} />
        <InfoChip label="ESTUDIANTES" value={summary.students.length.toString()} theme={theme} />
        <InfoChip label="ACTIVIDADES" value={activityCount.toString()} theme={theme} />
      </View>
    </SectionCard>
  );
}

function renderGroupsCard(
  groupStats: GroupCrossActivityStats[],
  groups: Group[],
  theme: any,
  onTap: (groupId: string, groupName: string) => void,
) {
  if (groupStats.length === 0) {
    return (
      <SectionCard title="Grupos" icon="groups" theme={theme}>
        <Text>No hay resultados disponibles por grupo todavía.</Text>
      </SectionCard>
    );
  }

  const nameById: Record<string, string> = {};
  for (const g of groups) {
    nameById[g.id] = g.name;
  }

  return (
    <SectionCard title={`Grupos (${groupStats.length})`} icon="groups" theme={theme}>
      {groupStats.map((stats) => {
        const name = nameById[stats.groupId] ?? stats.groupId;
        const hasResults = stats.assessmentsCount > 0;
        return (
          <TouchableOpacity
            key={stats.groupId}
            style={[
              styles.groupItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant ?? "#00000012",
              },
            ]}
            onPress={() => onTap(stats.groupId, name)}
          >
            <View style={styles.groupContent}>
              <Text style={[styles.groupName, { color: theme.colors.onSurface }]}>{name}</Text>
              {hasResults ? (
                <View style={styles.groupMetrics}>
                  <MetricChip label="OVERALL" value={stats.averages.overall} theme={theme} small />
                  <MetricChip label="PUNTUALIDAD" value={stats.averages.punctuality} theme={theme} small />
                  <MetricChip label="CONTRIBUCIONES" value={stats.averages.contributions} theme={theme} small />
                  <MetricChip label="COMPROMISO" value={stats.averages.commitment} theme={theme} small />
                  <MetricChip label="ACTITUD" value={stats.averages.attitude} theme={theme} small />
                </View>
              ) : (
                <Text style={[styles.noEvaluations, { color: theme.colors.onSurfaceVariant }]}>
                  Sin evaluaciones registradas.
                </Text>
              )}
            </View>
            <View style={styles.groupTrailing}>
              <View style={styles.assessmentCount}>
                <Text style={[styles.countNumber, { color: theme.colors.onSurface }]}>
                  {stats.assessmentsCount}
                </Text>
                <Text style={[styles.countLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {stats.assessmentsCount === 1 ? "evaluación" : "evaluaciones"}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </SectionCard>
  );
}

function renderActivitiesSection(activities: CourseActivity[], theme: any) {
  return (
    <SectionCard
      title={`Actividades consideradas (${activities.length})`}
      icon="list-alt"
      theme={theme}
    >
      {activities.map((a) => (
        <View key={a.id} style={styles.activityItem}>
          <MaterialIcons
            name="task-alt"
            size={18}
            color={theme.colors.primary}
            style={styles.activityIcon}
          />
          <View style={styles.activityContent}>
            <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]}>
              {a.title}
            </Text>
            {a.dueDate && (
              <Text style={[styles.activitySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Cierre: {formatDate(a.dueDate)}
              </Text>
            )}
          </View>
        </View>
      ))}
    </SectionCard>
  );
}

type SectionCardProps = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  theme: any;
  children: React.ReactNode;
};

function SectionCard({ title, icon, theme, children }: SectionCardProps) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary + "80",
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={20} color={theme.colors.primary} style={styles.sectionIcon} />
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

type MetricChipProps = {
  label: string;
  value: number;
  theme: any;
  small?: boolean;
};

function MetricChip({ label, value, theme, small }: MetricChipProps) {
  return (
    <View
      style={[
        small ? styles.metricChipSmall : styles.metricChip,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary + "73",
        },
      ]}
    >
      <Text
        style={[
          small ? styles.metricLabelSmall : styles.metricLabel,
          { color: theme.colors.primary },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <Text style={[small ? styles.metricValueSmall : styles.metricValue, { color: theme.colors.onSurface }]}>
        {value.toFixed(2)}
      </Text>
    </View>
  );
}

type InfoChipProps = {
  label: string;
  value: string;
  theme: any;
};

function InfoChip({ label, value, theme }: InfoChipProps) {
  return (
    <View
      style={[
        styles.infoChip,
        {
          backgroundColor: theme.colors.primary + "1A",
          borderColor: theme.colors.primary + "66",
        },
      ]}
    >
      <Text style={[styles.infoLabel, { color: theme.colors.primary }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

function formatDate(raw?: string | null): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerTexts: {
    flex: 1,
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 6,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  sectionCard: {
    borderWidth: 1.2,
    borderRadius: 20,
    padding: 18,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionBody: {
    marginTop: 14,
  },
  metricsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  metricLabelSmall: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  metricValueSmall: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  infoChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  groupItem: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
  },
  groupMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  noEvaluations: {
    fontSize: 13,
    marginTop: 4,
  },
  groupTrailing: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  assessmentCount: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  countNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  countLabel: {
    fontSize: 11,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  activityIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  activitySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default CoursePeerReviewSummaryScreen;
