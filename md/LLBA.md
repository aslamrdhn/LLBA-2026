# PRD V1 — LedgerLine by Aslam

**Coffee Business Operating System berbasis True Cost**

> **From Supply to Sale. From Cost to True Cost.**
>
> Nama Dokumen: **PRD V1**
> Versi: **1.0 Final**
> Tanggal: Mei 2026
> Status: **Siap eksekusi Fase 0–10**
> Pemilik: @aslam
> Repositori: `aslamrdhn/ledgerline`

---

## 0. Catatan Versi dan Konsolidasi

PRD V1 adalah **satu-satunya sumber kebenaran** untuk membangun LedgerLine. Ia menggabungkan seluruh evolusi dokumen (v1, v2.0, V.1) dengan **seluruh patch verifikasi** dari tiga gelombang kritik:

- **Gelombang 1:** RBAC, accounting model, stok negatif offline, spesifikasi True Cost, rotasi secret, metrik MVP, supply hub, offline deadlock, receipt gap, TOTP timing, break-glass.
- **Gelombang 2:** Idle cost selalu nol (koreksi formula capacity-based), ZERO_HISTORY paradox, recipe versioning offline, manager override PIN, preset discount vs DS1.
- **Gelombang 3:** Race condition opname vs offline sync, urutan operasi pajak/diskon/SC, volatilitas ekstrapolasi provisional, cliff migration grace, discount double-dipping. Ditambah empat temuan tambahan: rate historis, R7 update, opname + PENDING_MIGRATION, preset version historis.

### 0.1 Ringkasan Seluruh Keputusan Final

| # | Area | Keputusan Final |
|---|---|---|
| 1 | Peran | 6 peran + permission matrix machine-readable |
| 2 | Akuntansi | Parallel ledger + COA + posting matrix + R3 dipertegas |
| 3 | Stok negatif | Kondisional + `ESTIMATED` + zero-history + `PENDING_MIGRATION` |
| 4 | True Cost | **Capacity-based absorption** + **Idle Cost** + **Dynamic Provisional robust** |
| 5 | Supply Hub | Internal procurement (tanpa portal supplier eksternal) |
| 6 | Offline posting | Async per batch + batching lock + deadlock retry |
| 7 | Nomor struk | Per perangkat + Receipt Gap Recovery |
| 8 | Resep offline | `recipeVersion` + `RecipeVersionSnapshot` (resep historis) |
| 9 | Manager approval | **Manager Override PIN** (single-action, bukan login penuh) |
| 10 | Preset discount | Dikecualikan DS1 + **stacking rules** + **cart prorating** |
| 11 | TOTP | Fase 5 (MVP) |
| 12 | Super Admin | Break-glass + audit + notifikasi Owner |
| 13 | Secret | Rotasi wajib sebelum Fase 0 |
| 14 | Export | Sanitasi formula |
| 15 | Audit chain | Advisory lock per tenant |
| 16 | Context dilution | Pre-phase recap + `STATE.md` |
| 17 | Deployment | Bab lengkap + Docker + CI/CD + runbook |
| 18 | Cookie | `ll_session` (satu nama) |
| 19 | **Urutan struk** | **Formula baku §8.9a (deterministik, satu arah)** |
| 20 | **Opname vs offline** | **§8.4a advisory block + item-level + reconcile** |
| 21 | **Provisional** | **Trimmed mean + baseline clamp + confidence** |
| 22 | **Migration grace** | **Pause + cap + hard deadline + extend** |
| 23 | **Discount stacking** | **1 preset + 1 manual per line, 1 preset per cart, 10% floor** |

### 0.2 Formula Alokasi (Koreksi Final)

Formula ini adalah satu-satunya yang memenuhi semua fixture:

```
capacityRatio(k)    = min(1, Σ_p weight(p,k,e) / Capacity(k))
AlokasiTotal(p,k,e) = Pool(k,t) × capacityRatio(k) × weight(p,k,e) / Σ_p weight(p,k,e)   [jika Σ weight > 0]
                    = 0                                                                   [jika Σ weight = 0]
IdleCost(k)         = Pool(k,t) × (1 − capacityRatio(k))
```

Verifikasi:
- **Low sales** (10/3.000): `capacityRatio = 0,00333`; `Σ Alokasi = Rp33.333`; `IdleCost = Rp9.966.667`. ✓
- **Full capacity** (3.000/3.000): `capacityRatio = 1`; `Σ Alokasi = Rp10.000.000`; `IdleCost = 0`. ✓
- **Over capacity** (3.500/3.000): `capacityRatio = 1`; `Σ Alokasi = Rp10.000.000`; `IdleCost = 0`. ✓
- **Empty** (0/3.000): `capacityRatio = 0`; `Σ Alokasi = 0`; `IdleCost = Rp10.000.000`. ✓

---

## 1. Identitas, Visi, dan Prinsip

### 1.1 Identitas

LedgerLine by Aslam adalah **Coffee Business Operating System** yang berpusat pada True Cost. Ia menghubungkan supply, inventory, recipe, sales, costing, dan finance melalui **deterministic cost engine** berbasis FIFO dan Average Cost, sehingga pemilik coffee shop memahami biaya sebenarnya di balik setiap penjualan.

### 1.2 Visi

Membangun sistem operasi bisnis khusus coffee shop yang menghubungkan supply, inventory, recipe, sales, costing, finance, dan business intelligence, sehingga pemilik usaha dapat memahami True Cost dan mengambil keputusan berdasarkan kondisi ekonomi bisnis yang sebenarnya.

### 1.3 Misi

Menyediakan satu sistem yang secara deterministik mencatat pergerakan bisnis dari bahan baku masuk hingga produk terjual, menghitung biaya menggunakan FIFO dan Average Cost secara konsisten, mengubahnya menjadi HPP dan True Cost, serta membantu pemilik menemukan supplier, mengontrol operasional, memahami margin, dan mengambil keputusan dengan data yang dapat dipercaya.

### 1.4 Prinsip Produk

1. **Satu realitas fisik, dua valuasi parallel, satu interpretasi ekonomi.** Laporan keuangan resmi memakai satu engine utama per outlet.
2. **True Cost lebih luas dari HPP.** `True Cost = Material + Packaging + Modifier + Labor + Allocated Overhead` dengan **capacity-based absorption** agar IdleCost tidak dibebankan ke penjualan aktual.
3. **Deterministik dan dapat ditelusuri.** Setiap angka biaya dapat dilacak ke pembelian, pergerakan stok, resep, transaksi. Biaya estimasi ditandai `ESTIMATED` dan wajib direkonsiliasi.
4. **Supply Hub adalah awal rantai ekonomi.** Supplier, produk, PO, penerimaan terhubung langsung ke mesin biaya.
5. **POS adalah titik transaksi.** Data masuk ke mesin biaya untuk HPP, True Cost, margin.
6. **Anti-kebocoran adalah lapisan kontrol.** Opname, hitung kas buta, rekonsiliasi, audit log, approval, buku besar ganda.
7. **POS tidak boleh berhenti.** Penjualan tetap offline dengan resep historis dipertahankan.
8. **Pindah tanpa mulai dari nol.** Migration Center dengan grace period yang manusiawi.
9. **Tidak ada angka biaya di sisi Kasir.** Ditegakkan serializer server.
10. **Deployment adalah bagian dari produk.** Docker + CI/CD + runbook + checklist.
11. **Approval bekerja secara fisik di POS.** Manager Override PIN.
12. **Formula uang diuji aljabar sebelum diimplementasikan.** Tidak boleh ada formula yang menghasilkan nilai cacat di edge case.

---

## 2. Matriks Peran dan Permission

### 2.1 Dua Tingkat Peran

| Tingkat | Peran | Deskripsi |
|---|---|---|
| Platform | `SUPER_ADMIN` | Lintas tenant. Buat tenant, setujui akun, kurasi supplier, break-glass. |
| Tenant | `OWNER` | Pemilik bisnis. Satu atau lebih per tenant. |
| Tenant | `MANAGER` | Operasional. Batas approval nominal. Manager Override PIN. |
| Tenant | `CASHIER` | Kasir POS. Tanpa akses biaya. |
| Tenant | `BARISTA` | Penerimaan, opname draf, waste. Tanpa akses biaya. |
| Tenant | `SUPPLIER` | Peran minimal untuk akses dokumen PO (opsional). |

### 2.2 Permission Matrix (Machine-Readable)

```
PERMISSION                          SA   OW   MG   KS   BR   SP
--------------------------------------------------------------
tenant.create                       ✓    -    -    -    -    -
tenant.suspend                      ✓    -    -    -    -    -
access_request.review               ✓    -    -    -    -    -
user.invite                         ✓    ✓    -    -    -    -
user.role.change                    ✓    ✓    -    -    -    -
user.suspend                        ✓    ✓    -    -    -    -
user.revoke_session                 ✓    ✓    -    -    -    -
user.reset_pin                      ✓    ✓    ✓    -    -    -
user.set_manager_pin                ✓    ✓    -    -    -    -
device.register                     ✓    ✓    -    -    -    -
device.revoke                       ✓    ✓    -    -    -    -
device.receipt_recovery             ✓    ✓    -    -    -    -
device.abandon_queue                ✓    ✓    -    -    -    -
device.extend_migration_grace       ✓    -    -    -    -    -
policy.edit                         ✓    -    -    -    -    -
policy.view                         ✓    ✓    -    -    -    -
supplier.curate                     ✓    -    -    -    -    -
menu.edit                           ✓    ✓    -    -    -    -
menu.view_without_cost              ✓    ✓    ✓    ✓    ✓    -
recipe.edit                         ✓    ✓    -    -    -    -
recipe.view                         ✓    ✓    -    -    -    -
item.edit                           ✓    ✓    -    -    -    -
item.view                           ✓    ✓    -    ✓    ✓    -
inventory.receive                   ✓    ✓    ✓    -    ✓    -
inventory.opname.draft              -    -    -    -    ✓    -
inventory.opname.confirm            -    ✓    ✓    -    -    -
inventory.waste.request             -    -    -    -    ✓    -
inventory.waste.approve             -    ✓    ✓    -    -    -
inventory.view_quantity             ✓    ✓    ✓    -    ✓    -
inventory.view_value                ✓    ✓    ✓    -    -    -
pos.checkout                        -    ✓*   ✓*   ✓    -    -
pos.shift_open                      -    -    -    ✓    ✓    -
pos.shift_close                     -    -    -    ✓    ✓    -
pos.void.request                    -    -    -    ✓    ✓    -
pos.void.approve                    -    ✓    ✓    -    -    -
pos.refund.request                  -    -    -    ✓    ✓    -
pos.refund.approve                  -    ✓    ✓    -    -    -
pos.manager_override               -    ✓    ✓    -    -    -
approval.view                       -    ✓    ✓    -    -    -
po.create                           ✓    ✓    ✓    -    -    -
po.approve                          -    ✓    ✓**  -    -    -
receiving.create                    ✓    ✓    ✓    -    ✓    -
supplier.invoice.record             -    ✓    -    -    -    -
supplier.payment                    -    ✓    -    -    -    -
cost.view_hpp                       ✓*** ✓    ✓    -    -    -
cost.view_true_cost                 ✓*** ✓    ✓    -    -    -
cost.finalize                       -    ✓    -    -    -    -
report.daily                        -    ✓    ✓    -    -    -
report.financial                    -    ✓    ✓    -    -    -
report.export                       -    ✓    ✓    -    -    -
reconciliation.run                  ✓    ✓    -    -    -    -
reconciliation.acknowledge          -    ✓    ✓    -    -    -
migration.create                    -    ✓    -    -    -    -
migration.approve                   ✓    -    -    -    -    -
migration.rollback                  ✓    -    -    -    -    -
audit.view_own_tenant               -    ✓    -    -    -    -
audit.view_all                      ✓    -    -    -    -    -
audit.verify_chain                  ✓    ✓    -    -    -    -
google.connect                      -    ✓    -    -    -    -
totp.enroll                         ✓    ✓    -    -    -    -
closing.lock                        -    ✓    -    -    -    -
closing.unlock                      ✓*** -    -    -    -    -
```

Catatan:
- `✓*` Owner/Manager bisa checkout hanya jika `Outlet.allowSelfCashier = true`. Default **false**.
- `✓**` Manager bisa PO approve sampai batas nominal. Di atas batas = Owner.
- `✓***` Super Admin: hanya dengan break-glass access.

### 2.3 Aturan Guard

1. Setiap rute di `server/routes/**` wajib memakai `guard({ permission, outletScope, audit })`. Route scanner gagal build bila ada rute tanpa guard di luar daftar publik.
2. `tenantId`, `outletId`, `permission` hanya dari sesi server. Dilarang dari header, query, body.
3. Multi-outlet: `POST /api/session/outlet`, divalidasi terhadap `UserOutlet`.
4. Serializer per peran membuang field biaya untuk Kasir/Barista. Test scanner memindai semua respons Kasir dan gagal bila ada kunci `unitCost`, `hpp`, `hppFifo`, `hppAverage`, `margin`, `trueCost`, `costPrice`, `poolAmount`, `idleCost`, `capacityRatio`.

### 2.4 Manager Override PIN

Manager Override PIN adalah jalur otorisasi **satu aksi** di POS, tanpa login sesi penuh.

**Aturan:**
1. Manager dan Owner punya `managerPinHash` (bcryptjs) terpisah dari `pinHash` Kasir/Barista.
2. PIN di-set Owner via `POST /api/users/:id/set-manager-pin` (butuh TOTP Owner).
3. Endpoint: `POST /api/pos/manager-override` dengan `{ actionType, entityId, reason, managerPin }` dan `Idempotency-Key`.
4. `actionType` yang diizinkan: `VOID`, `REFUND`, `DISCOUNT_OVERRIDE`, `OPEN_DRAWER`, `PRICE_OVERRIDE`.
5. **Tidak** untuk aksi TOTP (finalisasi True Cost, break-glass, receipt recovery >10, komit migrasi, extend migration grace, abandon queue).
6. Rate limit: 5 percobaan per 15 menit per perangkat. 3 salah berturut-turut → kunci 15 menit.
7. Setiap override menulis `AuditLog` dengan `actorRole = MANAGER`, `sessionUser = CASHIER`, `overrideUsed = true`, `actionType`, `entityId`, `reason`.
8. PIN Manager tidak bisa login sesi penuh; `/api/auth/pin-login` menolak role `MANAGER`/`OWNER`.

### 2.5 Super Admin Break-Glass Access

1. `POST /api/admin/break-glass` dengan `{ tenantId, reason, durationMinutes }` (maks 60 menit).
2. Sistem membuat `BreakGlassGrant` + `AuditLog`.
3. Selama aktif, `cost.view_hpp`/`cost.view_true_cost` berlaku untuk tenant itu; semua akses `accessMode = BREAK_GLASS`.
4. Owner menerima notifikasi saat grant dibuat dan dipakai.
5. Grant juga dibutuhkan untuk `receipt_recovery` gap >100 nomor, `closing.unlock`, `extend_migration_grace`.

---

## 3. Model Akuntansi

### 3.1 Keputusan: Parallel Ledger

1. **Setiap outlet punya satu engine utama** (`Outlet.primaryCosting` = `FIFO`/`AVERAGE`, default `AVERAGE`).
2. **General Ledger resmi** hanya memuat jurnal engine utama (`engine = COMMON` + `engine = PRIMARY`).
3. **Engine sekunder** menulis jurnal `engine = SECONDARY` dengan `isMemo = true`. Tidak dijumlahkan di GL, dipakai untuk perbandingan dan R3 mesin sekunder.
4. **Tidak ada agregasi `JournalLine` lintas engine tanpa filter `isMemo = false`.** Linter/test menegakkan.

### 3.2 Chart of Accounts (COA) Minimal

| Kode | Nama | Tipe | Sifat |
|---|---|---|---|
| 1000 | Kas | Asset | Debit normal |
| 1010 | Bank | Asset | Debit normal |
| 1100 | Persediaan Bahan Baku | Asset | Debit normal |
| 1110 | Persediaan Kemasan | Asset | Debit normal |
| 2000 | Utang Usaha | Liability | Kredit normal |
| 2010 | Utang Pajak | Liability | Kredit normal |
| 2020 | Utang Tip | Liability | Kredit normal |
| 3000 | Ekuitas Saldo Awal | Equity | Kredit normal |
| 4000 | Pendapatan Penjualan | Revenue | Kredit normal |
| 4010 | Retur Penjualan | Revenue (contra) | Debit normal |
| 4020 | Service Charge | Revenue | Kredit normal |
| 5000 | HPP Bahan Baku | Expense | Debit normal |
| 5010 | HPP Kemasan | Expense | Debit normal |
| 5020 | HPP Modifier | Expense | Debit normal |
| 5100 | Beban Waste | Expense | Debit normal |
| 5110 | Beban Selisih Persediaan | Expense | Debit normal |
| 6000 | Beban Tenaga Kerja | Expense | Debit normal |
| 6010 | Beban Utilitas | Expense | Debit normal |
| 6020 | Beban Sewa | Expense | Debit normal |
| 6030 | Beban Operasional Lain | Expense | Debit normal |
| 7000 | Selisih Kas | Expense/Revenue | Dua arah |
| 8000 | Biaya Menganggur (Idle Cost) | Expense | Debit normal |

### 3.3 Posting Matrix

| Movement | COMMON | Engine PRIMARY (memo=false) | Engine SECONDARY (memo=true) |
|---|---|---|---|
| `RECEIPT` | Dr 1100/1110, Cr 2000/1000 | — | — |
| `SALE` | Dr 1000/1010, Cr 4000 (`netAfterDiscount`), Cr 4020 (`serviceChargeAmount`), Cr 2010 (`taxAmount`), Cr 2020 (`tipAmount`) | Dr 5000/5010/5020, Cr 1100/1110 | Dr 5000/5010/5020, Cr 1100/1110 (memo) |
| `VOID_RESTORE` | Reversal COMMON | Reversal PRIMARY | Reversal SECONDARY (memo) |
| `REFUND_RESTOCK` | Dr 4010, Cr 1000 | Dr 1100/1110, Cr 5000/5010/5020 | Sama (memo) |
| `REFUND_NO_RESTOCK` | Dr 4010, Cr 1000 | — | — |
| `WASTE` | — | Dr 5100, Cr 1100/1110 | Dr 5100, Cr 1100/1110 (memo) |
| `OPNAME_LESS` | — | Dr 5110, Cr 1100/1110 | Dr 5110, Cr 1100/1110 (memo) |
| `OPNAME_MORE` | — | Dr 1100/1110, Cr 5110 | Dr 1100/1110, Cr 5110 (memo) |
| `SUPPLIER_RETURN` | Dr 2000/1000, Cr 1100/1110 | — | — |
| `OPENING` | Dr 1100/1110, Cr 3000 | — | — |
| `LABOR_WAGE` | Dr 6000, Cr 1000 | — | — |
| `EXPENSE` | Dr 6010/6020/6030, Cr 1000/1010 | — | — |
| `IDLE_COST` (akhir bulan) | — | Dr 8000, Cr 6000/6010/6020/6030 | — |

**Aturan kuantitatif:**
- `Cr 4000` = `netAfterDiscount` (setelah diskon, sebelum SC/pajak/tip).
- `Cr 4020` = `serviceChargeAmount` (tidak masuk pool biaya, lihat §8.9a).
- `Cr 2010` = `taxAmount`.
- `Cr 2020` = `tipAmount`.

### 3.4 R3 Dipertegas

1. Setiap `JournalEntry` seimbang (`Σdebit = Σcredit`).
2. Engine utama: `saldo(1100) + saldo(1110) pada jurnal isMemo=false` = `Σ InventoryValuation.totalValue untuk engine utama`.
3. Engine sekunder: `saldo memo(1100) + saldo memo(1110)` = `Σ InventoryValuation.totalValue untuk engine sekunder`.
4. **Tidak ada** penjumlahan lintas engine dalam laporan keuangan.

### 3.5 Audit Chain Locking

- Sebelum menulis `AuditLog`, ambil `pg_advisory_xact_lock(hashtext('audit:' || tenantId))`.
- Hash: `sha256(prevHash || canonical_json(row))`.
- Job harian `audit:verify` memeriksa seluruh rantai per tenant.

---

## 4. Stack, Vibe Coding, State

### 4.1 Stack Terkunci

