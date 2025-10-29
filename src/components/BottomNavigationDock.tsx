import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Badge, Icon } from "react-native-paper";

const GOLD = "#FFD700";

type BottomNavigationDockProps = {
  currentIndex: number;
  hasNewNotifications?: boolean;
};

export function BottomNavigationDock({
  currentIndex,
  hasNewNotifications = false,
}: BottomNavigationDockProps) {
  const navigation = useNavigation<any>();

  const handleNavigate = (index: number, route: string) => {
    if (currentIndex === index) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: route as never }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.dock}>
        <NavItem
          icon="home"
          index={0}
          currentIndex={currentIndex}
          onPress={() => handleNavigate(0, "Home")}
        />
        <NavItem
          icon="calendar"
          index={1}
          currentIndex={currentIndex}
          onPress={() => handleNavigate(1, "Calendar")}
        />
        <View style={{ position: "relative" }}>
          <NavItem
            icon="bell"
            index={2}
            currentIndex={currentIndex}
            onPress={() => handleNavigate(2, "Notifications")}
          />
          {hasNewNotifications && (
            <Badge style={styles.badge} size={8} />
          )}
        </View>
        <NavItem
          icon="account"
          index={3}
          currentIndex={currentIndex}
          onPress={() => handleNavigate(3, "Account")}
        />
        <NavItem
          icon="cog"
          index={4}
          currentIndex={currentIndex}
          onPress={() => handleNavigate(4, "Settings")}
        />
      </View>
    </View>
  );
}

type NavItemProps = {
  icon: string;
  index: number;
  currentIndex: number;
  onPress: () => void;
};

function NavItem({ icon, index, currentIndex, onPress }: NavItemProps) {
  const isSelected = index === currentIndex;

  return (
    <TouchableOpacity onPress={onPress} style={styles.navItemTouchable}>
      <View
        style={[
          styles.navItem,
          isSelected && styles.navItemSelected,
        ]}
      >
        <Icon
          source={icon}
          size={24}
          color={isSelected ? GOLD : "rgba(255, 255, 255, 0.6)"}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  dock: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  navItemTouchable: {
    flex: 1,
    alignItems: "center",
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navItemSelected: {
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: GOLD,
  },
});
