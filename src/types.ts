/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  category:
    "Coffee" | "Non-Coffee" | "Heavy Meals" | "Snacks" | "Desserts" | "Beans";
  price: number;
  costPrice?: number; // Opsional: Dihilangkan total dari payload/store kasir (Rule 15 Zero-Cost Visibility)
  stock: number; // Stok barang jadi
  warningLimit: number; // Limit warning stok barang jadi
  barcode: string; // Hubungan barcode meja / produk
  supplierId?: string; // ID supplier berelasi
  supplierName: string;
  supplierContact: string;
  imageUrl?: string;
  komposisi?: string;
  promoActive?: boolean; // Label neon promo aktif
  promoDiscountPercent?: number; // Nilai persentase potongan harga
}

export interface RawMaterial {
  id: string;
  name: string;
  stockQuantity: number;
  stockUnit: "g" | "ml" | "pcs" | "Kg";
  warningLimit: number;
  supplierId?: string; // ID supplier berelasi
  supplierName: string;
  supplierContact: string;
  unitCost: number; // Cost per unit (e.g. Rupiah per gram or per mL)
  isTaxable?: boolean; // Pilihan apakah terkena pajak (PPN/Pajak Pembelian)
  taxRate?: number; // Persentase pajak (misalkan 11 untuk PPN 11%)
}

export interface RecipeItem {
  materialId: string;
  amount: number; // jumlah bahan yang diderivasi secara otomatis per porsi
}

export interface Recipe {
  productId: string;
  ingredients: RecipeItem[];
  notes?: string; // Catatan pribadi takaran, brewing method, atau instruksi racikan
}

export interface OrderItem {
  productId: string;
  quantity: number;
  notes?: string;
  priceAtSale: number; // harga saat transaksi berlangsung
  costAtSale?: number; // Opsional: Dilarang untuk kasir (dihitung murni di server)
  variant?: "HOT" | "COOL";
}

export interface Order {
  id: string;
  orderTime: string; // ISO string
  tableNumber: string; // Meja pengunjung
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalPrice: number;
  paymentMethod: "QRIS" | "Tunai" | "Debit" | "Midtrans" | "Split";
  paymentStatus: "Pending" | "Success";
  receiptPrinted: boolean;
  notes?: string;
  secureHash?: string;
  totalCost?: number; // Total Cost of Goods Sold (modal racikan resep)
}

export interface CoffeeTable {
  id: string;
  name: string; // Misal: "Meja 01", "Meja 02"
  status: "Empty" | "Ordering" | "Occupied";
  qrCodeUrl: string; // URL spesifik pemesanan barcode meja
  publicToken?: string;
  qrImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: "income" | "expense";
}

export interface FinanceLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  type: "income" | "expense";
  category: string; // Misal: "Penjualan Kopi", "Beli Susu", "Gaji Karyawan", "Sewa Ruko"
  amount: number;
  description: string;
  isEncrypted: boolean; // Menunjukkan kepatuhan enkripsi tingkat tinggi
  secureHash: string; // Hash audit keamanan
}

export interface BackupHistory {
  id: string;
  timestamp: string;
  fileSize: number;
  recordCount: number;
  status: "Success" | "Failed";
  checksum: string;
}

export interface PrinterDevice {
  name: string;
  type: "Bluetooth" | "WiFi";
  address: string;
  status: "Disconnected" | "Connecting" | "Connected";
}

