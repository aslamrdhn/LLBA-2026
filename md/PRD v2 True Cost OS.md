# PRD LedgerLine by Aslam: Coffee Business Operating System berbasis True Cost

Oct 6, 2026 · @aslam

## 1. Identitas, Visi, dan Prinsip Produk

LedgerLine by Aslam adalah Coffee Business Operating System yang berpusat pada True Cost: ia tidak hanya menghitung penjualan, tetapi menghitung biaya di balik setiap penjualan, dari barang masuk sampai produk terjual.

**From Supply to Sale. From Cost to True Cost.**

&#91;embedded content: rantai nilai · 10 tahap, 1 percabangan dua valuasi\]

Satu stok fisik masuk, FIFO dan Average menilainya, lalu hasilnya menjadi HPP, True Cost, dan margin. Rantai teksnya: Supply, Purchase, Receiving, Inventory, FIFO + Average, Recipe, HPP, True Cost, Sales, Margin, Keputusan bisnis.

**Pertanyaan inti.** Berapa sebenarnya biaya yang dikeluarkan untuk menghasilkan setiap produk yang dijual? Jawabannya harus berasal dari data inventori, pembelian, resep, dan transaksi yang terdokumentasi, bukan dari tebakan.

**Identitas.** LedgerLine by Aslam adalah Coffee Business Operating System yang berpusat pada True Cost, yang menghubungkan supply, inventory, recipe, sales, costing, dan finance melalui deterministic cost engine berbasis FIFO dan Average Cost, sehingga pemilik coffee shop dapat memahami biaya sebenarnya di balik setiap penjualan dan mengambil keputusan berdasarkan kondisi ekonomi bisnis yang nyata.

**Visi.** Membangun sistem operasi bisnis khusus coffee shop yang mampu menghubungkan supply, inventory, recipe, sales, costing, finance, dan business intelligence sehingga pemilik usaha dapat memahami True Cost dan mengambil keputusan berdasarkan kondisi ekonomi bisnis yang sebenarnya.

**Misi.** Menyediakan satu sistem yang secara deterministik mencatat pergerakan bisnis dari bahan baku masuk hingga produk terjual, menghitung cost menggunakan FIFO dan Average Cost secara konsisten, mengubahnya menjadi HPP dan True Cost, serta membantu pemilik menemukan supplier, mengontrol operasional, memahami margin, dan mengambil keputusan bisnis dengan data yang dapat dipercaya.

**Prinsip produk.**

1. **Satu realitas fisik, dua valuasi, satu interpretasi ekonomi.** Satu pergerakan stok fisik dinilai oleh FIFO dan oleh Average. Keduanya memberi perspektif biaya berbeda dari stok yang sama, lalu dibaca sebagai satu gambaran ekonomi bisnis.
2. **True Cost lebih luas dari HPP.** Material Cost + Packaging + Labor + Allocated Operating Cost.
3. **Deterministik dan dapat ditelusuri.** Setiap angka biaya bisa dilacak ke pembelian, pergerakan stok, resep, dan transaksi. Tidak ada angka biaya dari tebakan atau nilai bawaan. Biaya estimasi boleh ada, tetapi selalu ditandai.
4. **Supply Hub adalah awal rantai ekonomi.** Supplier, produk, PO, dan penerimaan terhubung langsung ke mesin biaya (bagian 9).
5. **POS adalah titik transaksi, bukan pusat filosofi.** Data penjualan masuk ke mesin biaya untuk menghasilkan HPP, True Cost, dan margin, bukan berhenti di omzet.
6. **Anti-kebocoran adalah lapisan kontrol, bukan identitas.** Opname, hitung kas buta, rekonsiliasi, audit log, persetujuan, dan buku besar ganda memastikan data yang dipakai menghitung True Cost benar dan dapat dipercaya.
7. **POS tidak boleh berhenti.** Penjualan tetap berjalan tanpa internet dan disinkronkan sesudahnya (bagian 10).
8. **Pindah tanpa mulai dari nol.** Migration Center membawa data dari sistem lama atau spreadsheet (bagian 11).

**Pengguna.**

| Peran | Tujuan utama |
| --- | --- |
| Super Admin | Mengendalikan akun, kebijakan, supplier, migrasi, dan audit seluruh sistem |
| Owner | Memahami True Cost dan margin, menyetujui void dan refund, mengelola menu, resep, stok, dan biaya |
| Kasir | Melayani transaksi cepat, bahkan saat offline, tanpa akses ubah menu atau resep dan tanpa melihat biaya |
| Supplier | Menawarkan produk di Supply Hub dan memenuhi purchase order |

**Metrik keberhasilan (usulan, 90 hari setelah rilis).**

- 100% penjualan memiliki HPP di kedua mesin dan jurnal seimbang (R1 sampai R3 lulus).
- True Cost bulanan per produk terkunci paling lambat tanggal 3 bulan berikutnya.
- Sedikitnya 95% unit terjual memakai biaya terdokumentasi, bukan biaya estimasi.
- Nol transaksi hilang saat internet terputus; seluruh antrean tersinkron setelah koneksi pulih.
- 100% shift tercatat dengan selisih kas. Transaksi POS diproses dalam kurang dari 500 ms (persentil 95).

**Cakupan.** MVP = Fase 0 sampai 5: satu outlet menghasilkan True Cost per produk dari data server yang aman. Rilis penuh = Fase 0 sampai 10 (bagian 16). Asumsi target: coffee shop atau kafe yang memakai resep, yaitu bahan baku yang menjadi menu. Hal yang tidak diatur PRD ini ada di bagian 18.

**Dasar pembangunan.** PRD ini ditulis di atas repositori aslamrdhn/ladgerline (commit 07054e3, diaudit 21 Okt 2026), bukan membangun dari nol. Tampilan dan alur layar yang sekarang dipertahankan (bagian 14). Yang diganti adalah sumber kebenaran data (dari browser ke server), aturan keamanan, mesin biaya, dan penyimpanan uang (bagian 4). Mesin FIFO dan Average, checkout, void, refund, shift, dan test finansial yang sudah ada dipakai ulang.

**Cara memakai dokumen ini.** Ekspor tab ini sebagai Markdown dan simpan di docs/PRD.md pada repo aslamrdhn/ladgerline. Salin blok aturan di bagian 2 ke AGENTS.md. Lalu jalankan prompt Fase 0 sampai 10 (bagian 16) berurutan, satu fase per sesi. Jangan melompati fase.

## 2. Aturan Vibe Coding Anti-Error

Tidak ada jaminan kode bebas error sepenuhnya. PRD ini memperkecil peluang error lewat stack terkunci, fase kecil dengan gerbang verifikasi, dan test untuk logika uang dan biaya sebelum UI dibuat.

Empat pengaman utama:

1. **Stack terkunci.** Satu bahasa (TypeScript), satu repo, satu database. Versi paket dikunci saat Fase 0 dan dicatat di STACK.md.
2. **Gerbang verifikasi.** Satu fase selesai hanya bila lima perintah lulus: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, dan `npx prisma migrate status`.
3. **Berhenti dan tanya.** Bila spesifikasi ambigu atau bertentangan, AI wajib bertanya, bukan menebak.
4. **Biaya tidak ditebak.** Setiap angka biaya berasal dari fungsi deterministik dan punya sumber. Angka contoh di PRD ini hanya fixture test, bukan data.

Salin blok berikut ke file AGENTS.md (atau CLAUDE.md, atau .cursorrules) di root repo sebelum Fase 0.

```markdown
# Aturan Proyek LedgerLine by Aslam (wajib dipatuhi)

## Stack (terkunci; jangan diganti tanpa izin tertulis)
- Backend: Node 22, Fastify 5, TypeScript strict, Prisma, PostgreSQL (menggantikan SQLite di Fase 2), Zod, decimal.js
- Frontend: React 19, Vite 6, Tailwind 4, Zustand, TanStack Query, react-router-dom, lucide-react, recharts, motion
- Login: Firebase Auth (provider Google) di klien; server memverifikasi ID token dengan firebase-admin
- Job: BullMQ + Redis (menggantikan setInterval di server/workers)
- Integrasi: googleapis, bcryptjs (PIN), otplib (TOTP, Fase 9), exceljs (impor dan ekspor xlsx)
- Pengujian: node:test + supertest (server, sudah ada), Vitest + Testing Library (komponen), Playwright (e2e)
- Dependensi baru hanya yang disebut pada fase aktif di PRD bagian 16. Selain itu: tanya dulu.
- Versi dikunci exact di package.json dan dicatat di STACK.md.

## Kode
1. Dilarang any, @ts-ignore, @ts-expect-error, dan eslint-disable tanpa alasan tertulis.
2. Semua input API divalidasi Zod (server/middlewares/validate.ts). Tipe diturunkan dari skema (z.infer).
3. Kode domain baru ditaruh di server/domain/* sebagai fungsi murni: tanpa import Fastify atau Prisma, agar bisa diuji tanpa database.
4. Setiap rute memakai guard({ roles, outlet, audit }). Rute tanpa guard dianggap bug, kecuali daftar publik eksplisit (login, health, dan daftar publik di PRD bagian 13). Ada test yang menelusuri semua rute dan gagal bila ada yang lolos.
5. tenantId, outletId, dan peran HANYA dari sesi server. Dilarang membaca tenant dari header (x-tenant-id), query, atau body.
6. Teks UI Bahasa Indonesia. Nama kode, tabel, dan variabel Bahasa Inggris.
7. Tampilan dipertahankan: palet, bentuk, dan tata letak mengikuti PRD bagian 14. Komponen baru memakai Button, Input, dan Modal yang sudah ada. Dilarang mengubah tampilan di luar tugas fase aktif.
8. Dilarang endpoint, komponen, atau data contoh (mock) di build produksi. Server menolak boot bila NODE_ENV=production dan ada rute mock terdaftar.

## Uang, stok, biaya, waktu
9. Uang = Decimal(18,0) rupiah bulat. Kuantitas = Decimal(18,4). Biaya satuan = Decimal(18,4). Dilarang Float atau number untuk nilai ini. JSON API mengirimnya sebagai string.
10. Pembulatan half-up ke rupiah hanya saat posting jurnal (balanceJournalLines). Alokasi biaya memakai metode sisa terbesar agar jumlah teralokasi sama persis dengan kolam biaya.
11. Setiap mutasi uang atau stok berjalan dalam SATU transaksi DB dengan lock baris pada item terkait.
12. Ledger, pergerakan stok, nilai valuasi, dan audit log append-only. Koreksi = jurnal pembalik, bukan UPDATE atau DELETE.
13. Kuantitas fisik ditulis HANYA oleh PhysicalStockService. Mesin FIFO dan Average hanya menilai, tidak menulis kuantitas.
14. HPP, True Cost, dan margin hanya dihitung fungsi deterministik di server/domain. Dilarang angka biaya dari tebakan, nilai tetap, atau harga jual. Biaya yang bukan dari dokumen pembelian wajib cost_source = ESTIMATED dan tampil sebagai estimasi.
15. Kasir tidak pernah menerima data biaya (unit_cost, HPP, True Cost, resep berbiaya) di respons API, cache offline, store klien, maupun UI. Penyaringan dilakukan di serializer server.
16. Simpan waktu dalam UTC. business_date dihitung dari timezone outlet (default Asia/Jakarta).
17. Mutasi POS memakai kontrak offline-ready: client_uuid, device_id, occurred_at, dan Idempotency-Key = client_uuid (PRD bagian 10).

## Proses
18. Kerjakan hanya fase aktif. Dilarang membuat fitur fase berikutnya.
19. Sebelum mengubah sebuah file, baca file itu. Awali fase dengan menjalankan gerbang untuk mencatat kondisi awal.
20. Migrasi yang sudah di-commit tidak boleh diubah. Buat migrasi baru.
21. Dilarang menghapus atau melemahkan test agar lulus. Test gagal = perbaiki kode.
22. Fase selesai hanya bila typecheck, lint, test, build, dan prisma migrate status lulus (sebelum Fase 2: prisma validate). Tempel ringkasan outputnya.
23. Spesifikasi ambigu atau bertentangan: berhenti dan ajukan pertanyaan. Dilarang menebak.
24. Secret hanya dari env. Dilarang nilai bawaan untuk JWT_SECRET, kata sandi, atau kunci enkripsi: server berhenti bila kosong. Dilarang commit .env, database, atau berkas konfigurasi berisi kunci.
```

## 3. Peran dan Hak Akses

Ada empat peran. Semua akun masuk lewat Google dan baru aktif setelah disetujui Super Admin, yang menjadi satu-satunya peran pengubah peran dan status akun. Data biaya hanya terlihat oleh Owner dan Super Admin; Kasir tidak pernah menerimanya.

| Kemampuan | Super Admin | Owner | Kasir | Supplier |
| --- | --- | --- | --- | --- |
| Setujui akun, ubah peran, suspend | Ya | - | - | - |
| Kurasi dan verifikasi supplier | Ya | - | - | - |
| Atur kebijakan (ambang alert, rate limit, kill switch) | Ya | - | - | - |
| Daftarkan dan cabut perangkat POS | Ya | Ya | - | - |
| Lihat audit log | Semua outlet | Outlet sendiri | - | - |
| Kelola menu, resep, modifier, bahan baku | Ya | Ya | Lihat menu saja, tanpa biaya | - |
| Transaksi POS (buka shift, jual), termasuk offline | - | - | Ya | - |
| Ajukan void atau refund | - | - | Ya | - |
| Setujui void, refund, opname | Override tercatat | Ya | - | - |
| Lihat HPP, True Cost, margin, rekonsiliasi, alert | Semua outlet | Outlet sendiri | Tidak pernah | - |
| Atur kolam biaya overhead dan basis alokasi | Ya | Ya | - | - |
| Kunci hari bisnis dan finalisasi True Cost bulanan | Lihat | Ya | - | - |
| Biaya operasional, staf, upah | Lihat | Ya | - | - |
| Penerimaan barang dan stock opname | Lihat | Ya | - | - |
| Cari supplier, buat PO, catat pembayaran supplier | - | Ya | - | - |
| Katalog sendiri, konfirmasi PO, pengiriman, invoice | - | - | - | Ya (data sendiri) |
| Migration Center: buat batch, petakan, validasi, komit | - | Ya (outlet sendiri) | - | - |
| Migration Center: setujui batch berisi saldo awal atau riwayat penjualan, rollback | Ya | - | - | - |
| Hubungkan Google Sheets dan ekspor laporan | - | Ya | - | - |

**Alur akun.**

1. **Bootstrap.** Super Admin pertama dibuat oleh seed dari env SUPERADMIN\_EMAIL.
2. **Jalur undangan.** Super Admin memasukkan email, peran, dan outlet; status invited. Login Google pertama dengan email yang sama mengaktifkan akun.
3. **Jalur permintaan.** Email tidak dikenal yang login Google tidak mendapat sesi. Sistem mencatat access\_request berstatus pending untuk ditinjau Super Admin.
4. **Suspend.** Akun suspended ditolak saat login dan semua sesi aktifnya dicabut.
5. **Supplier.** Mendaftar lewat formulir (applied), diverifikasi Super Admin (verified), lalu diaktifkan (active).
6. **Batas outlet.** Owner dan Kasir terikat ke outlet lewat user\_outlets. Data di luar outlet ditolak di level query, bukan hanya disembunyikan di UI.
7. **Perangkat POS.** Penjualan hanya diterima dari perangkat yang terdaftar dan tidak dicabut (bagian 10). Pencabutan perangkat langsung menolak sinkron berikutnya.

**Aturan wajib.** Pengecekan izin dilakukan di server (withApi) dan di filter query outlet\_id. Penyaringan data biaya untuk Kasir dilakukan di lapisan serializer respons, bukan hanya di UI. Menyembunyikan tombol bukan kontrol akses.

**Peran turunan dan batas nominal.** UI repo sudah memiliki matriks otoritas berbasis nominal (AuthorityMatrixModal). Empat peran platform di atas tetap, dan dua peran turunan di bawah Owner dipertahankan karena sudah ada di tampilan. Nilai di bawah berasal dari repo dan menjadi default yang bisa diubah Owner per outlet.

| Peran | Batas persetujuan PO dan belanja | Void | Konfirmasi opname | Tutup hari | Lihat laba (True Cost) | Master data |
| --- | --- | --- | --- | --- | --- | --- |
| Kasir | 0 | Tidak (hanya mengajukan) | Tidak | Tidak | Tidak | Tidak |
| Barista | 0 | Tidak | Tidak (hanya draft opname) | Tidak | Tidak | Tidak. Mencatat penerimaan barang dan waste |
| Manager | Rp500.000 | Ya | Ya | Tidak | Ya | Tidak |
| Owner | Tanpa batas | Ya | Ya | Ya | Ya | Ya |

- Deskripsi Owner di repo menyebut PO di atas Rp2.000.000 tetapi tidak mengatur rentang Rp500.000 sampai Rp2.000.000. Default PRD: di atas batas Manager menjadi wewenang Owner.
- Peran selalu berasal dari sesi server. Kontrol activeRole dan setActiveRole di store klien dihapus. Tombol Peran di top bar menjadi tampilan baca-saja yang membuka matriks otoritas.
- Manager dan Barista tidak mengelola akun, supplier, kebijakan, Migration Center, maupun integrasi Google.
- Kata sandi Super Admin dihilangkan. Env SUPERADMIN\_PASSWORD dan DEFAULT\_OWNER\_PASSWORD dihapus. Super Admin pertama = email dari SUPERADMIN\_EMAIL yang masuk lewat Google dengan TOTP.

## 4. Baseline Repositori, Stack, dan Celah

Repositori aslamrdhn/ladgerline (commit 07054e3, 163 file) diaudit pada 21 Okt 2026 dengan membaca kode. Test database dan typecheck penuh belum bisa dijalankan saat audit karena unduhan engine Prisma diblokir di lingkungan audit, jadi status test dan sebagian error tipe adalah **belum terverifikasi**. Fase 0 membuka dengan mencatat kondisi awal yang sebenarnya.

**Stack: sekarang dan target.**

| Lapisan | Sekarang | Target | Fase |
| --- | --- | --- | --- |
| Front-end | React 19, Vite 6, Tailwind 4, Zustand, TanStack Query, lucide-react, recharts, motion | Tetap. Store klien (Zustand + IndexedDB) menjadi cache baca-saja, bukan sumber kebenaran | 5 |
| Back-end | Fastify 5 + TypeScript; rute di server/routes, logika di server/services | Tetap. Logika baru ditulis sebagai fungsi murni di server/domain | - |
| Database | Prisma + SQLite; semua uang dan kuantitas bertipe Float; db push tanpa migrasi. Berkas server/db-pg.ts (pg Pool + RLS) ada tetapi tidak dipakai di mana pun | PostgreSQL, tipe Decimal, migrasi terversi (prisma migrate), satu lapisan akses (Prisma). db-pg.ts dihapus | 2 |
| Login | Firebase Auth (Google) di klien; server memverifikasi ID token lewat firebase-admin lalu menerbitkan JWT 1 hari | Tetap memakai Firebase Auth, ditambah whitelist email, sesi di cookie HttpOnly yang bisa dicabut, dan guard di semua rute | 1 |
| Job latar | Tiga worker memakai setInterval (outbox, offline sync, daily closing). bullmq ada di package.json tetapi tidak diimpor | BullMQ + Redis. Redis sudah dipakai untuk rate limit dan cache | 3 |
| Cache biaya | node-cache di CostEngineFactory | Dihapus bersama factory | 3 |
| Pembayaran | Midtrans hanya berupa rute mock | Di luar cakupan. Metode bayar dicatat manual (bagian 18) | - |
| Pengujian | node:test + supertest (11 test, baru satu berkas finansial dan satu health). Konfigurasi jest ada tetapi skrip test memakai node:test | node:test + supertest di server, Vitest + Testing Library di klien, Playwright untuk e2e | 0, 5 |

**Peta modul repo ke PRD.**

| Area | Berkas utama | Keputusan |
| --- | --- | --- |
| Mesin biaya | server/domain/cost-engine (ICostEngine, FIFO, Average, Factory) | Pakai ulang algoritmanya. Factory yang memilih satu mesin per paket dihapus. Dua mesin selalu berjalan (bagian 6) |
| Checkout, void, refund | server/services/checkout, void, refund | Pakai ulang. Tambah valuasi ganda dan jurnal per mesin |
| Shift dan closing | shift.service, period.service, dailyClosingWorker, DeterministicClosingModal | Pakai ulang. Tambah hitung buta dan pengunci hari (bagian 8) |
| Stok | inventory.service (opname, waste), InventoryBalance, FifoLayer | Pakai ulang. Kuantitas fisik ditulis satu layanan (bagian 6) |
| True HPP | server/services/finance.service (TrueHppService) | Ganti dengan True Cost Engine (bagian 7) |
| Offline | src/lib/offlineQueue.ts, offline.routes, offlineSyncWorker, public/sw.js | Lengkapi (bagian 10) |
| Migrasi | migration.routes, MigrationCenter.tsx | Tulis ulang backend. UI dipertahankan sebagai kerangka (bagian 11) |
| Supplier | supplier.routes, SupplierPortal, SupplyHubAdmin, model Supplier, PO, Receiving | Tulis ulang autentikasi, lengkapi alur (bagian 9) |
| Rute karangan | server/routes/mock.routes.ts, sebagian ssot.routes.ts | Hapus dari build produksi (Fase 0) |
| State klien | src/store/dataStore.ts (stok, financeLogs, data contoh) | Turunkan menjadi cache baca-saja |
| Dibekukan | QR meja (public.routes, VisitorMenu, TableOrders), KDS (kitchen), Market dan Demand Intelligence, Business Auditor, Channel Contribution, paket langganan, loyalti | Tidak diatur dan tidak dikembangkan PRD ini (bagian 18) |

**Celah hasil audit.** Kolom Fase menunjukkan fase yang wajib menutupnya. Semua temuan diverifikasi di kode.

| ID | Temuan | Tingkat | Fase |
| --- | --- | --- | --- |
| K1 | POST /auth/pin/login hanya memeriksa panjang PIN lalu menerbitkan token untuk user pertama di tenant pertama | Kritis | 1 |
| K2 | googleAuth dengan action register membuat tenant dan owner baru untuk siapa saja | Kritis | 1 |
| K3 | Tombol Masuk Cepat Mode Demo (Tanpa Google) di StoreLoginPortal membuat sesi di browser dengan token palsu, tanpa verifikasi server | Kritis | 1 |
| K4 | Login supplier mengembalikan supplier.id sebagai token tanpa memeriksa kata sandi; pemeriksaan status verifikasi dikomentari | Kritis | 1 |
| K5 | Rute tanpa autentikasi: migration, supplier, mock, kitchen, ssot (termasuk POST /sales/checkout). Migrasi bisa menulis menu ke tenant mana pun | Kritis | 1 |
| K6 | JWT\_SECRET dan kata sandi superadmin bernilai bawaan di kode bila env kosong (env.ts, jwt.ts) | Kritis | 0 |
| T1 | CostEngineFactory memilih satu mesin per tenant menurut paket; tidak ada rekonsiliasi antar mesin | Tinggi | 3 |
| T2 | Uang dan kuantitas bertipe Float; algoritma memakai decimal.js lalu mengonversi ke number saat menyimpan | Tinggi | 2 |
| T3 | GET /reports/hpp/today mengembalikan angka tetap (7.500, 11.200, 18.500) yang bukan hasil hitung | Tinggi | 0 |
| T4 | True HPP membagi biaya bulanan menurut porsi omzet dan memakai number; tidak ada kemasan, modifier, kolam biaya, atau status final | Tinggi | 4 |
| T5 | dataStore klien menyimpan dan mengurangi stok serta financeLogs di browser, berisi data contoh | Tinggi | 5 |
| T6 | Service worker sengaja tanpa cache (menghapus semua cache), sehingga aplikasi tidak bisa dibuka offline | Tinggi | 7 |
| T7 | Backend migrasi hanya membuat baris Menu: tanpa validasi, rekonsiliasi, persetujuan, bahan baku, resep, atau saldo stok awal | Tinggi | 8 |
| S1 | npm ci gagal karena konflik peer dependency (eslint 10 dengan eslint-plugin-react); tsc melaporkan 56 error, sebagian besar kemungkinan efek client Prisma yang belum ter-generate, dan sedikitnya 3 error tipe nyata di front-end | Sedang | 0 |
| S2 | npm start menjalankan prisma db push --accept-data-loss | Sedang | 0 |
| S3 | prisma/dev.db (11 tenant, 7 user) dan firebase-applet-config.json ter-commit walau ada di .gitignore | Sedang | 0 |
| S4 | Audit log tidak berantai hash dan tidak append-only; hanya ditulis di 8 titik | Sedang | 1 |
| S5 | Tidak ada TOTP maupun backup otomatis; ekspor Sheets membuat spreadsheet baru tiap kali dengan USER\_ENTERED (nilai berawalan = dibaca sebagai rumus) | Sedang | 9, 10 |
| S6 | Tidak ada pengelompokan peran di server selain string role; tidak ada user Super Admin di data; peran bisa diganti dari store klien (setActiveRole) | Sedang | 1 |
| S7 | Dua kunci token klien berbeda (ledgerline\_token dan ledgerline\_jwt\_token); CORS origin true dengan credentials; CSP dimatikan | Sedang | 1 |
| S8 | README bawaan AI Studio; nama paket react-example; notification.ts mengirim lewat WhatsApp tanpa konfigurasi yang jelas | Rendah | 0 |

**Struktur folder target.** Yang sudah ada tidak dipindahkan; hanya yang bertanda baru ditambahkan.

```text
ladgerline/
  AGENTS.md  STACK.md  docker-compose.yml (baru)  docs/PRD.md (baru)
  prisma/schema.prisma  prisma/migrations/ (baru)  prisma/seed.ts
  server.ts
  server/
    env.ts                      validasi ketat, tanpa nilai bawaan rahasia
    guards/ (baru)              guard({ roles, outlet, audit }), sesi, perangkat
    serializers/ (baru)         penyaring respons per peran (Kasir tanpa biaya)
    domain/
      cost-engine/              adaptor DB di atas fungsi murni
      costing/ (baru)           fifo.ts, average.ts, valuation.ts, invariants.ts
      truecost/ (baru)          recipe-cost.ts, allocation.ts, snapshot.ts
      ledger/ (baru)            posting jurnal COMMON, FIFO, AVG
      migration/ (baru)         normalizer, validator, reconciler
    services/                   checkout, void, refund, shift, inventory, ...
    routes/                     per domain, semua lewat guard
    workers/                    diganti prosesor BullMQ
    tests/                      unit, integrasi, rute (penelusur guard)
  src/
    components/ pages/ layouts/ store/ lib/   tampilan dipertahankan (bagian 14)
    lib/offline/ (baru)         antrean, penomor struk perangkat, sinkron
  tests/e2e/ (baru)             Playwright
```

## 5. Model Data

Skema memakai tabel yang sudah ada di prisma/schema.prisma (53 tabel) dan hanya menambah atau mengubah apa yang dibutuhkan PRD. Dua konvensi: **Tenant** adalah akun bisnis Owner (satu tenant boleh punya banyak **Outlet**), dan setiap tabel transaksi memuat tenantId, outletId, businessDate, createdAt, dan pembuat.

