import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, RefreshControl, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, IconButton, ProgressBar, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Assessment } from "@/src/domain/models/Assessment";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useAssessmentRepository } from "@/src/data/repositories/hooks/useAssessmentRepository";

const GOLD = "#FFD700";

type RouteParams = {
  courseId: string;
  activityId: string;
  userId: string;
  groupId?: string;
};

const CRITERION_TITLES: Record<string, string> = {
  punctuality: "Puntualidad",
  contributions: "Contribuciones al equipo",
  commitment: "Compromiso",
  attitude: "Actitud y colaboración",
};

const CRITERION_DESCRIPTIONS: Record<string, string> = {
  punctuality: "Evalúa si la persona entrega sus trabajos y cumple acuerdos en los tiempos establecidos por el equipo.",
  contributions: "Observa qué tanto aporta en entregables, ideas y trabajo efectivo para que el equipo avance.",
  commitment: "Refleja cuánto se involucra con los objetivos del proyecto, asume tareas y las saca adelante.",
  attitude: "Considera su disposición para escuchar, apoyar y mantener un ambiente saludable de trabajo.",
};

const CRITERION_ICONS: Record<string, string> = {
  punctuality: "clock-outline",
  contributions: "handshake-outline",
  commitment: "check-circle-outline",
  attitude: "emoticon-happy-outline",
};

const SCORE_SCALE = [2, 3, 4, 5];

const SCORE_GUIDELINES: Record<string, Record<number, string>> = {
  punctuality: {
    2: "Frecuentemente entrega tarde o no cumple con los tiempos acordados",
    3: "A veces entrega a tiempo, pero ocasionalmente se retrasa",
    4: "Generalmente cumple con los tiempos establecidos",
    5: "Siempre entrega a tiempo y cumple con todos los acuerdos",
  },
  contributions: {
    2: "Aporta muy poco o nada al trabajo del equipo",
    3: "Aporta ocasionalmente, pero de manera limitada",
    4: "Contribuye regularmente con ideas y trabajo efectivo",
    5: "Aporta significativamente y de manera constante al avance del equipo",
  },
  commitment: {
    2: "Muestra poco interés y no asume responsabilidades",
    3: "Se involucra parcialmente, pero no siempre completa las tareas",
    4: "Se involucra activamente y cumple con sus responsabilidades",
    5: "Muestra alto compromiso y siempre completa sus tareas de manera excelente",
  },
  attitude: {
    2: "Muestra poca disposición para colaborar y escuchar",
    3: "A veces colabora, pero puede ser difícil trabajar con esta persona",
    4: "Mantiene una actitud positiva y colaborativa",
    5: "Excelente actitud, siempre dispuesto a ayudar y mantener un ambiente saludable",
  },
};

