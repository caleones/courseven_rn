import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigationDock } from "@/src/components/BottomNavigationDock";
import { Category } from "@/src/domain/models/Category";
import { Course } from "@/src/domain/models/Course";
import { CourseActivity } from "@/src/domain/models/CourseActivity";
import { Group } from "@/src/domain/models/Group";
import { useActivityController } from "@/src/features/activity/hooks/useActivityController";
import { useAuth } from "@/src/features/auth/presentation/context/authContext";
import { useCategoryController } from "@/src/features/category/hooks/useCategoryController";
import { useCourseController } from "@/src/features/course/hooks/useCourseController";
import { useEnrollmentController } from "@/src/features/enrollment/hooks/useEnrollmentController";
import { useGroupController } from "@/src/features/group/hooks/useGroupController";
import { useMembershipController } from "@/src/features/membership/hooks/useMembershipController";

const PREVIEW_LIMIT = 3;

type RouteParams = {
	courseId?: string;
};

type PillConfig = {
	icon: keyof typeof MaterialIcons.glyphMap;
	label: string;
};

type SectionCardProps = {
	title: string;
	icon: keyof typeof MaterialIcons.glyphMap;
	count?: number;
	children: React.ReactNode;
};

type DualActionButtonsProps = {
	primaryLabel: string;
	primaryIcon: keyof typeof MaterialIcons.glyphMap;
	secondaryLabel: string;
	secondaryIcon: keyof typeof MaterialIcons.glyphMap;
	onPrimary: () => void;
	onSecondary: () => void;
	primaryDisabled?: boolean;
	secondaryDisabled?: boolean;
};

type FullWidthButtonProps = {
	label: string;
	icon: keyof typeof MaterialIcons.glyphMap;
	onPress: () => void;
	mode?: "contained" | "contained-tonal";
	style?: object;
	disabled?: boolean;
};

type SolidListTileProps = {
	icon: keyof typeof MaterialIcons.glyphMap;
	title: string;
	pills?: PillConfig[];
};

type PeerReviewSectionProps = {
	isTeacher: boolean;
	reviewCount: number;
	myGroupName?: string | null;
	onViewCourse: () => void;
	onViewGroup: () => void;
	isLoading: boolean;
};

type MetaRowItem = {
	label: string;
	value: string;
};

type CourseHeaderProps = {
	title: string;
	subtitle: string;
	showEdit: boolean;
	onEdit: () => void;
	onBack: () => void;
};

type MetaPillProps = {
	label: string;
	value: string;
	isFirst: boolean;
};

type InactiveBannerProps = {
	isTeacher: boolean;
	onEnable: () => void;
};

type EmptyCardProps = {
	icon: keyof typeof MaterialIcons.glyphMap;
	title: string;
	subtitle?: string;
};

