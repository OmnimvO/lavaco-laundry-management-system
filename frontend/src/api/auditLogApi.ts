import type { AuditLog } from "../types/auditLog";

const API_URL =
  "http://localhost:3000/api/audit-logs";

async function parseErrorMessage(
  response: Response
) {
  try {
    const errorData =
      await response.json();

    return (
      errorData.message ||
      "Something went wrong while loading audit logs."
    );
  } catch {
    return (
      "Something went wrong while loading audit logs."
    );
  }
}

export async function getAuditLogs(): Promise<
  AuditLog[]
> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}

export async function getAuditLogById(
  id: number
): Promise<AuditLog> {
  const response = await fetch(
    `${API_URL}/${id}`
  );

  if (!response.ok) {
    const message =
      await parseErrorMessage(response);

    throw new Error(message);
  }

  return response.json();
}