# STATE.md — LedgerLine by Aslam Memory Vault

**Project:** LedgerLine by Aslam — Coffee Business Operating System berbasis True Cost
**Environment:** Antigravity IDE (Gemini Flash Optimized)
**Database:** Supabase Tokyo PostgreSQL (`aws-0-ap-northeast-1.pooler.supabase.com:5432`)
**Current Version:** 1.0.0-rc1 (Enterprise-Ready)
**Last Updated:** 2026-10-26

---

## 1. Status Ringkasan Fase (Fase 0 – 10)

| Fase | Nama Modul | Status | Bukti Pengujian |
|---|---|---|---|
| **Fase 0** | Fondasi, Env & Sanitasi Mock | **100% SELESAI** | `env.test.ts`, `health.test.ts` (PASS) |
| **Fase 1** | Multi-Tenant, RBAC & Zero-Cost Masking | **100% SELESAI** | `p1_auth.test.ts` (PASS, 5/5) |
| **Fase 2** | Master Data, Single Physical Stock & General Ledger | **100% SELESAI** | `p0_financial.test.ts`, `p2_receipt.test.ts` (PASS, 16/16) |
| **Fase 3** | POS Checkout, Offline Batch Sync & Recipe Snapshot | **100% SELESAI** | `p3_checkout_offline.test.ts` (PASS, 3/3) |
| **Fase 4** | Manager Override PIN & Anti-Tamper Lockout | **100% SELESAI** | `p4_manager_override.test.ts` (PASS, 7/7) |
| **Fase 5** | Shift Closing (Blind Cash) & Stock Opname (BIZ-010) | **100% SELESAI** | `p6_shift_opname.test.ts` (PASS, 4/4) |
| **Fase 6** | True Cost Engine & Closed Capacity Absorption | **100% SELESAI** | `p5_truecost_capacity.test.ts` (PASS, 4/4) |
| **Fase 7** | Procurement PO, Migration Center & BCG Matrix | **100% SELESAI** | `p7_procurement_migration_bcg.test.ts` (PASS, 10/10) |
| **Fase 8** | Background Workers & Queue Resilience | **100% SELESAI** | `offlineSyncWorker.ts`, `outboxWorker.ts` |
| **Fase 9** | Two-Factor Authentication (RFC 6238 TOTP) | **100% SELESAI** | `p8_totp_queue_backup.test.ts` (PASS, 12/12) |
| **Fase 10** | Cloud Backup & Disaster Recovery (`backup:verify`) | **100% SELESAI** | `BackupService`, `scripts/backup-verify.ts` (PASS) |
| **Fase 11** | SaaS Platform Control Plane & Dynamic Entitlements | **100% SELESAI** | `p9_saas_entitlements.test.ts` (PASS, 5/5), Browser Verify (PASS) |

---

## 2. Kriteria Penerimaan Terverifikasi (Acceptance Criteria §18 & SaaS 33-Point)