**Backend:** Node 22, Fastify 5, TypeScript strict, Prisma, PostgreSQL 16, Zod, decimal.js, BullMQ + Redis 7, firebase-admin, bcryptjs, otplib, exceljs, googleapis, helmet, @fastify/cookie, @fastify/csrf-protection, @fastify/rate-limit, winston.

**Frontend:** React 19, Vite 6, Tailwind 4, Zustand, TanStack Query, react-router-dom, lucide-react, recharts, motion.

**Testing:** node:test + supertest (server), Vitest + Testing Library + jsdom (komponen), Playwright (e2e), autocannon (load).

**Deployment:** Docker, Docker Compose (dev), GitHub Actions, PostgreSQL 16, Redis 7, Caddy/Nginx, Let's Encrypt.

Versi paket exact di `package.json` dan `STACK.md`. Dependensi baru hanya yang disebut fase aktif.

### 4.2 Empat Pengaman Utama

1. **Stack terkunci.** Satu bahasa, satu repo, satu DB.
2. **Gerbang verifikasi.** Lima perintah lulus: `typecheck`, `lint`, `test`, `build`, `prisma migrate status`.
3. **Berhenti dan tanya** bila ambigu.
4. **Biaya tidak ditebak.** Setiap angka dari fungsi deterministik. **Formula uang diuji aljabar sebelum diimplementasikan.**

### 4.3 Aturan Kode (Ringkas)

1. Dilarang `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable` tanpa alasan tertulis.
2. Semua input API divalidasi Zod strict.
3. Kode domain di `server/domain/*` sebagai fungsi murni (tanpa Fastify/Prisma).
4. Setiap rute memakai `guard({ permission, outletScope, audit })`.
5. `tenantId`, `outletId`, `permission` hanya dari sesi server.
6. Teks UI Bahasa Indonesia. Nama kode/tabel/variabel Bahasa Inggris.
7. Tampilan dipertahankan (§14). Komponen baru memakai `Button`, `Input`, `Modal`.
8. Dilarang mock di build produksi. Boot ditolak bila `NODE_ENV=production` dan ada rute mock.
9. Uang = `Decimal(18,0)` rupiah bulat. Kuantitas = `Decimal(18,4)`. Biaya satuan = `Decimal(18,4)`. Dilarang `Float`/`number`.
10. Pembulatan half-up ke rupiah hanya saat posting jurnal. Alokasi memakai **largest remainder**.
11. Setiap mutasi uang/stok dalam SATU transaksi DB dengan lock baris.
12. Ledger, pergerakan stok, valuasi, audit log **append-only**. Koreksi = jurnal pembalik.
13. Kuantitas fisik ditulis **hanya** oleh `PhysicalStockService`.
14. HPP, True Cost, margin hanya dihitung fungsi deterministik di `server/domain`.
15. Kasir tidak pernah menerima data biaya.
16. Waktu dalam UTC. `business_date` dari timezone outlet.
17. Mutasi POS memakai `client_uuid`, `device_id`, `occurred_at`, `Idempotency-Key = client_uuid`.
18. Kerjakan hanya fase aktif.
19. Sebelum mengubah file, baca file itu. Awali fase dengan gerbang kondisi awal.
20. Migrasi yang sudah di-commit tidak boleh diubah.
21. Dilarang menghapus/melemahkan test.
22. Fase selesai hanya bila gerbang lulus.
23. Spesifikasi ambigu → bertanya.
24. Secret hanya dari env. Server menolak boot bila secret wajib kosong, placeholder, atau `SECRETS_ENC_KEY` bukan 32 byte.
25. **Formula biaya wajib diuji aljabar** (substitusi simbolik) sebelum diimplementasikan. Test unit harus mencakup low-sales, full-capacity, over-capacity, empty, edge case (nol, negatif, pecahan).
26. **Urutan operasi struk mengikuti §8.9a secara ketat.** Dilarang mengubah urutan tanpa revisi PRD.

### 4.4 State Management & Context Dilution Mitigation

**State files wajib:**

| File | Isi | Update |
|---|---|---|
| `AGENTS.md` | Aturan proyek (§4.3) | Sekali |
| `STACK.md` | Versi paket exact | Setiap fase |
| `STATE.md` | Fase terakhir, tag git, migrasi, route, known issues, next phase | Setiap akhir fase |
| `DECISIONS.md` | Keputusan P0 final + tanggal + alasan | Setiap keputusan |
| `docs/PRD.md` | Dokumen ini (PRD V1) | Jarang |
| `docs/RUNBOOK.md` | Operasi, backup, restore, incident | Fase 10 |
| `docs/DEPLOY.md` | Deployment guide | Fase 10 |

**Pre-phase recap wajib:** sebelum menulis kode, agen:
1. Baca `AGENTS.md`, `STATE.md`, `DECISIONS.md`.
2. Ringkas 3 aturan utama dari fase sebelumnya yang tidak boleh dilanggar.
3. Jalankan gerbang standar.
4. Baru mulai.

**Akhir fase:** update `STATE.md`, commit `fase N: ringkasan`, tag `fase-N`, laporkan.

Tiga percobaan gagal → `git reset --hard fase-(N-1)`, ulangi dengan prompt lebih sempit.

---

## 5. Model Data

### 5.1 Konvensi

- Skema memakai tabel yang ada di `prisma/schema.prisma`, menambah/mengubah yang dibutuhkan.
- **Tenant** = akun bisnis Owner. Satu tenant boleh punya banyak **Outlet**.
- Setiap tabel transaksi memuat `tenantId`, `outletId`, `businessDate`, `createdAt`, `createdBy`.
- Tipe: Uang `Decimal(18,0)`, kuantitas `Decimal(18,4)`, biaya satuan `Decimal(18,4)`, persentase `Decimal(9,4)`.
- JSON bertipe `Json`. Enum Prisma untuk `role`, `status`, `method`, `type`.
- Primary key `uuid`. Soft delete untuk master data.
- **Multi-owner:** `Tenant.primaryOwnerId` menunjuk Owner utama.
- **Supplier global:** dikurasi Super Admin. `PurchaseOrder` terikat ke `tenantId` + `Supplier.id`.

### 5.2 Tabel Inti

**Tenant:** `primaryOwnerId`, `timezone` (default `Asia/Jakarta`), `isTaxInclusive` (bool), `taxServiceChargeIncluded` (bool, default true), `serviceChargeRate` (Decimal). Hapus `isDemo`, `demoCreatedAt`.

**UserProfile:** `email` unik, `googleSub`, `role` (enum 6 peran), `status` (`INVITED`/`ACTIVE`/`SUSPENDED`), `totpSecretEnc`, `totpEnabled`, `pinHash` (Kasir/Barista), `managerPinHash` (Manager/Owner), `managerPinSetAt`, `managerPinSetBy`. Hapus `assignedOutlets`.

**Outlet:** `code` (3 huruf), `primaryCosting` (default `AVERAGE`), `allowNegativeStock` (default false), `allowSelfCashier` (default false), `timezone` (opsional), `migrationGraceStartedAt`, `migrationGraceTotalPausedMs`, `migrationGraceExtendedAt`, `migrationGraceUsedAt`, `migrationGraceExpiresAt`.

**Item:** `kind` (`RAW`/`PACKAGING`), `baseUnitId`, `estimatedUnitCost`, `referencePrice`.

**RecipeDetail:** `componentType` (`MATERIAL`/`PACKAGING`/`MODIFIER`), `wastePercent`, `quantity`.

**RecipeVersionSnapshot:** `tenantId`, `menuId`, `version` (int), `recipeHash` (SHA-256), `snapshotJson`, `effectiveFrom`, `effectiveUntil`. Dibuat otomatis saat resep diubah.

**Menu:** `prepMinutes`, `allocationWeight` (default 1), `variantGroupId`.

**VariantGroup:** `menuId`, `name`, `required`. **VariantOption:** `groupId`, `name`, `priceDelta`, `recipeAdjustment` Json.

**InventoryBalance:** `currentStock`, `averageCost`, `averageValue`, `hasEstimatedLayer`, `migrationPending`.

**FifoLayer:** `isVirtual`, `costSource` (`PURCHASE`/`OPENING`/`ESTIMATED`), `sourceRef`, `estimatedReason`.

**InventoryLedger:** `movementType` (`RECEIPT`/`SALE`/`VOID_RESTORE`/`REFUND_RESTOCK`/`WASTE`/`OPNAME`/`SUPPLIER_RETURN`/`OPENING`).

**InventoryValuation:** `ledgerId`, `engine` (`FIFO`/`AVG`), `unitCost`, `totalValue`, `lotAllocations` Json, `costSource`.

**SalesHeader:** `clientUuid` (unik per tenant), `deviceId`, `occurredAt`, `syncedAt`, `source` (`LIVE`/`OFFLINE_SYNC`/`MIGRATION`), `hppFifo`, `hppAverage`, `hppBreakdown` Json, `hppEstimated` bool, `hppStatus` (`OK`/`UNAVAILABLE`/`ESTIMATED`/`PENDING_MIGRATION`), `originalBusinessDate`, `migrationPending` bool, **`subtotal`**, **`cartDiscountAmount`**, **`cartDiscountPresetId`**, **`netAfterDiscount`**, **`serviceChargeAmount`**, **`taxBase`**, **`taxAmount`**, **`grossAmount`**, **`tipAmount`**, **`serviceChargeRate`**, **`taxRate`**, **`taxServiceChargeIncluded`**, **`isTaxInclusive`**, **`total`**.

**SalesDetail:** `hppFifo`, `hppAverage`, `hppBreakdown` Json, `recipeSnapshot` Json, `recipeVersion` (int), **`lineBase`**, **`lineDiscount`**, **`lineNet`**, **`lineHppBase`**, **`appliedDiscountPresetId`**, **`appliedManualDiscount`**.

**JournalEntry:** `engine` (`COMMON`/`PRIMARY`/`SECONDARY`), `isMemo` bool, `reversesId`, `postedAt`, `status`. `debit`/`credit` Decimal(18,0).

**JournalLine:** append-only setelah POSTED.

**StockOpnameSession:** `blindCount`, `countedBy`, `approvalId`, **`pendingSnapshot` Json**, **`hasPendingOffline` bool**, **`autoReconciled` bool**.

**Approval:** `type` (`VOID`/`REFUND`/`OPNAME`/`WASTE`/`DAY_UNLOCK`/`PO`/`OFFLINE_REVIEW`/`MANAGER_OVERRIDE`), `entityId`, `requestedBy`, `decidedBy`, `status`, `reason`, `amount`.

**DailyClosing:** `status` (`DRAFT`/`LOCKED`), `snapshot` Json, `lockedBy`, `lockedAt`, `migrationPending` bool.

**Expense:** `poolId`, `category`, `amount`, `allocationMode` (`ON_DATE`/`SPREAD_MONTH`), `paidVia`, `attachmentUrl`, `occurredOn`.

**StaffRate & WageEntry:** `rateType`, `base`, `bonus`, `tipShare`, `poolId`.

**CostPool:** `kind` (`LABOR`/`UTILITY`/`RENT`/`OTHER`), `basis` (`UNITS`/`MINUTES`/`REVENUE`/`DIRECT_COST`), `expectedMonthlyAmount`, `active`, `targetMonthlyUnits`, `targetMonthlyMinutes`, `targetMonthlyRevenue`, `targetMonthlyHpp`.

**TrueCostSnapshot:** `periodType` (`DAY`/`MONTH`), `periodKey`, `menuId`, `units`, `revenueNet`, `hppFifo`, `hppAverage`, `alokasiPerPool` Json, `trueCostFifo`, `trueCostAverage`, `totalHpp`, `totalAllocation`, `totalTrueCost`, `perUnitTrueCost`, `idleCost`, `capacityRatio`, **`provisionalConfidence`** (`HIGH`/`MEDIUM`/`LOW`), **`provisionalDetails` Json**, `status` (`PROVISIONAL`/`FINAL`), `trustLevel`, `supersedesId`.

**ItemSupplierLink:** `itemId`, `catalogId`, `conversionFactor`.

**PriceContract:** `supplierId`, `catalogId`, `price`, `validFrom`, `validTo`.

**Shipment:** `purchaseOrderId`, `carrier`, `trackingNo`, `status`, `shippedAt`.

**SupplierInvoice & SupplierPayment.**

**DiscountPreset:** `tenantId`, `outletId`, `name`, `type` (`PERCENT`/`AMOUNT`), `value`, `applicableMenuIds` Json, `level` (`LINE`/`CART`), `approvedBy`, `approvedAt`, `approvalVersion` (int), `active`, **`versionHash`** (SHA-256 dari isi preset).

**MigrationJob:** `entityScope`, `fileHash`, `stage`, `checksum`, `approvedBy`.

**MigrationRow, MigrationMapping, MigrationCheck.**

**OfflineTransaction:** `deviceId`, `clientUuid` (unik), `resultStatus`, `flags` Json, `receivedAt`.

**AuditLog:** `outletId`, `actorRole`, `prevHash`, `hash`, `accessMode` (`NORMAL`/`BREAK_GLASS`), `requestId`, `overrideUsed` bool, `actionType`.

**Device:** `tenantId`, `outletId`, `code`, `name`, `status` (`PENDING`/`ACTIVE`/`REVOKED`), `registeredBy`, `lastSeenAt`, `lastReceiptSeqPerDay` Json.

**Session:** `id` (jti), `userId`, `deviceId`, `expiresAt`, `revokedAt`, `ip`, `userAgent`.

**BreakGlassGrant:** `adminId`, `tenantId`, `reason`, `grantedAt`, `expiresAt`, `revokedAt`.

**ReceiptSequenceRecovery:** `deviceId`, `businessDate`, `missingFrom`, `missingTo`, `reason`, `approvedBy`, `createdAt`.

**ReconciliationRun:** `outletId`, `businessDate`, `trigger`, `checks` Json (R1–R8), `status`.

**ExportJob, BackupRun, SheetConnection, NotificationChannel.**

### 5.3 Aturan Integritas

- Role DB aplikasi **tidak punya** `UPDATE`/`DELETE` pada `AuditLog`, `InventoryLedger`, `InventoryValuation`, `FifoConsumption`, `JournalEntry` (POSTED), `JournalLine`, `TrueCostSnapshot` FINAL. Trigger menolak.
- Setiap `JournalEntry` seimbang (constraint trigger deferred).
- `CHECK remainingQty >= 0` pada `FifoLayer`.
- **`CHECK (currentStock >= 0 OR hasEstimatedLayer = true OR migrationPending = true)`** pada `InventoryBalance`.
- Unik: `SalesHeader (tenantId, clientUuid)`, `SalesHeader (tenantId, outletId, invoiceNumber)`, `OfflineTransaction (tenantId, clientUuid)`.
- **`CHECK lineDiscount <= lineBase`** pada `SalesDetail`.
- **`CHECK total = grossAmount + tipAmount`** pada `SalesHeader`.
- Rantai hash audit per tenant.
- Setiap query tabel ber-`tenantId` lewat helper tenant-scoped.
- Migrasi Fase 2 tanpa kehilangan data: Float → Decimal, selisih dilaporkan.

---

## 6. Mesin Biaya Fisik (FIFO dan Average)

### 6.1 Prinsip

Satu realitas fisik (`InventoryLedger`), dua valuasi (`InventoryValuation`), satu interpretasi ekonomi (True Cost). Kuantitas identik di kedua mesin; nilai boleh berbeda secara wajar.

### 6.2 Perubahan dari v1

- `CostEngineFactory` berbasis paket **dihapus**.
- `PhysicalStockService` satu-satunya penulis kuantitas.
- Setiap pergerakan dinilai oleh **kedua** mesin dalam satu transaksi; hasil di `InventoryValuation` (dua baris).
- `Outlet.primaryCosting` menentukan engine utama untuk GL dan HPP default.
- Algoritma FIFO/Average dipindah menjadi **fungsi murni** di `server/domain/costing/`.

### 6.3 Kontrak Fungsi Murni

```ts
fifoReceive(layers, { qty, unitCost, source, ref, reason? }) -> layers
fifoConsume(layers, qty) -> { allocations[{ layerId, qty, unitCost }], totalCost, layers }
avgReceive(state, { qty, unitCost }) -> state
avgConsume(state, qty) -> { unitCost, totalCost, state }
// Gagal INSUFFICIENT_STOCK bila qty melebihi stok dan outlet tidak mengizinkan
// stok negatif dan bukan transaksi offline ber-flag.
```

### 6.4 Urutan Satu Transaksi

1. Kunci baris `InventoryBalance` menurut `itemId` ascending.
2. `PhysicalStockService` menulis `InventoryLedger`, update `currentStock`.
3. Mesin FIFO update `FifoLayer` + `FifoConsumption`; Average update `averageCost` + `averageValue`.
4. Tulis dua baris `InventoryValuation` (FIFO, AVG).
5. Posting jurnal `COMMON`, `PRIMARY`, `SECONDARY` (memo) sesuai §3.3.
6. Tulis `AuditLog` dengan advisory lock.
7. Bila gagal satu langkah, transaksi dibatalkan.

**Untuk `OfflineTransaction` dengan `recipeVersion` historis:** langkah 3 memakai resep dari `RecipeVersionSnapshot` (§10.7a).

### 6.5 Rumus

- **FIFO:** konsumsi lot tertua. `cost = Σ(qty_taken × unitCost_lot)`.
- **Average masuk:** `newAvg = (qty_old × avg_old + qty_in × cost_in) / (qty_old + qty_in)`.
- **Average keluar:** `cost = qty × avg_current`. Rata-rata tidak berubah.
- **Konsumsi resep:** `qty = recipeQty × (1 + wastePercent) × portions`.

### 6.6 Fixture A3 (Regression Wajib)

| Langkah | FIFO | Average |
|---|---|---|
| Terima 1.000 g @ Rp200 | Lot A: 1.000 @ 200 | Qty 1.000, avg 200 |
| Terima 1.000 g @ Rp300 | Lot B: 1.000 @ 300 | Qty 2.000, avg 250 |
| Konsumsi 1.500 g | HPP = 1.000×200 + 500×300 = **Rp350.000** | HPP = 1.500×250 = **Rp375.000** |
| Sisa | 500 g, nilai Rp150.000 | 500 g, nilai Rp125.000 |
| Konsumsi 500 g lagi | HPP = 500×300 = Rp150.000 | HPP = 500×250 = Rp125.000 |
| **Total setelah habis** | **Rp500.000** | **Rp500.000** |

### 6.7 Aturan per Movement

| Movement | Fisik | Nilai | Jurnal |
|---|---|---|---|
| `RECEIPT` | +qty | Lot FIFO baru; avg berbobot | COMMON: Dr Persediaan, Cr Utang/Kas |
| `SALE` | −qty resep | Konsumsi per mesin (resep historis untuk offline) | COMMON + PRIMARY + SECONDARY (memo) |
| `VOID_RESTORE` | +qty | Nilai konsumsi asli | Reversal |
| `REFUND_RESTOCK` | +qty | Sama | Dr Retur Penjualan, Cr Kas + Dr Persediaan, Cr HPP |
| `REFUND_NO_RESTOCK` | — | — | Dr Retur Penjualan, Cr Kas |
| `WASTE` | −qty | Konsumsi per mesin | Dr Beban Waste, Cr Persediaan |
| `OPNAME_LESS` | −selisih | Seperti WASTE | Dr Beban Selisih, Cr Persediaan |
| `OPNAME_MORE` | +selisih | Lot baru biaya penerimaan terakhir; bila belum ada → biaya manual + reason + ESTIMATED | Dr Persediaan, Cr Beban Selisih |
| `SUPPLIER_RETURN` | −qty | Biaya penerimaan asal | Dr Utang/Kas, Cr Persediaan |
| `OPENING` | +qty | Lot `OPENING` dengan biaya eksplisit | Dr Persediaan, Cr Ekuitas Saldo Awal |

### 6.8 Stok Negatif, Estimasi, Migration Grace

1. **Default:** stok tidak boleh negatif. Menu kurang ditandai **Habis** di POS.
2. **Jika `Outlet.allowNegativeStock = true` ATAU penjualan offline saat stok habis:**
   - Konsumsi `ESTIMATED`.
   - **Zero-history fallback:** jika item belum pernah ada penerimaan:
     - HPP sementara = `Item.estimatedUnitCost`.
     - Jika kosong → **`BIZ-006 ZERO_HISTORY_ESTIMATED_COST`**, alert kritis Owner + SA.
     - `hppEstimated = true`, `costSource = ESTIMATED`, `estimatedReason = 'ZERO_HISTORY'`.
   - `true-up` saat penerimaan berikutnya dibukukan ke HPP periode berjalan. Penjualan lama **tidak diubah**.
