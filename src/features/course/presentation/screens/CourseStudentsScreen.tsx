import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    IconButton,
    Text,
    useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Enrollment } from "@/src/domain/models/Enrollment";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";

type RouteParams = {
  courseId: string;
};

const CourseStudentsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId } = (route.params ?? {}) as RouteParams;

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [, courseController] = useCourseController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();

  const [courseTitle, setCourseTitle] = useState("Curso");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const enrollments = useMemo(() => {
    if (!courseId) return [] as Enrollment[];
    return enrollmentController
      .enrollmentsFor(courseId)
      .slice()
      .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
  }, [courseId, enrollmentController]);

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId) return;
      const course = await courseController.getCourseById(courseId);
      if (course) {
        setCourseTitle(course.name);
        setJoinCode(course.joinCode);
      }
      await Promise.all([
        enrollmentController.loadEnrollmentsForCourse(courseId, { force }),
        enrollmentController.loadEnrollmentCountForCourse(courseId, { force }),
      ]);
    },
    [courseController, courseId, enrollmentController],
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

  const loading = enrollmentState.isLoading && enrollments.length === 0;
  const total = enrollmentController.enrollmentCountFor(courseId);

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
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
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>Estudiantes</Text>
              <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                {courseTitle}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaPill,
                {
                  borderColor: theme.colors.outlineVariant ?? "#00000012",
                  backgroundColor: theme.colors.secondaryContainer,
                },
              ]}
            >
              <MaterialIcons
                name="people"
                size={16}
                color={theme.colors.onSecondaryContainer}
                style={styles.metaPillIcon}
              />
              <Text style={[styles.metaPillText, { color: theme.colors.onSecondaryContainer }]}>
                {total} inscrito{total === 1 ? "" : "s"}
              </Text>
            </View>
            {joinCode ? (
              <View
                style={[
                  styles.metaPill,
                  {
                    borderColor: theme.colors.outlineVariant ?? "#00000012",
                    backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
                  },
                ]}
              >
                <MaterialIcons
                  name="confirmation-number"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.metaPillIcon}
                />
                <Text style={[styles.metaPillText, { color: theme.colors.onSurface }]}>
                  Código: {joinCode}
                </Text>
              </View>
            ) : null}
          </View>

          {enrollmentState.error ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{enrollmentState.error}</Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Cargando estudiantes…</Text>
            </View>
          ) : enrollments.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  borderColor: theme.colors.outlineVariant ?? "#00000012",
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <MaterialIcons
                name="people-outline"
                size={42}
                color={theme.colors.primary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                No hay estudiantes inscritos
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {enrollments.map((enrollment) => {
                const name = enrollmentController.userName(enrollment.studentId);
                const email = enrollmentController.userEmail(enrollment.studentId);
                const subtitle = email
                  ? email
                  : `Inscrito: ${formatShortDate(enrollment.enrolledAt)}`;
                return (
                  <View
                    key={enrollment.id}
                    style={[
                      styles.studentItem,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant ?? "#00000012",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color={theme.colors.primary}
                      style={styles.studentIcon}
                    />
                    <View style={styles.studentContent}>
                      <Text style={[styles.studentName, { color: theme.colors.onSurface }]}>{name}</Text>
                      <Text style={[styles.studentSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {subtitle}
                      </Text>
                    </View>
                  </View>
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

export default CourseStudentsScreen;

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
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  metaPillIcon: {
    marginRight: 6,
  },
  metaPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 16,
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
  emptyCard: {
    marginTop: 28,
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    marginTop: 20,
  },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  studentIcon: {
    marginRight: 12,
  },
  studentContent: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
  },
  studentSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
});

const formatShortDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
