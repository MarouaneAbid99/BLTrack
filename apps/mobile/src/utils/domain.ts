import { BLRecord, PaymentStatus } from '../types';

export type BLFilter = 'ALL' | PaymentStatus;

export const netAmount = (gross: string | number, avoir: string | number) =>
  Math.max(0, Number(gross || 0) - Number(avoir || 0));

export const matchesBL = (bl: BLRecord, search: string, filter: BLFilter): boolean => {
  if (filter !== 'ALL' && bl.payment?.status !== filter) return false;
  const term = search.trim().toLocaleLowerCase('fr');
  if (!term) return true;
  return bl.blNumber.toLocaleLowerCase('fr').includes(term)
    || bl.client.name.toLocaleLowerCase('fr').includes(term)
    || bl.avoirs.some((avoir) => avoir.brReference.toLocaleLowerCase('fr').includes(term));
};

export const paymentLabel = (status?: PaymentStatus | null) =>
  status === 'PAID' ? 'Payé' : status === 'EN_COMPTE' ? 'En compte' : 'Non payé';

export const clientPaymentStatus = (isAccountClient: boolean): PaymentStatus =>
  isAccountClient ? 'EN_COMPTE' : 'UNPAID';