**Aturan tipe (berlaku sejak Fase 2).**

- Uang: Decimal(18,0) rupiah bulat. Kuantitas: Decimal(18,4). Biaya satuan dan nilai per unit: Decimal(18,4). Persentase dan tarif: Decimal(9,4) atau basis poin (Int).
- Kolom JSON yang sekarang bertipe String (metadata, payload, items, allocations, config) menjadi Json.
- Enum yang sekarang String (role, status, method, type) menjadi enum Prisma.
- Primary key tetap uuid. Master data memakai soft delete; baris yang sudah direferensikan tidak pernah dihapus.

**A. Perubahan pada tabel yang sudah ada.**

| Tabel | Perubahan | Fase |
| --- | --- | --- |
| Tenant | Hapus isDemo, demoCreatedAt, dan DemoSession dari alur produksi. Kolom plan tidak lagi menentukan mesin biaya. timezone tetap sebagai bawaan outlet | 1, 3 |
| UserProfile | Tambah email (unik) dan googleSub. role menjadi enum SUPER\_ADMIN, OWNER, MANAGER, CASHIER, BARISTA, SUPPLIER. status: INVITED, ACTIVE, SUSPENDED. Hapus assignedOutlets (JSON) dan ganti tabel UserOutlet. Tambah totpSecretEnc dan totpEnabled (Fase 9). pinHash tetap (bcrypt) | 1, 9 |
| Outlet | Tambah code (untuk nomor struk), primaryCosting (FIFO atau AVERAGE, bawaan AVERAGE), allowNegativeStock (bawaan false), timezone (opsional, menimpa tenant) | 3 |
| Item | price (Float) diganti referencePrice, tidak pernah dipakai sebagai biaya. Tambah kind (RAW atau PACKAGING), baseUnitId, dan estimatedUnitCost (hanya untuk penandaan ESTIMATED) | 2, 4 |
| RecipeDetail | Tambah componentType (MATERIAL, PACKAGING, MODIFIER) dan wastePercent. quantity menjadi Decimal(18,4) | 2, 4 |
| Menu | Tambah prepMinutes (opsional, basis MINUTES) dan allocationWeight (bawaan 1) | 4 |
| InventoryBalance | currentStock adalah satu-satunya kuantitas fisik, ditulis hanya oleh PhysicalStockService. averageCost adalah keadaan mesin Average. Tambah averageValue | 3 |
| FifoLayer | isVirtual dan virtualCost diganti costSource (PURCHASE, OPENING, ESTIMATED) dan sourceRef (id penerimaan atau batch migrasi) | 3 |
| InventoryLedger | Menjadi log pergerakan fisik (kuantitas saja). unitCost dan costMethod dipindah ke InventoryValuation lalu dihapus. Tambah movementType: RECEIPT, SALE, VOID\_RESTORE, REFUND\_RESTOCK, WASTE, OPNAME, SUPPLIER\_RETURN, OPENING | 3 |
| SalesHeader dan SalesDetail | Tambah clientUuid (unik per tenant), deviceId, occurredAt, syncedAt, source (LIVE, OFFLINE\_SYNC, MIGRATION). SalesDetail: hppFifo, hppAverage, hppBreakdown (Json: material, packaging, modifier per mesin). hpp berisi nilai mesin utama. Nomor struk memakai format perangkat (bagian 10) | 2, 3, 7 |
| JournalEntry dan JournalLine | Tambah engine (COMMON, FIFO, AVG) dan reversesId. debit dan credit menjadi Decimal(18,0). Jurnal tidak boleh diubah setelah POSTED | 2, 3 |
| StockOpname | Dikelompokkan oleh StockOpnameSession. Tambah blindCount, countedBy, approvalId | 5 |
| Waste | Tambah approvalId. Persetujuan lewat tabel Approval | 5 |
| Shift | Tambah closingBreakdown (Json denominasi), countedAt, dan deviceId. actualCash ditulis sebelum expectedCash dikirim ke klien | 5 |
| CostAllocationConfig | Diganti CostPool dan AllocationRule (bagian 7) | 4 |
| DailyMenuStat | Diganti TrueCostSnapshot (bagian 7) | 4 |
| Supplier | status: APPLIED, VERIFIED, ACTIVE, SUSPENDED. Tidak ada kata sandi; masuk lewat Google lewat UserProfile.supplierId | 1, 6 |
| SupplierCatalog dan PurchaseOrderDetail | Tambah packSize dan packUnit. Tautan ke Item lewat ItemSupplierLink | 6 |
| Receiving dan ReceivingDetail | purchaseOrderId boleh kosong (belanja tanpa PO). Tambah supplierNameText, extraCost, extraCostAllocation, dan itemId wajib | 6 |
| MigrationJob | Menjadi induk batch migrasi. Tambah entityScope, fileHash, stage, checksum, approvedBy | 8 |
| OfflineTransaction | Tambah deviceId, clientUuid (unik), resultStatus, flags (Json) | 7 |
| AuditLog | Tambah outletId, actorRole, prevHash, hash. Trigger melarang UPDATE dan DELETE | 1 |
| DecisionAlert | Tambah code (R1 sampai R8 atau kode kebijakan), outletId, acknowledgedBy, acknowledgedAt | 5 |
| GoogleToken | Diganti SheetConnection. Token disimpan terenkripsi | 9 |

**B. Tabel baru.**

| Tabel | Kolom kunci | Fase |
| --- | --- | --- |
| UserOutlet | userId, outletId | 1 |
| AccessRequest | email, namaToko, telepon, status (PENDING, APPROVED, REJECTED), reviewedBy, reviewedAt | 1 |
| Session | id (jti), userId, deviceId, expiresAt, revokedAt, ip, userAgent | 1 |
| Device | tenantId, outletId, code (3 huruf), name, status (ACTIVE, REVOKED), registeredBy, lastSeenAt | 1 |
| InventoryValuation | ledgerId, engine (FIFO atau AVG), unitCost, totalValue, lotAllocations (Json), costSource | 3 |
| ReconciliationRun | outletId, businessDate, trigger, checks (Json R1 sampai R8), status (PASS, WARN, FAIL) | 3, 5 |
| Approval | type (VOID, REFUND, OPNAME, WASTE, DAY\_UNLOCK, PO), entityId, requestedBy, decidedBy, status, reason, amount | 5 |
| DailyClosing | outletId, businessDate, status (DRAFT, LOCKED), snapshot (Json), lockedBy, lockedAt | 5 |
| Expense | outletId, poolId, category, amount, allocationMode (ON\_DATE atau SPREAD\_MONTH), paidVia, attachmentUrl, occurredOn | 4 |
| StaffRate dan WageEntry | staffId, rateType (PER\_SHIFT atau PER\_DAY), amount; WageEntry: shiftId, base, bonus, tipShare, poolId | 4 |
| CostPool | outletId, name, kind (LABOR, UTILITY, RENT, OTHER), basis, expectedMonthlyAmount, active | 4 |
| TrueCostSnapshot | outletId, periodType (DAY atau MONTH), periodKey, menuId, units, revenueNet, hppFifo, hppAverage, alokasi per kolam, trueCostFifo, trueCostAverage, status (PROVISIONAL atau FINAL), trustLevel, supersedesId | 4 |
| ItemSupplierLink | tenantId, itemId, catalogId, conversionFactor, preferred | 6 |
| PriceContract | supplierId, tenantId, catalogId, price, validFrom, validTo | 6 |
| Shipment | purchaseOrderId, carrier, trackingNo, status, shippedAt | 6 |
| SupplierInvoice dan SupplierPayment | purchaseOrderId, invoiceNo, amount, dueDate, status; pembayaran: invoiceId, amount, paidVia, paidAt | 6 |
| MigrationRow, MigrationMapping, MigrationCheck | Baris staging (raw dan normal, status, error), templat pemetaan per sumber, hasil rekonsiliasi | 8 |
| SheetConnection | tenantId, outletId, spreadsheetId, refreshTokenEnc, lastSyncAt, status | 9 |
| NotificationChannel | tenantId, type (EMAIL, TELEGRAM), target, enabled | 5 |
| ExportJob dan BackupRun | jenis, status, lokasi, ukuran, waktu | 9, 10 |

**C. Aturan integritas.**

- Role database milik aplikasi tidak punya hak UPDATE dan DELETE pada AuditLog, InventoryLedger, InventoryValuation, FifoConsumption, JournalEntry (setelah POSTED), JournalLine, dan TrueCostSnapshot berstatus FINAL. Trigger menolak sisanya.
- Setiap JournalEntry harus seimbang (debit sama dengan kredit), dicek lewat constraint trigger yang ditunda sampai commit.
- CHECK remainingQty >= 0 pada FifoLayer. CHECK currentStock >= 0 kecuali outlet mengizinkan stok negatif.
- Unik: SalesHeader (tenantId, clientUuid); SalesHeader (tenantId, outletId, invoiceNumber); OfflineTransaction (tenantId, clientUuid).
- Rantai hash audit: hash = sha256(prevHash + isi baris kanonik), per tenant. Job harian memverifikasi rantai (R8).
- Setiap query ke tabel yang memuat tenantId lewat helper berlingkup tenant. Test menelusuri seluruh model ber-tenantId dan gagal bila ada query tanpa filter.
- Migrasi Fase 2 memindahkan data tanpa kehilangan: nilai Float dibulatkan ke skala Decimal dan selisih pembulatan dilaporkan, bukan dibuang diam-diam.

## 6. Mesin Biaya Fisik (FIFO dan Average)

Prinsip arsitektur: **dua mesin menghitung nilai dari satu pergerakan stok fisik yang sama.** Satu realitas fisik (InventoryLedger), dua valuasi (InventoryValuation berisi FIFO dan AVG), satu interpretasi ekonomi (True Cost, bagian 7). Kuantitas harus identik di kedua mesin; nilainya boleh berbeda secara wajar.

**Koreksi atas konsep awal.** Selisih nilai FIFO dan Average adalah perbedaan metode valuasi saat harga beli berubah, bukan bukti kebocoran. Kebocoran dideteksi lewat R1 sampai R8 di bawah, hitung kas buta, dan stock opname.

**Perubahan dari repo.** Sekarang CostEngineFactory memilih satu mesin per tenant menurut paket (cashier memakai FIFO, selain itu Average), dan FifoCostEngine serta AverageCostEngine masing-masing menulis kuantitasnya sendiri. Di PRD ini:

- Kuantitas fisik ditulis hanya oleh PhysicalStockService. Mesin tidak menulis kuantitas.
- Setiap pergerakan dinilai oleh KEDUA mesin dalam satu transaksi database, lalu hasilnya disimpan di InventoryValuation (dua baris per pergerakan).
- Outlet.primaryCosting menentukan mesin utama untuk laporan dan HPP di SalesDetail.hpp. Laporan selalu bisa menampilkan keduanya.
- CostEngineFactory dan node-cache dihapus. Algoritma FIFO dan Average yang ada dipindah menjadi fungsi murni.

**Kontrak fungsi murni** (server/domain/costing, Decimal masuk dan keluar, tanpa I/O):

```text
fifoReceive(layers, { qty, unitCost, source, ref })      -> layers
fifoConsume(layers, qty)                                  -> { allocations[{ layerId, qty, unitCost }], totalCost, layers }
avgReceive(state, { qty, unitCost })                      -> state
avgConsume(state, qty)                                    -> { unitCost, totalCost, state }
// Gagal dengan INSUFFICIENT_STOCK bila qty melebihi stok dan outlet tidak mengizinkan stok negatif.
```

**Urutan dalam satu transaksi** (checkout, void, refund, waste, opname, penerimaan, retur supplier, saldo awal):

1. Kunci baris InventoryBalance yang terlibat, diurutkan menurut itemId agar tidak terjadi deadlock.
2. PhysicalStockService menulis InventoryLedger dan memperbarui currentStock.
3. Mesin FIFO memperbarui FifoLayer dan FifoConsumption; mesin Average memperbarui averageCost dan averageValue.
4. Tulis dua baris InventoryValuation.
5. Posting jurnal COMMON, jurnal FIFO, dan jurnal AVG (tabel di bawah).
6. Tulis audit log. Bila satu langkah gagal, seluruh transaksi dibatalkan.

**Rumus.**

- FIFO: konsumsi mengambil lot tertua; biaya = jumlah (qty diambil kali unitCost lot).
- Average bergerak, saat barang masuk: rata-rata baru = (qty lama kali rata-rata lama + qty masuk kali biaya masuk) dibagi (qty lama + qty masuk).
- Average bergerak, saat barang keluar: biaya = qty kali rata-rata saat ini; rata-rata tidak berubah.
- Kuantitas konsumsi dari resep = qty resep kali (1 + wastePercent) kali jumlah porsi.

**Contoh hitung (jadikan fixture test A3).**

| Langkah | FIFO | Average |
| --- | --- | --- |
| Terima 1.000 g kopi @ Rp200 | Lot A: 1.000 g @ Rp200 | Qty 1.000 g, rata-rata Rp200 |
| Terima 1.000 g kopi @ Rp300 | Lot B: 1.000 g @ Rp300 | Qty 2.000 g, rata-rata Rp250 |
| Konsumsi 1.500 g | HPP = 1.000 x 200 + 500 x 300 = Rp350.000 | HPP = 1.500 x 250 = Rp375.000 |
| Sisa | 500 g, nilai Rp150.000 | 500 g, nilai Rp125.000 |
| Konsumsi 500 g lagi | HPP = 500 x 300 = Rp150.000 | HPP = 500 x 250 = Rp125.000 |
| Total HPP setelah stok habis | Rp500.000 | Rp500.000 |

Selisih sementara Rp25.000 adalah murni valuasi dan menghilang saat stok habis, karena keduanya sama dengan total pembelian (Rp200.000 + Rp300.000).

**Aturan per jenis pergerakan.**

| Pergerakan | Fisik | Nilai (kedua mesin) | Jurnal |
| --- | --- | --- | --- |
| RECEIPT (penerimaan) | + qty | Lot FIFO baru; rata-rata berbobot. Biaya satuan = harga dokumen + biaya tambahan teralokasi | COMMON: Dr Persediaan, Cr Utang Usaha atau Kas |
| SALE | - qty resep | Konsumsi menurut mesin masing-masing | COMMON: Dr Kas atau Bank, Cr Pendapatan, Utang Pajak, Utang Tip. FIFO dan AVG: Dr HPP, Cr Persediaan |
| VOID\_RESTORE | + qty | Dikembalikan pada nilai konsumsi aslinya (FIFO ke lot asal, Average pada biaya konsumsi asli) | COMMON dan masing-masing mesin dibalik |
| REFUND\_RESTOCK | + qty bila opsi restock dipilih | Sama dengan VOID\_RESTORE. Tanpa restock tidak ada pergerakan fisik dan HPP tidak dibalik | COMMON: Dr Retur Penjualan, Cr Kas. Mesin: Dr Persediaan, Cr HPP hanya bila restock |
| WASTE | - qty | Konsumsi menurut mesin | Mesin: Dr Beban Waste, Cr Persediaan |
| OPNAME | selisih bertanda | Kurang: seperti WASTE. Lebih: lot baru pada biaya penerimaan terakhir; bila belum pernah ada penerimaan, biaya wajib diisi manual dengan alasan dan ditandai ESTIMATED | Mesin: Dr Beban Selisih Persediaan, Cr Persediaan (lebih: kebalikannya) |
| SUPPLIER\_RETURN | - qty | Dinilai pada biaya satuan dokumen penerimaan asal. FIFO mengurangi lot asal; Average mengurangi qty dan nilai lalu menghitung ulang rata-rata | COMMON: Dr Utang Usaha atau Kas, Cr Persediaan |
| OPENING (saldo awal) | + qty | Lot OPENING dengan biaya eksplisit dari migrasi | COMMON: Dr Persediaan, Cr Saldo Awal |

**Stok negatif dan biaya estimasi.**

- Bawaan: stok tidak boleh negatif. Menu yang bahannya kurang ditandai Habis di POS.
- Bila Super Admin menyalakan allowNegativeStock untuk outlet, atau penjualan offline masuk saat stok sudah habis (bagian 10), konsumsi memakai lot ESTIMATED pada biaya penerimaan terakhir, SalesHeader.hppEstimated menjadi true, dan alert dibuat. Biaya dari harga jual atau nilai tetap dilarang.
- Saat penerimaan berikutnya, selisih antara biaya estimasi dan biaya dokumen dibukukan sebagai true-up ke HPP periode berjalan. Penjualan lama tidak diubah.

**Rekonsiliasi R1 sampai R8.** R1 sampai R3 menjaga integritas sistem; R4 sampai R8 adalah sinyal bisnis dan kontrol. Semua ambang adalah default awal yang bisa diubah Super Admin per outlet.

| Kode | Pemeriksaan | Lulus bila | Bila gagal |
| --- | --- | --- | --- |
| R1 | Kuantitas sama | Per item dan gudang: InventoryBalance.currentStock sama dengan jumlah FifoLayer.remainingQty sama dengan jumlah (qtyIn - qtyOut) di InventoryLedger | Kritis |
| R2 | Konservasi nilai | Per mesin: nilai awal + penerimaan + saldo awal + penyesuaian lebih - HPP - waste - penyesuaian kurang = nilai akhir; toleransi Rp1 per pergerakan | Kritis |
| R3 | Jurnal seimbang | Setiap JournalEntry seimbang, dan saldo akun Persediaan (COMMON + mesin X) sama dengan nilai stok mesin X | Kritis |
| R4 | Selisih valuasi | Selisih HPP FIFO dan Average kurang dari 10% HPP Average pada 7 hari bergulir | Peringatan: periksa lonjakan harga beli |
| R5 | Pemakaian teoretis dan aktual | Qty resep kali terjual dibanding (stok awal + masuk - stok opname - waste tercatat); selisih 5% atau kurang per item per minggu | Peringatan di atas 5%, kritis di atas 10% |
| R6 | Kas per shift | Selisih hitung buta dan ekspektasi (hanya tunai) tidak melewati ambang | Peringatan Rp10.000, kritis Rp50.000 |
| R7 | Penjualan, pembayaran, HPP | Total pembayaran sama dengan total tiap penjualan; setiap baris selesai punya hppFifo dan hppAverage, kecuali hppStatus UNAVAILABLE dari migrasi | Kritis |
| R8 | Audit dan nomor struk | Rantai hash audit utuh; nomor struk per perangkat per hari berurutan tanpa celah | Kritis |

Job rekonsiliasi berjalan tiap malam pukul 00:30 waktu outlet, dan setelah setiap penerimaan barang, konfirmasi opname, komit migrasi, penguncian hari, serta sinkron offline yang menyentuh item tertentu (R1 sampai R3 dan R7 untuk item itu). Hasil disimpan di ReconciliationRun; kegagalan membuat alert dan notifikasi.

**Test yang wajib (Fase 3).**

- Fixture contoh di atas: Rp350.000, Rp375.000, sisa 500 g, lalu Rp500.000 untuk keduanya.
- Test p0\_financial nomor 6 (Average) dan 7 (FIFO) yang sudah ada tetap hijau sebagai regresi.
- Property test dengan generator berbenih (tanpa dependensi baru): pada 1.000 urutan acak penerimaan, penjualan, void, refund, waste, dan opname, R1 sampai R3 selalu lulus.
- Konkurensi: 20 penjualan bersamaan tidak menghasilkan stok negatif, lot rusak, atau nomor struk ganda.

## 7. True Cost Engine

Ini jantung produk. LedgerLine tidak berhenti pada "HPP produk Rp X", tetapi menjawab: **untuk menghasilkan satu cup produk ini, berapa total biaya ekonominya?** Jawabannya selalu berasal dari data pembelian, inventori, resep, biaya, dan transaksi yang terdokumentasi.

&#91;embedded content: True Cost · 2 jalur (biaya langsung dan tidak langsung) bertemu di True Cost\]

Jalur atas adalah biaya langsung dari stok (dinilai FIFO dan Average). Jalur bawah adalah biaya tidak langsung dari kolam biaya bulanan. Keduanya bertemu di True Cost per produk, lalu menjadi True Margin.

**Definisi.** Untuk produk p, periode t, dan mesin e (FIFO atau AVG):

```text
Material(p, e)   = jumlah komponen MATERIAL: qty x (1 + waste%) x biaya satuan mesin e saat dijual
Packaging(p, e)  = rumus yang sama untuk komponen PACKAGING
Modifier(p, e)   = rumus yang sama untuk modifier yang dipilih pada penjualan
HPP(p, e)        = Material + Packaging + Modifier
Alokasi(p, k)    = Kolam(k, t) x bobot(p, k) / jumlah bobot semua produk pada kolam k
TrueCost(p, e)   = HPP(p, e) + jumlah Alokasi(p, k) untuk semua kolam k, dibagi unit terjual p
TrueMargin(p, e) = (Harga jual bersih - TrueCost(p, e)) / Harga jual bersih
bobot(p, k)      = menurut basis kolam k:
                   UNITS = unit terjual x allocationWeight; MINUTES = unit x prepMinutes;
                   REVENUE = omzet bersih; DIRECT_COST = HPP
Harga jual bersih = harga setelah diskon, di luar pajak, service charge, dan tip.
```

**Biaya realisasi dan biaya standar.**

| Jenis | Cara hitung | Dipakai untuk |
| --- | --- | --- |
| Realisasi | Dijumlah dari SalesDetail.hppBreakdown (komponen per mesin yang tersimpan saat penjualan). Tidak menghitung ulang resep | Laporan, True Cost, jurnal |
| Standar | Resep aktif kali biaya mesin saat ini, dihitung saat diminta, ditandai STANDAR | Menetapkan harga menu dan simulasi. Tidak masuk jurnal atau laporan keuangan |

Resep berversi (Recipe.version, effectiveFrom, effectiveUntil). Mengubah resep tidak mengubah penjualan lama karena SalesDetail menyimpan recipeSnapshot.

**Kolam biaya dan basis alokasi.**

| Kolam (kind) | Sumber angka | Basis bawaan |
| --- | --- | --- |
| LABOR (tenaga kerja) | WageEntry: upah dasar dan bonus. Tip tidak dihitung karena merupakan utang tip | MINUTES bila semua produk punya prepMinutes; selain itu UNITS |
| UTILITY (listrik, air, internet) | Expense berkategori utilitas | UNITS |
| RENT (sewa) | Expense sewa, bulanan atau cicilan | UNITS |
| OTHER (kebersihan dan lainnya) | Expense lainnya | UNITS |

- Basis tersedia: UNITS, MINUTES, REVENUE, DIRECT\_COST. Bawaan UNITS karena pembagian menurut omzet (perilaku TrueHppService sekarang) membuat produk mahal menanggung listrik lebih besar padahal tidak memakai lebih banyak. REVENUE tetap boleh dipilih Owner.
- Satu kolam memakai satu basis. Perubahan basis berlaku mulai periode berikutnya dan tercatat di audit.
- Alokasi memakai Decimal dan metode sisa terbesar: jumlah alokasi semua produk sama persis dengan jumlah kolam (kesamaan ini diuji).
- Bulan tanpa penjualan: kolam tidak dibagikan ke produk mana pun dan dilaporkan sebagai biaya menganggur (idle cost) di laporan laba rugi.
- Pajak penjualan dan tip bukan biaya. Penyusutan alat dan bunga tidak diatur di versi ini (bagian 18).

**Provisional dan Final.**

- **PROVISIONAL.** Selama bulan berjalan dan untuk semua tampilan harian, alokasi per unit = jumlah expectedMonthlyAmount semua kolam dibagi prakiraan unit bulanan. Prakiraan unit = rata-rata unit tiga bulan FINAL terakhir; bila belum ada riwayat, Owner mengisi targetUnitsPerMonth per outlet. Angka selalu berlabel PROVISIONAL.
- **FINAL.** Owner memfinalisasi bulan lewat POST /api/finance/true-cost/finalize. Syarat: semua hari bulan itu berstatus LOCKED, R1 sampai R3 dan R7 lulus pada hari terakhir, tidak ada persetujuan tertunda, dan semua Expense serta WageEntry bulan itu sudah tercatat. Alokasi memakai realisasi. Snapshot FINAL tidak bisa diubah; koreksi membuat versi baru (supersedesId) disertai jurnal pembalik bila perlu.

**Tingkat kepercayaan** (trustLevel di setiap baris):

| Tingkat | Syarat |
| --- | --- |
| PENUH | Semua unit terjual memakai biaya dari dokumen (PURCHASE atau OPENING) dan status FINAL |
| SEBAGIAN | Ada konsumsi ESTIMATED, atau status masih PROVISIONAL |
| RENDAH | Lebih dari 5% unit memakai biaya ESTIMATED, atau ada kolam tanpa data |

Metrik **cakupan biaya terdokumentasi** = unit terjual dengan biaya dokumen dibagi total unit terjual (target 95% atau lebih). Tampil di dashboard True Cost.

**Contoh hitung (jadikan fixture test A5).** Satu produk menyumbang seluruh 3.000 cup bulan itu. Pada banyak produk, alokasi memakai bobot basis.

| Komponen | Average | FIFO |
| --- | --- | --- |
| Biji kopi 18 g | 18 x Rp250 = Rp4.500 | 18 x Rp200 = Rp3.600 |
| Susu 150 ml @ Rp20 | Rp3.000 | Rp3.000 |
| Kemasan (cup dan tutup, 1 set) | Rp1.500 | Rp1.500 |
| **HPP** | **Rp9.000** | **Rp8.100** |
| Tenaga kerja (Rp12.000.000 dibagi 3.000) | Rp4.000 | Rp4.000 |
| Listrik dan air (Rp1.500.000 dibagi 3.000) | Rp500 | Rp500 |
| Sewa (Rp6.000.000 dibagi 3.000) | Rp2.000 | Rp2.000 |
| Lainnya (Rp1.500.000 dibagi 3.000) | Rp500 | Rp500 |
| **True Cost** | **Rp16.000** | **Rp15.100** |
| Harga jual bersih | Rp28.000 | Rp28.000 |
| **True Margin** | **Rp12.000 (42,86%)** | **Rp12.900 (46,07%)** |
| Margin bila hanya HPP | Rp19.000 (67,86%) | Rp19.900 (71,07%) |

Hasilnya menunjukkan mengapa True Cost penting: margin HPP 67,86% turun menjadi True Margin 42,86% setelah biaya tenaga kerja, utilitas, dan sewa ikut dihitung.

**Jalur hitung dan job.**

- Job truecost:daily membuat TrueCostSnapshot DAY (PROVISIONAL) setelah hari terkunci; truecost:monthly memperbarui snapshot MONTH PROVISIONAL tiap malam. Keduanya BullMQ (Fase 4, memakai infrastruktur Fase 3).
- Hasil disimpan untuk FIFO dan Average sekaligus; mesin utama (Outlet.primaryCosting) hanya menentukan kolom yang ditampilkan lebih dulu.
- DailyMenuStat lama tidak dimigrasikan karena dihitung dengan metode berbeda; diekspor sebagai CSV bila Owner meminta, lalu tabelnya dihapus di Fase 4.
- GET /reports/hpp/today (angka tetap) dihapus di Fase 0. Endpoint pengganti ada di bagian 13.

