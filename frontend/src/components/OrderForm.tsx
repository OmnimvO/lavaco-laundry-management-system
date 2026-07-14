import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Customer } from "../types/customer";
import type { Order } from "../types/order";
import type { Employee } from "../types/employee";

import {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  RINSE_CYCLES,
  SERVICE_TYPES,
} from "../constants/order";

import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";

import {
  lookupCustomerByPhone,
} from "../api/customerApi";

type OrderFormProps = {
  customers: Customer[];
  employees: Employee[];
  selectedOrder?: Order | null;
  onSubmit: (
    data: unknown
  ) => void | Promise<void>;
};

type OrderFormData = {
  customerType:
    | "EXISTING"
    | "WALK_IN";

  customerId: string;

  walkInCustomerName: string;
  walkInCustomerPhone: string;
  walkInCustomerAddress: string;

  laundryWeight: number;
  hasMixedWhiteColor: boolean;
  instructions: string;

  serviceType: string;
  rinseCycles: number;

  soapQuantity: number;
  softenerQuantity: number;

  fulfillmentType: string;

  receivedBy: string;
  claimedBy: string;

  paymentStatus: string;
  status: string;
};

const STATUS_FLOW: Record<
  string,
  string[]
> = {
  RECEIVED: [
    "RECEIVED",
    "WASHING",
    "CANCELLED",
  ],

  WASHING: [
    "WASHING",
    "DRYING",
    "CANCELLED",
  ],

  DRYING: [
    "DRYING",
    "FOLDING",
    "CANCELLED",
  ],

  READY_FOR_PICKUP: [
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ],

  OUT_FOR_DELIVERY: [
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ],

  COMPLETED: ["COMPLETED"],

  CANCELLED: ["CANCELLED"],
};

const initialFormData:
  OrderFormData = {
  customerType: "EXISTING",
  customerId: "",

  walkInCustomerName: "",
  walkInCustomerPhone: "",
  walkInCustomerAddress: "",

  laundryWeight: 1,
  hasMixedWhiteColor: false,
  instructions: "",

  serviceType:
    "COMPLETE_SERVICE",

  rinseCycles: 2,

  soapQuantity: 0,
  softenerQuantity: 0,

  fulfillmentType: "NONE",

  receivedBy: "",
  claimedBy: "",

  paymentStatus: "UNPAID",
  status: "RECEIVED",
};

function formatCurrency(
  value: number
) {
  return `₱${Number(
    value || 0
  ).toFixed(2)}`;
}

function normalizeLocalPhilippinePhone(
  value: string
) {
  let digits =
    value.replace(/\D/g, "");

  if (
    digits.startsWith("63") &&
    digits.length >= 12
  ) {
    digits =
      `0${digits.slice(2)}`;
  } else if (
    digits.startsWith("9") &&
    digits.length >= 10
  ) {
    digits =
      `0${digits}`;
  }

  return digits.slice(0, 11);
}

function isValidLocalPhilippinePhone(
  value: string
) {
  return /^09\d{9}$/.test(
    value
  );
}

