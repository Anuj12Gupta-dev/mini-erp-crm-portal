export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gst: string | null;
  type: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  customerId: string;
  note: string;
  followUpAt: string | null;
  createdById: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export type StockMovementType = 'IN' | 'OUT';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitPrice: string;
  currentStock: number;
  minStockQty: number;
  location: string | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: StockMovementType;
  reason: string;
  createdById: string;
  createdAt: string;
  product?: { id: string; name: string; sku: string };
  createdBy?: { id: string; name: string };
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalAmount: string;
  createdById: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; mobile: string; businessName: string | null };
  createdBy?: { id: string; name: string };
  items: ChallanItem[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
