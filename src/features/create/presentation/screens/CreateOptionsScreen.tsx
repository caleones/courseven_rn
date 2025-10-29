import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

export default function CreateOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useTheme();

  const { courseId } = (route.params ?? {}) as { courseId?: string };

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const options = useMemo(
    () => [
      {
        label: "Crear curso",
        icon: "school" as const,
        tint: "#2196F3",
        action: () => navigation.navigate("CreateCourse"),
      },
      {
        label: "Crear actividad",
        icon: "task-alt" as const,
        tint: "#9C27B0",
        action: () => Alert.alert("Crear actividad", "Pantalla en desarrollo."),
      },
      {
        label: "Crear categoría",
        icon: "category" as const,
        tint: "#FB8C00",
        action: () =>
          courseId
            ? navigation.navigate("CreateCategory", { courseId })
            : navigation.navigate("CreateCategory"),
      },
      {
        label: "Crear grupo",
        icon: "groups" as const,
        tint: "#2E7D32",
        action: () =>
          courseId
            ? navigation.navigate("CreateGroup", { courseId })
            : navigation.navigate("CreateGroup"),
      },
    ],
    [courseId, navigation],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <IconButton
            icon={() => <MaterialIcons name="arrow-back-ios" size={20} color="#FFD700" />}
            onPress={handleGoBack}
            style={styles.backButton}
          />
          <View style={styles.headerText}>
            <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>¿Qué deseas crear?</Text>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Crear</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />

        {options.map((option, index) => (
          <CreateOptionTile
            key={option.label}
            label={option.label}
            icon={option.icon}
            tint={option.tint}
            onPress={option.action}
            cardColor={theme.colors.surface}
            outlineColor={`${theme.colors.outline}1A`}
            onSurface={theme.colors.onSurface}
            shadowColor={theme.colors.shadow ?? "#000000"}
            style={{ marginBottom: index === options.length - 1 ? 40 : 12 }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

type CreateOptionTileProps = {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  onPress: () => void;
  cardColor: string;
  outlineColor: string;
  onSurface: string;
  shadowColor: string;
  style?: object;
};

function CreateOptionTile({
  label,
  icon,
  tint,
  onPress,
  cardColor,
  outlineColor,
  onSurface,
  shadowColor,
  style,
}: CreateOptionTileProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={style}>
      <View
        style={[
          styles.tile,
          {
            backgroundColor: cardColor,
            borderColor: outlineColor,
            shadowColor,
          },
        ]}
      >
        <View style={[styles.tileIconWrapper, { backgroundColor: `${tint}1A` }]}> 
          <MaterialIcons name={icon} size={24} color={tint} />
        </View>
        <Text style={[styles.tileLabel, { color: onSurface }]}>{label}</Text>
        <MaterialIcons name="chevron-right" size={20} color={onSurface} style={{ opacity: 0.3 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    margin: 0,
  },
  headerText: {
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
  tile: {
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
  tileIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  tileLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 16,
  },
});