export default function CourseDetailScreen() {
	const navigation = useNavigation<any>();
	const route = useRoute();
	const { courseId } = (route.params ?? {}) as RouteParams;

	const theme = useTheme();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();

	const [courseState, courseController] = useCourseController();
	const [categoryState, categoryController] = useCategoryController();
	const [groupState, groupController] = useGroupController();
	const [membershipState, membershipController] = useMembershipController();
	const [activityState, activityController] = useActivityController();
	const [enrollmentState, enrollmentController] = useEnrollmentController();

	const [course, setCourse] = useState<Course | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const formatDate = useCallback((raw?: string | null) => {
		if (!raw) return null;
		const parsed = new Date(raw);
		if (Number.isNaN(parsed.getTime())) return null;
		const year = parsed.getFullYear();
		const month = String(parsed.getMonth() + 1).padStart(2, "0");
		const day = String(parsed.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}, []);

	const formatDueLabel = useCallback(
		(raw?: string | null) => {
			const formatted = formatDate(raw);
			return formatted ? `Vence: ${formatted}` : "Sin fecha límite";
		},
		[formatDate],
	);

	const loadEverything = useCallback(
		async ({ force = false }: { force?: boolean } = {}) => {
			if (!courseId) {
				setError("Falta el identificador del curso");
				return;
			}
			setError(null);
			try {
				const fetched = await courseController.getCourseById(courseId);
				if (!fetched) {
					setCourse(null);
					setError("No encontramos este curso");
					return;
				}
				setCourse(fetched);

				await enrollmentController.ensureUserLoaded(fetched.teacherId);

				const isTeacherUser = user?.id === fetched.teacherId;

				await Promise.all([
					categoryController.loadByCourse(courseId, { force }),
					groupController.loadByCourse(courseId, { force }),
					isTeacherUser
						? activityController.loadByCourse(courseId, { force })
						: activityController.loadForStudent(courseId, { force }),
				]);

				const courseGroups = groupController.groupsForCourse(courseId);
				const groupIds = courseGroups.map((group) => group.id);
				if (groupIds.length > 0) {
					await Promise.all([
						membershipController.preloadMembershipsForGroups(groupIds),
						membershipController.preloadMemberCountsForGroups(groupIds),
					]);
				}

				await enrollmentController.loadEnrollmentCountForCourse(courseId, { force });
			} catch (err) {
				setError(err instanceof Error ? err.message : "No se pudo cargar el curso");
			}
		},
		[
			activityController,
			categoryController,
			courseController,
			courseId,
			enrollmentController,
			groupController,
			membershipController,
			user?.id,
		],
	);

	useFocusEffect(
		useCallback(() => {
			if (!courseId) {
				setError("Falta el identificador del curso");
				return () => undefined;
			}
			let cancelled = false;
			void (async () => {
				if (!cancelled) {
					await loadEverything({ force: false });
				}
			})();
			return () => {
				cancelled = true;
			};
		}, [courseId, loadEverything]),
	);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await loadEverything({ force: true });
		} finally {
			setRefreshing(false);
		}
	}, [loadEverything]);

	const isTeacher = useMemo(() => {
		if (!course || !user?.id) {
			return false;
		}
		return course.teacherId === user.id;
	}, [course, user?.id]);

	const cachedTitle = courseId ? enrollmentController.getCourseTitle(courseId) : "";
	const displayTitle = course?.name?.trim() ? course.name : cachedTitle || "Curso";
	const subtitle = isTeacher ? "Continúa enseñando" : "Continúa tu aprendizaje en";
	const joinCode = course?.joinCode ?? "";
	const isInactive = course ? !course.isActive : false;

	const enrollmentCount = courseId ? enrollmentController.enrollmentCountFor(courseId) : 0;
	const enrollmentCountLoading = courseId ? enrollmentController.isLoadingCount(courseId) : false;

	const categories = useMemo<Category[]>(() => {
		if (!courseId) return [];
		return categoryController.categoriesFor(courseId).filter((category) => category.isActive);
	}, [categoryController, courseId]);

	const groups = useMemo<Group[]>(() => {
		if (!courseId) return [];
		return groupController.groupsForCourse(courseId);
	}, [courseId, groupController]);

	const activities = useMemo<CourseActivity[]>(() => {
		if (!courseId) return [];
		if (isTeacher) {
			return activityController.activitiesForCourse(courseId);
		}
		return activityController.studentActivitiesForCourse(courseId);
	}, [activityController, courseId, isTeacher]);

	const categoryMap = useMemo(() => {
		const map = new Map<string, Category>();
		categories.forEach((category) => map.set(category.id, category));
		return map;
	}, [categories]);

	const groupsByCategory = useMemo(() => {
		const map = new Map<string, Group[]>();
		groups.forEach((group) => {
			const existing = map.get(group.categoryId);
			if (existing) {
				existing.push(group);
			} else {
				map.set(group.categoryId, [group]);
			}
		});
		return map;
	}, [groups]);

	const joinedGroupIds = useMemo(() => new Set(membershipState.myGroupIds), [membershipState.myGroupIds]);

	const joinedGroupByCategory = useMemo(() => {
		const map = new Map<string, Group>();
		if (joinedGroupIds.size === 0) {
			return map;
		}
		for (const group of groups) {
			if (!map.has(group.categoryId) && joinedGroupIds.has(group.id)) {
				map.set(group.categoryId, group);
			}
		}
		return map;
	}, [groups, joinedGroupIds]);

	const previewActivities = useMemo(() => {
		return activities
			.slice()
			.sort((a, b) => {
				const aTime = Date.parse(a.createdAt ?? "");
				const bTime = Date.parse(b.createdAt ?? "");
				const safeATime = Number.isNaN(aTime) ? 0 : aTime;
				const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
				return safeBTime - safeATime;
			})
			.slice(0, PREVIEW_LIMIT);
	}, [activities]);

	const previewCategories = useMemo(
		() => categories.slice(0, PREVIEW_LIMIT),
		[categories],
	);

	const previewGroups = useMemo(() => {
		const sorted = groups
			.slice()
			.sort((a, b) => {
				const aTime = Date.parse(a.createdAt ?? "");
				const bTime = Date.parse(b.createdAt ?? "");
				const safeATime = Number.isNaN(aTime) ? 0 : aTime;
				const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
				return safeBTime - safeATime;
			});

		let preview = sorted.slice(0, PREVIEW_LIMIT);

		if (!isTeacher && joinedGroupIds.size > 0) {
			const joinedByCategory = new Map<string, string>();
			for (const group of sorted) {
				if (joinedGroupIds.has(group.id)) {
					joinedByCategory.set(group.categoryId, group.id);
				}
			}
			if (joinedByCategory.size > 0) {
				preview = preview.filter((group) => {
					const keepId = joinedByCategory.get(group.categoryId);
					return !keepId || keepId === group.id;
				});
			}
		}

		return preview;
	}, [groups, isTeacher, joinedGroupIds]);

	const reviewActivityIds = useMemo(
		() =>
			activities
				.filter((activity) => activity.reviewing && !activity.privateReview)
				.map((activity) => activity.id),
		[activities],
	);

	const showPeerReviewSection = isTeacher || reviewActivityIds.length > 0;
	const myPeerReviewGroup = useMemo(() => {
		if (isTeacher) return null;
		return groups.find((group) => joinedGroupIds.has(group.id)) ?? null;
	}, [groups, isTeacher, joinedGroupIds]);

	const aggregatedError =
		error ??
		courseState.error ??
		categoryState.error ??
		groupState.error ??
		activityState.error ??
		membershipState.error ??
		enrollmentState.error ??
		null;

	const isLoadingAny =
		categoryState.isLoading ||
		groupState.isLoading ||
		membershipState.isLoading ||
		activityState.isLoading ||
		enrollmentState.isLoading;

	const isInitialLoading = !course && !aggregatedError;

	const handleBack = useCallback(() => {
		navigation.goBack();
	}, [navigation]);

	const handleEditCourse = useCallback(() => {
		if (!courseId || !course) return;
		Alert.alert(
			"Editar curso",
			"La edición del curso estará disponible próximamente en esta versión.",
		);
	}, [course, courseId]);

	const handleEnableCourse = useCallback(() => {
		if (!courseId || !isTeacher) return;
		Alert.alert("Habilitar curso", "¿Deseas habilitar este curso ahora?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Habilitar",
				onPress: () => {
					void (async () => {
						const updated = await courseController.setCourseActive(courseId, true);
						if (updated) {
							await loadEverything({ force: true });
						}
					})();
				},
			},
		]);
	}, [courseController, courseId, isTeacher, loadEverything]);

	const handleCreateActivity = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CreateActivity", { courseId, lockCourse: true });
	}, [courseId, navigation]);

	const handleSeeAllActivities = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CourseActivities", { courseId, isTeacher });
	}, [courseId, isTeacher, navigation]);

	const handleCreateCategory = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CreateCategory", { courseId });
	}, [courseId, navigation]);

	const handleSeeAllCategories = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CourseCategories", { courseId, isTeacher });
	}, [courseId, isTeacher, navigation]);

	const handleCreateGroup = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CreateGroup", { courseId });
	}, [courseId, navigation]);

	const handleSeeAllGroups = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CourseGroups", { courseId, isTeacher });
	}, [courseId, isTeacher, navigation]);

	const handleSeeAllStudents = useCallback(() => {
		if (!courseId) return;
		navigation.navigate("CourseStudents", { courseId });
	}, [courseId, navigation]);

	const handleDismissError = useCallback(() => {
		setError(null);
		courseController.clearError();
		categoryController.clearError();
		groupController.clearError();
		activityController.clearError();
		membershipController.clearError();
		enrollmentController.clearError();
	}, [
		activityController,
		categoryController,
		courseController,
		enrollmentController,
		groupController,
		membershipController,
	]);

	const handleViewPeerReviewCourse = useCallback(() => {
		if (!courseId || reviewActivityIds.length === 0) return;
		navigation.navigate("PeerReviewCourseSummary" as never, { 
			courseId, 
			activityIds: reviewActivityIds 
		} as never);
	}, [courseId, navigation, reviewActivityIds]);

	const handleViewPeerReviewGroup = useCallback(() => {
		if (!courseId || !myPeerReviewGroup || reviewActivityIds.length === 0) return;
		const routeName = "PeerReviewGroupSummary";
		const state = navigation.getState?.();
		if (!state?.routeNames?.includes(routeName)) {
			Alert.alert(
				"Próximamente",
				"El promedio de grupo para Peer Review estará disponible pronto.",
			);
			return;
		}
		navigation.navigate(routeName as never, {
			courseId,
			groupId: myPeerReviewGroup.id,
			groupName: myPeerReviewGroup.name,
			activityIds: reviewActivityIds,
		} as never);
	}, [courseId, myPeerReviewGroup, navigation, reviewActivityIds]);

	const metaItems = useMemo<MetaRowItem[]>(
		() => [
			{ label: "Código", value: joinCode.trim().length > 0 ? joinCode : "—" },
			{
				label: "Estudiantes",
				value: enrollmentCountLoading ? "Cargando…" : `${enrollmentCount}`,
			},
		],
		[enrollmentCount, enrollmentCountLoading, joinCode],
	);

	if (!courseId) {
		return (
			<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
				<View style={styles.missingContent}>
					<Text style={[styles.missingTitle, { color: theme.colors.onSurface }]}>
						Curso no encontrado
					</Text>
					<Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
						Necesitamos un identificador de curso para continuar.
					</Text>
					<Button
						mode="contained"
						onPress={handleBack}
						style={styles.retryButton}
						uppercase={false}
					>
						Volver
					</Button>
				</View>
				<BottomNavigationDock currentIndex={-1} />
			</SafeAreaView>
		);
	}

	let mainContent: React.ReactNode;

	if (isInitialLoading) {
		mainContent = (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingLabel}>Cargando curso…</Text>
			</View>
		);
	} else if (!course && aggregatedError) {
		mainContent = (
			<View style={styles.missingContent}>
				<MaterialIcons name="error-outline" size={40} color={theme.colors.error} />
				<Text style={[styles.missingTitle, { color: theme.colors.onSurface, marginTop: 16 }]}>
					No pudimos cargar el curso
				</Text>
				<Text
					style={{
						color: theme.colors.onSurfaceVariant,
						marginTop: 8,
						textAlign: "center",
					}}
				>
					{aggregatedError}
				</Text>
				<Button
					mode="contained"
					onPress={handleRefresh}
					style={styles.retryButton}
					uppercase={false}
				>
					Reintentar
				</Button>
			</View>
		);
	} else if (!course) {
		mainContent = (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" />
			</View>
		);
	} else {
		const reviewCount = reviewActivityIds.length;

		mainContent = (
			<View style={styles.body}>
				<CourseHeader
					title={displayTitle}
					subtitle={subtitle}
					showEdit={isTeacher}
					onEdit={handleEditCourse}
					onBack={handleBack}
				/>
				<MetaRow items={metaItems} />
				{isInactive ? (
					<InactiveBanner isTeacher={isTeacher} onEnable={handleEnableCourse} />
				) : null}
				{aggregatedError ? (
					<Chip
						icon="alert-circle-outline"
						closeIcon="close"
						style={styles.errorChip}
						textStyle={styles.errorChipText}
						onClose={handleDismissError}
					>
						{aggregatedError}
					</Chip>
				) : null}

				{showPeerReviewSection ? (
					<SectionCard
						title="Peer Review"
						icon="analytics"
						count={reviewCount > 0 ? reviewCount : undefined}
					>
						<PeerReviewSection
							isTeacher={isTeacher}
							reviewCount={reviewCount}
							myGroupName={myPeerReviewGroup?.name}
							onViewCourse={handleViewPeerReviewCourse}
							onViewGroup={handleViewPeerReviewGroup}
							isLoading={activityState.isLoading || membershipState.isLoading}
						/>
					</SectionCard>
				) : null}

				<SectionCard title="Actividades" icon="task-alt" count={activities.length}>
					{isTeacher ? (
						<DualActionButtons
							primaryLabel="NUEVA"
							primaryIcon="add-task"
							secondaryLabel="VER TODAS"
							secondaryIcon="visibility"
							onPrimary={handleCreateActivity}
							onSecondary={handleSeeAllActivities}
							primaryDisabled={isInactive}
						/>
					) : (
						<FullWidthButton
							label="VER TODAS"
							icon="visibility"
							onPress={handleSeeAllActivities}
						/>
					)}

					{previewActivities.length === 0 ? (
						<EmptyCard
							icon="assignment"
							title="No hay actividades aún"
							subtitle={
								isTeacher
									? "Crea una actividad para iniciar este curso."
									: "Tu profesor aún no ha publicado actividades."
							}
						/>
					) : (
						previewActivities.map((activity) => {
							const category = categoryMap.get(activity.categoryId);
							const pills: PillConfig[] = [];
							if (category) {
								pills.push({ icon: "folder", label: category.name });
							}
							pills.push({ icon: "schedule", label: formatDueLabel(activity.dueDate) });
							const joinedGroup = joinedGroupByCategory.get(activity.categoryId);
							if (joinedGroup) {
								pills.push({ icon: "group", label: `Tu grupo: ${joinedGroup.name}` });
							}
							return (
								<SolidListTile
									key={activity.id}
									icon="task-alt"
									title={activity.title}
									pills={pills}
								/>
							);
						})
					)}
				</SectionCard>

				<SectionCard title="Categorías" icon="category" count={categories.length}>
					{isTeacher ? (
						<DualActionButtons
							primaryLabel="NUEVA"
							primaryIcon="playlist-add"
							secondaryLabel="VER TODAS"
							secondaryIcon="visibility"
							onPrimary={handleCreateCategory}
							onSecondary={handleSeeAllCategories}
							primaryDisabled={isInactive}
						/>
					) : (
						<FullWidthButton
							label="VER TODAS"
							icon="visibility"
							onPress={handleSeeAllCategories}
							mode="contained-tonal"
						/>
					)}

					{previewCategories.length === 0 ? (
						<EmptyCard
							icon="category"
							title="No hay categorías aún"
							subtitle="Organiza el curso creando categorías."
						/>
					) : (
						previewCategories.map((category) => {
							const relatedGroups = groupsByCategory.get(category.id) ?? [];
							const pills: PillConfig[] = [
								{
									icon: "groups",
									label: `Agrupación: ${category.groupingMethod}`,
								},
							];
							if (typeof category.maxMembersPerGroup === "number") {
								pills.push({
									icon: "people",
									label: `Máx: ${category.maxMembersPerGroup}`,
								});
							}
							pills.push({ icon: "inventory-2", label: `Grupos: ${relatedGroups.length}` });
							return (
								<SolidListTile
									key={category.id}
									icon="category"
									title={category.name}
									pills={pills}
								/>
							);
						})
					)}
				</SectionCard>

				<SectionCard title="Grupos" icon="groups" count={groups.length}>
					{isTeacher ? (
						<DualActionButtons
							primaryLabel="NUEVO"
							primaryIcon="group-add"
							secondaryLabel="VER TODOS"
							secondaryIcon="visibility"
							onPrimary={handleCreateGroup}
							onSecondary={handleSeeAllGroups}
							primaryDisabled={isInactive}
						/>
					) : (
						<FullWidthButton
							label="VER TODOS"
							icon="visibility"
							onPress={handleSeeAllGroups}
							mode="contained-tonal"
						/>
					)}

					{previewGroups.length === 0 ? (
						<EmptyCard
							icon="groups"
							title="No hay grupos aún"
							subtitle={
								isTeacher
									? "Crea grupos para organizar a tus estudiantes."
									: "Cuando existan grupos, aparecerán aquí."
							}
						/>
					) : (
						previewGroups.map((group) => {
							const category = categoryMap.get(group.categoryId);
							const memberCount = membershipState.groupMemberCounts[group.id] ?? 0;
							const pills: PillConfig[] = [];
							if (category) {
								pills.push({ icon: "folder", label: `Categoría: ${category.name}` });
								const modeLabel = category.groupingMethod.toLowerCase() === "random" ? "aleatoria" : "manual";
								pills.push({ icon: "how-to-reg", label: `Unión: ${modeLabel}` });
								if (typeof category.maxMembersPerGroup === "number" && category.maxMembersPerGroup > 0) {
									pills.push({
										icon: "people",
										label: `Miembros: ${memberCount}/${category.maxMembersPerGroup}`,
									});
								} else {
									pills.push({ icon: "people-outline", label: `Miembros: ${memberCount}` });
								}
							} else {
								pills.push({ icon: "people-outline", label: `Miembros: ${memberCount}` });
							}
							return (
								<SolidListTile key={group.id} icon="groups" title={group.name} pills={pills} />
							);
						})
					)}

					<View style={styles.divider} />
					<FullWidthButton
						label="VER ESTUDIANTES"
						icon="people"
						onPress={handleSeeAllStudents}
						mode="contained"
						style={{ marginTop: 16 }}
					/>
				</SectionCard>

				{isLoadingAny ? (
					<View style={styles.loadingMoreContainer}>
						<ActivityIndicator size="small" />
						<Text style={styles.loadingMoreLabel}>Actualizando datos del curso…</Text>
					</View>
				) : null}
			</View>
		);
	}

	return (
		<SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
			<View style={styles.page}>
				<ScrollView
					contentContainerStyle={[
						styles.scrollContent,
						{
							paddingTop: Math.max(insets.top, 20) + 12,
							paddingBottom: 120 + insets.bottom,
						},
					]}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							tintColor={theme.colors.primary}
							colors={[theme.colors.primary]}
							progressBackgroundColor={theme.colors.surface}
						/>
					}
				>
					{mainContent}
				</ScrollView>
				<BottomNavigationDock currentIndex={-1} />
			</View>
		</SafeAreaView>
	);
}

