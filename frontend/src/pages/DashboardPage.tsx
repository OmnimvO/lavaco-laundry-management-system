import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../api/orderApi";
import type { Order } from "../types/order";
import {
  ORDER_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";

type DashboardPageProps = {
  refreshKey: number;
};

function formatCurrency(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function getLabel(
  options: { value: string; label: string }[],
  value: string
) {
  return (
    options.find((option) => option.value === value)?.label ??
    value
  );
}

function isSameDay(firstDate: string, secondDate: Date) {
  const date = new Date(firstDate);

  return (
    date.getFullYear() === secondDate.getFullYear() &&
    date.getMonth() === secondDate.getMonth() &&
    date.getDate() === secondDate.getDate()
  );
}

function DashboardPage({
  refreshKey,
}: DashboardPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const ordersData = await getOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error(
          "Failed to load dashboard:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [refreshKey]);

  const dashboardData = useMemo(() => {
    const today = new Date();

    const todayOrders = orders.filter((order) =>
      isSameDay(order.createdAt, today)
    );

    const activeOrders = orders.filter(
      (order) =>
        order.status !== "COMPLETED" &&
        order.status !== "CANCELLED"
    );

    const readyOrders = orders.filter(
      (order) =>
        order.status === "READY_FOR_PICKUP" ||
        order.status === "OUT_FOR_DELIVERY"
    );

    const unpaidOrders = orders.filter(
      (order) =>
        order.paymentStatus === "UNPAID"
    );

    const todayPaidRevenue = todayOrders
      .filter(
        (order) =>
          order.paymentStatus === "PAID"
      )
      .reduce(
        (total, order) =>
          total + Number(order.totalPrice || 0),
        0
      );

    const recentOrders = [...orders]
      .sort(
        (firstOrder, secondOrder) =>
          new Date(
            secondOrder.createdAt
          ).getTime() -
          new Date(
            firstOrder.createdAt
          ).getTime()
      )
      .slice(0, 6);

    const statusCounts = ORDER_STATUSES.map(
      (status) => ({
        ...status,
        count: orders.filter(
          (order) =>
            order.status === status.value
        ).length,
      })
    );

    return {
      todayOrders,
      activeOrders,
      readyOrders,
      unpaidOrders,
      todayPaidRevenue,
      recentOrders,
      statusCounts,
    };
  }, [orders]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (errorMessage) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-error">
          <h2>Dashboard unavailable</h2>
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>

          <p>
            Overview of Lava Co. Laundry Hub
            operations.
          </p>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <article className="dashboard-summary-card">
          <span>Orders Today</span>

          <strong>
            {dashboardData.todayOrders.length}
          </strong>
        </article>

        <article className="dashboard-summary-card">
          <span>Active Orders</span>

          <strong>
            {dashboardData.activeOrders.length}
          </strong>
        </article>

        <article className="dashboard-summary-card">
          <span>Ready / Delivery</span>

          <strong>
            {dashboardData.readyOrders.length}
          </strong>
        </article>

        <article className="dashboard-summary-card">
          <span>Unpaid Orders</span>

          <strong>
            {dashboardData.unpaidOrders.length}
          </strong>
        </article>

        <article className="dashboard-summary-card dashboard-revenue-card">
          <span>Paid Revenue Today</span>

          <strong>
            {formatCurrency(
              dashboardData.todayPaidRevenue
            )}
          </strong>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Recent Orders</h3>
              <p>Latest laundry transactions.</p>
            </div>
          </div>

          {dashboardData.recentOrders.length === 0 ? (
            <p>No orders available yet.</p>
          ) : (
            <div className="dashboard-recent-list">
              {dashboardData.recentOrders.map(
                (order) => {
                  const customerName =
                    order.customer?.name ??
                    order.walkInCustomerName ??
                    "Unknown Customer";

                  return (
                    <article
                      key={order.id}
                      className="dashboard-recent-order"
                    >
                      <div>
                        <strong>
                          {order.orderNumber}
                        </strong>

                        <span>{customerName}</span>
                      </div>

                      <div>
                        <span>
                          {getLabel(
                            SERVICE_TYPES,
                            order.serviceType
                          )}
                        </span>

                        <strong>
                          {formatCurrency(
                            order.totalPrice
                          )}
                        </strong>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Order Status</h3>

              <p>
                Current workflow distribution.
              </p>
            </div>
          </div>

          <div className="dashboard-status-list">
            {dashboardData.statusCounts.map(
              (status) => (
                <div
                  key={status.value}
                  className="dashboard-status-row"
                >
                  <span>{status.label}</span>
                  <strong>{status.count}</strong>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export default DashboardPage;