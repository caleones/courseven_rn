import { Assessment } from "../models/Assessment";
import {
    ActivityPeerReviewSummary,
    CoursePeerReviewSummary,
} from "../models/PeerReviewSummaries";

export interface AssessmentRepository {
  getAssessmentsByActivity(activityId: string): Promise<Assessment[]>;
  getAssessmentsByGroup(groupId: string): Promise<Assessment[]>;
  getAssessmentsByReviewer(activityId: string, reviewerId: string): Promise<Assessment[]>;
  getAssessmentsReceivedByStudent(activityId: string, studentId: string): Promise<Assessment[]>;
  createAssessment(assessment: Assessment): Promise<Assessment>;
  existsAssessment(params: {
    activityId: string;
    reviewerId: string;
    studentId: string;
  }): Promise<boolean>;
  getAssessmentsForStudentAcrossActivities(activityIds: string[], studentId: string): Promise<Assessment[]>;
  listPendingPeerIds(params: {
    activityId: string;
    groupId: string;
    reviewerId: string;
    groupMemberIds: string[];
  }): Promise<string[]>;
  computeActivitySummary(activityId: string): Promise<ActivityPeerReviewSummary>;
  computeCourseSummary(activityIds: string[]): Promise<CoursePeerReviewSummary>;
}
