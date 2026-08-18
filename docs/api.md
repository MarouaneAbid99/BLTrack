# BLTrack V2 API

The local base URL is configured by the API environment (normally port `3001`). Production consumers must use the deployed HTTPS origin rather than a local or LAN address.

## Authentication and identity

`POST /api/auth/login` accepts username and password and returns a safe user object plus a JWT. Protected requests send `Authorization: Bearer <token>`.

`GET /api/auth/me` returns the currently authenticated, active user and is used by mobile session restoration.

Authentication middleware verifies the JWT and reloads the user from the database. Missing, deleted, or inactive users receive `401`. New BL, payment, and avoir writes derive identity from `req.auth`.

Client-supplied `createdBy`, `createdById`, `userId`, `courier`, `courierId`, or courier name fields are rejected where identity is server-owned. Couriers can access BLs owned through `createdById`; administrators can access broader records where the endpoint permits it.

## Endpoints

### Public

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | API health response |
| POST | `/api/auth/login` | Authenticate |

### Authentication

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/auth/me` | Authenticated active user |

### Clients

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/clients` | Admin or courier |
| GET | `/api/clients/:id` | Admin or courier |
| POST | `/api/clients` | Admin |
| PATCH | `/api/clients/:id` | Admin |

### BL

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/bls` | Admin: all; courier: own |
| GET | `/api/bls/summary` | Admin: all; courier: own |
| GET | `/api/bls/:id` | Admin: any; courier: own |
| POST | `/api/bls` | Authenticated; identity from request |
| PATCH | `/api/bls/:id` | Admin: any; courier: own |

`GET /api/bls` supports pagination, search, client/status filters, and BL date filters. Admin may filter reads by courier; courier identity is never taken from client input for ownership.

Example V2 creation body:

```json
{
  "blNumber": "BL-45821",
  "clientId": "client-id",
  "amount": "1250.00",
  "blDate": "2026-08-10T00:00:00.000Z",
  "comments": "Optional",
  "payment": {
    "amount": "1250.00",
    "status": "UNPAID"
  }
}
```

For account clients, the state is `EN_COMPTE` with no method or `paidAt`. New paid records require `CASH` or `CHEQUE`; the server supplies `paidAt`. Legacy BL payment fields remain temporarily accepted where required for V1 compatibility.

### Avoir

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/bls/:id/avoirs` | Admin: any; courier: own BL |
| POST | `/api/bls/:id/avoirs` | Admin: any; courier: own BL |
| PATCH | `/api/avoirs/:id` | Admin: any; courier: own BL |

An avoir body uses `brReference`, `avoirDate`, and a positive `amount`. BL/client/user ownership fields are server-owned.

### Payment

| Method | Path | Permission |
| --- | --- | --- |
| PUT | `/api/bls/:id/payment` | Admin: any; courier: own BL |

The request supplies positive `amount`, V2 `status`, and a method only for `PAID`. `paidAt`, migration state, BL identity, and user identity are server-owned. Payment registration never changes `blDate`.

### Reports

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/reports/bl?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Admin: all; courier: own |
| GET | `/api/reports/avoirs?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Admin: all; courier: own |

A BL appears when `BL.blDate` is in the selected period **or** `Payment.paidAt` is in the period. `BL.createdAt` is not report activity. BL totals use gross BL amount; avoir and net amounts are separate fields.

The avoir report selects by `Avoir.avoirDate`. Report date ranges are Casablanca calendar days with an exclusive UTC end boundary. Identity query parameters such as `userId`, `courierId`, and `createdById` are rejected.

Existing admin-only V1 report endpoints remain temporarily available:

- `GET /api/reports/collections`
- `GET /api/reports/client-financials`
- `GET /api/reports/courier-performance`

### Administration and dashboard

Existing client, courier, and dashboard endpoints remain for V1/admin compatibility. The daily dashboard endpoint is `GET /api/dashboard/daily-summary?date=YYYY-MM-DD`.

## Errors

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Common codes are `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), and `INTERNAL_SERVER_ERROR` (500).
