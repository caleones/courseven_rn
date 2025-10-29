import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, Text, TextInput, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

type CreateActivityRouteParams = {
    courseId?: string;
    categoryId?: string;
    lockCourse?: boolean;
    lockCategory?: boolean;
};

export const CreateActivityScreen: React.FC = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<{ params: CreateActivityRouteParams }, "params">>();

    const [courseState, courseController] = useCourseController();
    const [categoryState, categoryController] = useCategoryController();
    const [, activityController] = useActivityController();

    const {
        courseId: initialCourseId,
        categoryId: initialCategoryId,
        lockCourse = false,
        lockCategory = false,
    } = route.params || {};

    const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(initialCourseId);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(initialCategoryId);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate] = useState<Date | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    const [titleError, setTitleError] = useState("");
    const [courseError, setCourseError] = useState("");
    const [categoryError, setCategoryError] = useState("");

    const teacherCourses = courseState.teacherCourses || [];
    const categoriesByCourse = categoryState.categoriesByCourse || {};

    useEffect(() => {
        courseController.loadMyTeachingCourses();
        if (selectedCourseId) {
            categoryController.loadByCourse(selectedCourseId);
        }
    }, [selectedCourseId, courseController, categoryController]);

    const handleCourseChange = (courseId: string) => {
        if (lockCourse) return;
        setSelectedCourseId(courseId);
        setSelectedCategoryId(undefined);
        setCourseError("");
        categoryController.loadByCourse(courseId);
    };

    const handleCategoryChange = (categoryId: string) => {
        if (lockCategory) return;
        setSelectedCategoryId(categoryId);
        setCategoryError("");
    };

    const handleSubmit = async () => {
        setTitleError("");
        setCourseError("");
        setCategoryError("");

        let hasError = false;
        if (!title.trim()) {
            setTitleError("Ingresa un título");
            hasError = true;
        }
        if (!selectedCourseId) {
            setCourseError("Selecciona un curso");
            hasError = true;
        }
        if (!selectedCategoryId) {
            setCategoryError("Selecciona una categoría");
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        try {
            const created = await activityController.createActivity({
                title: title.trim(),
                description: description.trim() || null,
                categoryId: selectedCategoryId!,
                courseId: selectedCourseId!,
                dueDate: dueDate ? dueDate.toISOString() : null,
                reviewing: false,
                privateReview: false,
            });

            if (created) {
                Alert.alert("Actividad creada", `"${created.title}" creada correctamente`);
                navigation.goBack();
            }
        } catch {
            Alert.alert("Error", "No se pudo crear la actividad");
        } finally {
            setLoading(false);
        }
    };

    const handleDatePick = () => {
        Alert.alert("Fecha límite", "Integración de DatePicker pendiente");
    };

    const currentCategories = selectedCourseId ? (categoriesByCourse[selectedCourseId] || []) : [];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        Crear actividad
                    </Text>
                    <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Formulario de creación
                    </Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text variant="titleLarge" style={styles.cardTitle}>
                            Información de la actividad
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Text variant="labelLarge" style={styles.label}>
                            Curso
                        </Text>
                        <View style={styles.chipContainer}>
                            {teacherCourses.map((course) => (
                                <Chip
                                    key={course.id}
                                    selected={selectedCourseId === course.id}
                                    onPress={() => handleCourseChange(course.id)}
                                    style={[
                                        styles.chip,
                                        selectedCourseId === course.id && { backgroundColor: GOLD },
                                    ]}
                                    textStyle={selectedCourseId === course.id && { color: PREMIUM_BLACK }}
                                    disabled={lockCourse}
                                >
                                    {course.name}
                                </Chip>
                            ))}
                        </View>
                        {courseError ? <HelperText type="error">{courseError}</HelperText> : null}

                        <Text variant="labelLarge" style={[styles.label, styles.marginTop]}>
                            Categoría
                        </Text>
                        <View style={styles.chipContainer}>
                            {currentCategories.map((category) => (
                                <Chip
                                    key={category.id}
                                    selected={selectedCategoryId === category.id}
                                    onPress={() => handleCategoryChange(category.id)}
                                    style={[
                                        styles.chip,
                                        selectedCategoryId === category.id && { backgroundColor: GOLD },
                                    ]}
                                    textStyle={selectedCategoryId === category.id && { color: PREMIUM_BLACK }}
                                    disabled={lockCategory}
                                >
                                    {category.name}
                                </Chip>
                            ))}
                        </View>
                        {categoryError ? <HelperText type="error">{categoryError}</HelperText> : null}

                        <TextInput
                            label="Título"
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                setTitleError("");
                            }}
                            mode="outlined"
                            error={!!titleError}
                            style={styles.marginTop}
                            outlineColor={theme.colors.outlineVariant}
                            activeOutlineColor={GOLD}
                        />
                        {titleError ? <HelperText type="error">{titleError}</HelperText> : null}

                        <TextInput
                            label="Descripción (opcional)"
                            value={description}
                            onChangeText={setDescription}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={styles.marginTop}
                            outlineColor={theme.colors.outlineVariant}
                            activeOutlineColor={GOLD}
                        />

                        <View style={styles.dateRow}>
                            <Text variant="bodyMedium" style={{ flex: 1 }}>
                                {dueDate
                                    ? `Vence: ${dueDate.toLocaleDateString("es-ES")}`
                                    : "Sin fecha límite"}
                            </Text>
                            <Button icon="calendar" mode="text" onPress={handleDatePick}>
                                Elegir fecha
                            </Button>
                        </View>

                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={loading}
                            disabled={loading}
                            style={[styles.submitButton, { backgroundColor: GOLD }]}
                            labelStyle={{ color: PREMIUM_BLACK, fontWeight: "600" }}
                        >
                            {loading ? "CREANDO..." : "CREAR"}
                        </Button>
                    </View>
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
    content: {
        padding: 16,
    },
    header: {
        marginBottom: 24,
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
        padding: 16,
        borderWidth: 1,
        borderColor: `${GOLD}33`,
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitle: {
        fontWeight: "600",
        color: "#FFFFFF",
    },
    form: {
        gap: 12,
    },
    label: {
        color: "#CCCCCC",
        marginBottom: 8,
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        marginRight: 0,
    },
    marginTop: {
        marginTop: 12,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
    },
    submitButton: {
        marginTop: 24,
        paddingVertical: 6,
    },
});
