import { Assessment } from "@/src/domain/models/Assessment";
import {
  ActivityPeerReviewSummary,
  GroupActivityReviewStats,
  StudentActivityReviewStats,
  ScoreAverages,
} from "@/src/domain/models/PeerReviewSummaries";
import { AssessmentRepository } from "../repositories/AssessmentRepository";

export class ComputeActivitySummaryUseCase {
  constructor(private repo: AssessmentRepository) {}

  async execute(activityId: string): Promise<ActivityPeerReviewSummary> {
    const assessments = await this._loadAssessments([activityId]);

    const groupStats = this._computeGroupStats(assessments);
    const activityAverages = this._computeAverages(assessments);

    return {
      activityId,
      activityAverages,
      groups: groupStats,
    };
  }

  private async _loadAssessments(activityIds: string[]): Promise<Assessment[]> {
    if (activityIds.length === 0) return [];

    const all: Assessment[] = [];
    for (const activityId of activityIds) {
      const assessments = await this.repo.getAssessmentsByActivity(activityId);
      all.push(...assessments);
    }
    return all;
  }

  private _computeGroupStats(assessments: Assessment[]): GroupActivityReviewStats[] {
    const byGroup: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      const gid = a.groupId || "";
      if (!byGroup[gid]) {
        byGroup[gid] = [];
      }
      byGroup[gid].push(a);
    }

    const result: GroupActivityReviewStats[] = [];
    for (const [groupId, list] of Object.entries(byGroup)) {
      const averages = this._computeAverages(list);
      const studentStats = this._computeStudentStatsForGroup(list);

      result.push({
        groupId,
        averages,
        students: studentStats,
      });
    }
    return result;
  }

  private _computeStudentStatsForGroup(assessments: Assessment[]): StudentActivityReviewStats[] {
    const byStudent: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      if (!byStudent[a.studentId]) {
        byStudent[a.studentId] = [];
      }
      byStudent[a.studentId].push(a);
    }

    const result: StudentActivityReviewStats[] = [];
    for (const [studentId, list] of Object.entries(byStudent)) {
      const averages = this._computeAverages(list);
      result.push({
        studentId,
        receivedCount: list.length,
        averages,
      });
    }
    return result;
  }

  private _computeAverages(assessments: Assessment[]): ScoreAverages {
    if (assessments.length === 0) {
      return {
        punctuality: 0,
        contributions: 0,
        commitment: 0,
        attitude: 0,
        overall: 0,
      };
    }

    let sumP = 0;
    let sumC = 0;
    let sumCm = 0;
    let sumA = 0;
    let sumO = 0;

    for (const a of assessments) {
      sumP += a.punctualityScore;
      sumC += a.contributionsScore;
      sumCm += a.commitmentScore;
      sumA += a.attitudeScore;
      const overallScore = (a.punctualityScore + a.contributionsScore + a.commitmentScore + a.attitudeScore) / 4.0;
      sumO += overallScore;
    }

    const n = assessments.length;
    const round = (val: number) => parseFloat((val / n).toFixed(2));

    return {
      punctuality: round(sumP),
      contributions: round(sumC),
      commitment: round(sumCm),
      attitude: round(sumA),
      overall: round(sumO),
    };
  }
}

export default ComputeActivitySummaryUseCase;