function OrderForm({
  customers,
  employees,
  selectedOrder,
  onSubmit,
}: OrderFormProps) {
  const {
    token,
  } = useAuth();

  const {
    settings,
    loading: settingsLoading,
    errorMessage:
      settingsErrorMessage,
  } = useSettings();

  const [
    formData,
    setFormData,
  ] = useState<OrderFormData>(
    initialFormData
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    customerLookupStatus,
    setCustomerLookupStatus,
  ] = useState<
    | "IDLE"
    | "CHECKING"
    | "FOUND"
    | "NOT_FOUND"
    | "ERROR"
  >("IDLE");

  const [
    matchedCustomer,
    setMatchedCustomer,
  ] = useState<
    Customer | null
  >(null);

  const [
    customerLookupMessage,
    setCustomerLookupMessage,
  ] = useState("");

  useEffect(() => {
    setCustomerLookupStatus(
      "IDLE"
    );
    setMatchedCustomer(null);
    setCustomerLookupMessage("");

    if (!selectedOrder) {
      setFormData(
        initialFormData
      );
      return;
    }

    setFormData({
      customerType:
        selectedOrder.customerId
          ? "EXISTING"
          : "WALK_IN",

      customerId:
        selectedOrder.customerId
          ? String(
              selectedOrder.customerId
            )
          : "",

      walkInCustomerName:
        selectedOrder
          .walkInCustomerName ?? "",

      walkInCustomerPhone:
        normalizeLocalPhilippinePhone(
          selectedOrder
            .walkInCustomerPhone ?? ""
        ),

      walkInCustomerAddress:
        selectedOrder
          .walkInCustomerAddress ?? "",

      laundryWeight:
        selectedOrder
          .laundryWeight ?? 1,

      hasMixedWhiteColor:
        selectedOrder
          .hasMixedWhiteColor ??
        false,

      instructions:
        selectedOrder.instructions ??
        "",

      serviceType:
        selectedOrder.serviceType ??
        "COMPLETE_SERVICE",

      rinseCycles:
        selectedOrder.rinseCycles ??
        2,

      soapQuantity:
        selectedOrder.soapQuantity ??
        0,

      softenerQuantity:
        selectedOrder
          .softenerQuantity ?? 0,

      fulfillmentType:
        selectedOrder
          .fulfillmentType ??
        "NONE",

      receivedBy:
        selectedOrder.receivedBy ??
        "",

      claimedBy:
        selectedOrder.claimedBy ??
        "",

      paymentStatus:
        selectedOrder
          .paymentStatus ??
        "UNPAID",

      status:
        selectedOrder.status ??
        "RECEIVED",
    });
  }, [selectedOrder]);


  useEffect(() => {
    if (
      formData.customerType !==
      "WALK_IN"
    ) {
      setCustomerLookupStatus(
        "IDLE"
      );
      setMatchedCustomer(null);
      setCustomerLookupMessage("");
      return;
    }

    const phone =
      normalizeLocalPhilippinePhone(
        formData.walkInCustomerPhone
      );

    if (!phone) {
      setCustomerLookupStatus(
        "IDLE"
      );
      setMatchedCustomer(null);
      setCustomerLookupMessage("");
      return;
    }

    if (
      !isValidLocalPhilippinePhone(
        phone
      )
    ) {
      setCustomerLookupStatus(
        "IDLE"
      );
      setMatchedCustomer(null);
      setCustomerLookupMessage("");
      return;
    }

    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      setCustomerLookupStatus(
        "ERROR"
      );
      setMatchedCustomer(null);
      setCustomerLookupMessage(
        "Your session is unavailable. Please log in again."
      );
      return;
    }

    setCustomerLookupStatus(
      "CHECKING"
    );
    setMatchedCustomer(null);
    setCustomerLookupMessage(
      "Checking for an existing customer..."
    );

    let cancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await lookupCustomerByPhone(
                phone,
                token
              );

            if (cancelled) {
              return;
            }

            if (
              response.found &&
              response.customer
            ) {
              setCustomerLookupStatus(
                "FOUND"
              );
              setMatchedCustomer(
                response.customer
              );
              setCustomerLookupMessage(
                `Existing customer found: ${response.customer.name}. This order will be linked automatically.`
              );
            } else {
              setCustomerLookupStatus(
                "NOT_FOUND"
              );
              setMatchedCustomer(null);
              setCustomerLookupMessage(
                "No existing customer found. A new customer will be saved when the order is created."
              );
            }
          } catch (error) {
            if (cancelled) {
              return;
            }

            setCustomerLookupStatus(
              "ERROR"
            );
            setMatchedCustomer(null);
            setCustomerLookupMessage(
              error instanceof Error
                ? error.message
                : "Unable to check the customer right now."
            );
          }
        },
        500
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        timer
      );
    };
  }, [
    formData.customerType,
    formData.walkInCustomerPhone,
    token,
  ]);

  const activeEmployees =
    useMemo(
      () =>
        employees
          .filter(
            (employee) =>
              employee.status ===
              "ACTIVE"
          )
          .sort(
            (
              first,
              second
            ) => {
              const firstName =
                `${first.firstName} ${first.lastName}`;

              const secondName =
                `${second.firstName} ${second.lastName}`;

              return firstName.localeCompare(
                secondName
              );
            }
          ),
      [employees]
    );

  const servicePrices =
  useMemo<Record<string, number>>(
    () => ({
      COMPLETE_SERVICE:
        settings?.completeServicePrice ??
        0,

      WASH_AND_DRY:
        settings?.washAndDryPrice ??
        0,

      WASH_ONLY:
        settings?.washOnlyPrice ??
        0,

      DRY_ONLY:
        settings?.dryOnlyPrice ??
        0,

      DRY_AND_FOLD:
        settings?.dryAndFoldPrice ??
        0,

      FOLD_ONLY:
        settings?.foldOnlyPrice ??
        0,
    }),
    [settings]
  );

  const fulfillmentFees =
  useMemo<Record<string, number>>(
    () => ({
      NONE: 0,

      PICKUP_ONLY:
        settings?.pickupOnlyFee ??
        0,

      DELIVERY_ONLY:
        settings?.deliveryOnlyFee ??
        0,

      PICKUP_AND_DELIVERY:
        settings?.pickupAndDeliveryFee ??
        0,
    }),
    [settings]
  );

  const pricing = useMemo(() => {
    const laundryWeight =
      Number(
        formData.laundryWeight
      ) || 0;

    const maximumWeightPerLoad =
      settings
        ?.maximumWeightPerLoad ?? 1;

    const loadCount =
      laundryWeight > 0
        ? Math.ceil(
            laundryWeight /
              maximumWeightPerLoad
          )
        : 0;

    const servicePricePerLoad =
      servicePrices[
        formData.serviceType
      ] ?? 0;

    const serviceSubtotal =
      servicePricePerLoad *
      loadCount;

    const rinseFee =
      formData.rinseCycles > 2
        ? settings
            ?.extraRinseFee ?? 0
        : 0;

    const soapPrice =
      formData.soapQuantity *
      (settings?.soapPrice ?? 0);

    const softenerPrice =
      formData.softenerQuantity *
      (settings?.softenerPrice ??
        0);

    const deliveryFee =
      fulfillmentFees[
        formData.fulfillmentType
      ] ?? 0;

    const totalPrice =
      serviceSubtotal +
      rinseFee +
      soapPrice +
      softenerPrice +
      deliveryFee;

    return {
      loadCount,
      servicePricePerLoad,
      serviceSubtotal,
      rinseFee,
      soapPrice,
      softenerPrice,
      deliveryFee,
      totalPrice,
    };
  }, [
    formData,
    settings,
    servicePrices,
    fulfillmentFees,
  ]);

  const allowedStatuses =
    useMemo(() => {
      if (!selectedOrder) {
        return ["RECEIVED"];
      }

      const currentStatus =
        formData.status;

      if (
        currentStatus ===
        "FOLDING"
      ) {
        const requiresDelivery =
          formData.fulfillmentType ===
            "DELIVERY_ONLY" ||
          formData.fulfillmentType ===
            "PICKUP_AND_DELIVERY";

        if (requiresDelivery) {
          return [
            "FOLDING",
            "OUT_FOR_DELIVERY",
            "CANCELLED",
          ];
        }

        return [
          "FOLDING",
          "READY_FOR_PICKUP",
          "CANCELLED",
        ];
      }

      return (
        STATUS_FLOW[
          currentStatus
        ] ?? [currentStatus]
      );
    }, [
      selectedOrder,
      formData.status,
      formData.fulfillmentType,
    ]);

  function handleChange(
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    const isCheckbox =
      event.target instanceof
        HTMLInputElement &&
      event.target.type ===
        "checkbox";

    const checked =
      event.target instanceof
      HTMLInputElement
        ? event.target.checked
        : false;

    const numberFields = [
      "laundryWeight",
      "rinseCycles",
      "soapQuantity",
      "softenerQuantity",
    ];

    setFormData(
      (previous) => {
        const updatedValue =
          isCheckbox
            ? checked
            : numberFields.includes(
                name
              )
            ? Number(value)
            : value;

        const updatedData = {
          ...previous,
          [name]: updatedValue,
        };

        if (
          name ===
          "walkInCustomerPhone"
        ) {
          return {
            ...updatedData,

            walkInCustomerPhone:
              normalizeLocalPhilippinePhone(
                value
              ),
          };
        }

        if (
          name ===
            "customerType" &&
          value === "EXISTING"
        ) {
          setCustomerLookupStatus(
            "IDLE"
          );
          setMatchedCustomer(null);
          setCustomerLookupMessage("");

          return {
            ...updatedData,

            walkInCustomerName:
              "",

            walkInCustomerPhone:
              "",

            walkInCustomerAddress:
              "",
          };
        }

        if (
          name ===
            "customerType" &&
          value === "WALK_IN"
        ) {
          return {
            ...updatedData,
            customerId: "",
          };
        }

        return updatedData;
      }
    );
  }

  function updateQuantity(
    field:
      | "soapQuantity"
      | "softenerQuantity",
    difference: number
  ) {
    setFormData(
      (previous) => ({
        ...previous,

        [field]: Math.max(
          0,
          previous[field] +
            difference
        ),
      })
    );
  }

  async function handleSubmit(
    event: React.FormEvent<
      HTMLFormElement
    >
  ) {
    event.preventDefault();

    if (!settings) {
      alert(
        "Shop settings are unavailable. Please reload the page and try again."
      );
      return;
    }

    if (
      formData.customerType ===
        "EXISTING" &&
      !formData.customerId
    ) {
      alert(
        "Please select an existing customer."
      );
      return;
    }

    if (
      formData.customerType ===
        "WALK_IN" &&
      !formData.walkInCustomerName.trim()
    ) {
      alert(
        "Please enter the walk-in customer name."
      );
      return;
    }

    const normalizedWalkInPhone =
      normalizeLocalPhilippinePhone(
        formData.walkInCustomerPhone
      );

    if (
      formData.customerType ===
        "WALK_IN" &&
      normalizedWalkInPhone &&
      !isValidLocalPhilippinePhone(
        normalizedWalkInPhone
      )
    ) {
      alert(
        "Please enter a valid Philippine mobile number using 09XXXXXXXXX."
      );
      return;
    }

    if (
      !Number.isFinite(
        formData.laundryWeight
      ) ||
      formData.laundryWeight <= 0
    ) {
      alert(
        "Laundry weight must be greater than 0 kg."
      );
      return;
    }

    if (
      !Number.isInteger(
        formData.soapQuantity
      ) ||
      formData.soapQuantity < 0
    ) {
      alert(
        "Soap quantity must be a whole number of 0 or greater."
      );
      return;
    }

    if (
      !Number.isInteger(
        formData.softenerQuantity
      ) ||
      formData.softenerQuantity <
        0
    ) {
      alert(
        "Fabric softener quantity must be a whole number of 0 or greater."
      );
      return;
    }

    const payload = {
      customerId:
        formData.customerType ===
        "EXISTING"
          ? Number(
              formData.customerId
            )
          : null,

      walkInCustomerName:
        formData.customerType ===
        "WALK_IN"
          ? formData
              .walkInCustomerName
              .trim()
          : undefined,

      walkInCustomerPhone:
        formData.customerType ===
        "WALK_IN"
          ? normalizedWalkInPhone ||
            undefined
          : undefined,

      walkInCustomerAddress:
        formData.customerType ===
        "WALK_IN"
          ? formData
              .walkInCustomerAddress
              .trim()
          : undefined,

      laundryWeight:
        formData.laundryWeight,

      hasMixedWhiteColor:
        formData
          .hasMixedWhiteColor,

      instructions:
        formData.instructions.trim(),

      serviceType:
        formData.serviceType,

      rinseCycles:
        formData.rinseCycles,

      soapQuantity:
        formData.soapQuantity,

      softenerQuantity:
        formData.softenerQuantity,

      fulfillmentType:
        formData.fulfillmentType,

      receivedBy:
        formData.receivedBy.trim(),

      claimedBy:
        formData.claimedBy.trim(),

      paymentStatus:
        formData.paymentStatus,

      status:
        formData.status,
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (settingsLoading) {
    return (
      <div className="dashboard-loading">
        Loading shop prices...
      </div>
    );
  }

  if (
    settingsErrorMessage &&
    !settings
  ) {
    return (
      <div className="dashboard-error">
        <h2>
          Shop settings unavailable
        </h2>

        <p>
          {settingsErrorMessage}
        </p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="dashboard-error">
        <h2>
          Shop settings unavailable
        </h2>

        <p>
          The order form cannot calculate
          prices until shop settings are
          available.
        </p>
      </div>
    );
  }

  return (
    <form
      className="order-form pos-order-form"
      onSubmit={handleSubmit}
    >
      <div className="order-layout">
        {/* First column */}
        <div className="order-column">
          <section className="form-section">
            <h3>
              Customer Information
            </h3>

            <div className="form-grid">
              <div className="form-group medium-field">
                <label htmlFor="customerType">
                  Customer Type
                </label>

                <select
                  id="customerType"
                  name="customerType"
                  value={
                    formData.customerType
                  }
                  onChange={handleChange}
                >
                  <option value="EXISTING">
                    Existing Customer
                  </option>

                  <option value="WALK_IN">
                    Walk-in Customer
                  </option>
                </select>
              </div>

              {formData.customerType ===
              "EXISTING" ? (
                <div className="form-group customer-select">
                  <label htmlFor="customerId">
                    Select Customer
                  </label>

                  <select
                    id="customerId"
                    name="customerId"
                    value={
                      formData.customerId
                    }
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Choose customer
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer.id
                          }
                          value={
                            customer.id
                          }
                        >
                          {
                            customer.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="walkInCustomerName">
                      Walk-in Name
                    </label>

                    <input
                      id="walkInCustomerName"
                      name="walkInCustomerName"
                      value={
                        formData.walkInCustomerName
                      }
                      onChange={handleChange}
                      placeholder="Customer name"
                      required
                    />
                  </div>

                  <div className="form-group medium-field">
                    <label htmlFor="walkInCustomerPhone">
                      Philippine Mobile Number
                    </label>

                    <input
                      id="walkInCustomerPhone"
                      name="walkInCustomerPhone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      pattern="09[0-9]{9}"
                      value={
                        formData.walkInCustomerPhone
                      }
                      onChange={handleChange}
                      placeholder="09171234567"
                      title="Enter an 11-digit Philippine mobile number beginning with 09."
                    />

                    <small className="field-helper-text">
                      Optional. Use the format
                      09XXXXXXXXX.
                    </small>
                  </div>

                  <div
                    className={`walkin-customer-info full-width lookup-${customerLookupStatus.toLowerCase()}`}
                    aria-live="polite"
                  >
                    <strong>
                      {customerLookupStatus ===
                      "FOUND"
                        ? "Existing customer detected"
                        : customerLookupStatus ===
                          "NOT_FOUND"
                        ? "New customer"
                        : customerLookupStatus ===
                          "CHECKING"
                        ? "Checking customer"
                        : customerLookupStatus ===
                          "ERROR"
                        ? "Customer lookup unavailable"
                        : "Automatic customer matching"}
                    </strong>

                    <p>
                      {customerLookupMessage ||
                        "Enter a Philippine mobile number to check for an existing customer. New walk-in customers are saved automatically."}
                    </p>

                    {matchedCustomer && (
                      <div className="walkin-match-details">
                        <span>
                          {matchedCustomer.phone ||
                            "No phone"}
                        </span>

                        <span>
                          {matchedCustomer.address ||
                            "No address"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="walkInCustomerAddress">
                      Walk-in Address
                    </label>

                    <input
                      id="walkInCustomerAddress"
                      name="walkInCustomerAddress"
                      value={
                        formData.walkInCustomerAddress
                      }
                      onChange={handleChange}
                      placeholder="Customer address"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="form-section laundry-details-section">
            <h3>Laundry Details</h3>

            <div className="form-grid">
              <div className="form-group compact-field">
                <label htmlFor="laundryWeight">
                  Weight (kg)
                </label>

                <input
                  id="laundryWeight"
                  type="number"
                  name="laundryWeight"
                  value={
                    formData.laundryWeight
                  }
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div className="form-group compact-field">
                <label htmlFor="loadCount">
                  Number of Loads
                </label>

                <input
                  id="loadCount"
                  type="number"
                  value={
                    pricing.loadCount
                  }
                  readOnly
                />

              </div>

              <div className="checkbox-group mixed-color-field">
                <label>
                  <input
                    type="checkbox"
                    name="hasMixedWhiteColor"
                    checked={
                      formData.hasMixedWhiteColor
                    }
                    onChange={handleChange}
                  />

                  Mixed White & Colored
                </label>
              </div>

              <div className="form-group full-width instructions-field">
                <label htmlFor="instructions">
                  Special Instructions
                </label>

                <textarea
                  id="instructions"
                  name="instructions"
                  value={
                    formData.instructions
                  }
                  onChange={handleChange}
                  placeholder="Example: Separate delicate clothes, avoid bleach, etc."
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Staff</h3>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="receivedBy">
                  Received By
                </label>

                <select
                  id="receivedBy"
                  name="receivedBy"
                  value={
                    formData.receivedBy
                  }
                  onChange={handleChange}
                >
                  <option value="">
                    Select employee
                  </option>

                  {formData.receivedBy &&
                    !activeEmployees.some(
                      (employee) =>
                        `${employee.firstName} ${employee.lastName}` ===
                        formData.receivedBy
                    ) && (
                      <option
                        value={
                          formData.receivedBy
                        }
                      >
                        {
                          formData.receivedBy
                        }{" "}
                        — Existing Record
                      </option>
                    )}

                  {activeEmployees.map(
                    (employee) => {
                      const fullName =
                        `${employee.firstName} ${employee.lastName}`;

                      return (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            fullName
                          }
                        >
                          {fullName}
                          {" — "}
                          {employee.position
                            .replaceAll(
                              "_",
                              " "
                            )
                            .toLowerCase()
                            .replace(
                              /\b\w/g,
                              (
                                letter
                              ) =>
                                letter.toUpperCase()
                            )}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="claimedBy">
                  Claimed By
                </label>

                <input
                  id="claimedBy"
                  name="claimedBy"
                  value={
                    formData.claimedBy
                  }
                  onChange={handleChange}
                  placeholder="Customer or representative"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Second column */}
        <div className="order-column">
          <section className="form-section">
            <h3>Laundry Service</h3>

            <div className="form-grid">
              <div className="form-group service-select">
                <label htmlFor="serviceType">
                  Service Type
                </label>

                <select
                  id="serviceType"
                  name="serviceType"
                  value={
                    formData.serviceType
                  }
                  onChange={handleChange}
                >
                  {SERVICE_TYPES.map(
                    (service) => (
                      <option
                        key={
                          service.value
                        }
                        value={
                          service.value
                        }
                      >
                        {service.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group compact-field">
                <label htmlFor="servicePricePerLoad">
                  Price per Load
                </label>

                <input
                  id="servicePricePerLoad"
                  value={formatCurrency(
                    pricing.servicePricePerLoad
                  )}
                  readOnly
                />
              </div>

              <div className="form-group compact-field">
                <label htmlFor="serviceSubtotal">
                  Service Subtotal
                </label>

                <input
                  id="serviceSubtotal"
                  value={formatCurrency(
                    pricing.serviceSubtotal
                  )}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>
              Additional Services
            </h3>

            <div className="form-grid">
              <div className="form-group medium-field">
                <label htmlFor="rinseCycles">
                  Rinse Cycles
                </label>

                <select
                  id="rinseCycles"
                  name="rinseCycles"
                  value={
                    formData.rinseCycles
                  }
                  onChange={handleChange}
                >
                  {RINSE_CYCLES.map(
                    (rinse) => (
                      <option
                        key={
                          rinse.value
                        }
                        value={
                          rinse.value
                        }
                      >
                        {rinse.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group compact-field">
                <label htmlFor="rinseFee">
                  Rinse Fee
                </label>

                <input
                  id="rinseFee"
                  value={formatCurrency(
                    pricing.rinseFee
                  )}
                  readOnly
                />

              </div>

              <div className="form-group addon-quantity-field">
                <label htmlFor="soapQuantity">
                  Soap / Detergent Packs
                </label>

                <div className="quantity-control">
                  <button
                    type="button"
                    className="quantity-button"
                    onClick={() =>
                      updateQuantity(
                        "soapQuantity",
                        -1
                      )
                    }
                    disabled={
                      formData.soapQuantity ===
                      0
                    }
                    aria-label="Decrease soap quantity"
                  >
                    −
                  </button>

                  <input
                    id="soapQuantity"
                    type="number"
                    name="soapQuantity"
                    value={
                      formData.soapQuantity
                    }
                    onChange={handleChange}
                    min="0"
                    step="1"
                    inputMode="numeric"
                  />

                  <button
                    type="button"
                    className="quantity-button"
                    onClick={() =>
                      updateQuantity(
                        "soapQuantity",
                        1
                      )
                    }
                    aria-label="Increase soap quantity"
                  >
                    +
                  </button>
                </div>

                <small className="addon-price">
                  {
                    formData.soapQuantity
                  }{" "}
                  ×{" "}
                  {formatCurrency(
                    settings.soapPrice
                  )}{" "}
                  ={" "}
                  <strong>
                    {formatCurrency(
                      pricing.soapPrice
                    )}
                  </strong>
                </small>
              </div>

              <div className="form-group addon-quantity-field">
                <label htmlFor="softenerQuantity">
                  Fabric Softener Packs
                </label>

                <div className="quantity-control">
                  <button
                    type="button"
                    className="quantity-button"
                    onClick={() =>
                      updateQuantity(
                        "softenerQuantity",
                        -1
                      )
                    }
                    disabled={
                      formData.softenerQuantity ===
                      0
                    }
                    aria-label="Decrease softener quantity"
                  >
                    −
                  </button>

                  <input
                    id="softenerQuantity"
                    type="number"
                    name="softenerQuantity"
                    value={
                      formData.softenerQuantity
                    }
                    onChange={handleChange}
                    min="0"
                    step="1"
                    inputMode="numeric"
                  />

                  <button
                    type="button"
                    className="quantity-button"
                    onClick={() =>
                      updateQuantity(
                        "softenerQuantity",
                        1
                      )
                    }
                    aria-label="Increase softener quantity"
                  >
                    +
                  </button>
                </div>

                <small className="addon-price">
                  {
                    formData.softenerQuantity
                  }{" "}
                  ×{" "}
                  {formatCurrency(
                    settings.softenerPrice
                  )}{" "}
                  ={" "}
                  <strong>
                    {formatCurrency(
                      pricing.softenerPrice
                    )}
                  </strong>
                </small>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Pickup / Delivery</h3>

            <div className="form-grid">
              <div className="form-group service-select">
                <label htmlFor="fulfillmentType">
                  Fulfillment Type
                </label>

                <select
                  id="fulfillmentType"
                  name="fulfillmentType"
                  value={
                    formData.fulfillmentType
                  }
                  onChange={handleChange}
                >
                  {FULFILLMENT_TYPES.map(
                    (
                      fulfillment
                    ) => (
                      <option
                        key={
                          fulfillment.value
                        }
                        value={
                          fulfillment.value
                        }
                      >
                        {
                          fulfillment.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group compact-field">
                <label htmlFor="deliveryFee">
                  Fulfillment Fee
                </label>

                <input
                  id="deliveryFee"
                  value={formatCurrency(
                    pricing.deliveryFee
                  )}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Payment & Status</h3>

            <div className="form-grid">
              <div className="form-group medium-field">
                <label htmlFor="paymentStatus">
                  Payment Status
                </label>

                <select
                  id="paymentStatus"
                  name="paymentStatus"
                  value={
                    formData.paymentStatus
                  }
                  onChange={handleChange}
                >
                  {PAYMENT_STATUSES.map(
                    (payment) => (
                      <option
                        key={
                          payment.value
                        }
                        value={
                          payment.value
                        }
                      >
                        {
                          payment.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group medium-field">
                <label htmlFor="status">
                  Order Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={handleChange}
                >
                  {ORDER_STATUSES.filter(
                    (
                      statusOption
                    ) =>
                      allowedStatuses.includes(
                        statusOption.value
                      )
                  ).map(
                    (
                      statusOption
                    ) => (
                      <option
                        key={
                          statusOption.value
                        }
                        value={
                          statusOption.value
                        }
                      >
                        {
                          statusOption.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Third column */}
        <aside className="summary-column">
          <section className="price-summary-section">
            <h3>Order Summary</h3>

            <div className="summary-overview">
              <div className="summary-overview-item">
                <span>Weight</span>

                <strong>
                  {Number(
                    formData.laundryWeight ||
                      0
                  ).toFixed(1)}{" "}
                  kg
                </strong>
              </div>

              <div className="summary-overview-item">
                <span>Loads</span>

                <strong>
                  {pricing.loadCount}
                </strong>
              </div>

              <div className="summary-overview-item summary-overview-total">
                <span>Total</span>

                <strong>
                  {formatCurrency(
                    pricing.totalPrice
                  )}
                </strong>
              </div>
            </div>

            <div className="price-summary-list">
              <div className="price-summary-row">
                <div className="summary-row-description">
                  <span>
                    {SERVICE_TYPES.find(
                      (service) =>
                        service.value ===
                        formData.serviceType
                    )?.label ??
                      formData.serviceType}
                  </span>

                  <small>
                    {pricing.loadCount}{" "}
                    load
                    {pricing.loadCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    ×{" "}
                    {formatCurrency(
                      pricing.servicePricePerLoad
                    )}
                  </small>
                </div>

                <strong>
                  {formatCurrency(
                    pricing.serviceSubtotal
                  )}
                </strong>
              </div>

              <div className="price-summary-row">
                <div className="summary-row-description">
                  <span>
                    Extra Rinse
                  </span>

                  <small>
                    {
                      formData.rinseCycles
                    }{" "}
                    rinse cycles
                    {formData.rinseCycles >
                    2
                      ? ` — flat ${formatCurrency(
                          settings.extraRinseFee
                        )} charge`
                      : " — included"}
                  </small>
                </div>

                <strong>
                  {formatCurrency(
                    pricing.rinseFee
                  )}
                </strong>
              </div>

              <div className="price-summary-row">
                <div className="summary-row-description">
                  <span>
                    Soap / Detergent
                  </span>

                  <small>
                    {
                      formData.soapQuantity
                    }{" "}
                    pack
                    {formData.soapQuantity ===
                    1
                      ? ""
                      : "s"}{" "}
                    ×{" "}
                    {formatCurrency(
                      settings.soapPrice
                    )}
                  </small>
                </div>

                <strong>
                  {formatCurrency(
                    pricing.soapPrice
                  )}
                </strong>
              </div>

              <div className="price-summary-row">
                <div className="summary-row-description">
                  <span>
                    Fabric Softener
                  </span>

                  <small>
                    {
                      formData.softenerQuantity
                    }{" "}
                    pack
                    {formData.softenerQuantity ===
                    1
                      ? ""
                      : "s"}{" "}
                    ×{" "}
                    {formatCurrency(
                      settings.softenerPrice
                    )}
                  </small>
                </div>

                <strong>
                  {formatCurrency(
                    pricing.softenerPrice
                  )}
                </strong>
              </div>

              <div className="price-summary-row">
                <div className="summary-row-description">
                  <span>
                    {FULFILLMENT_TYPES.find(
                      (
                        fulfillment
                      ) =>
                        fulfillment.value ===
                        formData.fulfillmentType
                    )?.label ??
                      "Pickup / Delivery"}
                  </span>

                  <small>
                    Fulfillment fee
                  </small>
                </div>

                <strong>
                  {formatCurrency(
                    pricing.deliveryFee
                  )}
                </strong>
              </div>
            </div>

            <div className="total-section">
              <span>Total Amount</span>

              <strong>
                {formatCurrency(
                  pricing.totalPrice
                )}
              </strong>
            </div>
          </section>

          <div className="form-actions summary-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? "Saving..."
                : selectedOrder
                ? "Update Order"
                : "Create Order"}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}

export default OrderForm;
