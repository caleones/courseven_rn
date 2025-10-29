import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    HelperText,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { StarryBackground } from "../../../../theme/StarryBackground";
import { useThemeMode } from "../../../../theme/ThemeProvider";
import { ThemeToggle } from "../../../../theme/ThemeToggle";
import { useAuth } from "../context/authContext";
import { AuthStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<AuthStackParamList, "Signup">;

type AvailabilityState = "idle" | "checking" | "available" | "taken";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;
const GOLD = "#FFD700";

const PASSWORD_REQUIREMENTS = [
	{ label: "Mínimo 8 caracteres", test: (value: string) => value.length >= 8 },
	{ label: "Incluye al menos una mayúscula", test: (value: string) => /[A-Z]/.test(value) },
	{ label: "Incluye al menos una minúscula", test: (value: string) => /[a-z]/.test(value) },
	{ label: "Incluye al menos un número", test: (value: string) => /\d/.test(value) },
	{ label: "Incluye al menos un símbolo", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function SignupScreen() {
	const navigation = useNavigation<Navigation>();
	const {
		signup,
		loading,
		error,
		clearError,
		checkEmailAvailability,
		checkUsernameAvailability,
	} = useAuth();
	const theme = useTheme();
	const { isDarkMode } = useThemeMode();

	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [emailAvailability, setEmailAvailability] = useState<AvailabilityState>("idle");
	const [usernameAvailability, setUsernameAvailability] = useState<AvailabilityState>("idle");

	const disableAction = loading || submitting;

	useEffect(() => {
		const candidate = email.trim().toLowerCase();
		if (!candidate || !emailRegex.test(candidate)) {
			setEmailAvailability("idle");
			return;
		}
		setEmailAvailability("checking");
		const timeout = setTimeout(async () => {
			try {
				const available = await checkEmailAvailability(candidate);
				setEmailAvailability(available ? "available" : "taken");
			} catch {
				setEmailAvailability("idle");
			}
		}, 400);
		return () => clearTimeout(timeout);
	}, [email, checkEmailAvailability]);

	useEffect(() => {
		const candidate = username.trim();
		if (!candidate || candidate.length < 3 || !usernameRegex.test(candidate)) {
			setUsernameAvailability("idle");
			return;
		}
		setUsernameAvailability("checking");
		const timeout = setTimeout(async () => {
			try {
				const available = await checkUsernameAvailability(candidate);
				setUsernameAvailability(available ? "available" : "taken");
			} catch {
				setUsernameAvailability("idle");
			}
		}, 400);
		return () => clearTimeout(timeout);
	}, [username, checkUsernameAvailability]);

	const passwordStatuses = useMemo(
		() => PASSWORD_REQUIREMENTS.map((req) => ({ label: req.label, valid: req.test(password) })),
		[password],
	);
	const subtitleColor = isDarkMode ? "rgba(250,250,250,0.7)" : "rgba(13,13,13,0.7)";
	const helperColor = isDarkMode ? "rgba(250,250,250,0.75)" : "rgba(13,13,13,0.7)";
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
	const canSubmit =
		emailRegex.test(email.trim()) &&
		usernameRegex.test(username.trim()) &&
		username.trim().length >= 3 &&
		firstName.trim().length > 0 &&
		lastName.trim().length > 0 &&
		passwordStatuses.every((item) => item.valid) &&
		passwordsMatch &&
		emailAvailability === "available" &&
		usernameAvailability === "available";

	const handleSubmit = async () => {
		if (!canSubmit) return;
		try {
			clearError();
			setSubmitting(true);
			const trimmedEmail = email.trim().toLowerCase();
			const payload = {
				email: trimmedEmail,
				password,
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				username: username.trim(),
			} as const;

			await signup(payload);

			navigation.navigate("EmailVerification", payload);
		} catch (err) {
			console.error("Signup failed", err);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<StarryBackground>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={styles.keyboard}
					behavior={Platform.select({ ios: "padding", android: undefined })}
				>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.inner}>
							<View style={styles.headerRow}>
								<ThemeToggle />
							</View>

							<Image
								source={require("../../../../../assets/images/courseven_logo.png")}
								style={styles.logo}
								resizeMode="contain"
							/>

							<Text style={[styles.title, { color: theme.colors.onBackground }]}>Regístrate</Text>
							<Text style={[styles.subtitle, { color: subtitleColor }]}>Únete a la comunidad estudiantil</Text>

							<TextInput
								mode="outlined"
								label="Correo institucional"
								value={email}
								onChangeText={(value) => {
									setEmail(value);
									clearError();
								}}
								autoCapitalize="none"
								keyboardType="email-address"
								left={<TextInput.Icon icon="email-outline" color={GOLD} />}
								style={styles.input}
								outlineStyle={styles.outline}
								textColor={theme.colors.onSurface}
							/>
							<AvailabilityBadge
								state={emailAvailability}
								takenMessage="Ese correo ya está en uso"
								availableMessage="Correo disponible"
							/>

							<TextInput
								mode="outlined"
								label="Nombre de usuario"
								value={username}
								onChangeText={(value) => {
									setUsername(value);
									clearError();
								}}
								autoCapitalize="none"
								left={<TextInput.Icon icon="account-circle-outline" color={GOLD} />}
								style={styles.input}
								outlineStyle={styles.outline}
								textColor={theme.colors.onSurface}
							/>
							<Text style={[styles.fieldHint, { color: helperColor }]}>Sólo letras, números y guiones bajos. Mínimo 3 caracteres.</Text>
							<AvailabilityBadge
								state={usernameAvailability}
								takenMessage="Ese nombre de usuario ya está en uso"
								availableMessage="Nombre de usuario disponible"
							/>

							<View style={styles.row}>
								<View style={styles.flexItem}>
									<TextInput
										mode="outlined"
										label="Nombre"
										value={firstName}
										onChangeText={(value) => {
											setFirstName(value);
											clearError();
										}}
										autoCapitalize="words"
										left={<TextInput.Icon icon="account-outline" color={GOLD} />}
										style={styles.input}
										outlineStyle={styles.outline}
										textColor={theme.colors.onSurface}
									/>
								</View>
								<View style={styles.gap} />
								<View style={styles.flexItem}>
									<TextInput
										mode="outlined"
										label="Apellido"
										value={lastName}
										onChangeText={(value) => {
											setLastName(value);
											clearError();
										}}
										autoCapitalize="words"
										left={<TextInput.Icon icon="account-outline" color={GOLD} />}
										style={styles.input}
										outlineStyle={styles.outline}
										textColor={theme.colors.onSurface}
									/>
								</View>
							</View>

							<TextInput
								mode="outlined"
								label="Contraseña"
								value={password}
								onChangeText={(value) => {
									setPassword(value);
									clearError();
								}}
								secureTextEntry={!showPassword}
								left={<TextInput.Icon icon="lock-outline" color={GOLD} />}
								right={
									<TextInput.Icon
										icon={showPassword ? "eye-off-outline" : "eye-outline"}
										color={GOLD}
										onPress={() => setShowPassword((prev) => !prev)}
									/>
								}
								style={styles.input}
								outlineStyle={styles.outline}
								textColor={theme.colors.onSurface}
							/>

							<TextInput
								mode="outlined"
								label="Confirmar contraseña"
								value={confirmPassword}
								onChangeText={(value) => {
									setConfirmPassword(value);
									clearError();
								}}
								secureTextEntry={!showConfirmPassword}
								left={<TextInput.Icon icon="lock-check-outline" color={GOLD} />}
								right={
									<TextInput.Icon
										icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
										color={GOLD}
										onPress={() => setShowConfirmPassword((prev) => !prev)}
									/>
								}
								style={styles.input}
								outlineStyle={styles.outline}
								textColor={theme.colors.onSurface}
							/>

							<View style={styles.requirements}>
								{passwordStatuses.map((item) => (
									<View key={item.label} style={styles.requirementRow}>
										<MaterialCommunityIcons
											size={18}
											name={item.valid ? "check-circle" : "checkbox-blank-circle-outline"}
											color={item.valid ? "#2E7D32" : GOLD}
										/>
										<Text style={[styles.requirementText, { color: helperColor }]}>{item.label}</Text>
									</View>
								))}
							</View>

							{!passwordsMatch && confirmPassword.length > 0 ? (
								<HelperText type="error" visible style={styles.errorText}>
									Las contraseñas no coinciden
								</HelperText>
							) : null}

							{error && !submitting ? (
								<HelperText type="error" visible style={styles.errorText}>
									{error}
								</HelperText>
							) : null}

							<Button
								mode="contained"
								onPress={handleSubmit}
								disabled={!canSubmit || disableAction}
								loading={disableAction && canSubmit}
								style={styles.primaryButton}
								contentStyle={styles.primaryButtonContent}
							>
								Regístrate
							</Button>

							<Text style={[styles.loginPrompt, { color: helperColor }]}>
								¿Ya tienes cuenta?
								<Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
									{" "}Ingresar
								</Text>
							</Text>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
				{(loading || submitting) && (
					<View style={styles.overlay}>
						<ActivityIndicator animating size="large" />
					</View>
				)}
			</SafeAreaView>
		</StarryBackground>
	);
}

type AvailabilityBadgeProps = {
	state: AvailabilityState;
	takenMessage: string;
	availableMessage: string;
};

function AvailabilityBadge({ state, takenMessage, availableMessage }: AvailabilityBadgeProps) {
	if (state === "idle") return null;

	if (state === "checking") {
		return (
			<View style={styles.availabilityRow}>
				<ActivityIndicator animating size="small" color={GOLD} />
				<Text style={styles.availabilityText}>Verificando...</Text>
			</View>
		);
	}

	if (state === "taken") {
		return (
			<View style={styles.availabilityRow}>
				<MaterialCommunityIcons name="close-circle" size={18} color="#FF6B6B" />
				<Text style={[styles.availabilityText, styles.availabilityError]}>{takenMessage}</Text>
			</View>
		);
	}

	return (
		<View style={styles.availabilityRow}>
			<MaterialCommunityIcons name="check-circle" size={18} color="#2E7D32" />
			<Text style={[styles.availabilityText, styles.availabilitySuccess]}>{availableMessage}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		paddingTop: Platform.OS === "android" ? 32 : 12,
	},
	keyboard: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
	inner: {
		flex: 1,
		paddingHorizontal: 24,
		paddingBottom: 40,
		paddingTop: 8,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		marginBottom: 16,
	},
	logo: {
		width: 140,
		height: 140,
		alignSelf: "center",
		marginBottom: 24,
	},
	title: {
		textAlign: "center",
		fontSize: 30,
		fontWeight: "700",
	},
	subtitle: {
		marginTop: 6,
		textAlign: "center",
		fontSize: 16,
		fontWeight: "500",
		marginBottom: 28,
	},
	input: {
		marginBottom: 14,
	},
	outline: {
		borderRadius: 14,
	},
	fieldHint: {
		fontSize: 13,
		marginTop: -6,
		marginBottom: 10,
	},
	row: {
		flexDirection: "row",
		marginBottom: 14,
	},
	flexItem: {
		flex: 1,
	},
	gap: {
		width: 12,
	},
	requirements: {
		marginTop: 8,
		marginBottom: 18,
	},
	requirementRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	requirementText: {
		marginLeft: 10,
		fontSize: 14,
		fontWeight: "600",
	},
	errorText: {
		marginBottom: 16,
		fontWeight: "600",
	},
	primaryButton: {
		borderRadius: 14,
		marginTop: 8,
	},
	primaryButtonContent: {
		paddingVertical: 10,
	},
	loginPrompt: {
		marginTop: 22,
		textAlign: "center",
		fontSize: 15,
		fontWeight: "500",
	},
	loginLink: {
		color: GOLD,
		fontWeight: "700",
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(0,0,0,0.2)",
	},
	availabilityRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	availabilityText: {
		marginLeft: 8,
		fontWeight: "600",
		color: "#C1C1C1",
		fontSize: 13,
	},
	availabilityError: {
		color: "#FF6B6B",
	},
	availabilitySuccess: {
		color: "#2E7D32",
	},
});