3. **Constraint:** `CHECK (currentStock >= 0 OR hasEstimatedLayer OR migrationPending)`.
4. **Alert:** `ESTIMATED_COST_USED` (info) → Manager; `ZERO_HISTORY_ESTIMATED` (critical) → Owner + SA, blokir `closing.lock` kecuali `PENDING_MIGRATION`.
5. **Migration grace period (v2.1 final):**
   - Outlet baru `cutoverDate` (≤72 jam): penjualan `ZERO_HISTORY` disimpan `PENDING_MIGRATION`, `costSource = PENDING_OPENING`, `migrationPending = true`.
   - Saat batch migrasi Level 2 `COMMITTED` → semua `PENDING_MIGRATION` diproses ulang pakai lot `OPENING`.
   - **Timer:**
     - Mulai saat `Outlet.migrationGraceStartedAt`.
     - Default deadline `startedAt + 24 jam`.
     - **Pause otomatis** jika ada `MigrationJob` dengan `stage ∈ {UPLOADED, MAPPED, NORMALIZED, VALIDATED, RECONCILED}`.
     - **Resume** saat tidak ada job aktif selama 30 menit.
     - **Cap total pause 48 jam kumulatif.**
     - **Hard deadline `startedAt + 72 jam`.**
     - **Ekstensi:** SA `POST /api/devices/:id/extend-migration-grace` dengan TOTP, maks +24 jam (hard deadline 96 jam), sekali per outlet.
     - Melewati hard deadline → `REJECTED BIZ-012 MIGRATION_GRACE_EXPIRED`, alert ZH1 + MG1.
   - **Batasan:**
     - Hanya berlaku jika outlet belum punya transaksi `COMMITTED` sebelumnya.
     - Hanya sekali per outlet (`Outlet.migrationGraceUsedAt`).
   - Selama `PENDING_MIGRATION`, margin tidak dihitung (tampil "Menunggu saldo awal migrasi").
   - `PENDING_MIGRATION` **tidak memblokir** closing; `DailyClosing.migrationPending = true`, banner UI.
   - R7 **tidak gagal** untuk `PENDING_MIGRATION`; R1–R3 lulus karena tidak ada pergerakan stok fisik.
   - **Opname:** `PENDING_MIGRATION` untuk item yang dihitung **memblokir** konfirmasi opname (§8.4a) kecuali override dengan alasan.

### 6.9 Rekonsiliasi R1–R8

| Kode | Pemeriksaan | Lulus bila | Gagal |
|---|---|---|---|
| **R1** | Kuantitas sama | `currentStock` = `Σ FifoLayer.remainingQty` = `Σ (qtyIn − qtyOut)` | Kritis |
| **R2** | Konservasi nilai | Per engine: awal + penerimaan + saldo awal + lebih − HPP − waste − kurang = akhir (toleransi Rp1/movement) | Kritis |
| **R3** | Jurnal seimbang | Setiap entry seimbang; saldo Persediaan engine utama = nilai stok engine utama; saldo memo engine sekunder = nilai stok engine sekunder; tanpa agregasi lintas engine | Kritis |
| **R4** | Selisih valuasi | Selisih HPP FIFO vs Average < 10% HPP Average pada 7 hari | Peringatan |
| **R5** | Teoretis vs aktual | `qty_resep × terjual` vs `(awal + masuk − opname − waste)`; ≤5%/item/minggu | Peringatan >5%, kritis >10% |
| **R6** | Kas per shift | Selisih ≤ Rp10.000 | Peringatan >Rp10.000, kritis >Rp50.000 |
| **R7** | Penjualan, pembayaran, HPP | **`Σ payments = grossAmount + tipAmount`**; setiap baris selesai punya `hppFifo`/`hppAverage` (kecuali `UNAVAILABLE`/`PENDING_MIGRATION`) | Kritis |
| **R8** | Audit dan nomor struk | Rantai hash utuh; nomor struk per perangkat per hari tanpa celah tak terjelaskan (recovery = lulus + badge) | Kritis |

**R7 v2.1:** Diperbarui untuk formula struk §8.9a. `Σ payments = grossAmount + tipAmount` (bukan `total` lama).

Job rekonsiliasi: malam 00:30 + setelah penerimaan, opname, komit migrasi, kunci hari, sinkron offline. Hasil di `ReconciliationRun`. Gagal → alert + notifikasi.

### 6.10 Test Wajib Fase 3

- Fixture A3.
- Regression `p0_financial` #6 (Average) dan #7 (FIFO).
- Property test PRNG ber-seed: 1.000 urutan acak → R1–R3 lulus.
- Konkurensi: 20 penjualan bersamaan → stok benar, lot valid, nomor struk unik.
- **Negative:** dua jurnal engine dijumlahkan → linter tolak; `currentStock` negatif tanpa flag → constraint gagal.
- **ESTIMATED:** zero-history + blokir closing.
- **Migration grace:** penjualan pagi cutover → `PENDING_MIGRATION`; commit migrasi → `DONE`; hard deadline lewat → `REJECTED BIZ-012`.
- **Recipe version:** resep 150ml → offline → resep 200ml → sync → potong 150ml, `SalesDetail.recipeSnapshot` historis, R1 lulus.
- **R7 formula:** struk §8.9a → `Σ payments = grossAmount + tipAmount`.

---

## 7. True Cost Engine (Capacity-Based + Robust Provisional)

### 7.1 Definisi Formal

Untuk produk `p`, periode `t`, engine `e ∈ {FIFO, AVG}`:

```
Material(p,e)   = Σ komponen MATERIAL: qty × (1 + waste%) × unitCost_e saat dijual
Packaging(p,e)  = Σ komponen PACKAGING: rumus sama
Modifier(p,e)   = Σ modifier yang dipilih saat penjualan
HPP(p,e)        = Material + Packaging + Modifier

Capacity(k)     = kapasitas teoretis normal per basis:
                  UNITS       → targetMonthlyUnits × allocationWeight(p)
                  MINUTES     → targetMonthlyMinutes × allocationWeight(p)
                  REVENUE     → targetMonthlyRevenue
                  DIRECT_COST → targetMonthlyHpp

weight(p,k,e)   = UNITS → units(p) × allocationWeight(p)
                  MINUTES → units(p) × prepMinutes(p)
                  REVENUE → revenueNet(p)
                  DIRECT_COST → HPPTotal(p,e)

capacityRatio(k) = min(1, Σ_p weight(p,k,e) / Capacity(k))      // 0 jika Σ weight = 0

AlokasiTotal(p,k,e) = Pool(k,t) × capacityRatio(k) × weight(p,k,e) / Σ_p weight(p,k,e)   [jika Σ weight > 0]
                    = 0                                                                   [jika Σ weight = 0]

IdleCost(k) = Pool(k,t) × (1 − capacityRatio(k))

TrueCostTotal(p,e)   = Σ SalesDetail.hppTotal(p,e) + Σ_k AlokasiTotal(p,k,e)
TrueCostPerUnit(p,e) = TrueCostTotal(p,e) / units(p)
TrueMargin(p,e)      = (NetPrice(p) − TrueCostPerUnit(p,e)) / NetPrice(p)
```

**Aturan pembulatan:**
- Alokasi per produk memakai **largest remainder**, tie-break `menuId` ascending.
- `Σ_p AlokasiTotal + IdleCost = Pool` tepat (dalam rupiah bulat).
- `TrueCostSnapshot` menyimpan total dan per unit sebagai `Decimal(18,4)`; pembulatan ke rupiah hanya saat jurnal.
- `capacityRatio` disimpan di snapshot sebagai `Decimal(9,4)`.

### 7.2 Verifikasi Formula (Wajib di Test)

| Skenario | Realisasi | Capacity | capacityRatio | Σ Alokasi | IdleCost |
|---|---|---|---|---|---|
| Low sales | 10 | 3.000 | 0,00333 | Rp33.333 | Rp9.966.667 |
| Full capacity | 3.000 | 3.000 | 1 | Rp10.000.000 | Rp0 |
| Over capacity | 3.500 | 3.000 | 1 | Rp10.000.000 | Rp0 |
| Empty month | 0 | 3.000 | 0 | Rp0 | Rp10.000.000 |

### 7.3 Biaya Realisasi vs Standar

| Jenis | Cara hitung | Dipakai untuk |
|---|---|---|
| **Realisasi** | `Σ SalesDetail.hppBreakdown` per mesin. Tidak menghitung ulang resep | Laporan, True Cost, jurnal |
| **Standar** | Resep aktif × biaya mesin saat ini, ditandai `STANDAR` | Harga menu, simulasi. Tidak masuk jurnal/laporan |

`Recipe.version`, `effectiveFrom`, `effectiveUntil`. Mengubah resep tidak mengubah penjualan lama (`SalesDetail.recipeSnapshot`).

### 7.4 Dynamic Provisional Cost (Robust)

Untuk setiap pool `k` di bulan berjalan:

1. `actualToDate(k)` = Σ aktual `WageEntry`/`Expense` untuk pool `k` sampai hari ini.
2. `daysElapsed` = jumlah hari berjalan (dari `business_date`).
3. `totalDaysInMonth` = jumlah hari dalam bulan.
4. `dailyActuals[]` = nilai harian pool `k` (0 untuk hari tanpa transaksi).
5. **Trimmed mean:**
   - Urutkan `dailyActuals`.
   - Buang 10% teratas dan 10% terbawah (minimal 1 jika `daysElapsed ≥ 5`).
   - `trimmedDailyAvg` = rata-rata sisanya.
   - Jika `daysElapsed < 5` → `trimmedDailyAvg = simple mean`.
6. `projectedRemaining = trimmedDailyAvg × (totalDaysInMonth − daysElapsed)`.
7. `projectedFull = actualToDate + projectedRemaining`.
8. **Baseline clamp:**
   - `baselineFull = CostPool.expectedMonthlyAmount` (jika ada).
   - `provisionalFull = max(projectedFull, baselineFull × 0.8)` — jangan <80% baseline.
   - `provisionalConfidence`:
     - `HIGH`: `|projectedFull − baselineFull| / baselineFull < 0.1`
     - `MEDIUM`: dalam `[0.8 × baselineFull, 1.5 × baselineFull]`
     - `LOW`: di luar rentang atau `baselineFull` kosong
   - `projectedFull > baselineFull × 1.5` → alert `POOL_SPIKE` ke Owner.
9. `provisionalFull` dipakai sebagai `Pool(k,t)` di formula alokasi §7.1.
10. **Simpan semua intermediate** di `TrueCostSnapshot.provisionalDetails` (Json): `actualToDate`, `trimmedDailyAvg`, `projectedRemaining`, `baselineFull`, `provisionalConfidence`.

**Setiap malam**, `truecost:monthly` memperbarui snapshot `MONTH PROVISIONAL`. Pada tanggal 1–3 bulan berikutnya, Owner mengunci FINAL dengan TOTP. Setelah FINAL, koreksi lewat `TrueCostSnapshot` baru dengan `supersedesId`.

**Dashboard** menampilkan label `PROVISIONAL` (kuning) / `FINAL` (hijau) / `confidence` (badge).

### 7.5 trustLevel

| Level | Kondisi |
|---|---|
| `PENUH` | Semua komponen terdokumentasi; tanpa `ESTIMATED`; tanpa `ZERO_HISTORY`; tanpa `PENDING_MIGRATION` |
| `SEBAGIAN` | Ada `ESTIMATED` dengan reason, atau `PENDING_MIGRATION` |
| `RENDAH` | Ada `ZERO_HISTORY` atau `hppStatus = UNAVAILABLE` |

Menu `RENDAH` tidak masuk peringkat margin terbaik; badge rose + tooltip.

### 7.6 Fixture A5

| Komponen | Average | FIFO |
|---|---|---|
| Tenaga kerja (Rp12.000.000 / 3.000) | 4.000 | 4.000 |
| Listrik dan air (Rp1.500.000 / 3.000) | 500 | 500 |
| Sewa (Rp6.000.000 / 3.000) | 2.000 | 2.000 |
| Lainnya (Rp1.500.000 / 3.000) | 500 | 500 |
| **HPP** | 9.000 | 8.100 |
| **True Cost** | **16.000** | **15.100** |
| Harga jual bersih | 28.000 | 28.000 |
| **True Margin** | **12.000 (42,86%)** | **12.900 (46,07%)** |
| Margin HPP saja | 19.000 (67,86%) | 19.900 (71,07%) |

### 7.7 Test Wajib Fase 4

- Fixture A5.
- **A6b capacity-based:** low-sales (10/3.000 → alokasi Rp33.333, idle Rp9.966.667), full (idle 0), over (idle 0), empty (idle = pool).
- Alokasi Rp1.000.000 ke tiga produk berbobot sama → **333.334, 333.333, 333.333** (largest remainder).
- **Konsistensi:** `Σ AlokasiTotal + IdleCost = Pool` untuk semua skenario §7.2.
- **Dynamic provisional robust:**
  - Hari 1–2 bonus 10×, hari 3–30 normal → `trimmedDailyAvg` abaikan spike, `provisionalFull` ≈ `baselineFull`, bukan 5×.
  - Realisasi sustained 2× baseline 15 hari → `POOL_SPIKE`, `confidence = LOW`, `provisionalFull` naik tapi tidak ekstrem.
  - `daysElapsed < 5` → simple mean.
  - `expectedMonthlyAmount` kosong → tanpa clamp, `confidence = LOW`.
- **Period FINAL menolak UPDATE**; koreksi via `supersedesId`.
- **Konsumsi `ESTIMATED`** turunkan `trustLevel`.
- **Deterministik:** masukan sama → keluaran sama (bit-for-bit).
- **Satu request per tampilan dashboard.**

---

## 8. Lapisan Kontrol dan Modul Operasional

### 8.1 POS

- Keranjang, varian, catatan porsi, diskon (lihat §8.12), tip, pembayaran campuran (tunai, QRIS, transfer, kartu dicatat manual).
- `Idempotency-Key = clientUuid`. Nomor struk per perangkat (§10).
- Transaksi selesai tidak bisa diedit/dihapus; hanya void/refund.
- Respons ke Kasir tidak memuat biaya.
- **Formula struk §8.9a wajib.**

### 8.2 Shift

- Buka dengan modal awal. Satu shift terbuka per Kasir per perangkat.
- Tutup dengan **hitung buta**: Kasir memasukkan denominasi dulu, server mengembalikan ekspektasi + selisih.
- Ekspektasi = modal awal + penjualan tunai − refund tunai ± kas masuk/keluar. QRIS/non-tunai tidak dihitung.
- Selisih melewati ambang → alert R6. Shift tidak bisa ditutup bila ada approval tertunda.

### 8.3 Void dan Refund

- Kasir mengajukan dengan alasan wajib.
- Manager/Owner menyetujui via:
  - Approval online (perangkat Manager), atau
  - **Manager Override PIN** (§2.4, §8.14).
- Sebelum disetujui, transaksi tetap berlaku.
- Refund penuh/sebagian; opsi restock default mati.
- Jurnal selalu pembalik; stok dikembalikan pada biaya lot asal.

### 8.4 Stock Opname

- Sesi hitung buta (Barista draf). Selisih = hitung − sistem, dihitung server.
- Konfirmasi Manager/Owner, posting `OPNAME` ke kedua mesin.
- Jadwal default mingguan.
- Selisih besar → alert + R5.

### 8.4a Stock Opname vs Offline Queue + PENDING_MIGRATION (BARU)

> **Menyelesaikan race condition antara opname dan transaksi offline/pending.**

**Aturan:**

1. Saat Manager mengonfirmasi opname, server menghitung:
   - `pendingItems` = item di `OfflineTransaction` `PENDING`/`SENT` untuk outlet ini, `occurredAt ≤ now`.
   - `pendingQtyByItem` = jumlah qty per item.
   - `pendingMigrationItems` = item yang punya `SalesHeader.hppStatus = PENDING_MIGRATION` untuk outlet ini.
2. Jika `pendingItems ∩ itemsInOpname ≠ ∅` **atau** `pendingMigrationItems ∩ itemsInOpname ≠ ∅`:
   - **Default:** tolak dengan `BIZ-010 OPNAME_PENDING_OFFLINE`, sertakan daftar item + qty.
   - **Override Manager/Owner** (alasan + audit): lanjut, opname ditandai `hasPendingOffline = true`.
3. Jika override:
   - Server menyimpan `pendingQtyByItem` di `StockOpnameSession.pendingSnapshot`.
   - Setelah offline sync selesai (queue kosong untuk outlet) **atau** migrasi `COMMITTED`, job `opname:reconcile` memeriksa apakah ada `OPNAME_LESS` yang sebenarnya tertutup oleh penjualan offline/pending migration.
   - Jika ya: buat **jurnal pembalik** (append-only) untuk overlap, tandai opname `autoReconciled = true`, catat di `AuditLog`.
4. **Perangkat `REVOKED`/hilang** dengan queue `PENDING`:
   - Owner putuskan: tunggu recovery, atau `POST /api/devices/:id/abandon-queue` dengan TOTP.
   - Jika `ABANDONED`: opname boleh jalan; selisih diperlakukan `WASTE` dengan alasan `DEVICE_LOST`.
5. **Per-item blocking:** jika offline sale hanya menyentuh kopi, opname gula tidak diblokir.
6. **Tutup hari** (§8.6) tetap memblokir jika ada `PENDING`.

**Rute baru:** `GET /api/inventory/opname/pending-check?outletId=`, `POST /api/devices/:id/abandon-queue`.

**Error baru:** `BIZ-010 OPNAME_PENDING_OFFLINE`.

**Test baru (A20):**
- Offline sale 50 cup + opname di tengah → `BIZ-010` default; override → opname jalan + `hasPendingOffline = true`; sync → reconcile job buat jurnal pembalik; stok akhir benar; R1–R3 lulus.
- Perangkat `REVOKED` dengan queue → opname terblokir sampai `abandon-queue`; setelah abandon → opname jalan; selisih jadi `WASTE` alasan `DEVICE_LOST`.
- Per-item: offline sale kopi + opname gula → tidak terblokir.
- `PENDING_MIGRATION` untuk item opname → `BIZ-010` sampai migrasi `COMMITTED`.

### 8.5 Waste

- Dicatat dengan alasan; persetujuan Manager/Owner; posting `WASTE`.
- Total waste per item per minggu → R5.

### 8.6 Tutup Hari

- Wizard lima langkah: Uang Laci, Non-Tunai, Stok dan Resep, Jurnal Tutup, Berita Acara.
- Eksekusi Owner (dengan TOTP).
- **Syarat kunci:**
  - Semua shift hari itu `CLOSED`.
  - Tidak ada Approval tertunda.
  - R1–R3 dan R7 lulus.
  - Tidak ada `OfflineTransaction` `PENDING` untuk hari itu.
  - Tidak ada `ZERO_HISTORY_ESTIMATED` yang belum direkonsiliasi (kecuali `PENDING_MIGRATION`).
  - Owner selesaikan kelima langkah wizard.
- Hasil: `DailyClosing LOCKED` + Berita Acara. Jika ada `PENDING_MIGRATION`, `migrationPending = true` + banner.
- Penjualan offline setelah hari terkunci → `LATE_ENTRY` dengan `originalBusinessDate`.
- **Late entry policy:** laporan harian → hari berjalan. `TrueCostSnapshot MONTH` → bulan berjalan (bukan bulan asal), catatan di `snapshot.flags`.

### 8.7 Biaya Operasional

- `Expense` per kolam: listrik/air/internet → `UTILITY`; sewa → `RENT`; kebersihan → `OTHER`.
- Mode `ON_DATE` atau `SPREAD_MONTH`.
- Lampiran bukti. Di atas ambang tanpa lampiran → tanda. Input di atas batas Manager → Owner.

### 8.8 Upah

- `StaffRate` (per shift/hari) dan `WageEntry` per shift: dasar, bonus, tip share.
- Kehadiran dari `AttendanceLog`.
- Total tip dibagikan = tip terkumpul; selisih ditolak.
- Tip dicatat sebagai utang tip (`2020`), bukan pendapatan/biaya.

### 8.9 Pajak, Service Charge, Tip

