import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaChartLine,
  FaCoins,
  FaMoneyBillWave,
  FaSearch,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import {
  getRevenue,
} from "../api/revenueApi";
import type { Order } from "../types/order";
import { SERVICE_TYPES } from "../constants/order";

import {
  useAuth,
} from "../hooks/useAuth";

type RevenuePeriod =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "ALL_TIME"
  | "CUSTOM";

type RevenueTrendPoint = {
  key: string;
  label: string;
  fullLabel: string;
  revenue: number;
  orderCount: number;
};

type RevenueCustomer = {
  key: string;
  name: string;
  revenue: number;
  orderCount: number;
};

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

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
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

function isWithinRange(
  value: string,
  startDate: Date,
  endDate: Date
) {
  const date = new Date(value);

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date >= startDate &&
    date <= endDate
  );
}

function RevenuePage() {
  const {
    token,
  } = useAuth();
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

        if (
          typeof token !== "string" ||
          !token.trim()
        ) {
          throw new Error(
            "Your session is unavailable. Please log in again."
          );
        }

        const revenueResponse =
          await getRevenue(
            token
          );

        setOrders(
          Array.isArray(
            revenueResponse.orders
          )
            ? revenueResponse.orders
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
  }, [token]);

  const validOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !==
            "CANCELLED" &&
          !order.isArchived
      ),
    [orders]
  );

  const paidOrders = useMemo(
    () =>
      validOrders.filter(
        (order) =>
          order.paymentStatus === "PAID"
      ),
    [validOrders]
  );

  /*
   * The dedicated revenue endpoint returns
   * paid, active, non-cancelled orders only.
   * Outstanding-order figures remain zero
   * until they are included in a dedicated
   * revenue summary response.
   */
  const unpaidOrders =
    useMemo<Order[]>(
      () => [],
      []
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

    if (period === "ALL_TIME") {
      const availableDates =
        validOrders
          .map(
            (order) =>
              new Date(
                getRevenueDate(order)
              )
          )
          .filter(
            (date) =>
              !Number.isNaN(
                date.getTime()
              )
          );

      selectedStart =
        availableDates.length > 0
          ? getStartOfDay(
              new Date(
                Math.min(
                  ...availableDates.map(
                    (date) =>
                      date.getTime()
                  )
                )
              )
            )
          : yearStart;
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

    const selectedPaidOrders =
      paidOrders.filter((order) =>
        isWithinRange(
          getRevenueDate(order),
          selectedStart,
          selectedEnd
        )
      );

    const selectedUnpaidOrders =
      unpaidOrders.filter((order) =>
        isWithinRange(
          order.createdAt,
          selectedStart,
          selectedEnd
        )
      );

    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const searchedOrders =
      normalizedSearch === ""
        ? selectedPaidOrders
        : selectedPaidOrders.filter((order) => {
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

    const outstandingBalance =
      selectedUnpaidOrders.reduce(
        (total, order) =>
          total +
          Number(order.totalPrice || 0),
        0
      );

    const recordedValue =
      selectedRevenue +
      outstandingBalance;

    const paidPercentage =
      recordedValue > 0
        ? (selectedRevenue /
            recordedValue) *
          100
        : 0;

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
          orderCount:
            serviceOrders.length,
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
            second.revenue -
            first.revenue
        );

    const maximumServiceRevenue =
      serviceBreakdown.length > 0
        ? Math.max(
            ...serviceBreakdown.map(
              (service) =>
                service.revenue
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

    const customerMap =
      new Map<string, RevenueCustomer>();

    searchedOrders.forEach((order) => {
      const key = getCustomerKey(order);
      const existing =
        customerMap.get(key);
      const amount = Number(
        order.totalPrice || 0
      );

      if (existing) {
        existing.revenue += amount;
        existing.orderCount += 1;
      } else {
        customerMap.set(key, {
          key,
          name:
            getCustomerName(order),
          revenue: amount,
          orderCount: 1,
        });
      }
    });

    const topCustomers =
      Array.from(
        customerMap.values()
      )
        .sort(
          (first, second) =>
            second.revenue -
              first.revenue ||
            second.orderCount -
              first.orderCount
        )
        .slice(0, 5);

    const maximumCustomerRevenue =
      topCustomers.length > 0
        ? Math.max(
            ...topCustomers.map(
              (customer) =>
                customer.revenue
            )
          )
        : 0;

    const revenueTrend:
      RevenueTrendPoint[] = [];

    if (
      period === "YEAR" ||
      period === "ALL_TIME"
    ) {
      const firstMonth =
        new Date(
          selectedStart.getFullYear(),
          selectedStart.getMonth(),
          1
        );

      const lastMonth =
        new Date(
          selectedEnd.getFullYear(),
          selectedEnd.getMonth(),
          1
        );

      const monthCount =
        (
          lastMonth.getFullYear() -
          firstMonth.getFullYear()
        ) *
          12 +
        (
          lastMonth.getMonth() -
          firstMonth.getMonth()
        ) +
        1;

      for (
        let monthOffset = 0;
        monthOffset < monthCount;
        monthOffset += 1
      ) {
        const monthDate = new Date(
          firstMonth.getFullYear(),
          firstMonth.getMonth() +
            monthOffset,
          1
        );

        const key =
          getMonthKey(monthDate);

        const matchingOrders =
          searchedOrders.filter(
            (order) =>
              getMonthKey(
                new Date(
                  getRevenueDate(order)
                )
              ) === key
          );

        revenueTrend.push({
          key,
          label:
            monthDate.toLocaleDateString(
              "en-PH",
              {
                month: "short",
              }
            ),
          fullLabel:
            monthDate.toLocaleDateString(
              "en-PH",
              {
                month: "long",
                year: "numeric",
              }
            ),
          revenue:
            calculateRevenue(
              matchingOrders
            ),
          orderCount:
            matchingOrders.length,
        });
      }
    } else {
      const dayCount =
        period === "TODAY"
          ? 1
          : Math.min(
              31,
              Math.max(
                1,
                Math.ceil(
                  (selectedEnd.getTime() -
                    selectedStart.getTime()) /
                    86400000
                ) + 1
              )
            );

      for (
        let offset = dayCount - 1;
        offset >= 0;
        offset -= 1
      ) {
        const date = new Date(
          selectedEnd
        );

        date.setDate(
          selectedEnd.getDate() -
            offset
        );

        const key = getDateKey(date);

        const matchingOrders =
          searchedOrders.filter(
            (order) =>
              getDateKey(
                new Date(
                  getRevenueDate(order)
                )
              ) === key
          );

        revenueTrend.push({
          key,
          label:
            dayCount <= 7
              ? date.toLocaleDateString(
                  "en-PH",
                  {
                    weekday: "short",
                  }
                )
              : date.toLocaleDateString(
                  "en-PH",
                  {
                    month: "short",
                    day: "numeric",
                  }
                ),
          fullLabel:
            date.toLocaleDateString(
              "en-PH",
              {
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            ),
          revenue:
            calculateRevenue(
              matchingOrders
            ),
          orderCount:
            matchingOrders.length,
        });
      }
    }

    const maximumTrendRevenue =
      Math.max(
        ...revenueTrend.map(
          (point) => point.revenue
        ),
        1
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

      allTimeRevenue:
        calculateRevenue(paidOrders),

      selectedOrders: sortedOrders,
      selectedRevenue,
      averageOrderValue,
      totalWeight,
      largestOrder,
      serviceBreakdown,
      maximumServiceRevenue,
      outstandingBalance,
      selectedUnpaidCount:
        selectedUnpaidOrders.length,
      paidPercentage,
      topCustomers,
      maximumCustomerRevenue,
      revenueTrend,
      maximumTrendRevenue,
    };
  }, [
    paidOrders,
    unpaidOrders,
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
          <span><FaCoins /> Today&apos;s Revenue</span>
          <strong>
            {formatCurrency(
              revenueData.todayRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span><FaChartLine /> This Week</span>
          <strong>
            {formatCurrency(
              revenueData.weekRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span><FaWallet /> This Month</span>
          <strong>
            {formatCurrency(
              revenueData.monthRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span><FaMoneyBillWave /> This Year</span>
          <strong>
            {formatCurrency(
              revenueData.yearRevenue
            )}
          </strong>
        </article>

        <article className="revenue-summary-card">
          <span><FaCoins /> All-Time Revenue</span>
          <strong>
            {formatCurrency(
              revenueData.allTimeRevenue
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
              value: "ALL_TIME",
              label: "All Time",
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

          <div className="revenue-search-input">
            <FaSearch />

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
      </div>

      <div className="revenue-analytics-grid">
        <section className="revenue-panel revenue-trend-panel">
          <div className="revenue-panel-header">
            <div>
              <h3>
                <FaChartLine />
                Revenue Trend
              </h3>

              <p>
                Paid sales across the selected
                period.
              </p>
            </div>

            <strong>
              {formatCurrency(
                revenueData.selectedRevenue
              )}
            </strong>
          </div>

          <div className="revenue-trend-chart">
            {revenueData.revenueTrend.map(
              (point) => {
                const height =
                  point.revenue > 0
                    ? Math.max(
                        8,
                        (point.revenue /
                          revenueData
                            .maximumTrendRevenue) *
                          100
                      )
                    : 3;

                return (
                  <div
                    key={point.key}
                    className="revenue-trend-point"
                    title={`${point.fullLabel}: ${formatCurrency(
                      point.revenue
                    )}`}
                  >
                    <span>
                      {point.revenue > 0
                        ? formatCurrency(
                            point.revenue
                          )
                        : "₱0"}
                    </span>

                    <div className="revenue-trend-track">
                      <div
                        className="revenue-trend-bar"
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>

                    <strong>
                      {point.label}
                    </strong>

                    <small>
                      {point.orderCount} paid
                    </small>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="revenue-panel">
          <div className="revenue-panel-header">
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

          <div className="revenue-payment-summary">
            <div>
              <span>Paid Revenue</span>
              <strong>
                {formatCurrency(
                  revenueData.selectedRevenue
                )}
              </strong>
            </div>

            <div>
              <span>
                Outstanding Balance
              </span>
              <strong>
                {formatCurrency(
                  revenueData.outstandingBalance
                )}
              </strong>
            </div>

            <div>
              <span>Unpaid Orders</span>
              <strong>
                {
                  revenueData
                    .selectedUnpaidCount
                }
              </strong>
            </div>
          </div>

          <div className="revenue-payment-progress">
            <div
              style={{
                width: `${revenueData.paidPercentage}%`,
              }}
            />
          </div>

          <small className="revenue-payment-caption">
            {revenueData.paidPercentage.toFixed(
              1
            )}
            % of recorded order value has
            been paid.
          </small>
        </section>
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

      <section className="revenue-panel revenue-top-customers-panel">
        <div className="revenue-panel-header">
          <div>
            <h3>
              <FaUsers />
              Top Customers
            </h3>

            <p>
              Highest paid revenue during the
              selected period.
            </p>
          </div>
        </div>

        {revenueData.topCustomers.length ===
        0 ? (
          <div className="dashboard-empty-state">
            <strong>
              No customer revenue yet
            </strong>

            <p>
              Paid customer transactions will
              appear here.
            </p>
          </div>
        ) : (
          <div className="revenue-customer-list">
            {revenueData.topCustomers.map(
              (customer, index) => {
                const percentage =
                  revenueData
                    .maximumCustomerRevenue > 0
                    ? (customer.revenue /
                        revenueData
                          .maximumCustomerRevenue) *
                      100
                    : 0;

                return (
                  <article
                    key={customer.key}
                    className="revenue-customer-item"
                  >
                    <span className="revenue-customer-rank">
                      {index + 1}
                    </span>

                    <div className="revenue-customer-details">
                      <div>
                        <strong>
                          {customer.name}
                        </strong>

                        <small>
                          {customer.orderCount} order
                          {customer.orderCount === 1
                            ? ""
                            : "s"}
                        </small>
                      </div>

                      <strong>
                        {formatCurrency(
                          customer.revenue
                        )}
                      </strong>
                    </div>

                    <div className="revenue-customer-track">
                      <div
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

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
          <div className="dashboard-empty-state">
            <strong>
              No paid orders found
            </strong>

            <p>
              Try changing the period, custom
              dates, or search term.
            </p>
          </div>
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