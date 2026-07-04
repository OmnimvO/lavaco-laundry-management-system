import type { ReactNode } from "react";

interface AppLayoutProps {
  activePage: "customers" | "orders";
  onNavigate: (page: "customers" | "orders") => void;
  children: ReactNode;
}

function AppLayout({ activePage, onNavigate, children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2 className="logo">Lavaco</h2>

        <nav className="sidebar-nav">
          <button
            className={activePage === "customers" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("customers")}
          >
            Customers
          </button>

          <button
            className={activePage === "orders" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("orders")}
          >
            Orders
          </button>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1>Lavaco Laundry Management System</h1>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;