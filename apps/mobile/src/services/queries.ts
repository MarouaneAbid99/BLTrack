import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';
import {
  AvoirRecord, AvoirReportResponse, BLRecord, BLReportResponse, BLSummary,
  Client, PaymentMethod, PaymentStatus,
} from '../types';

type CreateBLPayload = {
  blNumber: string; clientId: string; amount: number; blDate: string;
  comments?: string; payment?: { amount: number; status: PaymentStatus };
};
type AvoirPayload = { brReference: string; avoirDate: string; amount: number };
type UpdateBLPayload = { id: string; blNumber: string; clientId: string; amount: number; blDate: string; comments?: string };

const invalidateBL = (client: ReturnType<typeof useQueryClient>, id?: string) => {
  client.invalidateQueries({ queryKey: ['bls'] });
  client.invalidateQueries({ queryKey: ['blSummary'] });
  if (id) client.invalidateQueries({ queryKey: ['bl', id] });
};

export const useClients = () => useQuery<Client[], Error>({
  queryKey: ['clients'],
  queryFn: async () => (await api.get<Client[]>('/api/clients')).data,
});

export const useBLs = (search = '', status: 'ALL' | PaymentStatus = 'ALL') => useQuery<{ data: BLRecord[] }, Error>({
  queryKey: ['bls', search, status],
  queryFn: async () => (await api.get('/api/bls', { params: {
    limit: 100, ...(search.trim() ? { search: search.trim() } : {}), ...(status !== 'ALL' ? { status } : {}),
  } })).data,
});

export const useBLSummary = () => useQuery<BLSummary, Error>({
  queryKey: ['blSummary'], queryFn: async () => (await api.get('/api/bls/summary')).data,
});

export const useBL = (id: string) => useQuery<BLRecord, Error>({
  queryKey: ['bl', id], queryFn: async () => (await api.get(`/api/bls/${id}`)).data,
});

export const useCreateBL = () => {
  const client = useQueryClient();
  return useMutation<BLRecord, Error, CreateBLPayload>({
    mutationFn: async (payload) => (await api.post('/api/bls', payload)).data,
    onSuccess: (bl) => invalidateBL(client, bl.id),
  });
};

export const useUpdateBL = () => {
  const client = useQueryClient();
  return useMutation<BLRecord, Error, UpdateBLPayload>({
    mutationFn: async ({ id, ...payload }) => (await api.patch(`/api/bls/${id}`, payload)).data,
    onSuccess: (bl) => invalidateBL(client, bl.id),
  });
};

export const useCreateAvoir = () => {
  const client = useQueryClient();
  return useMutation<AvoirRecord, Error, { blId: string; payload: AvoirPayload }>({
    mutationFn: async ({ blId, payload }) => (await api.post(`/api/bls/${blId}/avoirs`, payload)).data,
    onSuccess: (_, variables) => invalidateBL(client, variables.blId),
  });
};

export const useUpdateAvoir = () => {
  const client = useQueryClient();
  return useMutation<AvoirRecord, Error, { blId: string; avoirId: string; payload: AvoirPayload }>({
    mutationFn: async ({ avoirId, payload }) => (await api.patch(`/api/avoirs/${avoirId}`, payload)).data,
    onSuccess: (_, variables) => invalidateBL(client, variables.blId),
  });
};

export const useRegisterPayment = () => {
  const client = useQueryClient();
  return useMutation<BLRecord['payment'], Error, { blId: string; amount: number; status: 'PAID'; method: PaymentMethod }>({
    mutationFn: async ({ blId, ...payload }) => (await api.put(`/api/bls/${blId}/payment`, payload)).data,
    onSuccess: (_, variables) => invalidateBL(client, variables.blId),
  });
};

export const useBLReport = (dateFrom: string, dateTo: string) => useQuery<BLReportResponse, Error>({
  queryKey: ['report', 'bl', dateFrom, dateTo],
  queryFn: async () => (await api.get('/api/reports/bl', { params: { dateFrom, dateTo } })).data,
  enabled: Boolean(dateFrom && dateTo),
});

export const useAvoirReport = (dateFrom: string, dateTo: string) => useQuery<AvoirReportResponse, Error>({
  queryKey: ['report', 'avoirs', dateFrom, dateTo],
  queryFn: async () => (await api.get('/api/reports/avoirs', { params: { dateFrom, dateTo } })).data,
  enabled: Boolean(dateFrom && dateTo),
});
