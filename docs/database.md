# BLTrack Database Design

## Overview
BLTrack utilizes MySQL for relational data storage, with Prisma as the ORM to manage interactions.

## Entity Model

### User
Represents system actors (Admin or Courier).
- Role-based access control.

### Client
Represents the recipient of the BL.
- Can be marked as "en compte" (Client account).

### BL (Bon de Livraison)
The central entity for delivery tracking.
- Contains all required delivery information, including embedded payment details (status/method/amount).

## Relationships
- **Client 1 : N BL** (A client can receive multiple BLs).
- **User (Courier) 1 : N BL** (A courier can deliver multiple BLs).

## Business Rules
- **Money Representation:** Uses `Decimal` (10, 2) in MySQL to ensure precision for financial calculations.
- **Payment Simplification (V1):** Payment details (method, status, amount) are embedded within the `BL` record to maintain a simple, single-source-of-truth record for every delivery. This avoids the complexity of separate `Payment` entities for V1.
- **Unique Constraints:** `blNumber` is unique per delivery.
- **Data Integrity:** Relationships are strictly enforced (e.g., a BL *must* have a client and a courier).

## Indexes
Indexes are placed on the following fields for operational efficiency:
- `blNumber`
- `clientId`
- `courierId`
- `deliveryDate`
- `paymentStatus`
- `paymentMethod`

## What is NOT included in V1
- Detailed Accounting/General Ledger integration.
- Partial payment tracking (a BL is either fully paid or pending).
- Historic audit log for BL modifications (only basic `createdAt`/`updatedAt`).

## Development Seed
`npm run seed --workspace=@bltrack/api` creates idempotent, fake-only development data: one admin, two couriers, three clients, and three BLs covering cash, cheque, and account payment flows. Seed passwords are derived and hashed at runtime from the local `JWT_SECRET`; no plaintext credentials are stored in the repository.
