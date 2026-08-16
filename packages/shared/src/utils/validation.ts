import { PaymentMethod, PaymentStatus } from '../constants/enums';
import { LoginRequest } from '../types/auth';
import { CreateBLRequest } from '../types/bl';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateLoginRequest(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { _global: 'Invalid request payload' } };
  }

  const username = data.username?.trim();
  const password = data.password;

  if (!username) {
    errors.username = 'Username is required';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateCreateBLRequest(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: { _global: 'Invalid request payload' } };
  }

  const blNumber = data.blNumber?.trim();
  const clientId = data.clientId?.trim();
  const amount = Number(data.amount);
  const paymentMethod = data.paymentMethod;
  const paymentStatus = data.paymentStatus;

  if (!blNumber) {
    errors.blNumber = 'BL number is required';
  }

  if (!clientId) {
    errors.clientId = 'Client ID is required';
  }

  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number';
  }

  if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
    errors.paymentMethod = `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`;
  }

  if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
    errors.paymentStatus = `Payment status must be one of: ${Object.values(PaymentStatus).join(', ')}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