**Test yang wajib (Fase 4).**

- Fixture contoh di atas menghasilkan Rp16.000 dan Rp15.100, margin 42,86% dan 46,07%.
- Alokasi Rp1.000.000 ke tiga produk berbobot sama menghasilkan Rp333.334, Rp333.333, Rp333.333 (urut menurut menuId untuk selisih terbesar yang sama), jumlah tepat Rp1.000.000.
- Bulan tanpa penjualan menghasilkan biaya menganggur, bukan pembagian ke produk.
- Snapshot FINAL menolak UPDATE; koreksi membuat versi baru.
- Konsumsi ESTIMATED menurunkan trustLevel dan tampil berlabel.

## 8. Lapisan Kontrol dan Modul Operasional

POS, shift, void, opname, dan penutupan hari adalah lapisan kontrol: tugasnya memastikan data yang masuk ke mesin biaya dan True Cost benar dan dapat dipercaya. Setiap modul punya perilaku wajib dan satu kontrol yang bisa diuji. Basis kode yang sudah ada disebut di kolom terakhir dan dipakai ulang.

| Modul | Perilaku wajib | Kontrol | Basis di repo |
| --- | --- | --- | --- |
| POS | Keranjang, varian, catatan porsi, diskon (alasan wajib; di atas batas persen per outlet butuh persetujuan), tip, pembayaran campuran (tunai, QRIS statis, transfer, kartu dicatat manual). Idempotency-Key sama dengan clientUuid. Nomor struk per perangkat (bagian 10) | Transaksi selesai tidak bisa diedit atau dihapus; hanya void atau refund. Respons ke Kasir tidak memuat biaya | POST /api/pos/checkout, checkout.service.ts, Cashier.tsx |
| Shift | Buka dengan modal awal. Satu shift terbuka per Kasir per perangkat. Tutup dengan hitung buta: Kasir memasukkan denominasi uang laci dulu, baru server mengembalikan ekspektasi dan selisih. Ekspektasi = modal awal + penjualan tunai - refund tunai +- kas masuk dan keluar tercatat; QRIS dan non-tunai tidak dihitung | Selisih melewati ambang membuat alert (R6). Shift tidak bisa ditutup bila ada persetujuan tertunda terkait shift itu | shift.service.ts, /api/shift, ShiftHandover.tsx |
| Void dan refund | Kasir mengajukan dengan alasan wajib. Manager atau Owner menyetujui menurut batas nominal. Sebelum disetujui, transaksi tetap berlaku. Refund penuh atau sebagian; opsi restock bawaan mati | Rasio void dan refund per Kasir dipantau. Override Super Admin tercatat. Jurnal selalu pembalik (bagian 6) | void.service.ts, refund.service.ts, /api/pos/void dan /refund |
| Stock opname | Sesi hitung buta (Barista boleh menyusun draf). Selisih = hitung - sistem, dihitung server. Konfirmasi Manager atau Owner, lalu diposting ke kedua mesin sebagai OPNAME. Jadwal bawaan mingguan | Selisih besar membuat alert dan masuk R5 | inventory.service.ts, /api/inventory/opname, StockOpnameTab.tsx |
| Waste | Dicatat dengan alasan; persetujuan Manager atau Owner; diposting sebagai WASTE | Total waste per item per minggu masuk R5 | /api/inventory/waste, WasteModal.tsx |
| Tutup hari | Wizard lima langkah yang sudah ada: Uang Laci, Non-Tunai, Stok dan Resep, Jurnal Tutup, Berita Acara. Eksekusi hanya Owner | Syarat kunci di bawah. Setelah LOCKED, koreksi hanya lewat jurnal pembalik di hari berjalan dengan rujukan hari asal dan alasan | DeterministicClosingModal.tsx, /api/finance/daily-closing, dailyClosingWorker |
| Biaya operasional | Expense per kolam biaya (bagian 7): listrik, air, internet ke UTILITY; sewa ke RENT; kebersihan dan lainnya ke OTHER. Mode ON\_DATE atau SPREAD\_MONTH (tagihan bulanan dibagi hari dalam bulan untuk laporan harian). Lampiran bukti | Biaya di atas ambang tanpa lampiran diberi tanda. Input di atas batas Manager butuh Owner | Baru (Fase 4) |
| Upah | StaffRate (per shift atau per hari) dan WageEntry per shift: dasar, bonus, bagian tip. Kehadiran dari AttendanceLog | Total tip dibagikan harus sama dengan tip terkumpul; selisih ditolak. Tip dicatat sebagai utang tip, bukan pendapatan atau biaya | AttendanceLog, /api/shift/attendance; WageEntry baru (Fase 4) |
| Pajak | TaxRate per tenant (nama, tarif, tanggal berlaku, status) dan Tenant.isTaxInclusive serta serviceChargeRate. Tarif tidak di-hardcode. Modul merekap pajak terutang per bulan, bukan pelaporan resmi | Tarif dan perlakuan diverifikasi konsultan pajak sebelum dipakai | TaxRate, checkout.service.ts |
| Notifikasi | Email (Brevo, kunci sudah ada di env) dan Telegram untuk alert, persetujuan menunggu, selisih kas, sinkron gagal. Dikonfigurasi Owner lewat NotificationChannel. Alert yang sama dalam 24 jam digabung | Pengiriman lewat job BullMQ dengan percobaan ulang | notification.ts (executeWithRetry), Notification, DecisionAlert |

**Syarat kunci hari (tutup hari).** Semua shift hari itu berstatus CLOSED; tidak ada Approval tertunda; R1 sampai R3 dan R7 lulus; tidak ada OfflineTransaction berstatus PENDING untuk hari itu pada outlet itu; Owner menyelesaikan kelima langkah wizard. Hasilnya DailyClosing LOCKED beserta Berita Acara. Penjualan offline yang tiba setelah hari terkunci dicatat di hari berjalan dengan originalBusinessDate dan status LATE\_ENTRY (perilaku yang sudah ada di SalesHeader).

**Kebijakan ambang** (default awal; Super Admin mengubah per outlet, perubahan tercatat di audit).

| Kebijakan | Default | Kode |
| --- | --- | --- |
| Selisih kas shift | Peringatan Rp10.000, kritis Rp50.000 | R6 |
| Selisih pemakaian teoretis dan aktual | Peringatan di atas 5%, kritis di atas 10% | R5 |
| Rasio void dan refund per Kasir per shift | Peringatan di atas 5% dari transaksi | VR1 |
| Selisih opname per item | Di atas 3% kuantitas atau Rp50.000 | OP1 |
| Harga penerimaan lawan harga PO | Selisih di atas 5% wajib beralasan | PO1 |
| Lonjakan harga beli | Di atas 10% terhadap rata-rata tiga penerimaan terakhir item itu | PR1 |
| Diskon manual tanpa persetujuan | Usulan 10% per baris | DS1 |
| Transaksi offline tertunda | Lebih dari 24 jam | OF1 |
| Selisih jam perangkat | Lebih dari 10 menit saat sinkron | OF2 |
| Backup gagal | Satu kali | BK1 |
| Sinkron Google Sheets gagal | Tiga kali berturut-turut | SH1 |

PR1 adalah statistik deterministik dari data penerimaan, bukan prediksi; contoh pesannya "harga biji kopi naik 14% dalam tiga penerimaan terakhir".

**Rumus laporan harian, bulanan, dan tahunan.**

- Penjualan bersih = total transaksi selesai - diskon - refund, di luar pajak, service charge, dan tip.
- Laba kotor = penjualan bersih - HPP (mesin utama).
- Laba bersih = laba kotor - biaya operasional (alokasi ON\_DATE atau SPREAD\_MONTH pada hari itu) - upah (tanpa tip) - selisih kas - selisih persediaan (waste dan opname).
- Arus kas = penerimaan kas dan bank - pengeluaran kas dan bank, per metode bayar.
- Konsistensi bulanan (diuji): jumlah alokasi True Cost ditambah biaya menganggur sama dengan jumlah kolam biaya bulan itu, dan jumlah HPP ditambah alokasi sama dengan jumlah (True Cost x unit).
- Setiap laporan menampilkan mesin utama dan bisa dibandingkan dengan mesin lain. Ekspor PDF dan Excel dibuat sebagai job (Fase 9).

**Test yang wajib (Fase 5).** Hitung buta: respons ke Kasir tidak memuat expectedCash sebelum hitung dikirim. Void atau refund yang belum disetujui tidak mengubah stok maupun jurnal. Hari terkunci menolak perubahan langsung dan hanya menerima jurnal pembalik. Laba bersih harian cocok dengan fixture. Konsistensi bulanan di atas lulus.

## 9. Supply Hub

Supply Hub adalah lapisan penemuan supplier dan awal rantai data ekonomi LedgerLine, bukan fitur marketplace sampingan. Rantainya: **cari supplier, pilih produk, buat PO, terima barang, masuk inventori, dinilai FIFO dan Average, lalu menjadi biaya.** Karena penerimaan barang adalah satu-satunya jalan biaya pembelian masuk ke mesin biaya, kualitas data di sini menentukan kualitas True Cost.

**Alur dan data yang terbawa.**

| Tahap | Pelaku | Hasil | Efek ke biaya |
| --- | --- | --- | --- |
| 1. Pendaftaran | Supplier | Formulir: nama usaha, nama legal, kontak, kota, provinsi, nomor dan jenis identitas usaha. Status APPLIED | - |
| 2. Kurasi | Super Admin | Memeriksa dokumen lalu VERIFIED, kemudian ACTIVE (atau ditolak atau SUSPENDED). Hanya supplier ACTIVE tampil di pencarian | - |
| 3. Katalog | Supplier | Produk: nama, kategori, satuan, ukuran kemasan (packSize dan packUnit), harga, MOQ, lead time, stok tersedia. Setiap perubahan harga masuk audit dan riwayat | Harga katalog adalah penawaran, bukan biaya |
| 4. Penemuan | Owner | Cari dan saring menurut kategori, kota atau provinsi, harga per satuan dasar, MOQ, lead time, rating. Bandingkan item sejenis antar supplier dan lihat riwayat harga beli sendiri | - |
| 5. Tautan inventori | Owner | ItemSupplierLink: produk katalog ke Item dengan conversionFactor (misalnya 1 karung = 1.000 g). Tanpa tautan, penerimaan tidak bisa dibuat | Menjamin biaya masuk ke item yang benar |
| 6. Purchase order | Owner | PO dari katalog; harga mengacu PriceContract bila ada. DRAFT lalu SENT. Di atas batas nominal Manager butuh persetujuan Owner | - |
| 7. Konfirmasi dan kirim | Supplier | CONFIRMED lalu SHIPPED dengan Shipment (kurir dan nomor resi) | - |
| 8. Penerimaan | Barista, Manager, atau Owner | Qty aktual dan biaya satuan; boleh parsial dan boleh tanpa PO (belanja pasar, nama pemasok berupa teks). Biaya tambahan seperti ongkir dialokasikan pro rata nilai baris ke biaya satuan | Posting RECEIPT: lot FIFO, rata-rata Average, jurnal Dr Persediaan Cr Utang Usaha, dalam satu transaksi (bagian 6). cost\_source = PURCHASE |
| 9. Invoice dan pembayaran | Supplier, Owner | SupplierInvoice, lalu SupplierPayment (Dr Utang Usaha, Cr Kas atau Bank) | - |
| 10. Retur | Owner | Dokumen retur merujuk baris penerimaan asal dan dinilai pada biaya satuan penerimaan itu | SUPPLIER\_RETURN (bagian 6) |
| 11. Ulasan | Owner | Rating dan ulasan setelah PO selesai (SupplierReview, verified purchase) | - |

**Status PO.** DRAFT, PENDING\_APPROVAL (hanya bila di atas batas nominal), SENT, CONFIRMED, SHIPPED, PARTIALLY\_RECEIVED, RECEIVED, CLOSED, dan CANCELLED. Perpindahan hanya maju kecuali ke CANCELLED sebelum SHIPPED. Setiap perpindahan menulis audit.

**Aturan.**

- Pencocokan tiga arah (PO, penerimaan, invoice): selisih qty atau nilai ditandai di daftar invoice dan harus diselesaikan sebelum pembayaran dilunasi.
- Biaya satuan penerimaan yang berbeda lebih dari 5% dari harga PO membuat alert PO1 dan wajib diberi alasan.
- Lonjakan harga PR1 (bagian 8) tampil di dasbor Supply Hub dan di halaman item.
- Harga katalog tidak pernah menjadi biaya. Biaya hanya datang dari penerimaan aktual.
- Biaya tambahan penerimaan dialokasikan dengan metode sisa terbesar sehingga jumlah alokasi sama persis dengan biaya tambahan.
- Supplier hanya melihat PO, pengiriman, invoice, dan ulasan miliknya. Penjualan, stok, dan biaya Owner tidak pernah terlihat Supplier; penyaringan di serializer server.
- Supplier masuk lewat Google (UserProfile dengan role SUPPLIER dan supplierId). Kata sandi supplier dihapus. Supplier SUSPENDED ditolak saat masuk dan sesinya dicabut.
- Satu supplier boleh melayani banyak tenant; setiap PO terikat satu tenant.
- Pembayaran lewat aplikasi tidak ada; pembayaran dicatat manual (bagian 18).

**Basis di repo.** Model Supplier, SupplierCatalog, PurchaseOrder, PurchaseOrderDetail, Receiving, ReceivingDetail, dan SupplierReview sudah ada. Antarmuka SupplierPortal.tsx, SupplyHubAdmin.tsx, PurchaseOrdersTab.tsx, dan ReturnSupplierTab.tsx dipertahankan. supplier.routes.ts ditulis ulang karena autentikasinya tidak aman (K4, K5).

**Test yang wajib (Fase 6).**

- Supplier tidak bisa membaca PO milik supplier lain; supplier yang belum ACTIVE tidak muncul di pencarian.
- Dua penerimaan parsial pada satu PO menghasilkan lot dan jurnal yang benar, dan R1 sampai R3 tetap lulus.
- Biaya tambahan teralokasi tepat; biaya satuan akhir mencakup alokasi itu.
- Penerimaan tanpa PO diizinkan hanya untuk Owner, Manager, dan Barista, dan tetap memerlukan item yang valid.
- Retur dinilai pada biaya penerimaan asal untuk kedua mesin, dan R1 sampai R3 lulus.
- Pencocokan tiga arah menandai selisih dan memblokir pelunasan.

## 10. Offline-First POS

Kasir tetap bisa menjual saat internet putus, dan setiap transaksi offline masuk ke buku besar tepat satu kali setelah koneksi pulih. Perangkat hanya mencatat peristiwa penjualan. Server satu-satunya yang menilai biaya (FIFO dan Average), menggerakkan stok fisik, dan membukukan jurnal; perangkat tidak pernah menghitung atau menyimpan HPP.

&#91;embedded content: sinkronisasi offline · 6 langkah, 2 jalur\]

Kotak berwarna adalah satu-satunya langkah yang mengubah stok dan buku besar; langkah lain hanya membawa data atau status. Posting memakai CheckoutService yang sama dengan penjualan online, sehingga hanya ada satu versi logika penjualan.

**Kemampuan saat offline.**

| Fungsi | Offline | Aturan |
| --- | --- | --- |
| Penjualan (metode bayar dicatat sebagai label: tunai, QRIS, transfer, kartu) | Ya | Memakai katalog dan harga dari menuVersion yang terunduh. LedgerLine tidak memproses pembayaran (bagian 18) |
| Diskon | Sebagian | Diskon preset dan diskon manual sampai batas DS1 (bagian 8). Di atas batas butuh online dan Approval |
| Buka shift | Tidak | Butuh online agar kas awal tercatat di server |
| Tutup shift dan hitung kas buta | Tidak | Butuh online; ditolak di perangkat selama antreannya belum kosong |
| Void, refund, Approval | Tidak | Butuh Manager atau Owner dan jejak audit |
| Penerimaan, waste, opname, ubah data master | Tidak | Butuh online di v1 |
| Ganti Kasir | Tidak | Sesi Kasir harus sudah masuk sebelum internet putus (pertanyaan terbuka di bagian 18) |

**Perangkat terdaftar.** Setiap terminal POS, online maupun offline, adalah Device terdaftar.

- Owner atau Super Admin membuat kode pendaftaran sekali pakai (berlaku 15 menit) di Pengaturan, Perangkat. Perangkat memasukkan kode itu saat online; server membuat deviceId, mengikatnya ke satu outlet, dan perangkat menyimpannya di IndexedDB.
- Status Device: PENDING, ACTIVE, REVOKED. Owner dan Super Admin bisa mencabut perangkat; sesi perangkat itu ikut dicabut.
- Server hanya menerima transaksi dari Device ACTIVE yang deviceId-nya sama dengan Session.deviceId dan yang outlet-nya sama dengan outlet transaksi.
- Antrean (outbox) milik perangkat, bukan milik pengguna. Keluar akun tidak menghapus outbox; Kasir berikutnya yang masuk di perangkat itu menyinkronkannya. cashierId pada payload dicatat sebagai atribusi setelah server memastikan ia Kasir yang punya akses ke outlet itu, sedangkan syncedBy diambil dari sesi.

**Nomor struk.** Format `{OUTLET}-{DEVICE}-{YYYYMMDD}-{SEQ4}`, misalnya `BDG1-K01-20261021-0007`. OUTLET dan DEVICE adalah kode pendek outlet dan perangkat; tanggal adalah business\_date outlet dari jam perangkat saat Kasir menekan bayar (aturan 16); SEQ4 mulai dari 0001 setiap hari per perangkat dan naik tanpa celah. Penghitung ditulis di IndexedDB dalam transaksi yang sama dengan penyimpanan penjualan, sehingga nomor tidak pernah dipakai dua kali dan tidak ada nomor yang hilang. Void mempertahankan nomornya. Pemeriksaan R8 menandai celah urutan per perangkat per hari setelah tidak ada transaksi perangkat itu yang PENDING. Format ini menggantikan nomor INV-tahun-urutan per tenant untuk semua penjualan POS, termasuk yang online.

**Kontrak payload.** Penjualan online memakai kontrak yang sama: perangkat membuat clientUuid dan receiptNo, lalu POST /api/pos/checkout membawa Idempotency-Key sama dengan clientUuid. Bila jawaban tidak pernah tiba, transaksi tetap ada di outbox dan dikirim ulang dengan kunci yang sama; transaksi tidak pernah dibuat ulang. Aturan proyek menulis client\_uuid, device\_id, occurred\_at; payload JSON dan skema database memakai camelCase yang sama artinya.

| Field | Aturan |
| --- | --- |
| clientUuid | UUID v4 buatan perangkat saat transaksi disimpan; kunci idempotensi, unik per tenant |
| deviceId, outletId | Harus cocok dengan Device ACTIVE dan sesi (lihat Perangkat terdaftar) |
| shiftId | Shift yang sedang terbuka di perangkat saat transaksi |
| receiptNo | Format nomor struk di atas; unik per tenant |
| occurredAt | Waktu ISO 8601 UTC dari jam perangkat saat bayar. Server menyimpan syncedAt sendiri |
| menuVersion | Versi katalog yang dipakai perangkat |
| cashierId | Atribusi Kasir (divalidasi server) |
| lines | Daftar menuId, qty (string desimal), unitPrice (string rupiah), modifiers, discount |
| payments | Daftar method dan amount (string rupiah); jumlahnya harus sama dengan total baris (R7) |

Field biaya (unitCost, hpp, hppFifo, hppAverage, margin, trueCost) dilarang ada di payload. Skema Zod bersifat strict: item yang membawanya ditolak dengan REJECTED (PAYLOAD\_INVALID), dicatat di audit, dan menjadi alert keamanan. Setiap amplop batch membawa deviceTime (jam perangkat saat mengirim) untuk menghitung selisih jam.

**Protokol sinkronisasi.**

1. Simpan. Penjualan ditulis ke store outbox di IndexedDB dalam satu transaksi IndexedDB bersama kenaikan penghitung nomor struk. Status lokal PENDING; struk ditampilkan dari data lokal dengan label Menunggu sinkron.
2. Kirim. Saat online (peristiwa online, tiap 30 detik, dan saat aplikasi dibuka) perangkat mengirim batch berisi maksimal 20 transaksi, urut occurredAt, ke POST /api/offline/sync-batch. Status lokal menjadi SENT setelah balasan 202, tetapi belum dianggap selesai.
3. Terima. Server memvalidasi bentuk tiap transaksi secara terpisah (satu item rusak tidak menggagalkan batch), menyimpan OfflineTransaction berstatus PENDING dengan unique (tenantId, clientUuid), dan membalas 202 berisi daftar clientUuid beserta statusnya. Duplikat tidak membuat baris baru dan tidak pernah menghasilkan error 500; balasannya status yang sudah ada.
4. Proses. Prosesor BullMQ offline-sync mengambil transaksi PENDING per perangkat dengan kunci Redis per deviceId, berurutan menurut occurredAt, dan memanggil CheckoutService dalam satu transaksi basis data per penjualan (urutan di bagian 6). Kegagalan sementara (kunci baris, basis data) diulang dengan jeda naik sampai 15 menit tanpa batas jumlah; transaksi yang masih PENDING lebih dari 24 jam memicu alert OF1.
5. Status akhir. OfflineTransaction.status menjadi FINAL dan resultStatus berisi DONE (diposting tanpa catatan), FLAGGED (diposting dengan flags, lihat tabel di bawah), atau REJECTED (tidak diposting, dengan reasonCode).
6. Konfirmasi. Perangkat membaca status lewat POST /api/offline/status (maksimal 20 clientUuid) atau GET /api/offline/status/:clientUuid. Hanya setelah status FINAL diterima, status lokal berubah menjadi SYNCED dan baris boleh dibersihkan dari outbox setelah 7 hari. Transaksi REJECTED tetap di outbox dan tampil di daftar Transaksi ditolak (Manager dan Owner) beserta alasan dan payload-nya. Kasir melihat hanya jumlah antrean dan status, tanpa data biaya.

**Aturan saat transaksi tiba di server.**

| Situasi | Perlakuan | Hasil dan alert |
| --- | --- | --- |
| Stok tidak cukup saat posting | Tetap diposting; konsumsi memakai lot ESTIMATED pada biaya penerimaan terakhir, hppEstimated menjadi true, true-up saat penerimaan berikutnya (bagian 6) | FLAGGED STOCK\_ESTIMATED, alert ke Manager |
| Harga berbeda dari katalog saat ini dan menuVersion perangkat lebih lama | Dibukukan pada harga yang dibayar pelanggan (fakta transaksi) | FLAGGED PRICE\_CHANGED, informatif |
| Harga berbeda dari katalog padahal menuVersion perangkat sama dengan yang sekarang | Dibukukan, tetapi perangkat mengirim harga yang tidak ada di katalog | FLAGGED PRICE\_MISMATCH, alert ke Owner |
| Diskon manual melebihi batas DS1 tanpa Approval | Dibukukan | FLAGGED DISCOUNT\_OVER\_LIMIT, alert ke Manager |
| Hari bisnis sudah terkunci | Dibukukan di hari berjalan dengan originalBusinessDate (bagian 8) | FLAGGED LATE\_ENTRY |
| Shift asal sudah CLOSED | Dibukukan pada business\_date occurredAt dan ditautkan ke shift asal; hitung kas shift yang sudah tutup tidak diubah | FLAGGED SHIFT\_CLOSED, alert ke Manager dan masuk daftar periksa Tutup hari |
| Selisih jam perangkat lebih dari 10 menit terhadap jam server saat sinkron | Dibukukan; bila occurredAt lebih dari 5 menit di masa depan, jam server dipakai sebagai gantinya | FLAGGED CLOCK\_SKEW, alert OF2 |
| nomor struk sama dengan transaksi lain dari clientUuid berbeda | Tidak diposting | REJECTED DUPLICATE\_RECEIPT, alert kritis R8 |
| Perangkat tidak ACTIVE atau outlet tidak cocok | Tidak diposting; Owner dapat memposting manual lewat Approval bila perangkat hanya dicabut setelah transaksi (DEVICE\_REVOKED) | REJECTED DEVICE\_NOT\_ALLOWED, OUTLET\_MISMATCH, atau DEVICE\_REVOKED |
| Menu tidak ditemukan, total pembayaran tidak sama dengan total baris, atau payload memuat field biaya | Tidak diposting | REJECTED MENU\_NOT\_FOUND atau PAYLOAD\_INVALID |

Penjualan tunai yang berstatus FLAGGED atau REJECTED tetap tampil di Tutup hari sampai Manager atau Owner menandainya selesai ditinjau. Tidak ada transaksi yang hilang diam-diam.

**Implementasi di klien (Fase 7).**

- Service worker dibuat dengan vite-plugin-pwa: app shell di-precache sehingga aplikasi terbuka saat offline. Respons /api/\* tidak masuk cache service worker. public/sw.js yang menghapus semua cache dihapus.
- Dependensi idb dideklarasikan eksplisit di package.json (sekarang hanya terbawa lewat firebase) dan versinya dikunci.
- IndexedDB berisi tiga store: outbox (transaksi), catalog (menu, modifier, diskon preset, menuVersion, waktu unduh), dan meta (deviceId, penghitung struk per business\_date). navigator.storage.persist() diminta saat pertama kali; bila ditolak, layar POS menampilkan peringatan.
- Katalog diunduh dari GET /api/pos/catalog (baru), disaring serializer tanpa data biaya, dan diperbarui saat aplikasi dibuka serta tiap 5 menit selama online. Perubahan harga, ketersediaan, atau diskon preset menaikkan Tenant.menuVersion.
- Status koneksi (hook useOnlineStatus): offline bila navigator.onLine bernilai false atau dua permintaan berturut-turut ke /api/health gagal; online kembali setelah satu permintaan berhasil.
- Tampilan (bagian 14): lencana Offline di header POS, penghitung transaksi menunggu sinkron, dan tombol Sinkron sekarang. Struk lokal memakai label Menunggu sinkron sampai SYNCED.
- IndexedDB, cache, dan localStorage tidak boleh memuat kunci biaya apa pun (aturan 15); ada test yang memeriksanya.

**Basis di repo dan yang diganti.**

- src/lib/offlineQueue.ts: markSynced dipanggil saat server membalas 202, sebelum transaksi diproses, dan token dikirim sebagai Bearer. Diganti oleh status SENT dan SYNCED di atas, serta sesi cookie (bagian 12).
- server/routes/offline.routes.ts: createMany tanpa penanganan duplikat (kiriman ulang menjadi error 500), outletId dipercaya dari payload, tanpa pemeriksaan Device, payload disimpan mentah. Ditulis ulang sesuai protokol. Nama rute dipertahankan.
- server/workers/offlineSyncWorker.ts memakai setInterval dengan penanda global; diganti prosesor BullMQ.
- public/sw.js sengaja tanpa cache; diganti vite-plugin-pwa.

**Test yang wajib (Fase 7).**

