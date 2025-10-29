import { createContext, useContext, useMemo } from "react";

import { Container } from "./container";
import { TOKENS } from "./tokens";

import { AppEventBus } from "@/src/core/events/AppEventBus";
import { RefreshManager } from "@/src/core/utils/RefreshManager";
import { CategoryRepositoryImpl } from "@/src/data/repositories/CategoryRepositoryImpl";
import { CourseActivityRepositoryImpl } from "@/src/data/repositories/CourseActivityRepositoryImpl";
import { CourseRepositoryImpl } from "@/src/data/repositories/CourseRepositoryImpl";
import { EnrollmentRepositoryImpl } from "@/src/data/repositories/EnrollmentRepositoryImpl";
import { GroupRepositoryImpl } from "@/src/data/repositories/GroupRepositoryImpl";
import { MembershipRepositoryImpl } from "@/src/data/repositories/MembershipRepositoryImpl";
import { UserRepositoryImpl } from "@/src/data/repositories/UserRepositoryImpl";
import { RobleService } from "@/src/data/services/RobleService";
import { GetCourseActivitiesForStudentUseCase } from "@/src/domain/usecases/activity/GetCourseActivitiesForStudentUseCase";
import { CreateCategoryUseCase } from "@/src/domain/usecases/category/CreateCategoryUseCase";
import { CreateCourseUseCase } from "@/src/domain/usecases/course/CreateCourseUseCase";
import { EnrollToCourseUseCase } from "@/src/domain/usecases/enrollment/EnrollToCourseUseCase";
import { GetMyEnrollmentsUseCase } from "@/src/domain/usecases/enrollment/GetMyEnrollmentsUseCase";
import { CreateGroupUseCase } from "@/src/domain/usecases/group/CreateGroupUseCase";
import { JoinGroupUseCase } from "@/src/domain/usecases/membership/JoinGroupUseCase";
import { ActivityController } from "@/src/features/activity/controllers/ActivityController";
import { AuthLocalDataSourceImpl } from "@/src/features/auth/data/datasources/AuthLocalDataSource";
import { AuthRemoteDataSourceImpl } from "@/src/features/auth/data/datasources/AuthRemoteDataSourceImp";
import { AuthRepositoryImpl } from "@/src/features/auth/data/repositories/AuthRepositoryImpl";
import { CheckEmailAvailabilityUseCase } from "@/src/features/auth/domain/usecases/CheckEmailAvailabilityUseCase";
import { CheckUsernameAvailabilityUseCase } from "@/src/features/auth/domain/usecases/CheckUsernameAvailabilityUseCase";
import { ExtractResetTokenUseCase } from "@/src/features/auth/domain/usecases/ExtractResetTokenUseCase";
import { GetCurrentUserUseCase } from "@/src/features/auth/domain/usecases/GetCurrentUserUseCase";
import { LoginUseCase } from "@/src/features/auth/domain/usecases/LoginUseCase";
import { LogoutUseCase } from "@/src/features/auth/domain/usecases/LogoutUseCase";
import { RequestPasswordResetUseCase } from "@/src/features/auth/domain/usecases/RequestPasswordResetUseCase";
import { ResetPasswordUseCase } from "@/src/features/auth/domain/usecases/ResetPasswordUseCase";
import { SignupUseCase } from "@/src/features/auth/domain/usecases/SignupUseCase";
import { ValidateResetTokenUseCase } from "@/src/features/auth/domain/usecases/ValidateResetTokenUseCase";
import { VerifyEmailUseCase } from "@/src/features/auth/domain/usecases/VerifyEmailUseCase";
import { CategoryController } from "@/src/features/category/controllers/CategoryController";
import { CourseController } from "@/src/features/course/controllers/CourseController";
import { EnrollmentController } from "@/src/features/enrollment/controllers/EnrollmentController";
import { GroupController } from "@/src/features/group/controllers/GroupController";
import { MembershipController } from "@/src/features/membership/controllers/MembershipController";
import { ProductRemoteDataSourceImp } from "@/src/features/products/data/datasources/ProductRemoteDataSourceImp";
import { ProductRepositoryImpl } from "@/src/features/products/data/repositories/ProductRepositoryImpl";
import { AddProductUseCase } from "@/src/features/products/domain/usecases/AddProductUseCase";
import { DeleteProductUseCase } from "@/src/features/products/domain/usecases/DeleteProductUseCase";
import { GetProductByIdUseCase } from "@/src/features/products/domain/usecases/GetProductByIdUseCase";
import { GetProductsUseCase } from "@/src/features/products/domain/usecases/GetProductsUseCase";
import { UpdateProductUseCase } from "@/src/features/products/domain/usecases/UpdateProductUseCase";

