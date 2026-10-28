# DECISIONS.md — LedgerLine by Aslam Architecture & Design Decisions

**Project:** LedgerLine by Aslam — Coffee Business Operating System berbasis True Cost  
**Author:** Pair Programming Agent & System Architect  
**Status:** Living Architecture Record  
**Standard:** Enterprise Financial Precision & Determinism  

---

## 1. Resolusi 8 Cacat Kritis Desain Finansial (Ref: `md/Dokumen Teks Baru.txt`)

### ADR-001: Keseimbangan Jurnal Struk 4 Mode Pajak & Service Charge
- **Masalah Asal:** Pada dokumen awal, perhitungan struk kasir menyebabkan jurnal tidak seimbang pada 3 dari 4 mode pajak (selisih hingga Rp7.636 karena Service Charge dikreditkan tetapi tidak tertagih ke kas atau piutang).
- **Keputusan Arsitektur:** Diimplementasikan algoritma 7 langkah perhitungan struk deterministik dalam `server/domain/finance/receipt.ts` dan `server/services/receipt.service.ts`:
  1. *Item Gross & Largest Remainder Discount Proration:* Diskon dialokasikan ke setiap baris item secara proporsional dengan metode sisa terbesar (rupiah bulat), dengan batas lantai diskon 90% (`BIZ-011`).
  2. *Net Base Sales:* Subtotal setelah diskon menjadi dasar pengenaan Service Charge.
  3. *Service Charge (SC):* Dihitung `floor(netBase * scRate)`.
  4. *Tax Base Determination:* 
     - Jika SC masuk dasar pajak: `taxBase = netBase + sc`.
     - Jika SC tidak masuk dasar pajak: `taxBase = netBase`.
  5. *Pajak PB1/PPN:* Dihitung `round(taxBase * taxRate)` untuk eksklusif, atau `extract` secara aljabar untuk inklusif.
  6. *Tip Sukarela:* Ditambahkan langsung tanpa dikenai pajak/SC.
  7. *Posting Jurnal Seimbang:* Total Pembayaran Pelanggan (Debit Kas 1010 / Bank 1020) **persis sama** dengan Penjualan Bersih (Kredit 4010) + Hutang Service Charge (Kredit 2020) + Hutang Pajak PB1 (Kredit 2010) + Hutang Tip Barista (Kredit 2030).
- **Verifikasi:** Teruji 100% passing pada `server/tests/p2_receipt.test.ts` (6/6 tests).

---

### ADR-002: Fixture A18 Varian Inklusif Aljabar
- **Masalah Asal:** Perhitungan manual menghasilkan nominal gross Rp44.000 dan total Rp49.000 sementara dokumen menuntut Rp50.000.
- **Keputusan Arsitektur:** Digunakan dekomposisi aljabar presisi integer rupiah:
  `Total Nominal = Rp50.000` dipecah menjadi DPP Rp44.000, SC Rp2.000, dan Pajak Rp4.000 dengan invariant `DPP + SC + Pajak == Total`.
- **Verifikasi:** Diuji pada suite A18 varian inklusif dengan 0 delta selisih.

---

### ADR-003: Closed Capacity Overhead Absorption & Largest Remainder Method
- **Masalah Asal:** Rasio kapasitas tidak tertutup jika bobot menu dinamis, menyebabkan under-absorption atau over-absorption yang tidak terhitung di jurnal.
- **Keputusan Arsitektur:** 
  1. Pool biaya overhead operasional bulanan dialokasikan ke produk berdasarkan output jam kerja / porsi resep.
  2. Rasio penyerapan kapasitas tertutup dihitung deterministik:
     `Unabsorbed Idle Cost = Pool Biaya * (1 - Kapasitas Terpakai / Kapasitas Normal)`.
  3. Sisa pool biaya dialokasikan ke unit terjual menggunakan **Largest Remainder Method** sehingga jumlah alokasi unit + idle cost persis sama dengan pool biaya (Rp0 selisih sen).
- **Verifikasi:** Teruji pada skenario Low (33.333 vs 9.966.667), Full, Over, dan Empty pada `server/tests/p5_truecost_capacity.test.ts`.

---