- Unit: penomor struk (urut, tanpa celah, mulai ulang tiap hari, batas hari menurut zona waktu outlet); skema payload menolak field biaya.
- Integrasi: batch yang sama dikirim tiga kali menghasilkan satu SalesHeader dan satu set jurnal; kiriman terbalik urutan diposting menurut occurredAt; dua perangkat menjual item yang stoknya terbatas pada waktu bersamaan menghasilkan stok akhir benar dan R1 sampai R3 lulus; hari terkunci menghasilkan LATE\_ENTRY; perangkat REVOKED menghasilkan REJECTED; selisih jam lebih dari 10 menit menghasilkan CLOCK\_SKEW dan OF2; transaksi PENDING menahan penguncian hari.
- Properti: dengan PRNG ber-seed, kiriman yang diacak urutannya dan digandakan menghasilkan ledger identik dengan pengiriman berurutan satu kali.
- e2e Playwright: jaringan dimatikan (context.setOffline), tiga penjualan dibuat, halaman dimuat ulang (aplikasi harus tetap terbuka), jaringan dinyalakan, antrean menjadi kosong dan struk berstatus SYNCED; IndexedDB tidak berisi kunci biaya.

## 11. Migration Center

Migration Center memindahkan data dari POS lama (Moka, Majoo, Pawoon, Kasir Pintar) atau berkas Excel dan CSV ke LedgerLine lewat pipeline bertahap yang menolak data buruk sebelum menyentuh buku besar. Tujuannya satu: Owner berpindah tanpa mengetik ulang, dan hari pertama di LedgerLine sudah punya saldo stok awal bernilai benar sehingga mesin biaya ganda langsung bekerja.

**Pipeline.**

| Tahap | Yang terjadi | Pelaku | Keluaran |
| --- | --- | --- | --- |
| 1. Unggah | Berkas .csv atau .xlsx diunggah dan sumbernya dipilih. Server menyimpan berkas di penyimpanan privat dan menghitung fileHash (SHA-256). Berkas dengan fileHash dan entityScope yang sama dengan batch aktif ditolak sebagai duplikat | Owner | MigrationJob stage UPLOADED |
| 2. Pemetaan | Kolom berkas dipetakan ke field LedgerLine. Preset sumber hanya mengisi usulan awal; Owner bisa mengubahnya. Pemetaan disimpan dan dipakai ulang | Owner | MigrationMapping, stage MAPPED |
| 3. Normalisasi | Parsing deterministik (angka, satuan, teks, tanggal), nilai mentah dan nilai normal disimpan berdampingan | Server | MigrationRow, stage NORMALIZED |
| 4. Validasi | Aturan V1 sampai V11 di bawah. Tiap baris menjadi OK, PERINGATAN, atau ERROR beserta kode dan pesan | Server | Status per baris, stage VALIDATED |
| 5. Rekonsiliasi | Pemeriksaan agregat M1 sampai M6 atas data staging | Server | MigrationCheck, stage RECONCILED |
| 6. Persetujuan | Owner meninjau ringkasan lalu menekan Komit. Batch yang memuat saldo awal atau riwayat penjualan juga menunggu persetujuan Super Admin | Owner, Super Admin | Approval, stage APPROVED |
| 7. Impor | Data staging ditulis ke tabel produksi, lalu rekonsiliasi pasca-impor (M7) dijalankan | Server | stage COMMITTED, atau FAILED bila M7 gagal |
| 8. Rollback | Membatalkan batch yang belum punya transaksi turunan | Super Admin | stage ROLLED\_BACK |

**Tiga tingkat data.** Owner memilih tingkat saat mengunggah; setiap tingkat adalah batch tersendiri.

| Tingkat | Isi | Efek saat komit | Persetujuan |
| --- | --- | --- | --- |
| 1. Katalog | Menu, kategori, harga jual, modifier | Membuat atau memperbarui Menu (kunci: SKU, bila kosong nama yang dinormalisasi). Tenant.menuVersion naik | Owner |
| 2. Inventori, resep, saldo awal | Item (bahan baku dan kemasan), satuan dan konversi, resep, serta saldo awal per gudang berupa kuantitas dan biaya satuan eksplisit | Item dan RecipeDetail dibuat. Saldo awal ditulis PhysicalStockService sebagai pergerakan OPENING pada awal cutoverDate; kedua mesin menilainya sebagai lot OPENING (bagian 6); jurnal Dr Persediaan, Cr Ekuitas saldo awal persediaan | Owner dan Super Admin |
| 3. Riwayat penjualan | Transaksi lama sebelum cutoverDate untuk grafik tren dan popularitas menu | SalesHeader dengan source MIGRATION dan hppStatus UNAVAILABLE. Tanpa pergerakan stok, tanpa jurnal, tidak masuk True Cost dan R7. Tampil berlabel Riwayat migrasi | Owner dan Super Admin |

cutoverDate adalah tanggal pertama LedgerLine dipakai penuh: hari ini atau tanggal mendatang. Saldo awal hanya diterima untuk item yang belum punya pergerakan fisik selain OPENING, dan hanya satu kali per item per gudang.

**Biaya dari POS lama.** HPP atau harga pokok dari POS lama tidak pernah menjadi HPP LedgerLine; ia disimpan di MigrationRow sebagai pembanding. HPP dihitung dari resep dan lot (bagian 6 dan 7). Satu-satunya biaya yang masuk dari berkas adalah biaya satuan saldo awal bahan baku yang diisi eksplisit di berkas atau di langkah Lengkapi biaya. Karena POS lama sering hanya mengekspor produk jadi, Migration Center menyediakan templat xlsx LedgerLine (lembar Menu, Item, Resep, SaldoAwal, Penjualan) yang dibuat dengan exceljs.

**Normalisasi.**

- Angka rupiah: awalan Rp, spasi, dan pemisah ribuan dibuang; pemisah desimal mengikuti pengaturan numberFormat batch (ID: titik ribuan, koma desimal; EN: sebaliknya; default ID) agar 22.000 tidak ambigu. Harga dan biaya dibulatkan half-up ke rupiah, kuantitas ke 4 desimal; setiap pembulatan dilaporkan di M4.
- Satuan dipetakan ke satuan dasar (g, ml, pcs) lewat tabel konversi (kg ke g, l ke ml). Satuan tidak dikenal menjadi ERROR sampai Owner memetakannya.
- Teks: spasi ujung dan ganda dibuang, huruf kategori dinormalisasi. Tanggal dibaca dalam timezone outlet lalu disimpan UTC.
- Berkas harus UTF-8 (BOM diterima); pemisah koma atau titik koma dideteksi otomatis. Sel formula dibaca sebagai nilai tersimpannya; tanpa nilai tersimpan menjadi ERROR (FORMULA\_NO\_VALUE).

**Validasi.**

| Kode | Aturan | Tingkat |
| --- | --- | --- |
| V1 | Nama kosong | ERROR |
| V2 | Harga jual bukan angka nol atau lebih. Harga tepat nol: PERINGATAN | ERROR |
| V3 | Saldo stok negatif | ERROR |
| V4 | Kuantitas lebih dari nol tanpa biaya satuan eksplisit, atau biaya nol. Tidak ada lot bernilai nol | ERROR |
| V5 | Satuan tidak dikenal atau konversi tidak ada | ERROR |
| V6 | Resep merujuk item yang tidak ada di berkas maupun di inventori | ERROR |
| V7 | Kuantitas bahan resep nol atau negatif | ERROR |
| V8 | SKU, barcode, atau nama ganda dalam batch. Owner memilih gabung atau lewati | PERINGATAN |
| V9 | HPP POS lama lebih besar dari harga jual (informasi pembanding) | PERINGATAN |
| V10 | Riwayat penjualan bertanggal sama dengan atau setelah cutoverDate | ERROR |
| V11 | Total pembayaran riwayat penjualan tidak sama dengan total barisnya | ERROR |

Baris ERROR tidak diimpor. Tombol Komit aktif bila ada minimal satu baris OK dan Owner menyatakan sudah membaca jumlah baris yang dilewati.

**Rekonsiliasi.**

| Kode | Pemeriksaan |
| --- | --- |
| M1 | Jumlah baris berkas sama dengan OK + PERINGATAN + ERROR + dilewati: tidak ada baris hilang |
| M2 | Total nilai saldo awal di staging (jumlah kuantitas kali biaya satuan) sama dengan nilai yang akan dijurnal; toleransi Rp1 per item |
| M3 | Menu aktif tanpa resep dihitung dan dilaporkan; HPP-nya tampil Belum tersedia, bukan nol |
| M4 | Total selisih pembulatan harga, biaya, dan kuantitas dilaporkan, bukan dibuang |
| M5 | Semua rujukan resep ke item dan item ke satuan valid |
| M6 | Jumlah transaksi dan total penjualan per hari di staging sama dengan hasil impor riwayat penjualan |
| M7 | Pasca-impor: R1 sampai R3 dan R7 untuk item dan outlet terdampak berstatus PASS. Bila gagal, impor dibatalkan otomatis dan batch menjadi FAILED |

**Eksekusi.**

- Tingkat 1 dan 2 ditulis dalam satu transaksi basis data (maksimal 5.000 baris). Tingkat 3 diproses prosesor BullMQ migration dalam potongan 500 baris dan dapat dilanjutkan; kunci unik (tenantId, source, sourceRef) dengan sourceRef berupa hash baris membuat pengulangan potongan aman.
- Setiap tahap menulis AuditLog. Semua rute /api/migration memakai guard({ roles, outlet, audit }); tenantId hanya dari sesi (aturan 5).
- Batas berkas: .csv atau .xlsx, maksimal 10 MB, 20.000 baris per berkas, 5 berkas per batch. Tanda tangan berkas (magic bytes) diperiksa; .xlsm dan berkas dengan makro ditolak. Berkas asli dihapus 90 hari setelah COMMITTED; MigrationRow dan fileHash tetap sebagai bukti.

**Rollback.** Hanya Super Admin, hanya bila batch COMMITTED dan belum ada transaksi turunan (penjualan, penerimaan, opname, waste, atau retur) pada item atau menu batch itu. Rollback tidak menghapus: ia menulis pergerakan dan jurnal pembalik (append-only, aturan 12) dan mengarsipkan entitas yang dibuat batch. Bila sudah ada transaksi turunan, rollback ditolak dengan ROLLBACK\_BLOCKED dan koreksi dilakukan lewat opname atau penyesuaian biasa.

**Preset sumber.** Preset hanya berupa daftar alias nama kolom untuk usulan pemetaan (misalnya Item Name, Nama Menu, atau Produk untuk nama). Nama kolom Moka, Majoo, dan Pawoon di kode saat ini adalah contoh buatan, bukan format ekspor yang diverifikasi. Tiap preset (Moka, Majoo, Pawoon, Kasir Pintar) wajib dicocokkan dengan berkas ekspor asli sebelum rilis; sebelum itu pemetaan manual dan templat LedgerLine selalu tersedia. Data contoh yang dimuat tombol preset dihapus (aturan 8).

**Basis di repo dan yang diganti.**

- server/routes/migration.routes.ts: tanpa autentikasi; membuat permintaan contoh Moka POS secara otomatis; status bisa diubah siapa pun; impor memanggil prisma.menu.create per baris tanpa transaksi; tenantId diambil dari body dengan cadangan tenant pertama di database (bisa menulis ke tenant sembarang); harga lewat Number; biaya diabaikan. Ditulis ulang seluruhnya.
- src/components/MigrationCenter.tsx: pemetaan dan data contoh berjalan di browser dan menulis ke dataStore tanpa memanggil server. Tampilan dipertahankan sebagai wizard (bagian 14); logikanya pindah ke server.
- MigrationJob dipertahankan sebagai induk batch dan dilengkapi di bagian 5: entityScope, fileHash, stage, checksum, approvedBy, serta tabel MigrationRow, MigrationMapping, dan MigrationCheck.
- Dependensi baru Fase 8: exceljs (membaca xlsx dan csv, membuat templat dan ekspor).

**Test yang wajib (Fase 8).**

- Fixture M1: saldo awal biji kopi 2.000 g kali Rp280 (560.000), susu 5.000 ml kali Rp18 (90.000), gelas 100 pcs kali Rp600 (60.000). Setelah komit nilai FIFO dan nilai Average sama-sama Rp710.000, jurnal Dr Persediaan dan Cr Ekuitas saldo awal sama-sama 710.000, dan R1 sampai R3 lulus.
- Normalizer: Rp 22.000, 22.000, 22,000, dan 22.000,50 pada numberFormat ID dan EN menghasilkan nilai yang benar atau ERROR yang jelas; satuan kg dan l dikonversi tepat.
- Idempotensi: berkas yang sama diunggah dua kali ditolak; potongan tingkat 3 yang dijalankan ulang tidak menggandakan transaksi.
- Atomik: kegagalan yang disuntikkan pada baris ke-N tingkat 2 tidak meninggalkan data sama sekali.
- Aturan: V4 (biaya nol), V10 (setelah cutoverDate), dan penolakan saldo awal untuk item yang sudah punya pergerakan; riwayat penjualan tidak menggerakkan stok, tidak masuk True Cost, dan tidak masuk R7.
- Rollback: berhasil pada batch bersih dan ditolak (ROLLBACK\_BLOCKED) setelah satu penjualan memakai item batch.
- Otorisasi: tanpa login semua rute /api/migration menjawab 401; Kasir, Barista, dan Manager ditolak; Owner tenant A tidak melihat batch tenant B; Owner tidak bisa menyetujui batchnya sendiri.
- Berkas: .xlsm, tanda tangan salah, dan berkas lebih dari 10 MB ditolak saat unggah.

## 12. Integrasi Google, Akses, dan Keamanan Sesi

Google dipakai untuk tiga hal: identitas login (Firebase Auth), penguatan akun sensitif (TOTP, Fase 9), dan salinan laporan ke Google Sheets milik Owner. Ketiganya mengikuti satu prinsip: Google membuktikan siapa orangnya, sedangkan hak akses selalu ditentukan oleh data LedgerLine di server.

**Alur masuk dengan Google.**

1. Klien memakai Firebase Auth (provider Google), lalu mengirim ID token ke POST /api/auth/google. Tidak ada field role, tenant, atau action dari klien.
2. Server memverifikasi token dengan firebase-admin (verifyIdToken dengan checkRevoked), mewajibkan email\_verified bernilai true dan provider google.com, lalu mencari email (huruf kecil) di UserProfile.
3. Email berstatus invited: akun diaktifkan, userId dikaitkan ke uid Firebase, dan sesi dibuat. Email berstatus active: sesi dibuat. Email suspended: ditolak dengan 403 dan semua sesinya dicabut.
4. Email tidak dikenal: tidak ada sesi. Server membuat AccessRequest berstatus PENDING (satu per email; permintaan berulang diperbarui, bukan digandakan) dan menjawab 202 ACCESS\_PENDING. Super Admin meninjau, lalu menyetujui (membuat tenant dan Owner, atau menautkan ke tenant yang ada) atau menolak. Pendaftaran mandiri yang membuat tenant langsung dihapus.
5. Server membuat sesi buram (opaque): 256 bit acak, hanya hash SHA-256-nya disimpan di tabel Session, dikirim sebagai cookie. Body jawaban hanya berisi profil (nama, peran, tenant, outlet); tidak ada token di JavaScript klien dan tidak ada JWT.
6. Setiap permintaan guard() memuat sesi, memeriksa revokedAt dan kedaluwarsa, lalu memuat peran dan outlet dari database (bukan dari klaim di klien). Mencabut sesi atau menangguhkan pengguna berlaku pada permintaan berikutnya.
7. Seluruh percobaan masuk, penolakan, dan pencabutan menulis AuditLog.

**Sesi dan cookie.**

| Peran | Batas tidak aktif | Batas maksimum |
| --- | --- | --- |
| Super Admin | 30 menit | 8 jam |
| Owner, Manager | 8 jam | 7 hari |
| Kasir, Barista | 14 jam | 14 jam |
| Supplier | 8 jam | 7 hari |

Angka di atas adalah default yang bisa diubah lewat env. Keluar akun mencabut sesi di server, bukan hanya menghapus cookie; Super Admin dan Owner dapat mencabut semua sesi seorang pengguna.

- Cookie ll\_session: HttpOnly, Secure di produksi, SameSite=Strict, Path=/, tanpa Domain. API dan aplikasi disajikan dari origin yang sama.
- CSRF: permintaan selain GET wajib membawa header X-CSRF-Token (token dari GET /api/auth/csrf, diikat ke sesi) dan Origin harus sama dengan APP\_ORIGIN. Dependensi Fase 1: @fastify/cookie dan @fastify/csrf-protection.
- Batas laju (Redis): 10 percobaan login Google per 15 menit per IP dan per email; PIN diatur di bawah. Jawaban gagal tidak membedakan email tidak dikenal dan email ditangguhkan.
- Sesi yang kedaluwarsa tidak menghapus antrean offline (bagian 10); setelah masuk lagi antrean dikirim.

**PIN Kasir dan Barista.** PIN adalah jalan masuk cepat di perangkat POS terdaftar saat pergantian orang, bukan pengganti Google.

- Kasir dan Barista masuk pertama kali dengan Google di perangkat terdaftar, lalu wajib mengatur PIN 6 angka (hash bcryptjs). Manager, Owner, dan Super Admin tidak punya jalur PIN.
- POST /api/auth/pin-login hanya diterima bersama cookie perangkat ll\_device (HttpOnly, dibuat saat pendaftaran perangkat, hash-nya disimpan di Device). Pengguna harus punya akses ke outlet perangkat itu. Mengetahui userId saja tidak cukup.
- Tiga PIN salah mengunci pasangan pengguna dan perangkat selama 15 menit; Manager atau Owner dapat membuka kunci. Kunci tidak berlaku pada perangkat lain.
- Reset PIN oleh Manager atau Owner menghapus hash; pengguna masuk lagi dengan Google dan mengatur PIN baru.
- Ganti Kasir saat internet putus tidak didukung di v1 (bagian 10 dan pertanyaan terbuka di bagian 18).

**TOTP (Fase 9).** Super Admin wajib, Owner wajib, peran lain tidak.

- Pendaftaran memakai otplib: kunci rahasia dienkripsi AES-256-GCM dengan kunci dari env SECRETS\_ENC\_KEY (32 byte, divalidasi saat boot), ditampilkan sebagai kode QR sekali, dan diaktifkan setelah satu kode benar dimasukkan. Sepuluh kode cadangan sekali pakai dibuat dan disimpan sebagai hash.
- Kode diterima dengan toleransi satu langkah 30 detik; langkah waktu yang sudah dipakai ditolak (anti pengulangan). Lima kode salah mengunci TOTP 15 menit.
- Aksi yang meminta verifikasi ulang TOTP (berlaku 10 menit): komit atau rollback migrasi, finalisasi True Cost, mengubah ambang kebijakan, menambah atau menangguhkan pengguna, menghubungkan atau memutus Google, dan mencabut perangkat.
- Reset TOTP seorang Owner dilakukan Super Admin dan diaudit. Reset TOTP Super Admin hanya lewat perintah operator di server (npm run admin:reset-totp -- --email), tercatat di AuditLog.

**Google Sheets (Fase 9).** Owner menghubungkan akun Google-nya untuk mendapat salinan laporan yang mudah dibagikan ke akuntan atau mitra. Salinan ini satu arah: LedgerLine menulis, tidak pernah membaca balik.

- Otorisasi memakai alur kode di server (access\_type offline, parameter state diikat ke sesi) dengan satu scope: drive.file, sehingga LedgerLine hanya mengakses spreadsheet yang ia buat sendiri. Refresh token disimpan terenkripsi AES-256-GCM di SheetConnection; access token tidak disimpan.
- Satu spreadsheet per tenant bernama LedgerLine - nama tenant, dibuat saat pertama kali menyambung. Setiap tab punya kolom Outlet dan kolom kunci.

| Tab | Isi | Kunci baris |
| --- | --- | --- |
| Harian | Per outlet per hari: penjualan, HPP mesin utama, alokasi, True Cost, margin, selisih kas, status PROVISIONAL atau FINAL | tanggal dan outlet |
| Bulanan | Ringkasan bulan | bulan dan outlet |
| Tahunan | Ringkasan tahun | tahun dan outlet |
| Transaksi | Satu baris per penjualan 90 hari terakhir: nomor struk, waktu, total, metode, status; tanpa data pelanggan | nomor struk |
| True Cost | Per menu per periode: HPP FIFO, HPP Average, alokasi, True Cost, margin, trustLevel | periode, menu, outlet |
| Rekonsiliasi | Hasil R1 sampai R8 per hari | tanggal, outlet, kode |
| Audit | Ringkasan kejadian kontrol (void, refund, Approval, selisih), bukan seluruh AuditLog | id kejadian |

- Penulisan idempoten: baris dicari lewat kolom kunci lalu diperbarui di tempat, atau ditambahkan bila belum ada. Mengirim ulang tidak menggandakan baris.
- Nilai ditulis dengan valueInputOption RAW sebagai angka dan teks apa adanya, sehingga teks yang berawalan = atau + tidak pernah dibaca sebagai rumus. Format angka (rupiah, persen) diterapkan sekali saat tab dibuat.
- Jadwal: tiap 15 menit lewat job BullMQ sheets-sync, saat hari dikunci, dan saat Owner menekan Sinkron sekarang. Hari berjalan diberi status PROVISIONAL; setelah dikunci menjadi FINAL.
- Kegagalan: jeda naik saat kuota (429); tiga kegagalan berturut-turut membuat alert SH1 (bagian 8). Bila token dicabut (invalid\_grant), status koneksi menjadi NEEDS\_RECONNECT; data tidak hilang karena sumbernya tetap database LedgerLine.
- Memutus koneksi mencabut token di Google dan menghapus SheetConnection; spreadsheet milik Owner dibiarkan.

**Basis di repo dan yang diganti.**

- server/services/auth.service.ts: action register membuat tenant baru dan Owner untuk akun Google mana pun; peran Cashier ditentukan klien lewat field role; email\_verified tidak diperiksa; PIN diverifikasi bersama login Google berdasarkan klaim klien. Ditulis ulang sesuai alur di atas.
- server/utils/jwt.ts: JWT 1 hari dengan secret cadangan your\_jwt\_secret\_placeholder, dibawa klien sebagai Bearer. Diganti sesi buram; jsonwebtoken dihapus di Fase 1.
- POST /api/auth/login/pin menerbitkan token hanya dari userId dan PIN, tanpa perangkat; POST /auth/pin/login di ssot.routes.ts adalah jalur kedua yang lemah. Keduanya diganti /api/auth/pin-login dengan perangkat terdaftar.
- Tombol demo dan Daftar Baru di StoreLoginPortal dihapus; diganti Minta Akses (bagian 14). Model DemoSession dihapus di Fase 2.
- GoogleToken menyimpan access token dan refresh token sebagai teks biasa, dan server/lib/gdrive.ts membuat spreadsheet baru setiap ekspor dengan USER\_ENTERED. Diganti SheetConnection terenkripsi dan sinkron idempoten dengan RAW.
- Dependensi baru: @fastify/cookie dan @fastify/csrf-protection (Fase 1), otplib (Fase 9). firebase-admin, googleapis, dan bcryptjs sudah ada.

**Test yang wajib.**

- Fase 1: akun tidak dikenal tidak mendapat sesi dan membuat tepat satu AccessRequest; token tanpa email\_verified ditolak; field role atau tenant dari klien diabaikan; akun suspended ditolak dan sesinya tidak bisa dipakai lagi; sesi kedaluwarsa menjawab 401; permintaan POST tanpa X-CSRF-Token atau dengan Origin asing ditolak; pin-login tanpa cookie perangkat ditolak, kunci tiga kali salah berlaku per pasangan pengguna dan perangkat, dan Manager tidak punya jalur PIN.
- Fase 9: pendaftaran dan verifikasi TOTP, kode yang sama tidak bisa dipakai dua kali, kode cadangan sekali pakai, aksi yang meminta verifikasi ulang ditolak tanpa TOTP baru.
- Fase 9: sinkron Google Sheets dengan klien Google yang ditiru: dua kali sinkron menghasilkan baris yang sama; nilai berawalan = dibaca sebagai teks; tiga kegagalan berturut-turut membuat SH1; invalid\_grant mengubah status menjadi NEEDS\_RECONNECT; refresh token di database terenkripsi (nilai mentah tidak muncul).

## 13. Spesifikasi API

Semua rute berada di bawah /api dan melewati guard({ roles, outlet, audit }). Bagian ini adalah daftar rute yang harus ada pada akhir fase masing-masing. Rute yang tidak tercantum tidak boleh dibuat (aturan 18), dan rute yang tercantum tetapi tidak ada di build adalah bug. Layar menu, bahan baku, supplier, dan pesanan di repo saat ini membaca rute tiruan (mock.routes.ts) sehingga data hanya hidup di browser; semuanya diganti rute sungguhan di bawah, dan klien berpindah ke TanStack Query dengan server sebagai sumber kebenaran.

**Konvensi.**

- Awalan /api, JSON UTF-8, tanpa nomor versi di v1 (perubahan yang memutus kompatibilitas memakai /api/v2). Uang dan kuantitas selalu string (aturan 9). Waktu ISO 8601 UTC; filter tanggal memakai business\_date (YYYY-MM-DD).
- Sukses: `{ success: true, data }`. Gagal: `{ success: false, error: KODE, message }` dengan kode di tabel berikut. Respons 500 selalu pesan generik; pesan error asli hanya masuk log (kode saat ini mengembalikan error.message ke klien).
- tenantId, outletId, dan peran hanya dari sesi (aturan 5). Pengguna multi-outlet memilih outlet aktif lewat POST /api/session/outlet yang divalidasi terhadap UserOutlet; tidak ada outletId di query atau body kecuali pada payload offline, yang divalidasi sama dengan outlet Device (bagian 10).
- Daftar memakai `?limit=` (default 50, maksimum 200) dan `?cursor=`; jawabannya `{ items, nextCursor }`.
- Header Idempotency-Key wajib pada: POST /api/pos/checkout, penerimaan barang, pembayaran supplier, waste, konfirmasi opname, dan komit migrasi. Kunci yang sama dengan isi yang sama mengembalikan hasil pertama; isi berbeda menjawab CNF-001.
- Setiap rute mutasi menulis AuditLog (opsi audit pada guard). Setiap jawaban untuk Kasir melewati serializer yang membuang field biaya (aturan 15).
- Batas laju (Redis): 300 permintaan per menit per sesi, lebih ketat pada rute login (bagian 12), unggah, dan ekspor.

