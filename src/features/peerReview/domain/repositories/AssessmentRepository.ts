import { Assessment } from "@/src/domain/models/Assessment";
import {
  ActivityPeerReviewSummary,
  CoursePeerReviewSummary,
} from "@/src/domain/models/PeerReviewSummaries";

export interface AssessmentRepository {
  getAssessmentsByActivity(activityId: string): Promise<Assessment[]>;
  getAssessmentsByGroup(groupId: string): Promise<Assessment[]>;
  getAssessmentsByReviewer(activityId: string, reviewerId: string): Promise<Assessment[]>;
  getAssessmentsReceivedByStudent(activityId: string, studentId: string): Promise<Assessment[]>;
  existsAssessment(params: { activityId: string; reviewerId: string; studentId: string }): Promise<boolean>;
  createAssessment(assessment: Assessment): Promise<Assessment>;
  getAssessmentsForStudentAcrossActivities(activityIds: string[], studentId: string): Promise<Assessment[]>;
  listPendingPeerIds(params: {
    activityId: string;
    groupId: string;
    reviewerId: string;
    groupMemberIds: string[];
  }): Promise<string[]>;

  // NOTE: These two methods used to live in the data layer; domain usecases provide the
  // business computations. They remain on the repo contract for backward compatibility,
  // but usecases will implement the heavy logic.
  computeCourseSummary?(activityIds: string[]): Promise<CoursePeerReviewSummary>;
  computeActivitySummary?(activityId: string): Promise<ActivityPeerReviewSummary>;
}

export type { ActivityPeerReviewSummary, CoursePeerReviewSummary };
