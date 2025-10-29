import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, List, Searchbar, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Course } from "@/src/domain/models/Course";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

export const AvailableCoursesScreen: React.FC = () => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [courseState, courseController] = useCourseController();

    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);

    const isLoading = courseState.isLoading;

    useEffect(() => {
        courseController.loadMyTeachingCourses();
    }, [courseController]);

    useEffect(() => {
        const allCourses = courseState.teacherCourses || [];
        if (searchQuery.trim()) {
            setFilteredCourses(
                allCourses.filter((course) =>
                    course.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredCourses(allCourses);
        }
    }, [courseState.teacherCourses, searchQuery]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await courseController.loadMyTeachingCourses();
        setRefreshing(false);
    };

    const handleJoinCourse = (courseId: string) => {
        Alert.alert("Unirse al curso", `Funcionalidad de inscripción pendiente para: ${courseId}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[GOLD]} tintColor={GOLD} />
                }
            >
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        Cursos disponibles
                    </Text>
                    <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Encuentra cursos para inscribirte
                    </Text>
                </View>

                <View style={styles.searchContainer}>
                    <Searchbar
                        placeholder="Buscar curso..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchBar}
                        iconColor={GOLD}
                    />
                </View>

                <View style={styles.card}>
                    {isLoading && filteredCourses.length === 0 ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={GOLD} />
                        </View>
                    ) : filteredCourses.length === 0 ? (
                        <View style={styles.centered}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                {searchQuery.trim() ? "No se encontraron cursos" : "No hay cursos disponibles"}
                            </Text>
                        </View>
                    ) : (
                        filteredCourses.map((course) => (
                            <View key={course.id} style={styles.courseItem}>
                                <List.Item
                                    title={course.name}
                                    description={course.description || "Sin descripción"}
                                    left={(props) => <List.Icon {...props} icon="school" color={GOLD} />}
                                    right={() => (
                                        <Chip
                                            icon="account"
                                            style={styles.teacherChip}
                                            textStyle={styles.teacherChipText}
                                        >
                                            Profesor
                                        </Chip>
                                    )}
                                    style={styles.listItem}
                                />
                                <View style={styles.buttonRow}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => navigation.navigate("CourseDetail" as never, { courseId: course.id } as never)}
                                        style={styles.detailButton}
                                        labelStyle={{ color: GOLD }}
                                    >
                                        Ver detalle
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={() => handleJoinCourse(course.id)}
                                        style={[styles.joinButton, { backgroundColor: GOLD }]}
                                        labelStyle={{ color: PREMIUM_BLACK }}
                                    >
                                        Inscribirse
                                    </Button>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
            <BottomNavigationDock currentIndex={-1} />
        </SafeAreaView>
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
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBar: {
        backgroundColor: "#2A2A2A",
    },
    card: {
        backgroundColor: "#2A2A2A",
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: `${GOLD}33`,
        padding: 8,
    },
    centered: {
        padding: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    courseItem: {
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
        paddingVertical: 8,
    },
    listItem: {
        paddingVertical: 4,
    },
    teacherChip: {
        backgroundColor: `${GOLD}22`,
        alignSelf: "center",
    },
    teacherChipText: {
        color: GOLD,
        fontSize: 11,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    detailButton: {
        flex: 1,
        borderColor: GOLD,
    },
    joinButton: {
        flex: 1,
    },
});
