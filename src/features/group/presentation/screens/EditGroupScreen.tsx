import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";

import { useGroupController } from "@/src/features/group/hooks/useGroupController";

type RouteParams = {
  groupId: string;
  courseId: string;
  categoryId: string;
};

const MIN_NAME_LENGTH = 3;

export default function EditGroupScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { groupId, courseId, categoryId } = (route.params ?? {}) as RouteParams;
  const [groupState, groupController] = useGroupController();

  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  useEffect(() => {
    (async () => {
      if (!courseId || !groupId) return;
      
      const groups = groupController.groupsForCourse(courseId);
      const found = groups.find((g) => g.id === groupId);
      if (found) {
        setName(found.name);
      } else {
        
      }
    })();
  }, [groupController, courseId, groupId]);

  const validate = useCallback((): string | null => {
    if (name.trim().length < MIN_NAME_LENGTH) {
      return "El nombre es muy corto";
    }
    return null;
  }, [name]);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!groupId || !courseId || !categoryId) {
      setError("Identificador del grupo inválido");
      return;
    }
    
    const groups = groupController.groupsForCourse(courseId);
    const existing = groups.find((g) => g.id === groupId);
    if (!existing) {
      setError("No se pudo obtener el grupo");
      return;
    }
    const updated = await groupController.updateGroup({
      ...existing,
      name: name.trim(),
    });
    const snapshot = groupController.getSnapshot();
    if (updated) {
      Alert.alert("Grupo actualizado", "El grupo se actualizó correctamente.", [
        {
          text: "Aceptar",
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      setError(snapshot.error ?? "No se pudo actualizar el grupo");
    }
  }, [groupController, groupId, courseId, categoryId, name, navigation, validate]);

  const helperText = useMemo(() => {
    if (!touched) {
      return "Edita el nombre para actualizar el grupo";
    }
    return error ?? "";
  }, [touched, error]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Editar grupo</Text>
          <View style={styles.section}>
            <TextInput
              label="Nombre"
              mode="outlined"
              value={name}
              onChangeText={(value) => setName(value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </View>
          <HelperText type={error ? "error" : "info"} visible style={{ marginBottom: 8 }}>
            {helperText}
          </HelperText>
          <Button
            mode="contained"
            icon="content-save"
            onPress={handleSubmit}
            loading={groupState.isLoading}
            disabled={groupState.isLoading}
          >
            Guardar cambios
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  section: {
    gap: 16,
  },
});