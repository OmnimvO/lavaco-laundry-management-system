import { useEffect, useState } from "react";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../api/customerApi";
import CustomerForm from "../components/CustomerForm";
import CustomerTable from "../components/CustomerTable";
import type { Customer } from "../types/customer";

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCustomers() {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleSubmitCustomer(data: {
    name: string;
    phone?: string;
    address?: string;
  }) {
    if (selectedCustomer) {
      await updateCustomer(selectedCustomer.id, data);
      setSelectedCustomer(null);
    } else {
      await createCustomer(data);
    }

    await loadCustomers();
  }

  function handleEditCustomer(customer: Customer) {
    setSelectedCustomer(customer);
  }

  async function handleDeleteCustomer(id: number) {
    const confirmed = window.confirm("Delete this customer?");

    if (!confirmed) return;

    await deleteCustomer(id);
    await loadCustomers();
  }

  if (loading) {
    return <p>Loading customers...</p>;
  }

  return (
    <section className="customers-page">
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Manage Lavaco customer records.</p>
        </div>
      </div>

      <CustomerForm
        selectedCustomer={selectedCustomer}
        onSubmit={handleSubmitCustomer}
        onCancelEdit={() => setSelectedCustomer(null)}
      />

      <CustomerTable
        customers={customers}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />
    </section>
  );
}

export default CustomersPage;