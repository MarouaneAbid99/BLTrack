import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';
import { BLRecord, Client, DailySummary } from '../types';

const getToday = (): string => new Date().toISOString().slice(0, 10);

type CreateBLPayload = {
  blNumber: string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryDate: string;
  comments?: string;
};

export const useClients = () =>
  useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get<Client[]>('/api/clients');
      return data;
    },
  });

export const useBLs = () =>
  useQuery<{ data: BLRecord[] }, Error>({
    queryKey: ['bls', getToday()],
    queryFn: async () => {
      const { data } = await api.get('/api/bls', { params: { dateFrom: getToday(), dateTo: getToday() } });
      return data;
    },
  });

export const useDailySummary = () =>
  useQuery<DailySummary, Error>({
    queryKey: ['dailySummary', getToday()],
    queryFn: async () => {
      const { data } = await api.get<DailySummary>('/api/dashboard/daily-summary', { params: { date: getToday() } });
      return data;
    },
  });

export const useCreateBL = () => {
  const queryClient = useQueryClient();

  return useMutation<BLRecord, Error, CreateBLPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post('/api/bls', payload);
      return data as BLRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bls', getToday()] });
      queryClient.invalidateQueries({ queryKey: ['dailySummary', getToday()] });
    },
  });
};
