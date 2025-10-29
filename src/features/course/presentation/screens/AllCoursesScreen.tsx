import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import {
    ActivityIndicator,
    IconButton,
    Text,
    useTheme,
} from "react-native-paper";

import { Course } from "@/src/domain/models/Course";
import { Enrollment } from "@/src/domain/models/Enrollment";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useHomeRevalidation } from "@/src/features/home/hooks/useHomeRevalidation";

const GOLD = "#FFD700";
const ORANGE = "#F97316";
const DANGER = "#D32F2F";

type Mode = "teaching" | "learning";

type RouteParams = {
  mode?: Mode;
};

export default function AllCoursesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();

  const [courseState, courseController] = useCourseController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();

  const { revalidate } = useHomeRevalidation(courseController, enrollmentController);

  const params = (route.params ?? {}) as RouteParams;
  const mode: Mode = params.mode === "teaching" ? "teaching" : "learning";

  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await revalidate(true);
    } finally {
      setRefreshing(false);
    }
  }, [revalidate]);

  const teachingActiveCourses = useMemo(() => {
    if (mode !== "teaching") {
      return [] as Course[];
    }
    return courseState.teacherCourses
      .filter((course) => course.isActive)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [courseState.teacherCourses, mode]);

  const teachingInactiveCourses = useMemo(() => {
    if (mode !== "teaching") {
      return [] as Course[];
    }
    return courseState.teacherCourses
      .filter((course) => !course.isActive)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [courseState.teacherCourses, mode]);

  const learningEnrollments = useMemo(() => {
    if (mode !== "learning") {
      return [] as Enrollment[];
    }
    return enrollmentState.myEnrollments.slice().sort((a, b) => {
      const aTime = new Date(a.enrolledAt).getTime();
      const bTime = new Date(b.enrolledAt).getTime();
      return bTime - aTime;
    });
  }, [enrollmentState.myEnrollments, mode]);

  const activeLearning = useMemo(() => {
    if (mode !== "learning") {
      return [] as Enrollment[];
    }
    return learningEnrollments.filter((item) => {
      const status = enrollmentController.isCourseActive(item.courseId);
      return status !== false;
    });
  }, [learningEnrollments, enrollmentController, mode]);

  const inactiveLearning = useMemo(() => {
    if (mode !== "learning") {
      return [] as Enrollment[];
    }
    return learningEnrollments.filter((item) => {
      const status = enrollmentController.isCourseActive(item.courseId);
      return status === false;
    });
  }, [learningEnrollments, enrollmentController, mode]);

  const formatDateTime = useCallback((iso: string) => {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "";
    }
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate("CourseDetail", { courseId });
    },
    [navigation],
  );

  const renderTeachingList = () => {
    if (courseState.isLoading && courseState.teacherCourses.length === 0) {
      return <ActivityIndicator style={styles.loader} />;
    }

    if (teachingActiveCourses.length === 0 && teachingInactiveCourses.length === 0) {
      return (
        <EmptyState
          message="No tienes cursos creados aún"
          cardColor={theme.colors.surface}
          outlineColor={`${theme.colors.outline}33`}
          onSurface={theme.colors.onSurface}
        />
      );
    }

    return (
      <View>
        {teachingActiveCourses.length > 0 && (
          <SectionLabel
            label={`Activos (${teachingActiveCourses.length})`}
            color={theme.colors.onSurface}
            style={{ marginTop: 4, marginBottom: 12 }}
          />
        )}

        {teachingActiveCourses.map((course) => (
          <CourseListCard
            key={course.id}
            title={course.name}
            outlineColor={`${GOLD}73`}
            iconColor={GOLD}
            iconName="bookmark"
            onPress={() => handleCoursePress(course.id)}
            cardColor={theme.colors.surface}
            onSurface={theme.colors.onSurface}
            pills={[
              { icon: "qr-code-2", text: `Código: ${course.joinCode}` },
              { icon: "schedule", text: `Creado: ${formatDateTime(course.createdAt)}` },
            ]}
          />
        ))}

        {teachingActiveCourses.length > 0 && teachingInactiveCourses.length > 0 && (
          <View style={styles.divider} />
        )}

        {teachingInactiveCourses.length > 0 && (
          <View>
            <InactiveToggle
              count={teachingInactiveCourses.length}
              expanded={showInactive}
              onToggle={() => setShowInactive((prev) => !prev)}
            />
            {showInactive && (
              <View style={{ marginTop: 12 }}>
                {teachingInactiveCourses.map((course) => (
                  <CourseListCard
                    key={course.id}
                    title={course.name}
                    outlineColor={`${DANGER}99`}
                    iconColor={DANGER}
                    iconName="bookmark"
                    onPress={() => handleCoursePress(course.id)}
                    cardColor={theme.colors.surface}
                    onSurface={theme.colors.onSurface}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderLearningList = () => {
    if (enrollmentState.isLoading && enrollmentState.myEnrollments.length === 0) {
      return <ActivityIndicator style={styles.loader} />;
    }

    if (learningEnrollments.length === 0) {
      return (
        <EmptyState
          message="Aún no estás inscrito en cursos"
          cardColor={theme.colors.surface}
          outlineColor={`${theme.colors.outline}33`}
          onSurface={theme.colors.onSurface}
        />
      );
    }

    return (
      <View>
        <SectionLabel
          label={`Cursos inscritos (${learningEnrollments.length})`}
          color={theme.colors.onSurface}
          style={{ marginBottom: 16 }}
          uppercase
          leadingIcon="school"
        />

        {activeLearning.map((enrollment) => {
          const courseTitle = enrollmentController.getCourseTitle(enrollment.courseId);
          const teacherName = enrollmentController.getCourseTeacherName(enrollment.courseId);
          const formattedDate = formatDateTime(enrollment.enrolledAt);

          const pills = [] as CoursePill[];
          if (teacherName.trim().length > 0) {
            pills.push({ icon: "person-outline", text: teacherName });
          }
          if (formattedDate.length > 0) {
            pills.push({ icon: "event-available", text: `Inscrito: ${formattedDate}` });
          }

          return (
            <CourseListCard
              key={enrollment.id}
              title={courseTitle}
              outlineColor={`${GOLD}66`}
              iconColor={ORANGE}
              iconName="school"
              onPress={() => handleCoursePress(enrollment.courseId)}
              cardColor={theme.colors.surface}
              onSurface={theme.colors.onSurface}
              pills={pills}
            />
          );
        })}

        {activeLearning.length > 0 && inactiveLearning.length > 0 && (
          <View style={styles.divider} />
        )}

        {inactiveLearning.length > 0 && (
          <View>
            <InactiveToggle
              count={inactiveLearning.length}
              expanded={showInactive}
              onToggle={() => setShowInactive((prev) => !prev)}
            />
            {showInactive && (
              <View style={{ marginTop: 12 }}>
                {inactiveLearning.map((enrollment) => {
                  const courseTitle = enrollmentController.getCourseTitle(enrollment.courseId);
                  return (
                    <CourseListCard
                      key={enrollment.id}
                      title={courseTitle}
                      outlineColor={`${DANGER}99`}
                      iconColor={DANGER}
                      iconName="school"
                      onPress={() => handleCoursePress(enrollment.courseId)}
                      cardColor={theme.colors.surface}
                      onSurface={theme.colors.onSurface}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const subtitle = mode === "teaching" ? "Mi enseñanza" : "Mi aprendizaje";
  const title =
    mode === "teaching"
      ? "Cursos en los que enseñas"
      : "Cursos en los que estás inscrito";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
        >
          <View style={styles.headerRow}>
            <IconButton
              icon={() => <MaterialIcons name="arrow-back-ios" size={20} color={GOLD} />}
              onPress={handleGoBack}
              style={styles.backButton}
            />
            <View style={styles.headerTextContainer}>
              <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>{subtitle}</Text>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />

          {mode === "teaching" ? renderTeachingList() : renderLearningList()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type CoursePill = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  text: string;
};

type CourseListCardProps = {
  title: string;
  cardColor: string;
  outlineColor: string;
  onSurface: string;
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
  iconColor: string;
  onPress: () => void;
  pills?: CoursePill[];
};

function CourseListCard({
  title,
  cardColor,
  outlineColor,
  onSurface,
  iconName,
  iconColor,
  onPress,
  pills = [],
}: CourseListCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardColor,
            borderColor: outlineColor,
          },
        ]}
      >
        <View style={[styles.cardIconWrapper, { backgroundColor: `${iconColor}1A` }]}> 
          <MaterialIcons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: onSurface }]} numberOfLines={2}>
            {title}
          </Text>
          {pills.length > 0 && (
            <View style={styles.pillRow}>
              {pills.map((pill) => (
                <View key={`${pill.icon}-${pill.text}`} style={styles.pill}>
                  <MaterialIcons name={pill.icon} size={14} color={iconColor} style={{ marginRight: 4 }} />
                  <Text style={styles.pillText}>{pill.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={20} color={onSurface} style={{ opacity: 0.3 }} />
      </View>
    </TouchableOpacity>
  );
}

type InactiveToggleProps = {
  count: number;
  expanded: boolean;
  onToggle: () => void;
};

function InactiveToggle({ count, expanded, onToggle }: InactiveToggleProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      style={styles.inactiveToggle}
    >
      <MaterialIcons
        name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
        size={20}
        color={DANGER}
      />
      <Text style={styles.inactiveToggleText}>Inactivos ({count})</Text>
    </TouchableOpacity>
  );
}

type SectionLabelProps = {
  label: string;
  color: string;
  style?: object;
  uppercase?: boolean;
  leadingIcon?: React.ComponentProps<typeof MaterialIcons>["name"];
};

function SectionLabel({ label, color, style, uppercase, leadingIcon }: SectionLabelProps) {
  return (
    <View style={[styles.sectionLabel, style]}>
      {leadingIcon ? (
        <MaterialIcons name={leadingIcon} size={20} color={GOLD} style={{ marginRight: 8 }} />
      ) : null}
      <Text
        style={[
          styles.sectionLabelText,
          {
            color,
            letterSpacing: uppercase ? 0.4 : 0,
          },
        ]}
      >
        {uppercase ? label.toUpperCase() : label}
      </Text>
    </View>
  );
}

type EmptyStateProps = {
  message: string;
  cardColor: string;
  outlineColor: string;
  onSurface: string;
};

function EmptyState({ message, cardColor, outlineColor, onSurface }: EmptyStateProps) {
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: cardColor,
          borderColor: outlineColor,
        },
      ]}
    >
      <Text style={[styles.emptyStateText, { color: onSurface }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    margin: 0,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,215,0,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 12,
    color: "#6B6B6B",
  },
  inactiveToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  inactiveToggleText: {
    marginLeft: 4,
    color: DANGER,
    fontWeight: "600",
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionLabelText: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyState: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 16,
  },
  loader: {
    marginVertical: 32,
  },
});
