export enum UserRole {
  ADMIN = 'ADMIN',
  COURIER = 'COURIER'
}

export enum PaymentMethod {
  CASH = 'CASH', // Espèces
  CHEQUE = 'CHEQUE' // Chèque
}

export enum PaymentStatus {
  PAID = 'PAID', // Payé
  UNPAID = 'UNPAID', // Non payé
  EN_COMPTE = 'EN_COMPTE' // Client en compte; this is not a payment method
}

export enum LegacyPaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  ACCOUNT = 'ACCOUNT'
}

export enum LegacyPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}
