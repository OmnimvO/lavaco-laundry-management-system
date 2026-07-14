import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  FaCheckCircle,
  FaCoins,
  FaMapMarkerAlt,
  FaPhone,
  FaReceipt,
  FaRedoAlt,
  FaSave,
  FaStore,
  FaSyncAlt,
  FaTruck,
  FaTshirt,
  FaTint,
  FaExclamationTriangle,
  FaWeightHanging,
  FaUndoAlt,
} from "react-icons/fa";

import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";

import type {
  ShopSettings,
  UpdateShopSettingsData,
} from "../types/settings";

import Toast from "../components/Toast";

import {
  getTankHistory,
  getTankStatus,
  replaceTank,
} from "../api/tankCycleApi";

import type {
  TankHistoryItem,
  TankStatus,
} from "../types/tankCycle";

type SettingsFormData = {
  shopName: string;
  shopAddress: string;
  contactNumber: string;
  receiptFooter: string;

  completeServicePrice: string;
  washAndDryPrice: string;
  washOnlyPrice: string;
  dryOnlyPrice: string;
  dryAndFoldPrice: string;
  foldOnlyPrice: string;

  extraRinseFee: string;

  soapPrice: string;
  softenerPrice: string;

  pickupOnlyFee: string;
  deliveryOnlyFee: string;
  pickupAndDeliveryFee: string;

  maximumWeightPerLoad: string;
};

type SettingsFormErrors = {
  shopName?: string;
  receiptFooter?: string;
  maximumWeightPerLoad?: string;
  general?: string;
};

type PricingCard = {
  field: keyof Pick<
    SettingsFormData,
    | "completeServicePrice"
    | "washAndDryPrice"
    | "washOnlyPrice"
    | "dryOnlyPrice"
    | "dryAndFoldPrice"
    | "foldOnlyPrice"
  >;
  label: string;
  note: string;
};

type FeeCard = {
  field: keyof Pick<
    SettingsFormData,
    | "extraRinseFee"
    | "soapPrice"
    | "softenerPrice"
    | "pickupOnlyFee"
    | "deliveryOnlyFee"
    | "pickupAndDeliveryFee"
  >;
  label: string;
  note: string;
};

const emptyFormData: SettingsFormData = {
  shopName: "",
  shopAddress: "",
  contactNumber: "",
  receiptFooter: "",

  completeServicePrice: "0",
  washAndDryPrice: "0",
  washOnlyPrice: "0",
  dryOnlyPrice: "0",
  dryAndFoldPrice: "0",
  foldOnlyPrice: "0",

  extraRinseFee: "0",

  soapPrice: "0",
  softenerPrice: "0",

  pickupOnlyFee: "0",
  deliveryOnlyFee: "0",
  pickupAndDeliveryFee: "0",

  maximumWeightPerLoad: "8",
};

const servicePricingCards: PricingCard[] = [
  {
    field: "completeServicePrice",
    label: "Complete Service",
    note: "Full wash, dry, and fold service per load.",
  },
  {
    field: "washAndDryPrice",
    label: "Wash & Dry",
    note: "Washing and drying service per load.",
  },
  {
    field: "washOnlyPrice",
    label: "Wash Only",
    note: "Washing service only per load.",
  },
  {
    field: "dryOnlyPrice",
    label: "Dry Only",
    note: "Drying service only per load.",
  },
  {
    field: "dryAndFoldPrice",
    label: "Dry & Fold",
    note: "Drying and folding service per load.",
  },
  {
    field: "foldOnlyPrice",
    label: "Fold Only",
    note: "Folding service only per load.",
  },
];

const feeCards: FeeCard[] = [
  {
    field: "extraRinseFee",
    label: "Extra Rinse Fee",
    note: "Flat charge when more than two rinse cycles are selected.",
  },
  {
    field: "soapPrice",
    label: "Soap / Detergent",
    note: "Price charged per detergent pack.",
  },
  {
    field: "softenerPrice",
    label: "Fabric Softener",
    note: "Price charged per softener pack.",
  },
  {
    field: "pickupOnlyFee",
    label: "Pickup Only",
    note: "Flat fee for pickup service.",
  },
  {
    field: "deliveryOnlyFee",
    label: "Delivery Only",
    note: "Flat fee for delivery service.",
  },
  {
    field: "pickupAndDeliveryFee",
    label: "Pickup & Delivery",
    note: "Flat fee for combined pickup and delivery.",
  },
];

