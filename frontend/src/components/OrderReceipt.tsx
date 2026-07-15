import type { Order } from "../types/order";

import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
} from "../constants/order";

import { useSettings } from "../hooks/useSettings";

type OrderReceiptProps = {
  order: Order;
};

type LabelOption = {
  value: string;
  label: string;
};

function getLabel(
  options: LabelOption[],
  value: string
) {
  return (
    options.find(
      (option) =>
        option.value === value
    )?.label ?? value
  );
}

function formatCurrency(
  value: number
) {
  return `₱${Number(
    value || 0
  ).toFixed(2)}`;
}

function formatDate(
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
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatPackLabel(
  quantity: number
) {
  const safeQuantity =
    Number(quantity || 0);

  return `${safeQuantity} pack${
    safeQuantity === 1 ? "" : "s"
  }`;
}

function formatLoadLabel(
  quantity: number
) {
  const safeQuantity =
    Number(quantity || 0);

  return `${safeQuantity} load${
    safeQuantity === 1 ? "" : "s"
  }`;
}

function getUnitPrice(
  totalPrice: number,
  quantity: number,
  fallbackPrice: number
) {
  const safeTotal =
    Number(totalPrice || 0);

  const safeQuantity =
    Number(quantity || 0);

  if (safeQuantity > 0) {
    return safeTotal / safeQuantity;
  }

  return Number(
    fallbackPrice || 0
  );
}

function OrderReceipt({
  order,
}: OrderReceiptProps) {
  const {
    settings,
  } = useSettings();

  const shopName =
    settings?.shopName ??
    "Lava Co. Laundry Hub";

  const shopAddress =
    settings?.shopAddress?.trim() ??
    "";

  const contactNumber =
    settings?.contactNumber?.trim() ??
    "";

  const receiptFooter =
    settings?.receiptFooter?.trim() ||
    "Thank you for choosing Lava Co. Laundry Hub!";

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

  const isCancelled =
    order.status === "CANCELLED";

  const loadLabel = formatLoadLabel(
    order.loadCount
  );

  const soapUnitPrice =
    getUnitPrice(
      order.soapPrice,
      order.soapQuantity,
      settings?.soapPrice ?? 0
    );

  const softenerUnitPrice =
    getUnitPrice(
      order.softenerPrice,
      order.softenerQuantity,
      settings?.softenerPrice ?? 0
    );

  const rinseDetail =
    order.rinseCycles > 2
      ? `${order.rinseCycles} cycles — flat ${formatCurrency(
          order.rinseFee ||
            settings?.extraRinseFee ||
            0
        )} additional charge`
      : `${order.rinseCycles} cycles — included`;

  return (
    <div
      className="receipt"
      id="order-receipt"
    >
      <header className="receipt-header">
        <h2>{shopName}</h2>

        <p>
          Laundry Service Receipt
        </p>

        {shopAddress && (
          <small className="receipt-shop-detail">
            {shopAddress}
          </small>
        )}

        {contactNumber && (
          <small className="receipt-shop-detail">
            Contact: {contactNumber}
          </small>
        )}
      </header>

      <div className="receipt-divider" />

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Order Number</span>

          <strong>
            {order.orderNumber}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Date</span>

          <strong>
            {formatDate(
              order.createdAt
            )}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Customer</span>

          <strong>
            {customerName}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Contact</span>

          <strong>
            {customerPhone}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Address</span>

          <strong>
            {customerAddress}
          </strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Laundry Weight</span>

          <strong>
            {Number(
              order.laundryWeight || 0
            ).toFixed(1)}{" "}
            kg
          </strong>
        </div>

        <div className="receipt-row">
          <span>Number of Loads</span>

          <strong>
            {loadLabel}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Service</span>

          <strong>
            {serviceLabel}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Rinse Cycles</span>

          <strong>
            {order.rinseCycles}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Fulfillment</span>

          <strong>
            {fulfillmentLabel}
          </strong>
        </div>
      </section>

      <div className="receipt-divider" />

      <section className="receipt-charges">
        <div className="receipt-charge-row">
          <span className="receipt-charge-description">
            <span className="receipt-charge-name">
              {serviceLabel}
            </span>

            <small className="receipt-charge-detail">
              {loadLabel} ×{" "}
              {formatCurrency(
                order.servicePricePerLoad
              )}
            </small>
          </span>

          <strong>
            {formatCurrency(
              order.serviceSubtotal
            )}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span className="receipt-charge-description">
            <span className="receipt-charge-name">
              Extra Rinse
            </span>

            <small className="receipt-charge-detail">
              {rinseDetail}
            </small>
          </span>

          <strong>
            {formatCurrency(
              order.rinseFee
            )}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span className="receipt-charge-description">
            <span className="receipt-charge-name">
              Soap / Detergent
            </span>

            <small className="receipt-charge-detail">
              {formatPackLabel(
                order.soapQuantity
              )}{" "}
              ×{" "}
              {formatCurrency(
                soapUnitPrice
              )}
            </small>
          </span>

          <strong>
            {formatCurrency(
              order.soapPrice
            )}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span className="receipt-charge-description">
            <span className="receipt-charge-name">
              Fabric Softener
            </span>

            <small className="receipt-charge-detail">
              {formatPackLabel(
                order.softenerQuantity
              )}{" "}
              ×{" "}
              {formatCurrency(
                softenerUnitPrice
              )}
            </small>
          </span>

          <strong>
            {formatCurrency(
              order.softenerPrice
            )}
          </strong>
        </div>

        <div className="receipt-charge-row">
          <span className="receipt-charge-description">
            <span className="receipt-charge-name">
              Pickup / Delivery
            </span>

            <small className="receipt-charge-detail">
              {fulfillmentLabel}
            </small>
          </span>

          <strong>
            {formatCurrency(
              order.deliveryFee
            )}
          </strong>
        </div>
      </section>

      <div className="receipt-total">
        <span>Total Amount</span>

        <strong>
          {formatCurrency(
            order.totalPrice
          )}
        </strong>
      </div>

      <section className="receipt-information">
        <div className="receipt-row">
          <span>Payment Status</span>

          <strong>
            {paymentLabel}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Order Status</span>

          <strong>
            {statusLabel}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Received By</span>

          <strong>
            {order.receivedBy ||
              "Not provided"}
          </strong>
        </div>

        <div className="receipt-row">
          <span>Claimed By</span>

          <strong>
            {order.claimedBy ||
              "Not claimed yet"}
          </strong>
        </div>

        <div className="receipt-row">
          <span>
            Mixed White & Colored
          </span>

          <strong>
            {order.hasMixedWhiteColor
              ? "Yes"
              : "No"}
          </strong>
        </div>

        {order.instructions && (
          <div className="receipt-notes">
            <span>
              Special Instructions
            </span>

            <p>
              {order.instructions}
            </p>
          </div>
        )}
      </section>

      <div className="receipt-divider" />

      {isCancelled && (
        <section
          className="receipt-cancelled-notice"
        >
          <h3>
            ❌ CANCELLED
          </h3>

          <p>
            This order has been cancelled.
            This receipt is provided for
            record purposes only and is
            not valid for claiming
            laundry.
          </p>
        </section>
      )}

      <footer className="receipt-footer">
        <p>
          Please present this receipt
          when claiming your laundry.
        </p>

        <strong>
          {receiptFooter}
        </strong>
      </footer>
    </div>
  );
}

export default OrderReceipt;