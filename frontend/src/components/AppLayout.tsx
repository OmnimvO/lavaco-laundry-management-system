import type { ReactNode } from "react";
import {
  FaChartPie,
  FaUsers,
  FaClipboardList,
  FaCoins,
  FaHistory,
  FaFileAlt,
  FaUserTie,
  FaBell,
  FaCog,
  FaUserCircle,
} from "react-icons/fa";
import type { ActivePage } from "../App";

interface AppLayoutProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  children: ReactNode;
}

function AppLayout({
  activePage,
  onNavigate,
  children,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2 className="logo">Lava Co.</h2>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={
              activePage === "dashboard"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("dashboard")
            }
          >
            <FaChartPie />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={
              activePage === "orders"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("orders")
            }
          >
            <FaClipboardList />
            <span>Orders</span>
          </button>

          <button
            type="button"
            className={
              activePage === "revenue"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("revenue")
            }
          >
            <FaCoins />
            <span>Revenue</span>
          </button>

          <button
            type="button"
            className={
              activePage === "reports"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("reports")
            }
          >
            <FaFileAlt />
            <span>Reports</span>
          </button>

          <button
            type="button"
            className={
              activePage === "employees"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("employees")
            }
          >
            <FaUserTie />
            <span>Employees</span>
          </button>

          <button
            type="button"
            className={
              activePage === "customers"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("customers")
            }
          >
            <FaUsers />
            <span>Customers</span>
          </button>

          <button
            type="button"
            className={
              activePage === "auditLogs"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              onNavigate("auditLogs")
            }
          >
            <FaHistory />
            <span>Audit Logs</span>
          </button>

        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1>
            Lava Co. Laundry Hub Management System
          </h1>

          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-icon-button"
              title="Notifications"
              aria-label="Notifications"
              onClick={() =>
                onNavigate("notifications")
              }
            >
              <FaBell />

              <span className="notification-count">
                3
              </span>
            </button>

            <button
              type="button"
              className="topbar-icon-button"
              title="Settings"
              aria-label="Settings"
              onClick={() =>
                onNavigate("settings")
              }
            >
              <FaCog />
            </button>

            <button
              type="button"
              className="topbar-icon-button"
              title="Profile"
              aria-label="Profile"
              onClick={() =>
                onNavigate("profile")
              }
            >
              <FaUserCircle />
            </button>
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