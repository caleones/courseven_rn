import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo } from "react";

import { useDI } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { AppEvent, AppEventBus } from "@/src/core/events/AppEventBus";
import { RefreshManager } from "@/src/core/utils/RefreshManager";
import { CourseController } from "@/src/features/course/controllers/CourseController";
import { EnrollmentController } from "@/src/features/enrollment/controllers/EnrollmentController";

const TTL_MS = 45_000;
const POLLING_INTERVAL_MS = 60_000;

export function useHomeRevalidation(
  courseController: CourseController,
  enrollmentController: EnrollmentController,
) {
  const di = useDI();

  const refreshManager = useMemo(
    () => di.resolve<RefreshManager>(TOKENS.RefreshManager),
    [di],
  );

  const eventBus = useMemo(
    () => di.resolve<AppEventBus>(TOKENS.AppEventBus),
    [di],
  );

  const revalidate = useCallback(
    async (force = false) => {
      await Promise.all([
        refreshManager.run({
          key: "home:teaching",
          ttl: TTL_MS,
          action: () => courseController.loadMyTeachingCourses({ force }),
          force,
        }),
        refreshManager.run({
          key: "home:learning",
          ttl: TTL_MS,
          action: () => enrollmentController.loadMyEnrollments({ force }),
          force,
        }),
      ]);
    },
    [refreshManager, courseController, enrollmentController],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (cancelled) return;
        await revalidate(false);
      })();

      const interval = setInterval(() => {
        void revalidate(false);
      }, POLLING_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [revalidate]),
  );

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event: AppEvent) => {
      if (event.type === "EnrollmentJoinedEvent") {
        void revalidate(true);
      }
    });
    return unsubscribe;
  }, [eventBus, revalidate]);

  return { revalidate };
}
