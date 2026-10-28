import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import {
  Product,
  RawMaterial,
  Order,
  FinanceLog,
  AppConfig,
  Recipe,
  CoffeeTable,
  InventoryLedgerEvent,
  DeterministicClosingRecord,
} from "../types";

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface DataStoreState {
  // Core Data
  products: Product[];
  rawMaterials: RawMaterial[];
  orders: Order[];
  financeLogs: FinanceLog[];
  appConfig: AppConfig | null;
  recipes: Recipe[];
  tables: CoffeeTable[];
  isSandbox: boolean;
  ledgerEvents: InventoryLedgerEvent[];
  closings: DeterministicClosingRecord[];
  activeRole: "Kasir" | "Barista" | "Manager" | "Owner";

  // Setters
  setProducts: (products: Product[]) => void;
  setRawMaterials: (materials: RawMaterial[]) => void;
  setOrders: (orders: Order[]) => void;
  setFinanceLogs: (logs: FinanceLog[]) => void;
  setAppConfig: (config: AppConfig) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setTables: (tables: CoffeeTable[]) => void;
  setIsSandbox: (status: boolean) => void;
  setLedgerEvents: (events: InventoryLedgerEvent[]) => void;
  setClosings: (closings: DeterministicClosingRecord[]) => void;
  setActiveRole: (role: "Kasir" | "Barista" | "Manager" | "Owner") => void;

  // Actions
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addRawMaterial: (material: RawMaterial) => void;
  updateRawMaterial: (material: RawMaterial) => void;
  deleteRawMaterial: (materialId: string) => void;
  receivePurchaseOrder: (po: {
    poNumber: string;
    materialId: string;
    quantity: number;
    unitCost: number;
    supplierName: string;
    notes?: string;
  }) => void;
  addOrder: (order: Order) => void;
  updateProductStock: (productId: string, quantityToDeduct: number) => void;
  addFinanceLog: (log: FinanceLog) => void;
  addLedgerEvent: (event: Omit<InventoryLedgerEvent, "id" | "sequenceNumber" | "timestamp">) => void;
  executeDeterministicClosing: (closing: DeterministicClosingRecord) => void;
  syncOfflineOrders: () => Promise<void>;
  resetToStandardCoffeeRoasterySeed: () => void;
}

const defaultProducts: Product[] = [
  {
    id: "prod-1",
    name: "Espresso Single Origin Gayo",
    category: "Coffee",
    price: 22000,
    costPrice: 5040,
    stock: 85,
    warningLimit: 15,
    barcode: "8991001",
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    imageUrl: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80",
    komposisi: "18g Arabica Gayo Special Roast, Yield 36g, 9 Bar",
  },
  {
    id: "prod-2",
    name: "Cappuccino Classic",
    category: "Coffee",
    price: 28000,
    costPrice: 9000,
    stock: 64,
    warningLimit: 15,
    barcode: "8991002",
    supplierName: "PT Susu Murni",
    supplierContact: "0812-3333-4444",
    imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80",
    komposisi: "Double Espresso Gayo + 180ml Silky Microfoam Fresh Milk",
  },
  {
    id: "prod-3",
    name: "Caramel Macchiato",
    category: "Coffee",
    price: 34000,
    costPrice: 12600,
    stock: 42,
    warningLimit: 10,
    barcode: "8991003",
    supplierName: "Syrup Hub",
    supplierContact: "0812-5555-6666",
    imageUrl: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
    komposisi: "Espresso + Fresh Milk + 20ml Monin Caramel Artisan Drizzle",
  },
  {
    id: "prod-4",
    name: "Cold Brew Signature Gayo",
    category: "Coffee",
    price: 30000,
    costPrice: 8800,
    stock: 50,
    warningLimit: 10,
    barcode: "8991004",
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
    komposisi: "Steeped 16 jam suhu rendah + Sentuhan Gula Aren Organik",
  },
  {
    id: "prod-5",
    name: "Matcha Latte Supreme",
    category: "Non-Coffee",
    price: 32000,
    costPrice: 11150,
    stock: 38,
    warningLimit: 8,
    barcode: "8991005",
    supplierName: "Matcha Hub",
    supplierContact: "0812-7777-8888",
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80",
    komposisi: "15g Ceremonial Uji Matcha Whisked + Steamed Fresh Milk",
  },
  {
    id: "prod-6",
    name: "Artisan Butter Croissant",
    category: "Snacks",
    price: 25000,
    costPrice: 11500,
    stock: 24,
    warningLimit: 5,
    barcode: "8991006",
    supplierName: "Bakery Artisan",
    supplierContact: "0812-9999-0000",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    komposisi: "French Butter Flaky Layers, baked fresh daily",
  },
  {
    id: "prod-7",
    name: "Americano Ice Bold",
    category: "Coffee",
    price: 24000,
    costPrice: 5040,
    stock: 70,
    warningLimit: 15,
    barcode: "8991007",
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    imageUrl: "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=600&q=80",
    komposisi: "Double shot espresso over purified crystal ice and water",
  },
  {
    id: "prod-8",
    name: "Truffle French Fries",
    category: "Snacks",
    price: 28000,
    costPrice: 11000,
    stock: 35,
    warningLimit: 8,
    barcode: "8991008",
    supplierName: "Food Supply Utama",
    supplierContact: "0812-7777-1111",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    komposisi: "Shoestring fries, white truffle oil, parmesan, parsley",
  },
  {
    id: "prod-9",
    name: "Smash Wagyu Cheeseburger",
    category: "Heavy Meals",
    price: 48000,
    costPrice: 22000,
    stock: 20,
    warningLimit: 5,
    barcode: "8991009",
    supplierName: "Meat Masters ID",
    supplierContact: "0812-4444-5555",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    komposisi: "120g Wagyu beef patty, cheddar, brioche bun, secret burger sauce",
  },
  {
    id: "prod-10",
    name: "Gayo Whole Beans 250g",
    category: "Beans",
    price: 85000,
    costPrice: 42000,
    stock: 15,
    warningLimit: 4,
    barcode: "8991010",
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
    imageUrl: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80",
    komposisi: "Single origin Arabica Gayo, medium roast with valve bag",
  },
];

