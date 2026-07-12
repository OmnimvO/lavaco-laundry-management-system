import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type { Employee } from "../types/employee";
import type {
  CreateUserData,
  UpdateUserData,
  UserAccount,
  UserRole,
  UserStatus,
} from "../types/user";

import {
  USER_ROLES,
  USER_STATUSES,
} from "../constants/user";

type UserFormProps = {
  employees: Employee[];
  selectedUser?: UserAccount | null;
  currentUserId: number;

  onSubmit: (
    data: CreateUserData | UpdateUserData
  ) => void | Promise<void>;
};

type UserFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  status: UserStatus;
  employeeId: string;
};

const initialFormData: UserFormData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "STAFF",
  status: "ACTIVE",
  employeeId: "",
};

function getEmployeeFullName(
  employee: Employee
) {
  return `${employee.firstName} ${employee.lastName}`;
}

function UserForm({
  employees,
  selectedUser,
  currentUserId,
  onSubmit,
}: UserFormProps) {
  const [formData, setFormData] =
    useState<UserFormData>(
      initialFormData
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isEditing =
    Boolean(selectedUser);

  const isEditingOwnAccount =
    selectedUser?.id === currentUserId;

  useEffect(() => {
    if (!selectedUser) {
      setFormData(initialFormData);
      return;
    }

    setFormData({
      name: selectedUser.name ?? "",
      email: selectedUser.email ?? "",
      password: "",
      confirmPassword: "",
      role: selectedUser.role,
      status: selectedUser.status,
      employeeId:
        selectedUser.employeeId
          ? String(
              selectedUser.employeeId
            )
          : "",
    });
  }, [selectedUser]);

  const availableEmployees = useMemo(
    () =>
      employees
        .filter(
          (employee) =>
            employee.status === "ACTIVE" ||
            employee.id ===
              selectedUser?.employeeId
        )
        .sort((first, second) =>
          getEmployeeFullName(
            first
          ).localeCompare(
            getEmployeeFullName(second)
          )
        ),
    [
      employees,
      selectedUser?.employeeId,
    ]
  );

  function handleChange(
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("Name is required.");
      return;
    }

    if (!formData.email.trim()) {
      alert("Email is required.");
      return;
    }

    if (!isEditing) {
      if (
        formData.password.length < 8
      ) {
        alert(
          "Password must contain at least 8 characters."
        );
        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        alert(
          "Passwords do not match."
        );
        return;
      }
    }

    const employeeId =
      formData.employeeId
        ? Number(formData.employeeId)
        : null;

    const baseData = {
      name: formData.name.trim(),
      email:
        formData.email
          .trim()
          .toLowerCase(),

      role: formData.role,
      status: formData.status,

      employeeId,
    };

    const payload:
      | CreateUserData
      | UpdateUserData =
      isEditing
        ? baseData
        : {
            ...baseData,
            password:
              formData.password,
          };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="user-form"
      onSubmit={handleSubmit}
    >
      <div className="user-form-grid">
        <div className="form-group">
          <label htmlFor="userName">
            Full Name
          </label>

          <input
            id="userName"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Account holder name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="userEmail">
            Email Address
          </label>

          <input
            id="userEmail"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@lavaco.com"
            required
          />
        </div>

        {!isEditing && (
          <>
            <div className="form-group">
              <label htmlFor="userPassword">
                Password
              </label>

              <input
                id="userPassword"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                placeholder="Repeat the password"
                autoComplete="new-password"
                required
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="userRole">
            Account Role
          </label>

          <select
            id="userRole"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={
              isEditingOwnAccount
            }
          >
            {USER_ROLES.map((role) => (
              <option
                key={role.value}
                value={role.value}
              >
                {role.label}
              </option>
            ))}
          </select>

          {isEditingOwnAccount && (
            <small className="form-help-text">
              You cannot change your own role.
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="userStatus">
            Account Status
          </label>

          <select
            id="userStatus"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={
              isEditingOwnAccount
            }
          >
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

          {isEditingOwnAccount && (
            <small className="form-help-text">
              You cannot deactivate your own account.
            </small>
          )}
        </div>

        <div className="form-group user-full-width">
          <label htmlFor="employeeId">
            Linked Employee
          </label>

          <select
            id="employeeId"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
          >
            <option value="">
              No linked employee
            </option>

            {availableEmployees.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {getEmployeeFullName(
                    employee
                  )}
                  {" — "}
                  {employee.position
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(
                      /\b\w/g,
                      (letter) =>
                        letter.toUpperCase()
                    )}
                </option>
              )
            )}
          </select>

          <small className="form-help-text">
            Only employees who need system access should be linked.
          </small>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
            ? "Update Account"
            : "Create Account"}
        </button>
      </div>
    </form>
  );
}

export default UserForm;