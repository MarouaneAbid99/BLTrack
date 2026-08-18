# BLTrack deployment preparation

This repository is prepared for a Render API, an optional Vercel admin deployment, and an Expo EAS Android preview APK. Deployment does not run database migrations or the development seed.

All build and runtime environments use Node.js 22.13.1 (minimum supported version 22.13.0).

## Deployment order

1. Review and commit the complete Phase 1/2 working tree, then push it to GitHub.
2. Create the Render web service from `render.yaml` and configure its environment variables.
3. Verify `GET https://<render-service>/health`, login, and `GET /api/auth/me`.
4. Optionally deploy `apps/admin` to Vercel.
5. Configure the Expo `preview` environment with the final Render HTTPS URL.
6. Run the EAS preview build and install the resulting APK.
7. Complete physical Android acceptance before beginning OCR.

## Render API

The Blueprint uses:

- build: `npm ci --include=dev && npm run build:api`
- start: `npm run start:api`
- health check: `/health`
- runtime host: `0.0.0.0`
- runtime port: Render's `PORT` value

Required Render environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing MySQL/MariaDB connection URL. Configure as a Render secret. |
| `JWT_SECRET` | Production signing secret. The Blueprint can generate it. |
| `CORS_ORIGINS` | Comma-separated HTTPS browser origins, such as the final Vercel origin. |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Supplied by Render; do not hardcode it. |

The existing Prisma datasource remains `mysql`. Do not attach a PostgreSQL URL, run `prisma migrate`, run `prisma db push`, or run the seed. Production schema provisioning and data transfer require a separately approved database plan.

The production database must be a network-accessible MySQL/MariaDB service. Before deployment, confirm driver-compatible TLS URL options, create and verify a recoverable source backup, approve the additive schema/migration procedure, preserve existing IDs and business data, and define rollback. After migration, validate schema constraints, row counts, the original BL ID hash, authentication, and Casablanca report boundaries before accepting production traffic.

In production, CORS accepts requests with no browser `Origin` header so native mobile and server-to-server clients can connect. Browser origins are accepted only when listed exactly in `CORS_ORIGINS`. Authentication uses the `Authorization` header, not cross-origin cookies.

## Vercel admin

The admin is a Vite static app. Set the Vercel project root to `apps/admin`, then configure:

```text
VITE_API_URL=https://<render-service>
```

Build command and output are declared in `apps/admin/vercel.json`. Deploying the admin is optional for the mobile APK milestone.

## Expo EAS

The mobile application reads only this public build-time variable:

```text
EXPO_PUBLIC_API_URL=https://<render-service>
```

This URL is public by design. Never store `JWT_SECRET`, database credentials, signing credentials, API keys, or tokens in an `EXPO_PUBLIC_*` variable.

From `apps/mobile`, authenticate and link the project without placing credentials in source control:

```powershell
npx eas-cli login
npx eas-cli whoami
npx eas-cli init
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://<render-service> --visibility plaintext
npx eas-cli build --platform android --profile preview
```

The `preview` profile uses internal distribution and `android.buildType: apk`, so its output is directly installable and does not require a Google Play submission.

## Local environments

Copy the relevant `.env.example` to an ignored local environment file and supply values locally. Development seed credentials are required only when deliberately running the development seed or persistence checks; they are not production variables.

The development seed always refuses `NODE_ENV=production`. Database-backed tests and the persistence checker refuse production unless `BLTRACK_DEDICATED_TEST_DATABASE=true` is explicitly set for an isolated test database. Never set that override on a database containing business records.
