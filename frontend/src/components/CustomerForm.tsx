import { useEffect, useState } from "react";
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

function CustomerForm({
  selectedCustomer,
  onSubmit,
  onCancelEdit,
}: CustomerFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      setName(selectedCustomer.name);
      setPhone(selectedCustomer.phone ?? "");
      setAddress(selectedCustomer.address ?? "");
    }
  }, [selectedCustomer]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Customer name is required");
      return;
    }

    setSubmitting(true);

    await onSubmit({
      name,
      phone,
      address,
    });

    setName("");
    setPhone("");
    setAddress("");
    setSubmitting(false);
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Customer name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <input
        type="text"
        placeholder="Phone number"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />

      <input
        type="text"
        placeholder="Address"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />

      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting
          ? "Saving..."
          : selectedCustomer
          ? "Update Customer"
          : "Save Customer"}
      </button>

      {selectedCustomer && (
        <button className="secondary-button" type="button" onClick={onCancelEdit}>
          Cancel
        </button>
      )}
    </form>
  );
}

export default CustomerForm;