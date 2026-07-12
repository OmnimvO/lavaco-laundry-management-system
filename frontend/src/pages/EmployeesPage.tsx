import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaEdit,
  FaTrash,
  FaUndoAlt,
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
  return new Date(value).toLocaleDateString(
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
  return `${employee.firstName} ${employee.lastName}`;
}

function EmployeesPage() {
  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [loading, setLoading] =
    useState(true);

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

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function loadEmployees() {
    try {
      setLoading(true);

      const data =
        await getEmployees();

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

      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleCreateEmployee(
    data: Parameters<
      typeof createEmployee
    >[0]
  ) {
    try {
      await createEmployee(data);
      await loadEmployees();

      setIsCreateModalOpen(false);

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

    try {
      await updateEmployee(
        selectedEmployee.id,
        data
      );

      await loadEmployees();

      setSelectedEmployee(null);

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
    }
  }

  async function handleDeleteEmployee(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this employee?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEmployee(id);
      await loadEmployees();

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

  const filteredEmployees =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return employees.filter(
        (employee) => {
          const fullName =
            getFullName(
              employee
            ).toLowerCase();

          const phone = String(
            employee.phone ?? ""
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
    }, [
      employees,
      searchTerm,
      positionFilter,
      statusFilter,
    ]);

  const totalEmployees =
    employees.length;

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status === "ACTIVE"
    ).length;

  const inactiveEmployees =
    employees.filter(
      (employee) =>
        employee.status === "INACTIVE"
    ).length;

  const cashiers =
    employees.filter(
      (employee) =>
        employee.position === "CASHIER"
    ).length;

  const laundryStaff =
    employees.filter(
      (employee) =>
        employee.position ===
        "LAUNDRY_STAFF"
    ).length;

  const deliveryStaff =
    employees.filter(
      (employee) =>
        employee.position ===
        "DELIVERY_STAFF"
    ).length;

  if (loading) {
    return <p>Loading employees...</p>;
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

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setSelectedEmployee(null);
            setIsCreateModalOpen(true);
          }}
        >
          + Add Employee
        </button>
      </div>

      <div className="employees-summary-grid">
        <article className="employees-summary-card">
          <span>Total Employees</span>
          <strong>
            {totalEmployees}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>Active</span>
          <strong>
            {activeEmployees}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>Inactive</span>
          <strong>
            {inactiveEmployees}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>Cashiers</span>
          <strong>{cashiers}</strong>
        </article>

        <article className="employees-summary-card">
          <span>Laundry Staff</span>
          <strong>
            {laundryStaff}
          </strong>
        </article>

        <article className="employees-summary-card">
          <span>Delivery Staff</span>
          <strong>
            {deliveryStaff}
          </strong>
        </article>
      </div>

      <div className="employees-toolbar">
        <div className="employees-filter employees-search">
          <label htmlFor="employeeSearch">
            Search Employees
          </label>

          <input
            id="employeeSearch"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Name, phone, or position"
          />
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

        <button
          type="button"
          className="icon-button reset-filter-button"
          title="Reset Filters"
          aria-label="Reset Filters"
          onClick={() => {
            setSearchTerm("");
            setPositionFilter("ALL");
            setStatusFilter("ALL");
          }}
        >
          <FaUndoAlt />
        </button>
      </div>

      <div className="employees-result-summary">
        Showing{" "}
        <strong>
          {filteredEmployees.length}
        </strong>{" "}
        of{" "}
        <strong>
          {employees.length}
        </strong>{" "}
        employees
      </div>

      {filteredEmployees.length === 0 ? (
        <p>
          {employees.length === 0
            ? "No employees yet."
            : "No employees match the current filters."}
        </p>
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
              {filteredEmployees.map(
                (employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>
                        {getFullName(
                          employee
                        )}
                      </strong>

                      {employee.address && (
                        <small className="table-subtext">
                          {employee.address}
                        </small>
                      )}
                    </td>

                    <td>
                      {getLabel(
                        EMPLOYEE_POSITIONS,
                        employee.position
                      )}
                    </td>

                    <td>
                      {employee.phone ||
                        "Not provided"}
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
                            handleDeleteEmployee(
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
          onClose={() =>
            setIsCreateModalOpen(false)
          }
        >
          <EmployeeForm
            onSubmit={
              handleCreateEmployee
            }
          />
        </Modal>
      )}

      {selectedEmployee && (
        <Modal
          title="Edit Employee"
          onClose={() =>
            setSelectedEmployee(null)
          }
        >
          <EmployeeForm
            selectedEmployee={
              selectedEmployee
            }
            onSubmit={
              handleUpdateEmployee
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