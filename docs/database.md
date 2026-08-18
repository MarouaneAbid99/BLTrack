# BLTrack V2 database design

BLTrack V2 uses Prisma with a MySQL/MariaDB datasource and the Prisma MariaDB driver adapter. The Phase 1 migration is additive: existing BL IDs and legacy payment columns are preserved while V2 introduces dedicated payments, avoirs, business dates, and server-owned creation identity.

## Models

### User

Users are administrators or couriers and have an `isActive` flag. Authentication rejects inactive or missing users. Relations identify BL, payment, and avoir creation.

### Client

Clients may be normal or account clients. Account clients use the `EN_COMPTE` payment state.

### BL

Important fields include:

- immutable `id`
- unique `blNumber`
- positive gross `amount` using `Decimal(10,2)`
- `blDate`, the business date used by V2 reporting
- `createdById`, derived from authenticated request identity
- client and courier compatibility relations
- legacy `deliveryDate`, `paymentMethod`, and `paymentStatus` retained temporarily for V1 reads

`createdAt` records persistence time and must not substitute for `blDate` in reports. Payment registration does not modify `blDate`.

### Payment

Each BL has at most one V2 payment record. A payment stores amount, status, optional method, optional `paidAt`, migration marker, and `createdById`.

- `PAID` requires `CASH` or `CHEQUE` and a server-owned `paidAt` for new payments.
- `UNPAID` has no method and no `paidAt`.
- `EN_COMPTE` has no method and no `paidAt`.
- Client input cannot own `createdById`, `paidAt`, or legacy migration state.
- Legacy paid records were migrated without inventing `paidAt`; `isLegacyMigrated` distinguishes that safe historical exception.

Historical paid amount and `paidAt` are preserved when a later avoir changes the BL's current net. The difference between paid and current net is reported explicitly.

### Avoir

An avoir belongs to a BL and client and stores:

- BR reference
- `avoirDate`
- positive `Decimal(10,2)` amount
- authenticated `createdById`

The database stores avoir values positively. UI and report presentation may prefix them with a minus sign.

## Accounting rules

```text
total avoir = sum(positive Avoir.amount)
net amount  = BL.amount - total avoir
```

Avoir totals cannot exceed the BL amount. Gross BL amount, avoir total, net, historical paid amount, and payment/net difference remain distinct values.

## Ownership

New BL, Payment, and Avoir records use the authenticated user from `req.auth`. Courier-scoped reads and writes filter by the authorized BL `createdById`; supplied user/courier identity fields are rejected. Administrators retain broader access where explicitly authorized.

## Reporting dates

- BL report activity is `BL.blDate` in range **or** `Payment.paidAt` in range.
- Avoir report activity is `Avoir.avoirDate` in range.
- `BL.createdAt` is not a substitute for the BL business date.
- Calendar boundaries use the IANA `Africa/Casablanca` timezone and an exclusive end instant so DST/Ramadan offset changes are handled correctly.

## Migration safety

The Phase 1 migration:

- does not replace BL IDs
- backfills `blDate` from the existing delivery business date, not `createdAt`
- backfills `createdById` from the existing courier relation
- converts legacy `ACCOUNT` to `EN_COMPTE`
- converts normal pending BLs to `UNPAID`
- creates migrated paid records without fabricating historical payment dates
- keeps legacy columns for temporary compatibility

No deployment command automatically runs migrations, resets, schema pushes, or seed.

## Development seed and database tests

The manual development seed creates idempotent fictional development records. The designated courier password comes from `DEV_COURIER_A_PASSWORD`; other development seed credentials are derived from the local `JWT_SECRET`. No plaintext production credential belongs in source control.

The seed refuses `NODE_ENV=production`. Database-backed tests and the persistence checker also refuse production unless `BLTRACK_DEDICATED_TEST_DATABASE=true` explicitly identifies an isolated test database. That override must never point at business data.

## Production database plan

Production remains MySQL/MariaDB; it is not converted to PostgreSQL. Before deployment:

1. Select a network-accessible MySQL/MariaDB service supported by the API host.
2. Confirm its TLS requirements and use MariaDB-connector-compatible URL query parameters such as required SSL options.
3. Store the complete `DATABASE_URL` as a platform secret.
4. Create a recoverable backup of the source database.
5. Approve a schema-provisioning and additive migration procedure separately.
6. Preserve existing BL IDs and business records during any transfer.
7. Do not seed production or invent historical `paidAt` values.
8. Validate schema constraints, row counts, BL ID hash, authentication, and reports after migration.
9. Retain a tested rollback point until acceptance is complete.
