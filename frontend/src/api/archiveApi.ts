import type {
  ArchiveEntityType,
  ArchivedRecordsResponse,
  ArchiveSummary,
  RestoreArchiveResponse,
} from "../types/archive";

const API_URL =
  "http://localhost:3000/api/archives";

function getAuthHeaders(
  token: string | undefined
): HeadersInit {
  if (
    typeof token !== "string" ||
    !token.trim()
  ) {
    throw new Error(
      "Your session is unavailable. Please log in again."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

async function parseResponse<T>(
  response: Response
): Promise<T> {
  let data: unknown;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message ===
        "string"
        ? data.message
        : "Archive request failed.";

    throw new Error(message);
  }

  return data as T;
}

export async function getArchiveSummary(
  token: string
): Promise<ArchiveSummary> {
  const response =
    await fetch(
      `${API_URL}/summary`,
      {
        headers:
          getAuthHeaders(token),
      }
    );

  return parseResponse<
    ArchiveSummary
  >(response);
}

export async function getArchivedRecords(
  entityType:
    ArchiveEntityType,
  token: string
): Promise<ArchivedRecordsResponse> {
  const response =
    await fetch(
      `${API_URL}/${entityType}`,
      {
        headers:
          getAuthHeaders(token),
      }
    );

  return parseResponse<
    ArchivedRecordsResponse
  >(response);
}

export async function restoreArchivedRecord(
  entityType:
    ArchiveEntityType,
  id: number,
  token: string
): Promise<RestoreArchiveResponse> {
  const response =
    await fetch(
      `${API_URL}/${entityType}/${id}/restore`,
      {
        method: "POST",

        headers:
          getAuthHeaders(token),
      }
    );

  return parseResponse<
    RestoreArchiveResponse
  >(response);
}