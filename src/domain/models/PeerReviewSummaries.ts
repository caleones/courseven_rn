export interface ScoreAverages {
  punctuality: number;
  contributions: number;
  commitment: number;
  attitude: number;
  overall: number;
}

export interface StudentActivityReviewStats {
  studentId: string;
  receivedCount: number;
  averages: ScoreAverages;
}

export interface GroupActivityReviewStats {
  groupId: string;
  averages: ScoreAverages;
  students: StudentActivityReviewStats[];
}

export interface ActivityPeerReviewSummary {
  activityId: string;
  activityAverages: ScoreAverages;
  groups: GroupActivityReviewStats[];
}

export interface StudentCrossActivityStats {
  studentId: string;
  assessmentsReceived: number;
  averages: ScoreAverages;
}

export interface GroupCrossActivityStats {
  groupId: string;
  assessmentsCount: number;
  averages: ScoreAverages;
}

export interface CoursePeerReviewSummary {
  students: StudentCrossActivityStats[];
  groups: GroupCrossActivityStats[];
}
