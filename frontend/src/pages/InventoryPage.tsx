import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArchive,
  FaArrowDown,
  FaArrowUp,
  FaBoxes,
  FaClipboardList,
  FaEdit,
  FaExclamationTriangle,
  FaHistory,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaUndoAlt,
} from "react-icons/fa";

import {
  adjustInventoryItem,
  archiveInventoryItem,
  createInventoryItem,
  getInventoryItem,
  getInventoryItems,
  getInventoryMovements,
  stockInInventoryItem,
  stockOutInventoryItem,
  updateInventoryItem,
} from "../api/inventoryApi";

import type {
  CreateInventoryItemData,
  InventoryCategory,
  InventoryItem,
  InventoryMovement,
  UpdateInventoryItemData,
} from "../types/inventory";

import {
  useAuth,
} from "../hooks/useAuth";

import Modal from "../components/Modal";
import Toast from "../components/Toast";

const INVENTORY_CATEGORIES: {
  value:
    InventoryCategory;
  label: string;
}[] = [
  {
    value:
      "DETERGENT",
    label:
      "Detergent",
  },
  {
    value:
      "FABRIC_SOFTENER",
    label:
      "Fabric Softener",
  },
  {
    value:
      "PACKAGING",
    label:
      "Packaging",
  },
  {
    value:
      "CLEANING_SUPPLY",
    label:
      "Cleaning Supply",
  },
  {
    value:
      "OTHER",
    label:
      "Other",
  },
];

type ItemFormState = {
  name: string;
  category:
    InventoryCategory;
  unit: string;
  quantity: string;
  reorderLevel: string;
  supplierName: string;
  supplierContact: string;
  notes: string;
  isActive: boolean;
};

type MovementMode =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT";

const initialFormState:
  ItemFormState = {
  name: "",
  category:
    "DETERGENT",
  unit: "pack",
  quantity: "0",
  reorderLevel: "0",
  supplierName: "",
  supplierContact: "",
  notes: "",
  isActive: true,
};

function formatCategory(
  category:
    InventoryCategory
) {
  return (
    INVENTORY_CATEGORIES.find(
      (item) =>
        item.value ===
        category
    )?.label ??
    category.replaceAll(
      "_",
      " "
    )
  );
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Invalid date";
  }

  return date.toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getStockStatus(
  item: InventoryItem
) {
  if (
    item.quantity <= 0
  ) {
    return {
      label:
        "Out of Stock",
      className:
        "inventory-status-out",
    };
  }

  if (
    item.quantity <=
    item.reorderLevel
  ) {
    return {
      label:
        "Low Stock",
      className:
        "inventory-status-low",
    };
  }

  if (!item.isActive) {
    return {
      label:
        "Inactive",
      className:
        "inventory-status-inactive",
    };
  }

  return {
    label:
      "In Stock",
    className:
      "inventory-status-ok",
  };
}