| Kode | Status HTTP | Arti |
| --- | --- | --- |
| VAL-001 | 400 | Body atau query tidak lolos validasi Zod; message berisi daftar kesalahan per field |
| VAL-002 | 400 | Melebihi batas (misalnya batch offline lebih dari 20, berkas lebih dari 10 MB) |
| AUT-001 | 401 | Belum masuk, sesi tidak valid, atau kedaluwarsa |
| AUT-002 | 403 | Peran atau outlet tidak berhak |
| AUT-003 | 403 | CSRF atau Origin tidak valid |
| AUT-004 | 403 | Akun ditangguhkan; akun tidak dikenal menjawab 202 ACCESS\_PENDING |
| AUT-005 | 403 | Perlu verifikasi ulang TOTP (Fase 9) |
| RES-001 | 404 | Data tidak ditemukan di tenant atau outlet ini |
| CNF-001 | 409 | Duplikat atau Idempotency-Key dipakai dengan isi berbeda |
| BIZ-001 | 422 | Hari bisnis sudah terkunci |
| BIZ-002 | 422 | Stok tidak cukup dan allowNegativeStock mati |
| BIZ-003 | 422 | Perlu Approval atau melewati batas nominal peran |
| BIZ-004 | 422 | Rekonsiliasi R1 sampai R3 atau R7 gagal untuk operasi ini |
| BIZ-005 | 422 | Aturan domain lain (misalnya rollback migrasi diblokir, retur melebihi penerimaan); message menyebut aturannya |
| RATE-001 | 429 | Terlalu banyak permintaan |
| SYS-001 | 500 | Kesalahan server; pesan generik |

Singkatan peran: SA Super Admin, OW Owner, MG Manager, BR Barista, KS Kasir, SP Supplier, PB publik, Semua = peran mana pun yang sudah masuk. Kolom Status: ada (dipertahankan), ubah (ditulis ulang di jalur yang sama atau diganti), baru.

**Akun, sesi, dan perangkat.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| GET /api/health | PB | Cek hidup (versi dan status database, tanpa detail) | ada | 0 |
| GET /api/auth/csrf | PB | Menerbitkan token CSRF | baru | 1 |
| POST /api/auth/google | PB | Masuk Google; sesi atau 202 ACCESS\_PENDING (bagian 12) | ubah (ganti /auth/google-auth) | 1 |
| POST /api/auth/pin-login | PB dengan cookie perangkat | Masuk PIN Kasir dan Barista | ubah (ganti /auth/login/pin dan /auth/pin/login) | 1 |
| POST /api/auth/logout | Semua | Mencabut sesi di server | ubah (ganti POST /logout mock) | 1 |
| GET /api/auth/me | Semua | Profil, peran, outlet, menuVersion | baru | 1 |
| POST /api/access-requests | PB dengan ID token Google | Mengirim atau memperbarui permintaan akses (jenis TENANT atau SUPPLIER) beserta data usaha | baru | 1 |
| GET /api/access-requests | SA | Daftar permintaan akses | baru | 1 |
| POST /api/access-requests/:id/approve, /reject | SA | Menyetujui (membuat tenant dan Owner atau menautkan) atau menolak | baru | 1 |
| GET, POST /api/users; PATCH /api/users/:id | SA (semua tenant), OW (tenant sendiri; peran MG, BR, KS) | Daftar, undang, ubah peran, outlet, status | baru | 1 |
| POST /api/users/:id/revoke-sessions, /reset-pin | SA, OW; reset PIN juga MG untuk BR dan KS | Mencabut sesi; menghapus hash PIN | baru | 1 |
| GET, POST /api/devices; POST /api/devices/register, /:id/revoke | SA, OW | Kode pendaftaran sekali pakai, mendaftarkan perangkat, mencabut | baru | 1 |
| POST /api/session/outlet | OW, MG | Memilih outlet aktif | baru | 10 |
| POST /api/auth/totp/enroll, /verify, /backup-codes | SA, OW | Pendaftaran dan verifikasi TOTP | baru | 9 |

**Katalog, stok, dan penerimaan.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| GET /api/pos/catalog | KS | Katalog tanpa biaya beserta menuVersion (sumber layar POS dan cache offline) | baru | 2 |
| GET, POST /api/menus; GET, PATCH, DELETE /api/menus/:id | OW (baca: MG, BR, dan KS tanpa biaya) | Menu; DELETE mengarsipkan | baru (ganti /api/products mock) | 2 |
| GET, PUT /api/menus/:id/recipe | OW (baca: MG) | Resep per menu | baru | 2 |
| GET, POST /api/items; PATCH /api/items/:id | OW (baca: MG, BR) | Bahan baku dan kemasan | baru (ganti /api/raw-materials mock) | 2 |
| GET /api/inventory/balances | OW, MG, BR | Stok fisik; kolom nilai hanya OW dan MG | baru | 3 |
| GET /api/inventory/ledger?itemId= | OW, MG | Log pergerakan fisik | baru | 3 |
| GET /api/inventory/valuation?engine=FIFO atau AVG&asOf= | OW, MG | Nilai persediaan per mesin | baru | 3 |
| POST /api/receivings; GET /api/receivings, /:id | OW, MG, BR | Penerimaan barang (dengan atau tanpa PO) | baru | 3 |
| POST /api/supplier-returns | OW | Retur ke supplier | baru | 6 |
| POST /api/inventory/opname; POST /api/inventory/opname/:id/confirm; GET /api/inventory/opname | BR (draf), MG, OW (konfirmasi) | Stock opname | ubah | 3 |
| POST /api/inventory/waste; POST /api/inventory/waste/:id/approve; GET /api/inventory/waste | BR, MG, OW (approve: MG, OW) | Waste | ubah (ganti /inventory-waste mock) | 3 |
| GET /api/reconciliation/runs; POST /api/reconciliation/run; POST /api/reconciliation/runs/:id/acknowledge | MG, OW (jalankan: OW, SA) | Hasil dan pengakuan rekonsiliasi (R1 sampai R3 di Fase 3, R4 sampai R8 di Fase 5) | baru | 3 |

**POS, shift, dan kontrol.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| POST /api/pos/checkout | KS | Penjualan online dengan clientUuid dan Idempotency-Key (bagian 10) | ubah | 2 |
| GET /api/sales?from=&to= | OW, MG | Daftar penjualan; kolom HPP hanya OW dan MG | baru | 2 |
| POST /api/approvals; GET /api/approvals; POST /api/approvals/:id/approve, /reject | KS (minta), MG dan OW (putuskan sesuai batas nominal) | Approval void, refund, diskon, dan lainnya | baru | 5 |
| POST /api/pos/void; POST /api/pos/refund; GET /api/pos/refund/items/:salesId | KS (minta), MG, OW | Void dan refund melalui Approval | ubah | 5 |
| POST /api/shift/open, /close; GET /api/shift/current; POST /api/shift/attendance | KS, BR, MG, OW | Shift dengan hitung kas buta | ubah | 5 |
| GET /api/closing/:date; POST /api/closing/:date/confirm | OW (lihat: MG) | Wizard Tutup hari dan Berita Acara | ubah (ganti POST /finance/daily-closing) | 5 |
| GET /api/reports/daily?date= | OW, MG | Laporan harian | baru | 5 |
| GET /api/alerts; POST /api/alerts/:id/acknowledge | OW, MG | Alert kontrol dan kebijakan | baru | 5 |
| GET, PUT /api/settings/policies | SA (ubah), OW (lihat) | Ambang kebijakan per outlet (bagian 8) | baru | 5 |
| GET, POST, PATCH /api/settings/notification-channels | OW | Brevo dan Telegram | baru | 5 |
| GET /api/audit; GET /api/audit/verify | SA; OW (tenant sendiri) | Log audit dan verifikasi rantai hash | baru | 1 |

**Biaya dan laporan keuangan.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| GET /api/finance/true-cost?period=&engine= | OW, MG | True Cost per periode untuk satu mesin (bagian 7) | baru (ganti /finance/true-hpp) | 4 |
| GET /api/finance/true-cost/menu/:menuId?period=&engine= | OW, MG | Rincian satu menu: material, kemasan, tenaga kerja, alokasi | baru | 4 |
| POST /api/finance/true-cost/finalize | OW (dengan TOTP) | Mengubah periode dari PROVISIONAL ke FINAL | baru | 4 |
| GET, POST, PATCH /api/finance/cost-pools | OW, SA | Kolam biaya dan basis alokasi | baru | 4 |
| GET, POST /api/finance/expenses | OW | Biaya operasional | baru | 4 |
| GET, POST /api/finance/staff-rates; GET, POST /api/finance/wage-entries | OW | Tarif dan catatan upah | baru | 4 |
| GET /api/finance/profit-loss | OW | Laba rugi (mesin utama outlet) | ubah | 4 |
| POST /api/exports; GET /api/exports/:id | OW, MG | Ekspor xlsx (ExportJob) | baru (ganti /finance/export-drive) | 9 |
| GET /api/integrations/google; POST /api/integrations/google/connect, /sync; GET /api/integrations/google/callback; DELETE /api/integrations/google | OW | Google Sheets (bagian 12) | baru | 9 |

**Supply Hub.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| GET /api/admin/suppliers; PATCH /api/admin/suppliers/:id/status | SA | Kurasi: APPLIED, VERIFIED, ACTIVE, SUSPENDED | ubah (ganti rute mock) | 6 |
| GET, POST, PATCH /api/supplier/products | SP | Katalog milik sendiri | ubah | 6 |
| GET /api/supplier/orders; POST /api/supplier/orders/:id/confirm, /ship | SP | PO milik sendiri, konfirmasi, kirim | ubah (ganti /supplier/purchase-requests) | 6 |
| GET, POST /api/supplier/invoices | SP | Invoice milik sendiri | baru | 6 |
| GET /api/supply-hub/suppliers, /suppliers/:id, /products | OW, MG | Pencarian, saring, dan bandingkan | baru (ganti mock) | 6 |
| GET, POST, PUT /api/item-links | OW | Tautan Item dan produk supplier (conversionFactor) | baru | 6 |
| GET, POST /api/purchase-orders; GET /api/purchase-orders/:id; POST /api/purchase-orders/:id/send, /cancel, /approve | OW, MG (approve: OW di atas batas) | PO | baru (ganti /purchase-request mock) | 6 |
| GET, POST /api/supplier-invoices; POST /api/supplier-payments | OW | Invoice, pencocokan tiga arah, dan pembayaran | baru | 6 |
| POST /api/suppliers/:id/reviews | OW | Ulasan terverifikasi | baru | 6 |

**Offline dan migrasi.**

| Rute | Peran | Fungsi | Status | Fase |
| --- | --- | --- | --- | --- |
| POST /api/offline/sync-batch | KS | Menerima batch maksimal 20 transaksi (202) | ubah | 7 |
| POST /api/offline/status; GET /api/offline/status/:clientUuid | KS | Status akhir per transaksi | ubah | 7 |
| GET /api/offline/rejected; POST /api/offline/:clientUuid/review | MG, OW | Daftar Transaksi ditolak dan ditandai ditinjau | baru | 7 |
| POST /api/offline/:clientUuid/approve | OW | Memposting transaksi DEVICE\_REVOKED lewat Approval | baru | 7 |
| POST /api/migration/jobs; GET /api/migration/jobs, /:id | OW (lihat: SA) | Membuat batch (unggah multipart) dan melihat status, pemeriksaan, baris | ubah | 8 |
| PUT /api/migration/jobs/:id/mapping; POST /api/migration/jobs/:id/validate, /reconcile | OW | Pemetaan, validasi ulang, rekonsiliasi | baru | 8 |
| POST /api/migration/jobs/:id/commit | OW (dengan TOTP) | Meminta persetujuan dan komit | baru | 8 |
| POST /api/migration/jobs/:id/approve, /rollback | SA | Persetujuan dan rollback | baru | 8 |
| GET /api/migration/templates/ledgerline.xlsx | OW | Templat xlsx | baru | 8 |

**Rute yang dihapus.**

- server/routes/mock.routes.ts seluruhnya. Server menolak boot bila NODE\_ENV=production dan ada rute mock terdaftar (aturan 8).
- Dari ssot.routes.ts: POST /auth/pin/login, POST /sales/checkout, dan GET /reports/hpp/today (angka tetap). Hanya /health yang bertahan. ssotRoutes dan kitchenRoutes yang terdaftar dua kali (di akar dan di /api) dikembalikan menjadi sekali, di /api.
- POST /api/finance/log (tiruan), POST /api/finance/backup/restore (pemulihan hanya lewat operator di server), GET /api/finance/true-hpp, dan POST /api/pos/void-fallback.
- /api/migration/requests/\*, /api/admin/migration-tickets, dan /api/tenant/migration-tickets, digantikan job migrasi.

**Rute publik.** Hanya: GET /api/health, GET /api/auth/csrf, POST /api/auth/google, POST /api/access-requests (butuh ID token Google), dan POST /api/auth/pin-login (butuh cookie perangkat). Rute QR meja publik tidak termasuk cakupan (bagian 18); bila modul beku itu dinyalakan, rutenya wajib divalidasi Zod, dibatasi laju, dan tidak memuat data biaya.

**Test yang wajib.**

- Penelusur rute (Fase 1): menelusuri semua rute terdaftar lewat hook onRoute dan gagal bila ada rute tanpa guard di luar daftar publik di atas, atau rute yang terdaftar tetapi tidak ada di tabel bagian ini.
- Matriks peran (tiap fase): untuk setiap rute baru, minimal satu test yang mengecek 401 tanpa sesi, 403 untuk peran yang tidak berhak, dan 200 untuk peran yang berhak.
- Kasir tidak pernah menerima field biaya: test memanggil semua rute yang bisa dibaca Kasir dan memindai jawaban untuk kunci unitCost, hpp, hppFifo, hppAverage, margin, trueCost, dan costPrice.
- Isolasi tenant: pengguna tenant A mendapat RES-001 untuk setiap id milik tenant B pada semua rute yang menerima :id.
- Idempotensi: kunci sama dengan isi sama mengembalikan hasil pertama; isi berbeda menjawab CNF-001; tidak ada penggandaan baris.
- Format: semua jawaban sukses memakai { success, data }, semua jawaban gagal memakai kode di tabel, dan jawaban 500 tidak memuat teks error asli.

## 14. UI/UX: Desain dan Tampilan

Tampilan aplikasi di repo dipertahankan: rangka, warna, bentuk, dan alur layar yang ada tidak didesain ulang. Hanya tiga hal yang berubah: layar dihubungkan ke server (bukan penyimpanan browser), teks dan elemen yang bertentangan dengan identitas True Cost atau aturan keamanan diganti, dan layar baru dibuat dengan bahan yang sama. Bagian ini mencatat desain apa adanya, hasil pemeriksaan `src/` pada commit 07054e3, supaya agen kode tidak menebak.

**Aturan tampilan.**

1. Tidak ada redesain. Kelas Tailwind, tata letak, dan urutan layar yang ada dipakai ulang; layar baru meniru layar sejenis yang sudah ada.
2. Tidak ada pustaka UI baru dan tidak ada mode gelap. Tema tunggal slate, sama seperti sekarang.
3. UI tidak menghitung biaya, laba, atau saldo. Angka uang dan kuantitas datang dari server sebagai string dan hanya diformat di layar.
4. Angka biaya selalu menyebut mesinnya (FIFO atau Average) dan statusnya (PROVISIONAL atau FINAL, ditambah trustLevel bila ada). Angka biaya tanpa konteks itu tidak boleh tampil.
5. Menyembunyikan menu bukan kontrol akses. Menu datang dari GET /api/auth/me, dan guard di server tetap menolak peran yang tidak berhak (bagian 12 dan 13).
6. Kasir tidak pernah menerima, menyimpan, atau menampilkan data biaya, termasuk di tooltip dan atribut tersembunyi (aturan 15). Cashier.tsx berhenti membaca costPrice dan berhenti mengirim costAtSale.

**Rangka dan bahan desain.** Satu rangka dipakai semua peran (src/layouts/MainLayout.tsx): sidebar gelap di kiri, header putih satu baris di atas, area isi di tengah, toast di kanan bawah, dan di layar kecil bilah navigasi bawah. Server menentukan menu mana yang tampil.

&#91;embedded content: rangka aplikasi · sidebar, header, area isi\]

Zona dan tata letak rangka tidak berubah dari repo. Yang baru hanya isi menu (dari server), kelompok status di header, dan layar di area isi.

