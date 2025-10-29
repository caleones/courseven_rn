import { RobleService } from "@/src/data/services/RobleService";
import { Assessment } from "@/src/domain/models/Assessment";
import {
    ActivityPeerReviewSummary,
    CoursePeerReviewSummary,
    GroupActivityReviewStats,
    GroupCrossActivityStats,
    ScoreAverages,
    StudentActivityReviewStats,
    StudentCrossActivityStats,
} from "@/src/domain/models/PeerReviewSummaries";

export class AssessmentRepository {
  private robleService: RobleService;
  private getAccessToken?: () => Promise<string | null>;

  constructor(robleService: RobleService, deps: { getAccessToken?: () => Promise<string | null> } = {}) {
    this.robleService = robleService;
    this.getAccessToken = deps.getAccessToken;
  }

  private async requireToken(): Promise<string> {
    const token = this.getAccessToken ? await this.getAccessToken() : null;
    if (!token) {
      throw new Error("Token de acceso requerido");
    }
    return token;
  }

  async computeCourseSummary(activityIds: string[]): Promise<CoursePeerReviewSummary> {
    if (activityIds.length === 0) {
      return {
        students: [],
        groups: [],
      };
    }

    // Load all assessments for the specified activities
    const allAssessments = await this._loadAssessments(activityIds);

    // Aggregate across all activities to get student cross-activity stats
    const studentStats = this._computeStudentCrossActivityStats(allAssessments);

    // Aggregate by group
    const groupStats = this._computeGroupCrossActivityStats(allAssessments);

    return {
      students: studentStats,
      groups: groupStats,
    };
  }

  async computeActivitySummary(activityId: string): Promise<ActivityPeerReviewSummary> {
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
    const token = await this.requireToken();
    
    const rows = await this.robleService.readTable({
      accessToken: token,
      table: "assestments",
      query: {},
    });

    // Filter by activityIds
    const filtered = rows.filter((row: any) => {
      return activityIds.includes(row.activity_id);
    });

    return filtered.map((row: any) => ({
      id: row._id ?? row.id,
      activityId: row.activity_id,
      studentId: row.reviewed,
      groupId: row.group_id ?? "",
      reviewerId: row.reviewer,
      punctualityScore: row.punctuality_score ?? 0,
      contributionsScore: row.contributions_score ?? 0,
      commitmentScore: row.commitment_score ?? 0,
      attitudeScore: row.attitude_score ?? 0,
      overallScorePersisted: row.overall_score ?? null,
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? null,
    }));
  }

  private _computeGroupStats(assessments: Assessment[]): GroupActivityReviewStats[] {
    // Group by groupId
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
    // Group by studentId
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

  private _computeStudentCrossActivityStats(
    assessments: Assessment[],
  ): StudentCrossActivityStats[] {
    // Group by studentId across all activities
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
    // Group by groupId across all activities
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
      // Calcular overallScore como en Flutter: promedio de los 4 scores
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
