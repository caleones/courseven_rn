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
import ComputeCourseSummaryUseCase from "@/src/features/peerReview/domain/usecases/ComputeCourseSummaryUseCase";
import ComputeActivitySummaryUseCase from "@/src/features/peerReview/domain/usecases/ComputeActivitySummaryUseCase";

export class AssessmentRepositoryImpl {
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
    const uc = new ComputeCourseSummaryUseCase(this as any);
    return uc.execute(activityIds);
  }

  async computeActivitySummary(activityId: string): Promise<ActivityPeerReviewSummary> {
    const uc = new ComputeActivitySummaryUseCase(this as any);
    return uc.execute(activityId);
  }

  private async _readAssessments(query: Record<string, string>): Promise<Assessment[]> {
    const token = await this.requireToken();
    try {
      const rows = await this.robleService.readTable({
        accessToken: token,
        table: "assestments",
        query,
      });
      return rows.map((row: any) => this._fromMap(row));
    } catch (error) {
      const message = String(error);
      if (message.includes("DB read assessments failed: 500")) {
        console.warn(`[ASSESSMENTS][READ] Backend devolvió 500 para query=${JSON.stringify(query)}, asumiendo lista vacía.`);
        return [];
      }
      throw error;
    }
  }

  private _fromMap(row: any): Assessment {
    // overall_score viene como número (multiplicado por 10), dividir por 10
    const overallRaw = row.overall_score;
    let overallScore: number | null = null;
    if (overallRaw != null) {
      overallScore = overallRaw / 10;
    } else {
      // Si no existe, calcularlo como promedio de los 4 scores
      const p = row.punctuality_score ?? 0;
      const c = row.contributions_score ?? 0;
      const cm = row.commitment_score ?? 0;
      const a = row.attitude_score ?? 0;
      overallScore = (p + c + cm + a) / 4.0;
    }
    
    return {
      id: row._id ?? row.id ?? "",
      activityId: row.activity_id ?? "",
      studentId: row.reviewed ?? "",
      groupId: row.group_id ?? "",
      reviewerId: row.reviewer ?? "",
      punctualityScore: row.punctuality_score ?? 0,
      contributionsScore: row.contributions_score ?? 0,
      commitmentScore: row.commitment_score ?? 0,
      attitudeScore: row.attitude_score ?? 0,
      overallScorePersisted: overallScore,
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? null,
    };
  }

  async getAssessmentsByActivity(activityId: string): Promise<Assessment[]> {
    return this._readAssessments({ activity_id: activityId });
  }

  async getAssessmentsByGroup(groupId: string): Promise<Assessment[]> {
    return this._readAssessments({ group_id: groupId });
  }

  async getAssessmentsByReviewer(activityId: string, reviewerId: string): Promise<Assessment[]> {
    return this._readAssessments({
      activity_id: activityId,
      reviewer: reviewerId,
    });
  }

  async getAssessmentsReceivedByStudent(activityId: string, studentId: string): Promise<Assessment[]> {
    return this._readAssessments({
      activity_id: activityId,
      reviewed: studentId,
    });
  }

  async existsAssessment(params: {
    activityId: string;
    reviewerId: string;
    studentId: string;
  }): Promise<boolean> {
    const assessments = await this._readAssessments({
      activity_id: params.activityId,
      reviewer: params.reviewerId,
      reviewed: params.studentId,
    });
    return assessments.length > 0;
  }

  async createAssessment(assessment: Assessment): Promise<Assessment> {
    const token = await this.requireToken();
    // Calcular overallScore como promedio de los 4 scores
    const overallScore = (assessment.punctualityScore + assessment.contributionsScore + assessment.commitmentScore + assessment.attitudeScore) / 4.0;
    const overallRounded = parseFloat(overallScore.toFixed(1));
    const overallStored = Math.round(overallRounded * 10);

    const insertPayload: Record<string, any> = {
      activity_id: assessment.activityId,
      group_id: assessment.groupId,
      reviewer: assessment.reviewerId,
      reviewed: assessment.studentId,
      punctuality_score: assessment.punctualityScore,
      contributions_score: assessment.contributionsScore,
      commitment_score: assessment.commitmentScore,
      attitude_score: assessment.attitudeScore,
      overall_score: overallStored,
    };

    console.log("[ASSESSMENTS][CREATE] Insert payload:", insertPayload);
    
    const response = await this.robleService.insertRecords({
      accessToken: token,
      table: "assestments",
      records: [insertPayload],
    });

    const list = response.inserted ?? response.data ?? [];
    const skippedRaw = response.skipped ?? [];

    if (skippedRaw.length > 0) {
      console.log("[ASSESSMENTS][CREATE] Skipped:", skippedRaw);
    }

    if (list.length === 0) {
      const details = skippedRaw.length > 0 ? JSON.stringify(skippedRaw) : JSON.stringify(response);
      throw new Error(`Insert assessment sin retorno: ${details}`);
    }

    const raw = list[0] as Record<string, any>;
    console.log("[ASSESSMENTS][CREATE] Insert result raw:", raw);

    const generatedId = raw._id as string | undefined;
    if (!generatedId || generatedId.length === 0) {
      console.warn("[ASSESSMENTS][CREATE] WARNING: _id no retornado por backend");
    }

    const hasOverall = raw.overall_score != null;
    if (!hasOverall && generatedId && generatedId.length > 0) {
      try {
        console.log(`[ASSESSMENTS][OVERALL][UPDATE] _id=${generatedId} overall_score=${overallRounded} (scaled=${overallStored})`);
        await this.robleService.updateRow({
          accessToken: token,
          table: "assestments",
          id: generatedId,
          updates: { overall_score: overallStored },
        });
      } catch (error) {
        console.error("[ASSESSMENTS][OVERALL][ERROR] Falló update overall_score:", error);
      }
    }

    const enriched: Record<string, any> = {
      ...raw,
      overall_score: raw.overall_score ?? overallStored,
      activity_id: raw.activity_id ?? assessment.activityId,
      group_id: raw.group_id ?? assessment.groupId,
      reviewer: raw.reviewer ?? assessment.reviewerId,
      reviewed: raw.reviewed ?? assessment.studentId,
      punctuality_score: raw.punctuality_score ?? assessment.punctualityScore,
      contributions_score: raw.contributions_score ?? assessment.contributionsScore,
      commitment_score: raw.commitment_score ?? assessment.commitmentScore,
      attitude_score: raw.attitude_score ?? assessment.attitudeScore,
      created_at: raw.created_at ?? assessment.createdAt,
    };

    const result = this._fromMap(enriched);
    // Asegurar que overallScorePersisted esté calculado
    if (result.overallScorePersisted === null) {
      result.overallScorePersisted = overallRounded;
    }
    return result;
  }

  async getAssessmentsForStudentAcrossActivities(activityIds: string[], studentId: string): Promise<Assessment[]> {
    if (activityIds.length === 0) return [];

    const all: Assessment[] = [];
    for (const actId of activityIds) {
      const rows = await this._readAssessments({
        activity_id: actId,
        reviewed: studentId,
      });
      all.push(...rows);
    }
    return all;
  }

  async listPendingPeerIds(params: {
    activityId: string;
    groupId: string;
    reviewerId: string;
    groupMemberIds: string[];
  }): Promise<string[]> {
    const peers = [...params.groupMemberIds];
    if (peers.length === 0) return [];
    
    const existing = await this.getAssessmentsByReviewer(params.activityId, params.reviewerId);
    const doneIds = new Set(existing.map((a) => a.studentId));
    
    return peers.filter((p) => !doneIds.has(p));
  }
}

export default AssessmentRepositoryImpl;