function settingsToForm(
  settings: ShopSettings
): SettingsFormData {
  return {
    shopName:
      settings.shopName ?? "",

    shopAddress:
      settings.shopAddress ?? "",

    contactNumber:
      settings.contactNumber ?? "",

    receiptFooter:
      settings.receiptFooter ?? "",

    completeServicePrice:
      String(
        settings.completeServicePrice
      ),

    washAndDryPrice:
      String(
        settings.washAndDryPrice
      ),

    washOnlyPrice:
      String(
        settings.washOnlyPrice
      ),

    dryOnlyPrice:
      String(
        settings.dryOnlyPrice
      ),

    dryAndFoldPrice:
      String(
        settings.dryAndFoldPrice
      ),

    foldOnlyPrice:
      String(
        settings.foldOnlyPrice
      ),

    extraRinseFee:
      String(
        settings.extraRinseFee
      ),

    soapPrice:
      String(settings.soapPrice),

    softenerPrice:
      String(
        settings.softenerPrice
      ),

    pickupOnlyFee:
      String(
        settings.pickupOnlyFee
      ),

    deliveryOnlyFee:
      String(
        settings.deliveryOnlyFee
      ),

    pickupAndDeliveryFee:
      String(
        settings.pickupAndDeliveryFee
      ),

    maximumWeightPerLoad:
      String(
        settings.maximumWeightPerLoad
      ),
  };
}

function parseNonNegativeNumber(
  value: string,
  label: string
) {
  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0
  ) {
    throw new Error(
      `${label} must be zero or greater.`
    );
  }

  return numberValue;
}

function formatCurrency(
  value: string | number
) {
  const amount = Number(value);

  return `₱${Number.isFinite(amount)
    ? amount.toFixed(2)
    : "0.00"}`;
}

