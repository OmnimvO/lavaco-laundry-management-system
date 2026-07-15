import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowDown,
  FaClock,
  FaEdit,
  FaEye,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlusCircle,
  FaPrint,
  FaSearch,
  FaSyncAlt,
  FaTrash,
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

import {
  useAuth,
} from "../hooks/useAuth";

type AuditSortOption =
  | "NEWEST"
  | "OLDEST"
  | "ACTION_AZ"
  | "ENTITY_AZ";

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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString(
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

function formatRelativeTime(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const difference =
    Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(
      difference / minute
    );

    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  if (difference < day) {
    const hours = Math.floor(
      difference / hour
    );

    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    difference / day
  );

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  return formatDateTime(value);
}

function formatFieldName(
  value: string
) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
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

function getInitials(
  value?: string | null
) {
  const words = String(
    value || "System"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "S";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
}

function AuditLogsPage() {
  const {
    token,
  } = useAuth();
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

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

  const [sortOption, setSortOption] =
    useState<AuditSortOption>("NEWEST");

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

  const loadAuditLogs = useCallback(
    async (
      manualRefresh = false
    ) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (
          typeof token !== "string" ||
          !token.trim()
        ) {
          throw new Error(
            "Your session is unavailable. Please log in again."
          );
        }

        const data =
          await getAuditLogs(
            token
          );

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

        if (!manualRefresh) {
          setLogs([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadAuditLogs(false);
  }, [loadAuditLogs]);

  const displayedLogs = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    const filtered = logs.filter(
      (log) => {
        const actionLabel =
          getLabel(
            AUDIT_ACTIONS,
            log.action
          ).toLowerCase();

        const entityLabel =
          getLabel(
            AUDIT_ENTITY_TYPES,
            log.entityType
          ).toLowerCase();

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
            ) ||
          actionLabel.includes(
            normalizedSearch
          ) ||
          entityLabel.includes(
            normalizedSearch
          ) ||
          String(
            log.entityId ?? ""
          ).includes(
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
      }
    );

    return [...filtered].sort(
      (first, second) => {
        if (
          sortOption === "OLDEST"
        ) {
          return (
            new Date(
              first.createdAt
            ).getTime() -
            new Date(
              second.createdAt
            ).getTime()
          );
        }

        if (
          sortOption === "ACTION_AZ"
        ) {
          return getLabel(
            AUDIT_ACTIONS,
            first.action
          ).localeCompare(
            getLabel(
              AUDIT_ACTIONS,
              second.action
            )
          );
        }

        if (
          sortOption === "ENTITY_AZ"
        ) {
          return getLabel(
            AUDIT_ENTITY_TYPES,
            first.entityType
          ).localeCompare(
            getLabel(
              AUDIT_ENTITY_TYPES,
              second.entityType
            )
          );
        }

        return (
          new Date(
            second.createdAt
          ).getTime() -
          new Date(
            first.createdAt
          ).getTime()
        );
      }
    );
  }, [
    logs,
    searchTerm,
    actionFilter,
    entityFilter,
    dateFilter,
    sortOption,
  ]);

  const auditSummary =
    useMemo(() => {
      return {
        total: logs.length,

        create: logs.filter(
          (log) =>
            log.action === "CREATE"
        ).length,

        update: logs.filter(
          (log) =>
            log.action === "UPDATE"
        ).length,

        delete: logs.filter(
          (log) =>
            log.action === "DELETE"
        ).length,

        print: logs.filter(
          (log) =>
            log.action === "PRINT"
        ).length,

        status: logs.filter(
          (log) =>
            log.action ===
            "STATUS_CHANGE"
        ).length,

        payment: logs.filter(
          (log) =>
            log.action ===
            "PAYMENT_CHANGE"
        ).length,
      };
    }, [logs]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    actionFilter !== "ALL" ||
    entityFilter !== "ALL" ||
    dateFilter !== "" ||
    sortOption !== "NEWEST";

  function clearFilters() {
    setSearchTerm("");
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setDateFilter("");
    setSortOption("NEWEST");
  }

  if (loading) {
    return (
      <section className="audit-logs-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />

          <span>
            Loading audit logs...
          </span>
        </div>
      </section>
    );
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

        <button
          type="button"
          className="btn-secondary audit-refresh-button"
          onClick={() =>
            void loadAuditLogs(true)
          }
          disabled={refreshing}
        >
          <FaSyncAlt
            className={
              refreshing
                ? "dashboard-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div className="audit-summary-grid audit-summary-grid-expanded">
        <article className="audit-summary-card">
          <span>
            <FaFileAlt />
            Total Logs
          </span>

          <strong>
            {auditSummary.total}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaPlusCircle />
            Created
          </span>

          <strong>
            {auditSummary.create}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaEdit />
            Updated
          </span>

          <strong>
            {auditSummary.update}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaTrash />
            Deleted
          </span>

          <strong>
            {auditSummary.delete}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaPrint />
            Printed
          </span>

          <strong>
            {auditSummary.print}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaSyncAlt />
            Status Changes
          </span>

          <strong>
            {auditSummary.status}
          </strong>
        </article>

        <article className="audit-summary-card">
          <span>
            <FaMoneyBillWave />
            Payment Changes
          </span>

          <strong>
            {auditSummary.payment}
          </strong>
        </article>
      </div>

      <div className="audit-toolbar audit-toolbar-expanded">
        <div className="audit-filter audit-search">
          <label htmlFor="auditSearch">
            Search Logs
          </label>

          <div className="audit-search-input">
            <FaSearch />

            <input
              id="auditSearch"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="User, action, entity, description, or record ID"
            />
          </div>
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

        <div className="audit-filter">
          <label htmlFor="auditSort">
            Sort By
          </label>

          <div className="sort-actions">
            <select
              id="auditSort"
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target
                    .value as AuditSortOption
                )
              }
            >
              <option value="NEWEST">
                Newest First
              </option>

              <option value="OLDEST">
                Oldest First
              </option>

              <option value="ACTION_AZ">
                Action A–Z
              </option>

              <option value="ENTITY_AZ">
                Entity A–Z
              </option>
            </select>

            <button
              type="button"
              className="icon-button reset-filter-button"
              title="Reset Filters"
              aria-label="Reset Filters"
              onClick={clearFilters}
              disabled={
                !hasActiveFilters
              }
            >
              <FaUndoAlt />
            </button>
          </div>
        </div>
      </div>

      <div className="audit-result-summary">
        Showing{" "}
        <strong>
          {displayedLogs.length}
        </strong>{" "}
        of{" "}
        <strong>{logs.length}</strong>{" "}
        logs
      </div>

      {displayedLogs.length === 0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-icon">
            <FaFileAlt />
          </div>

          <strong>
            {logs.length === 0
              ? "No audit logs yet"
              : "No matching audit logs"}
          </strong>

          <p>
            {logs.length === 0
              ? "System activity will appear here as users create, update, print, or delete records."
              : "Try changing or clearing the current audit filters."}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filter-button"
              onClick={clearFilters}
            >
              <FaUndoAlt />
              Clear Filters
            </button>
          )}
        </div>
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
              {displayedLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="audit-time-cell">
                      <strong>
                        {formatRelativeTime(
                          log.createdAt
                        )}
                      </strong>

                      <small>
                        {formatDateTime(
                          log.createdAt
                        )}
                      </small>
                    </div>
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
                    <span className="audit-entity-badge">
                      {getLabel(
                        AUDIT_ENTITY_TYPES,
                        log.entityType
                      )}
                    </span>

                    <small className="table-subtext">
                      {log.entityName ||
                        (log.entityId
                          ? `Record #${log.entityId}`
                          : "No record name")}
                    </small>
                  </td>

                  <td className="audit-description-cell">
                    {log.description}
                  </td>

                  <td>
                    <div className="audit-user-cell">
                      <span
                        className="audit-user-avatar"
                        aria-hidden="true"
                      >
                        {getInitials(
                          log.performedBy
                        )}
                      </span>

                      <strong>
                        {log.performedBy ||
                          "System"}
                      </strong>
                    </div>
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
          <div className="audit-details audit-details-upgraded">
            <section className="audit-activity-card">
              <div className="audit-activity-timeline">
                <span className="audit-timeline-dot">
                  <FaClock />
                </span>

                <div>
                  <span>
                    {getLabel(
                      AUDIT_ACTIONS,
                      selectedLog.action
                    )}
                  </span>

                  <strong>
                    {selectedLog.description}
                  </strong>

                  <small>
                    {formatDateTime(
                      selectedLog.createdAt
                    )}
                  </small>
                </div>
              </div>

              <div className="audit-activity-meta">
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
                  <span>Record</span>

                  <strong>
                    {selectedLog.entityName ||
                      (selectedLog.entityId
                        ? `#${selectedLog.entityId}`
                        : "Not provided")}
                  </strong>
                </div>

                <div>
                  <span>Performed By</span>

                  <strong>
                    {selectedLog.performedBy ||
                      "System"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="order-details-section">
              <h3>Recorded Changes</h3>

              {getChangedFields(
                selectedLog.previousData,
                selectedLog.newData
              ).length === 0 ? (
                <div className="dashboard-empty-state">
                  <strong>
                    No field changes recorded
                  </strong>

                  <p>
                    This action did not include
                    before-and-after field data.
                  </p>
                </div>
              ) : (
                <div className="audit-changes-list audit-changes-list-upgraded">
                  {getChangedFields(
                    selectedLog.previousData,
                    selectedLog.newData
                  ).map((field) => (
                    <article
                      key={field}
                      className="audit-change-card"
                    >
                      <h4>
                        {formatFieldName(
                          field
                        )}
                      </h4>

                      <div className="audit-change-comparison">
                        <div className="audit-change-value audit-change-before">
                          <span>Before</span>

                          <pre>
                            {formatValue(
                              selectedLog
                                .previousData?.[
                                field
                              ]
                            )}
                          </pre>
                        </div>

                        <div className="audit-change-arrow">
                          <FaArrowDown />
                        </div>

                        <div className="audit-change-value audit-change-after">
                          <span>After</span>

                          <pre>
                            {formatValue(
                              selectedLog
                                .newData?.[
                                field
                              ]
                            )}
                          </pre>
                        </div>
                      </div>
                    </article>
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