const CourseHeader = ({ title, subtitle, showEdit, onEdit, onBack }: CourseHeaderProps) => {
	const theme = useTheme();
	return (
		<View style={styles.courseHeader}>
			<IconButton icon="arrow-left" size={24} onPress={onBack} />
			<View style={styles.courseHeaderTexts}>
				<Text style={[styles.courseHeaderSubtitle, { color: theme.colors.onSurfaceVariant }]}>
					{subtitle}
				</Text>
				<Text style={[styles.courseHeaderTitle, { color: theme.colors.onSurface }]}>{title}</Text>
			</View>
			{showEdit ? (
				<Button
					mode="contained-tonal"
					onPress={onEdit}
					icon={({ color, size }) => <MaterialIcons name="edit" size={size} color={color} />}
					style={styles.courseHeaderEdit}
					contentStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
					uppercase={false}
				>
					Editar
				</Button>
			) : null}
		</View>
	);
};

const MetaRow = ({ items }: { items: MetaRowItem[] }) => {
	return (
		<View style={styles.metaRow}>
			{items.map((item, index) => (
				<MetaPill
					key={item.label}
					label={item.label}
					value={item.value}
					isFirst={index === 0}
				/>
			))}
		</View>
	);
};

const MetaPill = ({ label, value, isFirst }: MetaPillProps) => {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.metaPill,
				{
					backgroundColor: theme.colors.secondaryContainer,
					borderColor: theme.colors.outlineVariant ?? "transparent",
					marginLeft: isFirst ? 0 : 12,
				},
			]}
		>
			<Text style={[styles.metaPillLabel, { color: theme.colors.onSecondaryContainer }]}>
				{label}:
			</Text>
			<Text style={[styles.metaPillValue, { color: theme.colors.onSecondaryContainer }]}>
				{value}
			</Text>
		</View>
	);
};

