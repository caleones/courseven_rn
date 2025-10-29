import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

const ORANGE = "#FF9800";
const GOLD = "#FFD700";

export type LearningCourseItem = {
  id: string;
  courseId: string;
  title: string;
  teacherName: string;
  subtitle: string;
};

type LearningSectionProps = {
  isLoading: boolean;
  items: LearningCourseItem[];
  cardColor: string;
  outlineColor: string;
  onSurfaceColor: string;
  shadowColor: string;
  onCoursePress: (courseId: string) => void;
  onJoinCourse: () => void;
  onSeeAll: () => void;
};

export function LearningSection({
  isLoading,
  items,
  cardColor,
  outlineColor,
  onSurfaceColor,
  shadowColor,
  onCoursePress,
  onJoinCourse,
  onSeeAll,
}: LearningSectionProps) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: onSurfaceColor }]}>Mi aprendizaje</Text>
        <Button mode="outlined" icon="login" onPress={onJoinCourse}>
          Unirme a un curso
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor: outlineColor, shadowColor }]}>
          <Text style={[styles.emptyEmoji, { color: onSurfaceColor }]}>🧭</Text>
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyTitle, { color: onSurfaceColor }]}>Aún no te has unido a cursos</Text>
            <Text style={[styles.emptySubtitle, { color: onSurfaceColor }]}>
              {"Usa \"Unirme a un curso\" para ingresar un código de ingreso"}
            </Text>
          </View>
        </View>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => onCoursePress(item.courseId)}
            style={{ marginBottom: 12 }}
          >
            <View
              style={[
                styles.courseTile,
                {
                  backgroundColor: cardColor,
                  borderColor: outlineColor,
                  shadowColor,
                },
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "rgba(255,152,0,0.12)" }]}> 
                <MaterialIcons name="menu-book" size={24} color={ORANGE} />
              </View>
              <View style={styles.textContent}>
                <Text
                  style={[styles.courseTitle, { color: onSurfaceColor }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.courseSubtitle, { color: onSurfaceColor }]}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={onSurfaceColor}
                style={{ opacity: 0.3 }}
              />
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity activeOpacity={0.8} onPress={onSeeAll}>
        <View
          style={[
            styles.viewAllCard,
            {
              backgroundColor: cardColor,
              borderColor: outlineColor,
              shadowColor,
            },
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(255,215,0,0.12)" }]}> 
            <MaterialIcons name="layers" size={24} color={GOLD} />
          </View>
          <Text style={styles.viewAllText}>Ver todos</Text>
          <MaterialIcons name="chevron-right" size={20} color={GOLD} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  loader: {
    paddingVertical: 18,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  emptyContent: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  courseTile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  courseSubtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.6,
  },
  viewAllCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  viewAllText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "600",
    color: GOLD,
  },
});
