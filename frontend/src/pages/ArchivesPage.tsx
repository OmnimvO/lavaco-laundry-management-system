import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArchive,
  FaBoxes,
  FaClipboardList,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaUndoAlt,
  FaUserCog,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  getArchivedRecords,
  getArchiveSummary,
  restoreArchivedRecord,
} from "../api/archiveApi";

import type {
  ArchiveEntityType,
  ArchivedRecord,
  ArchiveSummary,
} from "../types/archive";

import {
  useAuth,
} from "../hooks/useAuth";

import Toast from "../components/Toast";

type ArchiveTab = {
  value:
    ArchiveEntityType;
  label: string;
  icon:
    React.ReactNode;
};

const ARCHIVE_TABS:
  ArchiveTab[] = [
  {
    value:
      "CUSTOMER",
    label:
      "Customers",
    icon:
      <FaUsers />,
  },
  {
    value:
      "EMPLOYEE",
    label:
      "Employees",
    icon:
      <FaUserTie />,
  },
  {
    value:
      "ORDER",
    label:
      "Orders",
    icon:
      <FaClipboardList />,
  },
  {
    value:
      "INVENTORY",
    label:
      "Inventory",
    icon:
      <FaBoxes />,
  },
  {
    value:
      "USER",
    label:
      "Users",
    icon:
      <FaUserCog />,
  },
];

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "Not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

function formatCurrency(
  value: number
) {
  return `₱${Number(
    value || 0
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatEnum(
  value?: string | null
) {
  if (!value) {
    return "Not provided";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getRecordName(
  entityType:
    ArchiveEntityType,
  record:
    ArchivedRecord
) {
  if (
    entityType ===
    "CUSTOMER"
  ) {
    return "name" in record
      ? record.name
      : "Customer";
  }

  if (
    entityType ===
    "EMPLOYEE"
  ) {
    return "firstName" in
      record
      ? `${record.firstName} ${record.lastName}`.trim()
      : "Employee";
  }

  if (
    entityType ===
    "ORDER"
  ) {
    return "orderNumber" in
      record
      ? record.orderNumber
      : `Order #${record.id}`;
  }

  if (
    entityType ===
    "INVENTORY"
  ) {
    return "name" in record
      ? record.name
      : "Inventory Item";
  }

  return "email" in record
    ? record.name
    : "User";
}

function getRecordSearchText(
  entityType:
    ArchiveEntityType,
  record:
    ArchivedRecord
) {
  const values:
    unknown[] = [
    getRecordName(
      entityType,
      record
    ),
    record.id,
    record.archivedBy,
  ];

  if (
    entityType ===
      "CUSTOMER" &&
    "phone" in record
  ) {
    values.push(
      record.phone,
      record.address
    );
  }

  if (
    entityType ===
      "EMPLOYEE" &&
    "position" in record
  ) {
    values.push(
      record.position,
      record.phone,
      record.user?.email
    );
  }

  if (
    entityType ===
      "ORDER" &&
    "orderNumber" in record
  ) {
    values.push(
      record.orderNumber,
      record.customer?.name,
      record.walkInCustomerName,
      record.status,
      record.paymentStatus
    );
  }

  if (
    entityType ===
      "INVENTORY" &&
    "category" in record
  ) {
    values.push(
      record.category,
      record.supplierName,
      record.supplierContact
    );
  }

  if (
    entityType ===
      "USER" &&
    "email" in record
  ) {
    values.push(
      record.email,
      record.role,
      record.status,
      record.employee
        ? `${record.employee.firstName} ${record.employee.lastName}`
        : ""
    );
  }

  return values
    .map((value) =>
      String(value ?? "")
        .toLowerCase()
    )
    .join(" ");
}