const InactiveBanner = ({ isTeacher, onEnable }: InactiveBannerProps) => {
	const theme = useTheme();
	const background = theme.colors.errorContainer ?? "#FFEDEB";
	const textColor = theme.colors.onErrorContainer ?? theme.colors.error;
	const message = isTeacher
		? "Este curso está inhabilitado. No puedes crear actividades, categorías o grupos hasta habilitarlo."
		: "Este curso está inhabilitado. Por ahora no puedes realizar acciones en este curso.";
	return (
		<View
			style={[
				styles.inactiveBanner,
				{ backgroundColor: background, borderColor: textColor },
			]}
		>
			<MaterialIcons
				name="info-outline"
				size={20}
				color={textColor}
				style={styles.inactiveBannerIcon}
			/>
			<View style={styles.inactiveBannerContent}>
				<Text style={[styles.inactiveBannerText, { color: textColor }]}>{message}</Text>
				{isTeacher ? (
					<Button
						mode="text"
						onPress={onEnable}
						uppercase={false}
						style={styles.inactiveBannerButton}
					>
						Habilitar ahora
					</Button>
				) : null}
			</View>
		</View>
	);
};

const SectionCard = ({ title, icon, count, children }: SectionCardProps) => {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.sectionCard,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.outlineVariant ?? "#00000012",
				},
			]}
		>
			<View style={styles.sectionCardHeader}>
				<MaterialIcons
					name={icon}
					size={20}
					color={theme.colors.primary}
					style={styles.sectionCardIcon}
				/>
				<Text style={[styles.sectionCardTitle, { color: theme.colors.onSurface }]}>
					{title}
				</Text>
				{typeof count === "number" ? (
					<View
						style={[
							styles.sectionCardCount,
							{ backgroundColor: theme.colors.secondaryContainer },
						]}
					>
						<Text
							style={[
								styles.sectionCardCountText,
								{ color: theme.colors.onSecondaryContainer },
							]}
						>
							{count} en total
						</Text>
					</View>
				) : null}
			</View>
			<View style={styles.sectionCardBody}>{children}</View>
		</View>
	);
};

