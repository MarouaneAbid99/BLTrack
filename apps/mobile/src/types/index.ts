export type Client = {
  id: string;
  name: string;
  isAccountClient: boolean;
  isActive: boolean;
};

export type BLRecord = {
  id: string;
  blNumber: string;
  amount: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryDate: string;
  comments?: string | null;
  client: Client;
  courier: {
    id: string;
    username: string;
    fullName: string;
  };
};

export type DailySummary = {
  date: string;
  totalBLs: number;
  totalAmount: string;
  paidAmount: string;
  pendingAmount: string;
  cashAmount: string;
  chequeAmount: string;
  accountAmount: string;
};
