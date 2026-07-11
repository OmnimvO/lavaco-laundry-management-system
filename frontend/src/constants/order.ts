export const SERVICE_TYPES = [
  { value: "COMPLETE_SERVICE", label: "Complete Service (₱160)" },
  { value: "WASH_AND_DRY", label: "Wash & Dry (₱140)" },
  { value: "WASH_ONLY", label: "Wash Only (₱60)" },
  { value: "DRY_ONLY", label: "Dry Only (₱70)" },
  { value: "DRY_AND_FOLD", label: "Dry & Fold (₱100)" },
  { value: "FOLD_ONLY", label: "Fold Only (₱20)" },
];

export const FULFILLMENT_TYPES = [
  { value: "NONE", label: "No Pickup / Delivery (₱0)" },
  { value: "PICKUP_ONLY", label: "Pickup Only (₱25)" },
  { value: "DELIVERY_ONLY", label: "Delivery Only (₱25)" },
  { value: "PICKUP_AND_DELIVERY", label: "Pickup & Delivery (₱50)" },
];

export const RINSE_CYCLES = [
  { value: 2, label: "2 Rinses (Included)" },
  { value: 3, label: "3 Rinses (+₱20)" },
  { value: 4, label: "4 Rinses (+₱20)" },
  { value: 5, label: "5 Rinses (+₱20)" },
];

export const YES_NO_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

export const PAYMENT_STATUSES = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
];

export const ORDER_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "WASHING", label: "Washing" },
  { value: "DRYING", label: "Drying" },
  { value: "FOLDING", label: "Folding" },
  { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];