### ADR-004: Robust Provisional 10% Trimmed Mean dengan Baseline Clamp
- **Masalah Asal:** Lonjakan biaya acidental (misal bonus karyawan 10x di hari 1-2) mendistorsi True Cost harian hingga 4,1x baseline pada hari ke-5.
- **Keputusan Arsitektur:** 
  1. Diterapkan filter *10% Trimmed Mean* pada data historis harian untuk membuang outlier ekstrem.
  2. Diberlakukan *Baseline Clamp* maksimum `1.25x` baseline normal untuk tarif provisional harian.
  3. Selisih aktual diakumulasi ke akun varians overhead (`Overhead Variance 5090`) dan direkonsiliasi pada tutup buku akhir bulan.
- **Verifikasi:** Teruji pada `p5_truecost_capacity.test.ts`.

---

### ADR-005: Satu Realitas Fisik Stok, Dua Valuasi Paralel (FIFO vs Average)
- **Masalah Asal:** Pencampuran mutasi stok fisik dengan mesin valuasi menyebabkan stok terpotong ganda atau saldo memo negatif.
- **Keputusan Arsitektur:**
  1. Fisik stok dikelola secara tunggal oleh `PhysicalStockService` pada tabel `inventory_balances` dan `physical_stock_movements`.
  2. Mesin FIFO dan Moving Average adalah *Pure Valuation Engine* yang hanya membaca kuantitas fisik dan menulis baris valuasi tanpa memutasi stok fisik.
  3. Jurnal buku besar resmi (General Ledger) HANYA mencatat mesin PRIMARY (FIFO). Mesin SECONDARY (Moving Average) hanya dicatat di buku pembantu memo internal untuk perbandingan performa keuangan.
