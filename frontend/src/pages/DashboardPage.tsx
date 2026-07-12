import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaClipboardCheck,
  FaClock,
  FaCoins,
  FaMoneyBillWave,
  FaTshirt,
} from "react-icons/fa";

import { getOrders } from "../api/orderApi";

import type { Order } from "../types/order";

import {
  ORDER_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";

import { useAuth } from "../hooks/useAuth";

type DashboardPageProps = {
  refreshKey: number;
};

function formatCurrency(
  value: number
) {
  return `₱${Number(
    value || 0
  ).toFixed(2)}`;
}

function getLabel(
  options: {
    value: string;
    label: string;
  }[],
  value: string
) {
  return (
    options.find(
      (option) =>
        option.value === value
    )?.label ?? value
  );
}

function isSameDay(
  firstDate: string,
  secondDate: Date
) {
  const date = new Date(firstDate);

  return (
    date.getFullYear() ===
      secondDate.getFullYear() &&
    date.getMonth() ===
      secondDate.getMonth() &&
    date.getDate() ===
      secondDate.getDate()
  );
}

function isWithinDateRange(
  value: string,
  startDate: Date,
  endDate: Date
) {
  const date = new Date(value);

  return (
    date.getTime() >=
      startDate.getTime() &&
    date.getTime() <=
      endDate.getTime()
  );
}

function getRevenueDate(
  order: Order
) {
  return (
    order.paidAt ??
    order.createdAt
  );
}

function formatDashboardDate(
  value: Date
) {
  return value.toLocaleDateString(
    "en-PH",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatOrderDate(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Invalid date";
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

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function DashboardPage({
  refreshKey,
}: DashboardPageProps) {
  const { user } = useAuth();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const ordersData =
          await getOrders();

        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : []
        );
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

  const dashboardData =
    useMemo(() => {
      const now = new Date();

      const startOfToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      const startOfWeek =
        new Date(startOfToday);

      startOfWeek.setDate(
        startOfToday.getDate() -
          startOfToday.getDay()
      );

      const startOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const todayOrders =
        orders.filter((order) =>
          isSameDay(
            order.createdAt,
            now
          )
        );

      const activeOrders =
        orders.filter(
          (order) =>
            order.status !==
              "COMPLETED" &&
            order.status !==
              "CANCELLED"
        );

      const readyOrders =
        orders.filter(
          (order) =>
            order.status ===
              "READY_FOR_PICKUP" ||
            order.status ===
              "OUT_FOR_DELIVERY"
        );

      const completedToday =
        orders.filter(
          (order) =>
            order.status ===
              "COMPLETED" &&
            isSameDay(
              order.updatedAt ??
                order.createdAt,
              now
            )
        );

      const unpaidOrders =
        orders.filter(
          (order) =>
            order.paymentStatus ===
              "UNPAID" &&
            order.status !==
              "CANCELLED"
        );

      const paidOrders =
        orders.filter(
          (order) =>
            order.paymentStatus ===
              "PAID" &&
            order.status !==
              "CANCELLED"
        );

      const todayPaidRevenue =
        paidOrders
          .filter((order) =>
            isSameDay(
              getRevenueDate(order),
              now
            )
          )
          .reduce(
            (total, order) =>
              total +
              Number(
                order.totalPrice || 0
              ),
            0
          );

      const weekPaidRevenue =
        paidOrders
          .filter((order) =>
            isWithinDateRange(
              getRevenueDate(order),
              startOfWeek,
              now
            )
          )
          .reduce(
            (total, order) =>
              total +
              Number(
                order.totalPrice || 0
              ),
            0
          );

      const monthPaidRevenue =
        paidOrders
          .filter((order) =>
            isWithinDateRange(
              getRevenueDate(order),
              startOfMonth,
              now
            )
          )
          .reduce(
            (total, order) =>
              total +
              Number(
                order.totalPrice || 0
              ),
            0
          );

      const unpaidBalance =
        unpaidOrders.reduce(
          (total, order) =>
            total +
            Number(
              order.totalPrice || 0
            ),
          0
        );

      const recentOrders =
        [...orders]
          .sort(
            (
              firstOrder,
              secondOrder
            ) =>
              new Date(
                secondOrder.createdAt
              ).getTime() -
              new Date(
                firstOrder.createdAt
              ).getTime()
          )
          .slice(0, 7);

      const statusCounts =
        ORDER_STATUSES.map(
          (status) => ({
            ...status,

            count:
              orders.filter(
                (order) =>
                  order.status ===
                  status.value
              ).length,
          })
        );

      const servicePerformance =
        SERVICE_TYPES.map(
          (service) => {
            const serviceOrders =
              orders.filter(
                (order) =>
                  order.serviceType ===
                    service.value &&
                  order.status !==
                    "CANCELLED"
              );

            const revenue =
              serviceOrders
                .filter(
                  (order) =>
                    order.paymentStatus ===
                    "PAID"
                )
                .reduce(
                  (
                    total,
                    order
                  ) =>
                    total +
                    Number(
                      order.totalPrice ||
                        0
                    ),
                  0
                );

            return {
              ...service,
              orderCount:
                serviceOrders.length,
              revenue,
            };
          }
        )
          .filter(
            (service) =>
              service.orderCount > 0
          )
          .sort(
            (
              firstService,
              secondService
            ) =>
              secondService.orderCount -
              firstService.orderCount
          )
          .slice(0, 5);

      return {
        todayOrders,
        activeOrders,
        readyOrders,
        completedToday,
        unpaidOrders,

        todayPaidRevenue,
        weekPaidRevenue,
        monthPaidRevenue,
        unpaidBalance,

        recentOrders,
        statusCounts,
        servicePerformance,
      };
    }, [orders]);

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-loading">
          Loading dashboard...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-error">
          <h2>
            Dashboard unavailable
          </h2>

          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span>
            {getGreeting()},
          </span>

          <h2>
            {user?.name ??
              "Lava Co. Team"}
          </h2>

          <p>
            Here is today&apos;s
            laundry shop overview.
          </p>
        </div>

        <div className="dashboard-date-card">
          <FaClock />

          <span>
            {formatDashboardDate(
              new Date()
            )}
          </span>
        </div>
      </div>

      <div className="dashboard-summary-grid dashboard-primary-summary">
        <article className="dashboard-summary-card">
          <div className="dashboard-card-icon">
            <FaTshirt />
          </div>

          <span>Orders Today</span>

          <strong>
            {
              dashboardData
                .todayOrders.length
            }
          </strong>

          <small>
            New laundry transactions
          </small>
        </article>

        <article className="dashboard-summary-card">
          <div className="dashboard-card-icon">
            <FaClock />
          </div>

          <span>Active Orders</span>

          <strong>
            {
              dashboardData
                .activeOrders.length
            }
          </strong>

          <small>
            Currently being processed
          </small>
        </article>

        <article className="dashboard-summary-card">
          <div className="dashboard-card-icon">
            <FaClipboardCheck />
          </div>

          <span>Ready / Delivery</span>

          <strong>
            {
              dashboardData
                .readyOrders.length
            }
          </strong>

          <small>
            Ready for release
          </small>
        </article>

        <article className="dashboard-summary-card">
          <div className="dashboard-card-icon">
            <FaMoneyBillWave />
          </div>

          <span>Unpaid Orders</span>

          <strong>
            {
              dashboardData
                .unpaidOrders.length
            }
          </strong>

          <small>
            {formatCurrency(
              dashboardData
                .unpaidBalance
            )}{" "}
            outstanding
          </small>
        </article>

        <article className="dashboard-summary-card dashboard-revenue-card">
          <div className="dashboard-card-icon">
            <FaCoins />
          </div>

          <span>
            Paid Revenue Today
          </span>

          <strong>
            {formatCurrency(
              dashboardData
                .todayPaidRevenue
            )}
          </strong>

          <small>
            Completed paid transactions
          </small>
        </article>
      </div>

      <div className="dashboard-revenue-overview">
        <article>
          <span>
            Revenue This Week
          </span>

          <strong>
            {formatCurrency(
              dashboardData
                .weekPaidRevenue
            )}
          </strong>
        </article>

        <article>
          <span>
            Revenue This Month
          </span>

          <strong>
            {formatCurrency(
              dashboardData
                .monthPaidRevenue
            )}
          </strong>
        </article>

        <article>
          <span>
            Completed Today
          </span>

          <strong>
            {
              dashboardData
                .completedToday.length
            }
          </strong>
        </article>

        <article>
          <span>
            Outstanding Balance
          </span>

          <strong>
            {formatCurrency(
              dashboardData
                .unpaidBalance
            )}
          </strong>
        </article>
      </div>

      <div className="dashboard-content-grid dashboard-main-content">
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Recent Orders</h3>

              <p>
                Latest laundry
                transactions.
              </p>
            </div>
          </div>

          {dashboardData
            .recentOrders.length ===
          0 ? (
            <p>
              No orders available yet.
            </p>
          ) : (
            <div className="dashboard-recent-list">
              {dashboardData
                .recentOrders.map(
                  (order) => {
                    const customerName =
                      order.customer
                        ?.name ??
                      order.walkInCustomerName ??
                      "Unknown Customer";

                    return (
                      <article
                        key={order.id}
                        className="dashboard-recent-order"
                      >
                        <div>
                          <strong>
                            {
                              order.orderNumber
                            }
                          </strong>

                          <span>
                            {customerName}
                          </span>

                          <small>
                            {formatOrderDate(
                              order.createdAt
                            )}
                          </small>
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

                          <small
                            className={`dashboard-payment-text payment-text-${order.paymentStatus.toLowerCase()}`}
                          >
                            {
                              order.paymentStatus
                            }
                          </small>
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
                Current workflow
                distribution.
              </p>
            </div>
          </div>

          <div className="dashboard-status-list">
            {dashboardData
              .statusCounts.map(
                (status) => (
                  <div
                    key={status.value}
                    className="dashboard-status-row"
                  >
                    <span>
                      {status.label}
                    </span>

                    <strong>
                      {status.count}
                    </strong>
                  </div>
                )
              )}
          </div>
        </section>
      </div>

      <section className="dashboard-panel dashboard-service-panel">
        <div className="dashboard-panel-header">
          <div>
            <h3>
              Most Used Services
            </h3>

            <p>
              Order count and paid
              revenue by service.
            </p>
          </div>
        </div>

        {dashboardData
          .servicePerformance.length ===
        0 ? (
          <p>
            No service data available
            yet.
          </p>
        ) : (
          <div className="dashboard-service-grid">
            {dashboardData
              .servicePerformance.map(
                (service) => (
                  <article
                    key={service.value}
                    className="dashboard-service-card"
                  >
                    <span>
                      {service.label}
                    </span>

                    <strong>
                      {
                        service.orderCount
                      }{" "}
                      order
                      {service.orderCount ===
                      1
                        ? ""
                        : "s"}
                    </strong>

                    <small>
                      {formatCurrency(
                        service.revenue
                      )}{" "}
                      paid revenue
                    </small>
                  </article>
                )
              )}
          </div>
        )}
      </section>
    </section>
  );
}

export default DashboardPage;