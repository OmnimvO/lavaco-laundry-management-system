import type { Customer } from "./customer";

export type Order = {
  id: number;
  orderNumber: string;

  customerId: number | null;
  customer?: Customer | null;

  walkInCustomerName?: string | null;
  walkInCustomerPhone?: string | null;
  walkInCustomerAddress?: string | null;

  laundryWeight: number;
  loadCount: number;

  hasMixedWhiteColor: boolean;
  instructions?: string | null;

  serviceType: string;
  servicePricePerLoad: number;
  serviceSubtotal: number;

  rinseCycles: number;
  rinseFee: number;

  soapQuantity: number;
  soapPrice: number;

  softenerQuantity: number;
  softenerPrice: number;

  fulfillmentType: string;
  deliveryFee: number;

  receivedBy?: string | null;
  claimedBy?: string | null;

  totalPrice: number;
  paymentStatus: string;
  paidAt?: string | null;
  status: string;

  createdAt: string;
  updatedAt?: string;
};