const DualActionButtons = ({
	primaryLabel,
	primaryIcon,
	secondaryLabel,
	secondaryIcon,
	onPrimary,
	onSecondary,
	primaryDisabled,
	secondaryDisabled,
}: DualActionButtonsProps) => (
	<View style={styles.dualButtonsRow}>
		<Button
			mode="contained"
			onPress={onPrimary}
			icon={({ color, size }) => <MaterialIcons name={primaryIcon} size={size} color={color} />}
			style={[styles.dualButton, styles.dualButtonSpacing]}
			contentStyle={{ paddingVertical: 10 }}
			uppercase={false}
			disabled={primaryDisabled}
		>
			{primaryLabel}
		</Button>
		<Button
			mode="contained-tonal"
			onPress={onSecondary}
			icon={({ color, size }) => <MaterialIcons name={secondaryIcon} size={size} color={color} />}
			style={styles.dualButton}
			contentStyle={{ paddingVertical: 10 }}
			uppercase={false}
			disabled={secondaryDisabled}
		>
			{secondaryLabel}
		</Button>
	</View>
);

const FullWidthButton = ({
	label,
	icon,
	onPress,
	mode = "contained",
	style,
	disabled,
}: FullWidthButtonProps) => (
	<Button
		mode={mode}
		onPress={onPress}
		icon={({ color, size }) => <MaterialIcons name={icon} size={size} color={color} />}
		style={[styles.fullWidthButton, style]}
		contentStyle={{ paddingVertical: 10 }}
		uppercase={false}
		disabled={disabled}
	>
		{label}
	</Button>
);