export interface AppConfig {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeWifiName: string;
  storeWifiPass: string;
  subscriptionPricePerMonth: number;
  subscriptionTier?: string; // TIER_1, TIER_2, TIER_3
  ledgerTokenBalance?: number;
  licenseKey: string;
  theme?:
    | "slate"
    | "espresso"
    | "midnight"
    | "matcha"
    | "royal"
    | "crimson"
    | "ocean"
    | "forest"
    | "custom";
  customThemeType?: string;
  customThemeAppBg?: string;
  customThemeAsideBg?: string;
  customThemeBorder?: string;
  customThemeActiveTab?: string;
  customThemeInactiveTab?: string;
  customThemeHeaderBg?: string;
  customThemeHeaderText?: string;
  customThemeAccentText?: string;
  customThemeAccentBtn?: string;
  layoutMode?: "grid" | "list";
  cashierName?: string;
  cashierRole?: string;
  cashierShift?: string;
  cashierPhone?: string;
  cashierPin?: string;
  cashierAvatar?: string;
  receiptHeaderGreeting?: string;
  receiptFooterMessage?: string;
  receiptShowWifiOnStruk?: boolean;
  cashierEmail?: string;
  driveConnected?: boolean;
  driveStoreFolder?: string;
  driveClientId?: string;
  driveClientSecret?: string;
  driveAutoSync?: boolean;
  // Security Upgrade Parameters
  ownerPasswordHash?: string;
  ownerEmail?: string;
  activeOperatorRole?: "Owner" | "Supervisor" | "Kasir";
  clientEncryptionPasskey?: string;
  clientEncryptionEnabled?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string; // ISO string for brute-force lock-outs
  // Customizable Tax & Receipt Settings
  taxType?: "PPN" | "PB1" | "Kustom" | "NON";
  taxRateCustom?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  initialCapital?: number;
  cashRegisterFund?: number;
  qrisMerchantName?: string;
  qrisProvider?: string;
  qrisBankName?: string;
  qrisImage?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
  details: string;
  severity: "info" | "warning" | "security";
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================
// LEDGER-FIRST CORE TYPES (PRD FOUNDATION)
// ============================================================

export type InventoryMovementType =
  | "RECEIVING"
  | "POS_SALE"
  | "OPNAME_ADJUSTMENT"
  | "WASTE"
  | "TRANSFER"
  | "RETURN_SUPPLIER"
  | "MIGRATION_BASELINE";

export interface InventoryLedgerEvent {
  id: string;
  sequenceNumber: number;
  businessDate: string;
  timestamp: string;
  itemId: string;
  itemName: string;
  movementType: InventoryMovementType;
  referenceType: "PO" | "INVOICE" | "OPNAME" | "WASTE_TICKET" | "MIGRATION" | "CLOSING";
  referenceId: string;
  qtyChange: number; // + for inflow, - for outflow
  unitCost: number; // Average cost snapshot at the time of event
  totalCostImpact: number; // qtyChange * unitCost
  balanceAfter: number; // Stock balance after event
  unit: string;
  operatorRole: "Kasir" | "Barista" | "Manager" | "Owner";
  operatorName: string;
  notes?: string;
  isImmutable: boolean;
  channel?: "Dine-In" | "Takeaway" | "GoFood" | "GrabFood" | "ShopeeFood";
}

export interface TheoreticalVarianceRecord {
  materialId: string;
  materialName: string;
  unit: string;
  beginningStock: number;
  receivedQty: number;
  theoreticalUsage: number; // Calculated: Sum of (POS Sales × Recipe BOM)
  expectedEndingStock: number; // beginningStock + receivedQty - theoreticalUsage
  actualPhysicalCount: number; // From Stock Opname
  varianceQty: number; // actualPhysicalCount - expectedEndingStock (negative = loss/leak)
  unitCost: number; // Current Average Cost
  varianceRupiah: number; // varianceQty * unitCost (unexplained waste dirupiahkan)
  severity: "NORMAL" | "WARNING" | "CRITICAL";
  rootCauseDiagnostic: string;
  lastOpnameDate: string;
}

export type SalesChannel = "Dine-In" | "Takeaway" | "GoFood" | "GrabFood" | "ShopeeFood";

export interface ChannelContributionMetric {
  channel: SalesChannel;
  orderCount: number;
  grossRevenue: number;
  platformFeeRate: number; // e.g. 0.0 for Dine-in, 0.20 for GoFood/GrabFood
  platformFeeAmount: number;
  packagingCostPerOrder: number; // e.g. 0 for Dine-in, 1200 for Takeaway, 2000 for Ojol
  totalPackagingCost: number;
  cogsAmount: number; // Recipe BOM raw material HPP
  contributionProfit: number; // grossRevenue - platformFeeAmount - totalPackagingCost - cogsAmount
  contributionMarginPercent: number; // (contributionProfit / grossRevenue) * 100
  avgTicketSize: number;
}

export interface DeterministicClosingRecord {
  id: string;
  closingDate: string;
  closedAt: string;
  closedBy: string;
  closedByRole: string;
  drawerCashExpected: number;
  drawerCashCounted: number;
  cashDiscrepancy: number; // counted - expected
  qrisTotal: number;
  debitTotal: number;
  ojolTotal: number;
  totalRevenue: number;
  totalHpp: number;
  grossProfit: number;
  totalPackagingCost: number;
  totalPlatformFees: number;
  contributionProfit: number;
  unexplainedVarianceRupiah: number;
  netTrueProfit: number;
  status: "CONFIRMED_SEALED";
  auditHash: string;
  googleDriveArchived: boolean;
  notes?: string;
}

export interface AuthorityRule {
  role: "Kasir" | "Barista" | "Manager" | "Owner";
  title: string;
  maxPoApprovalAmount: number; // in IDR
  canVoidTransactions: boolean;
  canConfirmStockOpname: boolean;
  canExecuteClosing: boolean;
  canViewProfitTruth: boolean;
  canManageMasterData: boolean;
  description: string;
}
