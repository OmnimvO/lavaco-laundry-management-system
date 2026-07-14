import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  FaBell,
  FaBoxes,
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
  FaArchive,
  FaCheckDouble,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";

import type {
  ActivePage,
} from "../App";

import {
  useAuth,
} from "../hooks/useAuth";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notificationApi";

import type {
  NotificationItem,
} from "../types/notification";

interface AppLayoutProps {
  activePage: ActivePage;

  onNavigate: (
    page: ActivePage
  ) => void;

  children: ReactNode;
}

function formatNotificationDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function AppLayout({
  activePage,
  onNavigate,
  children,
}: AppLayoutProps) {
  const {
    user,
    token,
    isAdmin,
    logout,
  } = useAuth();

  const [
    isProfileMenuOpen,
    setIsProfileMenuOpen,
  ] = useState(false);

  const [
    isNotificationMenuOpen,
    setIsNotificationMenuOpen,
  ] = useState(false);

  const [
    isSettingsMenuOpen,
    setIsSettingsMenuOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationItem[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);

  const [
    notificationError,
    setNotificationError,
  ] = useState<
    string | null
  >(null);

  const profileMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const notificationMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const settingsMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const loadNotifications =
    useCallback(
      async (
        showLoading = false
      ) => {
        if (
          typeof token !== "string" ||
          !token.trim()
        ) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        try {
          if (showLoading) {
            setNotificationLoading(
              true
            );
          }

          setNotificationError(
            null
          );

          const result =
            await getNotifications(
              token
            );

          setNotifications(
            Array.isArray(
              result.notifications
            )
              ? result.notifications
              : []
          );

          setUnreadCount(
            Number(
              result.unreadCount
            ) || 0
          );
        } catch (error) {
          setNotificationError(
            error instanceof Error
              ? error.message
              : "Failed to load notifications."
          );
        } finally {
          if (showLoading) {
            setNotificationLoading(
              false
            );
          }
        }
      },
      [token]
    );

  useEffect(() => {
    void loadNotifications();

    const intervalId =
      window.setInterval(
        () => {
          void loadNotifications();
        },
        30000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        profileMenuRef.current &&
        !profileMenuRef.current
          .contains(target)
      ) {
        setIsProfileMenuOpen(
          false
        );
      }

      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current
          .contains(target)
      ) {
        setIsNotificationMenuOpen(
          false
        );
      }

      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current
          .contains(target)
      ) {
        setIsSettingsMenuOpen(
          false
        );
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

    closeMenus();
    logout();
  }

  function closeMenus() {
    setIsProfileMenuOpen(
      false
    );

    setIsNotificationMenuOpen(
      false
    );

    setIsSettingsMenuOpen(
      false
    );
  }

  function navigateTo(
    page: ActivePage
  ) {
    closeMenus();
    onNavigate(page);
  }

  async function markNotificationRead(
    notificationId: number
  ) {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      return;
    }

    try {
      await markNotificationAsRead(
        notificationId,
        token
      );

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    isRead: true,
                  }
                : notification
          )
      );

      setUnreadCount(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Failed to update notification."
      );
    }
  }

  async function markAllNotificationsRead() {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      return;
    }

    try {
      await markAllNotificationsAsRead(
        token
      );

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              isRead: true,
            })
          )
      );

      setUnreadCount(0);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Failed to update notifications."
      );
    }
  }

  function toggleNotifications() {
    setIsProfileMenuOpen(false);
    setIsSettingsMenuOpen(false);

    setIsNotificationMenuOpen(
      (current) => {
        const next = !current;

        if (next) {
          void loadNotifications(
            true
          );
        }

        return next;
      }
    );
  }

  function toggleSettings() {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(
      false
    );

    setIsSettingsMenuOpen(
      (current) =>
        !current
    );
  }

  function toggleProfile() {
    setIsNotificationMenuOpen(
      false
    );

    setIsSettingsMenuOpen(
      false
    );

    setIsProfileMenuOpen(
      (current) =>
        !current
    );
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
                navigateTo(
                  "dashboard"
                )
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
                activePage ===
                "orders"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() =>
                navigateTo(
                  "orders"
                )
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
                navigateTo(
                  "customers"
                )
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
                  navigateTo(
                    "employees"
                  )
                }
              >
                <FaUserTie />
                <span>Employees</span>
              </button>
            )}

            <button
              type="button"
              className={
                activePage ===
                "inventory"
                  ? "nav-link active"
                  : "nav-link"
              }
              onClick={() =>
                navigateTo(
                  "inventory"
                )
              }
            >
              <FaBoxes />
              <span>Inventory</span>
            </button>
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
                  navigateTo(
                    "revenue"
                  )
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
                  navigateTo(
                    "reports"
                  )
                }
              >
                <FaFileAlt />
                <span>Reports</span>
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
            <div
              className="topbar-menu-container"
              ref={
                notificationMenuRef
              }
            >
              <button
                type="button"
                className={
                  isNotificationMenuOpen
                    ? "topbar-icon-button active"
                    : "topbar-icon-button"
                }
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={
                  isNotificationMenuOpen
                }
                onClick={
                  toggleNotifications
                }
              >
                <FaBell />

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationMenuOpen && (
                <div className="topbar-dropdown notification-dropdown">
                  <div className="topbar-dropdown-header">
                    <div>
                      <strong>
                        Notifications
                      </strong>

                      <span>
                        {unreadCount} unread
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="dropdown-text-button"
                        onClick={() =>
                          void markAllNotificationsRead()
                        }
                      >
                        <FaCheckDouble />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notificationError && (
                    <div className="notification-error">
                      <FaExclamationTriangle />
                      <span>
                        {notificationError}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setNotificationError(
                            null
                          )
                        }
                        aria-label="Dismiss notification error"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}

                  <div className="notification-list">
                    {notificationLoading ? (
                      <div className="notification-empty">
                        Loading notifications...
                      </div>
                    ) : notifications.length ===
                      0 ? (
                      <div className="notification-empty">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications
                        .slice(0, 12)
                        .map(
                          (
                            notification
                          ) => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              className={`notification-item ${
                                notification.isRead
                                  ? "is-read"
                                  : "is-unread"
                              } ${
                                notification.isResolved
                                  ? "is-resolved"
                                  : ""
                              }`}
                              onClick={() => {
                                if (
                                  !notification.isRead
                                ) {
                                  void markNotificationRead(
                                    notification.id
                                  );
                                }
                              }}
                            >
                              <span className="notification-item-indicator" />

                              <div>
                                <strong>
                                  {
                                    notification.title
                                  }
                                </strong>

                                <p>
                                  {
                                    notification.message
                                  }
                                </p>

                                <small>
                                  {formatNotificationDate(
                                    notification.createdAt
                                  )}
                                  {notification.isResolved
                                    ? " · Resolved"
                                    : ""}
                                </small>
                              </div>
                            </button>
                          )
                        )
                    )}
                  </div>
                </div>
              )}
            </div>

            {isAdmin && (
              <div
                className="topbar-menu-container"
                ref={
                  settingsMenuRef
                }
              >
                <button
                  type="button"
                  className={
                    activePage ===
                      "settings" ||
                    activePage ===
                      "users" ||
                    activePage ===
                      "auditLogs" ||
                    activePage ===
                      "archives" ||
                    isSettingsMenuOpen
                      ? "topbar-icon-button active"
                      : "topbar-icon-button"
                  }
                  title="Settings"
                  aria-label="Settings"
                  aria-expanded={
                    isSettingsMenuOpen
                  }
                  onClick={
                    toggleSettings
                  }
                >
                  <FaCog />
                </button>

                {isSettingsMenuOpen && (
                  <div className="topbar-dropdown settings-dropdown">
                    <div className="topbar-dropdown-header">
                      <div>
                        <strong>
                          Administration
                        </strong>

                        <span>
                          System settings and records
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        activePage ===
                        "settings"
                          ? "settings-menu-item active"
                          : "settings-menu-item"
                      }
                      onClick={() =>
                        navigateTo(
                          "settings"
                        )
                      }
                    >
                      <FaCog />

                      <div>
                        <strong>
                          General, Pricing &
                          Operations
                        </strong>

                        <span>
                          Shop details, fees,
                          load and tank settings
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        activePage ===
                        "users"
                          ? "settings-menu-item active"
                          : "settings-menu-item"
                      }
                      onClick={() =>
                        navigateTo(
                          "users"
                        )
                      }
                    >
                      <FaUserCog />

                      <div>
                        <strong>
                          User Management
                        </strong>

                        <span>
                          Admin and staff accounts
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        activePage ===
                        "auditLogs"
                          ? "settings-menu-item active"
                          : "settings-menu-item"
                      }
                      onClick={() =>
                        navigateTo(
                          "auditLogs"
                        )
                      }
                    >
                      <FaHistory />

                      <div>
                        <strong>
                          Audit Logs
                        </strong>

                        <span>
                          Review system activity
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={
                        activePage ===
                        "archives"
                          ? "settings-menu-item active"
                          : "settings-menu-item"
                      }
                      onClick={() =>
                        navigateTo(
                          "archives"
                        )
                      }
                    >
                      <FaArchive />

                      <div>
                        <strong>
                          Archives
                        </strong>

                        <span>
                          Restore archived records
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
                onClick={
                  toggleProfile
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
                      navigateTo(
                        "profile"
                      )
                    }
                  >
                    <FaUserCircle />
                    <span>
                      My Profile
                    </span>
                  </button>

                  <button
                    type="button"
                    className="profile-logout-button"
                    onClick={
                      handleLogout
                    }
                  >
                    <FaSignOutAlt />
                    <span>
                      Logout
                    </span>
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