const API_BASE_URL = 'http://127.0.0.1:3001';
const SESSION_KEY = 'BLTRACK_ADMIN_SESSION';

export type AdminUser = { id: string; username: string; fullName: string; role: 'ADMIN' | 'COURIER' };
export type Session = { token: string; user: AdminUser };
export type Client = { id: string; name: string; isAccountClient: boolean; isActive: boolean };
export type Courier = { id: string; username: string; fullName: string; isActive: boolean };
export type BL = { id: string; blNumber: string; amount: string; paymentMethod: 'CASH' | 'CHEQUE' | 'ACCOUNT'; paymentStatus: 'PAID' | 'PENDING'; deliveryDate: string; comments?: string | null; createdAt?: string; updatedAt?: string; client: Client; courier: Courier };
export type Summary = { date: string; totalBLs: number; totalAmount: string; paidAmount: string; pendingAmount: string; cashAmount: string; chequeAmount: string; accountAmount: string };
export type BLPage = { data: BL[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type CollectionPage = { data: BL[]; totalOutstanding: number; period: { totalBLs: number; totalAmount: number; paidAmount: number; pendingAmount: number; cashAmount: number; chequeAmount: number; accountAmount: number }; pendingClients: { client?: Pick<Client, 'id' | 'name' | 'isAccountClient'>; pendingBLs: number; pendingAmount: number }[]; pagination: BLPage['pagination'] };
export type Financial = { client: Client; totalBLs: number; totalAmount: number; paidAmount: number; pendingAmount: number };
export type Performance = { courier: Courier; totalBLs: number; totalAmount: number; cashAmount: number; chequeAmount: number; accountAmount: number; paidAmount: number; pendingAmount: number };

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export const getSession = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null; } catch { return null; }
};
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const login = async (username: string, password: string): Promise<Session> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const body = await response.json();
  if (!response.ok) throw new ApiError(response.status, body.error?.message ?? 'Connexion impossible.');
  if (body.user?.role !== 'ADMIN') throw new ApiError(403, 'Ce compte n’est pas autorisé à accéder à l’administration.');
  const session = body as Session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const api = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new ApiError(response.status, body.error?.message ?? 'La requête a échoué.');
  return body as T;
};
