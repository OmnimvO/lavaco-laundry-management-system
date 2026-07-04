import { useState } from "react";
import type { Customer } from "../types/customer";
import {
  FULFILLMENT_TYPES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
  SOAP_TYPES,
  SOFTENER_TYPES,
  WASH_TYPES,
} from "../constants/order";

interface OrderFormProps {
  customers: Customer[];
  onSubmit: (data: {
    customerId?: number | null;
    walkInCustomerName?: string;
    walkInCustomerPhone?: string;
    walkInCustomerAddress?: string;
    basketCount: number;
    serviceType: string;
    washType?: string;
    dryExtend?: boolean;
    serviceFee?: number;
    soap?: string;
    soapPrice?: number;
    softener?: string;
    softenerPrice?: number;
    fulfillmentType?: string;
    deliveryFee?: number;
    hasMixedWhiteColor?: boolean;
    receivedBy?: string;
    claimedBy?: string;
    instructions?: string;
    totalPrice: number;
    paymentStatus?: string;
  }) => Promise<void>;
}

function OrderForm({ customers, onSubmit }: OrderFormProps) {
  const [customerMode, setCustomerMode] = useState<"existing" | "walkin">(
    "existing"
  );

  const [customerId, setCustomerId] = useState("");
  const [walkInCustomerName, setWalkInCustomerName] = useState("");
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState("");
  const [walkInCustomerAddress, setWalkInCustomerAddress] = useState("");

  const [basketCount, setBasketCount] = useState(1);
  const [serviceType, setServiceType] = useState("COMPLETE_SERVICE");
  const [washType, setWashType] = useState("REGULAR");
  const [dryExtend, setDryExtend] = useState(false);

  const [serviceFee, setServiceFee] = useState(0);
  const [soap, setSoap] = useState("NONE");
  const [soapPrice, setSoapPrice] = useState(0);
  const [softener, setSoftener] = useState("NONE");
  const [softenerPrice, setSoftenerPrice] = useState(0);

  const [fulfillmentType, setFulfillmentType] = useState("PICKUP");
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [hasMixedWhiteColor, setHasMixedWhiteColor] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");
  const [claimedBy, setClaimedBy] = useState("");
  const [instructions, setInstructions] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  const serviceIncludesWash =
    serviceType === "COMPLETE_SERVICE" ||
    serviceType === "WASH_AND_DRY" ||
    serviceType === "WASH_ONLY";

  const serviceIncludesDry =
    serviceType === "COMPLETE_SERVICE" ||
    serviceType === "WASH_AND_DRY" ||
    serviceType === "DRY_ONLY" ||
    serviceType === "DRY_AND_FOLD";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (customerMode === "existing" && !customerId) {
      alert("Please select a customer.");
      return;
    }

    if (customerMode === "walkin" && !walkInCustomerName.trim()) {
      alert("Walk-in customer name is required.");
      return;
    }

    await onSubmit({
      customerId: customerMode === "existing" ? Number(customerId) : null,
      walkInCustomerName:
        customerMode === "walkin" ? walkInCustomerName : undefined,
      walkInCustomerPhone:
        customerMode === "walkin" ? walkInCustomerPhone : undefined,
      walkInCustomerAddress:
        customerMode === "walkin" ? walkInCustomerAddress : undefined,

      basketCount,
      serviceType,
      washType: serviceIncludesWash ? washType : undefined,
      dryExtend: serviceIncludesDry ? dryExtend : false,

      serviceFee,
      soap,
      soapPrice,
      softener,
      softenerPrice,

      fulfillmentType,
      deliveryFee: fulfillmentType === "DELIVERY" ? deliveryFee : 0,

      hasMixedWhiteColor,
      receivedBy,
      claimedBy,
      instructions,
      totalPrice,
      paymentStatus,
    });
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h3>Create Laundry Order</h3>

      <label>
        Customer Type
        <select
          value={customerMode}
          onChange={(event) =>
            setCustomerMode(event.target.value as "existing" | "walkin")
          }
        >
          <option value="existing">Existing Customer</option>
          <option value="walkin">Walk-in Customer</option>
        </select>
      </label>

      {customerMode === "existing" ? (
        <label>
          Customer
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <input
            placeholder="Walk-in customer name"
            value={walkInCustomerName}
            onChange={(event) => setWalkInCustomerName(event.target.value)}
          />

          <input
            placeholder="Walk-in phone"
            value={walkInCustomerPhone}
            onChange={(event) => setWalkInCustomerPhone(event.target.value)}
          />

          <input
            placeholder="Walk-in address"
            value={walkInCustomerAddress}
            onChange={(event) => setWalkInCustomerAddress(event.target.value)}
          />
        </>
      )}

      <input
        type="number"
        min="1"
        placeholder="Basket count"
        value={basketCount}
        onChange={(event) => setBasketCount(Number(event.target.value))}
      />

      <select
        value={serviceType}
        onChange={(event) => setServiceType(event.target.value)}
      >
        {SERVICE_TYPES.map((service) => (
          <option key={service.value} value={service.value}>
            {service.label}
          </option>
        ))}
      </select>

      {serviceIncludesWash && (
        <select
          value={washType}
          onChange={(event) => setWashType(event.target.value)}
        >
          {WASH_TYPES.map((wash) => (
            <option key={wash.value} value={wash.value}>
              {wash.label}
            </option>
          ))}
        </select>
      )}

      {serviceIncludesDry && (
        <label>
          <input
            type="checkbox"
            checked={dryExtend}
            onChange={(event) => setDryExtend(event.target.checked)}
          />
          Dry Extend
        </label>
      )}

      <input
        type="number"
        placeholder="Service fee"
        value={serviceFee}
        onChange={(event) => setServiceFee(Number(event.target.value))}
      />

      <select value={soap} onChange={(event) => setSoap(event.target.value)}>
        {SOAP_TYPES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Soap price"
        value={soapPrice}
        onChange={(event) => setSoapPrice(Number(event.target.value))}
      />

      <select
        value={softener}
        onChange={(event) => setSoftener(event.target.value)}
      >
        {SOFTENER_TYPES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Softener price"
        value={softenerPrice}
        onChange={(event) => setSoftenerPrice(Number(event.target.value))}
      />

      <select
        value={fulfillmentType}
        onChange={(event) => setFulfillmentType(event.target.value)}
      >
        {FULFILLMENT_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      {fulfillmentType === "DELIVERY" && (
        <input
          type="number"
          placeholder="Delivery fee"
          value={deliveryFee}
          onChange={(event) => setDeliveryFee(Number(event.target.value))}
        />
      )}

      <label>
        <input
          type="checkbox"
          checked={hasMixedWhiteColor}
          onChange={(event) => setHasMixedWhiteColor(event.target.checked)}
        />
        Mixed white and colored clothes
      </label>

      <input
        placeholder="Received by staff"
        value={receivedBy}
        onChange={(event) => setReceivedBy(event.target.value)}
      />

      <input
        placeholder="Claimed by"
        value={claimedBy}
        onChange={(event) => setClaimedBy(event.target.value)}
      />

      <textarea
        placeholder="Special instructions"
        value={instructions}
        onChange={(event) => setInstructions(event.target.value)}
      />

      <input
        type="number"
        placeholder="Total price"
        value={totalPrice}
        onChange={(event) => setTotalPrice(Number(event.target.value))}
      />

      <select
        value={paymentStatus}
        onChange={(event) => setPaymentStatus(event.target.value)}
      >
        {PAYMENT_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <button className="primary-button" type="submit">
        Save Order
      </button>
    </form>
  );
}

export default OrderForm;