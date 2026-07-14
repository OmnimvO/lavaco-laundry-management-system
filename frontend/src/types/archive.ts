export type ArchiveEntityType =
  | "CUSTOMER"
  | "EMPLOYEE"
  | "ORDER"
  | "INVENTORY"
  | "USER";

export type ArchiveSummary = {
  customers: number;
  employees: number;
  orders: number;
  inventory: number;
  users: number;
  total: number;
};

export type ArchivedCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;

  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  _count?: {
    orders: number;
  };
};

export type ArchivedEmployee = {
  id: number;
  firstName: string;
  lastName: string;

  phone?: string | null;
  address?: string | null;

  position: string;
  status: string;

  dateHired: string;
  notes?: string | null;

  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    isArchived: boolean;
  } | null;
};

export type ArchivedOrder = {
  id: number;
  orderNumber: string;

  customerId?: number | null;
  walkInCustomerName?: string | null;
  walkInCustomerPhone?: string | null;

  laundryWeight: number;
  loadCount: number;

  serviceType: string;
  paymentStatus: string;
  status: string;

  totalPrice: number;

  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  customer?: {
    id: number;
    name: string;
    phone?: string | null;
  } | null;
};

export type ArchivedInventoryItem = {
  id: number;
  name: string;
  category: string;
  unit: string;

  quantity: number;
  reorderLevel: number;

  supplierName?: string | null;
  supplierContact?: string | null;

  isActive: boolean;
  isArchived: boolean;

  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  _count?: {
    movements: number;
  };
};

export type ArchivedUser = {
  id: number;
  name: string;
  email: string;

  role: string;
  status: string;

  employeeId?: number | null;

  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;

  createdAt: string;
  updatedAt: string;

  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
    isArchived: boolean;
  } | null;
};

export type ArchivedRecord =
  | ArchivedCustomer
  | ArchivedEmployee
  | ArchivedOrder
  | ArchivedInventoryItem
  | ArchivedUser;

export type ArchivedRecordsResponse = {
  entityType: ArchiveEntityType;
  count: number;
  records: ArchivedRecord[];
};

export type RestoreArchiveResponse = {
  message: string;
  entityType: ArchiveEntityType;
  record: ArchivedRecord;
  revenueEligible?: boolean | null;
};