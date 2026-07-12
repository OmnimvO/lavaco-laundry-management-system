export type AuditLog = {
  id: number;

  action: string;
  entityType: string;

  entityId?: number | null;
  entityName?: string | null;

  description: string;
  performedBy?: string | null;

  previousData?: Record<
    string,
    unknown
  > | null;

  newData?: Record<
    string,
    unknown
  > | null;

  createdAt: string;
};