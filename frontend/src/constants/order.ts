export const SERVICE_TYPES = [
  { value: "COMPLETE_SERVICE", label: "Complete Service (Wash, Dry & Fold)" },
  { value: "WASH_AND_DRY", label: "Wash & Dry" },
  { value: "WASH_ONLY", label: "Wash Only" },
  { value: "DRY_ONLY", label: "Dry Only" },
  { value: "DRY_AND_FOLD", label: "Dry & Fold" },
  { value: "FOLD_ONLY", label: "Fold Only" },
  { value: "SPIN_ONLY", label: "Spin Only" },
];

export const WASH_TYPES = [
  { value: "REGULAR", label: "Regular Wash" },
  { value: "SUPER", label: "SuperWash" },
];

export const FULFILLMENT_TYPES = [
  { value: "PICKUP", label: "Pickup" },
  { value: "DELIVERY", label: "Delivery" },
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

export const SOAP_TYPES = [
  { value: "NONE", label: "No soap" },
  { value: "BREEZE", label: "Breeze" },
  { value: "ARIEL", label: "Ariel" },
];

export const SOFTENER_TYPES = [
  { value: "NONE", label: "No softener" },
  { value: "SURF", label: "Surf" },
  { value: "DOWNY", label: "Downy" },
];