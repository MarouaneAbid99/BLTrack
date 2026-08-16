# BLTrack API

Base URL: `http://localhost:3001`

## Authentication and roles

`POST /api/auth/login` accepts `{ "username": "admin", "password": "..." }` and returns a safe user object plus a JWT. Send the token as `Authorization: Bearer <token>` on protected endpoints. JWTs contain only `id`, `username`, and `role`.

`ADMIN` can manage clients, view couriers, access all BLs, update BL payment information, and view company summaries. `COURIER` can read active clients, create BLs assigned to themselves, view only their own BLs, and view only their own daily summary.

## Endpoints

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/clients` | Admin, Courier |
| GET | `/api/clients/:id` | Admin, Courier |
| POST | `/api/clients` | Admin |
| PATCH | `/api/clients/:id` | Admin |
| GET | `/api/bls` | Admin, Courier |
| GET | `/api/bls/:id` | Admin, Courier (own only) |
| POST | `/api/bls` | Admin, Courier |
| PATCH | `/api/bls/:id` | Admin, Courier (own comments only) |
| GET | `/api/couriers` | Admin |
| GET | `/api/couriers/:id` | Admin |
| GET | `/api/dashboard/daily-summary?date=YYYY-MM-DD` | Admin, Courier |

## Requests and responses

Create a client:

```json
{ "name": "Client X", "isAccountClient": true }
```

Create a BL:

```json
{
  "blNumber": "BL-45821",
  "clientId": "client-id",
  "amount": "1250.00",
  "paymentMethod": "CASH",
  "paymentStatus": "PAID",
  "deliveryDate": "2026-08-09T14:00:00.000Z",
  "comments": "Received"
}
```

For an admin-created BL, add a valid `courierId`. Courier-supplied `courierId` is ignored. `CASH` and `CHEQUE` require `PAID`; `ACCOUNT` requires `PENDING`.

`GET /api/bls` supports `page`, `limit`, `search`, `clientId`, `courierId` (admin only), `paymentMethod`, `paymentStatus`, `dateFrom`, and `dateTo`. It returns `{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`.

Daily summaries return `totalBLs` and exact monetary fields (`totalAmount`, `paidAmount`, `pendingAmount`, `cashAmount`, `chequeAmount`, `accountAmount`) as decimal strings to avoid floating-point loss.

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Codes are `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), and `INTERNAL_SERVER_ERROR` (500).
