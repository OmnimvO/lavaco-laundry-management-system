import { useState } from "react";
import "./App.css";
import AppLayout from "./components/AppLayout";
import CustomersPage from "./pages/CustomersPage";
import OrdersPage from "./pages/OrdersPage";

function App() {
  const [activePage, setActivePage] = useState<"customers" | "orders">(
    "customers"
  );

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {activePage === "customers" ? <CustomersPage /> : <OrdersPage />}
    </AppLayout>
  );
}

export default App;