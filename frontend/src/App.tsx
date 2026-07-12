import { useState } from "react";
import "./App.css";

import AppLayout from "./components/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";
import RevenuePage from "./pages/RevenuePage";
import ReportsPage from "./pages/ReportsPage";
import EmployeesPage from "./pages/EmployeesPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";

import { useAuth } from "./hooks/useAuth";

export type ActivePage =
  | "dashboard"
  | "orders"
  | "customers"
  | "employees"
  | "revenue"
  | "reports"
  | "auditLogs"
  | "users"
  | "settings"
  | "profile";

function App() {
  const {
    loading,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const [
    activePage,
    setActivePage,
  ] = useState<ActivePage>(
    "dashboard"
  );

  const [
    dashboardRefreshKey,
    setDashboardRefreshKey,
  ] = useState(0);

  function handleNavigate(
    page: ActivePage
  ) {
    const adminOnlyPages:
      ActivePage[] = [
        "employees",
        "revenue",
        "reports",
        "auditLogs",
        "users",
        "settings",
      ];

    if (
      adminOnlyPages.includes(page) &&
      !isAdmin
    ) {
      setActivePage("dashboard");
      return;
    }

    setActivePage(page);

    if (page === "dashboard") {
      setDashboardRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  function renderPage() {
    switch (activePage) {
      case "orders":
        return <OrdersPage />;

      case "customers":
        return <CustomersPage />;

      case "employees":
        return isAdmin ? (
          <EmployeesPage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "revenue":
        return isAdmin ? (
          <RevenuePage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "reports":
        return isAdmin ? (
          <ReportsPage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "auditLogs":
        return isAdmin ? (
          <AuditLogsPage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "users":
        return isAdmin ? (
          <UsersPage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "settings":
        return isAdmin ? (
          <SettingsPage />
        ) : (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );

      case "profile":
        return <ProfilePage />;

      case "dashboard":
      default:
        return (
          <DashboardPage
            refreshKey={
              dashboardRefreshKey
            }
          />
        );
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-loading">
          Checking your session...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={handleNavigate}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;