import ComputeActivitySummaryUseCase from "../ComputeActivitySummaryUseCase";

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

describe("ComputeActivitySummaryUseCase", () => {
  it("computes student and group aggregates for a single activity", async () => {
    const mockAssessments: Assessment[] = [
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
      {
        id: "3",
        activityId: "a1",
        studentId: "s3",
        groupId: null,
        reviewerId: "r3",
        punctualityScore: 5,
        contributionsScore: 5,
        commitmentScore: 5,
        attitudeScore: 5,
        overallScorePersisted: null,
      },
    ];

    const mockRepo = {
      getAssessmentsByActivity: async (activityId: string) => {
        if (activityId === "a1") return mockAssessments;
        return [];
      },
    } as any;

    const uc = new ComputeActivitySummaryUseCase(mockRepo);
    const result = await uc.execute("a1");

    // Flatten students from groups
    const flattenedStudents = result.groups.flatMap((g) => g.students.map((s) => s.studentId));
    const uniqueStudentIds = Array.from(new Set(flattenedStudents)).sort();
    expect(uniqueStudentIds).toEqual(["s1", "s2", "s3"]);

    // Group g1 should exist and include s1 and s2
    const groups = result.groups;
    const g1 = groups.find((g) => g.groupId === "g1");
    expect(g1).toBeDefined();
    const g1StudentIds = g1!.students.map((s) => s.studentId).sort();
    expect(g1StudentIds).toEqual(["s1", "s2"]);

    // Check that an entry for s1 in g1 has receivedCount and averages
    const s1 = g1!.students.find((s) => s.studentId === "s1")!;
    expect(s1.receivedCount).toBeGreaterThanOrEqual(1);
    expect(s1.averages.overall).toBeGreaterThan(0);
  });
});
