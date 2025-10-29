import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

const GOLD = "#FFD700";
const BLUE = "#2196F3";
const SUCCESS_GREEN = "#2E7D32";

export type TeachingCourseItem = {
  id: string;
  name: string;
  joinCode: string;
};

type TeachingSectionProps = {
  isLoading: boolean;
  activeCourses: TeachingCourseItem[];
  totalCourses: number;
  inactiveCount: number;
  cardColor: string;
  outlineColor: string;
  onSurfaceColor: string;
  shadowColor: string;
  onCoursePress: (courseId: string) => void;
  onSeeAll: () => void;
  maxCourses: number;
};

export function TeachingSection({
  isLoading,
  activeCourses,
  totalCourses,
  inactiveCount,
  cardColor,
  outlineColor,
  onSurfaceColor,
  shadowColor,
  onCoursePress,
  onSeeAll,
  maxCourses,
}: TeachingSectionProps) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: onSurfaceColor }]}>Mi enseñanza</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {activeCourses.length}/{maxCourses} activos
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : activeCourses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor: outlineColor, shadowColor }]}>
          <Text style={[styles.emptyEmoji, { color: onSurfaceColor }]}>🕸️</Text>
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyTitle, { color: onSurfaceColor }]}>Aún no estás enseñando</Text>
            <Text style={[styles.emptySubtitle, { color: onSurfaceColor }]}>Crea tu primer curso con el botón +</Text>
          </View>
        </View>
      ) : (
        activeCourses.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={{ marginBottom: 12 }}
            activeOpacity={0.8}
            onPress={() => onCoursePress(course.id)}
          >
            <View
              style={[
                styles.courseCard,
                {
                  backgroundColor: cardColor,
                  borderColor: outlineColor,
                  shadowColor,
                },
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: "rgba(33,150,243,0.12)" }]}> 
                <MaterialIcons name="class" size={24} color={BLUE} />
              </View>
              <View style={styles.courseContent}>
                <Text
                  style={[styles.courseTitle, { color: onSurfaceColor }]}
                  numberOfLines={1}
                >
                  {course.name}
                </Text>
                <Text style={[styles.courseSubtitle, { color: onSurfaceColor }]}>Código: {course.joinCode}</Text>
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
            styles.allCoursesCard,
            {
              backgroundColor: cardColor,
              borderColor: outlineColor,
              shadowColor,
            },
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(46,125,50,0.12)" }]}> 
            <MaterialIcons name="library-books" size={24} color={SUCCESS_GREEN} />
          </View>
          <View style={styles.courseContent}>
            <Text style={[styles.allCoursesTitle, { color: onSurfaceColor }]}>Ver todos</Text>
            <Text style={[styles.courseSubtitle, { color: onSurfaceColor }]}> {totalCourses} en total • {inactiveCount} inactivos</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={onSurfaceColor}
            style={{ opacity: 0.3 }}
          />
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
  badge: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: GOLD,
    fontWeight: "600",
  },
  loader: {
    paddingVertical: 18,
  },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
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
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  courseContent: {
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
  allCoursesCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  allCoursesTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});
