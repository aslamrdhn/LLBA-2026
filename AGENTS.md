# LedgerLine by Aslam — Agent Instructions & Project Rules

**Project:** LedgerLine by Aslam — Coffee Business Operating System berbasis True Cost
**Harness Environment:** Antigravity IDE (Gemini Flash Optimized)
**Status:** Architecture & Engine Alignment Phase (No blind execution)

---

## 1. Core Principles & Product Identity

1. **True Cost Determinism:**
   `True Cost = Material Cost + Packaging + Modifier + Labor + Allocated Operating Overhead`
   Every single cost number MUST be traceable to documented purchase records, physical stock movements, recipes, and transactions. Guesswork or default static estimates are strictly prohibited.
2. **Satu Realitas Fisik, Dua Valuasi Paralel:**
   Fisik stok dikelola secara eksklusif oleh `PhysicalStockService`. Mesin FIFO dan Average hanya menilai (valuation), tidak pernah menulis mutasi kuantitas fisik.
3. **Double-Entry Append-Only Ledger:**
   Buku besar akuntansi bersifat append-only. Koreksi dilakukan melalui jurnal pembalik (*reversing entry*), bukan `UPDATE` atau `DELETE`.
4. **Pemisahan Domain Murni:**
   Logika bisnis dan kalkulasi keuangan ditempatkan di `server/domain/*` sebagai fungsi murni (tanpa ketergantungan Fastify atau Prisma) agar dapat diuji 100% secara deterministik tanpa database.
5. **Zero-Cost Visibility untuk Kasir:**
   Data biaya (`unit_cost`, `HPP`, `True Cost`, resep berbiaya) dilarang keras dikirim ke kasir (di filter pada serializer server). Kasir beroperasi tanpa akses menu resep berbiaya.

---

## 2. Technology Stack (Terkunci)

- **Runtime:** Node.js >= 22 (ESM, TypeScript Strict)
- **Backend Framework:** Fastify 5 + TypeScript strict
- **Database & ORM:** PostgreSQL + Prisma (Migration-ready, Row-level lock pada mutasi uang/stok)
- **Validation:** Zod (Skema menjadi sumber kebenaran tipe via `z.infer`)
- **Financial Precision:** `decimal.js` (Presisi tinggi, dilarang memakai `number`/`Float` untuk kalkulasi nilai)
- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Zustand, TanStack Query, Lucide Icons, Recharts, Motion
- **Worker/Queue:** BullMQ + Redis (Menangani background sync & rekonsiliasi asinkron)
- **Authentication:** Firebase Auth klien + `firebase-admin` verifikasi token server
- **Security & Integrasi:** `bcryptjs` (Manager PIN), `otplib` (TOTP), `exceljs` (Ekspor/Impor sanitasi formula)
- **Testing:** `node:test` + `supertest` (Server domain & API), Vitest + Testing Library (React UI), Playwright (E2E POS Offline)

---

## 3. Aturan Coding & Uang (Anti-Error Mandat)

### Aturan TypeScript & Desain Kode:
1. **Larangan `any`:** Dilarang keras memakai `any`, `@ts-ignore`, `@ts-expect-error`, atau `eslint-disable` tanpa justifikasi tertulis.
2. **Validasi Input:** Seluruh rute API wajib divalidasi dengan Zod schema di middleware `server/middlewares/validate.ts`.
3. **Rute Terproteksi:** Setiap rute wajib memakai `guard({ roles, outlet, audit })`, kecuali whitelist publik eksplisit (health check, auth callback).
4. **Keamanan Sesi Server:** `tenantId`, `outletId`, dan `roles` HANYA dibaca dari sesi server yang telah didekripsi, bukan dari header (`x-tenant-id`), query parameter, atau payload body.
5. **Bahasa:** Teks UI dalam Bahasa Indonesia. Nama kode, file, tabel database, fungsi, dan variabel dalam Bahasa Inggris.

### Aturan Presisi Uang & Finansial:
1. **Presisi Desimal:**
   - Nilai Uang = `Decimal(18,0)` (rupiah bulat, integer).
   - Kuantitas Stok = `Decimal(18,4)`.
   - Biaya Satuan (*Unit Cost*) = `Decimal(18,4)`.
   - Dilarang keras memakai tipe JavaScript `number` atau database `Float` untuk uang dan stok.
   - Serialisasi JSON API mengirim angka desimal sebagai `string`.
2. **Pembulatan & Alokasi:**
   - Pembulatan half-up ke rupiah bulat HANYA dilakukan saat posting baris jurnal (`balanceJournalLines`).
   - Alokasi overhead/kapasitas wajib memakai **metode sisa terbesar (*largest remainder method*)** agar total alokasi persis sama dengan nilai pool biaya.
3. **Integritas Transaksi:**
   - Setiap mutasi uang atau stok wajib berada dalam SATU transaksi database dengan pessimistic lock (`FOR UPDATE`) pada baris item terkait.

---

## 4. Panduan Khusus untuk Gemini Flash

1. **Step-by-step Mathematical Reasoning:**
   Sebelum mengimplementasikan kalkulasi keuangan (stok, FIFO/Average, pajak, diskon, overhead), selalu tuliskan verifikasi aljabar dan keseimbangan Debit = Credit terlebih dahulu.
2. **Modular & Token-Efficient:**
   Jaga ukuran file tetap ringkas (fungsi domain < 50 baris, modul < 300 baris). Jangan menduplikasi instruksi atau menulis boilerplate yang berlebihan.
3. **Fail-Fast Error Handling:**
   Jangan pernah menelan error (*silent failure/empty catch*). Laporkan konteks keuangan yang jelas saat transaksi tidak seimbang atau stok tidak valid.
4. **Verifikasi Mandiri:**
   Pastikan setiap fase diverifikasi dengan 5 pilar sebelum dianggap selesai:
   `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` → `npx prisma migrate status`.