- **A1–A2 (Autentikasi & Isolasi Tenant):** Rute non-publik menolak request tanpa sesi (`AUT-001`), tenant A diblokir dari resource tenant B (`RES-001`).
- **A3–A4 (Konsistensi Stok Fisik & Valuasi Ganda):** Fixture fisik 500g kopi konsisten, FIFO menilai 350.000, Average menilai 375.000 tanpa menduplikasi stok fisik.
- **A5–A6b (True Cost & Kapasitas Penuh):** Fixture A5 (margin 42.86% dan 46.07%), penyerapan kapasitas tertutup dengan metode sisa terbesar (Low, Full, Over, Empty terverifikasi aljabar).
- **A7 (Zero-Cost Visibility untuk Kasir):** Kasir tidak menerima data biaya (`unit_cost`, `HPP`, `costPrice`, resep berbiaya) baik pada API, store klien, maupun antarmuka kasir.
- **A8–A9 (Penutupan Shift & Laba Bersih):** Hitung kas buta (`blind cash count`) dengan posting jurnal otomatis selisih kas (Pendapatan 4030 / Beban 6020).
- **A10–A11 (Procurement & Offline Sync):** PO internal + QC receiving, sinkronisasi offline batch dengan receipt gap recovery dan `RecipeVersionSnapshot`.
- **A12 (Migration Center):** Sanitasi injeksi formula CSV (CWE-1236) dan posting saldo awal ke modal ekuitas pemilik (Debit 1100, Credit 3000).
- **A14 (Enterprise 2FA TOTP):** Standar RFC 6238 TOTP, proteksi anti-replay step, 8 emergency single-use backup codes, dan penguncian periode akuntansi (`closing.lock`) dilindungi TOTP (`AUT-005`).
- **A15 (Automated Disaster Recovery):** Enkripsi AES-256-GCM, SHA-256 checksum, dan verifikasi otomatis keseimbangan buku besar Debit = Credit.
- **A18–A19 (Struk 7 Langkah & Diskon):** Pajak inklusif/eksklusif, service charge, tip, dan batas lantai diskon 90% (BIZ-011).
- **A20–A21 (Opname Lock & Robust Provisional):** BIZ-010 per-item opname lock dan 10% trimmed mean dengan baseline clamp.
- **A22–A33 (SaaS Platform Control Plane & Entitlements Engine):**
  - Pemisahan 100% shell Super Admin di `/admin` (`LedgerLineControlCenter`) dari POS toko.
  - Pemisahan tegas Volume Bisnis Pelanggan (GMV omzet toko) vs Pendapatan Asli Platform LedgerLine (MRR).
  - Kontrak Safe Impersonation berdurasi terbatas dengan banner merah audit permanen di layar (`support_sessions`).
  - Matriks kuota fitur dinamis (Core, Growth ⭐, Scale) via domain pure tanpa hardcoded if-else.
  - Pencabutan token armada perangkat POS dari jauh (`DELETE /api/admin/devices/:id`).

---

## 3. Infrastruktur & Layanan Aktif

1. **Server Utama:** Fastify 5 + TypeScript ESM (`http://localhost:3000`).
2. **Koneksi Database:** PostgreSQL Supabase Tokyo (`db.yanblzsetiifwmwvucnw.supabase.co:5432`) via connection pooler mode session.
3. **Frontend:** React 19 + Vite 6 + Tailwind CSS 4 dengan HMR aktif.
4. **Keamanan:** Cookie HTTP-only terenkripsi, Manager Override PIN (bcrypt + 15m lockout), TOTP 2FA (`otplib`/RFC 6238), Sanitasi Formula CSV.
5. **SaaS Models:** 7 model langganan aktif (`SubscriptionPlan`, `PlanEntitlement`, `TenantSubscription`, `SubscriptionInvoice`, `SubscriptionPayment`, `SubscriptionEvent`, `SupportSession`).

---

## 4. Status Kesiapan Produksi Enterprise (Final Sign-off)

- **Backend Test Suites:** 72 unit & integration tests passing across 12 suites (0 failed, 0 cancelled, 100% pass rate).
- **Automated Disaster Recovery Script (`backup:verify`):** Verified exit code 0. Enkripsi AES-256-GCM, SHA-256 integrity checksum, dan verifikasi invariant Debit == Credit.
- **Fullstack Production Build:** `npm run build` berhasil mengompilasi Vite SPA client dan membundel Node.js Fastify server (`dist/server.cjs`, 337.6 kB).
- **Wire-up Antarmuka Frontend:**
  - `LedgerLineControlCenter.tsx` mengelola 12 modul eksekutif SaaS pusat di `/admin`.
  - `StockOpnameTab.tsx` terhubung ke `/api/inventory/opname`.
  - `PurchaseOrdersTab.tsx` terhubung ke `/api/procurement/orders` dan `/api/procurement/receive`.
  - `MigrationTab.tsx` terhubung ke `/api/tenant/migration-tickets` dengan mode credentials include.
  - `DeterministicClosingModal.tsx` menyinkronkan penutupan shift ke `/api/shift/close`.
  - `AuthorityMatrixModal.tsx` dilengkapi kartu verifikasi langsung Manager Override PIN ke `/api/pos/manager-override` dengan alert lockout 15 menit.
- **Architectural Flaw Resolution:** 9 keputusan desain finansial & SaaS terdokumentasi dan terpecahkan secara deterministik dalam `DECISIONS.md`.

