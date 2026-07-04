import { useEffect, useState } from "react";
import {
  createOrder,
  deleteOrder,
  getOrders,
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

function getLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function loadData() {
    try {
      const [ordersData, customersData] = await Promise.all([
        getOrders(),
        getCustomers(),
      ]);

      setOrders(ordersData);
      setCustomers(customersData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateOrder(data: Parameters<typeof createOrder>[0]) {
    await createOrder(data);
    await loadData();
    setIsCreateModalOpen(false);
  }

  async function handleDeleteOrder(id: number) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this order?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteOrder(id);
    await loadData();
  } catch (error) {
    console.error(error);
    alert("Failed to delete order.");
  }
}

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
          className="primary-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + New Order
        </button>
      </div>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table className="customer-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Baskets</th>
              <th>Service</th>
              <th>Fulfillment</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>
                  {order.customer?.name ??
                    order.walkInCustomerName ??
                    "Unknown Customer"}
                </td>
                <td>{order.basketCount}</td>
                <td>{getLabel(SERVICE_TYPES, order.serviceType)}</td>
                <td>{getLabel(FULFILLMENT_TYPES, order.fulfillmentType)}</td>
                <td>₱{order.totalPrice}</td>
                <td>{getLabel(ORDER_STATUSES, order.status)}</td>
                <td>{getLabel(PAYMENT_STATUSES, order.paymentStatus)}</td>
                <td>
                <button className="danger-button" onClick={() => handleDeleteOrder(order.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isCreateModalOpen && (
        <Modal title="New Laundry Order" onClose={() => setIsCreateModalOpen(false)}>
          <OrderForm customers={customers} onSubmit={handleCreateOrder} />
        </Modal>
      )}
    </section>
  );
}

export default OrdersPage;