- **Verifikasi:** Teruji pada `server/tests/p0_financial.test.ts` (Golden Invariant #2).

---

### ADR-006: Pencegahan Double-Deduction pada Laba Bersih & Idle Cost
- **Masalah Asal:** Laba bersih berisiko dikurangi biaya operasional dua kali jika akun IDLE_COST tidak direklasifikasi dari beban operasional.
- **Keputusan Arsitektur:**
  1. Biaya Idle dihitung melalui jurnal reklasifikasi:
     - `Debit: Biaya Kapasitas Menganggur (Beban Lain-lain 6090)`
     - `Kredit: Biaya Operasional Terserap (Pengurang Beban 5080)`
  2. P&L Statement menyajikan:
     `Laba Kotor = Penjualan - True HPP`  
     `Laba Operasional = Laba Kotor - Biaya Operasional Bersih (setelah reklasifikasi)`  
     `Laba Bersih = Laba Operasional - Beban Idle Cost`.
- **Verifikasi:** Keseimbangan total biaya tetap terjaga sama dengan pool biaya aktual.

---

### ADR-007: Server-Side Manager Override PIN & Perlindungan Lockout 15 Menit
- **Masalah Asal:** Dokumen awal sempat mengusulkan penyimpanan hash PIN di perangkat kasir offline, rentan brute-force offline (hanya 1 juta kombinasi 6 digit).
- **Keputusan Arsitektur:**
  1. Manager Override PIN diproses secara strictly server-side (`POST /api/pos/manager-override`).
  2. Hash PIN disimpan di database dengan `bcrypt` salt rounds 10. Tidak ada hash yang pernah dikirim ke browser kasir.
  3. Diterapkan sliding window brute-force protection: jika terjadi 3x percobaan PIN salah dalam 5 menit, perangkat (`deviceId` / IP) langsung dikunci selama 15 menit (`AUT-003`).
  4. Setiap eksekusi override dicatat dalam `AuditLog` dengan tingkat severity `CRITICAL` beserta `reason` wajib minimal 3 karakter.
- **Verifikasi:** Teruji 100% pada `server/tests/p4_manager_override.test.ts` (7/7 tests).

---

### ADR-008: Alur Otentikasi Dua Faktor (RFC 6238 TOTP) & Penutupan Buku Permanen
- **Masalah Asal:** Ketidakteraturan urutan dependensi paket otplib vs pure domain engine.
- **Keputusan Arsitektur:**
  1. Dibangun Pure Domain Engine RFC 6238 TOTP (`server/domain/auth/totp.ts`) tanpa dependensi pustaka luar:
     - Encoding & Decoding Base32 simetris.
     - Dynamic Truncation HMAC-SHA1.
     - Toleransi drift waktu `±1 window` (±30 detik).
     - Perlindungan Anti-Replay Step: token yang sama tidak dapat digunakan kembali pada time step yang sama.
     - 8 Emergency Single-Use Backup Codes yang di-hash dengan bcrypt.
  2. Tutup buku akhir bulan / periode (`POST /api/finance/period-closing`) wajib menyertakan TOTP token aktif atau Emergency Backup Code.
  3. Setelah ditutup, periode dikunci (`isLocked: true`), transaksi bertanggal lampau ditolak (`BIZ-012`), dan snapshot buku besar disegel dengan checksum SHA-256.
- **Verifikasi:** Teruji 100% pada `server/tests/p8_totp_queue_backup.test.ts` (12/12 tests).

---

### ADR-009: SaaS Platform Control Plane & Pure Domain Entitlements Engine
- **Masalah Asal:** Peran Super Admin sebelumnya belum memiliki control plane pusat yang terpisah dari POS toko, menyebabkan ketidakjelasan pemisahan antara volume bisnis pelanggan (GMV kedai) dan pendapatan langganan SaaS LedgerLine (MRR), serta belum adanya mekanisme kuota bertingkat (Core, Growth, Scale) dan sesi bantuan pelanggan (safe impersonation) yang aman.
- **Keputusan Arsitektur:**
  1. *Pemisahan Shell Total:* Super Admin dialokasikan ke antarmuka eksekutif `LedgerLineControlCenter` di `/admin` dengan obsidian dark theme dan 12 menu operasional mandiri, tanpa memuat menu sidebar kasir atau POS toko.
  2. *Pure Domain Entitlement Engine (`server/domain/saas/entitlements.ts`):*
     - Evaluasi fitur (`canAccessFeature`), pemeriksaan batas kuota (`checkCapacityLimit`), dan kalkulasi skor kesehatan bisnis (`calculateTenantHealthScore` 0–100) sebagai fungsi murni tanpa ketergantungan database.
     - State machine langganan: `ACTIVE`, `TRIALING`, `GRACE_PERIOD`, `PAST_DUE`, `RESTRICTED`, `CANCELED`.
     - Invarian: Data historis buku besar tidak pernah dihapus saat langganan berakhir; hanya posting operasional baru yang dibatasi.
  3. *Invarian Pemisahan Finansial:*
     - Gross Merchandise Value (GMV omzet toko pelanggan) dipisahkan 100% dari Monthly Recurring Revenue (MRR kas SaaS platform LedgerLine).
  4. *Kontrak Safe Impersonation (`support_sessions`):*
     - Login liar ke akun pemilik toko dilarang keras. Sesi bantuan wajib menyertakan Nomor Tiket, Alasan Investigasi, durasi terbatas (maks 30 menit), mode Read-Only bawaan, dan menampilkan banner merah permanen di seluruh layar.
  5. *Matriks Entitlement Dinamis:*
     - Batas kuota fitur (max outlets, max devices, offline sync max, AI forecast) disimpan dalam tabel `PlanEntitlement` dan dapat disesuaikan langsung oleh Super Admin tanpa deploy ulang kode.
- **Verifikasi:**
  - Teruji 100% pada `server/tests/p9_saas_entitlements.test.ts` (5/5 tests).
  - Terverifikasi E2E via Browser Subagent pada video recording `control_center_enterprise_verify_1793019521445.webp`.

---

### ADR-010: SaaS Self-Service Onboarding, Tenant Lifecycle State Machine, Granular Kill Switches, & Diagnostic Radar
- **Masalah Asal:** PRD v2 sebelumnya membatasi onboarding mandiri publik (mengharuskan AccessRequest manual Super Admin untuk setiap pendaftar baru) yang tidak layak untuk model SaaS publik dengan ribuan pengguna. Selain itu, status tenant sebelumnya hanya berupa boolean aktif/non-aktif tanpa state machine dunning finansial (`PROVISIONING -> TRIAL -> ACTIVE -> PAST_DUE -> RESTRICTED -> SUSPENDED -> ARCHIVED`), belum ada saklar pemutus layanan darurat parsial (kill switch) saat pihak ketiga down, serta belum ada diagnostik instan kepatuhan integritas R1–R8.
- **Keputusan Arsitektur:**
  1. *Owner Self-Service Onboarding & 7-Step Setup Wizard:*
     - Pendaftaran mandiri langsung via Google Auth atau formulir email (`POST /api/auth/self-service-onboard`).
     - Otomatis membuat Tenant (status `TRIAL`), paket Growth trial 14 hari, Outlet utama, Gudang utama, akun UserProfile Owner, dan mencatat event audit `SELF_SERVICE_REGISTRATION`.
     - Wizard interaktif 7 langkah (`OwnerSetupWizard`): Profil Usaha -> Cabang & Gudang -> Kasir & Staff -> Bahan Baku Awal -> Menu & True Cost -> Perangkat POS -> Siap Operasi.
  2. *Deterministic Tenant Lifecycle & Dunning State Machine (`server/domain/saas/tenant-lifecycle.ts`):*
     - Siklus transisi: `PROVISIONING` -> `TRIAL` -> `ACTIVE` -> `PAST_DUE` (<= 7 hari) -> `RESTRICTED` (8-14 hari) -> `SUSPENDED` (> 14 hari) -> `ARCHIVED`.
     - Jalur pembatalan sukarela: `ACTIVE` -> `CANCELING` -> `CANCELED` (Archive Mode).
     - **Invarian Retensi 10 Tahun:** Akses baca data historis (`isHistoricalReadAllowed`) **tidak pernah dicabut** pada semua status lifecycle untuk kepatuhan pajak dan audit.
  3. *Granular System Kill Switches (`server/domain/saas/killswitches.ts` & tabel `SystemKillSwitch`):*
     - Mengisolasi gangguan spesifik pihak ketiga secara parsial tanpa merobohkan seluruh aplikasi: `GOOGLE_SYNC`, `POS_OFFLINE_SYNC`, `SUPPLY_ORDER`, `MIGRATION_COMMIT`, `EXPORT`.
     - Kontrol langsung dari tab Operasi di Super Admin Command Center.
  4. *Radar Diagnostik Integritas Instan 7 Pilar (`server/domain/saas/diagnostics.ts`):*
     - Evaluasi deterministik instan: Integritas Double-Entry (`DIAG-ACC-001`), Rekonsiliasi R1–R8 (`DIAG-FIN-002`), Invarian Stok Positif (`DIAG-STK-003`), Disiplin Closing Shift (`DIAG-OPS-004`), Antrean Sync Offline (`DIAG-OFF-005`), Verifikasi Backup RPO/RTO (`DIAG-BAK-006`), dan Integrasi Google OAuth (`DIAG-INT-007`).
     - Menghasilkan skor 0–100 dan rekomendasi tindakan perbaikan konkret bagi operator platform.
  5. *Customer-Visible Support Access Audit Log:*
     - Pemilik kedai dapat memeriksa jejak transparansi setiap sesi bantuan Super Admin (`GET /api/tenant/support-access-logs`) di pengaturan keamanan toko.
- **Verifikasi:**
  - Teruji 100% pada `server/tests/p10_saas_lifecycle_billing.test.ts` (16/16 tests passing).
  - Regresi finansial utuh terverifikasi pada `server/tests/p0_financial.test.ts` (10/10 tests passing).
  - Production bundling tuntas via `npm run build` (Vite 60s + esbuild 300ms, exit code 0).
  - Terverifikasi E2E via Browser Subagent pada rekaman `saas_onboarding_admin_flow_1793025961838.webp`.

---

## 2. Invarian Finansial & Standar Keamanan

1. **Golden Invariant Debit == Credit:**
   Seluruh jurnal akuntansi yang diposting ke database wajib memiliki `sum(debit) == sum(credit)`. Setiap ketidakseimbangan memicu fail-fast exception (`ACC-001`).
2. **Presisi Finansial:**
   - Mata uang: `Decimal(18,0)` rupiah bulat (integer).
   - Kuantitas stok dan unit cost: `Decimal(18,4)`.
   - Dilarang keras memakai tipe JavaScript `number` untuk agregasi keuangan.
3. **Zero-Cost Visibility untuk Kasir (Mandat Rule 5):**
   Serializer `server/serializers/mask-cost.serializer.ts` menyaring `unit_cost`, `costPrice`, dan `HPP` dari seluruh respons API untuk role `KASIR` dan `BARISTA`.
4. **Disaster Recovery Otomatis (`npm run backup:verify`):**
   Ekspor backup cloud dienkripsi menggunakan AES-256-GCM dengan verifikasi otomatis integritas SHA-256 dan kepatuhan 10 Golden Invariants.

