import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowRight,
  FaChartLine,
  FaClipboardCheck,
  FaClock,
  FaCoins,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlus,
  FaShoppingBasket,
  FaSyncAlt,
  FaTshirt,
  FaTint,
  FaExclamationTriangle,
  FaUserPlus,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

import { getOrders } from "../api/orderApi";
import { getTankStatus } from "../api/tankCycleApi";
import type { Order } from "../types/order";
import type { TankStatus } from "../types/tankCycle";
import {
  ORDER_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";
import { useAuth } from "../hooks/useAuth";

type DashboardDestination =
  | "orders"
  | "customers"
  | "revenue"
  | "reports";

type DashboardAction =
  | "ALL"
  | "TODAY"
  | "ACTIVE"
  | "READY"
  | "UNPAID"
  | "CREATE";

type DashboardPageProps = {
  refreshKey: number;
  onNavigate?: (
    destination: DashboardDestination,
    action?: DashboardAction
  ) => void;
};

type DailyRevenue = {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  orderCount: number;
};

type CustomerPerformance = {
  key: string;
  name: string;
  orderCount: number;
  paidRevenue: number;
};

type EmptyStateProps = {
  title: string;
  description: string;
};

const ACTIVE_ORDER_STATUSES = [
  "RECEIVED",
  "WASHING",
  "DRYING",
  "FOLDING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
];

function formatCurrency(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function getLabel(
  options: { value: string; label: string }[],
  value: string
) {
  return (
    options.find(
      (option) => option.value === value
    )?.label ?? value
  );
}

function getValidDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isSameDay(
  firstDate: string,
  secondDate: Date
) {
  const date = getValidDate(firstDate);

  if (!date) {
    return false;
  }

  return (
    date.getFullYear() ===
      secondDate.getFullYear() &&
    date.getMonth() ===
      secondDate.getMonth() &&
    date.getDate() === secondDate.getDate()
  );
}

function isWithinDateRange(
  value: string,
  startDate: Date,
  endDate: Date
) {
  const date = getValidDate(value);

  if (!date) {
    return false;
  }

  return (
    date.getTime() >= startDate.getTime() &&
    date.getTime() <= endDate.getTime()
  );
}

function getRevenueDate(order: Order) {
  return order.paidAt ?? order.createdAt;
}

function formatDashboardDate(value: Date) {
  return value.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatOrderDate(value: string) {
  const date = getValidDate(value);

  if (!date) {
    return "Invalid date";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatUpdatedTime(value: Date | null) {
  if (!value) {
    return "Not updated yet";
  }

  return value.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getStartOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );
}

function getDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");
  const day = String(value.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function getCustomerName(order: Order) {
  return (
    order.customer?.name ??
    order.walkInCustomerName ??
    "Unknown Customer"
  );
}

function getCustomerKey(order: Order) {
  if (order.customerId) {
    return `customer-${order.customerId}`;
  }

  const name =
    order.walkInCustomerName
      ?.trim()
      .toLowerCase() || "unknown";

  const phone =
    order.walkInCustomerPhone
      ?.trim()
      .toLowerCase() || "no-phone";

  return `walk-in-${name}-${phone}`;
}

function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-icon">
        <FaTshirt />
      </div>

      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DashboardPage({
  refreshKey,
  onNavigate,
}: DashboardPageProps) {
  const {
    user,
    token,
  } = useAuth();

  const [orders, setOrders] =
    useState<Order[]>([]);
  const [tankStatus, setTankStatus] =
    useState<TankStatus | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadDashboard = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh || orders.length > 0) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage(null);

        if (
          typeof token !== "string" ||
          !token.trim()
        ) {
          throw new Error(
            "Your session is unavailable. Please log in again."
          );
        }

        const [ordersData, tankData] =
          await Promise.all([
            getOrders(token),
            getTankStatus(token),
          ]);

        setTankStatus(tankData);
        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : []
        );
        setLastUpdated(new Date());
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
        setRefreshing(false);
      }
    },
    [orders.length, token]
  );

  useEffect(() => {
    void loadDashboard(false);
  }, [refreshKey, loadDashboard]);

  const navigateTo = useCallback(
    (
      destination: DashboardDestination,
      action: DashboardAction = "ALL"
    ) => {
      if (onNavigate) {
        onNavigate(destination, action);
        return;
      }

      const navigationLabels: Record<
        DashboardDestination,
        string
      > = {
        orders: "Orders",
        customers: "Customers",
        revenue: "Revenue",
        reports: "Reports",
      };

      const matchingNavigationButton =
        Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            ".nav-link"
          )
        ).find(
          (button) =>
            button.textContent
              ?.trim()
              .includes(
                navigationLabels[destination]
              )
        );

      if (matchingNavigationButton) {
        matchingNavigationButton.click();
        return;
      }

      window.location.assign(`/${destination}`);
    },
    [onNavigate]
  );

  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfToday = getStartOfDay(now);
    const startOfWeek = new Date(startOfToday);

    startOfWeek.setDate(
      startOfToday.getDate() -
        startOfToday.getDay()
    );

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const validOrders = orders.filter(
      (order) => order.status !== "CANCELLED"
    );

    const todayOrders = validOrders.filter(
      (order) =>
        isSameDay(order.createdAt, now)
    );

    const activeOrders = validOrders.filter(
      (order) =>
        ACTIVE_ORDER_STATUSES.includes(
          order.status
        )
    );

    const readyOrders = validOrders.filter(
      (order) =>
        order.status === "READY_FOR_PICKUP" ||
        order.status === "OUT_FOR_DELIVERY"
    );

    const completedToday = validOrders.filter(
      (order) =>
        order.status === "COMPLETED" &&
        isSameDay(
          order.updatedAt ?? order.createdAt,
          now
        )
    );

    const unpaidOrders = validOrders.filter(
      (order) =>
        order.paymentStatus === "UNPAID"
    );

    const paidOrders = validOrders.filter(
      (order) => order.paymentStatus === "PAID"
    );

    const todayPaidRevenue = paidOrders
      .filter((order) =>
        isSameDay(getRevenueDate(order), now)
      )
      .reduce(
        (total, order) =>
          total + Number(order.totalPrice || 0),
        0
      );

    const weekPaidRevenue = paidOrders
      .filter((order) =>
        isWithinDateRange(
          getRevenueDate(order),
          startOfWeek,
          now
        )
      )
      .reduce(
        (total, order) =>
          total + Number(order.totalPrice || 0),
        0
      );

    const monthPaidRevenue = paidOrders
      .filter((order) =>
        isWithinDateRange(
          getRevenueDate(order),
          startOfMonth,
          now
        )
      )
      .reduce(
        (total, order) =>
          total + Number(order.totalPrice || 0),
        0
      );

    const unpaidBalance = unpaidOrders.reduce(
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
          new Date(firstOrder.createdAt).getTime()
      )
      .slice(0, 7);

    const statusCounts = ORDER_STATUSES.map(
      (status) => {
        const count = orders.filter(
          (order) =>
            order.status === status.value
        ).length;

        const percentage =
          orders.length > 0
            ? (count / orders.length) * 100
            : 0;

        return {
          ...status,
          count,
          percentage,
        };
      }
    );

    const servicePerformance = SERVICE_TYPES.map(
      (service) => {
        const serviceOrders = validOrders.filter(
          (order) =>
            order.serviceType === service.value
        );

        const revenue = serviceOrders
          .filter(
            (order) =>
              order.paymentStatus === "PAID"
          )
          .reduce(
            (total, order) =>
              total +
              Number(order.totalPrice || 0),
            0
          );

        return {
          ...service,
          orderCount: serviceOrders.length,
          revenue,
        };
      }
    )
      .filter(
        (service) => service.orderCount > 0
      )
      .sort(
        (firstService, secondService) =>
          secondService.orderCount -
          firstService.orderCount
      )
      .slice(0, 5);

    const revenueByDay: DailyRevenue[] = [];

    for (
      let offset = 6;
      offset >= 0;
      offset -= 1
    ) {
      const date = new Date(startOfToday);

      date.setDate(
        startOfToday.getDate() - offset
      );

      const dateKey = getDateKey(date);

      const dailyPaidOrders = paidOrders.filter(
        (order) => {
          const revenueDate = getValidDate(
            getRevenueDate(order)
          );

          return (
            revenueDate !== null &&
            getDateKey(revenueDate) === dateKey
          );
        }
      );

      revenueByDay.push({
        key: dateKey,
        label: date.toLocaleDateString("en-PH", {
          weekday: "short",
        }),
        fullLabel: date.toLocaleDateString(
          "en-PH",
          {
            month: "short",
            day: "numeric",
          }
        ),
        revenue: dailyPaidOrders.reduce(
          (total, order) =>
            total +
            Number(order.totalPrice || 0),
          0
        ),
        orderCount: dailyPaidOrders.length,
      });
    }

    const maxDailyRevenue = Math.max(
      ...revenueByDay.map((day) => day.revenue),
      1
    );

    const customerMap = new Map<
      string,
      CustomerPerformance
    >();

    for (const order of validOrders) {
      const key = getCustomerKey(order);
      const existing = customerMap.get(key);
      const paidRevenue =
        order.paymentStatus === "PAID"
          ? Number(order.totalPrice || 0)
          : 0;

      if (existing) {
        existing.orderCount += 1;
        existing.paidRevenue += paidRevenue;
      } else {
        customerMap.set(key, {
          key,
          name: getCustomerName(order),
          orderCount: 1,
          paidRevenue,
        });
      }
    }

    const topCustomers = Array.from(
      customerMap.values()
    )
      .sort(
        (firstCustomer, secondCustomer) =>
          secondCustomer.paidRevenue -
            firstCustomer.paidRevenue ||
          secondCustomer.orderCount -
            firstCustomer.orderCount
      )
      .slice(0, 5);

    const paidRevenueTotal = paidOrders.reduce(
      (total, order) =>
        total + Number(order.totalPrice || 0),
      0
    );

    const paymentTotal =
      paidRevenueTotal + unpaidBalance;

    const paidPercentage =
      paymentTotal > 0
        ? (paidRevenueTotal / paymentTotal) * 100
        : 0;

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
      paidRevenueTotal,
      paidPercentage,
      recentOrders,
      statusCounts,
      servicePerformance,
      revenueByDay,
      maxDailyRevenue,
      topCustomers,
    };
  }, [orders]);

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />
          <span>Loading dashboard analytics...</span>
        </div>
      </section>
    );
  }

  if (errorMessage && orders.length === 0) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-error">
          <h2>Dashboard unavailable</h2>
          <p>{errorMessage}</p>

          <button
            type="button"
            className="dashboard-retry-button"
            onClick={() =>
              void loadDashboard(true)
            }
          >
            <FaSyncAlt />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span>{getGreeting()},</span>
          <h2>{user?.name ?? "Lava Co. Team"}</h2>
          <p>
            Here is today&apos;s laundry shop
            overview.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-date-card">
            <FaClock />
            <span>
              {formatDashboardDate(new Date())}
            </span>
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() =>
              void loadDashboard(true)
            }
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <FaSyncAlt
              className={
                refreshing ? "dashboard-spin" : ""
              }
            />
            <span>
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      <div className="dashboard-update-row">
        <span>
          Last updated: {formatUpdatedTime(lastUpdated)}
        </span>

        {errorMessage && (
          <span className="dashboard-inline-warning">
            Latest refresh failed. Showing the most
            recent available data.
          </span>
        )}
      </div>


      {tankStatus && (
        <section
          className={`dashboard-tank-card tank-${tankStatus.displayStatus.toLowerCase()}`}
          aria-live="polite"
        >
          <div className="dashboard-tank-heading">
            <div className="dashboard-tank-icon">
              {tankStatus.displayStatus === "NORMAL"
                ? <FaTint />
                : <FaExclamationTriangle />}
            </div>

            <div>
              <span>Tank Load Monitoring</span>
              <strong>
                {tankStatus.currentLoads} of {tankStatus.maximumLoads} loads used
              </strong>
              <small>
                {tankStatus.replacementRequired
                  ? "Maximum reached. Replace the tank now."
                  : `${tankStatus.remainingLoads} load${tankStatus.remainingLoads === 1 ? "" : "s"} remaining before replacement.`}
              </small>
            </div>
          </div>

          <div className="dashboard-tank-progress" aria-label={`${Math.min(100, tankStatus.percentage).toFixed(0)} percent used`}>
            <span style={{ width: `${Math.min(100, tankStatus.percentage)}%` }} />
          </div>
        </section>
      )}

      <div className="dashboard-summary-grid dashboard-primary-summary">
        <button
          type="button"
          className="dashboard-summary-card dashboard-clickable-card"
          onClick={() => navigateTo("orders", "TODAY")}
        >
          <div className="dashboard-card-icon">
            <FaTshirt />
          </div>
          <span>Orders Today</span>
          <strong>
            {dashboardData.todayOrders.length}
          </strong>
          <small>New laundry transactions</small>
          <span className="dashboard-card-link">
            View orders <FaArrowRight />
          </span>
        </button>

        <button
          type="button"
          className="dashboard-summary-card dashboard-clickable-card"
          onClick={() => navigateTo("orders", "ACTIVE")}
        >
          <div className="dashboard-card-icon">
            <FaClock />
          </div>
          <span>Active Orders</span>
          <strong>
            {dashboardData.activeOrders.length}
          </strong>
          <small>Currently being processed</small>
          <span className="dashboard-card-link">
            Manage orders <FaArrowRight />
          </span>
        </button>

        <button
          type="button"
          className="dashboard-summary-card dashboard-clickable-card"
          onClick={() => navigateTo("orders", "READY")}
        >
          <div className="dashboard-card-icon">
            <FaClipboardCheck />
          </div>
          <span>Ready / Delivery</span>
          <strong>
            {dashboardData.readyOrders.length}
          </strong>
          <small>Ready for release</small>
          <span className="dashboard-card-link">
            View queue <FaArrowRight />
          </span>
        </button>

        <button
          type="button"
          className="dashboard-summary-card dashboard-clickable-card"
          onClick={() => navigateTo("orders", "UNPAID")}
        >
          <div className="dashboard-card-icon">
            <FaMoneyBillWave />
          </div>
          <span>Unpaid Orders</span>
          <strong>
            {dashboardData.unpaidOrders.length}
          </strong>
          <small>
            {formatCurrency(
              dashboardData.unpaidBalance
            )} outstanding
          </small>
          <span className="dashboard-card-link">
            Review payments <FaArrowRight />
          </span>
        </button>

        <button
          type="button"
          className="dashboard-summary-card dashboard-revenue-card dashboard-clickable-card"
          onClick={() => navigateTo("revenue")}
        >
          <div className="dashboard-card-icon">
            <FaCoins />
          </div>
          <span>Paid Revenue Today</span>
          <strong>
            {formatCurrency(
              dashboardData.todayPaidRevenue
            )}
          </strong>
          <small>Paid transactions today</small>
          <span className="dashboard-card-link">
            View revenue <FaArrowRight />
          </span>
        </button>
      </div>

      <section className="dashboard-quick-actions" aria-label="Quick actions">
        <div className="dashboard-quick-actions-heading">
          <div>
            <span>Quick Actions</span>
            <small>
              Open frequently used shop functions.
            </small>
          </div>
        </div>

        <div className="dashboard-quick-action-grid">
          <button
            type="button"
            onClick={() => navigateTo("orders", "CREATE")}
          >
            <FaPlus />
            <span>
              <strong>New Order</strong>
              <small>Create a laundry transaction</small>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("orders", "ALL")}
          >
            <FaShoppingBasket />
            <span>
              <strong>View Orders</strong>
              <small>Manage the order workflow</small>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("customers", "CREATE")}
          >
            <FaUserPlus />
            <span>
              <strong>Add Customer</strong>
              <small>Open customer management</small>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("reports")}
          >
            <FaFileAlt />
            <span>
              <strong>View Reports</strong>
              <small>Review business performance</small>
            </span>
          </button>
        </div>
      </section>

      <div className="dashboard-revenue-overview">
        <article>
          <span>Revenue This Week</span>
          <strong>
            {formatCurrency(
              dashboardData.weekPaidRevenue
            )}
          </strong>
        </article>

        <article>
          <span>Revenue This Month</span>
          <strong>
            {formatCurrency(
              dashboardData.monthPaidRevenue
            )}
          </strong>
        </article>

        <article>
          <span>Completed Today</span>
          <strong>
            {dashboardData.completedToday.length}
          </strong>
        </article>

        <article>
          <span>Outstanding Balance</span>
          <strong>
            {formatCurrency(
              dashboardData.unpaidBalance
            )}
          </strong>
        </article>
      </div>

      <div className="dashboard-analytics-grid">
        <section className="dashboard-panel dashboard-revenue-trend-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>
                <FaChartLine />
                Revenue Trend
              </h3>
              <p>
                Paid revenue from the last seven
                days.
              </p>
            </div>
          </div>

          <div className="dashboard-revenue-chart">
            {dashboardData.revenueByDay.map(
              (day) => {
                const height =
                  day.revenue > 0
                    ? Math.max(
                        10,
                        (day.revenue /
                          dashboardData.maxDailyRevenue) *
                          100
                      )
                    : 4;

                return (
                  <div
                    key={day.key}
                    className="dashboard-chart-day"
                    title={`${day.fullLabel}: ${formatCurrency(
                      day.revenue
                    )}`}
                  >
                    <div className="dashboard-chart-value">
                      {day.revenue > 0
                        ? formatCurrency(day.revenue)
                        : "₱0"}
                    </div>

                    <div className="dashboard-chart-track">
                      <div
                        className="dashboard-chart-bar"
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>

                    <strong>{day.label}</strong>
                    <small>
                      {day.orderCount} paid
                    </small>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="dashboard-panel dashboard-payment-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>
                <FaWallet />
                Payment Overview
              </h3>
              <p>
                Paid revenue compared with
                outstanding orders.
              </p>
            </div>
          </div>

          <div className="dashboard-payment-summary">
            <div>
              <span>Total Paid Revenue</span>
              <strong>
                {formatCurrency(
                  dashboardData.paidRevenueTotal
                )}
              </strong>
            </div>

            <div>
              <span>Outstanding Balance</span>
              <strong>
                {formatCurrency(
                  dashboardData.unpaidBalance
                )}
              </strong>
            </div>
          </div>

          <div className="dashboard-payment-progress">
            <div
              className="dashboard-payment-progress-fill"
              style={{
                width: `${dashboardData.paidPercentage}%`,
              }}
            />
          </div>

          <small className="dashboard-payment-caption">
            {dashboardData.paidPercentage.toFixed(1)}%
            of recorded order value has been paid.
          </small>
        </section>
      </div>

      <div className="dashboard-content-grid dashboard-main-content">
        <section className="dashboard-panel dashboard-recent-panel">
          <div className="dashboard-panel-header dashboard-panel-header-with-action">
            <div>
              <h3>Recent Orders</h3>
              <p>Latest laundry transactions.</p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo("orders")}
            >
              View All <FaArrowRight />
            </button>
          </div>

          {dashboardData.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="New laundry transactions will appear here once an order is created."
            />
          ) : (
            <div className="dashboard-recent-list">
              {dashboardData.recentOrders.map(
                (order) => (
                  <article
                    key={order.id}
                    className="dashboard-recent-order"
                  >
                    <div>
                      <strong>
                        {order.orderNumber}
                      </strong>
                      <span>
                        {getCustomerName(order)}
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
                        {order.paymentStatus}
                      </small>
                    </div>
                  </article>
                )
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
                  <div className="dashboard-status-row-header">
                    <span>{status.label}</span>
                    <strong>{status.count}</strong>
                  </div>

                  <div className="dashboard-status-progress">
                    <div
                      className={`dashboard-status-progress-fill status-progress-${status.value.toLowerCase()}`}
                      style={{
                        width: `${status.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-content-grid dashboard-lower-content">
        <section className="dashboard-panel dashboard-service-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>Most Used Services</h3>
              <p>
                Order count and paid revenue by
                service.
              </p>
            </div>
          </div>

          {dashboardData.servicePerformance.length ===
          0 ? (
            <EmptyState
              title="No service activity"
              description="Service performance will be calculated after orders are recorded."
            />
          ) : (
            <div className="dashboard-service-grid">
              {dashboardData.servicePerformance.map(
                (service) => (
                  <article
                    key={service.value}
                    className="dashboard-service-card"
                  >
                    <span>{service.label}</span>
                    <strong>
                      {service.orderCount} order
                      {service.orderCount === 1
                        ? ""
                        : "s"}
                    </strong>
                    <small>
                      {formatCurrency(
                        service.revenue
                      )} paid revenue
                    </small>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <section className="dashboard-panel dashboard-top-customers-panel">
          <div className="dashboard-panel-header dashboard-panel-header-with-action">
            <div>
              <h3>
                <FaUsers />
                Top Customers
              </h3>
              <p>
                Customers ranked by paid revenue.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo("customers")}
            >
              View All <FaArrowRight />
            </button>
          </div>

          {dashboardData.topCustomers.length === 0 ? (
            <EmptyState
              title="No customer activity"
              description="Customer rankings will appear after paid orders are recorded."
            />
          ) : (
            <div className="dashboard-top-customer-list">
              {dashboardData.topCustomers.map(
                (customer, index) => (
                  <article
                    key={customer.key}
                    className="dashboard-top-customer"
                  >
                    <span className="dashboard-customer-rank">
                      {index + 1}
                    </span>

                    <div className="dashboard-top-customer-details">
                      <strong>{customer.name}</strong>
                      <small>
                        {customer.orderCount} order
                        {customer.orderCount === 1
                          ? ""
                          : "s"}
                      </small>
                    </div>

                    <strong>
                      {formatCurrency(
                        customer.paidRevenue
                      )}
                    </strong>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default DashboardPage;
