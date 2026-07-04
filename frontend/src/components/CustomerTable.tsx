import type { Customer } from "../types/customer";

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => Promise<void>;
}

function CustomerTable({ customers, onEdit, onDelete }: CustomerTableProps) {
  if (customers.length === 0) {
    return <p>No customers yet.</p>;
  }

  return (
    <table className="customer-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Address</th>
          <th>Date Added</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td>{customer.phone ?? "No phone"}</td>
            <td>{customer.address ?? "No address"}</td>
            <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
            <td>
              <button className="secondary-button" onClick={() => onEdit(customer)}>
                Edit
              </button>

              <button
                className="danger-button"
                onClick={() => onDelete(customer.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CustomerTable;