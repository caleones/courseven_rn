import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { FAB, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { CreateCourseUseCase } from "@/src/domain/usecases/course/CreateCourseUseCase";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useHomeRevalidation } from "@/src/features/home/hooks/useHomeRevalidation";
import { InformationSection } from "../components/InformationSection";
import { LearningCourseItem, LearningSection } from "../components/LearningSection";
import { TeachingCourseItem, TeachingSection } from "../components/TeachingSection";
import { WelcomeCard } from "../components/WelcomeCard";

const SECTION_SPACING = 24;
const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

export default function HomeScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [courseState, courseController] = useCourseController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();

  const { revalidate } = useHomeRevalidation(courseController, enrollmentController);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await revalidate(true);
    } finally {
      setRefreshing(false);
    }
  }, [revalidate]);

  const teachingCourses: TeachingCourseItem[] = useMemo(
    () =>
      courseState.teacherCourses
        .filter((course) => course.isActive)
        .map((course) => ({
          id: course.id,
          name: course.name,
          joinCode: course.joinCode,
        })),
    [courseState.teacherCourses],
  );

  const inactiveTeachingCount = useMemo(
    () => courseState.teacherCourses.filter((course) => !course.isActive).length,
    [courseState.teacherCourses],
  );

  const learningItems: LearningCourseItem[] = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return enrollmentState.myEnrollments
      .filter((enrollment) => enrollmentController.isCourseActive(enrollment.courseId) !== false)
      .map((enrollment) => {
        const courseTitle = enrollmentController.getCourseTitle(enrollment.courseId);
        const teacherName = enrollmentController.getCourseTeacherName(enrollment.courseId);

        let formattedDate = "";
        try {
          const parsedDate = new Date(enrollment.enrolledAt);
          if (!Number.isNaN(parsedDate.getTime())) {
            formattedDate = formatter.format(parsedDate);
          }
        } catch {
          formattedDate = "";
        }

        const subtitleParts = [] as string[];
        if (teacherName.trim().length > 0) {
          subtitleParts.push(teacherName);
        }
        if (formattedDate.length > 0) {
          subtitleParts.push(`Inscrito el ${formattedDate}`);
        }

        return {
          id: enrollment.id,
          courseId: enrollment.courseId,
          title: courseTitle,
          teacherName,
          subtitle: subtitleParts.join(" • "),
        } satisfies LearningCourseItem;
      });
  }, [enrollmentState.myEnrollments, enrollmentController]);

  const backgroundColor = theme.colors.background;
  const cardColor = theme.colors.surface;
  const outlineColor = theme.colors.outline;
  const onSurface = theme.colors.onSurface;
  const shadowColor = theme.colors.shadow ?? "#000000";

  const userFirstName = user?.firstName?.trim() ?? "";
  const userLastName = user?.lastName?.trim() ?? "";
  const fullName = [userFirstName, userLastName].filter((part) => part.length > 0).join(" ");
  const displayName = userFirstName.length > 0 ? userFirstName : fullName;

  const handleCreatePress = useCallback(() => {
    navigation.navigate("CreateOptions");
  }, [navigation]);

  const handleCoursePress = useCallback(
    (courseId: string) => {
      navigation.navigate("CourseDetail", { courseId });
    },
    [navigation],
  );

  const handleSeeAllTeaching = useCallback(() => {
    navigation.navigate("AllCourses", { mode: "teaching" });
  }, [navigation]);

  const handleJoinCourse = useCallback(() => {
    navigation.navigate("JoinCourse");
  }, [navigation]);

  const handleSeeAllLearning = useCallback(() => {
    navigation.navigate("AllCourses", { mode: "learning" });
  }, [navigation]);

  const handleActivitiesPress = useCallback(() => {
    // TODO: Navigate to activities screen when implemented
  }, []);

  const handleAnnouncementsPress = useCallback(() => {
    // TODO: Navigate to announcements screen when implemented
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}> 
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GOLD}
              colors={[GOLD]}
              progressBackgroundColor={cardColor}
            />
          }
        >
          <WelcomeCard
            cardColor={cardColor}
            outlineColor={`${outlineColor}33`}
            shadowColor={shadowColor}
            onSurfaceColor={onSurface}
            userDisplayName={displayName}
            fullName={fullName}
            email={user?.email ?? ""}
          />

          <View style={{ height: SECTION_SPACING }} />

          <TeachingSection
            isLoading={courseState.isLoading}
            activeCourses={teachingCourses}
            totalCourses={courseState.teacherCourses.length}
            inactiveCount={inactiveTeachingCount}
            cardColor={cardColor}
            outlineColor={`${outlineColor}1A`}
            onSurfaceColor={onSurface}
            shadowColor={shadowColor}
            onCoursePress={handleCoursePress}
            onSeeAll={handleSeeAllTeaching}
            maxCourses={CreateCourseUseCase.maxCoursesPerTeacher}
          />

          <View style={{ height: SECTION_SPACING }} />

          <LearningSection
            isLoading={enrollmentState.isLoading}
            items={learningItems}
            cardColor={cardColor}
            outlineColor={`${outlineColor}1A`}
            onSurfaceColor={onSurface}
            shadowColor={shadowColor}
            onCoursePress={handleCoursePress}
            onJoinCourse={handleJoinCourse}
            onSeeAll={handleSeeAllLearning}
          />

          <View style={{ height: SECTION_SPACING }} />

          <InformationSection
            cardColor={cardColor}
            outlineColor={`${outlineColor}1A`}
            onSurfaceColor={onSurface}
            shadowColor={shadowColor}
            onActivitiesPress={handleActivitiesPress}
            onAnnouncementsPress={handleAnnouncementsPress}
          />
        </ScrollView>

        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: GOLD }]}
          color={PREMIUM_BLACK}
          onPress={handleCreatePress}
        />
      </View>
      <BottomNavigationDock currentIndex={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 36,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 88,
  },
});
