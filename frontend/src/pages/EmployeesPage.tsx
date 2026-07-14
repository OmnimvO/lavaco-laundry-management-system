import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCashRegister,
  FaCheckCircle,
  FaEdit,
  FaMotorcycle,
  FaSearch,
  FaSyncAlt,
  FaTimesCircle,
  FaTrash,
  FaTshirt,
  FaUndoAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "../api/employeeApi";

import type { Employee } from "../types/employee";

import {
  EMPLOYEE_POSITIONS,
  EMPLOYEE_STATUSES,
} from "../constants/employee";

import Modal from "../components/Modal";
import EmployeeForm from "../components/EmployeeForm";
import Toast from "../components/Toast";

import {
  useAuth,
} from "../hooks/useAuth";

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function getFullName(
  employee: Employee
) {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function getEmployeeInitial(
  employee: Employee
) {
  const firstName =
    employee.firstName?.trim();

  const lastName =
    employee.lastName?.trim();

  if (firstName && lastName) {
    return `${firstName.charAt(
      0
    )}${lastName.charAt(0)}`.toUpperCase();
  }

  return (
    firstName?.charAt(0) ??
    lastName?.charAt(0) ??
    "?"
  ).toUpperCase();
}

function formatPhoneNumber(
  value?: string | null
) {
  if (!value) {
    return "Not provided";
  }

  const digits =
    value.replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(
      0,
      4
    )} ${digits.slice(
      4,
      7
    )} ${digits.slice(7)}`;
  }

  return value;
}

function EmployeesPage() {
  const {
    token,
  } = useAuth();
  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState<Employee | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    positionFilter,
    setPositionFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [sortOption, setSortOption] =
    useState<
      | "NAME_AZ"
      | "NAME_ZA"
      | "NEWEST_HIRED"
      | "OLDEST_HIRED"
    >("NAME_AZ");

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

  const loadEmployees = useCallback(
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
          await getEmployees(
            token
          );

        setEmployees(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load employees:",
          error
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load employees.",
          "error"
        );

        if (!manualRefresh) {
          setEmployees([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadEmployees(false);
  }, [loadEmployees]);

  function openCreateModal() {
    setSelectedEmployee(null);
    setIsCreateModalOpen(true);
  }

  function closeEmployeeModal() {
    setIsCreateModalOpen(false);
    setSelectedEmployee(null);
  }

  async function handleCreateEmployee(
    data: Parameters<
      typeof createEmployee
    >[0]
  ) {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      const error =
        new Error(
          "Your session is unavailable. Please log in again."
        );

      showToast(
        error.message,
        "error"
      );

      throw error;
    }

    try {
      await createEmployee(
        data,
        token
      );
      await loadEmployees(false);

      closeEmployeeModal();

      showToast(
        "Employee added successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to add employee.",
        "error"
      );

      throw error;
    }
  }

  async function handleUpdateEmployee(
    data: Parameters<
      typeof updateEmployee
    >[1]
  ) {
    if (!selectedEmployee) {
      return;
    }

    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      const error =
        new Error(
          "Your session is unavailable. Please log in again."
        );

      showToast(
        error.message,
        "error"
      );

      throw error;
    }

    try {
      await updateEmployee(
        selectedEmployee.id,
        data,
        token
      );

      await loadEmployees(false);

      closeEmployeeModal();

      showToast(
        "Employee updated successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update employee.",
        "error"
      );

      throw error;
    }
  }

  async function handleDeleteEmployee(
    id: number
  ) {
    const employee =
      employees.find(
        (item) => item.id === id
      );

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${
          employee
            ? getFullName(employee)
            : "this employee"
        }?`
      );

    if (!confirmed) {
      return;
    }

    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );

      return;
    }

    try {
      await deleteEmployee(
        id,
        token
      );
      await loadEmployees(false);

      showToast(
        "Employee deleted successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete employee.",
        "error"
      );
    }
  }

  const displayedEmployees =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        employees.filter(
          (employee) => {
            const fullName =
              getFullName(
                employee
              ).toLowerCase();

            const phone = String(
              employee.phone ?? ""
            ).toLowerCase();

            const address = String(
              employee.address ?? ""
            ).toLowerCase();

            const positionLabel =
              getLabel(
                EMPLOYEE_POSITIONS,
                employee.position
              ).toLowerCase();

            const matchesSearch =
              normalizedSearch === "" ||
              fullName.includes(
                normalizedSearch
              ) ||
              phone.includes(
                normalizedSearch
              ) ||
              address.includes(
                normalizedSearch
              ) ||
              positionLabel.includes(
                normalizedSearch
              );

            const matchesPosition =
              positionFilter === "ALL" ||
              employee.position ===
                positionFilter;

            const matchesStatus =
              statusFilter === "ALL" ||
              employee.status ===
                statusFilter;

            return (
              matchesSearch &&
              matchesPosition &&
              matchesStatus
            );
          }
        );

      return [...filtered].sort(
        (first, second) => {
          if (
            sortOption === "NAME_ZA"
          ) {
            return getFullName(
              second
            ).localeCompare(
              getFullName(first)
            );
          }

          if (
            sortOption ===
            "NEWEST_HIRED"
          ) {
            return (
              new Date(
                second.dateHired
              ).getTime() -
              new Date(
                first.dateHired
              ).getTime()
            );
          }

          if (
            sortOption ===
            "OLDEST_HIRED"
          ) {
            return (
              new Date(
                first.dateHired
              ).getTime() -
              new Date(
                second.dateHired
              ).getTime()
            );
          }

          return getFullName(
            first
          ).localeCompare(
            getFullName(second)
          );
        }
      );
    }, [
      employees,
      searchTerm,
      positionFilter,
      statusFilter,
      sortOption,
    ]);

  const employeeSummary =
    useMemo(() => {
      return {
        total: employees.length,

        active: employees.filter(
          (employee) =>
            employee.status ===
            "ACTIVE"
        ).length,

        inactive: employees.filter(
          (employee) =>
            employee.status ===
            "INACTIVE"
        ).length,

        cashiers: employees.filter(
          (employee) =>
            employee.position ===
            "CASHIER"
        ).length,

        laundryStaff:
          employees.filter(
            (employee) =>
              employee.position ===
              "LAUNDRY_STAFF"
          ).length,

        deliveryStaff:
          employees.filter(
            (employee) =>
              employee.position ===
              "DELIVERY_STAFF"
          ).length,
      };
    }, [employees]);

  function clearFilters() {
    setSearchTerm("");
    setPositionFilter("ALL");
    setStatusFilter("ALL");
    setSortOption("NAME_AZ");
  }

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    positionFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    sortOption !== "NAME_AZ";

  if (loading) {
    return (
      <section className="employees-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />

          <span>
            Loading employees...
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="employees-page">
      <div className="page-header">
        <div>
          <h2>Employees</h2>

          <p>
            Manage Lava Co. Laundry Hub
            staff records.
          </p>
        </div>

        <div className="employees-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              void loadEmployees(true)
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

          <button
            type="button"
            className="primary-button"
            onClick={openCreateModal}
          >
            <FaUserPlus />
            Add Employee
          </button>
        </div>
      </div>

      <div className="employees-summary-grid">
        <article className="employees-summary-card">
          <span>
            <FaUsers />
            Total Employees
          </span>

          <strong>
            {employeeSummary.total}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>
            <FaCheckCircle />
            Active
          </span>

          <strong>
            {employeeSummary.active}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>
            <FaTimesCircle />
            Inactive
          </span>

          <strong>
            {employeeSummary.inactive}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>
            <FaCashRegister />
            Cashiers
          </span>

          <strong>
            {employeeSummary.cashiers}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>
            <FaTshirt />
            Laundry Staff
          </span>

          <strong>
            {
              employeeSummary
                .laundryStaff
            }
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>
            <FaMotorcycle />
            Delivery Staff
          </span>

          <strong>
            {
              employeeSummary
                .deliveryStaff
            }
          </strong>
        </article>
      </div>

      <div className="employees-toolbar">
        <div className="employees-filter employees-search">
          <label htmlFor="employeeSearch">
            Search Employees
          </label>

          <div className="employees-search-input">
            <FaSearch />

            <input
              id="employeeSearch"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Name, phone, address, or position"
            />
          </div>
        </div>

        <div className="employees-filter">
          <label htmlFor="employeePosition">
            Position
          </label>

          <select
            id="employeePosition"
            value={positionFilter}
            onChange={(event) =>
              setPositionFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Positions
            </option>

            {EMPLOYEE_POSITIONS.map(
              (position) => (
                <option
                  key={position.value}
                  value={position.value}
                >
                  {position.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="employees-filter">
          <label htmlFor="employeeStatus">
            Status
          </label>

          <select
            id="employeeStatus"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            {EMPLOYEE_STATUSES.map(
              (status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="employees-filter">
          <label htmlFor="employeeSort">
            Sort By
          </label>

          <div className="sort-actions">
            <select
              id="employeeSort"
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target
                    .value as typeof sortOption
                )
              }
            >
              <option value="NAME_AZ">
                Name A–Z
              </option>

              <option value="NAME_ZA">
                Name Z–A
              </option>

              <option value="NEWEST_HIRED">
                Newest Hired
              </option>

              <option value="OLDEST_HIRED">
                Oldest Hired
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

      <div className="employees-result-summary">
        <span>
          Showing{" "}
          <strong>
            {displayedEmployees.length}
          </strong>{" "}
          of{" "}
          <strong>
            {employees.length}
          </strong>{" "}
          employees
        </span>
      </div>

      {displayedEmployees.length ===
      0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-icon">
            <FaUserPlus />
          </div>

          <strong>
            {employees.length === 0
              ? "No employees yet"
              : "No matching employees"}
          </strong>

          <p>
            {employees.length === 0
              ? "Add the first employee to begin managing staff records."
              : "Try changing or clearing the current employee filters."}
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
          <table className="customer-table employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Position</th>
                <th>Phone</th>
                <th>Date Hired</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedEmployees.map(
                (employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-name-cell">
                        <span
                          className="employee-avatar"
                          aria-hidden="true"
                        >
                          {getEmployeeInitial(
                            employee
                          )}
                        </span>

                        <div>
                          <strong>
                            {getFullName(
                              employee
                            )}
                          </strong>

                          <small
                            title={
                              employee.address ||
                              "No address provided"
                            }
                          >
                            {employee.address ||
                              `Employee #${employee.id}`}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {getLabel(
                        EMPLOYEE_POSITIONS,
                        employee.position
                      )}
                    </td>

                    <td className="employee-phone-cell">
                      {formatPhoneNumber(
                        employee.phone
                      )}
                    </td>

                    <td>
                      {formatDate(
                        employee.dateHired
                      )}
                    </td>

                    <td>
                      <span
                        className={`employee-status-badge employee-status-${employee.status.toLowerCase()}`}
                      >
                        {getLabel(
                          EMPLOYEE_STATUSES,
                          employee.status
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button edit-button"
                          title="Edit Employee"
                          aria-label={`Edit ${getFullName(
                            employee
                          )}`}
                          onClick={() =>
                            setSelectedEmployee(
                              employee
                            )
                          }
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          className="icon-button delete-button"
                          title="Delete Employee"
                          aria-label={`Delete ${getFullName(
                            employee
                          )}`}
                          onClick={() =>
                            void handleDeleteEmployee(
                              employee.id
                            )
                          }
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {isCreateModalOpen && (
        <Modal
          title="Add Employee"
          onClose={closeEmployeeModal}
        >
          <EmployeeForm
            onSubmit={
              handleCreateEmployee
            }
            onCancel={
              closeEmployeeModal
            }
          />
        </Modal>
      )}

      {selectedEmployee && (
        <Modal
          title="Edit Employee"
          onClose={closeEmployeeModal}
        >
          <EmployeeForm
            selectedEmployee={
              selectedEmployee
            }
            onSubmit={
              handleUpdateEmployee
            }
            onCancel={
              closeEmployeeModal
            }
          />
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

export default EmployeesPage;