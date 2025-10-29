import React, { useEffect } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, List, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

export const StudentDashboardScreen: React.FC = () => {
    const theme = useTheme();
    const [enrollmentState, enrollmentController] = useEnrollmentController();

    const [refreshing, setRefreshing] = React.useState(false);

    const myEnrollments = enrollmentState.myEnrollments || [];
    const isLoading = enrollmentState.isLoading || false;

    useEffect(() => {
        enrollmentController.loadMyEnrollments();
    }, [enrollmentController]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await enrollmentController.loadMyEnrollments();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[GOLD]}
                        tintColor={GOLD}
                    />
                }
            >
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        Tablero estudiante
                    </Text>
                    <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Tus inscripciones y actividades
                    </Text>
                </View>

                <View style={styles.card}>
                    {isLoading && myEnrollments.length === 0 ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={GOLD} />
                        </View>
                    ) : myEnrollments.length === 0 ? (
                        <View style={styles.centered}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                Aún no hay cursos
                            </Text>
                        </View>
                    ) : (
                        myEnrollments.map((enrollment: { id: string; courseId: string; enrolledAt: string }) => (
                            <EnrollmentListItem key={enrollment.id} enrollment={enrollment} />
                        ))
                    )}
                </View>
            </ScrollView>
            <BottomNavigationDock currentIndex={-1} />
        </SafeAreaView>
    );
};

type EnrollmentListItemProps = {
    enrollment: { id: string; courseId: string; enrolledAt: string };
};

const EnrollmentListItem: React.FC<EnrollmentListItemProps> = ({ enrollment }) => {
    const [, courseController] = useCourseController();
    const [courseTitle, setCourseTitle] = React.useState("Cargando...");

    React.useEffect(() => {
        courseController.getCourseById(enrollment.courseId).then((course) => {
            setCourseTitle(course?.name || "Curso sin nombre");
        });
    }, [enrollment.courseId, courseController]);

    return (
        <List.Item
            title={courseTitle}
            description={`Inscrito: ${new Date(enrollment.enrolledAt).toLocaleString("es-ES", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })}`}
            left={(props) => <List.Icon {...props} icon="school" color={GOLD} />}
            style={styles.listItem}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM_BLACK,
    },
    scrollView: {
        flex: 1,
        marginBottom: 80,
    },
    header: {
        padding: 16,
        marginBottom: 8,
    },
    headerTitle: {
        fontWeight: "700",
        color: GOLD,
    },
    headerSubtitle: {
        marginTop: 4,
    },
    card: {
        backgroundColor: "#2A2A2A",
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: `${GOLD}33`,
    },
    centered: {
        padding: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    listItem: {
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
    },
});
