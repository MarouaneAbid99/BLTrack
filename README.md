# BLTrack

BLTrack is a simple internal delivery and payment tracking system designed to streamline and digitize a company's delivery workflow.

## Project Description

Couriers currently record delivery details and payment information manually in paper notebooks. BLTrack replaces this manual process with an optimized digital workflow, giving admins real-time visibility over completed deliveries and collected payments.

For each delivered BL (Bon de Livraison), the courier records:
- **BL Number**
- **Client**
- **Amount**
- **Payment Status**
- **Payment Method** (Cash / Espèces, Cheque, or Client Account / En compte)

## Target Architecture

The project is structured as a monorepo containing:

```
bltrack/
├── apps/
│   ├── mobile/       # Courier mobile application (React Native / Expo / TS)
│   ├── admin/        # Admin web application (React / Vite / TS / TailwindCSS)
│   └── api/          # Backend API (Node.js / Express / TS / Prisma / MySQL)
├── packages/
│   └── shared/       # Shared TypeScript types and utilities
├── prisma/           # Database schema and migrations
├── docs/             # Project documentation
└── README.md         # Monorepo root README
```

## Tech Stack

- **Mobile:** React Native, Expo, TypeScript, TanStack Query
- **Admin:** React, Vite, TypeScript, TailwindCSS, TanStack Query
- **Backend:** Node.js, Express, TypeScript, Prisma, MySQL, JWT

---

## Current Status

- **Current Phase:** Phase 0 / Environment Setup (Completed)