const defaultRawMaterials: RawMaterial[] = [
  {
    id: "rm-1",
    name: "Arabica Gayo Special Roast (Biji Kopi)",
    stockQuantity: 4720,
    stockUnit: "g",
    warningLimit: 1000,
    unitCost: 280, // Rp 280/gram (Rp 280.000 / kg)
    supplierName: "Koperasi Tani Gayo",
    supplierContact: "0812-1111-2222",
  },
  {
    id: "rm-2",
    name: "Fresh Milk Full Cream Greenfields",
    stockQuantity: 13800,
    stockUnit: "ml",
    warningLimit: 3000,
    unitCost: 22, // Rp 22/ml (Rp 22.000 / Liter)
    supplierName: "PT Susu Segar Nusantara",
    supplierContact: "0812-3333-4444",
  },
  {
    id: "rm-3",
    name: "Caramel Artisan Syrup Monin",
    stockQuantity: 2150,
    stockUnit: "ml",
    warningLimit: 500,
    unitCost: 180, // Rp 180/ml
    supplierName: "Flavor House Indonesia",
    supplierContact: "0812-5555-6666",
  },
  {
    id: "rm-4",
    name: "Matcha Ceremonial Uji Grade",
    stockQuantity: 1180,
    stockUnit: "g",
    warningLimit: 300,
    unitCost: 450, // Rp 450/g
    supplierName: "Kyoto Imports Direct",
    supplierContact: "0812-7777-8888",
  },
  {
    id: "rm-5",
    name: "Gula Aren Organik Cair",
    stockQuantity: 3100,
    stockUnit: "ml",
    warningLimit: 800,
    unitCost: 40, // Rp 40/ml
    supplierName: "Palm Sugar Organic",
    supplierContact: "0812-8888-9999",
  },
  {
    id: "rm-6",
    name: "Paper Cup 12oz + Hot Lid + Sleeve",
    stockQuantity: 410,
    stockUnit: "pcs",
    warningLimit: 100,
    unitCost: 1200, // Rp 1.200/pcs
    supplierName: "EcoPack Packaging",
    supplierContact: "0812-2222-3333",
  },
  {
    id: "rm-7",
    name: "Kraft Paper Bag + Food Seal Tape (Ojol)",
    stockQuantity: 285,
    stockUnit: "pcs",
    warningLimit: 80,
    unitCost: 800, // Rp 800/pcs
    supplierName: "EcoPack Packaging",
    supplierContact: "0812-2222-3333",
  },
];

