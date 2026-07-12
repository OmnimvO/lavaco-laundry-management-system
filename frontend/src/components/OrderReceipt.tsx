import type { Order } from "../types/order";
import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
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

function formatPackLabel(quantity: number) {
  return `${quantity} pack${quantity === 1 ? "" : "s"}`;
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

  const customerAddress =
    order.customer?.address ??
    order.walkInCustomerAddress ??
    "Not provided";

  const serviceLabel = getLabel(
    SERVICE_TYPES,
    order.serviceType
  );

  const fulfillmentLabel = getLabel(
    FULFILLMENT_TYPES,
    order.fulfillmentType
  );

  const paymentLabel = getLabel(
    PAYMENT_STATUSES,
    order.paymentStatus
  );

  const statusLabel = getLabel(
    ORDER_STATUSES,
    order.status
  );

  return (
    <div className="receipt" id="order-receipt">
      <header className="receipt-header">
        <h2>Lava Co. Laundry Hub</h2>
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
          <span>Address</span>
          <strong>{customerAddress}</strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Laundry Weight</span>

          <strong>
            {Number(order.laundryWeight || 0).toFixed(1)} kg
          </strong>
        </div>

        <div className="receipt-row">
          <span>Number of Loads</span>

          <strong>
            {order.loadCount} load
            {order.loadCount === 1 ? "" : "s"}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Service</span>
          <strong>{serviceLabel}</strong>
        </div>

        <div className="receipt-row">
          <span>Rinse Cycles</span>
          <strong>{order.rinseCycles}</strong>
        </div>

        <div className="receipt-row">
          <span>Fulfillment</span>
          <strong>{fulfillmentLabel}</strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-charges">
        <div className="receipt-charge-row">
          <span>
            {serviceLabel}
            <small className="receipt-charge-detail">
              {order.loadCount} load
              {order.loadCount === 1 ? "" : "s"} ×{" "}
              {formatCurrency(
                order.servicePricePerLoad
              )}
            </small>
          </span>

          <strong>
            {formatCurrency(order.serviceSubtotal)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            Extra Rinse
            <small className="receipt-charge-detail">
              {order.rinseCycles} cycle
              {order.rinseCycles === 1 ? "" : "s"}
              {order.rinseCycles > 2
                ? " — flat additional charge"
                : " — included"}
            </small>
          </span>

          <strong>
            {formatCurrency(order.rinseFee)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            Soap / Detergent
            <small className="receipt-charge-detail">
              {formatPackLabel(
                order.soapQuantity
              )}{" "}
              × ₱20.00
            </small>
          </span>

          <strong>
            {formatCurrency(order.soapPrice)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            Fabric Softener
            <small className="receipt-charge-detail">
              {formatPackLabel(
                order.softenerQuantity
              )}{" "}
              × ₱15.00
            </small>
          </span>

          <strong>
            {formatCurrency(order.softenerPrice)}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span>
            Pickup / Delivery
            <small className="receipt-charge-detail">
              {fulfillmentLabel}
            </small>
          </span>

          <strong>
            {formatCurrency(order.deliveryFee)}
          </strong>
        </div>
      </section>

      <div className="receipt-total">
        <span>Total Amount</span>

        <strong>
          {formatCurrency(order.totalPrice)}
        </strong>
      </div>

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Payment Status</span>
          <strong>{paymentLabel}</strong>
        </div>

        <div className="receipt-row">
          <span>Order Status</span>
          <strong>{statusLabel}</strong>
        </div>

        <div className="receipt-row">
          <span>Received By</span>

          <strong>
            {order.receivedBy || "Not provided"}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Claimed By</span>

          <strong>
            {order.claimedBy || "Not claimed yet"}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Mixed White & Colored</span>

          <strong>
            {order.hasMixedWhiteColor ? "Yes" : "No"}
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
        <p>
          Please present this receipt when claiming your
          laundry.
        </p>

        <strong>
          Thank you for choosing Lava Co. Laundry Hub!
        </strong>
      </footer>
    </div>
  );
}

export default OrderReceipt;