- `TaxRate` per tenant (nama, tarif, tanggal berlaku, status).
- `Tenant.isTaxInclusive`, `Tenant.taxServiceChargeIncluded`, `Tenant.serviceChargeRate`.
- Tarif tidak di-hardcode. Modul merekap pajak terutang per bulan, bukan pelaporan resmi.
- **Service charge:** masuk `4020` (Pendapatan, baris terpisah). Tidak masuk tip, **tidak masuk pool biaya**. Untuk v1, jika Owner ingin SC masuk pool biaya, tambahkan sebagai `Expense` manual dari kas (bukan otomatis).
- **Tip:** `2020 Utang Tip`, ditambahkan setelah pajak, tidak dikenai pajak/SC.

### 8.9a Formula Struk Baku (BARU, WAJIB)

> **Menyelesaikan ambiguitas urutan operasi matematika.**

**Notasi:**
- `unitPrice` = harga satuan menu (sebelum diskon)
- `qty` = kuantitas
- `lineBase(p) = unitPrice × qty`
- `lineDiscount(p)` = diskon level baris (§8.12)
- `lineNet(p) = max(0, lineBase(p) − lineDiscount(p))`
- `cartDiscount` = diskon level nota
- `serviceChargeRate` = persentase SC
- `taxRate` = persentase pajak
- `isTaxInclusive` = bool
- `taxServiceChargeIncluded` = bool

**Urutan operasi (deterministik, satu arah):**

```
1. Subtotal              = Σ_p lineNet(p)
2. CartDiscountAmount    = min(cartDiscount, Subtotal)         // clamp
3. NetAfterDiscount      = Subtotal − CartDiscountAmount
4. ServiceChargeAmount   = NetAfterDiscount × serviceChargeRate
5. TaxBase:
     if tenant.taxServiceChargeIncluded = true:
         TaxBase = NetAfterDiscount + ServiceChargeAmount
     else:
         TaxBase = NetAfterDiscount
6. TaxAmount & GrossAmount:
     if tenant.isTaxInclusive = true:
         TaxAmount   = TaxBase × taxRate / (1 + taxRate)       // ekstrak pajak
         GrossAmount = TaxBase                                 // harga sudah termasuk pajak
     else:
         TaxAmount   = TaxBase × taxRate
         GrossAmount = TaxBase + TaxAmount
7. Total = GrossAmount + tip
```

**Aturan tambahan:**
1. **Tip** ditambahkan **setelah** pajak. Tidak dikenai pajak/SC. Dicatat `Cr 2020`.
2. **`taxServiceChargeIncluded`** flag baru di `Tenant` (default true untuk Jakarta, false untuk kota lain). Owner konfirmasi saat onboarding.
3. **Cart-level discount** diprorata ke setiap baris dengan **largest remainder**:
   - `prorataCartDiscount(p) = CartDiscountAmount × lineNet(p) / Subtotal`
   - `lineHppBase(p) = lineNet(p) − prorataCartDiscount(p)`
   - `Σ_p lineHppBase(p) = NetAfterDiscount` (tepat)
4. **Diskon tidak boleh membuat `lineNet(p) < 0`.** Jika `lineDiscount(p) > lineBase(p)` → `BIZ-011 DISCOUNT_EXCEEDS_NET`.
5. **Total diskon transaksi** `Σ lineDiscount + CartDiscountAmount` tidak boleh melebihi `Subtotal × 0.9` (safety floor 10%) → `BIZ-011`.
6. Semua intermediate (`subtotal`, `cartDiscountAmount`, `netAfterDiscount`, `serviceChargeAmount`, `taxBase`, `taxAmount`, `grossAmount`, `tipAmount`, `total`) **disimpan di `SalesHeader`** untuk audit historis. Jika rate berubah kemudian, struk lama tidak berubah.
7. `SalesDetail` menyimpan `lineBase`, `lineDiscount`, `lineNet`, `lineHppBase` per baris.
8. `SalesHeader` menyimpan `serviceChargeRate`, `taxRate`, `taxServiceChargeIncluded`, `isTaxInclusive` **saat transaksi**.

**Fixture A18:**
- Input: 2 × kopi @ 25.000, diskon baris 10%, cart discount 5.000, SC 10%, PB1 10%, `isTaxInclusive=false`, `taxServiceChargeIncluded=true`, tip 5.000.
- `lineBase = 50.000`; `lineDiscount = 5.000`; `lineNet = 45.000`.
- `subtotal = 45.000`; `cartDiscountAmount = 5.000`; `netAfterDiscount = 40.000`.
- `serviceChargeAmount = 4.000`; `taxBase = 44.000`; `taxAmount = 4.400`; `grossAmount = 48.400`; `total = 53.400`.
- `lineHppBase` diprorata: `cartDiscountAmount` dialokasikan ke baris.
- `Σ payments = grossAmount + tipAmount = 48.400 + 5.000 = 53.400 = total`.
- `isTaxInclusive=true`: harga menu sudah termasuk pajak → `taxAmount` di-extract, `grossAmount = 50.000`, `total = 50.000 + tip`.
- `taxServiceChargeIncluded=false`: `taxBase = netAfterDiscount` → pajak tidak pada SC.
- Diskon > net → `BIZ-011`.
- Total diskon > 90% subtotal → `BIZ-011`.

### 8.10 Notifikasi

- Email (Brevo) dan Telegram untuk alert, approval pending, selisih kas, sinkron gagal.
- Alert sama dalam 24 jam digabung.
- Job BullMQ dengan retry.

### 8.11 Kebijakan Ambang

| Kebijakan | Default | Kode | Catatan |
|---|---|---|---|
| Selisih kas shift | Peringatan Rp10.000, kritis Rp50.000 | R6 | — |
| Selisih teoretis vs aktual | Peringatan >5%, kritis >10% | R5 | — |
| Rasio void/refund per Kasir per shift | Peringatan >5% | VR1 | — |
| Selisih opname per item | >3% qty atau Rp50.000 | OP1 | — |
| Harga penerimaan vs PO | >5% wajib alasan | PO1 | — |
| Lonjakan harga beli | >10% vs rata-rata 3 penerimaan | PR1 | — |
| Diskon manual tanpa approval | 10% per baris, **hanya manual** | DS1 | Preset dikecualikan (§8.12) |
| Transaksi offline tertunda | >24 jam | OF1 | — |
| Selisih jam perangkat | >10 menit saat sinkron | OF2 | — |
| Backup gagal | 1 kali | BK1 | — |
| Sinkron Google Sheets gagal | 3× berturut | SH1 | — |
| Zero-history estimated | Setiap kejadian | ZH1 | — |
| Migration grace expired | Hard deadline lewat | MG1 | — |
| Recipe version historis | Setiap kejadian | RV1 | Informatif |
| **Pool spike** | `projectedFull > baselineFull × 1.5` | PS1 | Warning |
| **Preset version historis** | Setiap kejadian | DV1 | Informatif |
| **Preset inactive** | Setiap kejadian | DV2 | Rejected |
| **Opname pending offline** | Setiap kejadian | OO1 | Rejected by default |

### 8.12 Diskon: Preset, Manual, dan Stacking

> **Menyelesaikan double-dipping dan interaksi DS1.**

**Aturan:**
1. **Preset discount** (dibuat Owner/Manager, disetujui Owner) **selalu diperbolehkan offline**, tanpa evaluasi DS1.
2. **Manual discount** dibatasi DS1 (default 10% per baris). Di atas DS1 butuh Manager Override PIN atau Approval.
3. **Per baris:** maksimum **1 preset discount** (`appliedDiscountPresetId` singular) DAN maksimum **1 manual discount** (`appliedManualDiscount` singular). Preset + manual boleh digabung, tetapi `lineDiscount(p) = presetDiscount(p) + manualDiscount(p)` tidak boleh > `lineBase(p)`. Server tolak `BIZ-011`.
4. **Per nota:** maksimum **1 cart-level preset discount** (`cartDiscountPresetId` singular). Tidak ada manual cart-level di v1.
5. **Preset discount** tidak dievaluasi DS1. `approvedBy`/`approvedAt`/`approvalVersion` wajib.
6. **Total diskon transaksi** ≤ `Subtotal × 0.9` (safety floor 10%) → `BIZ-011`.
7. **Prorating cart discount** untuk HPP: `prorataCartDiscount(p)` dengan largest remainder, tie-break `menuId`. `lineHppBase(p)` dipakai HPP per line, True Cost, jurnal.
8. **Perubahan preset:** `approvalVersion` naik, `approvedBy`/`approvedAt` reset, preset tidak bisa dipakai sampai disetujui ulang.
9. **`versionHash` preset** disimpan di `SalesDetail` untuk audit; perubahan preset tidak mengubah struk lama.

**Error baru:** `BIZ-011 DISCOUNT_EXCEEDS_NET`, `BIZ-013 STACKING_VIOLATION`.

**Test (A19):**
- Preset 20% + manual 15% pada baris → manual dievaluasi DS1 (butuh Manager Override PIN karena 15% > 10%); `lineDiscount = 35%` dari lineBase.
- Dua preset pada baris yang sama → ditolak schema (`BIZ-013`).
- Cart preset 50rb + line preset 20% → `Σ lineDiscount` dihitung; `cartDiscountAmount = 50rb`; `Subtotal = 200rb`; `NetAfterDiscount = 150rb`; `lineHppBase` prorata.
- Total diskon 95% subtotal → `BIZ-011`.
- Offline: preset 20% sukses; manual 15% `FLAGGED` (DS1).

### 8.13 Laporan

- Penjualan bersih = `Σ netAfterDiscount` (setelah diskon, sebelum SC/pajak/tip).
- Laba kotor = penjualan bersih − HPP (engine utama).
- Laba bersih = laba kotor − biaya operasional (ON_DATE/SPREAD_MONTH) − upah (tanpa tip) − selisih kas − selisih persediaan (waste + opname) − **IdleCost per hari**.
- Arus kas = penerimaan kas/bank − pengeluaran per metode.
- Konsistensi bulanan: `Σ AlokasiTotal + IdleCost = Σ Pool`; `Σ HPP + Σ AlokasiTotal = Σ (TrueCostPerUnit × unit)`.
- Setiap laporan menampilkan engine utama + perbandingan engine lain.

### 8.14 Manager Override PIN

Lihat §2.4. Implementasi UI di `ManagerOverrideDialog` (§14.7).

### 8.15 Test Wajib Fase 5

- Hitung buta: `expectedCash` tidak dikirim sebelum hitung.
- Void/refund belum disetujui → tidak ubah stok/jurnal.
- Hari terkunci hanya terima jurnal pembalik.
- Laba bersih harian cocok fixture (termasuk IdleCost).
- Konsistensi bulanan lulus (capacity-based).
- `ZERO_HISTORY` blokir closing kecuali `PENDING_MIGRATION`.
- `PENDING_MIGRATION` closing banner, tidak memblokir.
- Manager Override PIN: void via PIN → diproses, audit `overrideUsed=true`, sesi Kasir tetap; 6 PIN salah → kunci; PIN Manager tidak bisa login sesi penuh.
- Preset discount 20% offline sukses; manual 15% FLAGGED; preset diubah tanpa approval ulang → tolak.
- **A18:** formula struk §8.9a semua varian (inclusive, non-inclusive, SC included, tip).
- **A19:** stacking diskon semua varian.
- Break-glass: tanpa grant → 403; dengan grant tercatat.

---

## 9. Supply Hub (Internal Procurement)

Supply Hub **bukan marketplace B2B**. Modul **internal procurement** untuk Owner/Manager. Portal supplier eksternal dihapus.

### 9.1 Alur

| Tahap | Pelaku | Hasil | Efek ke Biaya |
|---|---|---|---|
| 1. Data supplier | Owner/Manager | `Supplier` global (`APPLIED`/`VERIFIED`/`ACTIVE`/`SUSPENDED`). Kurasi SA | — |
| 2. Katalog | Owner/Manager | `SupplierCatalog`: nama, kategori, satuan, `packSize`, `packUnit`, harga, MOQ, lead time | — |
| 3. Tautan item | Owner | `ItemSupplierLink` + `conversionFactor` | Jaminan item benar |
| 4. PO | Owner/Manager | `DRAFT` → `SENT` → `CONFIRMED` → `SHIPPED` → `PARTIALLY_RECEIVED`/`RECEIVED` → `CLOSED`/`CANCELLED`. Di atas batas nominal Manager butuh Owner | — |
| 5. Penerimaan | Barista/Manager/Owner | Qty aktual + biaya satuan; parsial; boleh tanpa PO (`supplierNameText`). Biaya tambahan pro rata (largest remainder) | `RECEIPT` |
| 6. Invoice dan pembayaran | Owner | `SupplierInvoice`, `SupplierPayment` | — |
| 7. Retur | Owner | Merujuk baris penerimaan asal, dinilai pada biaya penerimaan asal | `SUPPLIER_RETURN` |
| 8. Ulasan | Owner/Manager | Rating + ulasan internal | — |

### 9.2 Aturan

- Pencocokan tiga arah (PO, penerimaan, invoice): selisih ditandai, harus diselesaikan sebelum pelunasan.
- Biaya satuan penerimaan >5% dari PO → alert PO1 + alasan.
- PR1 di dashboard Supply Hub dan halaman item.
- Harga katalog **tidak pernah** jadi biaya. Biaya hanya dari penerimaan aktual.
- Biaya tambahan dialokasikan largest remainder.
- Pembayaran via aplikasi tidak ada; dicatat manual.
- **Supplier tidak punya login.** Data diinput Owner/Manager.

### 9.3 Test Wajib Fase 6

- Dua penerimaan parsial → lot + jurnal benar, R1–R3 lulus.
- Biaya tambahan teralokasi.
- Penerimaan tanpa PO hanya untuk Owner/Manager/Barista dengan item valid.
- Retur dinilai biaya penerimaan asal, R1–R3 lulus.
- Pencocokan tiga arah memblokir pelunasan saat ada selisih.
- **Tidak ada rute `/api/supplier/*`** (test memastikan).

---

## 10. Offline-First POS

### 10.1 Prinsip

Kasir tetap bisa menjual saat internet putus. Setiap transaksi offline masuk buku besar **tepat satu kali**. Perangkat hanya mencatat peristiwa. Server menilai biaya, menggerakkan stok, membukukan jurnal. **Resep historis dipertahankan** agar R1 tidak gagal saat resep berubah.

### 10.2 Alur Sinkronisasi

```
PERANGKAT (offline-first)                  SERVER
─────────────────────────────────────────────────────
1. Simpan di IndexedDB
   clientUuid, deviceId, occurredAt,
   recipeVersion, menuVersion, presetVersion,
   status PENDING, tanpa data biaya
                    │
2. Kirim batch online ─────────────────►
   maks 20 transaksi, urut occurredAt
   Idempotency-Key = clientUuid
                                         3. Cek idempotensi
                                         4. Validasi + posting (async per batch)
                                            CheckoutService (sama dengan online)
                                            Resep historis + preset version
                    ◄───────────────────
6. Tandai selesai                        5. Status akhir per transaksi
   hanya setelah FINAL diterima            DONE / FLAGGED / REJECTED
```

### 10.3 Kemampuan saat Offline

| Fungsi | Offline | Aturan |
|---|---|---|
| Penjualan | Ya | Katalog dari `menuVersion` terunduh |
| Diskon | Sebagian | Preset selalu boleh; manual sampai DS1; di atas DS1 → Manager Override PIN |
| Buka shift | Tidak | Butuh online |
| Tutup shift + hitung buta | Tidak | Butuh online; antrean kosong |
| Void/refund/approval | Sebagian | Manager Override PIN bisa offline (aksi terbatas); Approval penuh butuh online |
| Penerimaan/waste/opname/ubah master | Tidak | Butuh online |
| Ganti Kasir | Tidak | Masuk sebelum internet putus |

### 10.4 Perangkat Terdaftar

- Owner/SA buat kode sekali pakai (15 menit). Perangkat memasukkan kode, server buat `Device`, ikat ke outlet, simpan di IndexedDB.
- Status `PENDING`/`ACTIVE`/`REVOKED`. Cabut → sesi dicabut.
- Server hanya terima transaksi dari `Device` `ACTIVE` dengan `deviceId` cocok `Session.deviceId` dan outlet cocok.
- Outbox milik perangkat, bukan pengguna.

### 10.5 Optimasi Deadlock

1. `POST /api/offline/sync-batch` hanya simpan `OfflineTransaction` `PENDING` + balas 202.
2. Prosesor BullMQ `offline-sync` ambil `PENDING` per `deviceId`, urut `occurredAt`, **satu job per batch** (maks 20).
3. Job memanggil `CheckoutService` dalam satu transaksi per transaksi, dengan:
   - Row lock per item ascending.
   - **Batching lock:** lock sekali per item untuk seluruh batch.
   - **Deadlock retry:** backoff eksponensial (jeda naik sampai 15 menit).
4. Satu transaksi gagal → hanya itu `REJECTED`; sisanya diproses.
5. `OfflineTransaction.status` akhir: `FINAL` dengan `resultStatus` `DONE`/`FLAGGED`/`REJECTED`.
6. **PENDING > 24 jam** → alert OF1.

### 10.6 Nomor Struk dan Receipt Gap Recovery

**Format:** `{OUTLET}-{DEVICE}-{YYYYMMDD}-{SEQ4}`.

- `SEQ4` mulai 0001 per perangkat per hari, naik tanpa celah.
- Penghitung di IndexedDB dalam transaksi yang sama dengan penyimpanan penjualan.
- `Device.lastReceiptSeqPerDay` di server, di-update setiap sinkron sukses.
- Void mempertahankan nomor.
- R8 menandai celah.

**Receipt Gap Recovery:**
1. Owner buka `POST /api/devices/:id/receipt-recovery` dengan `{ businessDate, missingFrom, missingTo, reason }`.
2. `ReceiptSequenceRecovery` dibuat, R8 lulus dengan badge `RECOVERED_GAP`.
3. SA bisa dengan break-glass.
4. Audit + notifikasi Owner.
5. **Batas:** gap ≤100 per kejadian; >100 butuh SA + investigasi + TOTP.

### 10.7 Aturan Saat Transaksi Tiba

| Situasi | Perlakuan | Hasil & alert |
|---|---|---|
| Stok tidak cukup | Diposting `ESTIMATED`; `hppEstimated = true`; true-up berikutnya | `FLAGGED STOCK_ESTIMATED`, alert Manager |
| Zero-history (belum pernah ada penerimaan) | Jika `estimatedUnitCost` kosong → `REJECTED BIZ-006`; jika terisi → `ESTIMATED` + blokir closing | `FLAGGED`/`REJECTED`, alert ZH1 |
| Zero-history saat cutoverDate | `PENDING_MIGRATION` (grace §6.8) | `PENDING_MIGRATION`, tidak blokir closing |
| **Resep berubah setelah offline** | Potong sesuai `recipeVersion` payload (historis dari `RecipeVersionSnapshot`) | `FLAGGED RECIPE_VERSION_HISTORICAL`, informatif |
| `recipeVersion` tidak ditemukan | **`REJECTED BIZ-008`** | Alert Owner |
| **Preset berubah setelah offline** | Cek `versionHash`; jika beda → buku sesuai versi yang dikirim (fakta transaksi) | `FLAGGED PRESET_VERSION_HISTORICAL` (DV1) |
| **Preset sudah inactive** | **`REJECTED DV2`** | Alert Owner |
| Harga berbeda, `menuVersion` perangkat lebih lama | Buku pada harga dibayar pelanggan | `FLAGGED PRICE_CHANGED` |
| Harga berbeda, `menuVersion` sama | Buku, tapi harga tidak ada di katalog | `FLAGGED PRICE_MISMATCH`, alert Owner |
| Preset discount | Diizinkan (tidak DS1) | Tidak ada flag |
| Manual discount > DS1 tanpa override | Buku; `FLAGGED DISCOUNT_OVER_LIMIT` | Alert Manager |
| Manual discount > DS1 dengan Manager Override PIN | Buku; `overrideUsed = true` | Informatif |
| **Stacking > 1 preset per line/cart** | **`REJECTED BIZ-013`** | Alert kritis |
| **Total diskon > 90% subtotal** | **`REJECTED BIZ-011`** | Alert Manager |
| Hari terkunci | Buku di hari berjalan `originalBusinessDate` | `FLAGGED LATE_ENTRY` |
| Shift asal CLOSED | Buku `business_date = occurredAt`; hitung kas shift tutup **tidak** diubah | `FLAGGED SHIFT_CLOSED`, alert Manager |
| Selisih jam >10 menit | Buku; jika >5 menit masa depan → pakai jam server | `FLAGGED CLOCK_SKEW`, alert OF2 |
| Nomor struk sama (clientUuid beda) | Tidak diposting | `REJECTED DUPLICATE_RECEIPT`, alert kritis R8 |
| Perangkat tidak ACTIVE/outlet mismatch | Tidak posting; Owner bisa manual via Approval | `REJECTED DEVICE_NOT_ALLOWED`/`OUTLET_MISMATCH`/`DEVICE_REVOKED` |
| Menu tidak ditemukan, total ≠ baris, field biaya | Tidak diposting | `REJECTED MENU_NOT_FOUND`/`PAYLOAD_INVALID` |

