import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker, {
    DateTimePickerAndroid,
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Switch, Text, TextInput, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

type EditActivityRouteParams = {
    courseId: string;
    activityId: string;
};

export const EditActivityScreen: React.FC = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<{ params: EditActivityRouteParams }, "params">>();

    const { courseId, activityId } = route.params;
    const [activityState, activityController] = useActivityController();
    const [, courseController] = useCourseController();

    const [activity, setActivity] = useState<CourseActivity | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showIOSPicker, setShowIOSPicker] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [reviewing, setReviewing] = useState(false);
    const [privateReview, setPrivateReview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);

    const formattedDueDate = useMemo(() => {
        if (!dueDate) {
            return "Sin fecha límite";
        }
        return dueDate.toLocaleDateString("es-ES", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }, [dueDate]);

    useEffect(() => {
        activityController.loadByCourse(courseId);
        
        courseController.getCourseById(courseId).then((course) => {
            if (course) {
                setIsTeacher(true); 
            }
        });
    }, [courseId, activityController, courseController]);

    useEffect(() => {
        const activities = activityState.activitiesByCourse[courseId] || [];
        const foundActivity = activities.find((a: CourseActivity) => a.id === activityId);
        if (foundActivity) {
            setActivity(foundActivity);
            setTitle(foundActivity.title);
            setDescription(foundActivity.description || "");
            setDueDate(foundActivity.dueDate ? new Date(foundActivity.dueDate) : null);
            setIsActive(foundActivity.isActive);
            setReviewing(foundActivity.reviewing || false);
            setPrivateReview(foundActivity.privateReview || false);
        }
    }, [activityState.activitiesByCourse, courseId, activityId]);

    const handleDatePick = () => {
        const baseDate = dueDate ?? new Date();
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                mode: "date",
                value: baseDate,
                minimumDate: new Date(),
                onChange: (_event, selectedDate) => {
                    if (selectedDate) {
                        setDueDate(selectedDate);
                    }
                },
            });
            return;
        }
        setShowIOSPicker(true);
    };

    const handleIOSDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "dismissed") {
            setShowIOSPicker(false);
            return;
        }
        if (selectedDate) {
            setDueDate(selectedDate);
        }
        setShowIOSPicker(false);
    };

    const handleSubmit = async () => {
        if (!activity) return;
        if (!title.trim()) {
            Alert.alert("Error", "El título es requerido");
            return;
        }

        setLoading(true);
        try {
            const updated: CourseActivity = {
                ...activity,
                title: title.trim(),
                description: description.trim() || null,
                dueDate: dueDate ? dueDate.toISOString() : null,
                isActive,
                reviewing,
                privateReview: reviewing ? privateReview : false,
            };

            const result = await activityController.updateActivity(updated);
            if (result) {
                Alert.alert("Guardado", "Cambios aplicados correctamente");
                navigation.goBack();
            }
        } catch {
            Alert.alert("Error", "No se pudieron guardar los cambios");
        } finally {
            setLoading(false);
        }
    };

    if (!activity) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Cargando actividad...</Text>
                </View>
                <BottomNavigationDock currentIndex={-1} />
            </SafeAreaView>
        );
    }

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
                        Editar actividad
                    </Text>
                    <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        {activity.title}
                    </Text>
                </View>

                <View style={styles.card}>
                    <TextInput
                        label="Título"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={theme.colors.outlineVariant}
                        activeOutlineColor={GOLD}
                    />

                    <TextInput
                        label="Descripción"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        style={styles.input}
                        outlineColor={theme.colors.outlineVariant}
                        activeOutlineColor={GOLD}
                    />

                    <View style={styles.dateRow}>
                        <Text variant="bodyMedium" style={{ flex: 1 }}>
                            {formattedDueDate}
                        </Text>
                        <View style={styles.dateButtons}>
                            {dueDate ? (
                                <Button mode="text" onPress={() => setDueDate(null)}>
                                    Quitar
                                </Button>
                            ) : null}
                            <Button icon="calendar" mode="text" onPress={handleDatePick}>
                                Elegir fecha
                            </Button>
                        </View>
                    </View>
                    {Platform.OS === "ios" && showIOSPicker ? (
                        <DateTimePicker
                            mode="date"
                            display="spinner"
                            value={dueDate ?? new Date()}
                            minimumDate={new Date()}
                            onChange={(event, selectedDate) => {
                                handleIOSDateChange(event, selectedDate ?? undefined);
                            }}
                            style={styles.iosPicker}
                        />
                    ) : null}

                    <View style={styles.switchRow}>
                        <Text variant="bodyLarge">Actividad activa</Text>
                        <Switch value={isActive} onValueChange={setIsActive} color={GOLD} />
                    </View>

                    <View style={styles.peerReviewBox}>
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text variant="bodyLarge">Peer Review</Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Controla si los estudiantes pueden evaluarse entre sí.
                                </Text>
                            </View>
                            <Switch value={reviewing} onValueChange={setReviewing} color={GOLD} />
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text variant="bodyLarge">Resultados privados (solo profesor)</Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Si está desactivado, los estudiantes verán sus resultados al finalizar.
                                </Text>
                            </View>
                            <Switch
                                value={privateReview}
                                onValueChange={setPrivateReview}
                                disabled={!reviewing}
                                color={GOLD}
                            />
                        </View>

                        {!reviewing ? (
                            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                Activa peer review para habilitar las evaluaciones de los estudiantes.
                            </Text>
                        ) : null}
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
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12,
    },
    dateButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    iosPicker: {
        marginTop: 8,
        backgroundColor: "#1F1F1F",
        borderRadius: 12,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12,
    },
    peerReviewBox: {
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${GOLD}55`,
        backgroundColor: "#1F1F1F",
        gap: 12,
    },
    infoBox: {
        backgroundColor: "#333333",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${GOLD}55`,
        padding: 14,
        marginTop: 12,
    },
    infoHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    infoTitle: {
        fontWeight: "600",
        color: GOLD,
    },
    submitButton: {
        marginTop: 24,
        paddingVertical: 6,
    },
});
