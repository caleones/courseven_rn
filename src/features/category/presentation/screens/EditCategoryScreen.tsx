import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, Text, TextInput, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

type EditCategoryRouteParams = {
    courseId: string;
    categoryId: string;
};

export const EditCategoryScreen: React.FC = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<{ params: EditCategoryRouteParams }, "params">>();

    const { courseId, categoryId } = route.params;
    const [categoryState, categoryController] = useCategoryController();
    const [, courseController] = useCourseController();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState("");
    const [isTeacher, setIsTeacher] = useState(false);

    useEffect(() => {
        categoryController.loadByCourse(courseId);
        courseController.getCourseById(courseId).then((course) => {
            if (course) {
                setIsTeacher(true);
            }
        });
    }, [courseId, categoryController, courseController]);

    useEffect(() => {
        const categories = categoryState.categoriesByCourse[courseId] || [];
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            setName(category.name);
            setDescription(category.description || "");
            setIsActive(category.isActive);
        }
    }, [categoryState.categoriesByCourse, courseId, categoryId]);

    const handleSubmit = async () => {
        setNameError("");

        if (!name.trim()) {
            setNameError("El nombre es requerido");
            return;
        }

        setLoading(true);
        try {
            const categories = categoryState.categoriesByCourse[courseId] || [];
            const category = categories.find((c) => c.id === categoryId);
            if (!category) {
                Alert.alert("Error", "Categoría no encontrada");
                return;
            }

            await categoryController.updateCategory({
                ...category,
                name: name.trim(),
                description: description.trim() || null,
                isActive,
            });

            Alert.alert("Guardado", "Cambios aplicados correctamente");
            navigation.goBack();
        } catch {
            Alert.alert("Error", "No se pudieron guardar los cambios");
        } finally {
            setLoading(false);
        }
    };

    if (!isTeacher) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Solo el profesor puede editar</Text>
                </View>
                <BottomNavigationDock currentIndex={-1} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text variant="headlineMedium" style={styles.headerTitle}>
                        Editar categoría
                    </Text>
                    <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Modifica los datos de la categoría
                    </Text>
                </View>

                <View style={styles.card}>
                    <TextInput
                        label="Nombre"
                        value={name}
                        onChangeText={(text) => {
                            setName(text);
                            setNameError("");
                        }}
                        mode="outlined"
                        error={!!nameError}
                        style={styles.input}
                        outlineColor={theme.colors.outlineVariant}
                        activeOutlineColor={GOLD}
                    />
                    {nameError ? <HelperText type="error">{nameError}</HelperText> : null}

                    <TextInput
                        label="Descripción (opcional)"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                        outlineColor={theme.colors.outlineVariant}
                        activeOutlineColor={GOLD}
                    />

                    <View style={styles.chipRow}>
                        <Text variant="labelLarge">Estado:</Text>
                        <View style={styles.chipGroup}>
                            <Chip
                                selected={isActive}
                                onPress={() => setIsActive(true)}
                                style={[styles.chip, isActive && { backgroundColor: GOLD }]}
                                textStyle={isActive && { color: PREMIUM_BLACK }}
                            >
                                Activo
                            </Chip>
                            <Chip
                                selected={!isActive}
                                onPress={() => setIsActive(false)}
                                style={[styles.chip, !isActive && { backgroundColor: "#999" }]}
                                textStyle={!isActive && { color: PREMIUM_BLACK }}
                            >
                                Inactivo
                            </Chip>
                        </View>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading}
                        style={[styles.submitButton, { backgroundColor: GOLD }]}
                        labelStyle={{ color: PREMIUM_BLACK, fontWeight: "600" }}
                    >
                        {loading ? "GUARDANDO..." : "GUARDAR"}
                    </Button>
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
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
    input: {
        marginBottom: 12,
    },
    chipRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 16,
        gap: 12,
    },
    chipGroup: {
        flexDirection: "row",
        gap: 8,
    },
    chip: {
        marginRight: 0,
    },
    submitButton: {
        marginTop: 24,
        paddingVertical: 6,
    },
});
