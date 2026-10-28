# LedgerLine by Aslam — Domain & Calculation Standards

## 1. Accounting & Double-Entry Ledger Invariant
- Setiap transaksi finansial menghasilkan jurnal dengan prinsip: `Total Debit == Total Credit`.
- Formula struk harus menghasilkan pembukuan yang seimbang pada ke-4 mode pajak:
  1. Pajak Eksklusif + SC masuk dasar pengenaan pajak (DPP)
  2. Pajak Eksklusif + SC tidak masuk DPP
  3. Pajak Inklusif + SC masuk DPP
  4. Pajak Inklusif + SC tidak masuk DPP
- Saldo memo akun sekunder (Average) tidak boleh bertentangan dengan stok fisik: `COMMON + memo == Total Valuasi Average`.

## 2. Absorption Costing & Capacity-Based Idle Cost
Formula alokasi biaya kapasitas:
```text
capacityRatio(k)    = min(1, Σ_p (volume(p) * weight(p, k)) / Capacity(k))
Alokasi(p, k)       = Pool(k) * capacityRatio(k) * (volume(p) * weight(p, k)) / Σ_p (volume(p) * weight(p, k))
IdleCost(k)         = Pool(k) * (1 - capacityRatio(k))
```
- Total Alokasi + IdleCost wajib sama dengan Pool(k) menggunakan *largest remainder method*.
- Reklasifikasi biaya operasional: Biaya IdleCost tidak boleh dikurangkan ganda pada Laba Bersih.

## 3. Manager Override PIN Security
- Dilarang menyimpan plaintext hash PIN kasir/manajer di klien offline tanpa pembatasan terverifikasi.
- Override di kasir offline wajib mengandalkan approval kriptografis (misal: OTP bertanda waktu atau verifikasi online terikat sesi outlet).

## 4. Sync Antrean POS Offline
- Penjualan offline menggunakan `RecipeVersionSnapshot` yang terkunci saat pesanan dibuat.
- Nomor struk per perangkat dengan sistem *Receipt Gap Recovery*.
- Rekonsiliasi stok opname vs penjualan offline mengikuti aturan BIZ-010 per-item tanpa memblokir antrean transaksi lain.