| Aspek | Nilai yang dikunci | Sumber di repo |
| --- | --- | --- |
| Kerangka | Sidebar bg-\[#1E293B\], hanya ikon di lebar md (w-20) dan penuh di lg (w-64); latar isi bg-\[#F8FAFC\]; header putih dengan border-slate-200; isi dengan p-4 (sm:p-6) | MainLayout.tsx |
| Netral | Judul slate-900 atau slate-800, isi slate-700 atau slate-600, label slate-500 atau slate-400; border slate-200 (kartu) dan slate-100 (pemisah dalam); latar kartu putih dan slate-50 | seluruh src |
| Aksen merek | amber-500: logo L dan menu aktif sidebar (bg-amber-500 dengan teks slate-950); amber-400 untuk teks aksen | MainLayout.tsx |
| Aksi utama | indigo-600: tombol Bayar (h-14, huruf kapital) dan ikon judul dasbor | Cashier.tsx, TrueCostDashboard.tsx |
| Status | emerald untuk laba, sukses, konfirmasi; rose untuk rugi, bahaya, void; amber untuk peringatan; indigo untuk informasi. Latar tint 50, teks 600 atau 700 | seluruh src |
| Bentuk | rounded-xl (tombol, input, kartu kecil), rounded-2xl (panel), rounded-3xl (modal besar), rounded-full (pill); shadow-xs untuk kartu, shadow-xl untuk modal dan toast | seluruh src |
| Tipografi | font-sans bawaan Tailwind, tanpa font eksternal; judul font-black atau font-bold; angka uang, kode, dan label teknis font-mono; label kecil huruf kapital dengan tracking-widest | seluruh src |
| Ikon | lucide-react 13 sampai 18 px, bersama label (kecuali sidebar sempit yang hanya ikon) | MainLayout.tsx |
| Gerak | Hanya animate-pulse bawaan Tailwind (skeleton). Kelas animate-fade-in, animate-scale-in, dan pb-safe dipakai di kode tetapi tidak didefinisikan di CSS mana pun sehingga tidak berefek; tidak ada animasi baru | StoreLoginPortal.tsx, MainLayout.tsx |
| Komponen dasar | Button.tsx, Input.tsx, dan Modal.tsx hanya dipakai tiga halaman di src/pages; layar utama menata kelasnya sendiri. Di Fase 2 ketiganya diselaraskan dengan kolom di atas (Button primer indigo-600 dengan rounded-xl, Input rounded-xl dengan ring indigo-500, Modal rounded-2xl), lalu dipakai layar baru sesuai aturan 7 | src/components |

**Mode tampilan.** UiMode tetap dua: sederhana (bawaan) dan lanjutan, dipilih pengguna dan disimpan di localStorage (ledgerline\_ui\_mode). Itu satu-satunya hal yang boleh disimpan di localStorage selain preferensi tampilan lain; peran, tenant, dan token tidak pernah. Mode sederhana menampilkan empat menu (Kasir, Stok, Laporan, Pengaturan); mode lanjutan menampilkan semua menu yang berhak dilihat peran itu.

**Navigasi menurut peran.** Menu disaring dari peran di GET /api/auth/me, bukan dari localStorage seperti sekarang (App.tsx membaca currentStore.cashierRole dari browser).

| Menu | Tab | Peran yang melihat | Layar di repo | Perubahan | Fase |
| --- | --- | --- | --- | --- | --- |
| Dashboard | dashboard | OW, MG | analytics/Dashboard.tsx | Data dari laporan harian dan True Cost di server. Kartu utama: margin True Cost di samping margin HPP saja, status rekonsiliasi, alert terbuka, antrean persetujuan | 5 |
| Kasir POS | kasir | KS | Cashier.tsx, cashier/\* | Katalog dari GET /api/pos/catalog; bisa offline; tanpa data biaya | 2, 7 |
| Stok & Ledger | stok | OW, MG, BR (tab menurut peran) | Inventory.tsx, inventory/\* | Tab dan perubahan di bawah | 2, 3 |
| True Cost & Laporan | laporan | OW, MG | reports/FinancialReports.tsx | Tab di bawah | 4, 5 |
| Supply Hub | suplierhub | OW, MG (SP memakai portalnya sendiri) | SupplierPortal.tsx, SupplyHubAdmin.tsx | Data server, bagian 9 | 6 |
| Pusat Migrasi POS | migrasi | OW | MigrationCenter.tsx | Wizard di atas pipeline bagian 11 | 8 |
| Pengaturan | pengaturan | OW; MG terbatas | StorefrontProfile.tsx, storefront/\* | Tab di bawah | 1 sampai 9 |
| Admin Platform | superadmin | SA | admin/AdminDashboard.tsx | Tab baru Permintaan Akses dan Persetujuan; menu ini belum ada di sidebar sekarang | 1 |

Kasir hanya melihat Kasir POS. Barista hanya melihat Stok & Ledger (tab Penerimaan, Bahan Baku tanpa nilai, Waste, Opname draf). Owner tidak melihat tab Kasir karena POS memakai sesi Kasir (aturan di bagian 3; pertanyaan terbuka di bagian 18). Nama menu di sidebar sederhana: Kasir POS, Stok & Ledger, Laporan & True Cost, Pengaturan. Bilah bawah di layar kecil memuat maksimal lima menu dan memakai nama pendek tiap menu (Dashboard, Kasir, Stok, Laporan, Supply, Migrasi, Atur, Admin) karena kode sekarang memotong nama pada spasi pertama.

**Modul beku disembunyikan.** Menu Barcode Meja QR, Market Intelligence, Business Auditor, dan Langganan & Lisensi, tab Kontribusi Channel, Neraca, dan Arus Kas di Laporan, serta tab Tema, Printer, dan SWOT di Pengaturan, disembunyikan secara bawaan. Satu flag env FROZEN\_MODULES (bawaan mati) menyalakannya kembali. Kodenya tidak dihapus, tidak diuji, dan tidak didukung (bagian 18); rutenya tetap tunduk pada aturan keamanan dan tidak boleh menampilkan data tiruan di produksi.

**Header dan sidebar: perubahan teks dan elemen.**

| Elemen | Sekarang (MainLayout.tsx, index.html) | Menjadi |
| --- | --- | --- |
| Subjudul sidebar | From Counter to Ledger | From Supply to Sale |
| Subjudul header | Ledger-first Coffee & Resto OS | Coffee Business OS · True Cost |
| Tiga chip alur | 1. Transaction Engine, 2. Event-Ledger, 3. Profit Engine | 1. Transaksi, 2. Ledger FIFO + Average, 3. True Cost. Gaya dan warna chip sama (biru, amber, hijau) |
| Lencana AI-Assisted · Ledger-Controlled | Ada | Dihapus (tidak ada fitur AI, bagian 18). Tempatnya diisi kelompok status: Online atau Offline, Mesin utama (pill FIFO atau AVG dari Outlet.primaryCosting), dan Rekonsiliasi (pill dari run terakhir, hanya OW dan MG) |
| Tombol Peran: {activeRole} | Peran bisa diganti dari klien lewat dataStore; matriks otoritas dari konstanta AUTHORITY\_RULES | Hanya baca: menampilkan peran dari sesi server. Klik membuka Matriks Otoritas yang angkanya dari kebijakan di server (bagian 3 dan 8). setActiveRole dan konstanta di klien dihapus |
| Tombol Tutup Kasir / Closing | Satu tombol untuk semua | Tutup Shift (KS, BR) atau Tutup Hari (MG, OW); membuka wizard di bawah |
| Kotak SESI DEMO AKTIF | Ada | Dihapus |
| Keluar Sesi Toko | Menghapus data di browser | Keluar: mencabut sesi di server (bagian 12) |
| Nama menu | Stok & Event-Ledger, Kebenaran Laba (P&L), Supplier Hub | Stok & Ledger, True Cost & Laporan, Supply Hub |
| Judul dan deskripsi di index.html | Ledger-first Coffee & Resto Operating System ... Event-Ledger Costing ... | Judul tetap LedgerLine by Aslam; deskripsi Coffee Business OS berbasis True Cost. From Supply to Sale. From Cost to True Cost. Atribut lang menjadi id |

**Layar demi layar.**

*Masuk (StoreLoginPortal.tsx).* Tampilan kartu dipertahankan. Tab Masuk Toko dan Daftar Baru menjadi Masuk dan Minta Akses. Minta Akses meminta data usaha (nama usaha, kota, telepon, jenis TENANT atau SUPPLIER) lalu login Google, dan hasilnya layar Permintaan terkirim, menunggu persetujuan (jawaban 202 ACCESS\_PENDING). Tombol Masuk Cepat Mode Demo beserta tenant dan token demo dihapus. Tab PIN hanya tampil di perangkat yang punya deviceId di IndexedDB (bagian 10). Pesan gagal tidak membedakan akun tidak dikenal dan akun ditangguhkan.

*Kasir POS (Cashier.tsx).* Tata letak 12 kolom dipertahankan: katalog di kiri, keranjang dan pembayaran di kanan, tombol Bayar h-14 indigo. Yang berubah: (1) bilah status di atas katalog dengan lencana Offline (amber), chip Menunggu sinkron: N, dan tombol Sinkron sekarang; (2) metode bayar (Tunai, QRIS, Transfer, Kartu) hanya label dengan jumlah per metode yang harus sama dengan total (R7); (3) diskon preset dan manual sampai batas DS1, di atasnya tombol Minta persetujuan yang hanya aktif saat online; (4) struk dari data lokal berlabel Menunggu sinkron sampai SYNCED, dengan nomor struk per perangkat (bagian 10); (5) void dan refund dikirim sebagai permintaan Approval dan Kasir melihat statusnya; (6) tidak ada angka biaya di mana pun. Tombol dan target sentuh minimal 44 px.

*Tutup Shift dan Tutup Hari (DeterministicClosingModal.tsx).* Wizard lima langkah dipertahankan beserta stepper lingkarnya: 1. Uang Laci, 2. Non-Tunai, 3. Stok & Resep, 4. Jurnal Tutup, 5. Berita Acara. Langkah 1 menjalankan hitung buta: layar tidak menampilkan expectedCash sampai hitungan dikirim (bagian 8). Langkah 3 memuat daftar periksa hari (opname, transaksi FLAGGED atau REJECTED, transaksi PENDING) dan panel R1 sampai R8. Langkah 4 menampilkan jurnal penutup yang dihitung server. Tutup Shift memakai langkah 1 dan 2 saja.

*Stok & Ledger (Inventory.tsx, tab pill di atas isi).*

| Tab | Peran | Perubahan |
| --- | --- | --- |
| Menu Jual | OW (baca MG) | Data dari /api/menus. Kolom HPP hanya OW dan MG, dengan pill mesin |
| Bahan Baku | OW, MG, BR | Stok fisik. Kolom nilai hanya OW dan MG, memakai pasangan nilai FIFO dan Average berdampingan. Tombol Waste tetap |
| Resep BOM | OW (baca MG) | Resep dari /api/menus/:id/recipe. Biaya resep dihitung server |
| Ledger Stok (sebelumnya Event-Ledger Kronologis) | OW, MG | Daftar pergerakan fisik. Tiap baris punya dua kolom nilai, FIFO dan Average. Baris ESTIMATED diberi tanda. Filter item, jenis, tanggal |
| Penerimaan (baru) | OW, MG, BR | Form penerimaan dengan atau tanpa PO, biaya satuan, biaya tambahan, dan riwayat |
| P.O & Pembelian | OW, MG | Alur PO bagian 9 |
| Stock Opname Fisik | BR (draf), MG dan OW (konfirmasi) | Selisih dihitung server |
| Retur Supplier | OW | Dokumen retur merujuk baris penerimaan |

*True Cost & Laporan (FinancialReports.tsx, TrueCostDashboard.tsx).* Urutan tab: True Cost (pertama dan bawaan), Laba Rugi, Selisih (TheoreticalVarianceView), Rekonsiliasi (baru), Google Sheets (GoogleWorkspaceArchive). Tab True Cost memuat:

- Bilah filter: periode (hari, minggu, bulan; bawaan bulan berjalan), outlet, saklar mesin FIFO atau Average (bawaan mesin utama outlet), pill status periode (PROVISIONAL kuning, FINAL hijau), dan tombol Finalisasi untuk Owner (dengan TOTP).
- Empat kartu ringkasan: Penjualan, True Cost, Laba True Cost (dengan margin), dan Selisih margin terhadap HPP saja (margin yang tampak bila alokasi diabaikan).
- Tabel per menu: Menu, Terjual, HPP bahan, Kemasan, Tenaga kerja, Alokasi, True Cost, Harga, Margin, dan Kepercayaan (TrustBadge). Urutan awal margin naik sehingga menu paling tipis di atas. Menu dengan trustLevel RENDAH tidak masuk peringkat terbaik.
- Klik baris membuka panel samping (GET /api/finance/true-cost/menu/:menuId): komposisi bahan per resep beserta lot, tenaga kerja, alokasi per kolam, dan perbandingan FIFO dengan Average.
- Satu permintaan per tampilan ke GET /api/finance/true-cost. Pengambilan per produk dan header x-tenant-id di TrueCostDashboard sekarang dihapus.

Tab Rekonsiliasi menampilkan R1 sampai R8 per hari dengan ReconChecklist: nama singkat, status, selisih, dan tombol Akui untuk Manager dan Owner (bagian 6).

*Supply Hub.* Owner dan Manager melihat pill Cari Supplier (kartu supplier dengan filter bagian 9), Pesanan, Tautan Item, dan Invoice & Bayar (OW). Supplier masuk ke portal dengan rangka sama dan menu Katalog, Pesanan, Invoice, Profil; hanya data miliknya. Super Admin mengurasi supplier di Admin Platform (SuppliersList).

*Pusat Migrasi POS (MigrationCenter.tsx).* Wizard enam langkah dengan stepper yang sama dengan wizard penutupan: 1. Unggah (sumber, tingkat data, berkas, templat xlsx), 2. Pemetaan (kolom berkas ke field, usulan preset), 3. Validasi (normalisasi dan V1 sampai V11 dengan filter OK, PERINGATAN, ERROR), 4. Rekonsiliasi (M1 sampai M6), 5. Persetujuan (ringkasan, pernyataan sudah membaca jumlah baris dilewati, tombol Komit dengan TOTP), 6. Hasil (impor dan M7). Rollback hanya muncul untuk Super Admin. Tombol preset dengan data contoh dihapus.

*Pengaturan (StorefrontProfile.tsx).* Tab yang ada: Profil Kafe, Etalase Menu, Akses Karyawan (menjadi Pengguna & Akses: undang, peran, outlet, reset PIN, cabut sesi, status), dan Koneksi Google Drive (menjadi Google Sheets: status koneksi, hubungkan, Sinkron sekarang, putus). Tab baru: Perangkat, Kebijakan (SA ubah, OW lihat), Biaya Operasional (kolam biaya, biaya, tarif upah), Notifikasi (Brevo dan Telegram), dan Keamanan (TOTP dan sesi aktif, Fase 9). Tab Migrasi pindah ke menu Pusat Migrasi POS.

*Admin Platform.* Tab yang ada: Tenant, Supplier, Audit (dengan tombol Verifikasi rantai hash). Tab baru: Permintaan Akses (setujui atau tolak, bagian 12) dan Persetujuan (migrasi dan Approval lain yang menunggu Super Admin).

**Komponen baru.** Semua di src/components/ui/ dengan kelas dari tabel bahan di atas.

| Komponen | Fungsi | Aturan |
| --- | --- | --- |
| MoneyText | Menampilkan uang dari string | Format Indonesia, awalan Rp, tanpa desimal, font-mono; negatif rose dengan tanda minus. Tidak menjumlahkan dan tidak lewat Number untuk hitungan (safeFormat sekarang memakai Math.round(Number()) dan dihapus) |
| StatusPill | Pill status | Selalu berteks, tidak hanya warna: PASS, WARN, FAIL, PROVISIONAL, FINAL, FLAGGED, REJECTED, PENDING, SYNCED |
| EnginePair | Dua kolom FIFO dan Average | Mesin utama diberi tanda; selisih kedua mesin ditampilkan bila ada |
| TrustBadge | Lencana trustLevel | PENUH emerald, SEBAGIAN amber, RENDAH rose, dengan tooltip cakupan biaya |
| ReconChecklist | Daftar R1 sampai R8 | Nama singkat, status, selisih, tombol Akui |
| OfflineBadge, SyncQueueChip | Status koneksi dan antrean | Dipakai di header POS dan kelompok status header |
| Stepper | Stepper lingkaran wizard | Gaya sama dengan DeterministicClosingModal |
| EmptyState, ConfirmDialog | Keadaan kosong dan konfirmasi | Konfirmasi memakai kalimat dampak (void, finalisasi, komit migrasi, cabut perangkat) |

**Keadaan layar dan aksesibilitas.**

- Memuat memakai skeleton animate-pulse (pola yang sudah ada). Galat memakai ModuleErrorBoundary yang ada ditambah pesan Indonesia per kode galat (bagian 13), tidak pernah pesan mentah dari server. Keadaan kosong selalu memberi satu langkah berikutnya.
- Ukuran huruf untuk angka, data, dan tombol minimal 11 px. Ukuran 6 sampai 9 px yang kini dipakai ratusan kali dinaikkan; label hiasan huruf kapital boleh 10 px.
- Target sentuh POS minimal 44 px. Warna tidak pernah satu-satunya penanda. Fokus keyboard terlihat (focus:ring-2) dan tombol ikon punya aria-label.
- Format: tanggal 21 Okt 2026, jam 24 jam dalam zona waktu outlet, angka dan rupiah gaya Indonesia, kuantitas sampai 4 desimal tanpa nol di ujung, persentase 2 desimal (42,86%). Kode R1 dan sejenisnya selalu disertai nama singkat.
- Responsif: sidebar ikon di lebar md, penuh di lg, bilah bawah di bawah md. POS dirancang untuk tablet lanskap dan tetap satu kolom di telepon.

**Test yang wajib (Fase 2 sampai 5, ditambah tiap fase layar).** Test komponen untuk MoneyText (string besar, negatif, tanpa pembulatan floating point), StatusPill, dan EnginePair. Test pindai: tidak ada kunci biaya di DOM, IndexedDB, localStorage, maupun jawaban jaringan untuk sesi Kasir (e2e Playwright). Test menu: tiap peran hanya melihat menu di tabel, dan membuka URL tab terlarang menghasilkan 403 dari server. Tidak ada string demo, Ledger-first, Event-Ledger, atau AI-Assisted di bundel produksi (pemeriksaan teks di CI).

## 15. Persyaratan Non-Fungsional

Setiap persyaratan di bawah punya cara ukur yang bisa dijalankan. Persyaratan tanpa bukti otomatis tidak masuk daftar. Angka kinerja adalah target awal untuk satu outlet sampai beberapa outlet per tenant dan diukur ulang di Fase 10.

**Keamanan dan privasi.**

| Persyaratan | Bukti | Fase |
| --- | --- | --- |
| Header: helmet dengan CSP aktif (sekarang dimatikan, S7). Izin hanya untuk origin sendiri serta domain Google dan Firebase Auth yang dipakai; tanpa unsafe-eval | Test integrasi memeriksa header; e2e Playwright di Fase 5 memastikan login tidak menghasilkan pelanggaran CSP di konsol | 1 |
| CORS: origin hanya APP\_ORIGIN dari env dengan credentials; origin: true dihapus | Permintaan dengan Origin asing ditolak | 1 |
| Rahasia hanya dari env, divalidasi Zod saat boot. Di produksi server menolak boot bila rahasia kosong, bernilai placeholder, atau SECRETS\_ENC\_KEY bukan 32 byte. Tidak ada nilai bawaan rahasia di kode | Test env: tiap variabel wajib dihapus satu per satu dan boot gagal dengan pesan yang menyebut nama variabel | 0 |
| Batas laju (Redis): 300 permintaan per menit per sesi; login 10 per 15 menit; unggah migrasi 20 per jam per tenant; ekspor 10 per jam per tenant. Angka bisa diubah lewat env | Test melampaui batas menghasilkan 429 RATE-001 | 1 |
| Semua body, query, dan params lewat skema Zod strict dengan batas panjang string; body maksimum 1 MB, kecuali unggah multipart 10 MB | Penelusur rute (bagian 13) gagal bila rute mutasi tanpa skema | 1 |
| Isolasi tenant: semua akses data lewat helper tenant-scoped (bagian 5). PostgreSQL Row-Level Security sebagai lapis kedua | Test lintas tenant (bagian 13); RLS diuji di Fase 10 | 1, 10 |
| Audit berantai hash dan append-only (bagian 5) | Mengubah satu baris audit mematahkan GET /api/audit/verify | 1 |
| Log tidak memuat token, PIN, kode TOTP, ID token Google, refresh token, maupun isi payload offline | Test logger: nilai rahasia buatan tidak muncul di keluaran log | 1 |
| Berkas unggahan disimpan di penyimpanan privat dengan nama acak dan tidak pernah disajikan lewat @fastify/static | Test: URL berkas tidak bisa diakses publik | 8 |
| Satu lockfile (package-lock.json); bun.lock dihapus. Tidak ada temuan high atau critical pada npm audit saat rilis | CI menjalankan npm audit --audit-level=high | 0, 10 |
| Data pribadi seminimum mungkin: nama, email, dan telepon pengguna; tidak ada data pelanggan akhir (struk anonim). Permintaan penghapusan pengguna dilayani dengan anonimisasi (nama diganti, email di-hash) sementara transaksi dan audit tetap tersimpan sesuai masa retensi | Test anonimisasi: login pengguna itu gagal, transaksi lama tetap utuh dan atribusinya menjadi anonim | 10 |

**Kinerja dan kapasitas.**

| Target | Kondisi ukur | Fase |
| --- | --- | --- |
| POST /api/pos/checkout p95 di bawah 500 ms | 20 permintaan serentak; basis data berisi 100.000 SalesHeader dan 500 item | 10 |
| GET /api/reports/daily di bawah 2 detik | 10.000 transaksi pada hari itu | 10 |
| GET /api/finance/true-cost (satu bulan, 100 menu) di bawah 2 detik | Dibaca dari TrueCostSnapshot | 10 |
| Job truecost:daily untuk satu outlet dengan 100 menu di bawah 30 detik | Data satu tahun | 10 |
| Rekonsiliasi malam R1 sampai R8 satu outlet di bawah 5 menit | 500 item dan ledger satu tahun | 10 |
| 200 transaksi offline antre selesai diproses di bawah 2 menit setelah koneksi pulih | Satu perangkat, pemrosesan berurutan | 7 |
| JS awal layar masuk dan Kasir tidak lebih dari 350 KB gzip | Skrip build membaca dist; modul sekunder tetap dimuat lazy (lazyWithRetry yang ada) | 10 |

Pengukuran memakai skrip load test di tests/load/ (autocannon sebagai devDependency, Fase 10) dan harus menghasilkan laporan angka, bukan hanya lulus atau gagal. Target yang meleset dicatat sebagai temuan, tidak diubah diam-diam.

**Ketersediaan, data, dan operasi.**

- **Ketersediaan.** 99,5% per bulan pada jam operasional outlet (sekitar 3,6 jam gangguan per bulan). Pemeliharaan dijadwalkan di luar jam operasional. Penjualan tetap berjalan lewat mode offline (bagian 10) saat server tidak terjangkau.
- **Backup.** pg\_dump harian terenkripsi ke penyimpanan kompatibel S3; simpan 30 harian dan 12 bulanan; tiap eksekusi tercatat di BackupRun. Skrip npm run backup:verify memulihkan dump terbaru ke basis data kosong lalu menjalankan R1 sampai R3 dan membandingkan jumlah baris tabel utama; dijalankan otomatis tiap bulan. RPO 24 jam (15 menit bila penyedia hosting menyalakan pemulihan ke titik waktu), RTO 4 jam. Pemulihan hanya oleh operator di server; rute pemulihan di aplikasi dihapus (bagian 13).
- **Migrasi skema.** prisma migrate deploy saat deploy. prisma db push --accept-data-loss di skrip start dihapus (S2). Perubahan destruktif dibagi dua rilis (tambah dulu, hapus kemudian). CI menjalankan seluruh migrasi pada basis data kosong dan pada salinan data contoh.
- **Observabilitas.** Logger winston yang sudah ada dipertahankan dengan keluaran JSON dan field requestId, tenantId, userId, rute, status, dan durasi; level lewat env LOG\_LEVEL. Endpoint /metrics (prom-client, Fase 10) hanya untuk jaringan internal atau token operator, memuat durasi permintaan, antrean BullMQ (menunggu dan gagal), jumlah rekonsiliasi gagal per kode, OfflineTransaction PENDING lebih dari satu jam, dan kegagalan SH1. Peringatan ke operator: job gagal berturut-turut, R1 sampai R3 FAIL, backup gagal, antrean offline macet.
- **Retensi.** Transaksi, jurnal, ledger, dan audit disimpan 10 tahun (ditetapkan sebagai kewajiban penyimpanan pembukuan; konfirmasi dengan akuntan pengguna). Sesi kedaluwarsa dihapus setelah 30 hari. Payload mentah OfflineTransaction dikosongkan setelah 90 hari dengan hash tetap tersimpan. Berkas migrasi dihapus 90 hari setelah komit (bagian 11).
- **Waktu.** Semua waktu disimpan UTC. business\_date dihitung dengan zona waktu outlet (bawaan Asia/Jakarta). Server dan basis data berjalan UTC.
- **Peramban dan perangkat.** Chrome dan Edge dua versi stabil terakhir, Safari 16 ke atas, dan Chrome di Android untuk tablet POS. Firefox didukung untuk Owner dan Manager; POS offline hanya diuji di Chrome dan Safari. Mata uang hanya IDR (Decimal(18,0)) dan bahasa hanya Indonesia di v1.
- **Penerapan.** Satu proses Node (Fastify melayani API dan berkas statis), PostgreSQL, dan Redis, dikemas dengan Docker. Prosesor BullMQ berjalan di proses yang sama (WORKER\_MODE=inline) dengan opsi proses terpisah (WORKER\_MODE=separate). docker-compose.yml untuk pengembangan lokal memuat PostgreSQL dan Redis. CI GitHub Actions menjalankan gerbang standar (bagian 16) dan Playwright. Tempat hosting belum ditetapkan (bagian 18).

**Konfigurasi env.** .env.example memuat semua variabel ini tanpa nilai rahasia; server membaca dan memvalidasinya di server/env.ts.

| Variabel | Wajib di produksi | Keterangan |
| --- | --- | --- |
| NODE\_ENV, PORT, APP\_ORIGIN, LOG\_LEVEL | Ya | APP\_ORIGIN dipakai untuk CORS, cookie, dan pemeriksaan Origin |
| DATABASE\_URL | Ya | PostgreSQL (setelah Fase 2) |
| REDIS\_URL | Ya | Batas laju, kunci perangkat, antrean BullMQ |
| COOKIE\_SECRET | Ya | Penandatanganan cookie dan token CSRF |
| SECRETS\_ENC\_KEY | Ya (Fase 9) | 32 byte, enkripsi AES-256-GCM untuk TOTP dan token Google |
| FIREBASE\_PROJECT\_ID dan FIREBASE\_SERVICE\_ACCOUNT | Ya | Verifikasi ID token Google dengan firebase-admin; akun layanan dalam JSON base64 |
| GOOGLE\_OAUTH\_CLIENT\_ID, GOOGLE\_OAUTH\_CLIENT\_SECRET, GOOGLE\_OAUTH\_REDIRECT\_URI | Ya (Fase 9) | Sambungan Google Sheets (scope drive.file) |
| BREVO\_API\_KEY dan BREVO\_SENDER | Opsional | Notifikasi email (bagian 8); tanpa ini kanal email nonaktif |
| TELEGRAM\_BOT\_TOKEN | Opsional | Notifikasi Telegram |
| BACKUP\_S3\_ENDPOINT, BACKUP\_S3\_BUCKET, BACKUP\_S3\_KEY, BACKUP\_S3\_SECRET, BACKUP\_ENC\_KEY | Ya (Fase 10) | Penyimpanan backup |
| WORKER\_MODE | Tidak | inline (bawaan) atau separate |
| FROZEN\_MODULES | Tidak | Bawaan mati (bagian 14) |
| SESSION\_IDLE\_MINUTES\_SA, SESSION\_IDLE\_MINUTES\_OWNER dan sejenisnya, RATE\_LIMIT\_\* | Tidak | Mengubah angka bawaan di bagian 12 dan di atas |

GEMINI\_API\_KEY dan semua yang terkait fitur AI dihapus dari env.ts (bagian 18). Super Admin pertama dibuat lewat perintah operator npm run admin:create -- --email, tanpa kata sandi (masuk lewat Google), dan tercatat di AuditLog. Perintah serupa npm run admin:reset-totp ada di bagian 12.

**Test yang wajib.** Fase 0: test env (setiap variabel wajib dihapus bergantian dan boot gagal). Fase 1: header CSP dan CORS, batas laju, redaksi log. Fase 7: kinerja sinkron 200 transaksi. Fase 10: skrip load test dengan laporan angka, backup:verify pada basis data kosong, anonimisasi pengguna, RLS, npm audit, dan ukuran bundel.

## 16. Fase Build 0 sampai 10 dan Prompt Eksekusi

Pekerjaan dibagi sebelas fase yang dijalankan berurutan, satu fase per sesi vibe coding. Fase hanya dimulai bila gerbang fase sebelumnya hijau dan tag git fase-(N-1) ada. MVP adalah Fase 0 sampai 5; rilis penuh adalah Fase 0 sampai 10. Prompt tiap fase ditulis supaya bisa ditempel apa adanya ke agen kode, dengan AGENTS.md (bagian 2) terpasang di repo.

**Cara menjalankan.**

- Satu fase per sesi. Awali dengan: baca AGENTS.md, docs/PRD.md bagian 1 sampai 5, dan bagian fase ini; jalankan gerbang untuk mencatat kondisi awal.
- Kerjakan hanya Tugas fase itu. Dependensi baru hanya yang tertulis di fase tersebut (aturan Stack di AGENTS.md).
- Tiga percobaan memperbaiki satu kegagalan gerbang. Bila masih gagal, kembali ke tag fase sebelumnya (git reset --hard fase-(N-1)) dan ulangi dengan prompt yang lebih sempit, jangan menumpuk perbaikan.
- Fase selesai dengan satu commit berpesan fase N: ringkasan, lalu tag fase-N. Agen melaporkan file yang berubah dan ringkasan keluaran tiap perintah gerbang.
- Test fase lama tetap ada di suite dan harus tetap hijau (regresi). Menghapus atau melemahkan test dilarang (aturan 21).

**Gerbang standar** (berlaku untuk semua fase, ditambah gerbang khusus fase itu):

1. npm run typecheck (tsc --noEmit) tanpa error.
2. npm run lint tanpa error.
3. npm test hijau, termasuk semua test fase sebelumnya.
4. npm run build berhasil.
5. npx prisma migrate status menyatakan semua migrasi terpasang (mulai Fase 2). Pada Fase 0 dan 1 diganti npx prisma validate.
6. Tidak ada perubahan di luar lingkup fase dan tidak ada perubahan tampilan di luar tugas (aturan 7).

**Ringkasan fase.**

| Fase | Nama | Hasil yang bisa dilihat | Bagian PRD | Dependensi baru | Menutup celah |
| --- | --- | --- | --- | --- | --- |
| 0 | Pembersihan dan gerbang build | Build bersih, rahasia tanpa nilai bawaan, tidak ada angka palsu | 4, 15 | tidak ada (eslint diselaraskan) | K6, T3, S1, S2, S3, S8 |
| 1 | Akses dan keamanan | Login Google dengan whitelist, sesi cookie, guard di semua rute, audit berantai | 3, 12, 13 | @fastify/cookie, @fastify/csrf-protection | K1 sampai K5, S4, S6, S7 |
| 2 | PostgreSQL, Decimal, migrasi | Basis data PostgreSQL bertipe Decimal, menu dan resep dari server | 5, 13 | Vitest, Testing Library, jsdom (dev) | T2 |
| 3 | Mesin biaya ganda | Stok fisik dinilai FIFO dan Average, penerimaan, R1 sampai R3 | 6 | tidak ada | T1 |
| 4 | True Cost Engine | Dasbor True Cost per menu | 7, 14 | tidak ada | T4 |
| 5 | Kontrol, laporan, alert (akhir MVP) | Shift buta, Approval, tutup hari, laporan harian, alert | 8, 14 | @playwright/test (dev) | T5 |
| 6 | Supply Hub | Cari supplier, PO, penerimaan, invoice | 9 | tidak ada | K4 (tuntas) |
| 7 | POS offline-first | Penjualan tanpa internet dan sinkron | 10 | vite-plugin-pwa (dev), idb (dideklarasikan) | T6 |
| 8 | Migration Center | Impor dari POS lama dengan saldo awal bernilai | 11 | exceljs | T7 |
| 9 | Google, ekspor, TOTP, analitik | Salinan Sheets, ekspor xlsx, TOTP, tren penjualan | 12 | otplib | S5 |
| 10 | Hardening dan rilis | Backup terbukti, uji beban, penerapan, multi-outlet | 15, 17 | autocannon (dev), prom-client | S5 (tuntas) |

**Fase 0. Pembersihan dan gerbang build.** Tujuan: repo bisa dibangun dari nol, tidak ada rahasia bawaan, dan tidak ada angka palsu sebelum fitur apa pun ditambah.

1. Buat npm ci lulus tanpa --legacy-peer-deps (selaraskan versi eslint dengan eslint-plugin-react), hapus bun.lock, dan ganti nama paket menjadi ledgerline.
2. Perbaiki semua error tsc (client Prisma dibuat di langkah prisma generate; sisanya error tipe nyata di front-end). Skrip: typecheck, lint (eslint), test, build. Hapus skrip setup kosong. Skrip start hanya menjalankan node dist/server.cjs; prisma db push --accept-data-loss dihapus (S2).
3. Keluarkan prisma/dev.db dan firebase-applet-config.json dari git (git rm --cached) dan pastikan .gitignore memuatnya (S3). Menghapus keduanya dari riwayat git adalah keputusan pemilik (bagian 18).
4. Tulis ulang server/env.ts: skema Zod ketat, tanpa nilai bawaan rahasia, boot gagal di produksi bila rahasia kosong. Hapus JWT\_SECRET, kata sandi superadmin, GEMINI\_API\_KEY, dan dependensi @google/genai. Buat .env.example sesuai bagian 15.
5. Hapus GET /reports/hpp/today (angka tetap). Daftarkan mock.routes.ts hanya bila NODE\_ENV bukan production, dan tambahkan pemeriksaan boot yang gagal bila ada rute mock di produksi (aturan 8).
6. Hapus pengiriman WhatsApp di server/notification.ts (di luar cakupan, bagian 18). Tulis ulang README.md: menjalankan lokal, env, struktur, tautan ke docs/PRD.md.
7. Letakkan AGENTS.md dan STACK.md di akar repo dan docs/PRD.md; buat konfigurasi CI GitHub Actions yang menjalankan gerbang standar.
8. Tulis test env (tiap variabel wajib dihapus bergantian, boot gagal dengan nama variabel) dan pertahankan test health serta p0\_financial yang ada.

**Dependensi baru:** tidak ada. **Gerbang khusus:** npm ci tanpa flag tambahan hijau di CI; GET /reports/hpp/today menjawab 404; boot produksi dengan JWT\_SECRET kosong gagal.

```text
Kamu mengerjakan FASE 0 (Pembersihan dan gerbang build) pada repo ladgerline.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 5, bagian 15, dan Fase 0 di bagian 16.
Kerjakan hanya Tugas Fase 0. Jangan mengubah tampilan, skema data, atau logika bisnis.
1) Buat npm ci lulus tanpa --legacy-peer-deps, hapus bun.lock, ganti nama paket menjadi ledgerline.
2) Perbaiki semua error tsc. Buat skrip typecheck, lint, test, build. Hapus prisma db push dari skrip start.
3) git rm --cached prisma/dev.db dan firebase-applet-config.json; pastikan .gitignore memuatnya.
4) Tulis ulang server/env.ts: Zod ketat, tanpa nilai bawaan rahasia, boot produksi gagal bila rahasia kosong. Hapus GEMINI_API_KEY dan @google/genai. Buat .env.example sesuai bagian 15.
5) Hapus GET /reports/hpp/today. Daftarkan mock.routes.ts hanya di luar produksi dan gagalkan boot produksi bila ada rute mock.
6) Hapus pengiriman WhatsApp di server/notification.ts. Tulis ulang README.md.
7) Tambahkan AGENTS.md, STACK.md, docs/PRD.md, dan CI yang menjalankan gerbang standar.
8) Tulis test env dan pertahankan test yang sudah ada.
Selesai bila gerbang standar hijau (prisma validate menggantikan migrate status). Commit "fase 0: ...", tag fase-0, lalu laporkan file yang berubah dan keluaran tiap perintah gerbang.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 1. Akses dan keamanan.** Tujuan: tidak ada rute atau layar yang bisa dipakai tanpa identitas, peran, dan tenant yang diverifikasi server. Menutup K1 sampai K5, S4, S6, S7. Skema ditambah di schema.prisma (masih SQLite); migrasi SQL resmi pertama dibuat di Fase 2.

1. Model baru atau diubah sesuai bagian 5: UserProfile (peran SUPER\_ADMIN, OWNER, MANAGER, BARISTA, KASIR, SUPPLIER; status invited, active, suspended), UserOutlet, AccessRequest, Session, Device, dan AuditLog berantai hash (prevHash dan hash; tanpa update dan delete di kode, trigger basis data menyusul di Fase 2).
2. Perintah operator npm run admin:create -- --email untuk Super Admin pertama (tanpa kata sandi), tercatat di AuditLog.
3. Alur masuk bagian 12: POST /api/auth/google (firebase-admin verifyIdToken dengan checkRevoked, email\_verified, whitelist, AccessRequest dan 202 ACCESS\_PENDING), sesi buram dengan hash SHA-256 di tabel Session, cookie ll\_session, GET /api/auth/csrf dengan pemeriksaan X-CSRF-Token dan Origin, POST /api/auth/logout, GET /api/auth/me, batas laju Redis (ioredis).
4. guard({ roles, outlet, audit }) memuat sesi, peran, dan outlet dari basis data. Semua rute di folder server/routes lewat guard kecuali daftar publik bagian 13. Rute mock, kitchen, ssot, migration, dan supplier dikunci dengan guard sementara (fitur lengkapnya di fase berikutnya); login supplier lama (K4) dan /auth/pin/login serta /auth/login/pin dihapus.
5. Serializer respons per peran (Kasir tanpa biaya) dan helper akses data tenant-scoped (aturan 5). Hapus pembacaan x-tenant-id.
6. Rute akun: access-requests, users, revoke-sessions, reset-pin, devices (kode pendaftaran 15 menit, register, revoke), pin-login dengan cookie ll\_device (bagian 12), audit dan verify (bagian 13).
7. Header keamanan bagian 15: helmet dengan CSP aktif, CORS hanya APP\_ORIGIN, cookie HttpOnly, SameSite=Strict, redaksi log.
8. Klien: StoreLoginPortal menjadi Masuk dan Minta Akses (bagian 14) tanpa demo; App.tsx membaca GET /api/auth/me lewat TanStack Query; hapus token dan peran dari localStorage dan setActiveRole; menu dari peran server; Matriks Otoritas hanya baca dengan angka dari konstanta server (digantikan kebijakan di Fase 5); tab Admin Platform dengan Permintaan Akses dan Pengguna.
9. Hapus server/utils/jwt.ts, paket jsonwebtoken, action register di auth.service.ts, dan pemakaian JWT di klien.

**Dependensi baru:** @fastify/cookie, @fastify/csrf-protection. Hapus jsonwebtoken. **Gerbang khusus:** acceptance A1, A2, A7 (bagian 17); penelusur rute hijau; daftar rute terdaftar sama dengan tabel bagian 13 untuk fase 0 dan 1.

```text
Kamu mengerjakan FASE 1 (Akses dan keamanan) pada repo ladgerline. Tag fase-0 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 5, bagian 3, 12, 13, 14 (Masuk dan Navigasi), 15, dan Fase 1 di bagian 16.
Kerjakan hanya Tugas Fase 1. Jangan menyentuh mesin biaya, skema keuangan, atau tampilan di luar yang disebut.
1) Tambahkan model UserProfile (peran dan status sesuai bagian 3), UserOutlet, AccessRequest, Session, Device, AuditLog berantai hash. Buat npm run admin:create.
2) Implementasikan POST /api/auth/google, GET /api/auth/csrf, POST /api/auth/logout, GET /api/auth/me persis sesuai bagian 12: sesi buram di cookie ll_session, hanya hash disimpan, CSRF dan Origin diperiksa, tidak ada JWT.
3) Tulis guard({ roles, outlet, audit }) dan pasang di SEMUA rute. Hanya rute publik bagian 13 yang boleh tanpa guard. Hapus x-tenant-id.
4) Tulis serializer Kasir (tanpa biaya) dan helper tenant-scoped. Tulis rute users, access-requests, devices, pin-login, audit sesuai tabel bagian 13.
5) Aktifkan CSP, batasi CORS ke APP_ORIGIN, batas laju Redis, redaksi log (bagian 15).
6) Klien: ubah StoreLoginPortal, App.tsx, MainLayout sesuai bagian 14. Hapus tombol demo, token di localStorage, setActiveRole.
7) Hapus jwt.ts, jsonwebtoken, login supplier lama, /auth/pin/login, /auth/login/pin, action register.
8) Test wajib: seluruh daftar Fase 1 di bagian 12 dan 13 (penelusur rute, matriks peran, Kasir tanpa biaya, isolasi tenant, CSP, CORS, batas laju).
Selesai bila gerbang standar hijau. Commit "fase 1: ...", tag fase-1, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 2. PostgreSQL, Decimal, dan migrasi.** Tujuan: uang dan kuantitas disimpan tepat, skema berada di migrasi yang bisa diulang, dan katalog (menu, bahan baku, resep) hidup di server. Menutup T2.

