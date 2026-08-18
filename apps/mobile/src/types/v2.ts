export type PaymentStatus = 'PAID' | 'UNPAID' | 'EN_COMPTE';
export type PaymentMethod = 'CASH' | 'CHEQUE';

export type Client = { id: string; name: string; isAccountClient: boolean; isActive: boolean };
export type UserSummary = { id: string; username: string; fullName: string };

export type AvoirRecord = {
  id: string; brReference: string; avoirDate: string; amount: string;
  clientId: string; createdById: string; createdBy?: UserSummary;
};

export type PaymentRecord = {
  id: string; amount: string; status: PaymentStatus; method: PaymentMethod | null;
  paidAt: string | null; createdById: string; createdBy?: UserSummary;
};

export type BLRecord = {
  id: string; blNumber: string; amount: string; blDate: string; comments?: string | null;
  client: Client; createdBy: UserSummary; createdById: string;
  payment: PaymentRecord | null; avoirs: AvoirRecord[];
  totalAvoirAmount: string; netAmount: string; paidAmount: string | null; paymentDifferenceAmount: string | null;
  deliveryDate: string; paymentMethod?: string | null; paymentStatus?: string; courier: UserSummary;
};

export type BLSummary = { totalBLs: number; totalAmount: string; paid: number; unpaid: number; enCompte: number };
export type BLScanDraft = { blNumber?: string; clientName?: string; blDate?: string; amount?: string };
export type AvoirScanDraft = { brReference?: string; avoirDate?: string; amount?: string };

export type BLReportResponse = {
  period: { dateFrom: string; dateTo: string }; generatedBy: UserSummary;
  data: Array<{
    id: string; blNumber: string; client: Pick<Client, 'id' | 'name'>; blDate: string;
    blAmount: string; avoirTotal: string; netAmount: string; paidAmount: string | null; paymentDifferenceAmount: string | null;
    paymentStatus: PaymentStatus | null; paymentMethod: PaymentMethod | null;
    paidAt: string | null; user: UserSummary;
  }>;
  totalBLAmount: string;
};

export type AvoirReportResponse = {
  period: { dateFrom: string; dateTo: string }; generatedBy: UserSummary;
  data: Array<{
    id: string; brReference: string; bl: { id: string; blNumber: string };
    client: Pick<Client, 'id' | 'name'>; avoirDate: string; avoirAmount: string; user: UserSummary;
  }>;
  totalAvoirAmount: string;
};
