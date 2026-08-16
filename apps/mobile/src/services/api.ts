import Constants from 'expo-constants';
import axios from 'axios';
import { getToken, deleteToken } from './auth';

const defaultApiBaseUrl = 'http://127.0.0.1:3001';
const isAndroidDevice = Constants.platform?.android != null && Constants.isDevice;
export const apiBaseUrl = isAndroidDevice
  ? defaultApiBaseUrl
  : Constants.expoConfig?.extra?.apiBaseUrl ?? defaultApiBaseUrl;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await deleteToken();
    }
    return Promise.reject(error);
  }
);

export default api;