function SettingsPage() {
  const {
    isAdmin,
    token,
  } = useAuth();

  const {
    settings,
    loading,
    errorMessage,
    refreshSettings,
    saveSettings,
  } = useSettings();

  const [
    formData,
    setFormData,
  ] = useState<SettingsFormData>(
    emptyFormData
  );

  const [
    savedFormData,
    setSavedFormData,
  ] = useState<SettingsFormData>(
    emptyFormData
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState<SettingsFormErrors>(
    {}
  );

  const [tankStatus, setTankStatus] =
    useState<TankStatus | null>(null);
  const [tankHistory, setTankHistory] =
    useState<TankHistoryItem[]>([]);
  const [tankLoading, setTankLoading] =
    useState(false);
  const [replacingTank, setReplacingTank] =
    useState(false);
  const [replacementNotes, setReplacementNotes] =
    useState("");

  const [toast, setToast] =
    useState<{
      message: string;
      type: "success" | "error";
    } | null>(null);

  useEffect(() => {
    async function loadTankData() {
      if (typeof token !== "string" || !token.trim()) {
        return;
      }

      try {
        setTankLoading(true);
        const [statusData, historyData] = await Promise.all([
          getTankStatus(token),
          getTankHistory(token),
        ]);
        setTankStatus(statusData);
        setTankHistory(Array.isArray(historyData.history) ? historyData.history : []);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Failed to load tank information.", "error");
      } finally {
        setTankLoading(false);
      }
    }

    void loadTankData();
  }, [token]);

  useEffect(() => {
    if (settings) {
      const nextFormData =
        settingsToForm(settings);

      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setErrors({});
    }
  }, [settings]);

  const hasUnsavedChanges =
    useMemo(
      () =>
        JSON.stringify(formData) !==
        JSON.stringify(savedFormData),
      [formData, savedFormData]
    );

  const pricingSummary =
    useMemo(() => {
      const serviceValues =
        servicePricingCards.map(
          (card) =>
            Number(
              formData[card.field]
            ) || 0
        );

      return {
        serviceCount:
          servicePricingCards.length,

        fulfillmentCount: 3,

        highestServicePrice:
          serviceValues.length > 0
            ? Math.max(
                ...serviceValues
              )
            : 0,

        maximumWeightPerLoad:
          Number(
            formData.maximumWeightPerLoad
          ) || 0,
      };
    }, [formData]);

  const completeServicePreview =
    useMemo(() => {
      const maximumWeight =
        Number(
          formData.maximumWeightPerLoad
        ) || 1;

      const exampleWeight =
        maximumWeight;

      const loadCount =
        exampleWeight > 0
          ? Math.ceil(
              exampleWeight /
                maximumWeight
            )
          : 0;

      const servicePrice =
        Number(
          formData.completeServicePrice
        ) || 0;

      return {
        exampleWeight,
        loadCount,
        total:
          loadCount *
          servicePrice,
      };
    }, [
      formData.maximumWeightPerLoad,
      formData.completeServicePrice,
    ]);

  function showToast(
    message: string,
    type: "success" | "error"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function handleChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    if (
      name === "shopName" &&
      errors.shopName
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          shopName: undefined,
        })
      );
    }

    if (
      name === "receiptFooter" &&
      errors.receiptFooter
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          receiptFooter: undefined,
        })
      );
    }

    if (
      name ===
        "maximumWeightPerLoad" &&
      errors.maximumWeightPerLoad
    ) {
      setErrors(
        (previous) => ({
          ...previous,
          maximumWeightPerLoad:
            undefined,
        })
      );
    }
  }

  function resetChanges() {
    setFormData(savedFormData);
    setErrors({});

    showToast(
      "Unsaved changes were reset.",
      "success"
    );
  }

  async function handleRefresh() {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );

      return;
    }

    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Refreshing will discard your unsaved changes. Continue?"
      )
    ) {
      return;
    }

    try {
      setIsRefreshing(true);
      await refreshSettings();

      showToast(
        "Settings refreshed successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to refresh settings.",
        "error"
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function validateForm() {
    const nextErrors:
      SettingsFormErrors = {};

    if (!formData.shopName.trim()) {
      nextErrors.shopName =
        "Shop name is required.";
    }

    if (
      !formData.receiptFooter.trim()
    ) {
      nextErrors.receiptFooter =
        "Receipt footer is required.";
    }

    const maximumWeightPerLoad =
      Number(
        formData.maximumWeightPerLoad
      );

    if (
      !Number.isFinite(
        maximumWeightPerLoad
      ) ||
      maximumWeightPerLoad <= 0
    ) {
      nextErrors.maximumWeightPerLoad =
        "Maximum weight per load must be greater than zero.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length ===
      0
    );
  }

  async function handleReplaceTank() {
    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Confirm that the current tank has been replaced? This starts a new tank cycle at 0 loads."
      );

    if (!confirmed) {
      return;
    }

    try {
      setReplacingTank(true);

      const result =
        await replaceTank(
          replacementNotes.trim() ||
            null,
          token
        );

      const [
        statusData,
        historyData,
      ] = await Promise.all([
        getTankStatus(token),
        getTankHistory(token),
      ]);

      setTankStatus(
        statusData
      );

      setTankHistory(
        historyData.history
      );

      setReplacementNotes("");

      showToast(
        result.message,
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to confirm tank replacement.",
        "error"
      );
    } finally {
      setReplacingTank(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

  if (!isAdmin) {
      showToast(
        "Only administrators can update settings.",
        "error"
      );
      return;
    }

    if (
      typeof token !== "string" ||
      !token.trim()
    ) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );
      return;
    }

    if (!validateForm()) {
      showToast(
        "Please correct the highlighted settings.",
        "error"
      );
      return;
    }

    try {
      const maximumWeightPerLoad =
        Number(
          formData.maximumWeightPerLoad
        );

      const payload:
        UpdateShopSettingsData = {
        shopName:
          formData.shopName.trim(),

        shopAddress:
          formData.shopAddress.trim() ||
          null,

        contactNumber:
          formData.contactNumber.trim() ||
          null,

        receiptFooter:
          formData.receiptFooter.trim(),

        completeServicePrice:
          parseNonNegativeNumber(
            formData.completeServicePrice,
            "Complete service price"
          ),

        washAndDryPrice:
          parseNonNegativeNumber(
            formData.washAndDryPrice,
            "Wash and dry price"
          ),

        washOnlyPrice:
          parseNonNegativeNumber(
            formData.washOnlyPrice,
            "Wash only price"
          ),

        dryOnlyPrice:
          parseNonNegativeNumber(
            formData.dryOnlyPrice,
            "Dry only price"
          ),

        dryAndFoldPrice:
          parseNonNegativeNumber(
            formData.dryAndFoldPrice,
            "Dry and fold price"
          ),

        foldOnlyPrice:
          parseNonNegativeNumber(
            formData.foldOnlyPrice,
            "Fold only price"
          ),

        extraRinseFee:
          parseNonNegativeNumber(
            formData.extraRinseFee,
            "Extra rinse fee"
          ),

        soapPrice:
          parseNonNegativeNumber(
            formData.soapPrice,
            "Soap price"
          ),

        softenerPrice:
          parseNonNegativeNumber(
            formData.softenerPrice,
            "Softener price"
          ),

        pickupOnlyFee:
          parseNonNegativeNumber(
            formData.pickupOnlyFee,
            "Pickup fee"
          ),

        deliveryOnlyFee:
          parseNonNegativeNumber(
            formData.deliveryOnlyFee,
            "Delivery fee"
          ),

        pickupAndDeliveryFee:
          parseNonNegativeNumber(
            formData.pickupAndDeliveryFee,
            "Pickup and delivery fee"
          ),

        maximumWeightPerLoad,
      };

      setIsSubmitting(true);

      const savedSettings =
        await saveSettings(payload);

      const nextFormData =
        settingsToForm(
          savedSettings
        );

      setFormData(nextFormData);
      setSavedFormData(nextFormData);
      setErrors({});

      showToast(
        "Shop settings updated successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Update settings error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update settings.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <section className="settings-page">
        <div className="dashboard-error">
          <h2>Access denied</h2>

          <p>
            Only administrators can
            access shop settings.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="settings-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />

          <span>
            Loading settings...
          </span>
        </div>
      </section>
    );
  }

  if (
    errorMessage &&
    !settings
  ) {
    return (
      <section className="settings-page">
        <div className="dashboard-error">
          <h2>
            Settings unavailable
          </h2>

          <p>{errorMessage}</p>

          <button
            type="button"
            className="dashboard-retry-button"
            onClick={() =>
              void handleRefresh()
            }
          >
            <FaSyncAlt />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <div className="page-header">
        <div>
          <h2>Settings</h2>

          <p>
            Manage shop information,
            prices, fees, and receipt
            details.
          </p>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              isRefreshing ||
              isSubmitting
            }
          >
            <FaSyncAlt
              className={
                isRefreshing
                  ? "dashboard-spin"
                  : ""
              }
            />

            {isRefreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={resetChanges}
            disabled={
              !hasUnsavedChanges ||
              isSubmitting
            }
          >
            <FaUndoAlt />
            Reset Changes
          </button>
        </div>
      </div>

      <div className="settings-summary-grid">
        <article className="settings-summary-card">
          <span>
            <FaTshirt />
            Service Types
          </span>

          <strong>
            {
              pricingSummary
                .serviceCount
            }
          </strong>
        </article>

        <article className="settings-summary-card">
          <span>
            <FaTruck />
            Delivery Options
          </span>

          <strong>
            {
              pricingSummary
                .fulfillmentCount
            }
          </strong>
        </article>

        <article className="settings-summary-card">
          <span>
            <FaCoins />
            Highest Service
          </span>

          <strong>
            {formatCurrency(
              pricingSummary
                .highestServicePrice
            )}
          </strong>
        </article>

        <article className="settings-summary-card">
          <span>
            <FaWeightHanging />
            Maximum Load
          </span>

          <strong>
            {
              pricingSummary
                .maximumWeightPerLoad
            }{" "}
            kg
          </strong>
        </article>
      </div>

      <section className="settings-tank-section">
        <div className="settings-section-heading">
          <div>
            <span><FaTint /> Tank Cycle Monitoring</span>
            <p>Loads accumulate across days until the configured maximum is reached.</p>
          </div>
        </div>

        {tankLoading ? (
          <div className="dashboard-loading">Loading tank status...</div>
        ) : tankStatus ? (
          <>
            <div className={`settings-tank-status tank-${tankStatus.displayStatus.toLowerCase()}`}>
              <div>
                <strong>{tankStatus.currentLoads} / {tankStatus.maximumLoads} loads</strong>
                <span>{tankStatus.remainingLoads} remaining</span>
              </div>
              <div className="settings-tank-progress"><span style={{ width: `${Math.min(100, tankStatus.percentage)}%` }} /></div>
              {tankStatus.displayStatus !== "NORMAL" && (
                <p><FaExclamationTriangle /> {tankStatus.replacementRequired ? "Tank replacement is required now." : "Tank replacement is approaching."}</p>
              )}
            </div>

            <div className="settings-tank-actions">
              <label htmlFor="replacementNotes">Replacement Notes</label>
              <textarea
                id="replacementNotes"
                value={replacementNotes}
                onChange={(event) => setReplacementNotes(event.target.value)}
                placeholder="Optional notes about the new tank"
              />
              <button type="button" className="btn-primary" onClick={() => void handleReplaceTank()} disabled={replacingTank}>
                <FaTint /> {replacingTank ? "Confirming..." : "Confirm Tank Replacement"}
              </button>
            </div>

            <div className="settings-tank-history">
              <strong>Recent Replacements</strong>
              {tankHistory.length === 0 ? (
                <span>No tank replacements recorded yet.</span>
              ) : (
                tankHistory.slice(0, 5).map((cycle) => (
                  <div key={cycle.id}>
                    <span>Cycle #{cycle.id} · {cycle.currentLoads} loads</span>
                    <small>{cycle.replacedAt ? new Date(cycle.replacedAt).toLocaleString("en-PH") : "Date unavailable"} · {cycle.replacedBy || "System"}</small>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="dashboard-error"><p>Tank status is unavailable.</p></div>
        )}
      </section>

      <div
        className={`settings-save-status ${
          hasUnsavedChanges
            ? "settings-save-status-pending"
            : "settings-save-status-saved"
        }`}
        role="status"
      >
        {hasUnsavedChanges ? (
          <>
            <FaRedoAlt />

            <div>
              <strong>
                You have unsaved changes
              </strong>

              <span>
                Save your changes before
                leaving this page.
              </span>
            </div>
          </>
        ) : (
          <>
            <FaCheckCircle />

            <div>
              <strong>
                All settings are saved
              </strong>

              <span>
                Order Form, receipts, and
                backend pricing are using
                the saved values.
              </span>
            </div>
          </>
        )}
      </div>

      <form
        className="settings-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <section className="settings-section">
          <div className="settings-section-header">
            <FaStore />

            <div>
              <h3>Shop Information</h3>

              <p>
                Details shown throughout
                the system and on receipts.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-field">
              <label htmlFor="shopName">
                Shop Name
                <span>*</span>
              </label>

              <div
                className={`settings-input-with-icon ${
                  errors.shopName
                    ? "has-error"
                    : ""
                }`}
              >
                <FaStore />

                <input
                  id="shopName"
                  name="shopName"
                  value={
                    formData.shopName
                  }
                  onChange={handleChange}
                />
              </div>

              {errors.shopName && (
                <small className="settings-field-error">
                  {errors.shopName}
                </small>
              )}
            </div>

            <div className="settings-field">
              <label htmlFor="contactNumber">
                Contact Number
              </label>

              <div className="settings-input-with-icon">
                <FaPhone />

                <input
                  id="contactNumber"
                  name="contactNumber"
                  value={
                    formData.contactNumber
                  }
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="settings-field settings-full-width">
              <label htmlFor="shopAddress">
                Shop Address
              </label>

              <div className="settings-input-with-icon">
                <FaMapMarkerAlt />

                <input
                  id="shopAddress"
                  name="shopAddress"
                  value={
                    formData.shopAddress
                  }
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="settings-field settings-full-width">
              <label htmlFor="receiptFooter">
                Receipt Footer
                <span>*</span>
              </label>

              <div
                className={`settings-textarea-with-icon ${
                  errors.receiptFooter
                    ? "has-error"
                    : ""
                }`}
              >
                <FaReceipt />

                <textarea
                  id="receiptFooter"
                  name="receiptFooter"
                  value={
                    formData.receiptFooter
                  }
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {errors.receiptFooter && (
                <small className="settings-field-error">
                  {
                    errors.receiptFooter
                  }
                </small>
              )}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <FaTshirt />

            <div>
              <h3>
                Service Prices per Load
              </h3>

              <p>
                These live prices are used
                by the Order Form, receipt,
                revenue, and reports.
              </p>
            </div>
          </div>

          <div className="settings-pricing-card-grid">
            {servicePricingCards.map(
              (card) => (
                <article
                  key={card.field}
                  className="settings-pricing-card"
                >
                  <div className="settings-pricing-card-heading">
                    <div>
                      <FaTshirt />

                      <strong>
                        {card.label}
                      </strong>
                    </div>

                    <span>
                      {formatCurrency(
                        formData[
                          card.field
                        ]
                      )}
                    </span>
                  </div>

                  <p>{card.note}</p>

                  <div className="settings-currency-input">
                    <span>₱</span>

                    <input
                      id={card.field}
                      type="number"
                      name={card.field}
                      min="0"
                      step="0.01"
                      value={
                        formData[
                          card.field
                        ]
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </div>

                  <small>
                    Applied per calculated
                    laundry load.
                  </small>
                </article>
              )
            )}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <FaReceipt />

            <div>
              <h3>Add-ons and Fees</h3>

              <p>
                Additional charges for
                rinses, consumables, pickup,
                and delivery.
              </p>
            </div>
          </div>

          <div className="settings-fee-card-grid">
            {feeCards.map(
              (card) => (
                <article
                  key={card.field}
                  className="settings-fee-card"
                >
                  <div>
                    <FaCoins />

                    <div>
                      <strong>
                        {card.label}
                      </strong>

                      <p>
                        {card.note}
                      </p>
                    </div>
                  </div>

                  <div className="settings-currency-input">
                    <span>₱</span>

                    <input
                      id={card.field}
                      type="number"
                      name={card.field}
                      min="0"
                      step="0.01"
                      value={
                        formData[
                          card.field
                        ]
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <FaWeightHanging />

            <div>
              <h3>Load Calculation</h3>

              <p>
                Maximum laundry weight
                counted as one load.
              </p>
            </div>
          </div>

          <div className="settings-load-layout">
            <div className="settings-field">
              <label htmlFor="maximumWeightPerLoad">
                Maximum Weight per Load
                (kg)
                <span>*</span>
              </label>

              <div
                className={`settings-input-with-icon ${
                  errors.maximumWeightPerLoad
                    ? "has-error"
                    : ""
                }`}
              >
                <FaWeightHanging />

                <input
                  id="maximumWeightPerLoad"
                  type="number"
                  name="maximumWeightPerLoad"
                  min="0.1"
                  step="0.1"
                  value={
                    formData.maximumWeightPerLoad
                  }
                  onChange={handleChange}
                />
              </div>

              {errors.maximumWeightPerLoad && (
                <small className="settings-field-error">
                  {
                    errors.maximumWeightPerLoad
                  }
                </small>
              )}
            </div>

            <div className="settings-pricing-preview">
              <div className="settings-pricing-preview-header">
                <FaCoins />

                <div>
                  <strong>
                    Live Pricing Preview
                  </strong>

                  <span>
                    Example using Complete
                    Service
                  </span>
                </div>
              </div>

              <div className="settings-pricing-preview-flow">
                <div>
                  <span>Weight</span>

                  <strong>
                    {
                      completeServicePreview
                        .exampleWeight
                    }{" "}
                    kg
                  </strong>
                </div>

                <span>→</span>

                <div>
                  <span>Loads</span>

                  <strong>
                    {
                      completeServicePreview
                        .loadCount
                    }
                  </strong>
                </div>

                <span>→</span>

                <div>
                  <span>Total</span>

                  <strong>
                    {formatCurrency(
                      completeServicePreview
                        .total
                    )}
                  </strong>
                </div>
              </div>

              <p>
                Changing the maximum weight
                changes the calculated load
                count for new orders.
              </p>
            </div>
          </div>
        </section>

        <div className="settings-impact-card">
          <FaCheckCircle />

          <div>
            <strong>
              Saved settings are applied to
            </strong>

            <span>
              Order Form pricing, receipts,
              dashboard analytics, revenue,
              reports, and backend totals.
            </span>
          </div>
        </div>

        <div className="settings-actions settings-actions-upgraded">
          <button
            type="submit"
            className="btn-primary"
            disabled={
              isSubmitting ||
              !hasUnsavedChanges
            }
          >
            <FaSave />

            <span>
              {isSubmitting
                ? "Saving..."
                : hasUnsavedChanges
                  ? "Save Settings"
                  : "Settings Saved"}
            </span>
          </button>
        </div>
      </form>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </section>
  );
}

export default SettingsPage;
