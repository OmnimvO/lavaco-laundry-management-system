import {
  useState,
} from "react";

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
import InventoryPage from "./pages/InventoryPage";
import ArchivesPage from "./pages/ArchivesPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";

import {
  useAuth,
} from "./hooks/useAuth";

export type ActivePage =
  | "dashboard"
  | "orders"
  | "customers"
  | "employees"
  | "revenue"
  | "reports"
  | "inventory"
  | "auditLogs"
  | "users"
  | "archives"
  | "settings"
  | "profile";

export type OrdersDashboardAction =
  | "ALL"
  | "TODAY"
  | "ACTIVE"
  | "READY"
  | "UNPAID"
  | "CREATE";

export type CustomersDashboardAction =
  | "ALL"
  | "CREATE";

export type DashboardNavigationRequest =
  | {
      id: number;
      page: "orders";
      action:
        OrdersDashboardAction;
    }
  | {
      id: number;
      page: "customers";
      action:
        CustomersDashboardAction;
    }
  | {
      id: number;
      page:
        | "revenue"
        | "reports";
      action: "ALL";
    };

type DashboardDestination =
  | "orders"
  | "customers"
  | "revenue"
  | "reports";

type DashboardAction =
  | OrdersDashboardAction
  | CustomersDashboardAction
  | "ALL";

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

  const [
    dashboardRequest,
    setDashboardRequest,
  ] =
    useState<DashboardNavigationRequest | null>(
      null
    );

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
        "archives",
        "settings",
      ];

    if (
      adminOnlyPages.includes(
        page
      ) &&
      !isAdmin
    ) {
      setActivePage(
        "dashboard"
      );
      return;
    }

    setDashboardRequest(null);
    setActivePage(page);

    if (
      page === "dashboard"
    ) {
      setDashboardRefreshKey(
        (previous) =>
          previous + 1
      );
    }
  }

  function handleDashboardNavigate(
    destination:
      DashboardDestination,

    action:
      DashboardAction = "ALL"
  ) {
    if (
      (
        destination ===
          "revenue" ||
        destination ===
          "reports"
      ) &&
      !isAdmin
    ) {
      setActivePage(
        "dashboard"
      );
      return;
    }

    const requestId =
      Date.now();

    if (
      destination ===
      "orders"
    ) {
      setDashboardRequest({
        id: requestId,
        page: "orders",
        action:
          action as
            OrdersDashboardAction,
      });

      setActivePage("orders");
      return;
    }

    if (
      destination ===
      "customers"
    ) {
      setDashboardRequest({
        id: requestId,
        page: "customers",
        action:
          action as
            CustomersDashboardAction,
      });

      setActivePage(
        "customers"
      );
      return;
    }

    setDashboardRequest({
      id: requestId,
      page: destination,
      action: "ALL",
    });

    setActivePage(
      destination
    );
  }

  function renderDashboard() {
    return (
      <DashboardPage
        refreshKey={
          dashboardRefreshKey
        }
        onNavigate={
          handleDashboardNavigate
        }
      />
    );
  }

  function renderPage() {
    switch (activePage) {
      case "orders":
        return (
          <OrdersPage
            dashboardRequest={
              dashboardRequest
                ?.page ===
              "orders"
                ? dashboardRequest
                : null
            }
          />
        );

      case "customers":
        return (
          <CustomersPage
            dashboardRequest={
              dashboardRequest
                ?.page ===
              "customers"
                ? dashboardRequest
                : null
            }
          />
        );

      case "employees":
        return isAdmin ? (
          <EmployeesPage />
        ) : (
          renderDashboard()
        );

      case "revenue":
        return isAdmin ? (
          <RevenuePage />
        ) : (
          renderDashboard()
        );

      case "reports":
        return isAdmin ? (
          <ReportsPage />
        ) : (
          renderDashboard()
        );

      case "inventory":
        return (
          <InventoryPage />
        );

      case "auditLogs":
        return isAdmin ? (
          <AuditLogsPage />
        ) : (
          renderDashboard()
        );

      case "users":
        return isAdmin ? (
          <UsersPage />
        ) : (
          renderDashboard()
        );

      case "archives":
        return isAdmin ? (
          <ArchivesPage />
        ) : (
          renderDashboard()
        );

      case "settings":
        return isAdmin ? (
          <SettingsPage />
        ) : (
          renderDashboard()
        );

      case "profile":
        return (
          <ProfilePage />
        );

      case "dashboard":
      default:
        return renderDashboard();
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
      onNavigate={
        handleNavigate
      }
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;