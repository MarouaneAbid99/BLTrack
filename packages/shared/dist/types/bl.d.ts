import { LegacyPaymentMethod, LegacyPaymentStatus, PaymentMethod, PaymentStatus } from '../constants/enums';
export interface PaymentRecord {
    id: string;
    blId: string;
    amount: number;
    status: PaymentStatus;
    method: PaymentMethod | null;
    paidAt: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}
export interface AvoirRecord {
    id: string;
    brReference: string;
    blId: string;
    clientId: string;
    avoirDate: string;
    amount: number;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}
export interface BLRecord {
    id: string;
    blNumber: string;
    clientName: string;
    amount: number;
    blDate: string;
    createdById: string;
    createdByName?: string;
    payment: PaymentRecord | null;
    avoirs: AvoirRecord[];
    totalAvoirAmount: number;
    netAmount: number;
    paidAmount: number | null;
    paymentDifferenceAmount: number | null;
    comments?: string;
    createdAt: string;
    updatedAt: string;
    paymentMethod: LegacyPaymentMethod | null;
    paymentStatus: LegacyPaymentStatus;
    courierId: string;
    courierName?: string;
    deliveryDate: string;
}
export interface CreatePaymentRequest {
    amount: number;
    status: PaymentStatus;
    method?: PaymentMethod | null;
}
export interface CreateAvoirRequest {
    brReference: string;
    avoirDate: string;
    amount: number;
}
export interface CreateBLRequest {
    blNumber: string;
    clientId: string;
    amount: number;
    blDate: string;
    comments?: string;
    payment?: CreatePaymentRequest;
    deliveryDate?: string;
    paymentMethod?: LegacyPaymentMethod;
    paymentStatus?: LegacyPaymentStatus;
}
export interface UpdateBLRequest {
    blNumber?: string;
    clientId?: string;
    amount?: number;
    blDate?: string;
    comments?: string;
}
export interface BLSummary {
    totalAmount: number;
    totalBLs: number;
    paidAmount: number;
    unpaidAmount: number;
    enCompteAmount: number;
    byPaymentMethod: {
        CASH: number;
        CHEQUE: number;
    };
}
