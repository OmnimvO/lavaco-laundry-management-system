import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  FaEnvelope,
  FaIdBadge,
  FaKey,
  FaShieldAlt,
  FaSignOutAlt,
  FaUser,
  FaUserTie,
} from "react-icons/fa";

import { changePassword } from "../api/authApi";
import Toast from "../components/Toast";
import { useAuth } from "../hooks/useAuth";

function formatDate(
  value?: string
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatPosition(
  value?: string
) {
  if (!value) {
    return "Not available";
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

function ProfilePage() {
  const {
    user,
    token,
    logout,
  } = useAuth();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [toast, setToast] =
    useState<{
      message: string;
      type: "success" | "error";
    } | null>(null);

  const initials = useMemo(() => {
    if (!user?.name) {
      return "U";
    }

    const parts = user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[
      parts.length - 1
    ].charAt(0)}`.toUpperCase();
  }, [user?.name]);

  function showToast(
    message: string,
    type: "success" | "error"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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

    if (!currentPassword) {
      showToast(
        "Current password is required.",
        "error"
      );
      return;
    }

    if (newPassword.length < 8) {
      showToast(
        "New password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      showToast(
        "New passwords do not match.",
        "error"
      );
      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      showToast(
        "New password must be different from your current password.",
        "error"
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await changePassword(
          {
            currentPassword,
            newPassword,
          },
          token
        );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showToast(
        response.message,
        "success"
      );
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to change password.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return null;
  }

  const employee =
    typeof user.employee === "object" &&
    user.employee !== null
      ? (user.employee as {
          firstName?: string;
          lastName?: string;
          phone?: string | null;
          position?: string;
          status?: string;
        })
      : null;

  const employeeName =
    employee
      ? `${employee.firstName ?? ""} ${
          employee.lastName ?? ""
        }`.trim()
      : "";

  return (
    <section className="profile-page">
      <div className="page-header">
        <div>
          <h2>My Profile</h2>

          <p>
            View your account information
            and update your password.
          </p>
        </div>
      </div>

      <div className="profile-layout">
        <aside className="profile-summary-card">
          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-heading">
            <h3>{user.name}</h3>
            <p>{user.email}</p>

            <span className="profile-role-badge">
              {user.role === "ADMIN"
                ? "Administrator"
                : "Staff"}
            </span>
          </div>

          <div className="profile-summary-divider" />

          <div className="profile-summary-list">
            <div>
              <FaShieldAlt />

              <span>
                <small>Account Status</small>
                <strong>
                  {user.status}
                </strong>
              </span>
            </div>

            <div>
              <FaUserTie />

              <span>
                <small>
                  Linked Employee
                </small>

                <strong>
                  {employeeName ||
                    "Not linked"}
                </strong>
              </span>
            </div>

            <div>
              <FaIdBadge />

              <span>
                <small>Member Since</small>

                <strong>
                  {formatDate(
                    user.createdAt
                  )}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="profile-logout-action"
            onClick={logout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </aside>

        <div className="profile-content-column">
          <section className="profile-information-card">
            <div className="profile-section-header">
              <div>
                <h3>
                  Account Information
                </h3>

                <p>
                  Your current login and
                  employee details.
                </p>
              </div>
            </div>

            <div className="profile-information-grid">
              <div>
                <FaUser />

                <span>
                  <small>Full Name</small>
                  <strong>
                    {user.name}
                  </strong>
                </span>
              </div>

              <div>
                <FaEnvelope />

                <span>
                  <small>
                    Email Address
                  </small>
                  <strong>
                    {user.email}
                  </strong>
                </span>
              </div>

              <div>
                <FaShieldAlt />

                <span>
                  <small>Account Role</small>

                  <strong>
                    {user.role === "ADMIN"
                      ? "Administrator"
                      : "Staff"}
                  </strong>
                </span>
              </div>

              <div>
                <FaUserTie />

                <span>
                  <small>
                    Employee Position
                  </small>

                  <strong>
                    {formatPosition(
                      employee?.position
                    )}
                  </strong>
                </span>
              </div>

              <div>
                <FaEnvelope />

                <span>
                  <small>
                    Employee Contact
                  </small>

                  <strong>
                    {employee?.phone ||
                      "Not provided"}
                  </strong>
                </span>
              </div>

              <div>
                <FaIdBadge />

                <span>
                  <small>
                    Employee Record
                  </small>

                  <strong>
                    {user.employeeId
                      ? `Employee #${user.employeeId}`
                      : "Not linked"}
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <section className="profile-password-card">
            <div className="profile-section-header">
              <div>
                <h3>Change Password</h3>

                <p>
                  Enter your current
                  password before choosing
                  a new one.
                </p>
              </div>

              <FaKey />
            </div>

            <form
              className="profile-password-form"
              onSubmit={
                handleChangePassword
              }
            >
              <div className="form-group profile-password-full">
                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
              </div>

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
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="profile-password-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  <FaKey />

                  <span>
                    {isSubmitting
                      ? "Updating..."
                      : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

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

export default ProfilePage;