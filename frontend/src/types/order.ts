import type { Customer } from "./customer";

export interface Order {
  id: number;
  orderNumber: string;

  customerId: number | null;
  walkInCustomerName: string | null;
  walkInCustomerPhone: string | null;
  walkInCustomerAddress: string | null;

  basketCount: number;
  serviceType: string;
  washType: string | null;
  dryExtend: boolean;

  serviceFee: number;
  soap: string;
  soapPrice: number;
  softener: string;
  softenerPrice: number;

  fulfillmentType: string;
  deliveryFee: number;

  hasMixedWhiteColor: boolean;

  receivedBy: string | null;
  claimedBy: string | null;

  instructions: string | null;

  totalPrice: number;
  paymentStatus: string;
  status: string;

  createdAt: string;
  customer?: Customer | null;
}