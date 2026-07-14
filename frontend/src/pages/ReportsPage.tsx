import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCalendarAlt,
  FaChartBar,
  FaClipboardList,
  FaCoins,
  FaDownload,
  FaExclamationCircle,
  FaFilter,
  FaMoneyBillWave,
  FaPrint,
  FaSyncAlt,
  FaTshirt,
  FaUndoAlt,
  FaWallet,
} from "react-icons/fa";

import { getOrders } from "../api/orderApi";
import type { Order } from "../types/order";
import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";

import {
  useAuth,
} from "../hooks/useAuth";

type ReportType =
  | "DAILY_SALES"
  | "MONTHLY_SALES"
  | "YEARLY_SALES"
  | "ALL_TIME"
  | "CUSTOM_RANGE"
  | "PAID_ORDERS"
  | "UNPAID_ORDERS"
  | "REVENUE_BY_SERVICE"
  | "LAUNDRY_VOLUME";

const REPORT_TYPES: {
  value: ReportType;
  label: string;
}[] = [
  {
    value: "DAILY_SALES",
    label: "Daily Sales",
  },
  {
    value: "MONTHLY_SALES",
    label: "Monthly Sales",
  },
  {
    value: "YEARLY_SALES",
    label: "Yearly Sales",
  },
  {
    value: "ALL_TIME",
    label: "Overall Report",
  },
  {
    value: "CUSTOM_RANGE",
    label: "Custom Date Range",
  },
  {
    value: "PAID_ORDERS",
    label: "Paid Orders",
  },
  {
    value: "UNPAID_ORDERS",
    label: "Unpaid Orders",
  },
  {
    value: "REVENUE_BY_SERVICE",
    label: "Revenue by Service",
  },
  {
    value: "LAUNDRY_VOLUME",
    label: "Laundry Volume",
  },
];

function formatCurrency(value: number) {
  return `₱${Number(value || 0).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
      (option) => option.value === value
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

function getCustomerPhone(order: Order) {
  return (
    order.customer?.phone ??
    order.walkInCustomerPhone ??
    "Not provided"
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

function getStartOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function getEndOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function isWithinRange(
  value: string,
  startDate: Date,
  endDate: Date
) {
  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date >= startDate &&
    date <= endDate
  );
}

function getDaysUnpaid(order: Order) {
  const createdDate = new Date(
    order.createdAt
  );

  const difference =
    Date.now() - createdDate.getTime();

  return Math.max(
    0,
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    )
  );
}

function escapeCsvValue(value: unknown) {
  const stringValue = String(
    value ?? ""
  );

  return `"${stringValue.replace(
    /"/g,
    '""'
  )}"`;
}

function getReportDescription(
  reportType: ReportType
) {
  const descriptions: Record<
    ReportType,
    string
  > = {
    DAILY_SALES:
      "Orders and revenue recorded on the selected day.",
    MONTHLY_SALES:
      "Monthly sales, payments, and laundry activity.",
    YEARLY_SALES:
      "Complete monthly business performance for the selected year.",
    ALL_TIME:
      "Overall active business history across all available years.",
    CUSTOM_RANGE:
      "Business activity within a custom date range.",
    PAID_ORDERS:
      "All successfully paid, non-cancelled orders.",
    UNPAID_ORDERS:
      "Outstanding orders that still require payment.",
    REVENUE_BY_SERVICE:
      "Paid revenue grouped by laundry service.",
    LAUNDRY_VOLUME:
      "Laundry weight and load volume by service.",
  };

  return descriptions[reportType];
}

