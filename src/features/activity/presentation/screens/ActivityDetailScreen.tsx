import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Course } from "@/src/domain/models/Course";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

type RouteParams = {
  courseId: string;
  activityId: string;
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", DATE_FORMAT).format(date);
};

const formatDueDate = (value?: string | null) => {
  if (!value) return "Sin fecha límite";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha límite";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const ActivityDetailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, activityId } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [activityState, activityController] = useActivityController();
  const [categoryState, categoryController] = useCategoryController();
  const [, courseController] = useCourseController();

  const [activity, setActivity] = useState<CourseActivity | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPeerReview, setUpdatingPeerReview] = useState(false);

  const category = useMemo(() => {
    if (!courseId || !activity?.categoryId) return null;
    return categoryController.categoriesFor(courseId).find((cat) => cat.id === activity.categoryId);
  }, [activity?.categoryId, categoryController, courseId]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId || !activityId) return;
      await Promise.all([
        categoryController.loadByCourse(courseId, { force }),
        activityController.loadForStudent(courseId, { force }),
        activityController.loadByCourse(courseId, { force }),
      ]);
      const loadedActivity = await activityController.getActivityById(activityId);
      if (loadedActivity) {
        setActivity(loadedActivity);
      }
    },
    [activityController, categoryController, activityId, courseId],
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

  useEffect(() => {
    if (activityState.activitiesByCourse[courseId]) {
      const found = activityState.activitiesByCourse[courseId].find((a) => a.id === activityId);
      if (found) {
        setActivity(found);
      }
    }
  }, [activityState.activitiesByCourse, activityId, courseId]);

  useEffect(() => {
    if (!courseId) return;
    courseController.getCourseById(courseId).then((data) => {
      if (data) {
        setCourse(data);
      }
    });
  }, [courseController, courseId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleCalificar = useCallback(() => {
    if (!courseId || !activityId) return;
    navigation.navigate("PeerReviewCalificar", { courseId, activityId });
  }, [courseId, activityId, navigation]);

  const handleMisResultados = useCallback(() => {
    if (!courseId || !activityId) return;
    navigation.navigate("PeerReviewMisResultados", { courseId, activityId });
  }, [courseId, activityId, navigation]);

  if (!activity) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando actividad...
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  const categoryName = category?.name ?? "Sin categoría";
  const dueDate = formatDueDate(activity.dueDate);
  const isActive = activity.isActive;
  const description = activity.description?.trim() || "No tiene descripción";
  const hasPeerReview = activity.reviewing ?? false;
  const isTeacher = course?.teacherId && user?.id ? course.teacherId === user.id : false;
  const peerReviewStatus = hasPeerReview ? "Activo" : "Inactivo";
  const peerReviewColor = hasPeerReview ? "#4CAF50" : "#F44336";
  const canCalificar = hasPeerReview && !isTeacher;

  const handleEnablePeerReview = useCallback(async () => {
    if (!activity) return;
    setUpdatingPeerReview(true);
    try {
      const updated = await activityController.updateActivity({
        ...activity,
        reviewing: true,
        privateReview: false,
      });
      if (updated) {
        setActivity(updated);
        Alert.alert("Peer Review activado", "Los estudiantes ya pueden evaluarse en esta actividad.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo activar el Peer Review. Intenta nuevamente.");
    } finally {
      setUpdatingPeerReview(false);
    }
  }, [activity, activityController]);

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
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{activity.title}</Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            <Chip
              icon="folder"
              style={[
                styles.tag,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
              textStyle={{ color: theme.colors.onSurfaceVariant }}
            >
              CATEGORIA: {categoryName}
            </Chip>

            <Chip
              icon="schedule"
              style={[
                styles.tag,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
              textStyle={{ color: theme.colors.onSurfaceVariant }}
            >
              VENCE: {dueDate}
            </Chip>

            <Chip
              icon={isActive ? "check-circle" : "cancel"}
              style={[
                styles.tag,
                {
                  backgroundColor: isActive ? "#4CAF50" : "#F44336",
                },
              ]}
              textStyle={{ color: "#FFFFFF" }}
            >
              ESTADO: {isActive ? "Activo" : "Inactivo"}
            </Chip>

            <Chip
              icon="account-group"
              style={[
                styles.tag,
                {
                  backgroundColor: peerReviewColor,
                },
              ]}
              textStyle={{ color: "#FFFFFF" }}
            >
              PEER REVIEW: {peerReviewStatus}
            </Chip>
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Descripción</Text>
            <Text style={[styles.descriptionText, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
          </View>

          {/* Peer Review */}
          {canCalificar && (
            <View style={styles.section}>
              <View style={styles.peerReviewHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Peer Review</Text>
                <Button
                  mode="contained"
                  onPress={handleCalificar}
                  style={styles.calificarButton}
                  uppercase={false}
                >
                  CALIFICAR
                </Button>
              </View>
            </View>
          )}

          {/* Mis Resultados */}
          {!isTeacher && hasPeerReview && (
            <View style={styles.section}>
              <Button
                mode="contained-tonal"
                onPress={handleMisResultados}
                icon="chart-line"
                style={styles.resultadosButton}
                uppercase={false}
              >
                MIS RESULTADOS
              </Button>
            </View>
          )}

          {isTeacher && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Peer Review</Text>
              <Text style={[styles.descriptionText, { color: theme.colors.onSurfaceVariant, marginBottom: 12 }]}>
                {hasPeerReview
                  ? "Los estudiantes ya pueden calificar esta actividad."
                  : "Activa el peer review para habilitar las evaluaciones entre estudiantes."}
              </Text>
              {hasPeerReview ? (
                <Chip icon="check" style={[styles.tag, { backgroundColor: peerReviewColor }]} textStyle={{ color: "#FFF" }}>
                  Peer review activo
                </Chip>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleEnablePeerReview}
                  loading={updatingPeerReview}
                  disabled={updatingPeerReview}
                  style={styles.calificarButton}
                >
                  ACTIVAR PEER REVIEW
                </Button>
              )}
            </View>
          )}
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
  headerDetails: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tag: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  peerReviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calificarButton: {
    marginLeft: 12,
  },
  resultadosButton: {
    marginTop: 8,
  },
});

