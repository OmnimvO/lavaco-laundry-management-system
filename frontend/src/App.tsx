import { useState } from "react";
import "./App.css";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";

type ActivePage =
  | "dashboard"
  | "customers"
  | "orders";

function App() {
  const [activePage, setActivePage] =
    useState<ActivePage>("dashboard");

  const [dashboardRefreshKey, setDashboardRefreshKey] =
    useState(0);

  function handleNavigate(page: ActivePage) {
    setActivePage(page);

    if (page === "dashboard") {
      setDashboardRefreshKey((previous) => previous + 1);
    }
  }

  function renderPage() {
    switch (activePage) {
      case "customers":
        return <CustomersPage />;

      case "orders":
        return <OrdersPage />;

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