function getReportIcon(
  reportType: ReportType
) {
  switch (reportType) {
    case "DAILY_SALES":
      return <FaCalendarAlt />;

    case "MONTHLY_SALES":
      return <FaChartBar />;

    case "YEARLY_SALES":
      return <FaChartBar />;

    case "ALL_TIME":
      return <FaCoins />;

    case "CUSTOM_RANGE":
      return <FaFilter />;

    case "PAID_ORDERS":
      return <FaWallet />;

    case "UNPAID_ORDERS":
      return <FaExclamationCircle />;

    case "REVENUE_BY_SERVICE":
      return <FaMoneyBillWave />;

    case "LAUNDRY_VOLUME":
      return <FaTshirt />;

    default:
      return <FaClipboardList />;
  }
}

function getDateRangeLabel(
  reportType: ReportType,
  startDate: Date,
  endDate: Date
) {
  if (
    reportType === "ALL_TIME" ||
    reportType === "PAID_ORDERS" ||
    reportType === "UNPAID_ORDERS" ||
    reportType === "REVENUE_BY_SERVICE" ||
    reportType === "LAUNDRY_VOLUME"
  ) {
    return "All available records";
  }

  const startLabel =
    startDate.toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );

  const endLabel =
    endDate.toLocaleDateString(
      "en-PH",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );

  return startLabel === endLabel
    ? startLabel
    : `${startLabel} – ${endLabel}`;
}

