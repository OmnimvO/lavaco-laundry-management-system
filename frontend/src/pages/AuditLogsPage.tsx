import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaEye,
  FaUndoAlt,
} from "react-icons/fa";

import { getAuditLogs } from "../api/auditLogApi";
import type { AuditLog } from "../types/auditLog";

import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "../constants/auditLog";

import Modal from "../components/Modal";
import Toast from "../components/Toast";

function getLabel(
  options: {
    value: string;
    label: string;
  }[],
  value: string
) {
  return (
    options.find(
      (option) =>
        option.value === value
    )?.label ?? value
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(
      value,
      null,
      2
    );
  }

  return String(value);
}

function getChangedFields(
  previousData:
    | Record<string, unknown>
    | null
    | undefined,

  newData:
    | Record<string, unknown>
    | null
    | undefined
) {
  const keys = new Set([
    ...Object.keys(
      previousData ?? {}
    ),
    ...Object.keys(
      newData ?? {}
    ),
  ]);

  return [...keys].filter(
    (key) =>
      JSON.stringify(
        previousData?.[key]
      ) !==
      JSON.stringify(
        newData?.[key]
      )
  );
}

function AuditLogsPage() {
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [actionFilter, setActionFilter] =
    useState("ALL");

  const [entityFilter, setEntityFilter] =
    useState("ALL");

  const [dateFilter, setDateFilter] =
    useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  function showToast(
    message: string,
    type: "success" | "error" =
      "success"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function loadAuditLogs() {
    try {
      setLoading(true);

      const data =
        await getAuditLogs();

      setLogs(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load audit logs:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load audit logs.",
        "error"
      );

      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        normalizedSearch === "" ||
        String(
          log.entityName ?? ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        String(
          log.description ?? ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        String(
          log.performedBy ?? ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          );

      const matchesAction =
        actionFilter === "ALL" ||
        log.action === actionFilter;

      const matchesEntity =
        entityFilter === "ALL" ||
        log.entityType ===
          entityFilter;

      const matchesDate =
        !dateFilter ||
        new Date(log.createdAt)
          .toISOString()
          .slice(0, 10) ===
          dateFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesEntity &&
        matchesDate
      );
    });
  }, [
    logs,
    searchTerm,
    actionFilter,
    entityFilter,
    dateFilter,
  ]);

  const createCount = logs.filter(
    (log) => log.action === "CREATE"
  ).length;

  const updateCount = logs.filter(
    (log) =>
      log.action === "UPDATE" ||
      log.action ===
        "STATUS_CHANGE" ||
      log.action ===
        "PAYMENT_CHANGE"
  ).length;

  const deleteCount = logs.filter(
    (log) => log.action === "DELETE"
  ).length;

  const printCount = logs.filter(
    (log) => log.action === "PRINT"
  ).length;

  if (loading) {
    return <p>Loading audit logs...</p>;
  }

  return (
    <section className="audit-logs-page">
      <div className="page-header">
        <div>
          <h2>Audit Logs</h2>

          <p>
            Review important actions performed
            in the system.
          </p>
        </div>
      </div>

      <div className="audit-summary-grid">
        <article className="audit-summary-card">
          <span>Total Logs</span>
          <strong>{logs.length}</strong>
        </article>

        <article className="audit-summary-card">
          <span>Created</span>
          <strong>{createCount}</strong>
        </article>

        <article className="audit-summary-card">
          <span>Updated</span>
          <strong>{updateCount}</strong>
        </article>

        <article className="audit-summary-card">
          <span>Deleted</span>
          <strong>{deleteCount}</strong>
        </article>

        <article className="audit-summary-card">
          <span>Printed</span>
          <strong>{printCount}</strong>
        </article>
      </div>

      <div className="audit-toolbar">
        <div className="audit-filter audit-search">
          <label htmlFor="auditSearch">
            Search Logs
          </label>

          <input
            id="auditSearch"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Entity, description, or employee"
          />
        </div>

        <div className="audit-filter">
          <label htmlFor="auditAction">
            Action
          </label>

          <select
            id="auditAction"
            value={actionFilter}
            onChange={(event) =>
              setActionFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Actions
            </option>

            {AUDIT_ACTIONS.map(
              (action) => (
                <option
                  key={action.value}
                  value={action.value}
                >
                  {action.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="auditEntity">
            Entity
          </label>

          <select
            id="auditEntity"
            value={entityFilter}
            onChange={(event) =>
              setEntityFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Entities
            </option>

            {AUDIT_ENTITY_TYPES.map(
              (entity) => (
                <option
                  key={entity.value}
                  value={entity.value}
                >
                  {entity.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="audit-filter">
          <label htmlFor="auditDate">
            Date
          </label>

          <input
            id="auditDate"
            type="date"
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value
              )
            }
          />
        </div>

        <button
          type="button"
          className="icon-button reset-filter-button"
          title="Reset Filters"
          aria-label="Reset Filters"
          onClick={() => {
            setSearchTerm("");
            setActionFilter("ALL");
            setEntityFilter("ALL");
            setDateFilter("");
          }}
        >
          <FaUndoAlt />
        </button>
      </div>

      <div className="audit-result-summary">
        Showing{" "}
        <strong>
          {filteredLogs.length}
        </strong>{" "}
        of{" "}
        <strong>{logs.length}</strong>{" "}
        logs
      </div>

      {filteredLogs.length === 0 ? (
        <p>
          {logs.length === 0
            ? "No audit logs available yet."
            : "No audit logs match the current filters."}
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Performed By</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {formatDateTime(
                      log.createdAt
                    )}
                  </td>

                  <td>
                    <span
                      className={`audit-action-badge audit-action-${log.action.toLowerCase()}`}
                    >
                      {getLabel(
                        AUDIT_ACTIONS,
                        log.action
                      )}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {getLabel(
                        AUDIT_ENTITY_TYPES,
                        log.entityType
                      )}
                    </strong>

                    <small className="table-subtext">
                      {log.entityName ||
                        (log.entityId
                          ? `ID ${log.entityId}`
                          : "No entity name")}
                    </small>
                  </td>

                  <td>
                    {log.description}
                  </td>

                  <td>
                    {log.performedBy ||
                      "System"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="icon-button view-button"
                      title="View Audit Details"
                      aria-label="View Audit Details"
                      onClick={() =>
                        setSelectedLog(log)
                      }
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLog && (
        <Modal
          title="Audit Log Details"
          onClose={() =>
            setSelectedLog(null)
          }
        >
          <div className="audit-details">
            <section className="order-details-section">
              <h3>Activity</h3>

              <div className="order-details-grid">
                <div>
                  <span>Action</span>
                  <strong>
                    {getLabel(
                      AUDIT_ACTIONS,
                      selectedLog.action
                    )}
                  </strong>
                </div>

                <div>
                  <span>Entity</span>
                  <strong>
                    {getLabel(
                      AUDIT_ENTITY_TYPES,
                      selectedLog.entityType
                    )}
                  </strong>
                </div>

                <div>
                  <span>Entity Name</span>
                  <strong>
                    {selectedLog.entityName ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Performed By</span>
                  <strong>
                    {selectedLog.performedBy ||
                      "System"}
                  </strong>
                </div>

                <div className="details-full-width">
                  <span>Date and Time</span>
                  <strong>
                    {formatDateTime(
                      selectedLog.createdAt
                    )}
                  </strong>
                </div>

                <div className="details-full-width">
                  <span>Description</span>
                  <strong>
                    {selectedLog.description}
                  </strong>
                </div>
              </div>
            </section>

            <section className="order-details-section">
              <h3>Changes</h3>

              {getChangedFields(
                selectedLog.previousData,
                selectedLog.newData
              ).length === 0 ? (
                <p>
                  No field-by-field changes were
                  recorded for this action.
                </p>
              ) : (
                <div className="audit-changes-list">
                  {getChangedFields(
                    selectedLog.previousData,
                    selectedLog.newData
                  ).map((field) => (
                    <div
                      key={field}
                      className="audit-change-row"
                    >
                      <strong>{field}</strong>

                      <div>
                        <span>Previous</span>
                        <p>
                          {formatValue(
                            selectedLog
                              .previousData?.[
                              field
                            ]
                          )}
                        </p>
                      </div>

                      <div>
                        <span>New</span>
                        <p>
                          {formatValue(
                            selectedLog.newData?.[
                              field
                            ]
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </section>
  );
}

export default AuditLogsPage;