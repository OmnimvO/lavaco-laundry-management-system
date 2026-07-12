import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../api/orderApi";
import type { Order } from "../types/order";
import { SERVICE_TYPES } from "../constants/order";

type RevenuePeriod =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "CUSTOM";

function formatCurrency(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getServiceLabel(value: string) {
  return (
    SERVICE_TYPES.find(
      (service) => service.value === value
    )?.label ?? value
  );
}

function getCustomerName(order: Order) {
  return (
    order.customer?.name ??
    order.walkInCustomerName ??
    "Unknown Customer"
  );
}

function getRevenueDate(order: Order) {
  return order.paidAt ?? order.createdAt;
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getEndOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function getStartOfWeek(date: Date) {
  const result = getStartOfDay(date);
  const day = result.getDay();
  const daysSinceMonday =
    day === 0 ? 6 : day - 1;

  result.setDate(
    result.getDate() - daysSinceMonday
  );

  return result;
}

function getStartOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function getStartOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function isWithinRange(
  value: string,
  startDate: Date,
  endDate: Date
) {
  const date = new Date(value);

  return date >= startDate && date <= endDate;
}

function RevenuePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [period, setPeriod] =
    useState<RevenuePeriod>("MONTH");

  const [customStartDate, setCustomStartDate] =
    useState("");

  const [customEndDate, setCustomEndDate] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  useEffect(() => {
    async function loadRevenueData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const ordersData = await getOrders();

        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load revenue data:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load revenue data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRevenueData();
  }, []);

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.paymentStatus === "PAID" &&
          order.status !== "CANCELLED"
      ),
    [orders]
  );

  const revenueData = useMemo(() => {
    const today = new Date();

    const todayStart = getStartOfDay(today);
    const todayEnd = getEndOfDay(today);

    const weekStart = getStartOfWeek(today);
    const monthStart = getStartOfMonth(today);
    const yearStart = getStartOfYear(today);

    const calculateRevenue = (
      matchingOrders: Order[]
    ) =>
      matchingOrders.reduce(
        (total, order) =>
          total +
          Number(order.totalPrice || 0),
        0
      );

    const todayOrders = paidOrders.filter(
      (order) =>
        isWithinRange(
          getRevenueDate(order),
          todayStart,
          todayEnd
        )
    );

    const weekOrders = paidOrders.filter(
      (order) =>
        isWithinRange(
          getRevenueDate(order),
          weekStart,
          todayEnd
        )
    );

    const monthOrders = paidOrders.filter(
      (order) =>
        isWithinRange(
          getRevenueDate(order),
          monthStart,
          todayEnd
        )
    );

    const yearOrders = paidOrders.filter(
      (order) =>
        isWithinRange(
          getRevenueDate(order),
          yearStart,
          todayEnd
        )
    );

    let selectedStart = monthStart;
    let selectedEnd = todayEnd;

    if (period === "TODAY") {
      selectedStart = todayStart;
    }

    if (period === "WEEK") {
      selectedStart = weekStart;
    }

    if (period === "YEAR") {
      selectedStart = yearStart;
    }

    if (
      period === "CUSTOM" &&
      customStartDate &&
      customEndDate
    ) {
      selectedStart = getStartOfDay(
        new Date(`${customStartDate}T00:00:00`)
      );

      selectedEnd = getEndOfDay(
        new Date(`${customEndDate}T00:00:00`)
      );
    }

    const selectedOrders = paidOrders.filter(
      (order) =>
        isWithinRange(
          getRevenueDate(order),
          selectedStart,
          selectedEnd
        )
    );

    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const searchedOrders =
      normalizedSearch === ""
        ? selectedOrders
        : selectedOrders.filter((order) => {
            const orderNumber = String(
              order.orderNumber ?? ""
            ).toLowerCase();

            const customerName =
              getCustomerName(order).toLowerCase();

            return (
              orderNumber.includes(
                normalizedSearch
              ) ||
              customerName.includes(
                normalizedSearch
              )
            );
          });

    const selectedRevenue =
      calculateRevenue(searchedOrders);

    const averageOrderValue =
      searchedOrders.length > 0
        ? selectedRevenue /
          searchedOrders.length
        : 0;

    const totalWeight =
      searchedOrders.reduce(
        (total, order) =>
          total +
          Number(order.laundryWeight || 0),
        0
      );

    const largestOrder =
      searchedOrders.reduce(
        (largest, order) =>
          Number(order.totalPrice || 0) >
          Number(largest?.totalPrice || 0)
            ? order
            : largest,
        null as Order | null
      );

    const serviceBreakdown =
      SERVICE_TYPES.map((service) => {
        const serviceOrders =
          searchedOrders.filter(
            (order) =>
              order.serviceType ===
              service.value
          );

        return {
          value: service.value,
          label: service.label,
          orderCount: serviceOrders.length,
          revenue:
            calculateRevenue(serviceOrders),
        };
      })
        .filter(
          (service) =>
            service.orderCount > 0
        )
        .sort(
          (first, second) =>
            second.revenue - first.revenue
        );

    const maximumServiceRevenue =
      serviceBreakdown.length > 0
        ? Math.max(
            ...serviceBreakdown.map(
              (service) => service.revenue
            )
          )
        : 0;

    const sortedOrders = [
      ...searchedOrders,
    ].sort(
      (firstOrder, secondOrder) =>
        new Date(
          getRevenueDate(secondOrder)
        ).getTime() -
        new Date(
          getRevenueDate(firstOrder)
        ).getTime()
    );

    return {
      todayRevenue:
        calculateRevenue(todayOrders),

      weekRevenue:
        calculateRevenue(weekOrders),

      monthRevenue:
        calculateRevenue(monthOrders),

      yearRevenue:
        calculateRevenue(yearOrders),

      selectedOrders: sortedOrders,
      selectedRevenue,
      averageOrderValue,
      totalWeight,
      largestOrder,
      serviceBreakdown,
      maximumServiceRevenue,
    };
  }, [
    paidOrders,
    period,
    customStartDate,
    customEndDate,
    searchTerm,
  ]);

  if (loading) {
    return <p>Loading revenue...</p>;
  }

  if (errorMessage) {
    return (
      <section className="revenue-page">
        <div className="dashboard-error">
          <h2>Revenue unavailable</h2>
          <p>{errorMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="revenue-page">
      <div className="page-header">
        <div>
          <h2>Revenue</h2>

          <p>
            Review paid sales and laundry
            performance.
          </p>
        </div>
      </div>

      <div className="revenue-summary-grid">
        <article className="revenue-summary-card revenue-primary-card">
          <span>Today's Revenue</span>
          <strong>
            {formatCurrency(
              revenueData.todayRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>This Week</span>
          <strong>
            {formatCurrency(
              revenueData.weekRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>This Month</span>
          <strong>
            {formatCurrency(
              revenueData.monthRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>This Year</span>
          <strong>
            {formatCurrency(
              revenueData.yearRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>Paid Orders</span>
          <strong>
            {
              revenueData.selectedOrders
                .length
            }
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>Average Sale</span>
          <strong>
            {formatCurrency(
              revenueData.averageOrderValue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>Laundry Processed</span>
          <strong>
            {revenueData.totalWeight.toFixed(
              1
            )}{" "}
            kg
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span>Largest Sale</span>
          <strong>
            {formatCurrency(
              revenueData.largestOrder
                ?.totalPrice ?? 0
            )}
          </strong>
        </article>
      </div>

      <div className="revenue-toolbar">
        <div className="revenue-period-buttons">
          {[
            {
              value: "TODAY",
              label: "Today",
            },
            {
              value: "WEEK",
              label: "This Week",
            },
            {
              value: "MONTH",
              label: "This Month",
            },
            {
              value: "YEAR",
              label: "This Year",
            },
            {
              value: "CUSTOM",
              label: "Custom",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                period === option.value
                  ? "revenue-period-button active"
                  : "revenue-period-button"
              }
              onClick={() =>
                setPeriod(
                  option.value as RevenuePeriod
                )
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {period === "CUSTOM" && (
          <div className="revenue-date-range">
            <div>
              <label htmlFor="revenueStartDate">
                Start Date
              </label>

              <input
                id="revenueStartDate"
                type="date"
                value={customStartDate}
                onChange={(event) =>
                  setCustomStartDate(
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label htmlFor="revenueEndDate">
                End Date
              </label>

              <input
                id="revenueEndDate"
                type="date"
                value={customEndDate}
                onChange={(event) =>
                  setCustomEndDate(
                    event.target.value
                  )
                }
              />
            </div>
          </div>
        )}

        <div className="revenue-search">
          <label htmlFor="revenueSearch">
            Search Paid Orders
          </label>

          <input
            id="revenueSearch"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Order number or customer"
          />
        </div>
      </div>

      <div className="revenue-content-grid">
        <section className="revenue-panel">
          <div className="revenue-panel-header">
            <div>
              <h3>Revenue by Service</h3>

              <p>
                Paid sales for the selected
                period.
              </p>
            </div>

            <strong>
              {formatCurrency(
                revenueData.selectedRevenue
              )}
            </strong>
          </div>

          {revenueData.serviceBreakdown
            .length === 0 ? (
            <p>
              No paid service revenue for this
              period.
            </p>
          ) : (
            <div className="service-revenue-list">
              {revenueData.serviceBreakdown.map(
                (service) => {
                  const percentage =
                    revenueData
                      .maximumServiceRevenue > 0
                      ? (service.revenue /
                          revenueData
                            .maximumServiceRevenue) *
                        100
                      : 0;

                  return (
                    <div
                      key={service.value}
                      className="service-revenue-item"
                    >
                      <div className="service-revenue-heading">
                        <div>
                          <strong>
                            {service.label}
                          </strong>

                          <span>
                            {service.orderCount}{" "}
                            order
                            {service.orderCount ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        </div>

                        <strong>
                          {formatCurrency(
                            service.revenue
                          )}
                        </strong>
                      </div>

                      <div className="service-revenue-track">
                        <div
                          className="service-revenue-bar"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <section className="revenue-panel">
          <div className="revenue-panel-header">
            <div>
              <h3>Selected Period</h3>
              <p>Current paid-order totals.</p>
            </div>
          </div>

          <div className="revenue-period-summary">
            <div>
              <span>Total Revenue</span>
              <strong>
                {formatCurrency(
                  revenueData.selectedRevenue
                )}
              </strong>
            </div>

            <div>
              <span>Paid Transactions</span>
              <strong>
                {
                  revenueData.selectedOrders
                    .length
                }
              </strong>
            </div>

            <div>
              <span>Total Weight</span>
              <strong>
                {revenueData.totalWeight.toFixed(
                  1
                )}{" "}
                kg
              </strong>
            </div>

            <div>
              <span>Average Sale</span>
              <strong>
                {formatCurrency(
                  revenueData.averageOrderValue
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="revenue-table-section">
        <div className="revenue-panel-header">
          <div>
            <h3>Paid Orders</h3>

            <p>
              Transactions included in the
              selected revenue period.
            </p>
          </div>
        </div>

        {revenueData.selectedOrders.length ===
        0 ? (
          <p>
            No paid orders found for the
            selected period.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Weight</th>
                  <th>Total</th>
                  <th>Received By</th>
                </tr>
              </thead>

              <tbody>
                {revenueData.selectedOrders.map(
                  (order) => (
                    <tr key={order.id}>
                      <td>
                        {formatDate(
                          getRevenueDate(order)
                        )}
                      </td>

                      <td>
                        {order.orderNumber}
                      </td>

                      <td>
                        {getCustomerName(order)}
                      </td>

                      <td>
                        {getServiceLabel(
                          order.serviceType
                        )}
                      </td>

                      <td>
                        {Number(
                          order.laundryWeight || 0
                        ).toFixed(1)}{" "}
                        kg
                      </td>

                      <td className="table-total">
                        {formatCurrency(
                          order.totalPrice
                        )}
                      </td>

                      <td>
                        {order.receivedBy ||
                          "Not provided"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default RevenuePage;