1. docker-compose.yml dengan PostgreSQL 16 dan Redis 7. Ganti provider Prisma ke postgresql dan DATABASE\_URL ke env.
2. Ubah semua kolom uang menjadi Decimal(18,0), kuantitas dan biaya satuan menjadi Decimal(18,4) sesuai aturan tipe bagian 5. Terapkan perubahan tabel A dan tabel B bagian 5 untuk model yang dipakai Fase 1 sampai 5; model Fase 6 sampai 10 ditambahkan dengan migrasi di fasenya.
3. Buat migrasi dasar prisma migrate dev, lalu tulis trigger dan constraint di migrasi SQL terpisah: append-only untuk InventoryLedger, JournalEntry, JournalLine, dan AuditLog; jurnal harus seimbang; unique constraint bagian 5 butir C. Tidak ada migrasi data dari SQLite (dev.db hanya data contoh).
4. prisma/seed.ts baru: data contoh hanya bila NODE\_ENV bukan production. Hapus model DemoSession dan server/db-pg.ts yang tidak terpakai.
5. Rute katalog sungguhan: GET dan POST /api/menus, GET PATCH DELETE /api/menus/:id, GET PUT /api/menus/:id/recipe, GET POST /api/items, PATCH /api/items/:id, GET /api/pos/catalog, GET /api/sales. Menggantikan rute mock menu dan bahan baku.
6. POST /api/pos/checkout dengan kontrak bagian 10 (clientUuid, receiptNo per perangkat, Idempotency-Key, serializer tanpa biaya). Pada fase ini checkout hanya mencatat penjualan, pembayaran, dan nomor struk; pergerakan stok, HPP, dan jurnal ditambahkan di Fase 3 pada transaksi yang sama.
7. Klien: Menu Jual, Bahan Baku, Resep BOM, dan katalog Kasir membaca server lewat TanStack Query. Selaraskan Button.tsx, Input.tsx, dan Modal.tsx dengan bahan desain bagian 14, buat MoneyText, dan hentikan Number() untuk uang. Pasang Vitest, Testing Library, dan jsdom untuk test komponen.

**Dependensi baru:** vitest, @testing-library/react, jsdom (devDependencies). **Gerbang khusus:** prisma migrate status hijau pada basis data kosong dan pada basis data hasil migrasi; test trigger (update dan delete ledger ditolak, jurnal tidak seimbang ditolak); Decimal bolak-balik sebagai string tanpa Float; katalog tidak memuat kunci biaya.

```text
Kamu mengerjakan FASE 2 (PostgreSQL, Decimal, migrasi) pada repo ladgerline. Tag fase-1 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 5, bagian 5, 13, 14, dan Fase 2 di bagian 16.
Kerjakan hanya Tugas Fase 2. Jangan membuat pergerakan stok, HPP, atau jurnal penjualan (itu Fase 3).
1) Tambahkan docker-compose.yml (PostgreSQL 16, Redis 7). Ganti provider Prisma ke postgresql.
2) Ubah uang ke Decimal(18,0) dan kuantitas serta biaya satuan ke Decimal(18,4). Terapkan tabel A dan B bagian 5 untuk model Fase 1 sampai 5.
3) Buat migrasi dasar dan migrasi SQL untuk trigger append-only, jurnal seimbang, dan unique constraint (bagian 5 butir C).
4) Tulis seed.ts yang hanya jalan di luar produksi. Hapus DemoSession dan db-pg.ts.
5) Tulis rute /api/menus, /api/items, resep, /api/pos/catalog, /api/sales, dan POST /api/pos/checkout sesuai bagian 13 dan kontrak bagian 10. Semua lewat guard. JSON mengirim uang dan kuantitas sebagai string.
6) Klien: ganti sumber data menu, bahan baku, resep, dan katalog ke server. Selaraskan Button, Input, Modal dengan bagian 14. Buat MoneyText. Hapus Number() untuk uang.
7) Tulis test: migrasi pada basis data kosong, trigger, Decimal bolak-balik, katalog tanpa biaya, isolasi tenant pada rute baru, test komponen MoneyText.
Selesai bila gerbang standar hijau termasuk prisma migrate status. Commit "fase 2: ...", tag fase-2, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 3. Mesin biaya ganda.** Tujuan: satu pergerakan stok fisik dinilai FIFO dan Average sekaligus, dengan bukti rekonsiliasi. Menutup T1. Ini fase paling berisiko; jangan digabung dengan fase lain.

1. Fungsi murni di server/domain/costing/ (fifo.ts, average.ts, valuation.ts, invariants.ts) sesuai kontrak bagian 6, bertipe Decimal, tanpa import Fastify atau Prisma (aturan 3). Pindahkan assertInvariant dari server/utils.
2. PhysicalStockService sebagai satu-satunya penulis kuantitas fisik (aturan 13). Tiap pergerakan menulis satu baris InventoryLedger lalu dua baris InventoryValuation (FIFO dan AVG) dan jurnal COMMON, FIFO, dan AVG, dalam satu transaksi dengan lock baris, mengikuti urutan bagian 6.
3. Refaktor server/domain/cost-engine (FifoCostEngine, AverageCostEngine) menjadi adaptor basis data tipis di atas fungsi murni. Hapus CostEngineFactory yang memilih mesin menurut paket tenant (T1). Mesin utama diambil dari Outlet.primaryCosting dan hanya memengaruhi laporan.
4. CheckoutService menambah konsumsi stok menurut resep dalam transaksi penjualan yang sama, termasuk stok tidak cukup (lot ESTIMATED dan true-up, bagian 6) dan BIZ-002 bila allowNegativeStock mati.
5. Rute sesuai bagian 13: POST dan GET /api/receivings, GET /api/inventory/balances, /ledger, /valuation, opname (draf, konfirmasi), waste (ajukan, setujui), dan /api/reconciliation (R1 sampai R3). Idempotency-Key pada penerimaan, waste, dan konfirmasi opname.
6. Infrastruktur BullMQ: modul antrean dengan koneksi ioredis dan WORKER\_MODE (bagian 15). Hapus outboxWorker yang menyapu tabel outbox lewat setInterval (periksa dulu isinya; HPP kini dihitung dalam transaksi penjualan). Job reconcile malam pukul 00:30 menjalankan R1 sampai R3; operasi yang membuat R1 sampai R3 gagal ditolak dengan BIZ-004.
7. Klien: Stok & Ledger sesuai bagian 14 (Bahan Baku dengan EnginePair, Ledger Stok dua kolom nilai, tab Penerimaan, Opname, Waste). Stok bahan baku dibaca dari server; pengurangan stok di dataStore dihapus.

**Dependensi baru:** tidak ada (bullmq dan ioredis sudah terdeklarasi). **Gerbang khusus:** acceptance A3 dan A4; test properti dengan PRNG ber-seed (rangkaian acak penerimaan, penjualan, waste, opname, retur) selalu menghasilkan R1 sampai R3 lulus; dua checkout serentak atas item yang sama menghasilkan stok akhir benar; kegagalan yang disuntikkan di tengah transaksi tidak meninggalkan baris apa pun.

```text
Kamu mengerjakan FASE 3 (Mesin biaya ganda) pada repo ladgerline. Tag fase-2 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 6, bagian 13, bagian 14 (Stok & Ledger), dan Fase 3 di bagian 16.
Kerjakan hanya Tugas Fase 3. Jangan menyentuh True Cost, shift, void, refund, atau tampilan di luar tab Stok & Ledger.
1) Tulis fungsi murni fifoReceive, fifoConsume, avgReceive, avgConsume, valuation, dan invariants di server/domain/costing sesuai kontrak bagian 6. Tulis test unit dan test properti (PRNG ber-seed) SEBELUM adaptor.
2) Tulis PhysicalStockService dan posting ledger, valuasi, serta jurnal COMMON, FIFO, AVG dalam satu transaksi sesuai urutan bagian 6. Hanya servis ini yang boleh menulis kuantitas fisik.
3) Refaktor FifoCostEngine dan AverageCostEngine menjadi adaptor tipis; hapus CostEngineFactory berbasis paket; pakai Outlet.primaryCosting.
4) Tambahkan konsumsi stok menurut resep ke CheckoutService (ESTIMATED dan true-up, BIZ-002).
5) Tulis rute receivings, inventory (balances, ledger, valuation, opname, waste) dan reconciliation R1 sampai R3 sesuai bagian 13, dengan guard dan Idempotency-Key.
6) Bangun modul BullMQ dan job reconcile 00:30; hapus outboxWorker setInterval setelah memeriksa isinya.
7) Klien: ubah tab Stok & Ledger sesuai bagian 14; baca stok dari server.
8) Test wajib: fixture A3 (FIFO 350.000, Average 375.000, sisa 500 g, lalu 500.000 untuk keduanya), properti R1 sampai R3, konkurensi, atomik, ESTIMATED dan true-up, BIZ-002, BIZ-004, idempotensi penerimaan.
Selesai bila gerbang standar hijau. Commit "fase 3: ...", tag fase-3, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 4. True Cost Engine.** Tujuan: biaya sebenarnya per menu (bahan, kemasan, tenaga kerja, alokasi biaya operasional) tersedia untuk kedua mesin dengan status dan tingkat kepercayaan. Menutup T4.

1. server/domain/truecost/ (recipe-cost.ts, allocation.ts, snapshot.ts) sesuai bagian 7: fungsi murni, alokasi dengan metode sisa terbesar, basis UNITS, MINUTES, REVENUE, dan DIRECT\_COST, kolam LABOR, UTILITY, RENT, dan OTHER.
2. Model dan rute: CostPool, Expense, StaffRate, WageEntry, TrueCostSnapshot; GET, POST, PATCH /api/finance/cost-pools, /expenses, /staff-rates, /wage-entries sesuai tabel bagian 13.
3. Job BullMQ truecost:daily (PROVISIONAL) dan truecost:monthly (kandidat FINAL). POST /api/finance/true-cost/finalize memerlukan Owner; verifikasi TOTP ditegakkan di Fase 9 (AUT-005).
4. Rute baca: GET /api/finance/true-cost, /true-cost/menu/:menuId, dan GET /api/finance/profit-loss untuk mesin utama outlet.
5. Hapus TrueHppService (pembagian menurut porsi omzet), rute /finance/true-hpp, dan rute mock /cost-engine/true-cost/:id beserta pengambilan per produk di TrueCostDashboard.
6. Klien: tab True Cost dan Pengaturan, Biaya Operasional sesuai bagian 14 (saklar mesin, EnginePair, TrustBadge, panel rincian).

**Dependensi baru:** tidak ada. **Gerbang khusus:** acceptance A5 dan A6; hasil sama untuk masukan sama (deterministik); periode FINAL tidak bisa diubah; trustLevel mengikuti cakupan biaya; satu permintaan per tampilan dasbor.

```text
Kamu mengerjakan FASE 4 (True Cost Engine) pada repo ladgerline. Tag fase-3 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 7, bagian 13, bagian 14 (True Cost & Laporan), dan Fase 4 di bagian 16.
Kerjakan hanya Tugas Fase 4. Jangan mengubah mesin biaya fisik atau tampilan di luar tab True Cost dan Biaya Operasional.
1) Tulis fungsi murni recipe-cost, allocation (sisa terbesar), dan snapshot di server/domain/truecost sesuai rumus bagian 7. Test unit lebih dulu.
2) Tambahkan CostPool, Expense, StaffRate, WageEntry, TrueCostSnapshot (bagian 5) dan rute finance bagian 13.
3) Buat job truecost:daily dan truecost:monthly di BullMQ, lalu rute true-cost, true-cost/menu, finalize, profit-loss.
4) Hapus TrueHppService, /finance/true-hpp, rute mock /cost-engine/true-cost/:id, dan pengambilan per produk di TrueCostDashboard.
5) Klien: bangun tab True Cost dan Biaya Operasional sesuai bagian 14. Satu permintaan per tampilan.
6) Test wajib: fixture A5 (HPP Average 9.000 dan FIFO 8.100, alokasi 7.000, True Cost 16.000 dan 15.100, margin 42,86% dan 46,07%), alokasi 1.000.000 menjadi 333.334, 333.333, 333.333, determinisme, periode FINAL terkunci, trustLevel.
Selesai bila gerbang standar hijau. Commit "fase 4: ...", tag fase-4, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 5. Kontrol, laporan, dan alert (akhir MVP).** Tujuan: satu outlet bisa menutup hari dengan kas, stok, dan laba yang bisa dipertanggungjawabkan. Menutup T5; sesudah fase ini aplikasi tidak lagi menyimpan keadaan bisnis di browser.

1. Shift sesuai bagian 8: buka dan tutup dengan hitung kas buta (expectedCash tidak dikirim sebelum hitungan diterima), absensi, dan rute /api/shift.
2. Approval: model dan rute (/api/approvals). Void dan refund melalui Approval dengan batas nominal peran (bagian 3); setelah disetujui, pergerakan dan jurnal pembalik ditulis pada kedua mesin dan stok dikembalikan pada biaya lot asal (bagian 6). Yang belum disetujui tidak mengubah stok maupun jurnal.
3. Tutup hari: GET dan POST /api/closing/:date dengan syarat kunci hari dan Berita Acara (bagian 8). Hari terkunci hanya menerima jurnal pembalik.
4. Laporan harian GET /api/reports/daily dengan rumus bagian 8.
5. Kebijakan dan alert: GET dan PUT /api/settings/policies, GET /api/alerts dan acknowledge, mesin alert dengan ambang bagian 8 (R5, R6, VR1, OP1, PO1, PR1, DS1, OF1, OF2, BK1, SH1). Selesaikan R4 sampai R8 di job rekonsiliasi malam.
6. Notifikasi: /api/settings/notification-channels dengan Brevo dan Telegram lewat HTTPS (fetch), tanpa SDK baru.
7. Klien: hapus keadaan bisnis di dataStore (stok, financeLogs, pesanan contoh); Dashboard, Kasir, Stok, dan Laporan membaca server. Wizard Tutup Shift dan Tutup Hari lima langkah, kelompok status header, dan Matriks Otoritas dari kebijakan (bagian 14).
8. Hapus dailyClosingWorker (setInterval), POST /finance/daily-closing lama, dan rute finance log tiruan.
9. Pasang Playwright dan tulis e2e skenario MVP: masuk, jual, tutup shift dengan hitung buta, void lewat Approval, tutup hari, baca laporan harian dan True Cost.

**Dependensi baru:** @playwright/test (devDependency). **Gerbang khusus:** acceptance A7, A8, A9, dan A17 (skenario MVP end to end). Dengan tag fase-5 dan semua acceptance A1 sampai A9 dan A17 hijau, satu outlet pilot boleh memakai sistem (MVP).

```text
Kamu mengerjakan FASE 5 (Kontrol, laporan, dan alert) pada repo ladgerline. Tag fase-4 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 8, bagian 13, bagian 14 (semua layar), dan Fase 5 di bagian 16.
Kerjakan hanya Tugas Fase 5. Jangan membuat Supply Hub, offline, atau migrasi.
1) Tulis shift dengan hitung kas buta, absensi, dan rute /api/shift.
2) Tulis Approval dan rute void dan refund melalui Approval dengan batas nominal peran. Posting pembalik di kedua mesin dan kembalikan stok pada biaya lot asal.
3) Tulis tutup hari (syarat kunci, Berita Acara, kunci hari) dan laporan harian sesuai rumus bagian 8.
4) Tulis kebijakan, alert, R4 sampai R8, dan notifikasi Brevo dan Telegram lewat fetch.
5) Klien: hapus keadaan bisnis di dataStore, baca server, ubah wizard penutupan dan header sesuai bagian 14. Hapus dailyClosingWorker dan rute tiruan finance.
6) Pasang Playwright dan tulis e2e skenario MVP.
7) Test wajib: seluruh daftar Test yang wajib bagian 8, ditambah acceptance A7, A8, A9, A17.
Selesai bila gerbang standar hijau. Commit "fase 5: ...", tag fase-5, dan laporkan, termasuk daftar periksa MVP di bagian 17.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 6. Supply Hub.** Tujuan: dari mencari supplier sampai pembayaran, dengan biaya pembelian masuk ke mesin biaya hanya lewat penerimaan. Menuntaskan K4.

1. Model sesuai bagian 5 dan 9: status Supplier (APPLIED, VERIFIED, ACTIVE, SUSPENDED), SupplierCatalog dengan packSize dan packUnit, ItemSupplierLink (conversionFactor), PriceContract, PurchaseOrder dengan mesin status bagian 9, Shipment, SupplierInvoice, SupplierPayment, dan SupplierReview.
2. Tulis ulang server/routes/supplier.routes.ts dan semua rute Supply Hub di tabel bagian 13. Supplier masuk lewat Google (peran SUPPLIER dengan supplierId) dan hanya melihat data miliknya; penyaringan di serializer.
3. PO: DRAFT sampai CLOSED, persetujuan Owner di atas batas nominal Manager (Approval Fase 5), konfirmasi dan pengiriman oleh supplier.
4. Penerimaan tanpa dan dengan PO (parsial) memakai /api/receivings Fase 3. Tambahkan alokasi biaya tambahan pro rata dengan metode sisa terbesar dan hubungan ke PO. Retur supplier lewat POST /api/supplier-returns, dinilai pada biaya penerimaan asal.
5. Invoice, pencocokan tiga arah, pembayaran dengan jurnal Dr Utang Usaha dan Cr Kas atau Bank, dan Idempotency-Key pada pembayaran.
6. Alert PO1 (selisih harga lebih dari 5% terhadap PO) dan PR1 (lonjakan harga) dari data penerimaan.
7. Klien sesuai bagian 14: SupplierPortal, SupplyHubAdmin, PurchaseOrdersTab, ReturnSupplierTab, pill Cari Supplier, Tautan Item, Invoice & Bayar, dan portal Supplier. Hapus rute mock supplier dan purchase-request.

**Dependensi baru:** tidak ada. **Gerbang khusus:** acceptance A10; supplier tidak bisa membaca PO supplier lain; supplier yang belum ACTIVE tidak muncul di pencarian; R1 sampai R3 lulus setelah dua penerimaan parsial dan satu retur.

