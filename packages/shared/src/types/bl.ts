import { PaymentMethod, PaymentStatus } from '../constants/enums';

export interface BLRecord {
  id: string;
  blNumber: string;
  clientName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  courierId: string;
  courierName?: string;
  comments?: string;
  deliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBLRequest {
  blNumber: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryDate: string;
  comments?: string;
  courierId?: string;
}

export interface UpdateBLRequest {
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  comments?: string;
}

export interface BLSummary {
  totalAmount: number;
  totalBLs: number;
  paidAmount: number;
  pendingAmount: number;
  byPaymentMethod: {
    CASH: number;
    CHEQUE: number;
    ACCOUNT: number;
  };
}