const SolidListTile = ({ icon, title, pills }: SolidListTileProps) => {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.listTile,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.outlineVariant ?? "#00000012",
				},
			]}
		>
			<View
				style={[
					styles.listTileIcon,
					{ backgroundColor: theme.colors.secondaryContainer },
				]}
			>
				<MaterialIcons
					name={icon}
					size={20}
					color={theme.colors.onSecondaryContainer}
				/>
			</View>
			<View style={styles.listTileContent}>
				<Text style={[styles.listTileTitle, { color: theme.colors.onSurface }]}>
					{title}
				</Text>
				{pills && pills.length ? (
					<View style={styles.listTilePills}>
						{pills.map((pill, index) => (
							<Pill key={`${title}-${pill.label}-${index}`} icon={pill.icon} label={pill.label} />
						))}
					</View>
				) : null}
			</View>
		</View>
	);
};

const Pill = ({ icon, label }: PillConfig) => {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.pill,
				{
					backgroundColor: theme.colors.surfaceVariant ?? theme.colors.surface,
					borderColor: theme.colors.outlineVariant ?? "#00000012",
				},
			]}
		>
			<MaterialIcons
				name={icon}
				size={14}
				color={theme.colors.primary}
				style={styles.pillIcon}
			/>
			<Text style={[styles.pillText, { color: theme.colors.onSurface }]}>{label}</Text>
		</View>
	);
};

