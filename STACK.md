# STACK.md — LedgerLine by Aslam

**Projek:** LedgerLine by Aslam — Coffee Business Operating System berbasis True Cost
**Versi Stack:** Terkunci (Fase 0)

---

## 1. Runtime & Bahasa
- **Node.js:** >= 22 (LTS, ESM strict)
- **TypeScript:** strict mode (noImplicitAny, strictNullChecks, noUncheckedIndexedAccess)

## 2. Backend
- **Framework:** Fastify 5
- **ORM & Basis Data:** Prisma 5 + SQLite (Fase 0–1) -> PostgreSQL 16 (Fase 2+)
- **Financial Precision:** `decimal.js` (Uang = Decimal(18,0), Kuantitas/Biaya = Decimal(18,4))
- **Validasi Data:** Zod (Skema input API & inferensi tipe data)
- **Job/Worker Queue:** BullMQ + Redis
- **Security & Enkripsi:** `bcryptjs` (PIN), `otplib` (TOTP), `@fastify/helmet`, `@fastify/cors`

## 3. Frontend
- **Framework:** React 19 + TypeScript
- **Bundler / Dev Server:** Vite 6
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand (Store klien sebagai cache baca-saja)
- **Server State & Data Fetching:** TanStack Query v5
- **Routing:** react-router-dom v7
- **Icons & Visuals:** lucide-react, recharts, motion

## 4. Otentikasi
- **Client:** Firebase Auth (Google Provider)
- **Server:** `firebase-admin` (Verifikasi ID Token + Whitelist + Sesi Server)

## 5. Pengujian (Testing)
- **Unit & Integration Domain:** `node:test` + `supertest`
- **UI Components:** Vitest + React Testing Library + jsdom
- **End-to-End (E2E):** Playwright (POS Offline Sync & Checkout flows)

## 6. Standar Gerbang Build (Verification Gates)
Setiap fase wajib lolos 5 gerbang:
1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. `npx prisma validate` (Fase 0-1) / `npx prisma migrate status` (Fase 2+)
