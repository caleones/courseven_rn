import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import AccountScreen from "./features/account/presentation/screens/AccountScreen";
import { CreateActivityScreen } from "./features/activity/presentation/screens/CreateActivityScreen";
import { EditActivityScreen } from "./features/activity/presentation/screens/EditActivityScreen";
import { useAuth } from "./features/auth/presentation/context/authContext";
import EmailVerificationScreen from "./features/auth/presentation/screens/EmailVerificationScreen";
import ForgotPasswordScreen from "./features/auth/presentation/screens/ForgotPasswordScreen";
import LoginScreen from "./features/auth/presentation/screens/LoginScreen";
import PasswordResetSuccessScreen from "./features/auth/presentation/screens/PasswordResetSuccessScreen";
import ResetPasswordScreen from "./features/auth/presentation/screens/ResetPasswordScreen";
import SignupScreen from "./features/auth/presentation/screens/SignupScreen";
import CalendarScreen from "./features/calendar/presentation/screens/CalendarScreen";
import CreateCategoryScreen from "./features/category/presentation/screens/CreateCategoryScreen";
import { EditCategoryScreen } from "./features/category/presentation/screens/EditCategoryScreen";
import AllCoursesScreen from "./features/course/presentation/screens/AllCoursesScreen";
import CourseActivitiesScreen from "./features/course/presentation/screens/CourseActivitiesScreen";
import CourseCategoriesScreen from "./features/course/presentation/screens/CourseCategoriesScreen";
import CourseDetailScreen from "./features/course/presentation/screens/CourseDetailScreen";
import CourseGroupsScreen from "./features/course/presentation/screens/CourseGroupsScreen";
import CourseStudentsScreen from "./features/course/presentation/screens/CourseStudentsScreen";
import CreateCourseScreen from "./features/course/presentation/screens/CreateCourseScreen";
import CreateOptionsScreen from "./features/create/presentation/screens/CreateOptionsScreen";
import JoinCourseScreen from "./features/enrollment/presentation/screens/JoinCourseScreen";
import CreateGroupScreen from "./features/group/presentation/screens/CreateGroupScreen";
import JoinGroupScreen from "./features/group/presentation/screens/JoinGroupScreen";
import HomeScreen from "./features/home/presentation/screens/HomeScreen";
import NotificationsScreen from "./features/notifications/presentation/screens/NotificationsScreen";
import CoursePeerReviewSummaryScreen from "./features/peerReview/presentation/screens/CoursePeerReviewSummaryScreen";
import AddProductScreen from "./features/products/presentation/screens/AddProductScreen";
import UpdateProductScreen from "./features/products/presentation/screens/UpdateProductScreen";
import SettingScreen from "./features/settings/SettingScreen";
import { AvailableCoursesScreen } from "./features/student/presentation/screens/AvailableCoursesScreen";
import { StudentDashboardScreen } from "./features/student/presentation/screens/StudentDashboardScreen";


const Stack = createStackNavigator();

export default function AuthFlow() {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  const initialRouteName = status === "authenticated" ? "Home" : "Login";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      {status === "authenticated" ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Calendar" component={CalendarScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="Settings" component={SettingScreen} />
          <Stack.Screen
            name="CreateOptions"
            component={CreateOptionsScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="CreateCategory"
            component={CreateCategoryScreen}
            options={{
              title: "Nueva categoría",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="CreateCourse"
            component={CreateCourseScreen}
            options={{
              title: "Nuevo curso",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{
              title: "Nuevo grupo",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="AllCourses"
            component={AllCoursesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CourseDetail"
            component={CourseDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CourseActivities"
            component={CourseActivitiesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CourseCategories"
            component={CourseCategoriesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CourseGroups"
            component={CourseGroupsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CourseStudents"
            component={CourseStudentsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="JoinCourse"
            component={JoinCourseScreen}
            options={{
              title: "Unirme a un curso",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="JoinGroup"
            component={JoinGroupScreen}
            options={{
              title: "Unirme a un grupo",
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="AddProductScreen"
            component={AddProductScreen}
            options={{
              title: "Add Product",
              headerShown: true,
              presentation: 'modal' // Optional: makes it slide up from bottom
            }}
          />
          <Stack.Screen
            name="UpdateProductScreen"
            component={UpdateProductScreen}
            options={{
              title: "Update Product",
              headerShown: true,
              presentation: 'modal' // Optional: makes it slide up from bottom
            }}
          />
          <Stack.Screen
            name="CreateActivity"
            component={CreateActivityScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="EditActivity"
            component={EditActivityScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="StudentDashboard"
            component={StudentDashboardScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AvailableCourses"
            component={AvailableCoursesScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="EditCategory"
            component={EditCategoryScreen}
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="PeerReviewCourseSummary"
            component={CoursePeerReviewSummaryScreen}
            options={{
              headerShown: false,
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="PasswordResetSuccess" component={PasswordResetSuccessScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}