import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  FaBell,
  FaChartPie,
  FaClipboardList,
  FaCog,
  FaCoins,
  FaFileAlt,
  FaHistory,
  FaSignOutAlt,
  FaUserCircle,
  FaUserCog,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import type { ActivePage } from "../App";
import { useAuth } from "../hooks/useAuth";

interface AppLayoutProps {
  activePage: ActivePage;

  onNavigate: (
    page: ActivePage
  ) => void;

  children: ReactNode;
}

function AppLayout({
  activePage,
  onNavigate,
  children,
}: AppLayoutProps) {
  const {
    user,
    isAdmin,
    logout,
  } = useAuth();

  const [
    isProfileMenuOpen,
    setIsProfileMenuOpen,
  ] = useState(false);

  const profileMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  function handleLogout() {
    const confirmed =
      window.confirm(
        "Are you sure you want to log out?"
      );

    if (!confirmed) {
      return;
    }

    setIsProfileMenuOpen(false);
    logout();
  }

  function navigateTo(
    page: ActivePage
  ) {
    setIsProfileMenuOpen(false);
    onNavigate(page);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src="/images/lavaco-logo.png"
            alt="Lava Co. Laundry Hub"
            className="sidebar-logo-image"
          />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-group">
            <span className="sidebar-section-label">
              Main
            </span>

            <button
              type="button"
              className={
                activePage ===
                "dashboard"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() =>
                navigateTo("dashboard")
              }
            >
              <FaChartPie />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="sidebar-nav-group">
            <span className="sidebar-section-label">
              Operations
            </span>

            <button
              type="button"
              className={
                activePage === "orders"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() =>
                navigateTo("orders")
              }
            >
              <FaClipboardList />
              <span>Orders</span>
            </button>

            <button
              type="button"
              className={
                activePage ===
                "customers"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() =>
                navigateTo("customers")
              }
            >
              <FaUsers />
              <span>Customers</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className={
                  activePage ===
                  "employees"
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigateTo("employees")
                }
              >
                <FaUserTie />
                <span>Employees</span>
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="sidebar-nav-group">
              <span className="sidebar-section-label">
                Business
              </span>

              <button
                type="button"
                className={
                  activePage ===
                  "revenue"
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigateTo("revenue")
                }
              >
                <FaCoins />
                <span>Revenue</span>
              </button>

              <button
                type="button"
                className={
                  activePage ===
                  "reports"
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigateTo("reports")
                }
              >
                <FaFileAlt />
                <span>Reports</span>
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="sidebar-nav-group">
              <span className="sidebar-section-label">
                System
              </span>

              <button
                type="button"
                className={
                  activePage ===
                  "auditLogs"
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigateTo("auditLogs")
                }
              >
                <FaHistory />
                <span>Audit Logs</span>
              </button>

              <button
                type="button"
                className={
                  activePage === "users"
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() =>
                  navigateTo("users")
                }
              >
                <FaUserCog />
                <span>User Management</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1>
            Lava Co. Laundry Hub
            Management System
          </h1>

          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-icon-button"
              title="Notifications"
              aria-label="Notifications"
            >
              <FaBell />

              <span className="notification-count">
                0
              </span>
            </button>

            {isAdmin && (
              <button
                type="button"
                className={
                  activePage === "settings"
                    ? "topbar-icon-button active"
                    : "topbar-icon-button"
                }
                title="Settings"
                aria-label="Settings"
                onClick={() =>
                  navigateTo("settings")
                }
              >
                <FaCog />
              </button>
            )}

            <div
              className="profile-menu-container"
              ref={profileMenuRef}
            >
              <button
                type="button"
                className="topbar-profile-button"
                aria-label="Open profile menu"
                aria-expanded={
                  isProfileMenuOpen
                }
                onClick={() =>
                  setIsProfileMenuOpen(
                    (previous) =>
                      !previous
                  )
                }
              >
                <FaUserCircle />

                <span className="topbar-user-details">
                  <strong>
                    {user?.name ??
                      "Account"}
                  </strong>

                  <small>
                    {user?.role ===
                    "ADMIN"
                      ? "Administrator"
                      : "Staff"}
                  </small>
                </span>
              </button>

              {isProfileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <FaUserCircle />

                    <div>
                      <strong>
                        {user?.name}
                      </strong>

                      <span>
                        {user?.email}
                      </span>

                      <small>
                        {user?.role ===
                        "ADMIN"
                          ? "Administrator"
                          : "Staff"}
                      </small>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <button
                    type="button"
                    onClick={() =>
                      navigateTo("profile")
                    }
                  >
                    <FaUserCircle />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    className="profile-logout-button"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;