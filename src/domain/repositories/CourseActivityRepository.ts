import { CourseActivity } from "../models/CourseActivity";

export interface CourseActivityRepository {
  getActivityById(activityId: string): Promise<CourseActivity | null>;
  getActivitiesByCourse(courseId: string): Promise<CourseActivity[]>;
  getActivitiesByCategory(categoryId: string): Promise<CourseActivity[]>;
  createActivity(activity: CourseActivity): Promise<CourseActivity>;
  updateActivity(activity: CourseActivity): Promise<CourseActivity>;
  deleteActivity(activityId: string): Promise<boolean>;
}
