import {
  useEffect,
  useState,
} from "react";

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

function getTodayString() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

const initialFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  position: "LAUNDRY_STAFF",
  status: "ACTIVE",
  dateHired: getTodayString(),
  notes: "",
};

function EmployeeForm({
  selectedEmployee,
  onSubmit,
}: EmployeeFormProps) {
  const [formData, setFormData] =
    useState<EmployeeFormData>(
      initialFormData
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    if (!selectedEmployee) {
      setFormData({
        ...initialFormData,
        dateHired: getTodayString(),
      });

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
  }, [selectedEmployee]);

  function handleChange(
    event: React.ChangeEvent<
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
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!formData.firstName.trim()) {
      alert(
        "Employee first name is required."
      );
      return;
    }

    if (!formData.lastName.trim()) {
      alert(
        "Employee last name is required."
      );
      return;
    }

    if (!formData.dateHired) {
      alert(
        "Date hired is required."
      );
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
      className="employee-form"
      onSubmit={handleSubmit}
    >
      <div className="employee-form-grid">
        <div className="form-group">
          <label htmlFor="firstName">
            First Name
          </label>

          <input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Employee first name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">
            Last Name
          </label>

          <input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Employee last name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">
            Phone Number
          </label>

          <input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="09XXXXXXXXX"
          />
        </div>

        <div className="form-group">
          <label htmlFor="position">
            Position
          </label>

          <select
            id="position"
            name="position"
            value={formData.position}
            onChange={handleChange}
          >
            {EMPLOYEE_POSITIONS.map(
              (position) => (
                <option
                  key={position.value}
                  value={position.value}
                >
                  {position.label}
                </option>
              )
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">
            Employment Status
          </label>

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

        <div className="form-group">
          <label htmlFor="dateHired">
            Date Hired
          </label>

          <input
            id="dateHired"
            type="date"
            name="dateHired"
            value={formData.dateHired}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group employee-full-width">
          <label htmlFor="address">
            Address
          </label>

          <input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Employee address"
          />
        </div>

        <div className="form-group employee-full-width">
          <label htmlFor="notes">
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Shift, responsibilities, or additional notes"
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
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