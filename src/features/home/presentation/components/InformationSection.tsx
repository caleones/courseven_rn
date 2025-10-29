import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

const INDIGO = "#3F51B5";
const CYAN = "#00BCD4";

type InformationSectionProps = {
  cardColor: string;
  outlineColor: string;
  onSurfaceColor: string;
  shadowColor: string;
  onActivitiesPress: () => void;
  onAnnouncementsPress: () => void;
};

export function InformationSection({
  cardColor,
  outlineColor,
  onSurfaceColor,
  shadowColor,
  onActivitiesPress,
  onAnnouncementsPress,
}: InformationSectionProps) {
  return (
    <View>
      <Text style={[styles.sectionTitle, { color: onSurfaceColor }]}>Información</Text>
      <View style={{ height: 16 }} />
      <InfoTile
        title="Actividades"
        subtitle="Ver todas las actividades"
        icon="assignment"
        tint={INDIGO}
        cardColor={cardColor}
        outlineColor={outlineColor}
        onSurfaceColor={onSurfaceColor}
        shadowColor={shadowColor}
        onPress={onActivitiesPress}
      />
      <View style={{ height: 12 }} />
      <InfoTile
        title="Anuncios"
        subtitle="Últimas noticias y actualizaciones"
        icon="campaign"
        tint={CYAN}
        cardColor={cardColor}
        outlineColor={outlineColor}
        onSurfaceColor={onSurfaceColor}
        shadowColor={shadowColor}
        onPress={onAnnouncementsPress}
      />
    </View>
  );
}

type InfoTileProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  tint: string;
  cardColor: string;
  outlineColor: string;
  onSurfaceColor: string;
  shadowColor: string;
  onPress: () => void;
};

function InfoTile({
  title,
  subtitle,
  icon,
  tint,
  cardColor,
  outlineColor,
  onSurfaceColor,
  shadowColor,
  onPress,
}: InfoTileProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: cardColor,
            borderColor: outlineColor,
            shadowColor,
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: `${tint}1A` }]}> 
          <MaterialIcons name={icon} size={22} color={tint} />
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.infoTitle, { color: onSurfaceColor }]}>{title}</Text>
          <Text style={[styles.infoSubtitle, { color: onSurfaceColor }]}>{subtitle}</Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color={onSurfaceColor}
          style={{ opacity: 0.3 }}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  infoCard: {
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
    width: 45,
    height: 45,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoSubtitle: {
    marginTop: 2,
    fontSize: 14,
    opacity: 0.6,
  },
});
