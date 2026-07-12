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

export type ActivePage =
  | "dashboard"
  | "customers"
  | "orders"
  | "revenue"
  | "auditLogs"
  | "reports"
  | "employees"
  | "notifications"
  | "settings"
  | "profile";

function App() {
  const [activePage, setActivePage] =
    useState<ActivePage>("dashboard");

  const [
    dashboardRefreshKey,
    setDashboardRefreshKey,
  ] = useState(0);

  function handleNavigate(page: ActivePage) {
    setActivePage(page);

    if (page === "dashboard") {
      setDashboardRefreshKey(
        (previous) => previous + 1
      );
    }
  }

  function renderPage() {
    switch (activePage) {
      case "customers":
        return <CustomersPage />;

      case "orders":
        return <OrdersPage />;

      case "revenue":
        return <RevenuePage />;
      
      case "auditLogs":
        return <AuditLogsPage />;

      case "reports":
        return <ReportsPage />;

      case "employees":
        return <EmployeesPage />;

      case "dashboard":
      default:
        return (
          <DashboardPage
            refreshKey={dashboardRefreshKey}
          />
        );
    }
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