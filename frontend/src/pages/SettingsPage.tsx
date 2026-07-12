import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  FaMapMarkerAlt,
  FaPhone,
  FaReceipt,
  FaSave,
  FaStore,
  FaTruck,
  FaTshirt,
  FaWeightHanging,
} from "react-icons/fa";

import { useSettings } from "../hooks/useSettings";

import type {
  ShopSettings,
  UpdateShopSettingsData,
} from "../types/settings";

import Toast from "../components/Toast";
import { useAuth } from "../hooks/useAuth";

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

function SettingsPage() {
  const { isAdmin } = useAuth();

  const {
    settings,
    loading,
    errorMessage,
    saveSettings,
  } = useSettings();

  const [
    formData,
    setFormData,
  ] = useState<SettingsFormData>(
    emptyFormData
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [toast, setToast] =
    useState<{
      message: string;
      type: "success" | "error";
    } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(
        settingsToForm(settings)
      );
    }
  }, [settings]);

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

    if (!formData.shopName.trim()) {
      showToast(
        "Shop name is required.",
        "error"
      );
      return;
    }

    if (
      !formData.receiptFooter.trim()
    ) {
      showToast(
        "Receipt footer is required.",
        "error"
      );
      return;
    }

    try {
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
        throw new Error(
          "Maximum weight per load must be greater than zero."
        );
      }

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

      setFormData(
        settingsToForm(
          savedSettings
        )
      );

      showToast(
        "Shop settings updated successfully",
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
        <p>Loading settings...</p>
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
      </div>

      <form
        className="settings-form"
        onSubmit={handleSubmit}
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
              </label>

              <div className="settings-input-with-icon">
                <FaStore />

                <input
                  id="shopName"
                  name="shopName"
                  value={
                    formData.shopName
                  }
                  onChange={handleChange}
                  required
                />
              </div>
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
              </label>

              <div className="settings-textarea-with-icon">
                <FaReceipt />

                <textarea
                  id="receiptFooter"
                  name="receiptFooter"
                  value={
                    formData.receiptFooter
                  }
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>
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
                Default prices used when
                creating laundry orders.
              </p>
            </div>
          </div>

          <div className="settings-price-grid">
            <div className="settings-field">
              <label htmlFor="completeServicePrice">
                Complete Service
              </label>

              <input
                id="completeServicePrice"
                type="number"
                name="completeServicePrice"
                min="0"
                step="0.01"
                value={
                  formData.completeServicePrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="washAndDryPrice">
                Wash & Dry
              </label>

              <input
                id="washAndDryPrice"
                type="number"
                name="washAndDryPrice"
                min="0"
                step="0.01"
                value={
                  formData.washAndDryPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="washOnlyPrice">
                Wash Only
              </label>

              <input
                id="washOnlyPrice"
                type="number"
                name="washOnlyPrice"
                min="0"
                step="0.01"
                value={
                  formData.washOnlyPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="dryOnlyPrice">
                Dry Only
              </label>

              <input
                id="dryOnlyPrice"
                type="number"
                name="dryOnlyPrice"
                min="0"
                step="0.01"
                value={
                  formData.dryOnlyPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="dryAndFoldPrice">
                Dry & Fold
              </label>

              <input
                id="dryAndFoldPrice"
                type="number"
                name="dryAndFoldPrice"
                min="0"
                step="0.01"
                value={
                  formData.dryAndFoldPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="foldOnlyPrice">
                Fold Only
              </label>

              <input
                id="foldOnlyPrice"
                type="number"
                name="foldOnlyPrice"
                min="0"
                step="0.01"
                value={
                  formData.foldOnlyPrice
                }
                onChange={handleChange}
              />
            </div>
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

          <div className="settings-price-grid">
            <div className="settings-field">
              <label htmlFor="extraRinseFee">
                Extra Rinse Fee
              </label>

              <input
                id="extraRinseFee"
                type="number"
                name="extraRinseFee"
                min="0"
                step="0.01"
                value={
                  formData.extraRinseFee
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="soapPrice">
                Soap Price
              </label>

              <input
                id="soapPrice"
                type="number"
                name="soapPrice"
                min="0"
                step="0.01"
                value={
                  formData.soapPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="softenerPrice">
                Softener Price
              </label>

              <input
                id="softenerPrice"
                type="number"
                name="softenerPrice"
                min="0"
                step="0.01"
                value={
                  formData.softenerPrice
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="pickupOnlyFee">
                Pickup Only Fee
              </label>

              <input
                id="pickupOnlyFee"
                type="number"
                name="pickupOnlyFee"
                min="0"
                step="0.01"
                value={
                  formData.pickupOnlyFee
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="deliveryOnlyFee">
                Delivery Only Fee
              </label>

              <input
                id="deliveryOnlyFee"
                type="number"
                name="deliveryOnlyFee"
                min="0"
                step="0.01"
                value={
                  formData.deliveryOnlyFee
                }
                onChange={handleChange}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="pickupAndDeliveryFee">
                Pickup & Delivery Fee
              </label>

              <input
                id="pickupAndDeliveryFee"
                type="number"
                name="pickupAndDeliveryFee"
                min="0"
                step="0.01"
                value={
                  formData.pickupAndDeliveryFee
                }
                onChange={handleChange}
              />
            </div>
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

          <div className="settings-grid settings-load-grid">
            <div className="settings-field">
              <label htmlFor="maximumWeightPerLoad">
                Maximum Weight per Load
                (kg)
              </label>

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

            <div className="settings-help-card">
              <FaTruck />

              <p>
                New orders will use this
                value once Order Form
                pricing is connected to
                saved shop settings.
              </p>
            </div>
          </div>
        </section>

        <div className="settings-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            <FaSave />

            <span>
              {isSubmitting
                ? "Saving..."
                : "Save Settings"}
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