import { useEffect, useState } from "react";
import {
  createOrder,
  deleteOrder,
  getOrders,
  updateOrder,
} from "../api/orderApi";
import { getCustomers } from "../api/customerApi";
import Modal from "../components/Modal";
import OrderForm from "../components/OrderForm";
import type { Order } from "../types/order";
import type { Customer } from "../types/customer";
import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaUndoAlt,
} from "react-icons/fa";
import OrderReceipt from "../components/OrderReceipt";
import Toast from "../components/Toast";

function getLabel(
  options: { value: string; label: string }[],
  value: string
) {
  return (
    options.find((option) => option.value === value)?.label ??
    value
  );
}

function formatCurrency(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function formatWeight(value: number) {
  return `${Number(value || 0).toFixed(1)} kg`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [viewOrder, setViewOrder] =
    useState<Order | null>(null);

  const [toast, setToast] = useState<{
  message: string;
  type: "success" | "error";
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const [sortOption, setSortOption] = useState("NEWEST");

  async function loadData() {
  setLoading(true);

  try {
    const ordersData = await getOrders();
    setOrders(Array.isArray(ordersData) ? ordersData : []);
  } catch (error) {
    console.error("Failed to load orders:", error);

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to load orders.",
      "error"
    );

    setOrders([]);
  }

  try {
    const customersData = await getCustomers();
    setCustomers(
      Array.isArray(customersData)
        ? customersData
        : []
    );
  } catch (error) {
    console.error("Failed to load customers:", error);

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to load customers.",
      "error"
    );

    setCustomers([]);
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  loadData();
}, []);

function showToast(
  message: string,
  type: "success" | "error" = "success"
) {
  setToast({
    message,
    type,
  });

  setTimeout(() => {
    setToast(null);
  }, 3000);
}

  async function handleCreateOrder(
  data: Parameters<typeof createOrder>[0]
) {
  try {
    const createdOrder = await createOrder(data);

    await loadData();

    setIsCreateModalOpen(false);
    setViewOrder(createdOrder);

    showToast(
      "Order created successfully!",
      "success"
    );
  } catch (error) {
    console.error(error);

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to create order.",
      "error"
    );
  }
}

  async function handleUpdateOrder(
  data: Parameters<typeof updateOrder>[1]
) {
  if (!selectedOrder) return;

  try {
    const updatedOrder = await updateOrder(
      selectedOrder.id,
      data
    );

    await loadData();

    setSelectedOrder(null);

    setViewOrder(updatedOrder);

    showToast(
      "Order updated successfully!",
      "success"
    );
  } catch (error) {
    console.error(error);

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to update order.",
      "error"
    );
  }
}

  async function handleDeleteOrder(id: number) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this order?"
  );

  if (!confirmed) return;

  try {
    await deleteOrder(id);

    await loadData();

    if (viewOrder?.id === id) {
      setViewOrder(null);
    }

    showToast(
      "Order deleted successfully!",
      "success"
    );
  } catch (error) {
    console.error(error);

    showToast(
      error instanceof Error
        ? error.message
        : "Failed to delete order.",
      "error"
    );
  }
}

  function openCreateModal() {
    setSelectedOrder(null);
    setViewOrder(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(order: Order) {
    setViewOrder(null);
    setSelectedOrder(order);
  }

  function editFromDetails(order: Order) {
    setViewOrder(null);
    setSelectedOrder(order);
  }

  const filteredOrders = orders.filter((order) => {
  const orderNumber = String(
    order.orderNumber ?? ""
  ).toLowerCase();

  const customerName = String(
    order.customer?.name ??
      order.walkInCustomerName ??
      ""
  ).toLowerCase();

  const normalizedSearch =
    searchTerm.trim().toLowerCase();

  const matchesSearch =
    normalizedSearch === "" ||
    orderNumber.includes(normalizedSearch) ||
    customerName.includes(normalizedSearch);

  const matchesStatus =
    statusFilter === "ALL" ||
    order.status === statusFilter;

  const matchesPayment =
    paymentFilter === "ALL" ||
    order.paymentStatus === paymentFilter;

  return (
    matchesSearch &&
    matchesStatus &&
    matchesPayment
  );
});

const displayedOrders = [...filteredOrders].sort(
  (firstOrder, secondOrder) => {
    switch (sortOption) {
      case "OLDEST":
        return (
          new Date(
            firstOrder.createdAt ?? 0
          ).getTime() -
          new Date(
            secondOrder.createdAt ?? 0
          ).getTime()
        );

      case "TOTAL_HIGH":
        return (
          Number(secondOrder.totalPrice ?? 0) -
          Number(firstOrder.totalPrice ?? 0)
        );

      case "TOTAL_LOW":
        return (
          Number(firstOrder.totalPrice ?? 0) -
          Number(secondOrder.totalPrice ?? 0)
        );

      case "CUSTOMER_AZ": {
        const firstName = String(
          firstOrder.customer?.name ??
            firstOrder.walkInCustomerName ??
            ""
        );

        const secondName = String(
          secondOrder.customer?.name ??
            secondOrder.walkInCustomerName ??
            ""
        );

        return firstName.localeCompare(secondName);
      }

      case "NEWEST":
      default:
        return (
          new Date(
            secondOrder.createdAt ?? 0
          ).getTime() -
          new Date(
            firstOrder.createdAt ?? 0
          ).getTime()
        );
    }
  }
);

const totalOrders = orders.length;

const activeOrders = orders.filter(
  (order) =>
    order.status !== "COMPLETED" &&
    order.status !== "CANCELLED"
).length;

const readyOrders = orders.filter(
  (order) =>
    order.status === "READY_FOR_PICKUP" ||
    order.status === "OUT_FOR_DELIVERY"
).length;

const unpaidOrders = orders.filter(
  (order) => order.paymentStatus === "UNPAID"
).length;

  if (loading) {
    return <p>Loading orders...</p>;
  }

  return (
    <section className="orders-page">
      <div className="page-header">
        <div>
          <h2>Orders</h2>
          <p>Manage Lavaco laundry orders.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateModal}
        >
          + New Order
        </button>
      </div>

<div className="orders-summary-grid">
  <div className="orders-summary-card">
    <span>Total Orders</span>
    <strong>{totalOrders}</strong>
  </div>

  <div className="orders-summary-card">
    <span>Active Orders</span>
    <strong>{activeOrders}</strong>
  </div>

  <div className="orders-summary-card">
    <span>Ready / Delivery</span>
    <strong>{readyOrders}</strong>
  </div>

  <div className="orders-summary-card">
    <span>Unpaid Orders</span>
    <strong>{unpaidOrders}</strong>
  </div>
</div>

<div className="orders-toolbar">
  <div className="orders-search">
    <label htmlFor="orderSearch">
      Search Orders
    </label>

    <input
      id="orderSearch"
      type="search"
      value={searchTerm}
      onChange={(event) =>
        setSearchTerm(event.target.value)
      }
      placeholder="Order number or customer name"
    />
  </div>

  <div className="orders-filter">
    <label htmlFor="statusFilter">
      Status
    </label>

    <select
      id="statusFilter"
      value={statusFilter}
      onChange={(event) =>
        setStatusFilter(event.target.value)
      }
    >
      <option value="ALL">All Statuses</option>

      {ORDER_STATUSES.map((status) => (
        <option
          key={status.value}
          value={status.value}
        >
          {status.label}
        </option>
      ))}
    </select>
  </div>

  <div className="orders-filter">
    <label htmlFor="paymentFilter">
      Payment
    </label>

    <select
      id="paymentFilter"
      value={paymentFilter}
      onChange={(event) =>
        setPaymentFilter(event.target.value)
      }
    >
      <option value="ALL">
        All Payments
      </option>

      {PAYMENT_STATUSES.map((payment) => (
        <option
          key={payment.value}
          value={payment.value}
        >
          {payment.label}
        </option>
      ))}
    </select>
  </div>

<div className="orders-filter">
  <label htmlFor="sortOption">
    Sort By
  </label>

  <div className="sort-actions">
    <select
      id="sortOption"
      value={sortOption}
      onChange={(event) =>
        setSortOption(event.target.value)
      }
    >
      <option value="NEWEST">
        Newest First
      </option>

      <option value="OLDEST">
        Oldest First
      </option>

      <option value="TOTAL_HIGH">
        Highest Total
      </option>

      <option value="TOTAL_LOW">
        Lowest Total
      </option>

      <option value="CUSTOMER_AZ">
        Customer A–Z
      </option>
    </select>

    <button
      type="button"
      className="icon-button reset-filter-button"
      title="Clear Filters"
      aria-label="Clear Filters"
      onClick={() => {
        setSearchTerm("");
        setStatusFilter("ALL");
        setPaymentFilter("ALL");
        setSortOption("NEWEST");
      }}
    >
      <FaUndoAlt />
    </button>
  </div>
</div>
</div>

<div className="orders-result-summary">
  <span>
    Showing{" "}
    <strong>{displayedOrders.length}</strong> of{" "}
    <strong>{orders.length}</strong> orders
  </span>
</div>

      {displayedOrders.length === 0 ? (
       <p>
        {orders.length === 0
          ? "No orders yet."
          : "No orders match the current filters."}
      </p>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Weight</th>
                <th>Service</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>

                  <td>
                    {order.customer?.name ??
                      order.walkInCustomerName ??
                      "Unknown Customer"}
                  </td>

                  <td>
                    {Number(order.laundryWeight).toFixed(1)} kg
                    <small className="table-subtext">
                      {order.loadCount} load
                      {order.loadCount === 1 ? "" : "s"}
                    </small>
                  </td>

                  <td>
                    {getLabel(
                      SERVICE_TYPES,
                      order.serviceType
                    )}
                  </td>

                  <td>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
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

                  <td className="table-total">
                    {formatCurrency(order.totalPrice)}
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-button view-button"
                        title="View Order"
                        aria-label={`View ${order.orderNumber}`}
                        onClick={() => setViewOrder(order)}
                      >
                        <FaEye />
                      </button>

                      <button
                        type="button"
                        className="icon-button edit-button"
                        title="Edit Order"
                        aria-label={`Edit ${order.orderNumber}`}
                        onClick={() => openEditModal(order)}
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete-button"
                        title="Delete Order"
                        aria-label={`Delete ${order.orderNumber}`}
                        onClick={() =>
                          handleDeleteOrder(order.id)
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isCreateModalOpen && (
        <Modal
          title="New Laundry Order"
          onClose={() => setIsCreateModalOpen(false)}
        >
          <OrderForm
            customers={customers}
            onSubmit={handleCreateOrder}
          />
        </Modal>
      )}

      {selectedOrder && (
        <Modal
          title="Edit Laundry Order"
          onClose={() => setSelectedOrder(null)}
        >
          <OrderForm
            customers={customers}
            selectedOrder={selectedOrder}
            onSubmit={handleUpdateOrder}
          />
        </Modal>
      )}

      {viewOrder && (
        <Modal
          title={`Order Details — ${viewOrder.orderNumber}`}
          onClose={() => setViewOrder(null)}
        >
          <div className="order-details">
            <section className="order-details-section">
              <h3>Customer Information</h3>

              <div className="order-details-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {viewOrder.customer?.name ??
                      viewOrder.walkInCustomerName ??
                      "Unknown Customer"}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>
                    {viewOrder.customer?.phone ??
                      viewOrder.walkInCustomerPhone ??
                      "Not provided"}
                  </strong>
                </div>

                <div className="details-full-width">
                  <span>Address</span>
                  <strong>
                    {viewOrder.customer?.address ??
                      viewOrder.walkInCustomerAddress ??
                      "Not provided"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="order-details-section">
              <h3>Laundry Details</h3>

              <div className="order-details-grid">
                <div>
                  <span>Weight</span>
                  <strong>
                    {formatWeight(viewOrder.laundryWeight)}
                  </strong>
                </div>

                <div>
                  <span>Number of Loads</span>
                  <strong>{viewOrder.loadCount}</strong>
                </div>

                <div>
                  <span>Mixed White & Colored</span>
                  <strong>
                    {viewOrder.hasMixedWhiteColor
                      ? "Yes"
                      : "No"}
                  </strong>
                </div>

                <div className="details-full-width">
                  <span>Special Instructions</span>
                  <strong>
                    {viewOrder.instructions ||
                      "No special instructions"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="order-details-section">
              <h3>Service and Charges</h3>

              <div className="order-charge-list">
                <div>
                  <span>
                    {getLabel(
                      SERVICE_TYPES,
                      viewOrder.serviceType
                    )}
                    {" — "}
                    {viewOrder.loadCount} load
                    {viewOrder.loadCount === 1 ? "" : "s"}
                  </span>

                  <strong>
                    {formatCurrency(
                      viewOrder.serviceSubtotal
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Price per Load
                  </span>

                  <strong>
                    {formatCurrency(
                      viewOrder.servicePricePerLoad
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Rinse Cycles ({viewOrder.rinseCycles})
                  </span>

                  <strong>
                    {formatCurrency(viewOrder.rinseFee)}
                  </strong>
                </div>

                <div>
                  <span>Soap / Detergent</span>

                  <strong>
                    {formatCurrency(viewOrder.soapPrice)}
                  </strong>
                </div>

                <div>
                  <span>Fabric Softener</span>

                  <strong>
                    {formatCurrency(
                      viewOrder.softenerPrice
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    {getLabel(
                      FULFILLMENT_TYPES,
                      viewOrder.fulfillmentType
                    )}
                  </span>

                  <strong>
                    {formatCurrency(
                      viewOrder.deliveryFee
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="order-details-section">
              <h3>Status and Staff</h3>

              <div className="order-details-grid">
                <div>
                  <span>Order Status</span>
                  <strong>
                    {getLabel(
                      ORDER_STATUSES,
                      viewOrder.status
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Status</span>
                  <strong>
                    {getLabel(
                      PAYMENT_STATUSES,
                      viewOrder.paymentStatus
                    )}
                  </strong>
                </div>

                <div>
                  <span>Received By</span>
                  <strong>
                    {viewOrder.receivedBy ||
                      "Not provided"}
                  </strong>
                </div>

                <div>
                  <span>Claimed By</span>
                  <strong>
                    {viewOrder.claimedBy ||
                      "Not claimed yet"}
                  </strong>
                </div>

                <div className="details-full-width">
                  <span>Created At</span>
                  <strong>
                    {formatDate(viewOrder.createdAt)}
                  </strong>
                </div>
              </div>
            </section>

            <div className="order-details-total">
              <span>Total Amount</span>
              <strong>
                {formatCurrency(viewOrder.totalPrice)}
              </strong>
            </div>

            <div className="receipt-print-area">
              <OrderReceipt order={viewOrder} />
            </div>

            <div className="order-details-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewOrder(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.print()}
              >
                Print Receipt
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => editFromDetails(viewOrder)}
              >
                Edit Order
              </button>
            </div>
          </div>
        </Modal>
      )}

            {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}

export default OrdersPage;