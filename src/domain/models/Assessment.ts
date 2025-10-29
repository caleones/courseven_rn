export interface Assessment {
  id: string;
  activityId: string;
  groupId: string;
  reviewerId: string;
  studentId: string;
  punctualityScore: number;
  contributionsScore: number;
  commitmentScore: number;
  attitudeScore: number;
  overallScorePersisted: number | null;
  createdAt: string;
  updatedAt: string | null;
}