const defaultRecipes: Recipe[] = [
  {
    productId: "prod-1", // Espresso Single Origin
    ingredients: [{ materialId: "rm-1", amount: 18 }],
    notes: "Dose 18.0g, Yield 36.0g, Extraction 27s",
  },
  {
    productId: "prod-2", // Cappuccino Classic
    ingredients: [
      { materialId: "rm-1", amount: 18 },
      { materialId: "rm-2", amount: 180 },
    ],
    notes: "Double espresso + 180ml silky steamed milk",
  },
  {
    productId: "prod-3", // Caramel Macchiato
    ingredients: [
      { materialId: "rm-1", amount: 18 },
      { materialId: "rm-2", amount: 160 },
      { materialId: "rm-3", amount: 20 },
    ],
    notes: "Double espresso + steamed milk + 20ml caramel syrup drizzle",
  },
  {
    productId: "prod-4", // Cold Brew Signature
    ingredients: [
      { materialId: "rm-1", amount: 30 },
      { materialId: "rm-5", amount: 10 },
    ],
    notes: "Steep 16h, served cold with 10ml gula aren organik",
  },
  {
    productId: "prod-5", // Matcha Latte
    ingredients: [
      { materialId: "rm-4", amount: 15 },
      { materialId: "rm-2", amount: 200 },
    ],
    notes: "Whisked 15g Uji matcha with 200ml microfoam milk",
  },
];

