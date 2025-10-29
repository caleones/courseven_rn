import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, List, Switch, Text, useTheme } from "react-native-paper";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";

const GOLD = "#FFD700";
const PREMIUM_BLACK = "#1A1A1A";

export default function SettingScreen() {
  const theme = useTheme();
  const { logout } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Configuración
          </Text>
        </View>

        <SettingsCard title="Apariencia" icon="palette">
          <List.Item
            title="Tema"
            description="Cambiar entre tema claro y oscuro"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          />
          <Divider />
          <List.Item
            title="Tamaño de Fuente"
            description="Medio"
            left={(props) => <List.Icon {...props} icon="format-size" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </SettingsCard>

        <SettingsCard title="Notificaciones" icon="bell">
          <SwitchItem
            title="Habilitar Notificaciones"
            description="Recibir notificaciones de la aplicación"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <Divider />
          <SwitchItem
            title="Notificaciones por Email"
            description="Recibir notificaciones en tu correo"
            value={emailNotifications}
            onValueChange={setEmailNotifications}
          />
          <Divider />
          <SwitchItem
            title="Notificaciones Push"
            description="Notificaciones instantáneas en el dispositivo"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <Divider />
          <SwitchItem
            title="Sonido"
            description="Reproducir sonido con las notificaciones"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
        </SettingsCard>

        <SettingsCard title="Cuenta" icon="account">
          <List.Item
            title="Editar Perfil"
            description="Cambiar información personal"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Cambiar Contraseña"
            description="Actualizar tu contraseña"
            left={(props) => <List.Icon {...props} icon="lock" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Privacidad"
            description="Configuración de privacidad"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </SettingsCard>

        <SettingsCard title="Acerca de" icon="information">
          <List.Item
            title="Versión"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information-outline" />}
          />
          <Divider />
          <List.Item
            title="Términos y Condiciones"
            description="Leer términos de uso"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Política de Privacidad"
            description="Leer política de privacidad"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Contacto"
            description="soporte@courseven.com"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </SettingsCard>

        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={logout}
            style={[styles.logoutButton, { backgroundColor: GOLD }]}
            labelStyle={[styles.logoutLabel, { color: PREMIUM_BLACK }]}
            icon="logout"
          >
            Cerrar Sesión
          </Button>
        </View>
      </ScrollView>
      <BottomNavigationDock currentIndex={4} />
    </SafeAreaView>
  );
}

type SettingsCardProps = {
  title: string;
  icon: string;
  children: React.ReactNode;
};

function SettingsCard({ title, icon, children }: SettingsCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: `${theme.colors.outline}1A`,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIconWrapper,
            { backgroundColor: `${GOLD}1A` },
          ]}
        >
          <List.Icon icon={icon} color={GOLD} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      </View>
      <List.Section>{children}</List.Section>
    </View>
  );
}

type SwitchItemProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SwitchItem({ title, description, value, onValueChange }: SwitchItemProps) {
  return (
    <List.Item
      title={title}
      description={description}
      left={(props) => <List.Icon {...props} icon="toggle-switch" />}
      right={() => (
        <Switch
          value={value}
          onValueChange={onValueChange}
          color={GOLD}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  logoutContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  logoutButton: {
    paddingVertical: 8,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