export const PeerReviewEvaluateScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { courseId, activityId, userId, groupId } = (route.params ?? {}) as RouteParams;
  const { user } = useAuth();

  const [activityState, activityController] = useActivityController();
  const [enrollmentState, enrollmentController] = useEnrollmentController();
  const assessmentRepository = useAssessmentRepository();

  const [activity, setActivity] = useState<CourseActivity | null>(null);
  const [existingAssessment, setExistingAssessment] = useState<Assessment | null>(null);
  const [peerName, setPeerName] = useState("");
  const [peerEmail, setPeerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [punctuality, setPunctuality] = useState<number | null>(null);
  const [contributions, setContributions] = useState<number | null>(null);
  const [commitment, setCommitment] = useState<number | null>(null);
  const [attitude, setAttitude] = useState<number | null>(null);

  const isReadOnly = existingAssessment !== null;

  const loadData = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!courseId || !activityId || !userId || !user?.id) return;

      setLoading(true);
      setError(null);
      try {
        // Cargar actividad
        await activityController.loadForStudent(courseId, { force });
        const loadedActivity = await activityController.getActivityById(activityId);
        if (!loadedActivity) {
          setError("Actividad no encontrada.");
          setLoading(false);
          return;
        }
        setActivity(loadedActivity);

        // Cargar información del usuario a evaluar
        await enrollmentController.ensureUserLoaded(userId);
        const userName = enrollmentController.userName(userId);
        const userEmail = enrollmentController.userEmail(userId);
        setPeerName(userName || userId);
        setPeerEmail(userEmail || "");

        // Cargar evaluación existente si existe
        const assessments = await assessmentRepository.getAssessmentsByReviewer(activityId, user.id);
        const existing = assessments.find((a) => a.studentId === userId);
        if (existing) {
          setExistingAssessment(existing);
          setPunctuality(existing.punctualityScore);
          setContributions(existing.contributionsScore);
          setCommitment(existing.commitmentScore);
          setAttitude(existing.attitudeScore);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    },
    [activityController, assessmentRepository, courseId, enrollmentController, activityId, userId, user?.id],
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

  const getValueForKey = (key: string): number | null => {
    switch (key) {
      case "punctuality":
        return punctuality;
      case "contributions":
        return contributions;
      case "commitment":
        return commitment;
      case "attitude":
        return attitude;
      default:
        return null;
    }
  };

  const setValueForKey = (key: string, value: number) => {
    switch (key) {
      case "punctuality":
        setPunctuality(value);
        break;
      case "contributions":
        setContributions(value);
        break;
      case "commitment":
        setCommitment(value);
        break;
      case "attitude":
        setAttitude(value);
        break;
    }
  };

  const calculatedAverage = (): number | null => {
    if (punctuality === null || contributions === null || commitment === null || attitude === null) {
      return null;
    }
    return parseFloat(((punctuality + contributions + commitment + attitude) / 4.0).toFixed(2));
  };

  const canSubmit = (): boolean => {
    if (isReadOnly) return false;
    return punctuality !== null && contributions !== null && commitment !== null && attitude !== null;
  };

  const handleSubmit = useCallback(async () => {
    if (!activity || !user?.id || !groupId) {
      Alert.alert("Error", "Faltan datos necesarios para enviar la evaluación.");
      return;
    }

    if (isReadOnly) {
      Alert.alert("Error", "Esta evaluación ya fue enviada.");
      return;
    }

    if (!canSubmit()) {
      Alert.alert("Error", "Por favor completa todos los criterios antes de enviar.");
      return;
    }

    if (userId === user.id) {
      Alert.alert("Error", "No puedes auto-evaluarte.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Verificar si ya existe una evaluación
      const exists = await assessmentRepository.existsAssessment({
        activityId,
        reviewerId: user.id,
        studentId: userId,
      });

      if (exists) {
        Alert.alert("Error", "Ya evaluaste a este compañero.");
        setSubmitting(false);
        return;
      }

      // Crear la evaluación
      const assessment: Assessment = {
        id: "",
        activityId,
        groupId,
        reviewerId: user.id,
        studentId: userId,
        punctualityScore: punctuality!,
        contributionsScore: contributions!,
        commitmentScore: commitment!,
        attitudeScore: attitude!,
        overallScorePersisted: calculatedAverage()!,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      await assessmentRepository.createAssessment(assessment);

      Alert.alert("¡Éxito!", "Tu evaluación ha sido enviada correctamente.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error("Error submitting assessment:", err);
      setError(err instanceof Error ? err.message : "Error al enviar la evaluación");
      Alert.alert("Error", err instanceof Error ? err.message : "Error al enviar la evaluación");
    } finally {
      setSubmitting(false);
    }
  }, [
    activity,
    user?.id,
    groupId,
    isReadOnly,
    canSubmit,
    userId,
    activityId,
    assessmentRepository,
    punctuality,
    contributions,
    commitment,
    attitude,
    calculatedAverage,
    navigation,
  ]);

  const renderScoreOption = (key: string, score: number) => {
    const selectedValue = getValueForKey(key);
    const isSelected = selectedValue === score;
    const enabled = !isReadOnly;

    return (
      <TouchableOpacity
        key={score}
        disabled={!enabled}
        onPress={() => setValueForKey(key, score)}
        style={[
          styles.scoreOption,
          {
            backgroundColor: isSelected ? GOLD : theme.colors.surfaceContainerHighest,
            borderColor: isSelected ? GOLD : theme.colors.outline + "66",
            borderWidth: isSelected ? 1.4 : 1.1,
            opacity: enabled ? 1 : 0.6,
          },
        ]}
      >
        <Text
          style={[
            styles.scoreOptionText,
            {
              color: isSelected ? theme.colors.onSurface : theme.colors.onSurface + "E6",
              fontWeight: isSelected ? "700" : "400",
            },
          ]}
        >
          {score}
        </Text>
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: GOLD }]}>
            <Text style={[styles.checkIcon, { color: theme.colors.onSurface }]}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCriterionSection = (key: string) => {
    const title = CRITERION_TITLES[key] || key;
    const description = CRITERION_DESCRIPTIONS[key] || "";
    const icon = CRITERION_ICONS[key] || "star-outline";
    const guidelines = SCORE_GUIDELINES[key] || {};

    return (
      <Card key={key} style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <IconButton icon={icon} size={24} iconColor={GOLD} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{title}</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
          <View style={styles.scoreOptionsContainer}>
            {SCORE_SCALE.map((score) => renderScoreOption(key, score))}
          </View>
          <View style={styles.guidelinesContainer}>
            {Object.entries(guidelines)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([score, text]) => (
                <View key={score} style={styles.guidelineRow}>
                  <Text style={[styles.guidelineIcon, { color: GOLD }]}>★</Text>
                  <Text style={[styles.guidelineText, { color: theme.colors.onSurfaceVariant }]}>
                    {score}: {text}
                  </Text>
                </View>
              ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Cargando...</Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Evaluar</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            No se pudo cargar esta actividad para evaluar.
          </Text>
        </View>
        <BottomNavigationDock currentIndex={-1} />
      </SafeAreaView>
    );
  }

  const average = calculatedAverage();
  const progressValue = average !== null ? Math.max(0, Math.min(1, average / 5)) : 0;
  const peerDisplay = peerName || userId;

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
              <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Evaluar a {peerDisplay}
              </Text>
            </View>
            <Chip
              icon={isReadOnly ? "check-circle" : "pending"}
              style={[
                styles.statusChip,
                {
                  backgroundColor: isReadOnly ? theme.colors.primaryContainer : GOLD,
                },
              ]}
              textStyle={{
                color: isReadOnly ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                fontWeight: "600",
              }}
            >
              {isReadOnly ? "Enviada" : "Pendiente"}
            </Chip>
          </View>

          {error ? (
            <Card style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content>
                <Text style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
              </Card.Content>
            </Card>
          ) : null}

          {/* Instrucciones */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <IconButton icon="book-open-outline" size={24} iconColor={GOLD} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Antes de enviar</Text>
              </View>
              <Text style={[styles.instructionsText, { color: theme.colors.onSurface }]}>
                Selecciona la opción que mejor describa la participación de {peerDisplay} en tu equipo. Usa la escala
                de 2 (mínimo) a 5 (excelente).
              </Text>
              <View style={styles.bulletList}>
                <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant }]}>
                  • Lee las descripciones detalladas de cada nivel y criterio.
                </Text>
                <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant }]}>
                  • Compara con el desempeño real del compañero, no con expectativas ideales.
                </Text>
                <Text style={[styles.bullet, { color: theme.colors.onSurfaceVariant }]}>
                  • Envía la evaluación solo cuando estés seguro; no se puede editar luego.
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Resumen del compañero */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <IconButton icon="account-circle" size={24} iconColor={GOLD} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Persona a evaluar</Text>
              </View>
              <View style={styles.peerInfo}>
                <Text style={[styles.peerName, { color: theme.colors.onSurface }]}>{peerDisplay}</Text>
                {peerEmail ? (
                  <Text style={[styles.peerEmail, { color: theme.colors.onSurfaceVariant }]}>{peerEmail}</Text>
                ) : null}
                {isReadOnly ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={[styles.verifiedText, { color: theme.colors.primary }]}>✓ Evaluado</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={[styles.pendingText, { color: GOLD }]}>⏳ Pendiente</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Resumen de evaluación enviada */}
          {existingAssessment && (
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <IconButton icon="history" size={24} iconColor={theme.colors.onPrimaryContainer} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.onPrimaryContainer }]}>
                    Evaluación enviada
                  </Text>
                </View>
                <Text style={[styles.submissionText, { color: theme.colors.onPrimaryContainer }]}>
                  Promedio registrado: {existingAssessment.overallScorePersisted?.toFixed(1) ?? "N/A"} / 5
                </Text>
                <Text style={[styles.submissionDate, { color: theme.colors.onPrimaryContainer }]}>
                  Fecha de envío: {new Date(existingAssessment.createdAt).toLocaleString("es-ES")}
                </Text>
                <Text style={[styles.submissionNote, { color: theme.colors.onPrimaryContainer }]}>
                  Los valores seleccionados se muestran abajo. Esta evaluación ya no se puede modificar.
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Criterios */}
          {renderCriterionSection("punctuality")}
          {renderCriterionSection("contributions")}
          {renderCriterionSection("commitment")}
          {renderCriterionSection("attitude")}

          {/* Promedio general */}
          <Card style={[styles.sectionCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <IconButton icon="insights" size={24} iconColor={theme.colors.onPrimaryContainer} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onPrimaryContainer }]}>Promedio general</Text>
              </View>
              {average !== null ? (
                <>
                  <Text style={[styles.averageText, { color: theme.colors.onPrimaryContainer }]}>
                    Tu evaluación suma {average.toFixed(1)} puntos sobre 5.
                  </Text>
                  <ProgressBar
                    progress={progressValue}
                    color={GOLD}
                    style={styles.progressBar}
                  />
                </>
              ) : (
                <Text style={[styles.averagePlaceholder, { color: theme.colors.onPrimaryContainer }]}>
                  Selecciona todas las opciones para calcular el promedio.
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Botón de enviar */}
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={!canSubmit() || submitting || isReadOnly}
              loading={submitting}
              style={[
                styles.submitButton,
                {
                  backgroundColor: canSubmit() && !isReadOnly ? GOLD : theme.colors.surfaceContainerHighest,
                },
              ]}
              labelStyle={[
                styles.submitButtonLabel,
                {
                  color: canSubmit() && !isReadOnly ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {isReadOnly ? "EVALUACIÓN ENVIADA" : "ENVIAR EVALUACIÓN"}
            </Button>
          </View>
        </ScrollView>
        <BottomNavigationDock currentIndex={-1} />
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");
const isSmallScreen = width < 360;

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
    marginBottom: 20,
  },
  headerDetails: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.75,
  },
  statusChip: {
    marginLeft: 8,
  },
  errorCard: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  instructionsText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 8,
  },
  bullet: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  peerInfo: {
    marginTop: 8,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  peerEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  verifiedBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pendingBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submissionText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  submissionDate: {
    fontSize: 14,
    marginBottom: 12,
  },
  submissionNote: {
    fontSize: 12,
    fontStyle: "italic",
  },
  scoreOptionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  scoreOption: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  scoreOptionText: {
    fontSize: 22,
  },
  checkBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: "700",
  },
  guidelinesContainer: {
    marginTop: 8,
  },
  guidelineRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  guidelineIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  guidelineText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  averageText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  averagePlaceholder: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  actionsContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  submitButton: {
    paddingVertical: 8,
    borderRadius: 18,
  },
  submitButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});