Penjualan `FLAGGED`/`REJECTED` tetap tampil di Tutup hari sampai ditinjau. **Tidak ada transaksi hilang.**

### 10.7a Resolusi Resep Historis

1. Setiap perubahan resep menaikkan `Tenant.menuVersion` + buat `RecipeVersionSnapshot`.
2. Perangkat simpan `recipeVersion` per menu.
3. Payload offline membawa `recipeVersion` per line.
4. Proses:
   - `recipeVersion` payload = aktif → pakai aktif.
   - Beda → cari snapshot `(menuId, recipeVersion)`; pakai `snapshotJson`.
   - Tidak ada → `REJECTED RECIPE_VERSION_UNKNOWN`, alert Owner.
5. `SalesDetail.recipeSnapshot` simpan resep historis; `recipeVersion` untuk audit.
6. `GET /api/menus/:id/recipe-versions` (Owner/Manager).

### 10.8 Kontrak Payload

| Field | Aturan |
|---|---|
| `clientUuid` | UUID v4 unik per tenant |
| `deviceId`, `outletId` | Cocok dengan `Device` ACTIVE + sesi |
| `shiftId` | Shift terbuka di perangkat |
| `receiptNo` | Format §10.6; unik per tenant |
| `occurredAt` | ISO 8601 UTC |
| `menuVersion` | Versi katalog |
| `recipeVersion` | Versi resep per line (historis) |
| `cashierId` | Atribusi Kasir |
| `lines` | `menuId`, `qty` (string decimal), `unitPrice` (string), `modifiers`, `discount`, `appliedDiscountPresetId`, `appliedManualDiscount`, `presetVersionHash` |
| `cartDiscountPresetId` | Opsional; singular |
| `cartDiscountAmount` | Opsional; dihitung dari preset |
| `payments` | `method`, `amount` (string rupiah); jumlah = `grossAmount + tipAmount` (R7) |
| `managerOverride` | Opsional `{ actionType, managerPinHash? }` |

**Field biaya dilarang di payload.** Zod strict → `REJECTED PAYLOAD_INVALID`.

### 10.9 Implementasi Klien

- Service worker `vite-plugin-pwa`: precache app shell; `/api/*` tidak di-cache.
- `idb` di `package.json` versi terkunci.
- IndexedDB store: `outbox`, `catalog` (menu, modifier, diskon preset + versionHash, `menuVersion`, `recipeVersion`, waktu), `meta` (`deviceId`, counter struk per `business_date`).
- `navigator.storage.persist()` saat pertama; ditolak → peringatan.
- Katalog dari `GET /api/pos/catalog`, disaring serializer tanpa biaya, diperbarui saat buka + tiap 5 menit.
- Hook `useOnlineStatus`: offline bila `navigator.onLine = false` atau dua request berturut ke `/api/health` gagal.
- Tampilan: lencana Offline, chip Menunggu sinkron, tombol Sinkron sekarang. Struk lokal berlabel **Menunggu sinkron** sampai SYNCED.
- **IndexedDB, cache, `localStorage` tidak boleh memuat kunci biaya.** Test e2e.

### 10.10 Test Wajib Fase 7

- Unit: penomor struk (urut, tanpa celah, restart per hari, batas zona waktu); schema tolak field biaya.
- Integrasi: batch 3× → satu `SalesHeader` + satu set jurnal; urutan terbalik → posting by `occurredAt`; dua perangkat item terbatas → stok benar + R1–R3 lulus; hari terkunci → `LATE_ENTRY`; perangkat REVOKED → REJECTED; jam skew → `CLOCK_SKEW` + OF2; PENDING menahan closing.
- Receipt gap: ≤100 → lulus R8 + badge; >100 → SA.
- Recipe version historis: resep 150ml → offline → 200ml → sync → potong 150ml; `recipeSnapshot` historis; R1 lulus; `recipeVersion` tidak ditemukan → REJECTED.
- **Preset version historis:** preset diubah offline → sync → flag DV1; preset inactive → DV2.
- Migration grace: cutover pagi, migrasi siang → DONE; hard deadline lewat → REJECTED BIZ-012.
- **Deadlock:** 200 transaksi offline, 5 item populer, selesai <2 menit tanpa deadlock permanen.
- Preset discount offline: preset 20% sukses tanpa FLAGGED; manual 15% FLAGGED.
- Property: PRNG ber-seed, kirim diacak + digandakan → ledger identik dengan kiriman berurutan.
- e2e Playwright: `context.setOffline`, 3 penjualan, reload (aplikasi tetap buka), online, antrean kosong + struk SYNCED; IndexedDB tanpa kunci biaya.

---

## 11. Migration Center

### 11.1 Pipeline

| Tahap | Proses | Pelaku | Keluaran |
|---|---|---|---|
| 1. Unggah | CSV/XLSX; `fileHash` SHA-256; duplikat ditolak | Owner | `MigrationJob` `UPLOADED` |
| 2. Pemetaan | Kolom → field; preset usulan | Owner | `MigrationMapping`, `MAPPED` |
| 3. Normalisasi | Parsing deterministik; nilai mentah + normal | Server | `MigrationRow`, `NORMALIZED` |
| 4. Validasi | V1–V11; OK/PERINGATAN/ERROR | Server | `VALIDATED` |
| 5. Rekonsiliasi | M1–M6 agregat | Server | `MigrationCheck`, `RECONCILED` |
| 6. Persetujuan | Owner Komit; batch saldo awal/riwayat butuh SA | Owner + SA | `Approval`, `APPROVED` |
| 7. Impor | Staging → produksi; M7 pasca-impor | Server | `COMMITTED`/`FAILED` |
| 8. Rollback | Batch tanpa transaksi turunan | SA | `ROLLED_BACK` |

### 11.2 Tiga Tingkat Data

| Tingkat | Isi | Efek saat komit | Persetujuan |
|---|---|---|---|
| 1. Katalog | Menu, kategori, harga jual, modifier | Buat/update `Menu` (kunci SKU atau nama); `menuVersion` naik | Owner |
| 2. Inventori, resep, saldo awal | Item, satuan, resep, saldo awal per gudang | Item + `RecipeDetail` dibuat; saldo awal ditulis `PhysicalStockService` sebagai `OPENING`; kedua mesin menilai lot `OPENING`; jurnal Dr Persediaan, Cr Ekuitas | Owner + SA |
| 3. Riwayat penjualan | Transaksi sebelum `cutoverDate` | `SalesHeader` `source = MIGRATION`, `hppStatus = UNAVAILABLE`; tanpa stok, tanpa jurnal, tidak masuk True Cost/R7; label **Riwayat migrasi** | Owner + SA |

`cutoverDate` = tanggal pertama LedgerLine dipakai. Saldo awal hanya untuk item belum punya pergerakan selain `OPENING`, satu kali per item per gudang.

**Migration grace period** (§6.8) memungkinkan penjualan pagi cutover tanpa stok, dengan `PENDING_MIGRATION`, sampai Level 2 `COMMITTED`.

### 11.3 Biaya dari POS Lama

- HPP/harga pokok POS lama **tidak pernah** jadi HPP LedgerLine; di `MigrationRow` sebagai pembanding.
- HPP dihitung dari resep + lot.
- Satu-satunya biaya dari berkas: biaya satuan saldo awal (eksplisit).
- Templat xlsx (Menu, Item, Resep, SaldoAwal, Penjualan) via `exceljs`.

### 11.4 Normalisasi

- Angka rupiah: buang `Rp`, spasi, pemisah ribuan; desimal per `numberFormat` (ID/EN). Half-up ke rupiah; kuantitas ke 4 desimal; pembulatan di M4.
- Satuan: g, ml, pcs, oz, shot, pump, pack. Tidak dikenal → ERROR.
- Teks: trim, normalisasi huruf kategori. Tanggal di timezone outlet, simpan UTC.
- UTF-8 (BOM ok); pemisah koma/titik koma deteksi otomatis. Sel formula → nilai tersimpan; tanpa nilai → `FORMULA_NO_VALUE`.

### 11.5 Validasi V1–V11

| Kode | Aturan | Tingkat |
|---|---|---|
| V1 | Nama kosong | ERROR |
| V2 | Harga jual ≥0. Harga 0 → PERINGATAN | ERROR/WARNING |
| V3 | Saldo negatif | ERROR |
| V4 | Kuantitas >0 tanpa biaya satuan eksplisit, atau biaya nol | ERROR |
| V5 | Satuan tidak dikenal/konversi tidak ada | ERROR |
| V6 | Resep merujuk item yang tidak ada | ERROR |
| V7 | Kuantitas resep nol/negatif | ERROR |
| V8 | SKU/barcode/nama ganda | WARNING |
| V9 | HPP POS lama > harga jual | WARNING |
| V10 | Riwayat ≥ `cutoverDate` | ERROR |
| V11 | Total pembayaran ≠ total baris | ERROR |

Baris ERROR tidak diimpor. Komit aktif bila ada minimal satu OK dan Owner baca jumlah dilewati.

### 11.6 Rekonsiliasi M1–M7

| Kode | Pemeriksaan |
|---|---|
| M1 | Jumlah baris = OK + PERINGATAN + ERROR + dilewati |
| M2 | Total nilai saldo awal = nilai yang dijurnal (toleransi Rp1/item) |
| M3 | Menu aktif tanpa resep → HPP "Belum tersedia" |
| M4 | Total selisih pembulatan dilaporkan |
| M5 | Rujukan resep + satuan valid |
| M6 | Jumlah transaksi + total per hari = hasil impor |
| M7 | Pasca-impor: R1–R3, R7 PASS; gagal → rollback otomatis, batch `FAILED` |

### 11.7 Eksekusi

- Level 1 maks 5.000 baris; Level 2 maks 5.000 baris (>5.000 → tolak "pecah batch"); Level 3 chunk 500 baris resumable.
- Kunci unik `(tenantId, source, sourceRef = hash baris)`.
- Audit tiap tahap. `/api/migration` guard + audit. `tenantId` hanya sesi.
- Batas berkas: CSV/XLSX maks 10 MB, 20.000 baris, 5 berkas. Magic bytes; `.xlsm` ditolak. Berkas asli dihapus 90 hari setelah COMMITTED.

### 11.8 Rollback

- SA only; batch COMMITTED tanpa transaksi turunan.
- Append-only reversal + arsip.
- Ada turunan → `ROLLBACK_BLOCKED`.

### 11.9 Preset Sumber

- Alias kolom (Moka, Majoo, Pawoon, Kasir Pintar). **Wajib diverifikasi** dengan berkas asli sebelum rilis. Pemetaan manual + templat LedgerLine selalu tersedia.
- Data contoh preset dihapus.

### 11.10 Test Wajib Fase 8

- Fixture M1: 710.000 kedua mesin, jurnal 710.000, R1–R3 lulus.
- Normalizer: `Rp 22.000`, `22.000`, `22,000`, `22.000,50` ID/EN; kg/L tepat.
- Idempotensi: berkas 2× ditolak; chunk re-run tidak gandakan.
- Atomik: baris ke-N gagal → tidak ada data.
- Aturan: V4, V10, saldo awal item sudah ada pergerakan; riwayat tidak gerakkan stok/True Cost/R7.
- Rollback: batch bersih berhasil; ada transaksi turunan → BLOCKED.
- Otorisasi: 401 tanpa login; Kasir/Barista/Manager ditolak; Owner A ≠ Owner B; Owner tidak approve batch sendiri.
- Berkas: `.xlsm`, magic salah, >10 MB ditolak.
- Level 2 >5.000 baris → tolak.
- Migration grace: commit Level 2 → `PENDING_MIGRATION` jadi DONE.

---

## 12. Keamanan, Sesi, Google, TOTP

### 12.1 Alur Masuk Google

1. Firebase Auth → ID token → `POST /api/auth/google`. Tidak ada role/tenant/action dari klien.
2. `verifyIdToken` + `checkRevoked`, `email_verified = true`, provider `google.com`, cari email lowercase di `UserProfile`.
3. `INVITED` → aktif + sesi. `ACTIVE` → sesi. `SUSPENDED` → 403 + cabut sesi.
4. Tidak dikenal → `AccessRequest` PENDING (satu per email), jawab 202 `ACCESS_PENDING`. SA tinjau: setujui (buat tenant + Owner atau tautkan) atau tolak. **Pendaftaran mandiri dihapus.**
5. Sesi **opaque**: 256-bit, hash SHA-256 di `Session`, cookie. Body hanya profil. Tanpa JWT.
6. `guard()` muat sesi, cek revoked/expired, muat peran/outlet dari DB.
7. Semua percobaan masuk/penolakan/cabut → `AuditLog`.

### 12.2 Sesi dan Cookie

| Peran | Idle | Max |
|---|---|---|
| Super Admin | 30 menit | 8 jam |
| Owner, Manager | 8 jam | 7 hari |
| Kasir, Barista | 14 jam | 14 jam |

- **Cookie:** `ll_session` (konsisten). `HttpOnly`, `Secure` di produksi, `SameSite=Strict`, `Path=/`, tanpa `Domain`.
- **CSRF:** `X-CSRF-Token` (dari `GET /api/auth/csrf`) + `Origin = APP_ORIGIN`.
- **Rate limit Redis:** 10 login/15 menit per IP dan email. Jawaban gagal tidak membedakan email.
- **Offline session window:** sesi login boleh lanjut jual offline sampai `min(expiresAt, +24 jam)`. Login baru offline tidak didukung.

### 12.3 PIN Kasir, Barista, Manager Override

- Kasir/Barista: Google di perangkat terdaftar + set PIN 6 angka (bcryptjs). Manager/Owner/SA tanpa `pinHash`; punya `managerPinHash` (§2.4).
- `POST /api/auth/pin-login` butuh cookie `ll_device`. Menolak role `MANAGER`/`OWNER`.
- 3 PIN salah → kunci 15 menit (per pasangan user+device). Manager/Owner bisa buka.
- Reset PIN → hapus hash; login ulang Google + set PIN.
- Ganti Kasir offline tidak didukung.

### 12.4 TOTP

- SA dan Owner wajib. Manager opsional.
- `otplib`: secret dienkripsi AES-256-GCM (`SECRETS_ENC_KEY` 32 byte), QR sekali, aktifkan setelah satu kode benar. 10 backup codes (hash).
- Toleransi satu step 30 detik; step yang dipakai ditolak. 5 salah → kunci 15 menit.
- **Wajib TOTP:** komit/rollback migrasi, finalisasi True Cost, ubah kebijakan, tambah/suspend pengguna, hubungkan/putus Google, cabut perangkat, break-glass, receipt gap >10, **unlock hari**, **set manager PIN**, **extend migration grace**, **abandon queue**.
- Reset TOTP Owner oleh SA (TOTP SA + audit). Reset TOTP SA hanya `npm run admin:reset-totp -- --email`.

### 12.5 Google Sheets

- Owner hubungkan (kode di server, `access_type=offline`, `state` di sesi, scope `drive.file`). Refresh token enkripsi di `SheetConnection`; access token tidak disimpan.
- Satu spreadsheet per tenant `LedgerLine - nama tenant`. Tujuh tab: Harian, Bulanan, Tahunan, Transaksi, True Cost, Rekonsiliasi, Audit.
- Idempoten: cari baris via kolom kunci → update/tambah. `valueInputOption=RAW`. **Sanitasi formula** (`=`, `+`, `-`, `@` → prefix `'`). Format angka sekali.
- Jadwal: `BullMQ sheets-sync` 15 menit saat hari dikunci + Sinkron sekarang.
- Kegagalan: backoff kuota (429); 3× → alert SH1. `invalid_grant` → `NEEDS_RECONNECT`.
- Putus koneksi → cabut token + hapus `SheetConnection`; spreadsheet Owner dibiarkan.

### 12.6 Export xlsx

- `POST /api/exports`, `GET /api/exports/:id` via `exceljs`.
- **Sanitasi formula**.
- File di penyimpanan privat, nama acak, tidak disajikan `@fastify/static`.

### 12.7 Test Fase 1 & 5 & 9

- Fase 1: akun tidak dikenal tidak sesi + satu `AccessRequest`; token tanpa `email_verified` ditolak; field klien diabaikan; SUSPENDED ditolak; sesi expired 401; tanpa CSRF/Origin asing ditolak; PIN tanpa cookie perangkat ditolak; 3 PIN salah kunci; Manager tidak jalur PIN login.
- Fase 5: TOTP enroll + verify; kode sama tidak 2×; backup codes sekali pakai; aksi wajib TOTP ditolak `AUT-005`; break-glass tanpa TOTP ditolak; receipt gap >10 tanpa TOTP ditolak; **Manager Override PIN** audited; PIN Manager tidak sesi penuh.
- Fase 9: Sheets tiruan; 2× sync → baris sama; `=` dibaca teks; 3× gagal → SH1; `invalid_grant` → `NEEDS_RECONNECT`; refresh token enkripsi.

---

## 13. Spesifikasi API

### 13.1 Konvensi

- `/api`, JSON UTF-8, tanpa versi (`/api/v2` untuk breaking).
- Uang/kuantitas string. Waktu ISO 8601 UTC; `business_date` `YYYY-MM-DD`.
- Sukses `{ success: true, data }`. Gagal `{ success: false, error: KODE, message }`. 500 pesan generik; error asli di log.
- `tenantId`/`outletId`/`permission` dari sesi. Multi-outlet `POST /api/session/outlet`.
- Daftar `?limit=` (default 50, maks 200), `?cursor=`; jawab `{ items, nextCursor }`.
- `Idempotency-Key` wajib pada: `POST /api/pos/checkout`, penerimaan, pembayaran supplier, waste, konfirmasi opname, komit migrasi, receipt recovery, manager-override.
- Setiap mutasi → `AuditLog`. Setiap respons Kasir via serializer tanpa biaya.
- Rate limit: 300/menit/sesi; login 10/15 menit; unggah migrasi 20/jam/tenant; ekspor 10/jam/tenant; **manager-override 5/15 menit/perangkat**.

### 13.2 Kode Error

| Kode | HTTP | Arti |
|---|---|---|
| `VAL-001` | 400 | Zod gagal; `message` daftar error |
| `VAL-002` | 400 | Melebihi batas (batch >20, berkas >10 MB, Level 2 >5.000 baris) |
| `AUT-001` | 401 | Belum masuk/sesi invalid/expired |
| `AUT-002` | 403 | Peran/outlet tidak berhak |
| `AUT-003` | 403 | CSRF/Origin invalid |
| `AUT-004` | 403 | Akun suspended; tidak dikenal → 202 `ACCESS_PENDING` |
| `AUT-005` | 403 | Perlu verifikasi TOTP |
| `AUT-006` | 403 | Manager Override PIN salah/terkunci |
| `RES-001` | 404 | Data tidak ditemukan di tenant/outlet |
| `CNF-001` | 409 | Duplikat/Idempotency-Key isi beda |
| `BIZ-001` | 422 | Hari bisnis terkunci |
| `BIZ-002` | 422 | Stok tidak cukup + `allowNegativeStock` mati |
| `BIZ-003` | 422 | Perlu Approval atau lewat batas nominal |
| `BIZ-004` | 422 | R1–R3/R7 gagal untuk operasi |
| `BIZ-005` | 422 | Aturan domain lain (rollback blokir, retur > penerimaan) |
| `BIZ-006` | 422 | `ZERO_HISTORY_ESTIMATED_COST` |
| `BIZ-007` | 422 | `RECEIPT_GAP_UNEXPLAINED` |
| `BIZ-008` | 422 | `RECIPE_VERSION_UNKNOWN` |
| `BIZ-009` | 422 | `MIGRATION_GRACE_EXPIRED` (alias `BIZ-012`) |
| `BIZ-010` | 422 | `OPNAME_PENDING_OFFLINE` |
| `BIZ-011` | 422 | `DISCOUNT_EXCEEDS_NET` |
| `BIZ-012` | 422 | `MIGRATION_GRACE_EXPIRED` |
| `BIZ-013` | 422 | `STACKING_VIOLATION` |
| `BIZ-014` | 422 | `PRESET_INACTIVE` |
| `RATE-001` | 429 | Terlalu banyak request |
| `SYS-001` | 500 | Kesalahan server; pesan generik |

