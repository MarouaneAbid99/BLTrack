export enum UserRole {
  ADMIN = 'ADMIN',
  COURIER = 'COURIER'
}

export enum PaymentMethod {
  CASH = 'CASH', // Espèces
  CHEQUE = 'CHEQUE', // Chèque
  ACCOUNT = 'ACCOUNT' // En compte (Client account, settled periodically)
}

export enum PaymentStatus {
  PENDING = 'PENDING', // En attente
  PAID = 'PAID' // Payé
}