function InventoryPage() {
  const {
    token,
    isAdmin,
  } = useAuth();

  const [
    items,
    setItems,
  ] = useState<
    InventoryItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("ALL");

  const [
    stockFilter,
    setStockFilter,
  ] = useState("ALL");

  const [
    sortOption,
    setSortOption,
  ] = useState<
    | "NAME_AZ"
    | "NAME_ZA"
    | "LOWEST_STOCK"
    | "HIGHEST_STOCK"
    | "RECENTLY_UPDATED"
  >("NAME_AZ");

  const [
    isItemModalOpen,
    setIsItemModalOpen,
  ] = useState(false);

  const [
    selectedItem,
    setSelectedItem,
  ] = useState<
    InventoryItem | null
  >(null);

  const [
    itemForm,
    setItemForm,
  ] = useState<
    ItemFormState
  >(initialFormState);

  const [
    itemSubmitting,
    setItemSubmitting,
  ] = useState(false);

  const [
    movementItem,
    setMovementItem,
  ] = useState<
    InventoryItem | null
  >(null);

  const [
    movementMode,
    setMovementMode,
  ] = useState<
    MovementMode
  >("STOCK_IN");

  const [
    movementQuantity,
    setMovementQuantity,
  ] = useState("1");

  const [
    movementReason,
    setMovementReason,
  ] = useState("");

  const [
    movementSubmitting,
    setMovementSubmitting,
  ] = useState(false);

  const [
    historyItem,
    setHistoryItem,
  ] = useState<
    InventoryItem | null
  >(null);

  const [
    movements,
    setMovements,
  ] = useState<
    InventoryMovement[]
  >([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState<{
    message: string;
    type:
      | "success"
      | "error";
  } | null>(null);

  function showToast(
    message: string,
    type:
      | "success"
      | "error" =
      "success"
  ) {
    setToast({
      message,
      type,
    });

    window.setTimeout(
      () => {
        setToast(null);
      },
      3000
    );
  }

  const loadItems =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        if (!token) {
          return;
        }

        try {
          if (
            manualRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(true);
          }

          const data =
            await getInventoryItems(
              token
            );

          setItems(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (error) {
          console.error(
            "Failed to load inventory:",
            error
          );

          showToast(
            error instanceof Error
              ? error.message
              : "Failed to load inventory.",
            "error"
          );

          if (
            !manualRefresh
          ) {
            setItems([]);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [token]
    );

  useEffect(() => {
    void loadItems(false);
  }, [loadItems]);

  function closeItemModal() {
    setIsItemModalOpen(
      false
    );

    setSelectedItem(
      null
    );

    setItemForm(
      initialFormState
    );
  }

  function openCreateModal() {
    setSelectedItem(
      null
    );

    setItemForm(
      initialFormState
    );

    setIsItemModalOpen(
      true
    );
  }

  function openEditModal(
    item: InventoryItem
  ) {
    setSelectedItem(item);

    setItemForm({
      name:
        item.name,

      category:
        item.category,

      unit:
        item.unit,

      quantity:
        String(
          item.quantity
        ),

      reorderLevel:
        String(
          item.reorderLevel
        ),

      supplierName:
        item.supplierName ??
        "",

      supplierContact:
        item.supplierContact ??
        "",

      notes:
        item.notes ?? "",

      isActive:
        item.isActive,
    });

    setIsItemModalOpen(
      true
    );
  }

  async function handleItemSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!token) {
      return;
    }

    const quantity =
      Number(
        itemForm.quantity
      );

    const reorderLevel =
      Number(
        itemForm.reorderLevel
      );

    if (
      !itemForm.name.trim() ||
      !itemForm.unit.trim()
    ) {
      showToast(
        "Item name and unit are required.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity < 0 ||
      !Number.isFinite(
        reorderLevel
      ) ||
      reorderLevel < 0
    ) {
      showToast(
        "Quantity and reorder level must be zero or greater.",
        "error"
      );
      return;
    }

    try {
      setItemSubmitting(
        true
      );

      if (
        selectedItem
      ) {
        const data:
          UpdateInventoryItemData = {
          name:
            itemForm.name.trim(),

          category:
            itemForm.category,

          unit:
            itemForm.unit.trim(),

          reorderLevel,

          supplierName:
            itemForm.supplierName.trim() ||
            null,

          supplierContact:
            itemForm.supplierContact.trim() ||
            null,

          notes:
            itemForm.notes.trim() ||
            null,

          isActive:
            itemForm.isActive,
        };

        await updateInventoryItem(
          selectedItem.id,
          data,
          token
        );

        showToast(
          "Inventory item updated successfully."
        );
      } else {
        const data:
          CreateInventoryItemData = {
          name:
            itemForm.name.trim(),

          category:
            itemForm.category,

          unit:
            itemForm.unit.trim(),

          quantity,

          reorderLevel,

          supplierName:
            itemForm.supplierName.trim(),

          supplierContact:
            itemForm.supplierContact.trim(),

          notes:
            itemForm.notes.trim(),

          isActive:
            itemForm.isActive,
        };

        await createInventoryItem(
          data,
          token
        );

        showToast(
          "Inventory item created successfully."
        );
      }

      closeItemModal();
      await loadItems(false);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to save inventory item.",
        "error"
      );
    } finally {
      setItemSubmitting(
        false
      );
    }
  }

  function openMovementModal(
    item:
      InventoryItem,
    mode:
      MovementMode
  ) {
    setMovementItem(item);
    setMovementMode(mode);

    setMovementQuantity(
      mode === "ADJUSTMENT"
        ? String(
            item.quantity
          )
        : "1"
    );

    setMovementReason("");
  }

  function closeMovementModal() {
    setMovementItem(null);
    setMovementQuantity("1");
    setMovementReason("");
  }

  async function handleMovementSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !token ||
      !movementItem
    ) {
      return;
    }

    const quantity =
      Number(
        movementQuantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity < 0 ||
      (
        movementMode !==
          "ADJUSTMENT" &&
        quantity <= 0
      )
    ) {
      showToast(
        movementMode ===
        "ADJUSTMENT"
          ? "Adjusted quantity must be zero or greater."
          : "Movement quantity must be greater than zero.",
        "error"
      );
      return;
    }

    try {
      setMovementSubmitting(
        true
      );

      const payload = {
        quantity,
        reason:
          movementReason.trim(),
      };

      if (
        movementMode ===
        "STOCK_IN"
      ) {
        await stockInInventoryItem(
          movementItem.id,
          payload,
          token
        );
      } else if (
        movementMode ===
        "STOCK_OUT"
      ) {
        await stockOutInventoryItem(
          movementItem.id,
          payload,
          token
        );
      } else {
        await adjustInventoryItem(
          movementItem.id,
          payload,
          token
        );
      }

      closeMovementModal();
      await loadItems(false);

      showToast(
        "Inventory stock updated successfully."
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to update stock.",
        "error"
      );
    } finally {
      setMovementSubmitting(
        false
      );
    }
  }

  async function openHistoryModal(
    item:
      InventoryItem
  ) {
    if (!token) {
      return;
    }

    setHistoryItem(item);
    setHistoryLoading(true);
    setMovements([]);

    try {
      const [
        fullItem,
        history,
      ] =
        await Promise.all([
          getInventoryItem(
            item.id,
            token
          ),

          getInventoryMovements(
            item.id,
            token
          ),
        ]);

      setHistoryItem(
        fullItem
      );

      setMovements(
        Array.isArray(history)
          ? history
          : []
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to load movement history.",
        "error"
      );
    } finally {
      setHistoryLoading(
        false
      );
    }
  }

  async function handleArchive(
    item:
      InventoryItem
  ) {
    if (
      !token ||
      !isAdmin
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Archive ${item.name}? It can be restored later from Settings → Archives.`
      );

    if (!confirmed) {
      return;
    }

    try {
      await archiveInventoryItem(
        item.id,
        token
      );

      await loadItems(false);

      showToast(
        "Inventory item archived successfully."
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to archive inventory item.",
        "error"
      );
    }
  }

  const displayedItems =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        items.filter(
          (item) => {
            const matchesSearch =
              normalizedSearch ===
                "" ||
              item.name
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              String(
                item.supplierName ??
                  ""
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              String(
                item.supplierContact ??
                  ""
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              formatCategory(
                item.category
              )
                .toLowerCase()
                .includes(
                  normalizedSearch
                );

            const matchesCategory =
              categoryFilter ===
                "ALL" ||
              item.category ===
                categoryFilter;

            const stockStatus =
              getStockStatus(
                item
              ).label;

            const matchesStock =
              stockFilter ===
                "ALL" ||
              (
                stockFilter ===
                  "IN_STOCK" &&
                stockStatus ===
                  "In Stock"
              ) ||
              (
                stockFilter ===
                  "LOW_STOCK" &&
                stockStatus ===
                  "Low Stock"
              ) ||
              (
                stockFilter ===
                  "OUT_OF_STOCK" &&
                stockStatus ===
                  "Out of Stock"
              ) ||
              (
                stockFilter ===
                  "INACTIVE" &&
                stockStatus ===
                  "Inactive"
              );

            return (
              matchesSearch &&
              matchesCategory &&
              matchesStock
            );
          }
        );

      return [...filtered].sort(
        (
          first,
          second
        ) => {
          if (
            sortOption ===
            "NAME_ZA"
          ) {
            return second.name.localeCompare(
              first.name
            );
          }

          if (
            sortOption ===
            "LOWEST_STOCK"
          ) {
            return (
              first.quantity -
              second.quantity
            );
          }

          if (
            sortOption ===
            "HIGHEST_STOCK"
          ) {
            return (
              second.quantity -
              first.quantity
            );
          }

          if (
            sortOption ===
            "RECENTLY_UPDATED"
          ) {
            return (
              new Date(
                second.updatedAt
              ).getTime() -
              new Date(
                first.updatedAt
              ).getTime()
            );
          }

          return first.name.localeCompare(
            second.name
          );
        }
      );
    }, [
      items,
      searchTerm,
      categoryFilter,
      stockFilter,
      sortOption,
    ]);

  const summary =
    useMemo(() => {
      return {
        total:
          items.length,

        active:
          items.filter(
            (item) =>
              item.isActive
          ).length,

        lowStock:
          items.filter(
            (item) =>
              item.quantity > 0 &&
              item.quantity <=
                item.reorderLevel
          ).length,

        outOfStock:
          items.filter(
            (item) =>
              item.quantity <= 0
          ).length,

        totalUnits:
          items.reduce(
            (
              total,
              item
            ) =>
              total +
              item.quantity,
            0
          ),
      };
    }, [items]);

  function clearFilters() {
    setSearchTerm("");
    setCategoryFilter(
      "ALL"
    );
    setStockFilter(
      "ALL"
    );
    setSortOption(
      "NAME_AZ"
    );
  }

  const hasActiveFilters =
    searchTerm.trim() !==
      "" ||
    categoryFilter !==
      "ALL" ||
    stockFilter !==
      "ALL" ||
    sortOption !==
      "NAME_AZ";

  if (loading) {
    return (
      <section className="inventory-page">
        <div className="dashboard-loading">
          <FaSyncAlt className="dashboard-spin" />

          <span>
            Loading inventory...
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="inventory-page">
      <div className="page-header">
        <div>
          <h2>Inventory</h2>

          <p>
            Monitor supplies, stock
            movements, reorder levels,
            and supplier details.
          </p>
        </div>

        <div className="inventory-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              void loadItems(
                true
              )
            }
            disabled={
              refreshing
            }
          >
            <FaSyncAlt
              className={
                refreshing
                  ? "dashboard-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={
              openCreateModal
            }
          >
            <FaPlus />
            Add Item
          </button>
        </div>
      </div>

      <div className="inventory-summary-grid">
        <article className="inventory-summary-card">
          <span>
            <FaBoxes />
            Total Items
          </span>

          <strong>
            {summary.total}
          </strong>
        </article>

        <article className="inventory-summary-card">
          <span>
            <FaClipboardList />
            Active Items
          </span>

          <strong>
            {summary.active}
          </strong>
        </article>

        <article className="inventory-summary-card inventory-warning-card">
          <span>
            <FaExclamationTriangle />
            Low Stock
          </span>

          <strong>
            {summary.lowStock}
          </strong>
        </article>

        <article className="inventory-summary-card inventory-danger-card">
          <span>
            <FaExclamationTriangle />
            Out of Stock
          </span>

          <strong>
            {
              summary.outOfStock
            }
          </strong>
        </article>

        <article className="inventory-summary-card">
          <span>
            <FaBoxes />
            Total Units
          </span>

          <strong>
            {summary.totalUnits}
          </strong>
        </article>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-filter inventory-search">
          <label htmlFor="inventorySearch">
            Search Inventory
          </label>

          <div className="inventory-search-input">
            <FaSearch />

            <input
              id="inventorySearch"
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Item, supplier, contact, or category"
            />
          </div>
        </div>

        <div className="inventory-filter">
          <label htmlFor="inventoryCategory">
            Category
          </label>

          <select
            id="inventoryCategory"
            value={
              categoryFilter
            }
            onChange={(
              event
            ) =>
              setCategoryFilter(
                event.target
                  .value
              )
            }
          >
            <option value="ALL">
              All Categories
            </option>

            {INVENTORY_CATEGORIES.map(
              (category) => (
                <option
                  key={
                    category.value
                  }
                  value={
                    category.value
                  }
                >
                  {
                    category.label
                  }
                </option>
              )
            )}
          </select>
        </div>

        <div className="inventory-filter">
          <label htmlFor="inventoryStock">
            Stock Status
          </label>

          <select
            id="inventoryStock"
            value={
              stockFilter
            }
            onChange={(
              event
            ) =>
              setStockFilter(
                event.target
                  .value
              )
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="IN_STOCK">
              In Stock
            </option>

            <option value="LOW_STOCK">
              Low Stock
            </option>

            <option value="OUT_OF_STOCK">
              Out of Stock
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>

        <div className="inventory-filter">
          <label htmlFor="inventorySort">
            Sort By
          </label>

          <div className="sort-actions">
            <select
              id="inventorySort"
              value={
                sortOption
              }
              onChange={(
                event
              ) =>
                setSortOption(
                  event.target
                    .value as
                    typeof sortOption
                )
              }
            >
              <option value="NAME_AZ">
                Name A–Z
              </option>

              <option value="NAME_ZA">
                Name Z–A
              </option>

              <option value="LOWEST_STOCK">
                Lowest Stock
              </option>

              <option value="HIGHEST_STOCK">
                Highest Stock
              </option>

              <option value="RECENTLY_UPDATED">
                Recently Updated
              </option>
            </select>

            <button
              type="button"
              className="icon-button reset-filter-button"
              title="Reset Filters"
              aria-label="Reset Filters"
              onClick={
                clearFilters
              }
              disabled={
                !hasActiveFilters
              }
            >
              <FaUndoAlt />
            </button>
          </div>
        </div>
      </div>

    <div className="inventory-result-summary">
    <span>
        Showing{" "}
        <strong>
        {displayedItems.length}
        </strong>{" "}
        of{" "}
        <strong>
        {items.length}
        </strong>{" "}
        inventory items
    </span>
    </div>

      {displayedItems.length ===
      0 ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-icon">
            <FaBoxes />
          </div>

          <strong>
            {items.length === 0
              ? "No inventory items yet"
              : "No matching inventory items"}
          </strong>

          <p>
            {items.length === 0
              ? "Add detergent, fabric softener, packaging, and other supplies."
              : "Try changing or clearing the current inventory filters."}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filter-button"
              onClick={
                clearFilters
              }
            >
              <FaUndoAlt />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="customer-table inventory-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedItems.map(
                (item) => {
                  const status =
                    getStockStatus(
                      item
                    );

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <div className="inventory-item-cell">
                          <span className="inventory-item-icon">
                            <FaBoxes />
                          </span>

                          <div>
                            <strong>
                              {
                                item.name
                              }
                            </strong>

                            <small>
                              Unit:{" "}
                              {
                                item.unit
                              }
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {formatCategory(
                          item.category
                        )}
                      </td>

                      <td>
                        <strong className="inventory-supplier-name">
                          {item.supplierName ||
                            "Not provided"}
                        </strong>

                        <small className="table-subtext">
                          {item.supplierContact ||
                            "No contact"}
                        </small>
                      </td>

                      <td>
                        <strong className="inventory-stock-value">
                          {
                            item.quantity
                          }{" "}
                          {
                            item.unit
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          item.reorderLevel
                        }{" "}
                        {
                          item.unit
                        }
                      </td>

                      <td>
                        <span
                          className={`inventory-status-badge ${status.className}`}
                        >
                          {
                            status.label
                          }
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          item.updatedAt
                        )}
                      </td>

                      <td>
                        <div className="table-actions inventory-actions">
                          <button
                            type="button"
                            className="icon-button inventory-stock-in-button"
                            title="Stock In"
                            aria-label={`Stock in ${item.name}`}
                            onClick={() =>
                              openMovementModal(
                                item,
                                "STOCK_IN"
                              )
                            }
                          >
                            <FaArrowUp />
                          </button>

                          <button
                            type="button"
                            className="icon-button inventory-stock-out-button"
                            title="Stock Out"
                            aria-label={`Stock out ${item.name}`}
                            onClick={() =>
                              openMovementModal(
                                item,
                                "STOCK_OUT"
                              )
                            }
                          >
                            <FaArrowDown />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              className="icon-button inventory-adjust-button"
                              title="Adjust Stock"
                              aria-label={`Adjust ${item.name}`}
                              onClick={() =>
                                openMovementModal(
                                  item,
                                  "ADJUSTMENT"
                                )
                              }
                            >
                              <FaUndoAlt />
                            </button>
                          )}

                          <button
                            type="button"
                            className="icon-button view-button"
                            title="Movement History"
                            aria-label={`View ${item.name} movement history`}
                            onClick={() =>
                              void openHistoryModal(
                                item
                              )
                            }
                          >
                            <FaHistory />
                          </button>

                          <button
                            type="button"
                            className="icon-button edit-button"
                            title="Edit Item"
                            aria-label={`Edit ${item.name}`}
                            onClick={() =>
                              openEditModal(
                                item
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              className="icon-button delete-button"
                              title="Archive Item"
                              aria-label={`Archive ${item.name}`}
                              onClick={() =>
                                void handleArchive(
                                  item
                                )
                              }
                            >
                              <FaArchive />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {isItemModalOpen && (
        <Modal
          title={
            selectedItem
              ? "Edit Inventory Item"
              : "Add Inventory Item"
          }
          onClose={
            closeItemModal
          }
        >
          <form
            className="inventory-form"
            onSubmit={
              handleItemSubmit
            }
          >
            <div className="inventory-form-grid">
              <div className="form-group">
                <label htmlFor="inventoryName">
                  Item Name
                </label>

                <input
                  id="inventoryName"
                  value={
                    itemForm.name
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        name:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Example: Detergent Pack"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="inventoryCategoryField">
                  Category
                </label>

                <select
                  id="inventoryCategoryField"
                  value={
                    itemForm.category
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        category:
                          event
                            .target
                            .value as
                            InventoryCategory,
                      })
                    )
                  }
                >
                  {INVENTORY_CATEGORIES.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="inventoryUnit">
                  Unit
                </label>

                <input
                  id="inventoryUnit"
                  value={
                    itemForm.unit
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        unit:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="pack, bottle, piece"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="inventoryReorderLevel">
                  Reorder Level
                </label>

                <input
                  id="inventoryReorderLevel"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    itemForm.reorderLevel
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        reorderLevel:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                />
              </div>

              {!selectedItem && (
                <div className="form-group">
                  <label htmlFor="inventoryInitialQuantity">
                    Initial Quantity
                  </label>

                  <input
                    id="inventoryInitialQuantity"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      itemForm.quantity
                    }
                    onChange={(
                      event
                    ) =>
                      setItemForm(
                        (
                          current
                        ) => ({
                          ...current,
                          quantity:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="inventorySupplier">
                  Supplier Name
                </label>

                <input
                  id="inventorySupplier"
                  value={
                    itemForm.supplierName
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        supplierName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inventorySupplierContact">
                  Supplier Contact
                </label>

                <input
                  id="inventorySupplierContact"
                  value={
                    itemForm.supplierContact
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        supplierContact:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Phone, email, or account"
                />
              </div>

              <div className="form-group inventory-form-full-width">
                <label htmlFor="inventoryNotes">
                  Notes
                </label>

                <textarea
                  id="inventoryNotes"
                  value={
                    itemForm.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        notes:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Optional inventory notes"
                />
              </div>

              <label className="inventory-active-toggle inventory-form-full-width">
                <input
                  type="checkbox"
                  checked={
                    itemForm.isActive
                  }
                  onChange={(
                    event
                  ) =>
                    setItemForm(
                      (
                        current
                      ) => ({
                        ...current,
                        isActive:
                          event
                            .target
                            .checked,
                      })
                    )
                  }
                />

                <span>
                  Active inventory item
                </span>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={
                  closeItemModal
                }
                disabled={
                  itemSubmitting
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  itemSubmitting
                }
              >
                {itemSubmitting
                  ? "Saving..."
                  : selectedItem
                  ? "Update Item"
                  : "Create Item"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {movementItem && (
        <Modal
          title={
            movementMode ===
            "STOCK_IN"
              ? `Stock In — ${movementItem.name}`
              : movementMode ===
                "STOCK_OUT"
              ? `Stock Out — ${movementItem.name}`
              : `Adjust Stock — ${movementItem.name}`
          }
          onClose={
            closeMovementModal
          }
        >
          <form
            className="inventory-movement-form"
            onSubmit={
              handleMovementSubmit
            }
          >
            <div className="inventory-current-stock">
              <span>
                Current Stock
              </span>

              <strong>
                {
                  movementItem.quantity
                }{" "}
                {
                  movementItem.unit
                }
              </strong>
            </div>

            <div className="form-group">
              <label htmlFor="movementQuantity">
                {movementMode ===
                "ADJUSTMENT"
                  ? "New Total Quantity"
                  : "Quantity"}
              </label>

              <input
                id="movementQuantity"
                type="number"
                min="0"
                step="1"
                value={
                  movementQuantity
                }
                onChange={(
                  event
                ) =>
                  setMovementQuantity(
                    event.target
                      .value
                  )
                }
                required
              />
            </div>

            <div className="form-group inventory-form-full-width">
              <label htmlFor="movementReason">
                Reason / Remarks
              </label>

              <textarea
                id="movementReason"
                value={
                  movementReason
                }
                onChange={(
                  event
                ) =>
                  setMovementReason(
                    event.target
                      .value
                  )
                }
                placeholder="Example: New delivery, damaged pack, physical count correction"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={
                  closeMovementModal
                }
                disabled={
                  movementSubmitting
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  movementSubmitting
                }
              >
                {movementSubmitting
                  ? "Saving..."
                  : "Confirm"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {historyItem && (
        <Modal
          title={`Movement History — ${historyItem.name}`}
          onClose={() => {
            setHistoryItem(
              null
            );
            setMovements([]);
          }}
        >
          {historyLoading ? (
            <div className="dashboard-loading">
              <FaSyncAlt className="dashboard-spin" />

              <span>
                Loading movement history...
              </span>
            </div>
          ) : (
            <div className="inventory-history">
              <div className="inventory-history-summary">
                <div>
                  <span>
                    Current Stock
                  </span>

                  <strong>
                    {
                      historyItem.quantity
                    }{" "}
                    {
                      historyItem.unit
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Reorder Level
                  </span>

                  <strong>
                    {
                      historyItem.reorderLevel
                    }{" "}
                    {
                      historyItem.unit
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Movements
                  </span>

                  <strong>
                    {
                      movements.length
                    }
                  </strong>
                </div>
              </div>

              {movements.length ===
              0 ? (
                <div className="dashboard-empty-state">
                  <FaHistory />

                  <strong>
                    No movement history
                  </strong>

                  <p>
                    Stock movements for this
                    item will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="customer-table inventory-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Performed By</th>
                        <th>Reason</th>
                        <th>Order</th>
                      </tr>
                    </thead>

                    <tbody>
                      {movements.map(
                        (
                          movement
                        ) => (
                          <tr
                            key={
                              movement.id
                            }
                          >
                            <td>
                              {formatDateTime(
                                movement.createdAt
                              )}
                            </td>

                            <td>
                              <span className={`inventory-movement-badge movement-${movement.movementType.toLowerCase()}`}>
                                {movement.movementType.replaceAll(
                                  "_",
                                  " "
                                )}
                              </span>
                            </td>

                            <td>
                              {
                                movement.quantity
                              }
                            </td>

                            <td>
                              {
                                movement.previousQuantity
                              }
                            </td>

                            <td>
                              {
                                movement.newQuantity
                              }
                            </td>

                            <td>
                              {movement.performedBy ||
                                "System"}
                            </td>

                            <td>
                              {movement.reason ||
                                "—"}
                            </td>

                            <td>
                              {movement.order
                                ?.orderNumber ||
                                "—"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {toast && (
        <Toast
          message={
            toast.message
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </section>
  );
}

export default InventoryPage;