const defaultLedgerEvents: InventoryLedgerEvent[] = [
  {
    id: "evt-001",
    sequenceNumber: 1001,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T07:15:00Z",
    itemId: "rm-1",
    itemName: "Arabica Gayo Special Roast (Biji Kopi)",
    movementType: "RECEIVING",
    referenceType: "PO",
    referenceId: "PO-2026-101",
    qtyChange: 5000,
    unitCost: 280,
    totalCostImpact: 1400000,
    balanceAfter: 5000,
    unit: "g",
    operatorRole: "Barista",
    operatorName: "Eko Pratama",
    notes: "Penerimaan PO #101 roastery supplier lolos QC cupping",
    isImmutable: true,
  },
  {
    id: "evt-002",
    sequenceNumber: 1002,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T07:25:00Z",
    itemId: "rm-2",
    itemName: "Fresh Milk Full Cream Greenfields",
    movementType: "RECEIVING",
    referenceType: "PO",
    referenceId: "PO-2026-102",
    qtyChange: 15000,
    unitCost: 22,
    totalCostImpact: 330000,
    balanceAfter: 15000,
    unit: "ml",
    operatorRole: "Barista",
    operatorName: "Eko Pratama",
    notes: "Batch dingin delivery suhu 4°C",
    isImmutable: true,
  },
  {
    id: "evt-003",
    sequenceNumber: 1003,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T08:30:12Z",
    itemId: "rm-1",
    itemName: "Arabica Gayo Special Roast (Biji Kopi)",
    movementType: "POS_SALE",
    referenceType: "INVOICE",
    referenceId: "INV-20261020-001",
    qtyChange: -36,
    unitCost: 280,
    totalCostImpact: -10080,
    balanceAfter: 4964,
    unit: "g",
    operatorRole: "Kasir",
    operatorName: "Rina Kasir",
    notes: "2x Cappuccino Classic (Dine-In)",
    isImmutable: true,
    channel: "Dine-In",
  },
  {
    id: "evt-004",
    sequenceNumber: 1004,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T08:30:12Z",
    itemId: "rm-2",
    itemName: "Fresh Milk Full Cream Greenfields",
    movementType: "POS_SALE",
    referenceType: "INVOICE",
    referenceId: "INV-20261020-001",
    qtyChange: -360,
    unitCost: 22,
    totalCostImpact: -7920,
    balanceAfter: 14640,
    unit: "ml",
    operatorRole: "Kasir",
    operatorName: "Rina Kasir",
    notes: "2x Cappuccino Classic (Dine-In)",
    isImmutable: true,
    channel: "Dine-In",
  },
  {
    id: "evt-005",
    sequenceNumber: 1005,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T09:12:44Z",
    itemId: "rm-1",
    itemName: "Arabica Gayo Special Roast (Biji Kopi)",
    movementType: "POS_SALE",
    referenceType: "INVOICE",
    referenceId: "INV-20261020-002",
    qtyChange: -18,
    unitCost: 280,
    totalCostImpact: -5040,
    balanceAfter: 4946,
    unit: "g",
    operatorRole: "Kasir",
    operatorName: "Rina Kasir",
    notes: "1x Caramel Macchiato (GoFood Ojol)",
    isImmutable: true,
    channel: "GoFood",
  },
  {
    id: "evt-006",
    sequenceNumber: 1006,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T09:12:44Z",
    itemId: "rm-6",
    itemName: "Paper Cup 12oz + Hot Lid + Sleeve",
    movementType: "POS_SALE",
    referenceType: "INVOICE",
    referenceId: "INV-20261020-002",
    qtyChange: -1,
    unitCost: 1200,
    totalCostImpact: -1200,
    balanceAfter: 409,
    unit: "pcs",
    operatorRole: "Kasir",
    operatorName: "Rina Kasir",
    notes: "Ekstra packaging kemasan takeaway/ojol",
    isImmutable: true,
    channel: "GoFood",
  },
  {
    id: "evt-007",
    sequenceNumber: 1007,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T09:12:44Z",
    itemId: "rm-7",
    itemName: "Kraft Paper Bag + Food Seal Tape (Ojol)",
    movementType: "POS_SALE",
    referenceType: "INVOICE",
    referenceId: "INV-20261020-002",
    qtyChange: -1,
    unitCost: 800,
    totalCostImpact: -800,
    balanceAfter: 284,
    unit: "pcs",
    operatorRole: "Kasir",
    operatorName: "Rina Kasir",
    notes: "Kantong ojol bersegel higienis",
    isImmutable: true,
    channel: "GoFood",
  },
  {
    id: "evt-008",
    sequenceNumber: 1008,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T11:45:00Z",
    itemId: "rm-2",
    itemName: "Fresh Milk Full Cream Greenfields",
    movementType: "WASTE",
    referenceType: "WASTE_TICKET",
    referenceId: "WST-2026-004",
    qtyChange: -250,
    unitCost: 22,
    totalCostImpact: -5500,
    balanceAfter: 14390,
    unit: "ml",
    operatorRole: "Barista",
    operatorName: "Dimas Barista",
    notes: "Tumpah saat rush steaming latte art competition trial",
    isImmutable: true,
  },
  {
    id: "evt-009",
    sequenceNumber: 1009,
    businessDate: "2026-10-20",
    timestamp: "2026-10-20T14:00:00Z",
    itemId: "rm-1",
    itemName: "Arabica Gayo Special Roast (Biji Kopi)",
    movementType: "OPNAME_ADJUSTMENT",
    referenceType: "OPNAME",
    referenceId: "OPN-2026-015",
    qtyChange: -35,
    unitCost: 280,
    totalCostImpact: -9800,
    balanceAfter: 4911,
    unit: "g",
    operatorRole: "Manager",
    operatorName: "Fajar Manager",
    notes: "Kalibrasi dial-in grinder pagi & grinder retention purge",
    isImmutable: true,
  },
];

const defaultTables: CoffeeTable[] = [
  { id: "tbl-1", name: "Meja 01", status: "Empty", qrCodeUrl: "/table/tbl-1" },
  { id: "tbl-2", name: "Meja 02", status: "Empty", qrCodeUrl: "/table/tbl-2" },
  { id: "tbl-3", name: "Meja 03", status: "Occupied", qrCodeUrl: "/table/tbl-3" },
  { id: "tbl-4", name: "Meja 04", status: "Empty", qrCodeUrl: "/table/tbl-4" },
  { id: "tbl-5", name: "Meja 05 (Outdoor)", status: "Empty", qrCodeUrl: "/table/tbl-5" },
];

