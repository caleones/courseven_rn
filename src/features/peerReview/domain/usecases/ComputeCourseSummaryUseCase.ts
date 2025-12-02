import { Assessment } from "@/src/domain/models/Assessment";
import {
  CoursePeerReviewSummary,
  GroupCrossActivityStats,
  StudentCrossActivityStats,
  ScoreAverages,
} from "@/src/domain/models/PeerReviewSummaries";
import { AssessmentRepository } from "../repositories/AssessmentRepository";

export class ComputeCourseSummaryUseCase {
  constructor(private repo: AssessmentRepository) {}

  async execute(activityIds: string[]): Promise<CoursePeerReviewSummary> {
    if (activityIds.length === 0) {
      return {
        students: [],
        groups: [],
      };
    }

    const allAssessments = await this._loadAssessments(activityIds);

    const studentStats = this._computeStudentCrossActivityStats(allAssessments);
    const groupStats = this._computeGroupCrossActivityStats(allAssessments);

    return {
      students: studentStats,
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

  private _computeStudentCrossActivityStats(
    assessments: Assessment[],
  ): StudentCrossActivityStats[] {
    const byStudent: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      if (!byStudent[a.studentId]) {
        byStudent[a.studentId] = [];
      }
      byStudent[a.studentId].push(a);
    }

    const result: StudentCrossActivityStats[] = [];
    for (const [studentId, list] of Object.entries(byStudent)) {
      const averages = this._computeAverages(list);
      result.push({
        studentId,
        assessmentsReceived: list.length,
        averages,
      });
    }
    return result;
  }

  private _computeGroupCrossActivityStats(
    assessments: Assessment[],
  ): GroupCrossActivityStats[] {
    const byGroup: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      const gid = a.groupId || "";
      if (!byGroup[gid]) {
        byGroup[gid] = [];
      }
      byGroup[gid].push(a);
    }

    const result: GroupCrossActivityStats[] = [];
    for (const [groupId, list] of Object.entries(byGroup)) {
      const averages = this._computeAverages(list);
      result.push({
        groupId,
        averages,
        assessmentsCount: list.length,
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

export default ComputeCourseSummaryUseCase;