function ReportsPage() {
  const {
    token,
  } = useAuth();
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [reportType, setReportType] =
    useState<ReportType>("DAILY_SALES");

  const todayString = new Date()
    .toISOString()
    .slice(0, 10);

  const currentMonthString = new Date()
    .toISOString()
    .slice(0, 7);

  const currentYearString =
    String(new Date().getFullYear());

  const [selectedDate, setSelectedDate] =
    useState(todayString);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonthString);

  const [selectedYear, setSelectedYear] =
    useState(currentYearString);

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState(todayString);

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState(todayString);

  const [serviceFilter, setServiceFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState("ALL");

  const [
    fulfillmentFilter,
    setFulfillmentFilter,
  ] = useState("ALL");

  const [searchTerm, setSearchTerm] =
    useState("");

  const loadReportsData = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
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

        const ordersData =
          await getOrders(
            token
          );

        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : []
        );

        setLastUpdated(new Date());
      } catch (error) {
        console.error(
          "Failed to load reports:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load reports."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadReportsData(false);
  }, [loadReportsData]);

  const hasInvalidCustomRange =
    reportType === "CUSTOM_RANGE" &&
    Boolean(
      customStartDate &&
        customEndDate &&
        customStartDate >
          customEndDate
    );

  const reportData = useMemo(() => {
    const today = new Date();

    let startDate =
      getStartOfDay(today);

    let endDate =
      getEndOfDay(today);

    if (reportType === "DAILY_SALES") {
      const date = new Date(
        `${selectedDate}T00:00:00`
      );

      startDate = getStartOfDay(date);
      endDate = getEndOfDay(date);
    }

    if (
      reportType === "MONTHLY_SALES"
    ) {
      const [year, month] =
        selectedMonth
          .split("-")
          .map(Number);

      const monthDate = new Date(
        year,
        month - 1,
        1
      );

      startDate =
        getStartOfMonth(monthDate);

      endDate =
        getEndOfMonth(monthDate);
    }

    if (
      reportType === "YEARLY_SALES"
    ) {
      const year =
        Number(selectedYear);

      startDate = new Date(
        year,
        0,
        1,
        0,
        0,
        0,
        0
      );

      endDate = new Date(
        year,
        11,
        31,
        23,
        59,
        59,
        999
      );
    }

    if (
      reportType === "ALL_TIME"
    ) {
      const activeOrderDates =
        orders
          .filter(
            (order) =>
              !order.isArchived
          )
          .map(
            (order) =>
              new Date(
                order.createdAt
              )
          )
          .filter(
            (date) =>
              !Number.isNaN(
                date.getTime()
              )
          );

      startDate =
        activeOrderDates.length > 0
          ? getStartOfDay(
              new Date(
                Math.min(
                  ...activeOrderDates.map(
                    (date) =>
                      date.getTime()
                  )
                )
              )
            )
          : getStartOfDay(today);

      endDate =
        getEndOfDay(today);
    }

    if (
      reportType === "CUSTOM_RANGE"
    ) {
      startDate = getStartOfDay(
        new Date(
          `${customStartDate}T00:00:00`
        )
      );

      endDate = getEndOfDay(
        new Date(
          `${customEndDate}T00:00:00`
        )
      );

      if (startDate > endDate) {
        return {
          orders: [],
          paidOrders: [],
          unpaidOrders: [],
          cancelledOrders: [],
          totalRevenue: 0,
          unpaidAmount: 0,
          totalWeight: 0,
          totalLoads: 0,
          averageOrderValue: 0,
          largestOrder: null,
          oldestUnpaidOrder: null,
          serviceBreakdown: [],
          startDate,
          endDate,
        };
      }
    }

    let reportOrders =
      orders.filter(
        (order) =>
          !order.isArchived
      );

    if (
      reportType === "DAILY_SALES" ||
      reportType === "MONTHLY_SALES" ||
      reportType === "YEARLY_SALES" ||
      reportType === "CUSTOM_RANGE"
    ) {
      reportOrders =
        reportOrders.filter((order) =>
          isWithinRange(
            order.createdAt,
            startDate,
            endDate
          )
        );
    }

    if (
      reportType === "PAID_ORDERS"
    ) {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.paymentStatus === "PAID" &&
            order.status !== "CANCELLED"
        );
    }

    if (
      reportType === "UNPAID_ORDERS"
    ) {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.paymentStatus ===
              "UNPAID" &&
            order.status !== "CANCELLED"
        );
    }

    if (
      reportType ===
      "REVENUE_BY_SERVICE"
    ) {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.paymentStatus === "PAID" &&
            order.status !== "CANCELLED"
        );
    }

    if (
      reportType ===
      "LAUNDRY_VOLUME"
    ) {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.status !== "CANCELLED"
        );
    }

    if (serviceFilter !== "ALL") {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.serviceType ===
            serviceFilter
        );
    }

    if (statusFilter !== "ALL") {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.status === statusFilter
        );
    }

    if (paymentFilter !== "ALL") {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.paymentStatus ===
            paymentFilter
        );
    }

    if (
      fulfillmentFilter !== "ALL"
    ) {
      reportOrders =
        reportOrders.filter(
          (order) =>
            order.fulfillmentType ===
            fulfillmentFilter
        );
    }

    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (normalizedSearch) {
      reportOrders =
        reportOrders.filter((order) => {
          const orderNumber = String(
            order.orderNumber ?? ""
          ).toLowerCase();

          const customerName =
            getCustomerName(
              order
            ).toLowerCase();

          const phone =
            getCustomerPhone(
              order
            ).toLowerCase();

          const employee = String(
            order.receivedBy ?? ""
          ).toLowerCase();

          return (
            orderNumber.includes(
              normalizedSearch
            ) ||
            customerName.includes(
              normalizedSearch
            ) ||
            phone.includes(
              normalizedSearch
            ) ||
            employee.includes(
              normalizedSearch
            )
          );
        });
    }

    const sortedOrders = [
      ...reportOrders,
    ].sort((firstOrder, secondOrder) => {
      const firstDate =
        reportType === "PAID_ORDERS"
          ? getRevenueDate(firstOrder)
          : firstOrder.createdAt;

      const secondDate =
        reportType === "PAID_ORDERS"
          ? getRevenueDate(secondOrder)
          : secondOrder.createdAt;

      return (
        new Date(
          secondDate
        ).getTime() -
        new Date(
          firstDate
        ).getTime()
      );
    });

    const paidOrders =
      sortedOrders.filter(
        (order) =>
          order.paymentStatus === "PAID" &&
          order.status !== "CANCELLED"
      );

    const unpaidOrders =
      sortedOrders.filter(
        (order) =>
          order.paymentStatus ===
            "UNPAID" &&
          order.status !== "CANCELLED"
      );

    const cancelledOrders =
      sortedOrders.filter(
        (order) =>
          order.status === "CANCELLED"
      );

    const totalRevenue =
      paidOrders.reduce(
        (total, order) =>
          total +
          Number(order.totalPrice || 0),
        0
      );

    const unpaidAmount =
      unpaidOrders.reduce(
        (total, order) =>
          total +
          Number(order.totalPrice || 0),
        0
      );

    const operationalOrders =
      sortedOrders.filter(
        (order) =>
          order.status !==
          "CANCELLED"
      );

    const totalWeight =
      operationalOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.laundryWeight || 0
          ),
        0
      );

    const totalLoads =
      operationalOrders.reduce(
        (total, order) =>
          total +
          Number(order.loadCount || 0),
        0
      );

    const averageOrderValue =
      paidOrders.length > 0
        ? totalRevenue /
          paidOrders.length
        : 0;

    const largestOrder =
      sortedOrders.reduce(
        (largest, order) =>
          Number(
            order.totalPrice || 0
          ) >
          Number(
            largest?.totalPrice || 0
          )
            ? order
            : largest,
        null as Order | null
      );

    const oldestUnpaidOrder =
      unpaidOrders.reduce(
        (oldest, order) =>
          getDaysUnpaid(order) >
          getDaysUnpaid(
            oldest ?? order
          )
            ? order
            : oldest,
        null as Order | null
      );

    const serviceBreakdown =
      SERVICE_TYPES.map(
        (service) => {
          const matchingOrders =
            sortedOrders.filter(
              (order) =>
                order.serviceType ===
                  service.value &&
                order.status !==
                  "CANCELLED"
            );

          const paidServiceOrders =
            matchingOrders.filter(
              (order) =>
                order.paymentStatus ===
                  "PAID" &&
                order.status !==
                  "CANCELLED"
            );

          const revenue =
            paidServiceOrders.reduce(
              (total, order) =>
                total +
                Number(
                  order.totalPrice || 0
                ),
              0
            );

          const weight =
            matchingOrders.reduce(
              (total, order) =>
                total +
                Number(
                  order.laundryWeight ||
                    0
                ),
              0
            );

          return {
            value: service.value,
            label: service.label,
            orderCount:
              matchingOrders.length,
            paidOrderCount:
              paidServiceOrders.length,
            revenue,
            weight,
          };
        }
      )
        .filter(
          (service) =>
            service.orderCount > 0
        )
        .sort(
          (first, second) =>
            second.revenue -
            first.revenue
        );

    return {
      orders: sortedOrders,
      paidOrders,
      unpaidOrders,
      cancelledOrders,
      totalRevenue,
      unpaidAmount,
      totalWeight,
      totalLoads,
      averageOrderValue,
      largestOrder,
      oldestUnpaidOrder,
      serviceBreakdown,
      startDate,
      endDate,
    };
  }, [
    orders,
    reportType,
    selectedDate,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    serviceFilter,
    statusFilter,
    paymentFilter,
    fulfillmentFilter,
    searchTerm,
  ]);

  const activeFilterCount = [
    serviceFilter !== "ALL",
    statusFilter !== "ALL",
    paymentFilter !== "ALL",
    fulfillmentFilter !== "ALL",
    searchTerm.trim() !== "",
  ].filter(Boolean).length;

  function resetFilters() {
    setServiceFilter("ALL");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setFulfillmentFilter("ALL");
    setSearchTerm("");
  }

  function exportCsv() {
    const headings = [
      "Order Number",
      "Order Date",
      "Payment Date",
      "Customer",
      "Phone",
      "Service",
      "Weight (kg)",
      "Loads",
      "Status",
      "Payment Status",
      "Fulfillment",
      "Total",
      "Received By",
    ];

    const rows = reportData.orders.map(
      (order) => [
        order.orderNumber,
        formatDateTime(
          order.createdAt
        ),
        order.paidAt
          ? formatDateTime(order.paidAt)
          : "",
        getCustomerName(order),
        getCustomerPhone(order),
        getLabel(
          SERVICE_TYPES,
          order.serviceType
        ),
        Number(
          order.laundryWeight || 0
        ).toFixed(1),
        order.loadCount,
        getLabel(
          ORDER_STATUSES,
          order.status
        ),
        getLabel(
          PAYMENT_STATUSES,
          order.paymentStatus
        ),
        getLabel(
          FULFILLMENT_TYPES,
          order.fulfillmentType
        ),
        Number(
          order.totalPrice || 0
        ).toFixed(2),
        order.receivedBy ||
          "Not provided",
      ]
    );

    const csvContent = [
      headings
        .map(escapeCsvValue)
        .join(","),
      ...rows.map((row) =>
        row
          .map(escapeCsvValue)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const reportName =
      reportType
        .toLowerCase()
        .replaceAll("_", "-");

    link.href = url;
    link.download =
      `${reportName}-${todayString}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <section className="reports-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />
          <span>Loading reports...</span>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="reports-page">
        <div className="dashboard-error">
          <h2>Reports unavailable</h2>
          <p>{errorMessage}</p>

          <button
            type="button"
            className="dashboard-retry-button"
            onClick={() =>
              void loadReportsData(true)
            }
          >
            <FaSyncAlt />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const reportTitle =
    REPORT_TYPES.find(
      (report) =>
        report.value === reportType
    )?.label ?? "Report";

  const reportDescription =
    getReportDescription(reportType);

  const reportRangeLabel =
    getDateRangeLabel(
      reportType,
      reportData.startDate,
      reportData.endDate
    );

  return (
    <section className="reports-page">
      <div className="page-header">
        <div>
          <h2>Reports</h2>

          <p>
            Generate and review laundry
            business reports.
          </p>
        </div>

        <div className="reports-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              void loadReportsData(true)
            }
            disabled={refreshing}
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "dashboard-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              window.print()
            }
          >
            <FaPrint />
            Print
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={exportCsv}
            disabled={
              reportData.orders.length ===
                0 ||
              hasInvalidCustomRange
            }
          >
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      <div className="reports-type-grid">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.value}
            type="button"
            className={
              reportType === report.value
                ? "report-type-button active"
                : "report-type-button"
            }
            onClick={() =>
              setReportType(report.value)
            }
          >
            {getReportIcon(
              report.value
            )}

            <span>
              {report.label}
            </span>
          </button>
        ))}
      </div>

      <div className="reports-toolbar">
        {reportType ===
          "DAILY_SALES" && (
          <div className="reports-filter-group">
            <label htmlFor="reportDate">
              Report Date
            </label>

            <input
              id="reportDate"
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
            />
          </div>
        )}

        {reportType ===
          "MONTHLY_SALES" && (
          <div className="reports-filter-group">
            <label htmlFor="reportMonth">
              Report Month
            </label>

            <input
              id="reportMonth"
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
            />
          </div>
        )}

        {reportType ===
          "YEARLY_SALES" && (
          <div className="reports-filter-group">
            <label htmlFor="reportYear">
              Report Year
            </label>

            <input
              id="reportYear"
              type="number"
              min="2000"
              max="9999"
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  event.target.value
                )
              }
            />
          </div>
        )}

        {reportType ===
          "ALL_TIME" && (
          <div className="reports-filter-group">
            <label>
              Report Coverage
            </label>

            <input
              value="All active records"
              readOnly
              aria-label="All active records"
            />
          </div>
        )}

        {reportType ===
          "CUSTOM_RANGE" && (
          <>
            <div className="reports-filter-group">
              <label htmlFor="reportStartDate">
                Start Date
              </label>

              <input
                id="reportStartDate"
                type="date"
                value={customStartDate}
                onChange={(event) =>
                  setCustomStartDate(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="reports-filter-group">
              <label htmlFor="reportEndDate">
                End Date
              </label>

              <input
                id="reportEndDate"
                type="date"
                value={customEndDate}
                min={customStartDate}
                onChange={(event) =>
                  setCustomEndDate(
                    event.target.value
                  )
                }
              />
            </div>
          </>
        )}

        <div className="reports-filter-group reports-search">
          <label htmlFor="reportSearch">
            Search
          </label>

          <input
            id="reportSearch"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Order, customer, phone, or employee"
          />
        </div>

        <div className="reports-filter-group">
          <label htmlFor="reportService">
            Service
          </label>

          <select
            id="reportService"
            value={serviceFilter}
            onChange={(event) =>
              setServiceFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Services
            </option>

            {SERVICE_TYPES.map(
              (service) => (
                <option
                  key={service.value}
                  value={service.value}
                >
                  {service.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="reports-filter-group">
          <label htmlFor="reportStatus">
            Status
          </label>

          <select
            id="reportStatus"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            {ORDER_STATUSES.map(
              (status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="reports-filter-group">
          <label htmlFor="reportPayment">
            Payment
          </label>

          <select
            id="reportPayment"
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Payments
            </option>

            {PAYMENT_STATUSES.map(
              (payment) => (
                <option
                  key={payment.value}
                  value={payment.value}
                >
                  {payment.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="reports-filter-group">
          <label htmlFor="reportFulfillment">
            Fulfillment
          </label>

          <select
            id="reportFulfillment"
            value={fulfillmentFilter}
            onChange={(event) =>
              setFulfillmentFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All Fulfillment
            </option>

            {FULFILLMENT_TYPES.map(
              (fulfillment) => (
                <option
                  key={fulfillment.value}
                  value={
                    fulfillment.value
                  }
                >
                  {fulfillment.label}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          className="icon-button reset-filter-button reports-reset-button"
          title="Reset Filters"
          aria-label="Reset Filters"
          onClick={resetFilters}
          disabled={
            activeFilterCount === 0
          }
        >
          <FaUndoAlt />
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="orders-result-summary">
          <span>
            <strong>
              {activeFilterCount}
            </strong>{" "}
            additional filter
            {activeFilterCount === 1
              ? ""
              : "s"}{" "}
            applied
          </span>
        </div>
      )}

      {hasInvalidCustomRange && (
        <div className="dashboard-inline-warning">
          The custom start date cannot be
          later than the end date.
        </div>
      )}

      <div
        className="reports-print-area"
        id="reports-print-area"
      >
        <div className="reports-title-block">
          <div>
            <h3>
              Lava Co. Laundry Hub
            </h3>

            <p>{reportTitle}</p>

            <small>
              {reportDescription}
            </small>
          </div>

          <div>
            <span>Report Period</span>

            <strong>
              {reportRangeLabel}
            </strong>

            <span>Last Updated</span>

            <strong>
              {lastUpdated
                ? formatDateTime(
                    lastUpdated.toISOString()
                  )
                : "Not updated yet"}
            </strong>
          </div>
        </div>

        <div className="reports-summary-grid">
          <article className="reports-summary-card reports-primary-card">
            <span><FaCoins /> Paid Revenue</span>

            <strong>
              {formatCurrency(
                reportData.totalRevenue
              )}
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaClipboardList /> Total Orders</span>

            <strong>
              {reportData.orders.length}
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaWallet /> Paid Orders</span>

            <strong>
              {reportData.paidOrders.length}
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaExclamationCircle /> Unpaid Orders</span>

            <strong>
              {
                reportData.unpaidOrders
                  .length
              }
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaMoneyBillWave /> Unpaid Amount</span>

            <strong>
              {formatCurrency(
                reportData.unpaidAmount
              )}
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaTshirt /> Total Weight</span>

            <strong>
              {reportData.totalWeight.toFixed(
                1
              )}{" "}
              kg
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaChartBar /> Total Loads</span>

            <strong>
              {reportData.totalLoads}
            </strong>
          </article>

          <article className="reports-summary-card">
            <span><FaCoins /> Average Sale</span>

            <strong>
              {formatCurrency(
                reportData.averageOrderValue
              )}
            </strong>
          </article>
        </div>

        {reportType ===
          "YEARLY_SALES" && (
          <section className="reports-panel">
            <div className="reports-panel-header">
              <div>
                <h3>
                  Monthly Year Overview
                </h3>

                <p>
                  Paid revenue, active orders,
                  weight, and loads for each month.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Active Orders</th>
                    <th>Paid Orders</th>
                    <th>Revenue</th>
                    <th>Weight</th>
                    <th>Loads</th>
                  </tr>
                </thead>

                <tbody>
                  {Array.from(
                    { length: 12 },
                    (_, monthIndex) => {
                      const monthOrders =
                        reportData.orders.filter(
                          (order) => {
                            const date =
                              new Date(
                                order.createdAt
                              );

                            return (
                              !Number.isNaN(
                                date.getTime()
                              ) &&
                              date.getMonth() ===
                                monthIndex &&
                              order.status !==
                                "CANCELLED"
                            );
                          }
                        );

                      const paidMonthOrders =
                        monthOrders.filter(
                          (order) =>
                            order.paymentStatus ===
                            "PAID"
                        );

                      return (
                        <tr key={monthIndex}>
                          <td>
                            {new Date(
                              Number(selectedYear),
                              monthIndex,
                              1
                            ).toLocaleDateString(
                              "en-PH",
                              {
                                month: "long",
                              }
                            )}
                          </td>

                          <td>
                            {monthOrders.length}
                          </td>

                          <td>
                            {
                              paidMonthOrders.length
                            }
                          </td>

                          <td className="table-total">
                            {formatCurrency(
                              paidMonthOrders.reduce(
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
                              )
                            )}
                          </td>

                          <td>
                            {monthOrders
                              .reduce(
                                (
                                  total,
                                  order
                                ) =>
                                  total +
                                  Number(
                                    order.laundryWeight ||
                                      0
                                  ),
                                0
                              )
                              .toFixed(1)}{" "}
                            kg
                          </td>

                          <td>
                            {monthOrders.reduce(
                              (
                                total,
                                order
                              ) =>
                                total +
                                Number(
                                  order.loadCount ||
                                    0
                                ),
                              0
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {reportType ===
          "REVENUE_BY_SERVICE" && (
          <section className="reports-panel">
            <div className="reports-panel-header">
              <div>
                <h3>
                  Revenue by Service
                </h3>

                <p>
                  Paid revenue and order
                  totals per service.
                </p>
              </div>
            </div>

            {reportData.serviceBreakdown
              .length === 0 ? (
              <div className="dashboard-empty-state">
                <strong>
                  No service revenue data
                </strong>

                <p>
                  Adjust the report filters or
                  record paid orders first.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="customer-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Orders</th>
                      <th>Paid Orders</th>
                      <th>Weight</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportData.serviceBreakdown.map(
                      (service) => (
                        <tr key={service.value}>
                          <td>
                            {service.label}
                          </td>

                          <td>
                            {
                              service.orderCount
                            }
                          </td>

                          <td>
                            {
                              service.paidOrderCount
                            }
                          </td>

                          <td>
                            {service.weight.toFixed(
                              1
                            )}{" "}
                            kg
                          </td>

                          <td className="table-total">
                            {formatCurrency(
                              service.revenue
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {reportType ===
          "LAUNDRY_VOLUME" && (
          <section className="reports-panel">
            <div className="reports-panel-header">
              <div>
                <h3>
                  Laundry Volume Summary
                </h3>

                <p>
                  Laundry weight and load
                  totals by service.
                </p>
              </div>
            </div>

            {reportData.serviceBreakdown
              .length === 0 ? (
              <div className="dashboard-empty-state">
                <strong>
                  No laundry volume data
                </strong>

                <p>
                  Laundry weight and load
                  totals will appear here.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="customer-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Orders</th>
                      <th>Weight</th>
                      <th>Average Weight</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportData.serviceBreakdown.map(
                      (service) => (
                        <tr key={service.value}>
                          <td>
                            {service.label}
                          </td>

                          <td>
                            {
                              service.orderCount
                            }
                          </td>

                          <td>
                            {service.weight.toFixed(
                              1
                            )}{" "}
                            kg
                          </td>

                          <td>
                            {service.orderCount >
                            0
                              ? (
                                  service.weight /
                                  service.orderCount
                                ).toFixed(1)
                              : "0.0"}{" "}
                            kg
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="reports-panel">
          <div className="reports-panel-header">
            <div>
              <h3>
                {reportType ===
                "UNPAID_ORDERS"
                  ? "Unpaid Order Details"
                  : reportType ===
                    "PAID_ORDERS"
                  ? "Paid Order Details"
                  : "Order Details"}
              </h3>

              <p>
                Showing{" "}
                {reportData.orders.length}{" "}
                matching order
                {reportData.orders.length ===
                1
                  ? ""
                  : "s"}
                .
              </p>
            </div>
          </div>

          {reportData.orders.length ===
          0 ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-icon">
                <FaClipboardList />
              </div>

              <strong>
                No matching report records
              </strong>

              <p>
                Change the report type, date,
                search, or filters and try
                again.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="customer-table reports-table">
                <thead>
                  <tr>
                    <th>
                      {reportType ===
                      "PAID_ORDERS"
                        ? "Payment Date"
                        : "Order Date"}
                    </th>

                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Weight</th>
                    <th>Status</th>
                    <th>Payment</th>

                    {reportType ===
                      "UNPAID_ORDERS" && (
                      <th>Days Unpaid</th>
                    )}

                    <th>Total</th>
                    <th>Received By</th>
                  </tr>
                </thead>

                <tbody>
                  {reportData.orders.map(
                    (order) => (
                      <tr key={order.id}>
                        <td>
                          {formatDate(
                            reportType ===
                            "PAID_ORDERS"
                              ? getRevenueDate(
                                  order
                                )
                              : order.createdAt
                          )}
                        </td>

                        <td>
                          {order.orderNumber}
                        </td>

                        <td>
                          {getCustomerName(
                            order
                          )}

                          <small className="table-subtext">
                            {getCustomerPhone(
                              order
                            )}
                          </small>
                        </td>

                        <td>
                          {getLabel(
                            SERVICE_TYPES,
                            order.serviceType
                          )}
                        </td>

                        <td>
                          {Number(
                            order.laundryWeight ||
                              0
                          ).toFixed(1)}{" "}
                          kg

                          <small className="table-subtext">
                            {order.loadCount} load
                            {order.loadCount ===
                            1
                              ? ""
                              : "s"}
                          </small>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${order.status.toLowerCase()}`}
                          >
                            {getLabel(
                              ORDER_STATUSES,
                              order.status
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`payment-badge payment-${order.paymentStatus.toLowerCase()}`}
                          >
                            {getLabel(
                              PAYMENT_STATUSES,
                              order.paymentStatus
                            )}
                          </span>
                        </td>

                        {reportType ===
                          "UNPAID_ORDERS" && (
                          <td>
                            {getDaysUnpaid(
                              order
                            )}{" "}
                            day
                            {getDaysUnpaid(
                              order
                            ) === 1
                              ? ""
                              : "s"}
                          </td>
                        )}

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
      </div>
    </section>
  );
}

export default ReportsPage;