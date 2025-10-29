
import { Product } from "@/src/features/products/domain/entities/Product";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Button, Surface, Text, TextInput } from "react-native-paper";
import { useProducts } from "../context/productContext";

export default function UpdateProductScreen({ route }: { route: any }) {
  const { id } = route.params;

  const navigation = useNavigation();

  const { getProduct, updateProduct } = useProducts();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    console.log("UpdateProductScreen - Received id:", id);
    const load = async () => {
      try {
        setLoading(true);
        console.log("UpdateProductScreen - Calling getProduct with id:", id);
        const p = await getProduct(id);
        console.log("UpdateProductScreen - Retrieved product:", p);

        if (!p) {
          console.log("UpdateProductScreen - Product not found");
          setNotFound(true);
        } else {
          console.log("UpdateProductScreen - Setting product data:", {
            name: p.name,
            description: p.description,
            quantity: p.quantity
          });
          setProduct(p);
          setName(p.name);
          setDescription(p.description);
          setQuantity(p.quantity.toString());
        }
      } catch (error) {
        console.error("UpdateProductScreen - Error loading product:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  const handleUpdate = async () => {
    if (!product) return;
    await updateProduct({
      _id: product._id,
      name,
      description,
      quantity: Number(quantity),
    });
    navigation.goBack();
  };

  if (loading) {
    return (
      <Surface style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text>Loading product...</Text>
      </Surface>
    );
  }

  if (notFound) {
    return (
      <Surface style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text variant="bodyLarge" style={{ color: "red" }}>
          Product not found
        </Text>
      </Surface>
    );
  }

  if (!product) {
    return (
      <Surface style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text>Loading...</Text>
      </Surface>
    );
  }

  return (
    <Surface style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      {/* <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
        Update Product
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

      <Button mode="contained" onPress={handleUpdate}>
        Update
      </Button>
    </Surface>
  );
}
