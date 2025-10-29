export type MembershipJoinedEvent = {
  type: "MembershipJoinedEvent";
  groupId: string;
  courseId: string;
};

export type EnrollmentJoinedEvent = {
  type: "EnrollmentJoinedEvent";
  courseId: string;
};

export type ActivityChangedEvent = {
  type: "ActivityChangedEvent";
  courseId: string;
};

export type AppEvent = MembershipJoinedEvent | EnrollmentJoinedEvent | ActivityChangedEvent;

type Listener = (event: AppEvent) => void;

export class AppEventBus {
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: AppEvent) {
    for (const listener of Array.from(this.listeners)) {
      listener(event);
    }
  }

  dispose() {
    this.listeners.clear();
  }
}