### 13.3 Akun, Sesi, Perangkat

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `GET /api/health` | PB | Cek hidup | ada | 0 |
| `GET /api/auth/csrf` | PB | Token CSRF | baru | 1 |
| `POST /api/auth/google` | PB | Login Google; sesi atau 202 | ubah | 1 |
| `POST /api/auth/pin-login` | PB + cookie perangkat | PIN Kasir/Barista (tolak Manager/Owner) | ubah | 1 |
| `POST /api/auth/logout` | Semua | Cabut sesi | ubah | 1 |
| `GET /api/auth/me` | Semua | Profil, peran, outlet, `menuVersion` | baru | 1 |
| `POST /api/access-requests` | PB + ID token | Kirim/perbarui permintaan akses | baru | 1 |
| `GET /api/access-requests` | SA | Daftar | baru | 1 |
| `POST /api/access-requests/:id/approve` `/reject` | SA | Setujui/tolak | baru | 1 |
| `GET, POST /api/users; PATCH /api/users/:id` | SA; OW (MG/BR/KS tenant sendiri) | Daftar/undang/ubah | baru | 1 |
| `POST /api/users/:id/revoke-sessions` `/reset-pin` `/set-manager-pin` | SA, OW; reset PIN juga MG | Cabut sesi; hapus PIN; set manager PIN (TOTP) | baru | 1, 5 |
| `GET, POST /api/devices; POST /api/devices/register` `/revoke` | SA, OW | Kode sekali pakai, register, cabut | baru | 1 |
| `POST /api/devices/:id/receipt-recovery` | OW, SA (break-glass) | Receipt Gap Recovery | baru | 7 |
| `POST /api/devices/:id/abandon-queue` | OW (TOTP) | Tinggalkan queue offline perangkat hilang | baru | 7 |
| `POST /api/devices/:id/extend-migration-grace` | SA (TOTP) | Perpanjang grace +24 jam | baru | 8 |
| `POST /api/session/outlet` | OW, MG | Pilih outlet aktif | baru | 10 |
| `POST /api/auth/totp/enroll` `/verify` `/backup-codes` | SA, OW | TOTP | baru | 5 |
| `POST /api/admin/break-glass` | SA (TOTP) | Break-glass grant | baru | 5 |
| `POST /api/pos/manager-override` | MG, OW | Manager Override PIN satu aksi | baru | 5 |

### 13.4 Katalog, Stok, Penerimaan

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `GET /api/pos/catalog` | KS | Katalog tanpa biaya + `menuVersion` + `recipeVersion` + `presetVersionHash` | baru | 2 |
| `GET, POST /api/menus; GET, PATCH, DELETE /api/menus/:id` | OW (baca: MG/BR/KS tanpa biaya) | Menu; DELETE arsip | baru | 2 |
| `GET, PUT /api/menus/:id/recipe` | OW (baca: MG) | Resep (naikkan `menuVersion` + snapshot) | baru | 2 |
| `GET /api/menus/:id/recipe-versions` | OW, MG | Riwayat resep | baru | 3 |
| `GET, POST /api/items; PATCH /api/items/:id` | OW (baca: MG/BR) | Bahan baku + kemasan | baru | 2 |
| `GET /api/inventory/balances` | OW, MG, BR | Stok fisik; nilai hanya OW/MG | baru | 3 |
| `GET /api/inventory/ledger?itemId=` | OW, MG | Log pergerakan | baru | 3 |
| `GET /api/inventory/valuation?engine=FIFO\|AVG&date=` | OW, MG | Nilai per mesin | baru | 3 |
| `POST /api/receiving; GET /api/receiving, /:id` | OW, MG, BR | Penerimaan | baru | 3 |
| `POST /api/supplier-returns` | OW | Retur supplier | baru | 6 |
| `POST /api/inventory/opname` `/confirm` `GET` | BR (draf), MG, OW (konfirmasi) | Opname + pending check | ubah | 3 |
| `GET /api/inventory/opname/pending-check?outletId=` | OW, MG, BR | Cek pending offline/migration untuk item | baru | 3 |
| `POST /api/inventory/waste` `/approve` `GET` | BR, MG, OW | Waste | ubah | 3 |
| `GET /api/reconciliation/runs; POST /run` `/acknowledge` | MG, OW (run: OW/SA) | R1–R8 | baru | 3, 5 |

### 13.5 POS, Approval, Closing

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `POST /api/pos/checkout` | KS | Penjualan online dengan `clientUuid` + `Idempotency-Key` | ubah | 2 |
| `GET /api/sales?from=` | OW, MG | Daftar penjualan; kolom HPP hanya OW/MG | baru | 2 |
| `POST /api/approvals; GET; POST /:id/approve` `/reject` | KS (minta), MG/OW (putuskan) | Approval | baru | 5 |
| `POST /api/pos/void; POST /api/pos/refund; GET /api/pos/refund/items/:salesId` | KS (minta), MG, OW | Void/refund via Approval atau Manager Override PIN | ubah | 5 |
| `POST /api/shift/open` `/close` `GET /current` `POST /attendance` | KS, BR, MG, OW | Shift + hitung buta | ubah | 5 |
| `GET /api/closing/:date; POST /api/closing/:date/confirm` | OW (lihat: MG) | Wizard Tutup Hari + Berita Acara | ubah | 5 |
| `GET /api/reports/daily?date=` | OW, MG | Laporan harian + IdleCost | baru | 5 |
| `GET /api/alerts; POST /api/alerts/:id/acknowledge` | OW, MG | Alert | baru | 5 |
| `GET, PUT /api/settings/policies` | SA (ubah), OW (lihat) | Ambang kebijakan | baru | 5 |
| `GET, POST, PATCH /api/settings/notification-channels` | OW | Brevo, Telegram | baru | 5 |
| `GET /api/audit; GET /api/audit/verify` | SA; OW (tenant) | Audit + verifikasi rantai | baru | 1 |
| `GET, POST, PATCH /api/discount-presets` | OW, MG | Preset diskon + approval + versionHash | baru | 5 |

### 13.6 Biaya dan Laporan Keuangan

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `GET /api/finance/true-cost?period=&engine=` | OW, MG | True Cost (capacity-based) | baru | 4 |
| `GET /api/finance/true-cost/menu/:menuId?period=&engine=` | OW, MG | Rincian satu menu | baru | 4 |
| `GET /api/finance/true-cost/provisional-details/:periodKey` | OW, MG | Detail provisional (trimmed mean, confidence) | baru | 4 |
| `POST /api/finance/true-cost/finalize` | OW (TOTP) | PROVISIONAL → FINAL | baru | 4 |
| `GET, POST, PATCH /api/finance/cost-pools` | OW, SA | Kolam + capacity | baru | 4 |
| `GET, POST /api/finance/expenses` | OW | Biaya operasional | baru | 4 |
| `GET, POST /api/finance/staff-rates; GET, POST /api/finance/wage-entries` | OW | Tarif + upah | baru | 4 |
| `GET /api/finance/profit-loss` | OW | Laba rugi + IdleCost | ubah | 4 |
| `POST /api/exports; GET /api/exports/:id` | OW, MG | Ekspor xlsx | baru | 9 |
| `GET /api/integrations/google; POST /connect` `/sync` `GET /callback` `DELETE` | OW | Google Sheets | baru | 9 |

### 13.7 Supply Hub

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `GET /api/admin/suppliers; PATCH /api/admin/suppliers/:id/status` | SA | Kurasi supplier | ubah | 6 |
| `GET, POST, PATCH /api/supplier-catalog` | OW, MG | Katalog internal | baru | 6 |
| `GET, POST, PUT /api/item-links` | OW | Tautan Item ↔ katalog | baru | 6 |
| `GET, POST /api/purchase-orders; GET /:id; POST /:id/send` `/cancel` `/approve` `/confirm` `/ship` | OW, MG (approve: OW di atas batas) | PO | baru | 6 |
| `GET, POST /api/supplier-invoices; POST /api/supplier-payments` | OW | Invoice + 3-way + payment | baru | 6 |
| `POST /api/suppliers/:id/reviews` | OW | Ulasan internal | baru | 6 |

**Tidak ada** rute `/api/supplier/*`.

### 13.8 Offline dan Migrasi

| Rute | Peran | Fungsi | Status | Fase |
|---|---|---|---|---|
| `POST /api/offline/sync-batch` | KS | Batch maks 20 (202) | ubah | 7 |
| `POST /api/offline/status; GET /api/offline/status/:clientUuid` | KS | Status akhir | ubah | 7 |
| `GET /api/offline/rejected; POST /api/offline/:clientUuid/review` | MG, OW | Transaksi ditolak | baru | 7 |
| `POST /api/offline/:clientUuid/approve` | OW | Posting transaksi DEVICE_REVOKED via Approval | baru | 7 |
| `POST /api/migration/jobs; GET` `GET /:id` | OW (lihat: SA) | Batch + status | ubah | 8 |
| `PUT /api/migration/jobs/:id/mapping; POST /validate` `/reconcile` | OW | Pemetaan, validasi, rekonsiliasi | baru | 8 |
| `POST /api/migration/jobs/:id/commit` | OW (TOTP) | Persetujuan + komit | baru | 8 |
| `POST /api/migration/jobs/:id/approve` `/rollback` | SA | Persetujuan + rollback | baru | 8 |
| `GET /api/migration/templates/ledgerline.xlsx` | OW | Templat xlsx | baru | 8 |

### 13.9 Rute Dihapus

- `mock.routes.ts`, `POST /auth/pin/login`, `POST /sales/checkout`, `GET /reports/hpp/today`.
- `ssotRoutes`/`kitchenRoutes` duplikat.
- `POST /api/finance/log`, `POST /api/finance/backup/restore`, `GET /api/finance/true-hpp`, `POST /api/pos/void-fallback`.
- `/api/migration/requests/*`, `/api/admin/migration-tickets`, `/api/tenant/migration-tickets`.
- `/api/supplier/*`.

### 13.10 Rute Publik

`GET /api/health`, `GET /api/auth/csrf`, `POST /api/auth/google`, `POST /api/access-requests`, `POST /api/auth/pin-login`.

### 13.11 Test Wajib

- Route scanner: gagal bila ada rute tanpa guard di luar publik, atau rute terdaftar yang tidak ada di §13.
- Matriks peran: 401/403/200 per rute per peran.
- Scanner kunci biaya: pindai semua respons Kasir untuk `unitCost`, `hpp`, `hppFifo`, `hppAverage`, `margin`, `trueCost`, `costPrice`, `idleCost`, `capacityRatio`.
- Isolasi tenant: A → `RES-001` untuk id B.
- Idempotensi: kunci sama isi sama → hasil pertama; beda → `CNF-001`.
- Format: sukses/gagal konsisten; 500 tanpa teks asli.

---

## 14. UI/UX

### 14.1 Aturan Tampilan

1. Tanpa UI library baru. Tanpa mode gelap. Tema slate.
2. UI tidak hitung biaya/laba/saldo. Dari server sebagai string, hanya format.
3. Angka biaya selalu sebut engine + status + trustLevel.
4. Sembunyikan menu ≠ kontrol akses. Menu dari `GET /api/auth/me`.
5. Kasir tidak terima/simpan/tampilkan biaya.
6. `Cashier.tsx` tidak baca `costPrice`, tidak kirim `costAtSale`.

### 14.2 Rangka dan Bahan

| Aspek | Nilai |
|---|---|
| Kerangka | Sidebar `bg-[#1E293B]`, ikon `md`/penuh `lg`; isi `bg-[#F8FAFC]`; header putih border `slate-200`; `p-4`/`sm:p-6` |
| Netral | Judul `slate-900`/`800`; isi `slate-700`/`600`; label `slate-500`/`400`; border `slate-200`/`100`; kartu putih/`slate-50` |
| Aksen | `amber-500` logo + aktif; `amber-400` aksen |
| Aksi utama | `indigo-600` Bayar (`h-14`, kapital) |
| Status | `emerald` sukses; `rose` bahaya; `amber` warning; `indigo` info |
| Bentuk | `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`; `shadow-xs`/`xl` |
| Tipografi | `font-sans`; judul `font-black`/`bold`; angka `font-mono`; label kapital `tracking-widest` |
| Ikon | `lucide-react` 13–18 px |
| Gerak | Hanya `animate-pulse` |
| Komponen | `Button`/`Input`/`Modal` diselaraskan Fase 2 |

### 14.3 Mode Tampilan

`UiMode`: sederhana (default) / lanjutan, `localStorage` key `ledgerline_ui_mode`. Peran/tenant/token tidak pernah di `localStorage`.

### 14.4 Navigasi per Peran

| Menu | Tab | Peran | Layar | Fase |
|---|---|---|---|---|
| Dashboard | dashboard | OW, MG | `Dashboard.tsx` + IdleCost | 5 |
| Kasir POS | kasir | KS | `Cashier.tsx`; offline; Manager Override PIN dialog | 2, 5, 7 |
| Stok & Ledger | stok | OW, MG, BR | `Inventory.tsx` | 2, 3 |
| True Cost & Laporan | laporan | OW, MG | `FinancialReports.tsx` | 4, 5 |
| Supply Hub | supplier | OW, MG | `SupplyHubAdmin.tsx` | 6 |
| Pusat Migrasi POS | migrasi | OW | `MigrationCenter.tsx` | 8 |
| Pengaturan | pengaturan | OW; MG terbatas | `StorefrontProfile.tsx` | 1–9 |
| Admin Platform | superadmin | SA | `AdminDashboard.tsx` + Permintaan Akses + Persetujuan + Break-Glass Log | 1 |

Kasir hanya Kasir POS. Barista hanya Stok & Ledger (Penerimaan, Bahan Baku tanpa nilai, Waste, Opname draf). Owner tidak melihat Kasir kecuali `allowSelfCashier = true`. Nama sidebar sederhana: **Kasir POS, Stok & Ledger, Laporan & True Cost, Pengaturan**. Bilah bawah maks 5 menu.

**Modul beku** disembunyikan default. Flag `FROZEN_MODULES` (default mati) menyalakan. Tidak diuji, tidak didukung.

### 14.5 Perubahan Teks dan Elemen

| Elemen | Sekarang | Menjadi |
|---|---|---|
| Subjudul sidebar | From Counter to Ledger | **From Supply to Sale** |
| Subjudul header | Ledger-first Coffee & Resto OS | **Coffee Business OS · True Cost** |
| Tiga chip alur | 1. Transaction Engine, 2. Event-Ledger, 3. Profit Engine | **1. Transaksi, 2. Ledger FIFO + Average, 3. True Cost** |
| Lencana AI-Assisted | Ada | **Dihapus** |
| Tombol Peran | Bisa diubah klien | **Baca saja** |
| Tombol Tutup Kasir/Closing | Satu | **Tutup Shift** (KS/BR) atau **Tutup Hari** (MG/OW) |
| Kotak SESI DEMO | Ada | **Dihapus** |
| Keluar Sesuai Toko | Hapus data browser | **Keluar: cabut sesi server** |
| Nama menu | Stok & Event-Ledger, Kebenaran Laba, Supplier Hub | **Stok & Ledger, True Cost & Laporan, Supply Hub** |
| Judul index.html | Ledger-first... | **LedgerLine by Aslam: Coffee Business OS berbasis True Cost** |

### 14.6 Layar

- **Masuk:** Masuk + Minta Akses. Tanpa tombol demo. Tab PIN hanya di perangkat ber-`deviceId`.
- **Kasir POS:** 12 kolom. Lencana Offline, chip Menunggu sinkron, tombol Sinkron sekarang. Metode bayar label (R7: `Σ = grossAmount + tipAmount`). Diskon preset (selalu boleh) + manual (DS1). **`ManagerOverrideDialog`** untuk aksi butuh approval. Struk lokal berlabel Menunggu sinkron. Tanpa biaya. Target sentuh ≥44 px.
- **Tutup Shift/Hari:** wizard 5 langkah. Langkah 1 hitung buta (expectedCash tidak tampil sebelum hitung). Langkah 3 daftar periksa (opname, `FLAGGED`/`REJECTED`, `PENDING`, `PENDING_MIGRATION`, **pending offline opname**) + panel R1–R8. Langkah 4 jurnal dari server. Banner `migrationPending`.
- **Stok & Ledger:** Menu Jual, Bahan Baku (EnginePair), Resep BOM (+ riwayat versi), Ledger Stok (2 kolom, baris `ESTIMATED`/`PENDING_MIGRATION` ditandai), Penerimaan, P.O & Pembelian, Stock Opname (**dengan pending check**), Retur Supplier.
- **True Cost & Laporan:** tab True Cost (default), Laba Rugi, Selisih, Rekonsiliasi, Google Sheets. Filter periode/outlet/engine, pill status + confidence, Finalisasi (TOTP). Kartu: Penjualan, True Cost, Laba, Selisih vs HPP, **IdleCost terpisah dengan capacityRatio**. Tabel per menu + TrustBadge. Klik baris → panel samping.
- **Supply Hub:** Cari Supplier, Pesanan, Tautan Item, Invoice & Bayar. **Tanpa portal Supplier.**
- **Pusat Migrasi POS:** wizard 6 langkah. Rollback hanya SA. Preset contoh dihapus. **Peringatan migration grace** + countdown timer.
- **Pengaturan:** Profil Kafe, Etalase Menu, Pengguna & Akses (+ Set Manager PIN), Google Sheets, Perangkat, Kebijakan, Biaya Operasional (+ capacity), Notifikasi, Keamanan (TOTP).
- **Admin Platform:** Tenant, Supplier, Audit (+ Verify chain), Permintaan Akses, Persetujuan, **Break-Glass Log**.

### 14.7 Komponen Baru

| Komponen | Fungsi | Aturan |
|---|---|---|
| `MoneyText` | Uang dari string | Format Indonesia, `Rp`, tanpa desimal, `font-mono`; negatif rose; tanpa `Number` |
| `StatusPill` | Pill status | Selalu berteks: `PASS`, `WARN`, `FAIL`, `PROVISIONAL`, `FINAL`, `FLAGGED`, `REJECTED`, `PENDING`, `SYNCED`, `PENDING_MIGRATION`, `RECOVERED_GAP` |
| `EnginePair` | FIFO/Average | Mesin utama ditandai; selisih tampil |
| `TrustBadge` | trustLevel | `PENUH` emerald, `SEBAGIAN` amber, `RENDAH` rose, tooltip |
| `ReconChecklist` | R1–R8 | Nama, status, selisih, Akui |
| `OfflineBadge`, `SyncQueueChip` | Koneksi + antrean | Header POS + status header |
| `Stepper` | Wizard | Sama dengan `DeterministicClosingModal` |
| `EmptyState`, `ConfirmDialog` | Kosong + konfirmasi | Kalimat dampak |
| `ManagerOverrideDialog` | Field PIN Manager | `POST /api/pos/manager-override` |
| `CapacityIndicator` | capacityRatio + IdleCost | Dashboard True Cost + Biaya Operasional |
| `ProvisionalConfidenceBadge` | HIGH/MEDIUM/LOW | Badge di True Cost |

### 14.8 Aksesibilitas

- Skeleton `animate-pulse`. Galat `ModuleErrorBoundary` + pesan Indonesia.
- Huruf minimal 11 px; label kapital 10 px.
- Target sentuh POS ≥44 px. Warna bukan satu-satunya penanda. Fokus keyboard.
- Format: tanggal `21 Okt 2026`; jam 24 jam; rupiah Indonesia; kuantitas 4 desimal tanpa nol ujung; persentase 2 desimal. Kode R1–R8 dengan nama singkat.
- Responsif: sidebar ikon di `md`, bilah bawah, POS tablet lanskap + 1 kolom telepon.

### 14.9 Test UI

- Komponen `MoneyText`, `StatusPill`, `EnginePair`, `ManagerOverrideDialog`, `CapacityIndicator`.
- Scanner UI: tanpa kunci biaya di DOM/IndexedDB/`localStorage`/jaringan untuk sesi Kasir (e2e).
- Menu per peran; URL terlarang → 403.
- Tanpa string demo, "Ledger-first", "Event-Ledger", "AI-Assisted" di bundel.

---

## 15. Persyaratan Non-Fungsional

### 15.1 Keamanan dan Privasi

