import type { ReactNode } from "react";
import {
  FaChartPie,
  FaUsers,
  FaClipboardList,
} from "react-icons/fa";

type ActivePage =
  | "dashboard"
  | "customers"
  | "orders";

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
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1>
            Lava Co. Laundry Hub Management System
          </h1>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;