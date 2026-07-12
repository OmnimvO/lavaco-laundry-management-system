import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaEdit,
  FaKey,
  FaTrash,
  FaUndoAlt,
  FaUserPlus,
} from "react-icons/fa";

import {
  createUser,
  deleteUser,
  getUsers,
  resetUserPassword,
  updateUser,
} from "../api/userApi";

import { getEmployees } from "../api/employeeApi";

import type { Employee } from "../types/employee";
import type {
  CreateUserData,
  UpdateUserData,
  UserAccount,
} from "../types/user";

import {
  USER_ROLES,
  USER_STATUSES,
} from "../constants/user";

import Modal from "../components/Modal";
import Toast from "../components/Toast";
import UserForm from "../components/UserForm";

import { useAuth } from "../hooks/useAuth";

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

function UsersPage() {
  const {
    token,
    user: currentUser,
  } = useAuth();

  const [users, setUsers] =
    useState<UserAccount[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [
    selectedUser,
    setSelectedUser,
  ] = useState<UserAccount | null>(null);

  const [
    resetPasswordUser,
    setResetPasswordUser,
  ] = useState<UserAccount | null>(null);

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

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

  async function loadData() {
    if (!token) {
      return;
    }

    try {
      setLoading(true);

      const [
        usersData,
        employeesData,
      ] = await Promise.all([
        getUsers(token),
        getEmployees(),
      ]);

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : []
      );

      setEmployees(
        Array.isArray(employeesData)
          ? employeesData
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load user management data:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load user accounts.",
        "error"
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

  async function handleCreateUser(
    data:
      | CreateUserData
      | UpdateUserData
  ) {
    if (!token) {
      return;
    }

    try {
      await createUser(
        data as CreateUserData,
        token
      );

      await loadData();

      setIsCreateModalOpen(false);

      showToast(
        "User account created successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to create user account.",
        "error"
      );
    }
  }

  async function handleUpdateUser(
    data:
      | CreateUserData
      | UpdateUserData
  ) {
    if (
      !token ||
      !selectedUser
    ) {
      return;
    }

    try {
      await updateUser(
        selectedUser.id,
        data as UpdateUserData,
        token
      );

      await loadData();

      setSelectedUser(null);

      showToast(
        "User account updated successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update user account.",
        "error"
      );
    }
  }

  async function handleResetPassword() {
    if (
      !token ||
      !resetPasswordUser
    ) {
      return;
    }

    if (newPassword.length < 8) {
      showToast(
        "Password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (
      newPassword !==
      confirmNewPassword
    ) {
      showToast(
        "Passwords do not match.",
        "error"
      );
      return;
    }

    try {
      await resetUserPassword(
        resetPasswordUser.id,
        {
          newPassword,
        },
        token
      );

      setResetPasswordUser(null);
      setNewPassword("");
      setConfirmNewPassword("");

      showToast(
        "Password reset successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to reset password.",
        "error"
      );
    }
  }

  async function handleDeleteUser(
    user: UserAccount
  ) {
    if (!token) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete the account for ${user.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(
        user.id,
        token
      );

      await loadData();

      showToast(
        "User account deleted successfully!"
      );
    } catch (error) {
      console.error(error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete user account.",
        "error"
      );
    }
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    return users.filter((user) => {
      const employeeName =
        user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : "";

      const matchesSearch =
        normalizedSearch === "" ||
        user.name
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        user.email
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        employeeName
          .toLowerCase()
          .includes(
            normalizedSearch
          );

      const matchesRole =
        roleFilter === "ALL" ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        user.status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  const adminCount = users.filter(
    (user) =>
      user.role === "ADMIN"
  ).length;

  const staffCount = users.filter(
    (user) =>
      user.role === "STAFF"
  ).length;

  const activeCount = users.filter(
    (user) =>
      user.status === "ACTIVE"
  ).length;

  const inactiveCount = users.filter(
    (user) =>
      user.status === "INACTIVE"
  ).length;

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <p>
        Loading user accounts...
      </p>
    );
  }

  return (
    <section className="users-page">
      <div className="page-header">
        <div>
          <h2>User Management</h2>

          <p>
            Create and manage administrator
            and staff login accounts.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setSelectedUser(null);
            setIsCreateModalOpen(true);
          }}
        >
          <FaUserPlus />
          <span>Create Account</span>
        </button>
      </div>

      <div className="users-summary-grid">
        <article className="users-summary-card">
          <span>Total Accounts</span>
          <strong>{users.length}</strong>
        </article>

        <article className="users-summary-card">
          <span>Administrators</span>
          <strong>{adminCount}</strong>
        </article>

        <article className="users-summary-card">
          <span>Staff</span>
          <strong>{staffCount}</strong>
        </article>

        <article className="users-summary-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </article>

        <article className="users-summary-card">
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </article>
      </div>

      <div className="users-toolbar">
        <div className="users-filter users-search">
          <label htmlFor="userSearch">
            Search Accounts
          </label>

          <input
            id="userSearch"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Name, email, or linked employee"
          />
        </div>

        <div className="users-filter">
          <label htmlFor="roleFilter">
            Role
          </label>

          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Roles
            </option>

            {USER_ROLES.map(
              (role) => (
                <option
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="users-filter">
          <label htmlFor="statusFilter">
            Status
          </label>

          <select
            id="statusFilter"
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

            {USER_STATUSES.map(
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
            setRoleFilter("ALL");
            setStatusFilter("ALL");
          }}
        >
          <FaUndoAlt />
        </button>
      </div>

      <div className="users-result-summary">
        Showing{" "}
        <strong>
          {filteredUsers.length}
        </strong>{" "}
        of{" "}
        <strong>{users.length}</strong>{" "}
        accounts
      </div>

      {filteredUsers.length === 0 ? (
        <p>
          {users.length === 0
            ? "No user accounts available."
            : "No user accounts match the current filters."}
        </p>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table users-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>Linked Employee</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map(
                (user) => {
                  const isOwnAccount =
                    user.id ===
                    currentUser.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.name}
                        </strong>

                        <small className="table-subtext">
                          {user.email}
                        </small>

                        {isOwnAccount && (
                          <small className="current-account-label">
                            Current account
                          </small>
                        )}
                      </td>

                      <td>
                        <span
                          className={`user-role-badge user-role-${user.role.toLowerCase()}`}
                        >
                          {getLabel(
                            USER_ROLES,
                            user.role
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`user-status-badge user-status-${user.status.toLowerCase()}`}
                        >
                          {getLabel(
                            USER_STATUSES,
                            user.status
                          )}
                        </span>
                      </td>

                      <td>
                        {user.employee ? (
                          <>
                            <strong>
                              {
                                user.employee
                                  .firstName
                              }{" "}
                              {
                                user.employee
                                  .lastName
                              }
                            </strong>

                            <small className="table-subtext">
                              {user.employee.position
                                .replaceAll(
                                  "_",
                                  " "
                                )
                                .toLowerCase()
                                .replace(
                                  /\b\w/g,
                                  (letter) =>
                                    letter.toUpperCase()
                                )}
                            </small>
                          </>
                        ) : (
                          "Not linked"
                        )}
                      </td>

                      <td>
                        {formatDate(
                          user.createdAt
                        )}
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-button edit-button"
                            title="Edit Account"
                            aria-label={`Edit ${user.name}`}
                            onClick={() =>
                              setSelectedUser(
                                user
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="icon-button reset-password-button"
                            title="Reset Password"
                            aria-label={`Reset password for ${user.name}`}
                            onClick={() => {
                              setResetPasswordUser(
                                user
                              );
                              setNewPassword("");
                              setConfirmNewPassword(
                                ""
                              );
                            }}
                          >
                            <FaKey />
                          </button>

                          <button
                            type="button"
                            className="icon-button delete-button"
                            title={
                              isOwnAccount
                                ? "You cannot delete your own account"
                                : "Delete Account"
                            }
                            aria-label={`Delete ${user.name}`}
                            disabled={isOwnAccount}
                            onClick={() =>
                              handleDeleteUser(
                                user
                              )
                            }
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {isCreateModalOpen && (
        <Modal
          title="Create User Account"
          onClose={() =>
            setIsCreateModalOpen(false)
          }
        >
          <UserForm
            employees={employees}
            currentUserId={
              currentUser.id
            }
            onSubmit={
              handleCreateUser
            }
          />
        </Modal>
      )}

      {selectedUser && (
        <Modal
          title="Edit User Account"
          onClose={() =>
            setSelectedUser(null)
          }
        >
          <UserForm
            employees={employees}
            selectedUser={selectedUser}
            currentUserId={
              currentUser.id
            }
            onSubmit={
              handleUpdateUser
            }
          />
        </Modal>
      )}

      {resetPasswordUser && (
        <Modal
          title={`Reset Password — ${resetPasswordUser.name}`}
          onClose={() => {
            setResetPasswordUser(null);
            setNewPassword("");
            setConfirmNewPassword("");
          }}
        >
          <div className="reset-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">
                New Password
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmNewPassword">
                Confirm New Password
              </label>

              <input
                id="confirmNewPassword"
                type="password"
                value={
                  confirmNewPassword
                }
                onChange={(event) =>
                  setConfirmNewPassword(
                    event.target.value
                  )
                }
                placeholder="Repeat the password"
                autoComplete="new-password"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={
                  handleResetPassword
                }
              >
                Reset Password
              </button>
            </div>
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

export default UsersPage;