export const useDataStore = create<DataStoreState>()(
  persist(
    (set, get) => ({
      products: defaultProducts,
      rawMaterials: defaultRawMaterials,
      orders: [],
      financeLogs: [],
      appConfig: {
        storeName: "LedgerLine Roastery & Coffee Bar",
        storeAddress: "Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan",
        storePhone: "0812-3456-7890",
        storeWifiName: "LedgerLine_HighSpeed",
        storeWifiPass: "profitfirst2026",
        subscriptionPricePerMonth: 0,
        licenseKey: "LEDGERLINE-CORE-2026",
      },
      recipes: defaultRecipes,
      tables: defaultTables,
      isSandbox: false,
      ledgerEvents: defaultLedgerEvents,
      closings: [],
      activeRole: "Owner",

      setProducts: (products) => set({ products: products || [] }),
      setRawMaterials: (rawMaterials) =>
        set({
          rawMaterials: (rawMaterials || []).map((m: any) => ({
            ...m,
            stockQuantity: Number(m.stockQuantity ?? m.stock ?? 0),
            stockUnit: m.stockUnit || m.unit || "pcs",
            warningLimit: Number(m.warningLimit ?? m.minStock ?? 0),
            unitCost: Number(m.unitCost ?? m.costPerUnit ?? 0),
            supplierName: m.supplierName || "-",
            supplierContact: m.supplierContact || "-",
          })),
        }),
      setOrders: (orders) => set({ orders: orders || [] }),
      setFinanceLogs: (financeLogs) => set({ financeLogs }),
      setAppConfig: (appConfig) => set({ appConfig }),
      setRecipes: (recipes) => set({ recipes }),
      setTables: (tables) => set({ tables }),
      setIsSandbox: (isSandbox) => set({ isSandbox }),
      setLedgerEvents: (events) => set({ ledgerEvents: events }),
      setClosings: (closings) => set({ closings }),
      setActiveRole: (role) => set({ activeRole: role }),

      addOrder: (order) => {
        const state = get();
        const newOrders = [order, ...state.orders];
        
        // Auto-deduct inventory via recipes & record in chronological event ledger
        const newLedgerEvents = [...state.ledgerEvents];
        const updatedMaterials = [...state.rawMaterials];
        const now = new Date();
        const businessDate = now.toISOString().split("T")[0];
        let nextSeq = (newLedgerEvents[newLedgerEvents.length - 1]?.sequenceNumber || 1000) + 1;

        order.items.forEach((item) => {
          const recipe = state.recipes.find((r) => r.productId === item.productId);
          if (recipe) {
            recipe.ingredients.forEach((ing) => {
              const totalAmount = ing.amount * item.quantity;
              const matIndex = updatedMaterials.findIndex((m) => m.id === ing.materialId);
              if (matIndex >= 0) {
                const mat = updatedMaterials[matIndex];
                const newStock = Math.max(0, mat.stockQuantity - totalAmount);
                updatedMaterials[matIndex] = { ...mat, stockQuantity: newStock };

                newLedgerEvents.push({
                  id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  sequenceNumber: nextSeq++,
                  businessDate,
                  timestamp: now.toISOString(),
                  itemId: mat.id,
                  itemName: mat.name,
                  movementType: "POS_SALE",
                  referenceType: "INVOICE",
                  referenceId: order.id,
                  qtyChange: -totalAmount,
                  unitCost: mat.unitCost,
                  totalCostImpact: -(totalAmount * mat.unitCost),
                  balanceAfter: newStock,
                  unit: mat.stockUnit,
                  operatorRole: state.activeRole,
                  operatorName: state.appConfig?.cashierName || "Kasir Utama",
                  notes: `Penjualan ${item.quantity}x ${item.productId}`,
                  isImmutable: true,
                  channel: "Dine-In",
                });
              }
            });
          }
        });

        set({
          orders: newOrders,
          rawMaterials: updatedMaterials,
          ledgerEvents: newLedgerEvents,
        });
      },

      addLedgerEvent: (eventData) => {
        const state = get();
        const nextSeq = (state.ledgerEvents[state.ledgerEvents.length - 1]?.sequenceNumber || 1000) + 1;
        const newEvent: InventoryLedgerEvent = {
          ...eventData,
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sequenceNumber: nextSeq,
          timestamp: new Date().toISOString(),
          isImmutable: true,
        };
        set({ ledgerEvents: [...state.ledgerEvents, newEvent] });
      },

      executeDeterministicClosing: (closingRecord) => {
        set((state) => ({
          closings: [closingRecord, ...state.closings],
        }));
      },

      addProduct: (product) =>
        set((state) => ({ products: [product, ...state.products] })),

      updateProduct: (product) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === product.id ? product : p,
          ),
        })),

      deleteProduct: (productId) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        })),

      addRawMaterial: (material) =>
        set((state) => ({ rawMaterials: [material, ...state.rawMaterials] })),

      updateRawMaterial: (material) =>
        set((state) => ({
          rawMaterials: state.rawMaterials.map((m) =>
            m.id === material.id ? material : m,
          ),
        })),

      deleteRawMaterial: (materialId) =>
        set((state) => ({
          rawMaterials: state.rawMaterials.filter((m) => m.id !== materialId),
        })),

      receivePurchaseOrder: ({
        poNumber,
        materialId,
        quantity,
        unitCost,
        supplierName,
        notes,
      }) => {
        const state = get();
        const matIndex = state.rawMaterials.findIndex((m) => m.id === materialId);
        if (matIndex === -1) return;

        const targetMat = state.rawMaterials[matIndex];
        const newStock = targetMat.stockQuantity + quantity;
        const totalImpact = quantity * unitCost;

        const updatedMaterials = [...state.rawMaterials];
        updatedMaterials[matIndex] = {
          ...targetMat,
          stockQuantity: newStock,
          unitCost: unitCost,
        };

        const now = new Date();
        const nextSeq =
          (state.ledgerEvents[state.ledgerEvents.length - 1]?.sequenceNumber || 1000) + 1;

        const newLedgerEvent: InventoryLedgerEvent = {
          id: `evt-po-${Date.now()}`,
          sequenceNumber: nextSeq,
          businessDate: now.toISOString().split("T")[0],
          timestamp: now.toISOString(),
          itemId: targetMat.id,
          itemName: targetMat.name,
          movementType: "RECEIVING",
          referenceType: "PO",
          referenceId: poNumber,
          qtyChange: quantity,
          unitCost,
          totalCostImpact: totalImpact,
          balanceAfter: newStock,
          unit: targetMat.stockUnit,
          operatorRole: state.activeRole,
          operatorName: "Purchase Officer",
          notes: notes || `Penerimaan P.O ${poNumber} dari ${supplierName}`,
          isImmutable: true,
        };

        const newFinanceLog: FinanceLog = {
          id: `fn-${Date.now()}`,
          type: "expense",
          amount: totalImpact,
          category: "Pembelian Bahan Baku (HPP)",
          description: `P.O ${poNumber}: ${quantity} ${targetMat.stockUnit} ${targetMat.name} (${supplierName})`,
          date: now.toISOString().split("T")[0],
          time: now.toTimeString().split(" ")[0] || "00:00:00",
          isEncrypted: false,
          secureHash: `hash-${Date.now()}`,
        };

        set({
          rawMaterials: updatedMaterials,
          ledgerEvents: [...state.ledgerEvents, newLedgerEvent],
          financeLogs: [newFinanceLog, ...state.financeLogs],
        });
      },

      resetToStandardCoffeeRoasterySeed: () => {
        set({
          products: defaultProducts,
          rawMaterials: defaultRawMaterials,
          recipes: defaultRecipes,
          ledgerEvents: defaultLedgerEvents,
        });
      },

      addFinanceLog: (log) =>
        set((state) => ({ financeLogs: [log, ...state.financeLogs] })),
      updateProductStock: (productId, quantityToDeduct) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, stock: Math.max(0, p.stock - quantityToDeduct) }
              : p,
          ),
        })),

      syncOfflineOrders: async () => {
        const state = get();
        const offlineOrders = state.orders.filter(
          (o) => o.id.startsWith("TX-OFFLINE") && o.paymentStatus === "Success",
        );
        if (offlineOrders.length === 0) return;

        const savedStore = localStorage.getItem("aslam_ledger_current_store");
        const tenantId = savedStore ? JSON.parse(savedStore).id : "aslam-brew";

        for (const order of offlineOrders) {
          try {
            const response = await fetch("/api/pos/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Tenant-Id": tenantId,
                Authorization: `Bearer ${localStorage.getItem("ledgerline_jwt_token")}`,
              },
              body: JSON.stringify({
                ...order,
                id: undefined,
                isOfflineSync: true,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.order) {
                set((s) => ({
                  orders: s.orders.map((o) =>
                    o.id === order.id ? data.order : o,
                  ),
                }));
              }
            }
          } catch (err) {
            console.error("Failed to sync offline order:", order.id, err);
          }
        }
      },
    }),
    {
      name: "aslam-ledger-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);

export { useUIStore } from "./uiStore";

