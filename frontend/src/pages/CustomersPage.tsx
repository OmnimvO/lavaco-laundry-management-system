import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaAddressBook,
  FaEdit,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSearch,
  FaTrash,
  FaUndoAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../api/customerApi";

import CustomerForm from "../components/CustomerForm";
import Modal from "../components/Modal";
import Toast from "../components/Toast";

import type { Customer } from "../types/customer";
import type { DashboardNavigationRequest } from "../App";

import {
  useAuth,
} from "../hooks/useAuth";

type CustomersPageProps = {
  dashboardRequest:
    | Extract<
        DashboardNavigationRequest,
        { page: "customers" }
      >
    | null;
};

type CustomerSortOption =
  | "NAME_AZ"
  | "NAME_ZA";

function getCustomerInitial(name: string) {
  const trimmedName = name.trim();

  return trimmedName
    ? trimmedName.charAt(0).toUpperCase()
    : "?";
}

function formatPhoneNumber(value?: string | null) {
  if (!value) {
    return "Not provided";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(
      4,
      7
    )} ${digits.slice(7)}`;
  }

  return value;
}

function CustomersPage({
  dashboardRequest,
}: CustomersPageProps) {
  const {
    token,
  } = useAuth();
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(null);

  const [
    isCustomerModalOpen,
    setIsCustomerModalOpen,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [sortOption, setSortOption] =
    useState<CustomerSortOption>(
      "NAME_AZ"
    );

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  function showToast(
    message: string,
    type: "success" | "error" =
      "success"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  const loadCustomers =
    useCallback(async () => {
      if (!token) {
        setLoading(false);

        showToast(
          "Your session is unavailable. Please log in again.",
          "error"
        );

        return;
      }

      setLoading(true);

      try {
        const data =
          await getCustomers(
            token
          );

        setCustomers(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load customers:",
          error
        );

        showToast(
          error instanceof Error
            ? error.message
            : "Failed to load customers.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }, [token]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (
      !dashboardRequest ||
      dashboardRequest.action !== "CREATE"
    ) {
      return;
    }

    setSelectedCustomer(null);
    setIsCustomerModalOpen(true);
  }, [dashboardRequest]);

  function openCreateModal() {
    setSelectedCustomer(null);
    setIsCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setSelectedCustomer(null);
    setIsCustomerModalOpen(false);
  }

  async function handleSubmitCustomer(data: {
    name: string;
    phone?: string;
    address?: string;
  }) {
    if (!token) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );
      return;
    }

    try {
      if (selectedCustomer) {
        await updateCustomer(
          selectedCustomer.id,
          data,
          token
        );

        showToast(
          "Customer updated successfully!",
          "success"
        );
      } else {
        await createCustomer(
          data,
          token
        );

        showToast(
          "Customer created successfully!",
          "success"
        );
      }

      await loadCustomers();
      closeCustomerModal();
    } catch (error) {
      console.error(
        "Failed to save customer:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save customer.",
        "error"
      );
    }
  }

  function handleEditCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(true);
  }

  async function handleDeleteCustomer(
    id: number
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      showToast(
        "Your session is unavailable. Please log in again.",
        "error"
      );
      return;
    }

    try {
      await deleteCustomer(
        id,
        token
      );
      await loadCustomers();

      showToast(
        "Customer deleted successfully!",
        "success"
      );
    } catch (error) {
      console.error(
        "Failed to delete customer:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to delete customer.",
        "error"
      );
    }
  }

  const customerSummary =
    useMemo(() => {
      const withPhone =
        customers.filter(
          (customer) =>
            Boolean(
              customer.phone?.trim()
            )
        ).length;

      const withAddress =
        customers.filter(
          (customer) =>
            Boolean(
              customer.address?.trim()
            )
        ).length;

      const completeProfiles =
        customers.filter(
          (customer) =>
            Boolean(
              customer.phone?.trim()
            ) &&
            Boolean(
              customer.address?.trim()
            )
        ).length;

      return {
        total: customers.length,
        withPhone,
        withAddress,
        completeProfiles,
      };
    }, [customers]);

  const displayedCustomers =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        customers.filter(
          (customer) => {
            if (
              normalizedSearch === ""
            ) {
              return true;
            }

            const name = String(
              customer.name ?? ""
            ).toLowerCase();

            const phone = String(
              customer.phone ?? ""
            ).toLowerCase();

            const address = String(
              customer.address ?? ""
            ).toLowerCase();

            return (
              name.includes(
                normalizedSearch
              ) ||
              phone.includes(
                normalizedSearch
              ) ||
              address.includes(
                normalizedSearch
              )
            );
          }
        );

      return [...filtered].sort(
        (
          firstCustomer,
          secondCustomer
        ) => {
          const firstName = String(
            firstCustomer.name ?? ""
          );

          const secondName = String(
            secondCustomer.name ?? ""
          );

          if (
            sortOption === "NAME_ZA"
          ) {
            return secondName.localeCompare(
              firstName
            );
          }

          return firstName.localeCompare(
            secondName
          );
        }
      );
    }, [
      customers,
      searchTerm,
      sortOption,
    ]);

  function clearFilters() {
    setSearchTerm("");
    setSortOption("NAME_AZ");
  }

  if (loading) {
    return (
      <section className="customers-page">
        <p>Loading customers...</p>
      </section>
    );
  }

  return (
    <section className="customers-page">
      <div className="page-header">
        <div>
          <h2>Customers</h2>

          <p>
            Manage Lava Co. customer
            records.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateModal}
        >
          + New Customer
        </button>
      </div>

      <div className="orders-summary-grid">
        <article className="orders-summary-card">
          <span>
            <FaUsers /> Total Customers
          </span>

          <strong>
            {customerSummary.total}
          </strong>
        </article>

        <article className="orders-summary-card">
          <span>
            <FaPhoneAlt /> With Phone
          </span>

          <strong>
            {customerSummary.withPhone}
          </strong>
        </article>

        <article className="orders-summary-card">
          <span>
            <FaMapMarkerAlt /> With Address
          </span>

          <strong>
            {customerSummary.withAddress}
          </strong>
        </article>

        <article className="orders-summary-card">
          <span>
            <FaAddressBook /> Complete Profiles
          </span>

          <strong>
            {
              customerSummary
                .completeProfiles
            }
          </strong>
        </article>
      </div>

      <div className="orders-toolbar">
        <div className="orders-search">
          <label htmlFor="customerSearch">
            Search Customers
          </label>

          <div className="customer-search-input">
            <FaSearch />

            <input
              id="customerSearch"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Name, phone, or address"
            />
          </div>
        </div>

        <div className="orders-filter">
          <label htmlFor="customerSort">
            Sort By
          </label>

          <div className="sort-actions">
            <select
              id="customerSort"
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target
                    .value as CustomerSortOption
                )
              }
            >
              <option value="NAME_AZ">
                Name A–Z
              </option>

              <option value="NAME_ZA">
                Name Z–A
              </option>
            </select>

            <button
              type="button"
              className="icon-button reset-filter-button"
              title="Clear Filters"
              aria-label="Clear Filters"
              onClick={clearFilters}
            >
              <FaUndoAlt />
            </button>
          </div>
        </div>
      </div>

      <div className="orders-result-summary">
        <span>
          Showing{" "}
          <strong>
            {displayedCustomers.length}
          </strong>{" "}
          of{" "}
          <strong>
            {customers.length}
          </strong>{" "}
          customers
        </span>
      </div>

      {displayedCustomers.length ===
      0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-icon">
            <FaUserPlus />
          </div>

          <strong>
            {customers.length === 0
              ? "No customers yet"
              : "No matching customers"}
          </strong>

          <p>
            {customers.length === 0
              ? "Add your first customer to begin building your customer records."
              : "Try changing or clearing your current search."}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedCustomers.map(
                (customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-name-cell">
                        <span
                          className="customer-avatar"
                          aria-hidden="true"
                        >
                          {getCustomerInitial(
                            customer.name
                          )}
                        </span>

                        <div>
                          <strong>
                            {customer.name}
                          </strong>

                          <small>
                            Customer #{customer.id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="customer-phone-cell">
                      {formatPhoneNumber(
                        customer.phone
                      )}
                    </td>

                    <td>
                      <span
                        className="customer-address-text"
                        title={
                          customer.address ||
                          "Not provided"
                        }
                      >
                        {customer.address ||
                          "Not provided"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button edit-button"
                          title="Edit Customer"
                          aria-label={`Edit ${customer.name}`}
                          onClick={() =>
                            handleEditCustomer(
                              customer
                            )
                          }
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          className="icon-button delete-button"
                          title="Delete Customer"
                          aria-label={`Delete ${customer.name}`}
                          onClick={() =>
                            void handleDeleteCustomer(
                              customer.id
                            )
                          }
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {isCustomerModalOpen && (
        <Modal
          title={
            selectedCustomer
              ? "Edit Customer"
              : "New Customer"
          }
          onClose={
            closeCustomerModal
          }
        >
          <CustomerForm
            selectedCustomer={
              selectedCustomer
            }
            onSubmit={
              handleSubmitCustomer
            }
            onCancelEdit={
              closeCustomerModal
            }
          />
        </Modal>
      )}

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

export default CustomersPage;