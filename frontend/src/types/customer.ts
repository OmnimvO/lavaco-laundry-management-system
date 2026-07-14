export interface Customer {
  id: number;
  name: string;

  phone: string | null;
  normalizedPhone?: string | null;

  address: string | null;
  normalizedName?: string | null;
  normalizedAddress?: string | null;

  customerSince?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastVisit?: string | null;

  isArchived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt?: string;
}