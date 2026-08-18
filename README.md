# BLTrack V2

BLTrack V2 is a mobile-first delivery, credit-note, and payment tracking system for couriers and administrators. The courier application records delivery notes (BL), follows payment state, attaches avoirs, and produces activity reports while the API owns identity, timestamps, and financial rules.

OCR is not part of the production V2 release. BL and avoir data are entered manually until a later OCR phase is approved.

## Product capabilities

- **Authentication:** JWT login, active-user validation, and mobile session restoration through `GET /api/auth/me`.
- **Clients:** active normal or account clients determine whether a new BL starts `UNPAID` or `EN_COMPTE`.
- **BL:** manual creation, editing, list/search/filter, details, immutable IDs, and a business `blDate` distinct from record creation time.
- **Payments:** `PAID`, `UNPAID`, and `EN_COMPTE`; paid records require `CASH` or `CHEQUE` and a server-owned payment timestamp.
- **Avoirs:** positive stored amounts with BR reference and date; the UI displays them negatively.
- **Accounting:** net amount is BL gross amount minus total avoir amount. Historical paid amounts and payment dates are preserved when later avoirs change the current net.
- **Reports:** BL activity by BL date or payment date, and avoir activity by avoir date, using Africa/Casablanca calendar boundaries.
- **Ownership:** courier identity comes from the authenticated request. Couriers see their own records; administrators retain broader authorized access.

## Architecture

```text
apps/mobile      Expo / React Native courier application
apps/admin       React / Vite administration application
apps/api         Express / TypeScript API
packages/shared  Shared V2 TypeScript contracts and validation
prisma           MySQL/MariaDB schema and additive migrations
docs             API, database, and deployment documentation
```

The API uses Prisma with the MariaDB driver adapter against MySQL or MariaDB. V1 BL payment columns remain temporarily available for compatibility while V2 uses dedicated `Payment` and `Avoir` records.

## Development setup

Requirements:

- Node.js **22.13.1** (minimum `22.13.0`)
- npm
- MySQL or MariaDB

Install dependencies from the repository root:

```powershell
npm ci
```

Create local ignored environment files from:

- `apps/api/.env.example`
- `apps/mobile/.env.example`
- `apps/admin/.env.example`

Required API values are `DATABASE_URL` and `JWT_SECRET`. The mobile application requires `EXPO_PUBLIC_API_URL`; the admin requires `VITE_API_URL`. Never place database credentials, JWT secrets, signing keys, or private tokens in `EXPO_PUBLIC_*` variables.

Common commands:

```powershell
npm run build:shared
npm run build:api
npm run build:admin
npm run dev --workspace=@bltrack/api
npm run start --workspace=mobile
```

Development seed and database-backed verification commands are manual operations. They must target an approved local/test database and refuse normal production execution.

## Production deployment overview

- `render.yaml` prepares the API for Render using Node 22.13.1, Render's `PORT`, host `0.0.0.0`, and `/health`.
- `apps/admin/vercel.json` prepares the optional Vite admin deployment.
- `apps/mobile/eas.json` defines an internal Android preview APK profile.
- Production configuration is supplied through platform secrets; no production credentials belong in Git.

Deployment does not run migrations or seed automatically. Production MySQL/MariaDB provisioning, backup, schema migration, preserved-data transfer, and post-migration validation require a separately approved plan. See [deployment documentation](docs/deployment.md).