const DIContext = createContext<Container | null>(null);

export function DIProvider({ children }: { children: React.ReactNode }) {
    const container = useMemo(() => {
        const c = new Container();

        const authRemoteDS = new AuthRemoteDataSourceImpl();
        const authLocalDS = new AuthLocalDataSourceImpl();
        const authRepo = new AuthRepositoryImpl(authRemoteDS, authLocalDS);

        const robleService = new RobleService();
        const refreshManager = new RefreshManager();
        const appEventBus = new AppEventBus();

        const getAccessToken = async () => {
            const stored = await authLocalDS.getSession();
            return stored?.session.tokens.accessToken ?? null;
        };

        const getCurrentUserId = async () => {
            const stored = await authLocalDS.getSession();
            return stored?.session.user.id ?? null;
        };

        const courseRepository = new CourseRepositoryImpl(robleService, { getAccessToken });
        const enrollmentRepository = new EnrollmentRepositoryImpl(robleService, { getAccessToken });
        const userRepository = new UserRepositoryImpl(robleService, { getAccessToken });
        const categoryRepository = new CategoryRepositoryImpl(robleService, { getAccessToken });
        const groupRepository = new GroupRepositoryImpl(robleService, { getAccessToken });
        const membershipRepository = new MembershipRepositoryImpl(robleService, { getAccessToken });
        const activityRepository = new CourseActivityRepositoryImpl(robleService, { getAccessToken });

        const createCourseUseCase = new CreateCourseUseCase(courseRepository);
        const createCategoryUseCase = new CreateCategoryUseCase(categoryRepository);
        const createGroupUseCase = new CreateGroupUseCase(groupRepository);
        const getMyEnrollmentsUseCase = new GetMyEnrollmentsUseCase(enrollmentRepository);
        const enrollToCourseUseCase = new EnrollToCourseUseCase(enrollmentRepository, courseRepository);
        const joinGroupUseCase = new JoinGroupUseCase(membershipRepository, groupRepository, categoryRepository);
        const getCourseActivitiesForStudentUseCase = new GetCourseActivitiesForStudentUseCase(
            activityRepository,
            membershipRepository,
            groupRepository,
        );

        const enrollmentController = new EnrollmentController({
            enrollToCourseUseCase,
            getMyEnrollmentsUseCase,
            enrollmentRepository,
            courseRepository,
            userRepository,
            appEventBus,
            getCurrentUserId,
        });

        const courseController = new CourseController({
            createCourseUseCase,
            courseRepository,
            getCurrentUserId,
            enrollmentController,
        });

        const categoryController = new CategoryController({
            categoryRepository,
            createCategoryUseCase,
            getCurrentUserId,
        });

        const groupController = new GroupController({
            groupRepository,
            createGroupUseCase,
            getCurrentUserId,
        });

        const membershipController = new MembershipController({
            joinGroupUseCase,
            membershipRepository,
            groupRepository,
            appEventBus,
            getCurrentUserId,
        });

        const activityController = new ActivityController({
            activityRepository,
            getCourseActivitiesForStudentUseCase,
            appEventBus,
            refreshManager,
            getCurrentUserId,
        });

        c.register(TOKENS.AuthRemoteDS, authRemoteDS)
            .register(TOKENS.AuthLocalDS, authLocalDS)
            .register(TOKENS.AuthRepo, authRepo)
            .register(TOKENS.LoginUC, new LoginUseCase(authRepo))
            .register(TOKENS.SignupUC, new SignupUseCase(authRepo))
            .register(TOKENS.VerifyEmailUC, new VerifyEmailUseCase(authRepo))
            .register(TOKENS.LogoutUC, new LogoutUseCase(authRepo))
            .register(TOKENS.GetCurrentUserUC, new GetCurrentUserUseCase(authRepo))
            .register(TOKENS.RequestPasswordResetUC, new RequestPasswordResetUseCase(authRepo))
            .register(TOKENS.ResetPasswordUC, new ResetPasswordUseCase(authRepo))
            .register(TOKENS.ValidateResetTokenUC, new ValidateResetTokenUseCase(authRepo))
            .register(TOKENS.CheckEmailAvailabilityUC, new CheckEmailAvailabilityUseCase(authRepo))
            .register(TOKENS.CheckUsernameAvailabilityUC, new CheckUsernameAvailabilityUseCase(authRepo))
            .register(TOKENS.ExtractResetTokenUC, new ExtractResetTokenUseCase(authRepo))
            .register(TOKENS.RobleService, robleService)
            .register(TOKENS.RefreshManager, refreshManager)
            .register(TOKENS.AppEventBus, appEventBus)
            .register(TOKENS.CourseRepository, courseRepository)
            .register(TOKENS.CategoryRepository, categoryRepository)
            .register(TOKENS.GroupRepository, groupRepository)
            .register(TOKENS.EnrollmentRepository, enrollmentRepository)
            .register(TOKENS.UserRepository, userRepository)
            .register(TOKENS.MembershipRepository, membershipRepository)
            .register(TOKENS.CourseActivityRepository, activityRepository)
            .register(TOKENS.CreateCourseUC, createCourseUseCase)
            .register(TOKENS.CreateCategoryUC, createCategoryUseCase)
            .register(TOKENS.CreateGroupUC, createGroupUseCase)
            .register(TOKENS.GetMyEnrollmentsUC, getMyEnrollmentsUseCase)
            .register(TOKENS.EnrollToCourseUC, enrollToCourseUseCase)
            .register(TOKENS.JoinGroupUC, joinGroupUseCase)
            .register(TOKENS.GetCourseActivitiesForStudentUC, getCourseActivitiesForStudentUseCase)
            .register(TOKENS.EnrollmentController, enrollmentController)
            .register(TOKENS.CourseController, courseController)
            .register(TOKENS.CategoryController, categoryController)
            .register(TOKENS.GroupController, groupController)
            .register(TOKENS.MembershipController, membershipController)
            .register(TOKENS.ActivityController, activityController);

        const productRemoteDS = new ProductRemoteDataSourceImp(authRemoteDS);
        const productRepo = new ProductRepositoryImpl(productRemoteDS);

        c.register(TOKENS.ProductRemoteDS, productRemoteDS)
            .register(TOKENS.ProductRepo, productRepo)
            .register(TOKENS.AddProductUC, new AddProductUseCase(productRepo))
            .register(TOKENS.UpdateProductUC, new UpdateProductUseCase(productRepo))
            .register(TOKENS.DeleteProductUC, new DeleteProductUseCase(productRepo))
            .register(TOKENS.GetProductsUC, new GetProductsUseCase(productRepo))
            .register(TOKENS.GetProductByIdUC, new GetProductByIdUseCase(productRepo));

        return c;
    }, []);

    return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
}

export function useDI() {
    const c = useContext(DIContext);
    if (!c) throw new Error("DIProvider missing");
    return c;
}
