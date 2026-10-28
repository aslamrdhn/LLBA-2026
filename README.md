# LedgerLine by Aslam
**Coffee Business Operating System berbasis True Cost**

> *From Supply to Sale. From Cost to True Cost.*

---

## 1. Ikhtisar Projek

LedgerLine by Aslam adalah sistem operasi bisnis coffee shop yang berpusat pada kalkulasi **True Cost** deterministik. Sistem ini menghubungkan inventori bahan baku, resep menu, kasir POS (offline-ready), dan akuntansi buku besar (*double-entry parallel ledger*) berbasis FIFO dan Average Cost.

Dokumentasi lengkap dan spesifikasi produk dapat dibaca di:
- 📖 [docs/PRD.md](docs/PRD.md) — Dokumen Kebutuhan Produk (PRD) Lengkap
- 🛠️ [STACK.md](STACK.md) — Spesifikasi Teknologi Terkunci
- 📜 [AGENTS.md](AGENTS.md) — Aturan Kode & Integritas Finansial

---

## 2. Cara Menjalankan Lokal

### Prasyarat:
- **Node.js** >= 22.0.0
- **npm** >= 10.0.0

### Langkah Instalasi:

1. **Salin Environment Variables:**
   ```bash
   cp .env.example .env
   ```

2. **Pasang Dependensi:**
   ```bash
   npm install
   ```

3. **Buat Klien Prisma:**
   ```bash
   npx prisma generate
   ```

4. **Jalankan Server Pengembangan (Localhost):**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000` (Fastify API backend menyajikan Frontend Vite React secara terpadu).

---

## 3. Struktur Direktori

```text
├── .agents/             # Antigravity IDE agent harness & skills
├── docs/
│   └── PRD.md           # Spesifikasi produk lengkap
├── prisma/
│   └── schema.prisma    # Skema database Prisma
├── server/
│   ├── domain/          # Logika murni True Cost, FIFO, Average, alokasi
│   ├── routes/          # API route handlers Fastify
│   ├── services/        # Service layer (Stock, Checkout, Shift, Accounting)
│   ├── workers/         # Background queue workers (BullMQ)
│   └── env.ts           # Validasi Zod environment variables
├── src/                 # React 19 Frontend (Vite 6, Tailwind CSS 4)
│   ├── components/      # UI Components (POS, Cashier, Inventory, Modals)
│   ├── pages/           # Layar utama (Dashboard, POS, Shift, Analytics)
│   ├── store/           # Zustand client cache (baca-saja)
│   └── lib/             # Helper offlineQueue & utilities
├── AGENTS.md            # Aturan coding & anti-error sistem
├── STACK.md             # Dokumen stack terkunci
└── server.ts            # Entrypoint Fastify backend
```

---

## 4. Standar Gerbang Verifikasi (Verification Gates)

Setiap fase pengembangan wajib lolos 5 gerbang otomatis:
1. `npm run typecheck` — TypeScript strict typecheck tanpa error
2. `npm run lint` — ESLint tanpa peringatan
3. `npm test` — Suite pengujian domain, env, dan finansial
4. `npm run build` — Build bundel Vite dan esbuild server backend
5. `npx prisma validate` — Validasi skema basis data
