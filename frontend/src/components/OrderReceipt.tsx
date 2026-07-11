import type { Order } from "../types/order";
import {
  FULFILLMENT_TYPES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";

type OrderReceiptProps = {
  order: Order;
};

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

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OrderReceipt({ order }: OrderReceiptProps) {
  const customerName =
    order.customer?.name ??
    order.walkInCustomerName ??
    "Walk-in Customer";

  const customerPhone =
    order.customer?.phone ??
    order.walkInCustomerPhone ??
    "Not provided";

  return (
    <div className="receipt" id="order-receipt">
      <header className="receipt-header">
        <h2>Lavaco Laundry Hub</h2>
        <p>Laundry Service Receipt</p>
      </header>

      <div className="receipt-divider" />

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Order Number</span>
          <strong>{order.orderNumber}</strong>
        </div>

        <div className="receipt-row">
          <span>Date</span>
          <strong>{formatDate(order.createdAt)}</strong>
        </div>

        <div className="receipt-row">
          <span>Customer</span>
          <strong>{customerName}</strong>
        </div>

        <div className="receipt-row">
          <span>Contact</span>
          <strong>{customerPhone}</strong>
        </div>

        <div className="receipt-row">
          <span>Received By</span>
          <strong>{order.receivedBy || "Not provided"}</strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Laundry Weight</span>
          <strong>
            {Number(order.laundryWeight).toFixed(1)} kg
          </strong>
        </div>

        <div className="receipt-row">
          <span>Number of Loads</span>
          <strong>{order.loadCount}</strong>
        </div>

        <div className="receipt-row">
          <span>Service</span>
          <strong>
            {getLabel(SERVICE_TYPES, order.serviceType)}
          </strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-charges">
        <div className="receipt-charge-row">
          <span>
            Service ({order.loadCount} load
            {order.loadCount === 1 ? "" : "s"} ×{" "}
            {formatCurrency(order.servicePricePerLoad)})
          </span>

          <strong>
            {formatCurrency(order.serviceSubtotal)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            Rinse Cycles ({order.rinseCycles})
          </span>

          <strong>{formatCurrency(order.rinseFee)}</strong>
        </div>

        <div className="receipt-charge-row">
          <span>Soap / Detergent</span>

          <strong>{formatCurrency(order.soapPrice)}</strong>
        </div>

        <div className="receipt-charge-row">
          <span>Fabric Softener</span>

          <strong>
            {formatCurrency(order.softenerPrice)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            {getLabel(
              FULFILLMENT_TYPES,
              order.fulfillmentType
            )}
          </span>

          <strong>
            {formatCurrency(order.deliveryFee)}
          </strong>
        </div>
      </section>

      <div className="receipt-total">
        <span>Total Amount</span>
        <strong>{formatCurrency(order.totalPrice)}</strong>
      </div>

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Payment</span>

          <strong>
            {getLabel(
              PAYMENT_STATUSES,
              order.paymentStatus
            )}
          </strong>
        </div>

        {order.instructions && (
          <div className="receipt-notes">
            <span>Special Instructions</span>
            <p>{order.instructions}</p>
          </div>
        )}
      </section>

      <div className="receipt-divider" />

      <footer className="receipt-footer">
        <p>Please present this receipt when claiming your laundry.</p>
        <strong>Thank you for choosing Lavaco Laundry Hub!</strong>
      </footer>
    </div>
  );
}

export default OrderReceipt;