function ArchivesPage() {
  const {
    token,
    isAdmin,
  } = useAuth();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ArchiveEntityType>(
      "CUSTOMER"
    );

  const [
    summary,
    setSummary,
  ] = useState<
    ArchiveSummary
  >({
    customers: 0,
    employees: 0,
    orders: 0,
    inventory: 0,
    users: 0,
    total: 0,
  });

  const [
    records,
    setRecords,
  ] = useState<
    ArchivedRecord[]
  >([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    restoringId,
    setRestoringId,
  ] = useState<
    number | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const [
    toast,
    setToast,
  ] = useState<{
    message: string;
    type:
      | "success"
      | "error";
  } | null>(null);

  function showToast(
    message: string,
    type:
      | "success"
      | "error" =
      "success"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(
      () => {
        setToast(null);
      },
      3000
    );
  }

  const loadArchives =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        if (
          typeof token !==
            "string" ||
          !token.trim()
        ) {
          setLoading(false);

          setErrorMessage(
            "Your session is unavailable. Please log in again."
          );

          return;
        }

        try {
          if (
            manualRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(true);
          }

          setErrorMessage(
            null
          );

          const [
            summaryData,
            recordsData,
          ] =
            await Promise.all([
              getArchiveSummary(
                token
              ),

              getArchivedRecords(
                activeTab,
                token
              ),
            ]);

          setSummary(
            summaryData
          );

          setRecords(
            Array.isArray(
              recordsData.records
            )
              ? recordsData.records
              : []
          );
        } catch (error) {
          console.error(
            "Failed to load archives:",
            error
          );

          const message =
            error instanceof Error
              ? error.message
              : "Failed to load archived records.";

          setErrorMessage(
            message
          );

          if (
            !manualRefresh
          ) {
            setRecords([]);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        activeTab,
        token,
      ]
    );

  useEffect(() => {
    void loadArchives(
      false
    );
  }, [loadArchives]);

  const filteredRecords =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      if (
        !normalizedSearch
      ) {
        return records;
      }

      return records.filter(
        (record) =>
          getRecordSearchText(
            activeTab,
            record
          ).includes(
            normalizedSearch
          )
      );
    }, [
      activeTab,
      records,
      searchTerm,
    ]);

  function getTabCount(
    entityType:
      ArchiveEntityType
  ) {
    switch (entityType) {
      case "CUSTOMER":
        return summary.customers;

      case "EMPLOYEE":
        return summary.employees;

      case "ORDER":
        return summary.orders;

      case "INVENTORY":
        return summary.inventory;

      case "USER":
        return summary.users;
    }
  }

  async function handleRestore(
    record:
      ArchivedRecord
  ) {
    if (
      typeof token !==
        "string" ||
      !token.trim()
    ) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );
      return;
    }

    const recordName =
      getRecordName(
        activeTab,
        record
      );

    const isCancelledOrder =
      activeTab === "ORDER" &&
      "status" in record &&
      record.status ===
        "CANCELLED";

    const warning =
      isCancelledOrder
        ? `Restore ${recordName}? This order will remain cancelled and excluded from revenue.`
        : `Restore ${recordName}? It will become active in the system again.`;

    if (
      !window.confirm(
        warning
      )
    ) {
      return;
    }

    try {
      setRestoringId(
        record.id
      );

      const response =
        await restoreArchivedRecord(
          activeTab,
          record.id,
          token
        );

      await loadArchives(
        false
      );

      showToast(
        response.message ||
          "Record restored successfully."
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to restore archived record.",
        "error"
      );
    } finally {
      setRestoringId(
        null
      );
    }
  }

  if (!isAdmin) {
    return (
      <section className="archives-page">
        <div className="dashboard-error">
          <h2>
            Access denied
          </h2>

          <p>
            Only administrators can
            access archived records.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="archives-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />

          <span>
            Loading archives...
          </span>
        </div>
      </section>
    );
  }

  if (
    errorMessage &&
    records.length === 0
  ) {
    return (
      <section className="archives-page">
        <div className="dashboard-error">
          <h2>
            Archives unavailable
          </h2>

          <p>
            {errorMessage}
          </p>

          <button
            type="button"
            className="dashboard-retry-button"
            onClick={() =>
              void loadArchives(
                true
              )
            }
          >
            <FaSyncAlt />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="archives-page">
      <div className="page-header">
        <div>
          <h2>Archives</h2>

          <p>
            Review and restore records
            that were removed from active
            system views.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary archives-refresh-button"
          onClick={() =>
            void loadArchives(
              true
            )
          }
          disabled={
            refreshing
          }
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

      <div className="archives-summary-grid">
        <article className="archives-summary-card archives-total-card">
          <span>
            <FaArchive />
            Total Archived
          </span>

          <strong>
            {summary.total}
          </strong>
        </article>

        {ARCHIVE_TABS.map(
          (tab) => (
            <article
              key={
                tab.value
              }
              className="archives-summary-card"
            >
              <span>
                {tab.icon}
                {tab.label}
              </span>

              <strong>
                {getTabCount(
                  tab.value
                )}
              </strong>
            </article>
          )
        )}
      </div>

      <div className="archives-warning-card">
        <FaExclamationTriangle />

        <div>
          <strong>
            Archived data is excluded
            from active totals
          </strong>

          <span>
            Restoring a record returns
            it to active views. Cancelled
            orders remain excluded from
            revenue even after restoration.
          </span>
        </div>
      </div>

      <div className="archives-tabs">
        {ARCHIVE_TABS.map(
          (tab) => (
            <button
              key={
                tab.value
              }
              type="button"
              className={
                activeTab ===
                tab.value
                  ? "archives-tab active"
                  : "archives-tab"
              }
              onClick={() => {
                setActiveTab(
                  tab.value
                );
                setSearchTerm(
                  ""
                );
              }}
            >
              {tab.icon}

              <span>
                {tab.label}
              </span>

              <strong>
                {getTabCount(
                  tab.value
                )}
              </strong>
            </button>
          )
        )}
      </div>

      <div className="archives-toolbar">
        <div className="archives-search">
          <label htmlFor="archiveSearch">
            Search Archived Records
          </label>

          <div className="archives-search-input">
            <FaSearch />

            <input
              id="archiveSearch"
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Name, email, order number, supplier, or archived by"
            />
          </div>
        </div>

        <button
          type="button"
          className="icon-button reset-filter-button"
          title="Clear Search"
          aria-label="Clear Search"
          onClick={() =>
            setSearchTerm(
              ""
            )
          }
          disabled={
            !searchTerm.trim()
          }
        >
          <FaUndoAlt />
        </button>
      </div>

    <div className="archives-result-summary">
    <span>
        Showing{" "}
        <strong>
        {filteredRecords.length}
        </strong>{" "}
        of{" "}
        <strong>
        {records.length}
        </strong>{" "}
        archived{" "}
        {ARCHIVE_TABS.find(
        (tab) => tab.value === activeTab
        )?.label.toLowerCase()}
    </span>
    </div>

      {filteredRecords.length ===
      0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-icon">
            <FaArchive />
          </div>

          <strong>
            {records.length === 0
              ? "No archived records"
              : "No matching archived records"}
          </strong>

          <p>
            {records.length === 0
              ? "Archived records for this category will appear here."
              : "Try clearing or changing your search."}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table archives-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Details</th>
                <th>Status / Value</th>
                <th>Archived At</th>
                <th>Archived By</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map(
                (record) => (
                  <tr
                    key={
                      record.id
                    }
                  >
                    <td>
                      <strong>
                        {getRecordName(
                          activeTab,
                          record
                        )}
                      </strong>

                      <small className="table-subtext">
                        Record #
                        {record.id}
                      </small>
                    </td>

                    <td>
                      {activeTab ===
                        "CUSTOMER" &&
                        "phone" in
                          record && (
                          <>
                            <span>
                              {record.phone ||
                                "No phone"}
                            </span>

                            <small className="table-subtext">
                              {record.address ||
                                "No address"}
                            </small>
                          </>
                        )}

                      {activeTab ===
                        "EMPLOYEE" &&
                        "position" in
                          record && (
                          <>
                            <span>
                              {formatEnum(
                                record.position
                              )}
                            </span>

                            <small className="table-subtext">
                              {record.user
                                ?.email ||
                                "No linked user"}
                            </small>
                          </>
                        )}

                      {activeTab ===
                        "ORDER" &&
                        "orderNumber" in
                          record && (
                          <>
                            <span>
                              {record.customer
                                ?.name ||
                                record.walkInCustomerName ||
                                "Unknown Customer"}
                            </span>

                            <small className="table-subtext">
                              {
                                record.loadCount
                              }{" "}
                              load
                              {record.loadCount ===
                              1
                                ? ""
                                : "s"}{" "}
                              ·{" "}
                              {
                                record.laundryWeight
                              }{" "}
                              kg
                            </small>
                          </>
                        )}

                      {activeTab ===
                        "INVENTORY" &&
                        "category" in
                          record && (
                          <>
                            <span>
                              {formatEnum(
                                record.category
                              )}
                            </span>

                            <small className="table-subtext">
                              {record.supplierName ||
                                "No supplier"}
                            </small>
                          </>
                        )}

                      {activeTab ===
                        "USER" &&
                        "email" in
                          record && (
                          <>
                            <span>
                              {
                                record.email
                              }
                            </span>

                            <small className="table-subtext">
                              {record.employee
                                ? `${record.employee.firstName} ${record.employee.lastName}`
                                : "No linked employee"}
                            </small>
                          </>
                        )}
                    </td>

                    <td>
                      {activeTab ===
                        "CUSTOMER" &&
                        "name" in record &&
                        !("email" in record) &&
                        !("category" in record) &&
                        !("orderNumber" in record) &&
                        !("firstName" in record) && (
                          <span className="archive-value-badge">
                            {record._count
                              ?.orders ??
                              0}{" "}
                            orders
                          </span>
                        )}

                      {activeTab ===
                        "EMPLOYEE" &&
                        "status" in
                          record && (
                          <span className="archive-status-badge">
                            {formatEnum(
                              record.status
                            )}
                          </span>
                        )}

                      {activeTab ===
                        "ORDER" &&
                        "totalPrice" in
                          record && (
                          <>
                            <strong className="archive-order-value">
                              {formatCurrency(
                                record.totalPrice
                              )}
                            </strong>

                            <small className={`table-subtext archive-order-status archive-order-${record.status.toLowerCase()}`}>
                              {formatEnum(
                                record.status
                              )}{" "}
                              ·{" "}
                              {formatEnum(
                                record.paymentStatus
                              )}
                            </small>
                          </>
                        )}

                      {activeTab ===
                        "INVENTORY" &&
                        "quantity" in
                          record && (
                          <span className="archive-value-badge">
                            {
                              record.quantity
                            }{" "}
                            {
                              record.unit
                            }
                          </span>
                        )}

                      {activeTab ===
                        "USER" &&
                        "role" in
                          record && (
                          <span className="archive-status-badge">
                            {formatEnum(
                              record.role
                            )}{" "}
                            ·{" "}
                            {formatEnum(
                              record.status
                            )}
                          </span>
                        )}
                    </td>

                    <td>
                      {formatDateTime(
                        record.archivedAt
                      )}
                    </td>

                    <td>
                      {record.archivedBy ||
                        "System"}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="archive-restore-button"
                        disabled={
                          restoringId ===
                          record.id
                        }
                        onClick={() =>
                          void handleRestore(
                            record
                          )
                        }
                      >
                        <FaUndoAlt />

                        {restoringId ===
                        record.id
                          ? "Restoring..."
                          : "Restore"}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <Toast
          message={
            toast.message
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </section>
  );
}

export default ArchivesPage;