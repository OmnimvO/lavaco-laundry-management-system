import {
  useEffect,
  useState,
} from "react";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  FaBriefcase,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSave,
  FaStickyNote,
  FaTimes,
  FaUser,
} from "react-icons/fa";

import type { Employee } from "../types/employee";
import type { EmployeePayload } from "../api/employeeApi";

import {
  EMPLOYEE_POSITIONS,
  EMPLOYEE_STATUSES,
} from "../constants/employee";

type EmployeeFormProps = {
  selectedEmployee?: Employee | null;
  onSubmit: (
    data: EmployeePayload
  ) => void | Promise<void>;
  onCancel: () => void;
};

type EmployeeFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  position: string;
  status: string;
  dateHired: string;
  notes: string;
};

type EmployeeFormErrors = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateHired?: string;
};

function getTodayString() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getInitialFormData():
  EmployeeFormData {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    position: "LAUNDRY_STAFF",
    status: "ACTIVE",
    dateHired: getTodayString(),
    notes: "",
  };
}

function EmployeeForm({
  selectedEmployee,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [formData, setFormData] =
    useState<EmployeeFormData>(
      getInitialFormData()
    );

  const [errors, setErrors] =
    useState<EmployeeFormErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    if (!selectedEmployee) {
      setFormData(
        getInitialFormData()
      );
      setErrors({});
      return;
    }

    setFormData({
      firstName:
        selectedEmployee.firstName ?? "",

      lastName:
        selectedEmployee.lastName ?? "",

      phone:
        selectedEmployee.phone ?? "",

      address:
        selectedEmployee.address ?? "",

      position:
        selectedEmployee.position ??
        "LAUNDRY_STAFF",

      status:
        selectedEmployee.status ??
        "ACTIVE",

      dateHired:
        selectedEmployee.dateHired
          ? new Date(
              selectedEmployee.dateHired
            )
              .toISOString()
              .slice(0, 10)
          : getTodayString(),

      notes:
        selectedEmployee.notes ?? "",
    });

    setErrors({});
  }, [selectedEmployee]);

  function handleChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (
      name in errors &&
      errors[
        name as keyof EmployeeFormErrors
      ]
    ) {
      setErrors((previous) => ({
        ...previous,
        [name]: undefined,
      }));
    }
  }

  function validateForm() {
    const nextErrors:
      EmployeeFormErrors = {};

    if (!formData.firstName.trim()) {
      nextErrors.firstName =
        "First name is required.";
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName =
        "Last name is required.";
    }

    const phoneDigits =
      formData.phone.replace(
        /\D/g,
        ""
      );

    if (
      formData.phone.trim() &&
      phoneDigits.length < 10
    ) {
      nextErrors.phone =
        "Enter a valid phone number.";
    }

    if (!formData.dateHired) {
      nextErrors.dateHired =
        "Date hired is required.";
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

    const payload: EmployeePayload = {
      firstName:
        formData.firstName.trim(),

      lastName:
        formData.lastName.trim(),

      phone:
        formData.phone.trim() ||
        undefined,

      address:
        formData.address.trim() ||
        undefined,

      position:
        formData.position,

      status:
        formData.status,

      dateHired:
        formData.dateHired,

      notes:
        formData.notes.trim() ||
        undefined,
    };

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="employee-form employee-modal-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <section className="employee-form-section">
        <div className="employee-form-section-header">
          <div className="employee-form-section-icon">
            <FaUser />
          </div>

          <div>
            <h3>
              Employee Information
            </h3>

            <p>
              Enter the employee&apos;s
              personal and employment details.
            </p>
          </div>
        </div>

        <div className="employee-form-grid">
          <div className="employee-field">
            <label htmlFor="firstName">
              First Name
              <span>*</span>
            </label>

            <div
              className={`employee-input-wrapper ${
                errors.firstName
                  ? "has-error"
                  : ""
              }`}
            >
              <FaUser />

              <input
                id="firstName"
                name="firstName"
                value={
                  formData.firstName
                }
                onChange={handleChange}
                placeholder="First name"
                autoFocus
              />
            </div>

            {errors.firstName && (
              <small className="employee-field-error">
                {errors.firstName}
              </small>
            )}
          </div>

          <div className="employee-field">
            <label htmlFor="lastName">
              Last Name
              <span>*</span>
            </label>

            <div
              className={`employee-input-wrapper ${
                errors.lastName
                  ? "has-error"
                  : ""
              }`}
            >
              <FaUser />

              <input
                id="lastName"
                name="lastName"
                value={
                  formData.lastName
                }
                onChange={handleChange}
                placeholder="Last name"
              />
            </div>

            {errors.lastName && (
              <small className="employee-field-error">
                {errors.lastName}
              </small>
            )}
          </div>

          <div className="employee-field">
            <label htmlFor="phone">
              Phone Number
            </label>

            <div
              className={`employee-input-wrapper ${
                errors.phone
                  ? "has-error"
                  : ""
              }`}
            >
              <FaPhoneAlt />

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09XX XXX XXXX"
              />
            </div>

            {errors.phone && (
              <small className="employee-field-error">
                {errors.phone}
              </small>
            )}
          </div>

          <div className="employee-field">
            <label htmlFor="dateHired">
              Date Hired
              <span>*</span>
            </label>

            <div
              className={`employee-input-wrapper ${
                errors.dateHired
                  ? "has-error"
                  : ""
              }`}
            >
              <FaCalendarAlt />

              <input
                id="dateHired"
                type="date"
                name="dateHired"
                value={
                  formData.dateHired
                }
                onChange={handleChange}
              />
            </div>

            {errors.dateHired && (
              <small className="employee-field-error">
                {errors.dateHired}
              </small>
            )}
          </div>

          <div className="employee-field">
            <label htmlFor="position">
              Position
            </label>

            <div className="employee-input-wrapper">
              <FaBriefcase />

              <select
                id="position"
                name="position"
                value={
                  formData.position
                }
                onChange={handleChange}
              >
                {EMPLOYEE_POSITIONS.map(
                  (position) => (
                    <option
                      key={
                        position.value
                      }
                      value={
                        position.value
                      }
                    >
                      {position.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="employee-field">
            <label htmlFor="status">
              Employment Status
            </label>

            <div className="employee-input-wrapper">
              <FaBriefcase />

              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {EMPLOYEE_STATUSES.map(
                  (status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="employee-field employee-full-width">
            <label htmlFor="address">
              Address
            </label>

            <div className="employee-input-wrapper">
              <FaMapMarkerAlt />

              <input
                id="address"
                name="address"
                value={
                  formData.address
                }
                onChange={handleChange}
                placeholder="Complete address"
              />
            </div>
          </div>

          <div className="employee-field employee-full-width">
            <label htmlFor="notes">
              Notes
            </label>

            <div className="employee-input-wrapper employee-textarea-wrapper">
              <FaStickyNote />

              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Shift, responsibilities, or additional notes"
                rows={4}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="employee-form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <FaTimes />
          Cancel
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          <FaSave />

          {isSubmitting
            ? "Saving..."
            : selectedEmployee
              ? "Update Employee"
              : "Add Employee"}
        </button>
      </div>
    </form>
  );
}

export default EmployeeForm;
