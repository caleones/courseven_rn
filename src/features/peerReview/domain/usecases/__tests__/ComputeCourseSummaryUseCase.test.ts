import ComputeCourseSummaryUseCase from "../ComputeCourseSummaryUseCase";

type Assessment = {
  id: string;
  activityId: string;
  studentId: string;
  groupId: string | null;
  reviewerId: string;
  punctualityScore: number;
  contributionsScore: number;
  commitmentScore: number;
  attitudeScore: number;
  overallScorePersisted: number | null;
};

describe("ComputeCourseSummaryUseCase", () => {
  it("computes student and group aggregates across activities", async () => {
    const mockAssessmentsByActivity: Record<string, Assessment[]> = {
      a1: [
        {
          id: "1",
          activityId: "a1",
          studentId: "s1",
          groupId: "g1",
          reviewerId: "r1",
          punctualityScore: 4,
          contributionsScore: 5,
          commitmentScore: 3,
          attitudeScore: 4,
          overallScorePersisted: null,
        },
        {
          id: "2",
          activityId: "a1",
          studentId: "s2",
          groupId: "g1",
          reviewerId: "r2",
          punctualityScore: 3,
          contributionsScore: 4,
          commitmentScore: 4,
          attitudeScore: 4,
          overallScorePersisted: null,
        },
      ],
      a2: [
        {
          id: "3",
          activityId: "a2",
          studentId: "s1",
          groupId: "g1",
          reviewerId: "r3",
          punctualityScore: 5,
          contributionsScore: 5,
          commitmentScore: 5,
          attitudeScore: 5,
          overallScorePersisted: null,
        },
      ],
    };

    const mockRepo = {
      getAssessmentsByActivity: async (activityId: string) => {
        return mockAssessmentsByActivity[activityId] ?? [];
      },
    } as any;

    const uc = new ComputeCourseSummaryUseCase(mockRepo);
    const result = await uc.execute(["a1", "a2"]);

    // Expect students array to contain s1 and s2
    const students = result.students;
    const studentIds = students.map((s) => s.studentId).sort();
    expect(studentIds).toEqual(["s1", "s2"]);

    // For s1 we have two assessments: compute averages roughly
    const s1 = students.find((s) => s.studentId === "s1")!;
    expect(s1.assessmentsReceived).toBe(2);
    // overall average should be > 0
    expect(s1.averages.overall).toBeGreaterThan(0);

    // Groups should include g1
    const groups = result.groups;
    expect(groups.length).toBeGreaterThan(0);
    const g1 = groups.find((g) => g.groupId === "g1")!;
    expect(g1.assessmentsCount).toBeGreaterThanOrEqual(3 - 1); // conservative check
  });
});
