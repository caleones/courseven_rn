

import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Button, Surface, TextInput } from "react-native-paper";
import { useProducts } from "../context/productContext";

export default function AddProductScreen() {
  const navigation = useNavigation();
  const { addProduct } = useProducts();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !quantity) return;

    await addProduct({
      name,
      description,
      quantity: Number(quantity),
    });

    navigation.goBack(); // go back to ProductListScreen
  };

  return (
    <Surface style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      {/* <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Add Product
      </Text> */}

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        style={{ marginBottom: 12 }}
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        style={{ marginBottom: 12 }}
      />

      <TextInput
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={{ marginBottom: 12 }}
      />

      <Button mode="contained" onPress={handleAdd}>
        Save
      </Button>
    </Surface>
  );
}
