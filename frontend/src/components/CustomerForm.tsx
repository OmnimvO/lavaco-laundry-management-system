import {
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSave,
  FaTimes,
  FaUser,
} from "react-icons/fa";

import type { Customer } from "../types/customer";

interface CustomerFormProps {
  selectedCustomer: Customer | null;
  onSubmit: (data: {
    name: string;
    phone?: string;
    address?: string;
  }) => Promise<void>;
  onCancelEdit: () => void;
}

type CustomerFormErrors = {
  name?: string;
  phone?: string;
};

function CustomerForm({
  selectedCustomer,
  onSubmit,
  onCancelEdit,
}: CustomerFormProps) {
  const [name, setName] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [address, setAddress] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [errors, setErrors] =
    useState<CustomerFormErrors>({});

  useEffect(() => {
    setName(
      selectedCustomer?.name ?? ""
    );
    setPhone(
      selectedCustomer?.phone ?? ""
    );
    setAddress(
      selectedCustomer?.address ?? ""
    );
    setErrors({});
  }, [selectedCustomer]);

  function validateForm() {
    const nextErrors:
      CustomerFormErrors = {};

    if (!name.trim()) {
      nextErrors.name =
        "Customer name is required.";
    }

    const phoneDigits =
      phone.replace(/\D/g, "");

    if (
      phone.trim() &&
      phoneDigits.length < 10
    ) {
      nextErrors.phone =
        "Enter a valid phone number.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length ===
      0
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      await onSubmit({
        name: name.trim(),
        phone:
          phone.trim() || undefined,
        address:
          address.trim() || undefined,
      });

      setName("");
      setPhone("");
      setAddress("");
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setErrors({});
    onCancelEdit();
  }

  return (
    <form
      className="customer-form customer-modal-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <section className="customer-form-section">
        <div className="customer-form-section-header">
          <div className="customer-form-section-icon">
            <FaUser />
          </div>

          <div>
            <h3>
              Customer Information
            </h3>

            <p>
              Enter the customer&apos;s
              contact details below.
            </p>
          </div>
        </div>

        <div className="customer-form-grid">
          <div className="customer-form-group customer-form-group-full">
            <label htmlFor="customerName">
              Customer Name
              <span aria-hidden="true">
                *
              </span>
            </label>

            <div
              className={`customer-input-wrapper ${
                errors.name
                  ? "has-error"
                  : ""
              }`}
            >
              <FaUser />

              <input
                id="customerName"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(
                    event.target.value
                  );

                  if (errors.name) {
                    setErrors(
                      (previous) => ({
                        ...previous,
                        name: undefined,
                      })
                    );
                  }
                }}
                placeholder="Enter customer name"
                autoFocus
                aria-invalid={
                  Boolean(errors.name)
                }
                aria-describedby={
                  errors.name
                    ? "customerNameError"
                    : undefined
                }
              />
            </div>

            {errors.name && (
              <small
                id="customerNameError"
                className="customer-field-error"
              >
                {errors.name}
              </small>
            )}
          </div>

          <div className="customer-form-group">
            <label htmlFor="customerPhone">
              Phone Number
            </label>

            <div
              className={`customer-input-wrapper ${
                errors.phone
                  ? "has-error"
                  : ""
              }`}
            >
              <FaPhoneAlt />

              <input
                id="customerPhone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target.value
                  );

                  if (errors.phone) {
                    setErrors(
                      (previous) => ({
                        ...previous,
                        phone: undefined,
                      })
                    );
                  }
                }}
                placeholder="09XX XXX XXXX"
                aria-invalid={
                  Boolean(errors.phone)
                }
                aria-describedby={
                  errors.phone
                    ? "customerPhoneError"
                    : undefined
                }
              />
            </div>

            {errors.phone && (
              <small
                id="customerPhoneError"
                className="customer-field-error"
              >
                {errors.phone}
              </small>
            )}
          </div>

          <div className="customer-form-group customer-form-group-full">
            <label htmlFor="customerAddress">
              Address
            </label>

            <div className="customer-input-wrapper customer-textarea-wrapper">
              <FaMapMarkerAlt />

              <textarea
                id="customerAddress"
                value={address}
                onChange={(event) =>
                  setAddress(
                    event.target.value
                  )
                }
                placeholder="Enter complete address"
                rows={4}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="customer-form-actions">
        <button
          type="button"
          className="btn-secondary customer-cancel-button"
          onClick={handleCancel}
          disabled={submitting}
        >
          <FaTimes />
          Cancel
        </button>

        <button
          type="submit"
          className="btn-primary customer-submit-button"
          disabled={submitting}
        >
          <FaSave />
          {submitting
            ? "Saving..."
            : selectedCustomer
              ? "Update Customer"
              : "Save Customer"}
        </button>
      </div>
    </form>
  );
}

export default CustomerForm;