| Persyaratan | Bukti | Fase |
|---|---|---|
| Helmet + CSP aktif, tanpa `unsafe-eval` | Test integrasi + e2e | 1 |
| CORS hanya `APP_ORIGIN` credentials | Origin asing ditolak | 1 |
| Env Zod ketat; boot gagal bila kosong/placeholder/`SECRETS_ENC_KEY` bukan 32 byte | Test env | 0 |
| **Rotasi secret** ter-commit | Checklist `STATE.md` | 0 |
| Rate limit: 300/menit/sesi; login 10/15 menit; unggah 20/jam/tenant; ekspor 10/jam/tenant; **manager-override 5/15 menit/perangkat** | Test 429 | 1, 5 |
| Zod strict semua body/query/params; 1 MB (multipart 10 MB) | Route scanner | 1 |
| Tenant-scoped helper + PostgreSQL RLS | Test lintas tenant; RLS Fase 10 | 1, 10 |
| Audit chain + advisory lock | Modifikasi satu baris → verify gagal | 1 |
| Log tanpa token/PIN/TOTP/ID token/refresh token/payload offline/managerPin | Test logger | 1, 5 |
| Berkas privat, nama acak | Test URL | 8 |
| Satu lockfile; audit bersih | CI | 0, 10 |
| Data pribadi minimal; anonimisasi | Test anonimisasi | 10 |
| **Break-glass** + audit + notifikasi | Test | 5 |
| **Sanitasi formula export** | Test `=` teks | 9 |
| **Manager Override PIN** rate-limited + audited; bukan sesi penuh | Test | 5 |

### 15.2 Kinerja dan Kapasitas

| Target | Kondisi | Fase |
|---|---|---|
| `POST /api/pos/checkout` p95 < 500 ms | 20 req serentak; 100.000 `SalesHeader` + 500 item | 10 |
| `POST /api/pos/manager-override` p95 < 300 ms | 5 req serentak | 5 |
| `GET /api/reports/daily` < 2 detik | 10.000 transaksi | 10 |
| `GET /api/finance/true-cost` < 2 detik | 1 bulan, 100 menu, dari snapshot | 10 |
| `truecost:daily` < 30 detik | 100 menu, data 1 tahun | 10 |
| Rekonsiliasi malam R1–R8 < 5 menit | 500 item, ledger 1 tahun | 10 |
| 200 transaksi offline < 2 menit | Satu perangkat, batch 20 | 7 |
| **Deadlock:** 200 offline, 5 item populer | Tanpa deadlock permanen | 7 |
| JS awal ≤ 350 KB gzip | Skrip build baca dist | 10 |

Target meleset dicatat sebagai temuan, tidak diubah diam-diam.

### 15.3 Ketersediaan, Data, Operasi

- **Ketersediaan:** 99,5%/bulan jam operasional (≈3,6 jam gangguan).
- **Backup:** `pg_dump` harian terenkripsi S3; 30 harian + 12 bulanan; `BackupRun`. `npm run backup:verify` restore ke DB kosong + R1–R3 + banding baris. **RPO 24 jam** (15 menit PITR). **RTO 4 jam**. Hanya operator di server.
- **Migrasi skema:** `prisma migrate deploy` saat deploy. `db push --accept-data-loss` dihapus. Destruktif dua rilis. CI jalankan migrasi di DB kosong + data contoh.
- **Observabilitas:** winston JSON (`requestId`, `tenantId`, `userId`, `route`, `status`, `duration`). `/metrics` prom-client (Fase 10) internal/token: durasi, antrean BullMQ, gagal rekonsiliasi, `PENDING` >1 jam, SH1, `PENDING_MIGRATION` count, Manager Override per shift. Peringatan: job gagal, R1–R3 FAIL, backup gagal, antrean macet.
- **Retensi:** transaksi/jurnal/ledger/audit 10 tahun. Sesi expired 30 hari. Payload mentah Offline 90 hari. Berkas migrasi 90 hari.
- **Waktu:** UTC. `business_date` timezone outlet (`Asia/Jakarta`). Server dan DB UTC.
- **Peramban:** Chrome/Edge 2 versi stabil, Safari 16+, Chrome Android tablet. Firefox untuk OW/MG. POS offline hanya Chrome + Safari. IDR, Bahasa Indonesia.
- **Penerapan:** satu proses Node (Fastify + statis), PostgreSQL, Redis, Docker. BullMQ inline (`WORKER_MODE=inline`) atau terpisah (`separate`). `docker-compose.yml` dev. CI GitHub Actions gerbang standar + Playwright.

### 15.4 Env Variables

| Variabel | Wajib produksi | Keterangan |
|---|---|---|
| `NODE_ENV`, `PORT`, `APP_ORIGIN`, `LOG_LEVEL` | Ya | `APP_ORIGIN` untuk CORS/cookie/Origin |
| `DATABASE_URL` | Ya | PostgreSQL |
| `REDIS_URL` | Ya | Rate limit, device key, BullMQ |
| `COOKIE_SECRET` | Ya | Cookie + CSRF |
| `SECRETS_ENC_KEY` | Ya (Fase 5) | 32 byte AES-256-GCM |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` | Ya | Firebase ID token (JSON base64) |
| `GOOGLE_OAUTH_*` | Ya (Fase 9) | Sheets `drive.file` |
| `BREVO_API_KEY`, `BREVO_SENDER` | Opsional | Email |
| `TELEGRAM_BOT_TOKEN` | Opsional | Telegram |
| `BACKUP_S3_*`, `BACKUP_ENC_KEY` | Ya (Fase 10) | Backup |
| `WORKER_MODE` | Tidak | `inline` (default) / `separate` |
| `FROZEN_MODULES` | Tidak | Default mati |
| `SESSION_IDLE_MINUTES_*`, `RATE_LIMIT_*` | Tidak | Ubah default |

`GEMINI_API_KEY` dan AI **dihapus** dari `env.ts`. Super Admin: `npm run admin:create -- --email`. Reset TOTP SA: `npm run admin:reset-totp -- --email`.

### 15.5 Test Non-Fungsional

- Fase 0: test env + rotasi secret.
- Fase 1: CSP, CORS, rate limit, redaksi log.
- Fase 5: break-glass, TOTP enforcement, Manager Override PIN.
- Fase 7: sinkron 200 transaksi + deadlock.
- Fase 10: load test angka, `backup:verify`, anonimisasi, RLS, `npm audit`, ukuran bundel, checklist deploy.

---

## 16. Deployment & Operations

### 16.1 Topologi

```
┌──────────────────────────────────────────────┐
│  Reverse proxy (Caddy/Nginx) — TLS Let's Encrypt │
│  APP_ORIGIN=https://app.ledgerline.id        │
└────────────────┬─────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │  LedgerLine App (Node)  │  ← Fastify API + statis
    │  WORKER_MODE=inline     │  ← BullMQ inline
    └───┬───────────────┬─────┘
        │               │
   ┌────┴────┐     ┌────┴────┐
   │PostgreSQL│     │  Redis  │
   │   16     │     │    7    │
   └──────────┘     └─────────┘
        │
   ┌────┴─────────┐
   │  S3-compatible│  ← backup terenkripsi
   │  Object Store │
   └───────────────┘
```

### 16.2 Docker

**Dockerfile:**
1. `builder` — Node 22, `npm ci`, `build`, `prisma generate`.
2. `runner` — Node 22 slim, copy `dist`, `node_modules` prod, `prisma`, `docker-entrypoint.sh`.
3. Entrypoint: `prisma migrate deploy` → `node dist/server.js`.
4. Non-root + healthcheck.

**docker-compose.yml dev:**

```yaml
services:
  postgres:
    image: postgres:16
    environment: { POSTGRES_DB: ledgerline, POSTGRES_USER: ledger, POSTGRES_PASSWORD: ${DB_PASS} }
    volumes: [ pgdata:/var/lib/postgresql/data ]
  redis:
    image: redis:7
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [ redisdata:/data ]
  app:
    build: .
    depends_on: [ postgres, redis ]
    env_file: .env
    ports: [ "3000:3000" ]
    restart: unless-stopped
  caddy:
    image: caddy:2
    ports: [ "80:80", "443:443" ]
    volumes: [ ./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data ]
volumes: { pgdata: {}, redisdata: {}, caddy_data: {} }
```

### 16.3 CI/CD

`.github/workflows/ci.yml`:
1. `npm ci`
2. `typecheck`
3. `lint`
4. `test` (unit + integrasi dengan Postgres/Redis service)
5. `build`
6. `prisma migrate status`
7. `npm audit --audit-level=high`
8. `playwright test`
9. Route scanner + cost-key scanner
10. Cek string terlarang

`.github/workflows/deploy.yml` (saat pilot): build image → push → SSH → `docker compose pull` → `prisma migrate deploy` → healthcheck → notifikasi Telegram.

### 16.4 Runbook

Wajib memuat:
1. Deploy baru + rollback.
2. Restore backup + verifikasi R1–R3.
3. Insiden: R1–R3 FAIL, audit chain putus, antrean macet, `invalid_grant`, rate limit banjir, DB down, `PENDING_MIGRATION` stuck, Manager Override PIN terkunci.
4. Rotasi secret + re-enkripsi `SheetConnection`/`totpSecretEnc`.
5. Break-glass prosedur.
6. Receipt gap recovery.
7. Migration grace: cara kerja, pause, extend.
8. Pemulihan bencana (RTO/RPO).

### 16.5 Checklist Deploy

- [ ] `APP_ORIGIN` HTTPS valid, cookie `Secure`.
- [ ] `DATABASE_URL` Postgres 16, user non-superuser.
- [ ] `REDIS_URL` `appendonly yes`.
- [ ] `SECRETS_ENC_KEY` 32 byte di secret manager.
- [ ] Firebase service account valid.
- [ ] Migrasi terpasang.
- [ ] Super Admin dibuat.
- [ ] `backup:verify` hijau.
- [ ] Healthcheck hijau.
- [ ] `/metrics` tidak publik.
- [ ] CSP tidak blokir login Google.
- [ ] e2e MVP di staging.
- [ ] Checklist rotasi secret ditandatangani.

---

## 17. Fase Build 0–10

### 17.1 Cara Menjalankan

- Satu fase per sesi. Baca `AGENTS.md`, `STATE.md`, `DECISIONS.md`, `docs/PRD.md` bagian 1–5 + bagian fase.
- Pre-phase recap wajib.
- Hanya tugas fase itu.
- Tiga percobaan gagal → `git reset --hard fase-(N-1)`.
- Commit `fase N: ringkasan`, tag `fase-N`, update `STATE.md`, laporan.
- Test lama tetap hijau. Menghapus test dilarang.

### 17.2 Gerbang Standar

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`
5. `npx prisma migrate status` (Fase 0–1: `prisma validate`)
6. Route scanner + cost-key scanner
7. Tidak ada perubahan luar lingkup
8. **Formula biaya diuji aljabar** + lulus semua skenario edge case

### 17.3 Ringkasan Fase

| Fase | Nama | Hasil | Dependensi | Menutup |
|---|---|---|---|---|
| 0 | Pembersihan + gerbang + rotasi secret | Build bersih, tanpa rahasia bawaan | eslint diselaraskan | K6, T3, S1–S3, S8 |
| 1 | Akses & keamanan | Login Google whitelist, sesi opaque, guard, audit chain | @fastify/cookie, @fastify/csrf-protection | K1–K5, S4, S6, S7 |
| 2 | Postgres, Decimal, migrasi + **formula struk §8.9a** | DB Postgres, Decimal, menu/resep server, formula struk final | Vitest, Testing Library, jsdom | T2 |
| 3 | Mesin biaya ganda + **RecipeVersionSnapshot** + **migration grace** + **opname pending check** | Stok fisik FIFO/Average, penerimaan, R1–R3, resep historis, grace period, opname advisory | — | T1 |
| 4 | True Cost + **capacity-based** + **robust provisional** | Dashboard True Cost, IdleCost, confidence | — | T4 |
| 5 | Kontrol, laporan, alert, TOTP, break-glass, **Manager Override PIN**, **preset discount stacking** (MVP) | Shift buta, Approval, closing, laporan, alert, TOTP, PIN override | @playwright/test | T5, S5 (partial) |
| 6 | Supply Hub (internal) | Cari supplier, PO, penerimaan, invoice (tanpa portal) | — | K4 |
| 7 | POS offline-first + **recipe version** + **preset version** + deadlock + receipt recovery | Penjualan offline, sync, resep historis, grace, gap recovery | vite-plugin-pwa, idb | T6 |
| 8 | Migration Center + grace timer extend | Impor + saldo awal + grace pause/extend | exceljs | T7 |
| 9 | Google, ekspor, TOTP lanjutan, analitik | Sheets, xlsx, tren penjualan | otplib | S5 (tuntas) |
| 10 | Hardening, deployment, rilis | Backup, RLS, load test, deploy, multi-outlet | autocannon, prom-client | S5, deploy |

### 17.4 Fase 0 — Pembersihan + Gerbang + Rotasi Secret

1. `npm ci` tanpa `--legacy-peer-deps`; hapus `bun.lock`; rename paket `ledgerline`.
2. Perbaiki `tsc`. Skrip `typecheck`/`lint`/`test`/`build`. `start` = `node dist/server.cjs`; hapus `db push --accept-data-loss`.
3. `git rm --cached prisma/dev.db`, `firebase-applet-config.json`; `.gitignore`. **Checklist rotasi secret** di `STATE.md`.
4. `server/env.ts`: Zod ketat, boot produksi gagal bila rahasia kosong. Hapus `JWT_SECRET`, kata sandi superadmin, `GEMINI_API_KEY`, `@google/genai`. `.env.example`.
5. Mock hanya di luar produksi; boot produksi gagal bila ada mock. Hapus `GET /reports/hpp/today`.
6. Hapus WhatsApp di `notification.ts`. README baru.
7. `AGENTS.md`, `STACK.md`, `STATE.md`, `DECISIONS.md`, `docs/PRD.md`, CI.
8. Test env + pertahankan test lama.

**Gerbang:** `npm ci` hijau; `/reports/hpp/today` 404; boot tanpa `JWT_SECRET` gagal; rotasi secret ditandatangani.

### 17.5 Fase 1 — Akses & Keamanan

1. Model: `UserProfile` (6 peran, 3 status, `managerPinHash`), `UserOutlet`, `AccessRequest`, `Session`, `Device`, `AuditLog` chain, `BreakGlassGrant`, `ReceiptSequenceRecovery`, `RecipeVersionSnapshot` (skema), `DiscountPreset` dengan `versionHash`.
2. `npm run admin:create -- --email`.
3. Login Google + sesi opaque `ll_session` + CSRF + rate limit Redis.
4. `guard({ permission, outletScope, audit })`. Semua rute lewat guard kecuali publik. Hapus login supplier lama, `/auth/pin/login`, `/auth/login/pin`.
5. Serializer per peran + helper tenant-scoped. Hapus `x-tenant-id`.
6. Rute akun: `access-requests`, `users`, `revoke-sessions`, `reset-pin`, `set-manager-pin` (skema), `devices`, `pin-login`, `audit`, `audit/verify`, `admin/break-glass`.
7. Helmet + CSP, CORS `APP_ORIGIN`, cookie HttpOnly, redaksi log.
8. Klien: `StoreLoginPortal` → Masuk + Minta Akses; `App.tsx` baca `me` via TanStack Query; hapus token/peran dari `localStorage`, `setActiveRole`; menu dari server; Matriks Otoritas baca-saja; Admin Platform.
9. Hapus `jwt.ts`, `jsonwebtoken`, action register, JWT klien.

**Gerbang:** A1, A2, A7 (Fase 1); route scanner hijau; daftar rute = §13.

### 17.6 Fase 2 — Postgres, Decimal, Migrasi, Formula Struk

1. `docker-compose.yml` (Postgres 16, Redis 7). Provider Prisma `postgresql`.
2. Kolom uang → `Decimal(18,0)`, kuantitas/biaya → `Decimal(18,4)`. Terapkan tabel §5 untuk Fase 1–5.
3. Migrasi dasar + SQL trigger/constraint: append-only, jurnal seimbang, unique, `CHECK currentStock`, **`CHECK lineDiscount <= lineBase`**, **`CHECK total = grossAmount + tipAmount`**. Tanpa migrasi data SQLite.
4. `prisma/seed.ts` hanya non-produksi. Hapus `DemoSession`, `db-pg.ts`.
5. Rute katalog: menus, recipes (naikkan `menuVersion` + `RecipeVersionSnapshot`), items, `GET /api/pos/catalog` (dengan `recipeVersion` + `presetVersionHash`), `GET /api/sales`.
6. `POST /api/pos/checkout` dengan kontrak §10.8 + **formula §8.9a**. Fase ini catat penjualan/pembayaran/nomor; stok/HPP/jurnal di Fase 3.
7. Klien: Menu Jual, Bahan Baku, Resep BOM, katalog Kasir baca server. Selaraskan `Button`/`Input`/`Modal` §14.2. Buat `MoneyText`. Hentikan `Number()` untuk uang. Vitest + Testing Library + jsdom.

**Dependensi:** `vitest`, `@testing-library/react`, `jsdom`.
**Gerbang:** migrasi hijau; trigger test; Decimal string; katalog tanpa biaya; **formula struk A18**; `RecipeVersionSnapshot` dibuat saat resep berubah.

### 17.7 Fase 3 — Mesin Biaya Ganda + Recipe Version + Migration Grace + Opname Pending

1. Fungsi murni `server/domain/costing/` (`fifo`, `average`, `valuation`, `invariants`), Decimal, tanpa I/O.
2. `PhysicalStockService` (satu-satunya penulis kuantitas). Tiap movement: `InventoryLedger` + 2 `InventoryValuation` + jurnal COMMON/PRIMARY/SECONDARY (memo), satu transaksi, lock ascending.
3. Refaktor engine → adaptor tipis. Hapus factory. Engine utama `Outlet.primaryCosting`.
4. `CheckoutService`:
   - Konsumsi resep dalam transaksi.
   - `ESTIMATED` + zero-history + `BIZ-002`/`BIZ-006`.
   - Migration grace (`PENDING_MIGRATION`).
   - Resolusi resep historis via `RecipeVersionSnapshot`.
   - `true-up`.
   - **Formula §8.9a** untuk struk.
5. Rute: receiving, balances, ledger, valuation, opname (**+ `GET /api/inventory/opname/pending-check`**), waste, reconciliation R1–R3, `GET /api/menus/:id/recipe-versions`. `Idempotency-Key` penerimaan/waste/opname.
6. BullMQ modul + `WORKER_MODE`. Hapus `outboxWorker`. Job `reconcile` 00:30. Job `offline-sync`/`migration` di fase lanjut.
7. Klien: Stok & Ledger §14.6 (Bahan Baku EnginePair, Ledger 2 kolom, Penerimaan, Opname + pending check, Waste, riwayat resep). Hapus pengurangan stok `dataStore`.

**Gerbang:** A3, A4; property PRNG; konkurensi; atomik; ESTIMATED + true-up + zero-history; migration grace; recipe version; **A18 formula struk**; opname pending check test.

### 17.8 Fase 4 — True Cost

1. `server/domain/truecost/` (`recipe-cost`, `allocation`, `snapshot`) — fungsi murni, capacityRatio + largest remainder, basis 4, kolam 4, **robust provisional** (trimmed mean + baseline clamp + confidence), **IdleCost**.
2. Model + rute: `CostPool` (dengan `targetMonthly*`), `Expense`, `StaffRate`, `WageEntry`, `TrueCostSnapshot` (dengan `provisionalConfidence`, `provisionalDetails`).
3. Job `truecost:daily` + `truecost:monthly`. `POST /api/finance/true-cost/finalize` Owner + TOTP.
4. Rute baca: `true-cost`, `true-cost/menu/:menuId`, `provisional-details/:periodKey`, `profit-loss` (dengan IdleCost).
5. Hapus `TrueHppService`, `/finance/true-hpp`, mock `/cost-engine/true-cost/:id`, pengambilan per produk.
6. Klien: True Cost + Biaya Operasional (engine, EnginePair, TrustBadge, panel rincian, CapacityIndicator, ProvisionalConfidenceBadge). Satu request per tampilan.

**Gerbang:** A5, A6, **A6b**, **A21**; determinisme; FINAL immutable; trustLevel; IdleCost konsisten; provisional robust.

### 17.9 Fase 5 — Kontrol, Laporan, Alert, TOTP, Break-Glass, Manager Override, Preset Stacking (MVP)