```text
Kamu mengerjakan FASE 6 (Supply Hub) pada repo ladgerline. Tag fase-5 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 6, bagian 9, bagian 13 (Supply Hub), bagian 14 (Supply Hub), dan Fase 6 di bagian 16.
Kerjakan hanya Tugas Fase 6. Jangan menyentuh mesin biaya selain lewat /api/receivings dan retur supplier.
1) Tambahkan model Supply Hub (bagian 5 dan 9). Tulis ulang supplier.routes.ts dan semua rute Supply Hub bagian 13 dengan guard; peran SUPPLIER hanya melihat data miliknya.
2) Tulis mesin status PO, persetujuan di atas batas nominal, dan alur konfirmasi dan pengiriman supplier.
3) Hubungkan penerimaan (parsial dan tanpa PO) dengan PO; alokasikan biaya tambahan dengan sisa terbesar; tulis retur supplier pada biaya penerimaan asal.
4) Tulis invoice, pencocokan tiga arah, pembayaran dengan jurnal utang usaha, dan alert PO1 serta PR1.
5) Klien: sesuaikan SupplierPortal, SupplyHubAdmin, PurchaseOrdersTab, ReturnSupplierTab dan portal Supplier dengan bagian 14. Hapus rute dan data mock supplier.
6) Test wajib: seluruh daftar Test yang wajib bagian 9 ditambah acceptance A10.
Selesai bila gerbang standar hijau. Commit "fase 6: ...", tag fase-6, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 7. POS offline-first.** Tujuan: Kasir tetap menjual saat internet putus dan setiap transaksi masuk buku besar tepat satu kali. Menutup T6.

1. Pendaftaran perangkat di Pengaturan, Perangkat (kode sekali pakai 15 menit, deviceId di IndexedDB) dan cookie ll\_device, sesuai bagian 10 dan 12.
2. Antrean klien di src/lib/offline/: store outbox, catalog, dan meta di IndexedDB lewat idb, penomor struk per perangkat per hari tanpa celah dalam transaksi IndexedDB yang sama, status PENDING, SENT, SYNCED, dan permintaan navigator.storage.persist().
3. Service worker dengan vite-plugin-pwa (precache app shell, tanpa cache /api/\*). Hapus public/sw.js dan src/lib/offlineQueue.ts lama.
4. Server: POST /api/offline/sync-batch (maksimal 20, balasan 202), POST dan GET /api/offline/status, GET /api/offline/rejected, review, dan approve. OfflineTransaction dengan unique (tenantId, clientUuid), prosesor BullMQ offline-sync dengan kunci Redis per deviceId, urut menurut occurredAt, memanggil CheckoutService yang sama dengan penjualan online. Hapus offlineSyncWorker (setInterval).
5. Aturan transaksi tiba (stok tidak cukup, harga berbeda, diskon, hari terkunci, shift tutup, selisih jam, duplikat, perangkat tidak sah) dengan flag dan alert OF1 dan OF2 sesuai tabel bagian 10.
6. Klien: hook useOnlineStatus, lencana Offline, chip Menunggu sinkron, tombol Sinkron sekarang, struk berlabel Menunggu sinkron, dan daftar Transaksi ditolak (bagian 14). Pastikan tidak ada kunci biaya di IndexedDB, cache, dan localStorage.

**Dependensi baru:** vite-plugin-pwa (devDependency), idb (dideklarasikan eksplisit dengan versi dikunci). **Gerbang khusus:** acceptance A11 beserta seluruh test bagian 10 (unit, integrasi, properti, e2e Playwright dengan context.setOffline).

```text
Kamu mengerjakan FASE 7 (POS offline-first) pada repo ladgerline. Tag fase-6 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 6, bagian 10, 12 (PIN dan perangkat), 13 (Offline), 14 (Kasir POS), dan Fase 7 di bagian 16.
Kerjakan hanya Tugas Fase 7. Server tetap satu-satunya yang menilai biaya dan menggerakkan stok. Perangkat tidak pernah menyimpan atau menghitung HPP.
1) Tulis pendaftaran perangkat dan antrean di src/lib/offline (idb, outbox, catalog, meta, penomor struk).
2) Pasang vite-plugin-pwa, hapus public/sw.js dan offlineQueue.ts lama. Respons /api/* tidak masuk cache.
3) Tulis rute offline dan prosesor BullMQ sesuai protokol bagian 10 (202, status per clientUuid, kunci per deviceId, urut occurredAt). Hapus offlineSyncWorker.
4) Tulis aturan saat transaksi tiba beserta flag dan alert OF1 dan OF2.
5) Klien: useOnlineStatus, lencana, chip antrean, tombol Sinkron sekarang, label struk, daftar Transaksi ditolak.
6) Test wajib: seluruh daftar Test yang wajib bagian 10 ditambah acceptance A11.
Selesai bila gerbang standar hijau. Commit "fase 7: ...", tag fase-7, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 8. Migration Center.** Tujuan: Owner berpindah dari POS lama atau Excel tanpa mengetik ulang, dan hari pertama sudah punya saldo awal bernilai benar. Menutup T7.

1. Model sesuai bagian 5 dan 11: MigrationJob dilengkapi (entityScope, fileHash, stage, checksum, approvedBy), MigrationRow, MigrationMapping, MigrationCheck.
2. server/domain/migration/ sebagai fungsi murni: normalizer (angka, satuan, teks, tanggal, numberFormat), validator V1 sampai V11, reconciler M1 sampai M7.
3. Rute /api/migration sesuai bagian 13 dengan guard dan audit: unggah multipart (maksimal 10 MB, 20.000 baris, 5 berkas, periksa magic bytes), pemetaan, validasi, rekonsiliasi, komit dengan Idempotency-Key, persetujuan dan rollback Super Admin, templat xlsx.
4. Eksekusi: tingkat 1 dan 2 dalam satu transaksi basis data (maksimal 5.000 baris), saldo awal lewat PhysicalStockService sebagai pergerakan OPENING dinilai kedua mesin; tingkat 3 lewat prosesor BullMQ migration dalam potongan 500 baris yang bisa dilanjutkan.
5. Rollback dengan pergerakan dan jurnal pembalik; ditolak (ROLLBACK\_BLOCKED) bila ada transaksi turunan.
6. Klien: wizard enam langkah sesuai bagian 14. Preset hanya alias nama kolom; hapus data contoh dan logika di browser.
7. Hapus migration.routes.ts lama, /api/migration/requests, tiket migrasi, dan MigrationTab di Pengaturan.

**Dependensi baru:** exceljs. **Gerbang khusus:** acceptance A12 (fixture M1, 710.000 untuk kedua mesin) dan seluruh test bagian 11 (normalizer, idempotensi, atomik, rollback, otorisasi, berkas).

```text
Kamu mengerjakan FASE 8 (Migration Center) pada repo ladgerline. Tag fase-7 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 6, bagian 11, 13 (Offline dan migrasi), 14 (Pusat Migrasi POS), dan Fase 8 di bagian 16.
Kerjakan hanya Tugas Fase 8. Biaya dari POS lama tidak pernah menjadi HPP LedgerLine.
1) Tambahkan MigrationRow, MigrationMapping, MigrationCheck dan lengkapi MigrationJob.
2) Tulis normalizer, validator V1 sampai V11, dan reconciler M1 sampai M7 sebagai fungsi murni di server/domain/migration. Test unit lebih dulu.
3) Tulis rute /api/migration lengkap dengan batas berkas, persetujuan Super Admin, rollback, dan templat xlsx (exceljs).
4) Tulis eksekusi tingkat 1 dan 2 (satu transaksi, OPENING lewat PhysicalStockService) dan tingkat 3 (prosesor BullMQ, potongan 500 baris).
5) Klien: wizard enam langkah bagian 14; hapus data contoh dan logika di browser.
6) Hapus migration.routes.ts lama dan tiket migrasi.
7) Test wajib: seluruh daftar Test yang wajib bagian 11 ditambah acceptance A12.
Selesai bila gerbang standar hijau. Commit "fase 8: ...", tag fase-8, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 9. Google, ekspor, TOTP, dan analitik.** Tujuan: salinan laporan di Google Sheets, ekspor xlsx, penguatan akun sensitif, dan tren penjualan. Menutup S5.

1. Google Sheets sesuai bagian 12: SheetConnection terenkripsi (AES-256-GCM, SECRETS\_ENC\_KEY), alur kode OAuth dengan scope drive.file, tujuh tab, penulisan idempoten dengan valueInputOption RAW, job BullMQ sheets-sync tiap 15 menit dan saat hari dikunci, alert SH1, status NEEDS\_RECONNECT. Hapus server/lib/gdrive.ts lama dan model GoogleToken.
2. Ekspor xlsx: POST /api/exports dan GET /api/exports/:id (ExportJob) untuk laporan harian, True Cost, penjualan, dan rekonsiliasi memakai exceljs; hapus /finance/export-drive.
3. TOTP dengan otplib sesuai bagian 12: enroll, verify, kode cadangan, penegakan AUT-005 pada aksi yang diminta verifikasi ulang (komit atau rollback migrasi, finalisasi True Cost, ubah kebijakan, tambah atau tangguhkan pengguna, hubungkan atau putus Google, cabut perangkat), tab Keamanan, dan npm run admin:reset-totp.
4. Analitik di Dashboard: tren penjualan dan popularitas menu dengan recharts yang ada, termasuk Riwayat migrasi berlabel dan tidak masuk True Cost.

**Dependensi baru:** otplib. **Gerbang khusus:** acceptance A13 dan A14 beserta test Fase 9 di bagian 12.

```text
Kamu mengerjakan FASE 9 (Google, ekspor, TOTP, analitik) pada repo ladgerline. Tag fase-8 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 5, bagian 12, 13 (Biaya dan laporan), 14 (Pengaturan dan Dashboard), dan Fase 9 di bagian 16.
Kerjakan hanya Tugas Fase 9. Salinan Sheets satu arah: LedgerLine menulis, tidak pernah membaca balik.
1) Tulis SheetConnection terenkripsi, alur OAuth drive.file, penulisan idempoten RAW, dan job sheets-sync. Hapus gdrive.ts lama dan GoogleToken.
2) Tulis ExportJob dan rute /api/exports dengan exceljs.
3) Tulis TOTP (otplib, AES-256-GCM, kode cadangan, anti pengulangan) dan tegakkan AUT-005 pada aksi di bagian 12.
4) Klien: tab Google Sheets, Keamanan, dan analitik Dashboard sesuai bagian 14.
5) Test wajib: seluruh daftar Fase 9 di bagian 12 ditambah acceptance A13 dan A14. Klien Google ditiru dengan mock.
Selesai bila gerbang standar hijau. Commit "fase 9: ...", tag fase-9, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

**Fase 10. Hardening dan rilis.** Tujuan: sistem terbukti bisa dipulihkan, tahan beban sasaran, dan siap diterapkan. Menuntaskan S5.

1. Multi-outlet: POST /api/session/outlet divalidasi terhadap UserOutlet dan pemilih outlet di header (bagian 14).
2. Backup: job pg\_dump harian terenkripsi ke penyimpanan S3, BackupRun, npm run backup:verify, dan runbook pemulihan di docs/RUNBOOK.md (bagian 15).
3. Row-Level Security PostgreSQL sebagai lapis kedua isolasi tenant; anonimisasi pengguna; npm audit bersih dari high dan critical.
4. Observabilitas: /metrics dengan prom-client dan peringatan operator (bagian 15).
5. tests/load/ dengan autocannon dan laporan angka terhadap target bagian 15; skrip pemeriksa ukuran bundel.
6. Dockerfile, alur CI penerapan, dan dokumentasi: README, RUNBOOK, daftar env.
7. Jalankan seluruh acceptance A1 sampai A17 (bagian 17) dan tempel hasilnya. Tag v1.0.0 hanya bila semuanya hijau.

**Dependensi baru:** autocannon (devDependency), prom-client. **Gerbang khusus:** acceptance A15 dan A16 serta A1 sampai A17 seluruhnya.

```text
Kamu mengerjakan FASE 10 (Hardening dan rilis) pada repo ladgerline. Tag fase-9 sudah ada.
Baca dulu: AGENTS.md, docs/PRD.md bagian 1 sampai 5, bagian 15, 17, dan Fase 10 di bagian 16.
Kerjakan hanya Tugas Fase 10. Jangan menambah fitur baru.
1) Tulis pemilih outlet dan POST /api/session/outlet.
2) Tulis job backup, BackupRun, backup:verify, dan docs/RUNBOOK.md.
3) Tambahkan RLS PostgreSQL, anonimisasi pengguna, dan pastikan npm audit bersih.
4) Tambahkan /metrics (prom-client) dan peringatan operator.
5) Tulis load test autocannon dengan laporan angka dan pemeriksa ukuran bundel. Target yang meleset dilaporkan, tidak diubah diam-diam.
6) Tulis Dockerfile, CI penerapan, dan dokumentasi.
7) Jalankan seluruh acceptance A1 sampai A17 dan tempel hasilnya.
Selesai bila gerbang standar dan semua acceptance hijau. Commit "fase 10: ...", tag v1.0.0, dan laporkan.
Ambigu atau bertentangan dengan PRD: berhenti dan tanya.
```

## 17. Kriteria Penerimaan dan Strategi Pengujian

PRD ini dianggap terpenuhi bila tujuh belas kriteria penerimaan di bawah lulus lewat test otomatis, bukan lewat penilaian manual. Angka pada kriteria adalah fixture dari bagian terkait dan hanya dipakai sebagai data uji, bukan data produksi. Tiap kriteria punya cara uji, fase pertama ia wajib hijau, dan bagian PRD yang menjadi sumbernya.

| ID | Kriteria | Cara uji | Fase | Sumber |
| --- | --- | --- | --- | --- |
| A1 | Semua rute di luar daftar publik menjawab 401 tanpa sesi. Akun tidak dikenal tidak mendapat sesi dan menghasilkan tepat satu AccessRequest. Akun suspended ditolak | Penelusur rute dan test auth | 1 | 12, 13 |
| A2 | Pengguna tenant A mendapat RES-001 untuk setiap id milik tenant B pada semua rute yang menerima :id | Test lintas tenant, diulang untuk rute baru di tiap fase | 1 | 5, 13 |
| A3 | Fixture biaya fisik: FIFO Rp350.000, Average Rp375.000, sisa 500 g; setelah penjualan berikutnya total kedua mesin Rp500.000 | Test unit fungsi murni dan test integrasi | 3 | 6 |
| A4 | Setelah rangkaian acak penerimaan, penjualan, waste, opname, dan retur, R1 sampai R3 lulus; kegagalan di tengah transaksi tidak meninggalkan baris; dua penjualan serentak atas item yang sama menghasilkan stok benar | Test properti (PRNG ber-seed), konkurensi, dan atomik | 3 | 6 |
| A5 | Fixture True Cost: HPP Average 9.000 dan FIFO 8.100; alokasi 7.000; True Cost 16.000 dan 15.100; margin 42,86% dan 46,07% (margin HPP saja 67,86% dan 71,07%) | Test unit dan test integrasi | 4 | 7 |
| A6 | Alokasi Rp1.000.000 ke tiga bagian menghasilkan 333.334, 333.333, 333.333; jumlah teralokasi sama dengan kolam; masukan sama menghasilkan keluaran sama; periode FINAL tidak berubah | Test unit dan properti | 4 | 7 |
| A7 | Kasir tidak menerima, menyimpan, atau menampilkan kunci biaya (unitCost, hpp, hppFifo, hppAverage, margin, trueCost, costPrice) di respons API, DOM, IndexedDB, cache, maupun localStorage | Pindai respons semua rute baca Kasir (Fase 1), DOM (e2e Fase 5), IndexedDB (e2e Fase 7) | 1, 5, 7 | 3, 10, 14 |
| A8 | Respons ke Kasir tidak memuat expectedCash sebelum hitungan dikirim; void dan refund yang belum disetujui tidak mengubah stok maupun jurnal; hari terkunci hanya menerima jurnal pembalik | Test integrasi dan e2e | 5 | 8 |
| A9 | Laba bersih harian cocok dengan fixture bagian 8 dan konsistensi bulanan lulus; R4 sampai R8 berfungsi dengan ambang kebijakan | Test integrasi | 5 | 8 |
| A10 | Alur supplier, PO, pengiriman, penerimaan parsial, invoice, dan pembayaran selesai; supplier tidak membaca data supplier lain; supplier yang belum ACTIVE tidak muncul di pencarian; R1 sampai R3 lulus | Test integrasi dan e2e | 6 | 9 |
| A11 | Tiga penjualan dibuat saat jaringan mati, halaman dimuat ulang dan tetap terbuka, lalu antrean menjadi kosong dengan struk SYNCED; batch yang sama dikirim tiga kali menghasilkan satu penjualan; kiriman terbalik urutan diposting menurut occurredAt; perangkat REVOKED menghasilkan REJECTED | Playwright (context.setOffline) dan test integrasi | 7 | 10 |
| A12 | Fixture M1: nilai FIFO dan Average sama-sama Rp710.000 setelah komit; berkas yang sama ditolak dua kali; rollback diblokir setelah satu penjualan memakai item batch; riwayat penjualan tidak menggerakkan stok dan tidak masuk True Cost maupun R7 | Test unit dan integrasi | 8 | 11 |
| A13 | Dua kali sinkron Google Sheets menghasilkan baris yang sama; nilai berawalan = dibaca sebagai teks; tiga kegagalan berturut-turut membuat SH1; invalid\_grant menjadi NEEDS\_RECONNECT; refresh token di basis data terenkripsi | Test integrasi dengan klien Google tiruan | 9 | 12 |
| A14 | Kode TOTP yang sama tidak bisa dipakai dua kali; kode cadangan sekali pakai; aksi yang meminta verifikasi ulang ditolak dengan AUT-005 tanpa kode baru | Test integrasi | 9 | 12 |
| A15 | npm run backup:verify memulihkan dump terbaru ke basis data kosong, jumlah baris tabel utama sama, dan R1 sampai R3 lulus | Skrip dan test | 10 | 15 |
| A16 | Target kinerja bagian 15 tercapai, atau meleset dan tercatat sebagai temuan dengan angka ukur | Skrip load test | 10 | 15 |
| A17 | Skenario MVP: masuk, buka shift, jual tiga menu, tutup shift dengan hitung buta, void lewat Approval, tutup hari, lalu laporan harian dan True Cost sama dengan angka yang dihitung ulang oleh test | Playwright | 5 | 7, 8, 14 |

**Daftar periksa MVP (sesudah tag fase-5).** A1 sampai A9 dan A17 hijau; gerbang standar hijau; tidak ada rute mock di build produksi; .env produksi lolos validasi. Satu outlet pilot boleh memakai sistem dengan batasan yang diketahui: belum bisa offline (Fase 7) dan belum punya Migration Center (Fase 8), sehingga menu, bahan baku, dan resep dimasukkan manual dan saldo awal dimasukkan lewat Penerimaan dengan biaya satuan eksplisit. Saldo awal tanpa nota bertanda ESTIMATED (aturan 14).

**Strategi pengujian.**

- **Lapisan.** Sebagian besar test adalah unit atas fungsi murni di server/domain (tanpa basis data). Test integrasi memakai Fastify inject dan supertest dengan PostgreSQL asli dari docker-compose; tiap berkas test memakai tenant sendiri dan membersihkan datanya. Test properti memakai PRNG ber-seed yang mencetak seed saat gagal. Test komponen memakai Vitest dan Testing Library. e2e memakai Playwright pada build produksi dengan PostgreSQL dan Redis dari compose.
- **Tiruan hanya di batas luar.** firebase-admin (verifier disuntikkan), Google Sheets, Brevo, Telegram, dan S3 ditiru. Tidak ada panggilan jaringan keluar dari test. Basis data dan Redis tidak pernah ditiru di test integrasi.
- **Waktu dan acak terkendali.** Jam disuntikkan (clock) sehingga test hari bisnis, batas laju, dan kedaluwarsa sesi deterministik; kode domain tidak memanggil Date.now() atau Math.random() langsung.
- **Fixture.** Angka dari PRD (A3, A5, A6, M1) disimpan sebagai TypeScript di server/tests/fixtures/, terpisah dari seed.ts. Seed tidak pernah berjalan di produksi.
- **Test kontrak.** Penelusur rute (bagian 13) dan pemindai kunci biaya (A7) berjalan di setiap fase dan menggagalkan build bila rute atau kunci baru lolos.
- **Cakupan.** server/domain/\*\* minimal 90% cabang (node --test --experimental-test-coverage). Tidak ada ambang global yang bisa dipenuhi dengan test kosong.
- **Test tidak stabil adalah bug.** Test yang lulus pada percobaan kedua dilaporkan dan diperbaiki akar masalahnya; retry otomatis tidak dipakai kecuali di e2e dengan satu ulangan yang dicatat.
- **Definisi selesai tiap fase.** Gerbang standar, gerbang khusus fase, acceptance fase itu, dan ringkasan keluaran perintah gerbang ditempel agen di laporan akhir. Fase tanpa laporan itu dianggap belum selesai.

## 18. Di Luar Cakupan, Asumsi, Perubahan dari Versi 1, dan Pertanyaan Terbuka

Bagian ini menutup PRD: apa yang sengaja tidak dikerjakan, apa yang diasumsikan, apa yang berubah dari versi 1 (tab Arsip PRD v1), dan apa yang masih menunggu keputusan pemilik. Setiap pertanyaan terbuka punya usulan bawaan yang dipakai agen kode sampai dijawab, sehingga pembangunan tidak berhenti.

**Di luar cakupan v1.** Repo sudah memuat jejak beberapa hal di bawah. Jejak itu tidak dihapus sekarang; ia disembunyikan di balik flag FROZEN\_MODULES (bagian 14).

| Hal | Jejak di repo | Perlakuan di v1 |
| --- | --- | --- |
| Pembayaran digital (gateway Midtrans, QRIS dinamis, EDC) | Integrasi Midtrans di sekitar sepuluh berkas | Dibekukan. Metode bayar hanya label yang dicatat (bagian 10); LedgerLine tidak memproses uang pelanggan |
| QR Menu dan pemesanan dari meja (Barcode Meja QR, VisitorMenu, model QrMenu) | Ada | Dikeluarkan dari PRD atas permintaan pemilik; disembunyikan |
| Fitur dan positioning AI (AI-Assisted, Market Intelligence, Demand Intelligence, Business Auditor) | Ada | Dikeluarkan atas permintaan pemilik; lencana AI dihapus (bagian 14); GEMINI\_API\_KEY dan @google/genai dihapus (Fase 0) |
| KDS (layar dapur) | pages/KDS.tsx dan kitchen.routes.ts | Dibekukan; rute kitchen dikunci guard (Fase 1) |
| Kontribusi Channel (ojol, marketplace) | ChannelContributionView | Dibekukan |
| Langganan bertingkat (TIER\_1 sampai TIER\_3, Langganan & Lisensi) | Ada | Dibekukan; tidak ada pembatasan fitur menurut paket, dan pemilihan mesin biaya tidak lagi bergantung paket (bagian 6) |
| Loyalti dan voucher | Sebagian | Tidak dibangun |
| Printer termal dan WiFi printer | PrinterTab, PrinterSetupModal | Dibekukan; cetak struk lewat dialog cetak peramban (CheckoutResultPanel) tetap |
| Neraca dan Arus Kas | Tab ada tanpa rute server | Disembunyikan sampai ada spesifikasi akuntansinya |
| Penggajian penuh, pelaporan pajak ke otoritas, penyusutan aset, bunga | Sebagian | Tidak dibangun; upah dicatat sebagai biaya tenaga kerja (bagian 7) |
| Pengiriman WhatsApp | server/notification.ts | Dihapus di Fase 0; notifikasi lewat Brevo dan Telegram (bagian 8) |
| Aplikasi native iOS dan Android | Tidak ada | Tidak dibangun; PWA saja (bagian 10) |
| Transfer stok antar outlet | Tidak ada | Tidak dibangun; multi-outlet hanya pemilih outlet (Fase 10) |
| Integrasi akuntansi eksternal (Accurate, Jurnal, dan sejenisnya) | Tidak ada | Tidak dibangun; salinan Google Sheets dan ekspor xlsx (bagian 12) |
| Banyak mata uang dan bahasa selain Indonesia | Tidak ada | Tidak dibangun; IDR dan Bahasa Indonesia |

**Aturan modul beku.** Kode modul beku tetap di repo, tidak diuji, dan tidak didukung. Bila dinyalakan dengan FROZEN\_MODULES, ia wajib memakai guard dan serializer yang sama, tidak boleh menampilkan data tiruan di produksi, dan tidak boleh menulis ke ledger, stok, atau jurnal tanpa melewati PhysicalStockService dan CheckoutService. Penghapusan kode beku atau penyerahannya ke PRD berikutnya adalah keputusan terpisah (pertanyaan terbuka 8).

**Asumsi.**

1. Permintaan terakhir pemilik adalah mempertahankan desain dan tampilan repo yang ada (bagian 14) dan menyelesaikan seluruh PRD. Karena itu PRD ini memakai repo aslamrdhn/ladgerline sebagai dasar dan memperkuatnya bertahap, bukan menulis ulang dari awal. Bila yang dimaksud adalah desain baru, bagian 14 dan Fase 1 serta 2 harus ditulis ulang; bagian lain tidak terpengaruh.
2. Pengguna sasaran adalah coffee shop atau kafe yang memakai resep. Menu tanpa resep ditampilkan dengan HPP Belum tersedia, bukan nol.
3. MVP dijalankan di satu outlet pilot. Multi-outlet pada v1.0 hanya berupa pemilih outlet.
4. Bahasa Indonesia, mata uang IDR (Decimal(18,0)), dan zona waktu bawaan Asia/Jakarta per outlet.
5. Mesin utama bawaan per outlet adalah Average (bagian 5) dan basis alokasi bawaan adalah UNITS (bagian 7); keduanya bisa diubah per outlet.
6. Angka ambang kebijakan di bagian 8 adalah usulan awal yang dapat diubah Super Admin per outlet.
7. Redis tersedia di produksi untuk batas laju, kunci perangkat, dan antrean. Tanpa Redis server menolak boot, kecuali pada test.
8. Pemilik menyediakan proyek Firebase, klien OAuth Google, akun Brevo, dan bot Telegram. PRD tidak membuat atau menyimpan kredensial apa pun.
9. Preset POS lama (Moka, Majoo, Pawoon, Kasir Pintar) belum diverifikasi terhadap berkas ekspor asli (bagian 11); sebelum itu pemetaan manual dan templat LedgerLine yang dipakai.
10. Retensi data 10 tahun adalah asumsi kewajiban pembukuan dan perlu dikonfirmasi akuntan (bagian 15).
11. Angka fixture di PRD (A3, A5, A6, M1) adalah contoh uji, bukan data produksi dan bukan benchmark bisnis.
12. Hasil gerbang (typecheck, test, build) belum pernah dijalankan penuh pada repo karena client Prisma tidak bisa dibuat saat audit (bagian 4); kondisi awal sebenarnya dicatat agen di Fase 0.

**Perubahan dari PRD versi 1.**

| Hal | Versi 1 | Versi 2 | Alasan |
| --- | --- | --- | --- |
| Identitas | Aplikasi POS dengan fokus anti-kebocoran | Coffee Business OS berbasis True Cost; anti-kebocoran menjadi lapisan kontrol (bagian 8) | Evaluasi pemilik: rantai dari pasokan sampai keputusan |
| Slogan | Berfokus pada kebocoran laba | From Supply to Sale. From Cost to True Cost. | Evaluasi pemilik |
| Stack | Next.js, Auth.js, pg-boss | Fastify, React dan Vite, Firebase Auth, BullMQ | Mengikuti repo yang sudah ada |
| Dasar pembangunan | Proyek baru | Repo ladgerline dipertahankan dan diperkuat (bagian 4) | Permintaan pemilik |
| Biaya | HPP | True Cost = bahan + kemasan + tenaga kerja + alokasi biaya operasional, untuk FIFO dan Average sekaligus | Evaluasi pemilik |
| Nomor struk | Per outlet per hari | Per perangkat per hari tanpa celah | Dibutuhkan agar offline tidak bentrok |
| Offline dan migrasi | Tidak ada | POS offline-first (bagian 10) dan Migration Center (bagian 11) | Evaluasi pemilik |
| Supply Hub | Tidak ada | Lapisan penemuan supplier yang mengisi mesin biaya (bagian 9) | Evaluasi pemilik |
| Akses | Akun biasa | Login Google dengan whitelist, sesi buram, PIN di perangkat terdaftar, TOTP (bagian 12) | Temuan keamanan K1 sampai K5 |
| Uang | Tidak dikunci | Decimal(18,0), kuantitas dan biaya satuan Decimal(18,4), JSON sebagai string | Temuan T2 |
| QR Menu dan AI | Termasuk dalam ringkasan | Dikeluarkan | Permintaan pemilik |

**Pertanyaan terbuka.** Kolom Bawaan adalah yang dipakai agen kode sampai pemilik menjawab; kolom Sebelum fase menyatakan kapan jawabannya dibutuhkan.

| No | Pertanyaan | Bawaan sampai dijawab | Sebelum fase |
| --- | --- | --- | --- |
| 1 | Di mana aplikasi dihosting (VPS, PaaS, awan) dan apakah Redis dan PostgreSQL dikelola penyedia? | Docker di VPS dengan PostgreSQL dan Redis sendiri; pemulihan ke titik waktu tidak dijanjikan | 10 |
| 2 | Perlukah ganti Kasir saat internet putus? | Tidak didukung; Kasir yang sudah masuk melanjutkan (bagian 10 dan 12) | 7 |
| 3 | Bolehkah Owner berjualan di POS? | Tidak; Owner memakai akun Kasir bila perlu (bagian 14) | 1 |
| 4 | Apakah Manager dan Barista disimpan sebagai peran sungguhan di UserProfile? | Ya (bagian 3) | 1 |
| 5 | Metode pembayaran apa saja yang dicatat? | Tunai, QRIS, Transfer, Kartu (bagian 10) | 2 |
| 6 | Perlukah tip dan biaya layanan dicatat? | Tidak dibangun | 5 |
| 7 | Apakah mesin utama bawaan Average atau FIFO? | Average (bagian 5) | 3 |
| 8 | Modul beku disembunyikan atau kodenya dihapus sekarang? | Disembunyikan lewat FROZEN\_MODULES (bagian 14) | 0 |
| 9 | Apakah prisma/dev.db dan firebase-applet-config.json dihapus dari riwayat git (butuh force-push dan pemutaran kunci)? | Hanya dikeluarkan dari pelacakan; riwayat tidak ditulis ulang | 0 |
| 10 | Basis alokasi bawaan UNITS atau MINUTES? | UNITS (bagian 7) | 4 |
| 11 | Apakah paket langganan akan menjadi model bisnis? | Dibekukan; tidak ada pembatasan fitur | 10 |
| 12 | Apakah ambang kebijakan di bagian 8 (R5, R6, VR1, OP1, PO1, PR1, DS1) sudah sesuai kebiasaan outlet? | Seperti tertulis di bagian 8 | 5 |
| 13 | Dapatkah pemilik menyediakan berkas ekspor asli Moka, Majoo, Pawoon, dan Kasir Pintar? | Pemetaan manual dan templat LedgerLine | 8 |
| 14 | Berapa masa retensi pembukuan yang benar menurut akuntan pemilik? | 10 tahun | 10 |
| 15 | Siapa Super Admin dan dokumen apa yang dipakai memverifikasi supplier dan tenant? | Pemilik menunjuk Super Admin pertama; dokumen ditentukan pemilik | 1 dan 6 |
| 16 | Siapa yang membuat proyek Firebase, klien OAuth Google, akun Brevo, dan bot Telegram, dan kapan? | Pemilik, sebelum Fase 1 (Firebase) dan Fase 5 (Brevo, Telegram) | 1, 5, 9 |

**Mengubah PRD ini.** Perubahan menyebut bagian yang terdampak, memperbarui kriteria penerimaan di bagian 17 bila angka atau perilaku berubah, dan dicatat sebagai versi baru. Versi 1 tetap di tab Arsip PRD v1. Agen kode tidak boleh mengubah PRD; ia berhenti dan bertanya (aturan 23).
