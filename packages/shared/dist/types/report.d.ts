import { PaymentMethod, PaymentStatus, UserRole } from '../constants/enums';
export interface ReportPeriod {
    dateFrom: string;
    dateTo: string;
}
export interface ReportUser {
    id: string;
    username: string;
    fullName: string;
    role?: UserRole;
}
export interface BLReportRow {
    id: string;
    blNumber: string;
    client: {
        id: string;
        name: string;
    };
    blDate: string;
    blAmount: string;
    avoirTotal: string;
    netAmount: string;
    paidAmount: string | null;
    paymentDifferenceAmount: string | null;
    paymentStatus: PaymentStatus | null;
    paymentMethod: PaymentMethod | null;
    paidAt: string | null;
    user: ReportUser;
}
export interface BLReportResponse {
    period: ReportPeriod;
    generatedBy: ReportUser;
    data: BLReportRow[];
    totalBLAmount: string;
}
export interface AvoirReportRow {
    id: string;
    brReference: string;
    bl: {
        id: string;
        blNumber: string;
    };
    client: {
        id: string;
        name: string;
    };
    avoirDate: string;
    avoirAmount: string;
    user: ReportUser;
}
export interface AvoirReportResponse {
    period: ReportPeriod;
    generatedBy: ReportUser;
    data: AvoirReportRow[];
    totalAvoirAmount: string;
}