1. Shift §8.2 (buka/tutup hitung buta, absensi, rute).
2. Approval §8.3 + **Manager Override PIN** §8.14. Void/refund posting pembalik kedua engine, stok kembali.
3. **Preset discount** §8.12: `DiscountPreset` (approvedBy/At/versionHash), DS1 hanya manual, **stacking rules**.
4. Tutup Hari §8.6 (`ZERO_HISTORY` blokir kecuali `PENDING_MIGRATION`).
5. Laporan harian §8.13.
6. Kebijakan + alert (R5, R6, VR1, OP1, PO1, PR1, DS1, OF1, OF2, BK1, SH1, ZH1, MG1, RV1, **PS1**, **DV1**, **DV2**, **OO1**). R4–R8 di rekonsiliasi malam.
7. Notifikasi Brevo + Telegram `fetch`.
8. TOTP §12.4 (enrollment, backup codes, AUT-005).
9. Break-glass §2.5.
10. Klien: hapus keadaan bisnis `dataStore`; Dashboard, Kasir, Stok, Laporan baca server; wizard closing; Matriks Otoritas; TOTP; **ManagerOverrideDialog**; **ProvisionalConfidenceBadge**; Pengaturan Biaya Operasional + Pengguna.
11. Hapus `dailyClosingWorker`, `/finance/daily-closing`, mock finance log.
12. Playwright e2e MVP.

**Gerbang:** A7, A8, A9, A17; MVP metrics: HPP 2 engine + jurnal seimbang 100%; True Cost FINAL ≤ tgl 3; ≥95% biaya terdokumentasi; POS p95 < 500 ms; selisih kas 100%.

### 17.10 Fase 6 — Supply Hub

1. Model §5/§9.
2. Rute internal §13.7 (tanpa `/api/supplier/*`).
3. PO lifecycle, approval Owner di atas batas.
4. Penerimaan via `/api/receiving`, alokasi biaya tambahan largest remainder, retur.
5. Invoice + 3-way + payment + `Idempotency-Key`.
6. Alert PO1, PR1.
7. Klien: SupplyHubAdmin, PurchaseOrdersTab, ReturnSupplierTab. Hapus mock.

**Gerbang:** A10; R1–R3 lulus; tidak ada rute supplier; 3-way blokir.

### 17.11 Fase 7 — Offline-First POS

1. Pendaftaran perangkat + cookie `ll_device` + `lastReceiptSeqPerDay`.
2. Antrean klien `src/lib/offline/` (outbox, catalog, meta) via `idb`; penomor struk; status PENDING/SENT/SYNCED; `storage.persist()`.
3. Service worker `vite-plugin-pwa`; hapus `public/sw.js` + `offlineQueue.ts` lama.
4. Server: `sync-batch` (maks 20, 202), status, rejected, review, approve. `OfflineTransaction` unique. BullMQ `offline-sync` dengan batching lock + deadlock retry. Hapus `offlineSyncWorker`.
5. **Resolusi resep historis** §10.7a. **Preset version** §10.7.
6. Aturan saat tiba §10.7 + flag/alert.
7. **Receipt Gap Recovery** §10.6.
8. Klien: useOnlineStatus, lencana, chip antrean, tombol sinkron, struk berlabel, transaksi ditolak. Tanpa kunci biaya di IndexedDB/cache/`localStorage`.

**Dependensi:** `vite-plugin-pwa` (dev), `idb` (versi terkunci).
**Gerbang:** A11; semua test §10.10 (deadlock, receipt gap, recipe version, preset version, migration grace, formula struk offline); e2e `context.setOffline`.

### 17.12 Fase 8 — Migration Center

1. Model §5/§11 + `MigrationJob` lengkap.
2. `server/domain/migration/` fungsi murni.
3. Rute `/api/migration` §13.8 (multipart 10 MB, 20.000 baris, 5 berkas, magic bytes; pemetaan; validasi; rekonsiliasi; komit `Idempotency-Key`; approve/rollback SA; templat xlsx).
4. Level 1+2 satu transaksi (maks 5.000 baris); saldo awal `OPENING`; Level 3 chunk 500 resumable.
5. **Migration grace:** commit Level 2 → `PENDING_MIGRATION` DONE; `migrationGraceUsedAt` di-set. Rute **extend migration grace** (SA + TOTP).
6. Rollback append-only; `ROLLBACK_BLOCKED` bila turunan.
7. Klien: wizard 6 langkah; preset alias; hapus data contoh; peringatan grace + countdown.
8. Hapus `migration.routes.ts` lama, `/api/migration/requests`, tiket, `MigrationTab`.

**Dependensi:** `exceljs`.
**Gerbang:** A12; semua test §11.10 + migration grace extend.

### 17.13 Fase 9 — Google, Ekspor, TOTP Lanjutan, Analitik

1. Sheets §12.5 (enkripsi, OAuth `drive.file`, 7 tab, RAW, sanitasi formula, job 15 menit + hari dikunci, SH1, NEEDS_RECONNECT). Hapus `gdrive.ts` + `GoogleToken`.
2. Export xlsx `POST /api/exports` + `GET /api/exports/:id` via `exceljs`. Sanitasi formula. Hapus `/finance/export-drive`.
3. TOTP lanjutan: `npm run admin:reset-totp`, tab Keamanan (sesi aktif).
4. Analitik Dashboard: tren penjualan + popularitas menu via `recharts`; **Riwayat migrasi** label, tidak masuk True Cost.

**Dependensi:** `otplib`.
**Gerbang:** A13, A14 + test Fase 9 §12.7.

### 17.14 Fase 10 — Hardening, Deployment, Rilis

1. Multi-outlet `POST /api/session/outlet` + pemilih outlet.
2. Backup `pg_dump` harian enkripsi S3, `BackupRun`, `backup:verify`, `RUNBOOK.md`.
3. RLS Postgres + anonimisasi pengguna + `npm audit` bersih.
4. Observabilitas `/metrics` (prom-client) + peringatan operator.
5. `tests/load/` autocannon + laporan angka + skrip bundel size.
6. Dockerfile, compose produksi, CI/CD deploy, `DEPLOY.md`, `RUNBOOK.md`, env.
7. Jalankan A1–A17 + checklist deploy. Tag `v1.0.0`.

**Dependensi:** `autocannon` (dev), `prom-client`.
**Gerbang:** A15, A16, semua acceptance hijau + checklist deploy.

---

## 18. Kriteria Penerimaan

| ID | Kriteria | Cara uji | Fase |
|---|---|---|---|
| A1 | Rute non-publik 401; akun tidak dikenal → satu `AccessRequest`; suspended ditolak | Route scanner + auth test | 1 |
| A2 | Tenant A → `RES-001` untuk id tenant B | Lintas tenant tiap fase | 1 |
| A3 | Fixture fisik FIFO 350.000, Average 375.000, 500g, total 500.000 | Unit + integrasi | 3 |
| A4 | Rangkaian acak → R1–R3 lulus; kegagalan tengah → tidak ada baris; konkurensi stok benar | Property PRNG + konkurensi + atomik | 3 |
| A5 | Fixture True Cost (16.000/15.100, margin 42,86%/46,07%) | Unit + integrasi | 4 |
| A6 | Alokasi 1.000.000 → 333.334/333.333/333.333; `Σ alokasi + IdleCost = pool`; FINAL immutable | Unit + properti | 4 |
| A6b | **Capacity-based:** low (alokasi 33.333, idle 9.966.667), full, over, empty; aljabar terverifikasi | Unit + properti | 4 |
| A7 | Kasir tidak terima kunci biaya di API/DOM/IndexedDB/cache/`localStorage` | Scanner + e2e | 1, 5, 7 |
| A8 | Hitung buta `expectedCash` tidak dikirim sebelum hitung; void/refund belum disetujui tidak ubah stok; hari terkunci hanya reversal; `ZERO_HISTORY` blokir closing kecuali `PENDING_MIGRATION` | Integrasi + e2e | 5 |
| A9 | Laba bersih harian fixture + konsistensi bulanan + IdleCost; R4–R8 | Integrasi | 5 |
| A10 | Alur supplier lengkap; tanpa `/api/supplier/*`; R1–R3 | Integrasi + e2e | 6 |
| A11 | Offline 3 penjualan → SYNCED; batch 3× → satu; urutan terbalik posting by `occurredAt`; REVOKED → REJECTED; deadlock 200; receipt gap; recipe version (150ml→200ml→potong 150ml); **preset version historis**; migration grace (cutover pagi → migrasi siang → DONE) | Playwright + integrasi | 7 |
| A12 | M1 710.000; 2× ditolak; rollback BLOCKED setelah satu penjualan; riwayat tidak gerakkan stok/True Cost/R7 | Unit + integrasi | 8 |
| A13 | Sheets 2× sama; `=` teks; 3× SH1; `invalid_grant` NEEDS_RECONNECT; refresh token enkripsi | Integrasi | 9 |
| A14 | TOTP sekali pakai; backup codes; aksi wajib TOTP ditolak AUT-005; break-glass tanpa TOTP ditolak; receipt gap >10 tanpa TOTP ditolak; **Manager Override PIN** audited, bukan sesi penuh | Integrasi | 5 |
| A15 | `backup:verify` restore DB kosong, baris sama, R1–R3 | Skrip + test | 10 |
| A16 | Kinerja §15.2 tercapai atau dilaporkan | Load test | 10 |
| A17 | MVP end-to-end: masuk, shift, 3 menu, tutup shift, void via **Manager Override PIN**, tutup hari, laporan + True Cost dihitung ulang | Playwright | 5 |
| **A18** | **Formula struk §8.9a**: fixture lengkap (inclusive, non-inclusive, SC included, tip, `Σ payments = grossAmount + tipAmount`) | Unit + integrasi | 2 |
| **A19** | **Stacking diskon**: preset + manual (manual DS1), 1 preset/line, 1 preset/cart, total ≤ 90% subtotal, prorata `lineHppBase` | Unit + integrasi | 5 |
| **A20** | **Opname race**: offline sale + opname → `BIZ-010`; override + reconcile; device abandon → WASTE; `PENDING_MIGRATION` item → `BIZ-010` | Integrasi + e2e | 3, 7 |
| **A21** | **Robust provisional**: trimmed mean abaikan spike; baseline clamp; confidence HIGH/MEDIUM/LOW; `daysElapsed < 5` simple mean | Unit + properti | 4 |
| **A22** | **Grace timer**: pause saat job aktif; cap 48 jam; hard deadline 72 jam; extend SA 96 jam; lewat hard deadline → REJECTED BIZ-012 + alert MG1 | Integrasi + e2e | 7, 8 |

**Daftar periksa MVP (setelah `fase-5`):** A1–A9, A17, A18, A19 hijau; gerbang standar; tidak ada mock di produksi; `.env` valid; rotasi secret ditandatangani. Satu outlet pilot boleh pakai dengan batasan: belum offline, belum migrasi, belum supply hub, belum sheets, menu/bahan/resep manual, saldo awal via penerimaan dengan biaya eksplisit.

### Strategi Pengujian

- **Lapisan:** Unit di `server/domain`; Integrasi `Fastify.inject` + supertest + PostgreSQL asli (tenant sendiri, bersihkan); Property PRNG seed yang mencetak seed saat gagal; Komponen Vitest + Testing Library; e2e Playwright build produksi.
- **Tiruan batas luar:** firebase-admin, Sheets, Brevo, Telegram, S3. DB/Redis tidak ditiru.
- **Waktu/acak:** clock disuntik; domain tidak panggil `Date.now()`/`Math.random()`.
- **Fixture:** di `server/tests/fixtures/`, terpisah dari `seed.ts`.
- **Test kontrak:** route scanner + cost-key scanner tiap fase.
- **Cakupan:** `server/domain/**` ≥90% cabang. Tidak ada ambang global.
- **Test tidak stabil = bug.** Dilaporkan + diperbaiki; retry hanya e2e dengan satu ulangan dicatat.
- **Definisi selesai tiap fase:** gerbang standar + khusus + acceptance fase + ringkasan + `STATE.md`.

---

## 19. Di Luar Cakupan, Asumsi, Pertanyaan

### 19.1 Di Luar Cakupan

| Hal | Jejak | Perlakuan |
|---|---|---|
| Pembayaran digital (Midtrans, QRIS dinamis, EDC) | ~10 berkas | **Dibekukan**; metode bayar label |
| QR Menu + pesanan meja | `Barcode Meja QR`, `VisitorMenu`, `QrMenu` | **Dikeluarkan**; disembunyikan |
| Fitur AI | Ada | **Dikeluarkan**; `GEMINI_API_KEY` dihapus |
| KDS | `pages/KDS.tsx`, `kitchen.routes.ts` | **Dibekukan**; dikunci guard |
| Kontribusi Channel | `ChannelContributionView` | **Dibekukan** |
| Langganan bertingkat | Ada | **Dibekukan**; tanpa pembatasan fitur |
| Loyalti/voucher | Sebagian | Tidak dibangun |
| Printer termal/WiFi | `PrinterTab`, `PrinterSetupModal` | **Dibekukan**; dialog cetak peramban tetap |
| Neraca + Arus Kas | Tab tanpa rute | **Disembunyikan** sampai spesifikasi akuntansi |
| Penggajian penuh, pelaporan pajak otoritas, penyusutan, bunga | Sebagian | Tidak dibangun; upah = biaya tenaga kerja |
| WhatsApp | `notification.ts` | **Dihapus Fase 0**; notifikasi Brevo/Telegram |
| Native iOS/Android | Tidak ada | Tidak dibangun; PWA |
| Transfer stok antar outlet | Tidak ada | Tidak dibangun |
| Integrasi akuntansi eksternal | Tidak ada | Tidak dibangun; Sheets + xlsx |
| Multi-currency/multi-language | Tidak ada | IDR + Indonesia |
| **Portal supplier eksternal** | Ada di v1 | **Dihapus**; Supply Hub internal |

**Modul beku:** kode tetap, tidak diuji, tidak didukung. Jika `FROZEN_MODULES` dinyalakan, wajib guard + serializer sama, tanpa mock di produksi, tanpa tulis ledger/stok/jurnal tanpa `PhysicalStockService`/`CheckoutService`.

### 19.2 Asumsi

1. Pertahankan desain dan tampilan repo; selesaikan seluruh PRD.
2. Pengguna sasaran: coffee shop/kafe dengan resep. Menu tanpa resep → HPP "Belum tersedia".
3. MVP satu outlet pilot; multi-outlet v1.0 hanya pemilih.
4. IDR, Bahasa Indonesia, `Asia/Jakarta`.
5. Engine default **Average**; basis alokasi default **UNITS**; **Capacity** default rata-rata 3 bulan atau manual; semua bisa diubah per outlet.
6. Angka ambang kebijakan = usulan awal; SA ubah per outlet.
7. Redis wajib di produksi; tanpa Redis boot gagal kecuali test.
8. Pemilik sediakan Firebase, OAuth Google, Brevo, Telegram.
9. Preset POS lama belum diverifikasi; pemetaan manual + templat tersedia.
10. Retensi 10 tahun = asumsi pembukuan; konfirmasi akuntan.
11. Angka fixture contoh uji, bukan data produksi.
12. Hasil gerbang belum dijalankan penuh; kondisi awal di Fase 0.
13. **Rotasi secret** sebelum Fase 0 selesai.
14. **Break-glass** wajib untuk akses biaya tenant.
15. **Supply Hub** internal procurement.
16. **Manager Override PIN** untuk approval POS fisik.
17. **Formula struk §8.9a** wajib diikuti tanpa variasi.
18. **Capacity default** rata-rata 3 bulan atau manual; jika kosong, capacity = realisasi (absorption 100%).

### 19.3 Perubahan Utama dari v1 ke PRD V1

Lihat §0.3 dan §0.1. Semua perubahan konsolidasi.

### 19.4 Pertanyaan Terbuka

| No | Pertanyaan | Bawaan | Sebelum |
|---|---|---|---|
| 1 | Hosting (VPS/PaaS/cloud)? Redis/Postgres dikelola? | Docker di VPS + Postgres + Redis sendiri; PITR tidak dijanjikan | 10 |
| 2 | Ganti Kasir saat offline? | Tidak didukung | 7 |
| 3 | Owner boleh jualan? | Ya jika `allowSelfCashier = true`; default false | 5 |
| 4 | Manager/Barista peran sungguhan? | Ya | 1 |
| 5 | Metode bayar? | Tunai, QRIS, Transfer, Kartu | 2 |
| 6 | Tip + service charge dicatat? | Tip: ya (2020); SC: ya (4020), tidak masuk pool | 5 |
| 7 | Engine default? | Average | 3 |
| 8 | Modul beku disembunyikan/dihapus? | Disembunyikan via `FROZEN_MODULES` | 0 |
| 9 | Hapus riwayat git + rotasi kunci? | Keluarkan tracking + rotasi; riwayat tidak ditulis ulang | 0 |
| 10 | Basis alokasi default? | UNITS | 4 |
| 11 | Paket langganan model bisnis? | Dibekukan; tanpa pembatasan | 10 |
| 12 | Ambang kebijakan sesuai outlet? | Seperti tertulis | 5 |
| 13 | Berkas ekspor asli Moka/Majoo/Pawoon/Kasir Pintar? | Pemetaan manual + templat | 8 |
| 14 | Retensi pembukuan? | 10 tahun | 10 |
| 15 | SA + dokumen verifikasi? | Pemilik menunjuk SA pertama | 1, 6 |
| 16 | Firebase/OAuth/Brevo/Telegram? | Pemilik, sebelum Fase 1 (Firebase) dan Fase 5 (Brevo, Telegram) | 1, 5, 9 |
| 17 | Level 2 Migration >5.000? | Tolak "pecah batch" | 8 |
| 18 | Late entry True Cost bulanan? | Bulan berjalan + `snapshot.flags` | 8 |
| 19 | Receipt gap >100? | SA + investigasi + RUNBOOK | 7 |
| 20 | Service charge pendapatan/tip? | Pendapatan (4020) | 5 |
| 21 | Capacity default? | Rata-rata 3 bulan; jika kosong, capacity = realisasi | 4 |
| 22 | Manager Override PIN wajib? | Ya, default aktif; bisa dimatikan Owner | 5 |
| 23 | Migration grace 24 jam cukup? | 24 default, pause 48, hard 72, extend 96 | 7 |
| 24 | RecipeVersionSnapshot retensi? | Sama dengan resep (10 tahun) | 3 |
| 25 | **`taxServiceChargeIncluded` default?** | true (Jakarta); Owner konfirmasi saat onboarding | 2 |
| 26 | **Formula struk untuk multi-tax?** | v1 hanya satu `TaxRate`; multi-tax di luar cakupan | 2 |
| 27 | **Cart discount manual?** | Tidak ada di v1; buat sebagai preset | 5 |
| 28 | **Opname override default?** | Block default; Manager/Owner bisa override dengan alasan + audit | 3 |
| 29 | **Preset inactive — retensi struk lama?** | Struk lama tetap valid; preset inactive tidak bisa dipakai baru | 5 |
| 30 | **Abandon queue — audit trail?** | WASTE `DEVICE_LOST` + audit + notifikasi Owner | 7 |

**Mengubah PRD:** sebut bagian terdampak, perbarui acceptance §18, catat di `DECISIONS.md`. Agen **tidak boleh** mengubah PRD; bertanya (Aturan 23).

---

## 20. Penutup

PRD V1 adalah **satu-satunya sumber kebenaran** untuk membangun LedgerLine. Ia menggabungkan seluruh evolusi dokumen dan tiga gelombang verifikasi kritik, dengan koreksi tambahan pada formula alokasi dan formula struk. Semua formula biaya diuji aljabar dan diverifikasi dengan skenario edge case.

**Yang harus diingat agen:**

1. **`STATE.md` adalah memori proyek.** Baca sebelum, update sesudah.
2. **Pre-phase recap wajib.**
3. **Gerbang standar hijau** sebelum menyatakan fase selesai.
4. **Angka biaya tidak pernah ditebak.**
5. **Formula biaya diuji aljabar** — bukan hanya naratif.
6. **Kasir tidak pernah menerima biaya.**
7. **Satu realitas fisik, dua valuasi parallel, satu interpretasi ekonomi** dengan **capacity-based absorption**.
8. **Formula struk §8.9a** wajib diikuti tanpa variasi.
9. **Deployment adalah bagian produk.**
10. **Berhenti dan tanya** bila ambigu. Jangan menebak.