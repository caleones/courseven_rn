export interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}