const EmptyCard = ({ icon, title, subtitle }: EmptyCardProps) => {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.emptyCard,
				{
					backgroundColor: theme.colors.surface,
					borderColor: theme.colors.outlineVariant ?? "#00000012",
				},
			]}
		>
			<MaterialIcons name={icon} size={40} color={theme.colors.primary} />
			<Text style={[styles.emptyCardTitle, { color: theme.colors.onSurface }]}>{title}</Text>
			{subtitle ? (
				<Text
					style={[styles.emptyCardSubtitle, { color: theme.colors.onSurfaceVariant }]}
				>
					{subtitle}
				</Text>
			) : null}
		</View>
	);
};

const PeerReviewSection = ({
	isTeacher,
	reviewCount,
	myGroupName,
	onViewCourse,
	onViewGroup,
	isLoading,
}: PeerReviewSectionProps) => {
	const theme = useTheme();

	if (isTeacher) {
		return (
			<View>
				<Button
					mode="contained"
					onPress={onViewCourse}
					icon={({ color, size }) => <MaterialIcons name="analytics" size={size} color={color} />}
					style={styles.peerReviewButton}
					contentStyle={{ paddingVertical: 10 }}
					uppercase={false}
					disabled={reviewCount === 0 || isLoading}
				>
					Resultados
				</Button>
				<Text style={[styles.peerReviewText, { color: theme.colors.onSurfaceVariant }]}>
					{reviewCount === 0
						? "Aún no hay actividades públicas de peer review en este curso."
						: `Incluye ${reviewCount} actividad${reviewCount === 1 ? "" : "es"} con peer review público.`}
				</Text>
			</View>
		);
	}

	if (reviewCount === 0) {
		return (
			<Text style={[styles.peerReviewText, { color: theme.colors.onSurfaceVariant }]}>
				Aún no hay actividades públicas de peer review en este curso.
			</Text>
		);
	}

	if (!myGroupName) {
		return (
			<Text style={[styles.peerReviewText, { color: theme.colors.onSurfaceVariant }]}>
				Únete a un grupo para ver el promedio de tu grupo.
			</Text>
		);
	}

	return (
		<View>
			<Button
				mode="contained"
				onPress={onViewGroup}
				icon={({ color, size }) => <MaterialIcons name="groups" size={size} color={color} />}
				style={styles.peerReviewButton}
				contentStyle={{ paddingVertical: 10 }}
				uppercase={false}
				disabled={isLoading}
			>
				Promedio de mi grupo
			</Button>
			<Text style={[styles.peerReviewText, { color: theme.colors.onSurfaceVariant }]}>
				Actividades consideradas: {reviewCount}.
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	page: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 20,
	},
	body: {
		flexGrow: 1,
	},
	courseHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
	},
	courseHeaderTexts: {
		flex: 1,
		paddingRight: 12,
	},
	courseHeaderSubtitle: {
		fontSize: 13,
		fontWeight: "600",
	},
	courseHeaderTitle: {
		fontSize: 26,
		fontWeight: "700",
		marginTop: 6,
	},
	courseHeaderEdit: {
		alignSelf: "flex-start",
		marginLeft: 12,
	},
	metaRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		marginTop: 16,
	},
	metaPill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 8,
		marginTop: 8,
	},
	metaPillLabel: {
		fontSize: 12,
		fontWeight: "600",
		marginRight: 4,
	},
	metaPillValue: {
		fontSize: 12,
		fontWeight: "700",
		fontVariant: ["tabular-nums"],
	},
	inactiveBanner: {
		marginTop: 18,
		padding: 12,
		borderWidth: 1,
		borderRadius: 14,
		flexDirection: "row",
		alignItems: "flex-start",
	},
	inactiveBannerIcon: {
		marginRight: 10,
		marginTop: 4,
	},
	inactiveBannerContent: {
		flex: 1,
	},
	inactiveBannerText: {
		fontSize: 13,
		lineHeight: 19,
	},
	inactiveBannerButton: {
		marginTop: 8,
		alignSelf: "flex-start",
	},
	sectionCard: {
		borderWidth: 1,
		borderRadius: 20,
		padding: 18,
		marginTop: 24,
	},
	sectionCardHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	sectionCardIcon: {
		marginRight: 8,
	},
	sectionCardTitle: {
		fontSize: 18,
		fontWeight: "700",
		flex: 1,
	},
	sectionCardCount: {
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	sectionCardCountText: {
		fontSize: 12,
		fontWeight: "600",
	},
	sectionCardBody: {
		marginTop: 16,
	},
	dualButtonsRow: {
		flexDirection: "row",
		marginBottom: 12,
	},
	dualButton: {
		flex: 1,
	},
	dualButtonSpacing: {
		marginRight: 12,
	},
	fullWidthButton: {
		marginTop: 12,
	},
	listTile: {
		flexDirection: "row",
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
		marginTop: 12,
	},
	listTileIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	listTileContent: {
		flex: 1,
	},
	listTileTitle: {
		fontSize: 16,
		fontWeight: "600",
	},
	listTilePills: {
		marginTop: 8,
	},
	pill: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 6,
		marginBottom: 6,
	},
	pillIcon: {
		marginRight: 6,
	},
	pillText: {
		fontSize: 12.5,
		fontWeight: "500",
	},
	emptyCard: {
		borderWidth: 1,
		borderRadius: 16,
		padding: 24,
		alignItems: "center",
		marginTop: 12,
	},
	emptyCardTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginTop: 12,
	},
	emptyCardSubtitle: {
		fontSize: 13,
		textAlign: "center",
		marginTop: 8,
		lineHeight: 18,
	},
	peerReviewButton: {
		alignSelf: "stretch",
		marginBottom: 12,
	},
	peerReviewText: {
		fontSize: 13,
		lineHeight: 18,
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: "#00000012",
		marginTop: 18,
	},
	errorChip: {
		marginTop: 16,
		alignSelf: "flex-start",
	},
	errorChipText: {
		fontSize: 13,
	},
	loadingContainer: {
		paddingVertical: 60,
		alignItems: "center",
	},
	loadingLabel: {
		marginTop: 12,
		fontSize: 14,
		opacity: 0.7,
	},
	loadingMoreContainer: {
		marginTop: 28,
		alignItems: "center",
	},
	loadingMoreLabel: {
		marginTop: 8,
		fontSize: 13,
		opacity: 0.7,
	},
	missingContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 32,
	},
	missingTitle: {
		fontSize: 20,
		fontWeight: "600",
	},
	retryButton: {
		marginTop: 20,
	},
});
