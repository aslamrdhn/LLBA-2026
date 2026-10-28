import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "../types";

export interface CartItem {
  id: string; // Unique ID for cart item (important if same product added with different variant/sugar)
  product: Product;
  quantity: number;
  notes: string;
  variant?: "HOT" | "COOL";
  sugar?: "LESS" | "NORMAL";
  discountAmount?: number;
}

interface CartStoreState {
  cart: CartItem[];
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  discountPercent: number;
  paymentMethod: "QRIS" | "Tunai" | "Debit" | "Midtrans" | "Split";

  setTableNumber: (num: string) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  setDiscountPercent: (percent: number) => void;
  setPaymentMethod: (
    method: "QRIS" | "Tunai" | "Debit" | "Midtrans" | "Split",
  ) => void;

  addToCart: (item: Omit<CartItem, "id">) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set) => ({
      cart: [],
      tableNumber: "Kasir Utama",
      customerName: "",
      customerPhone: "",
      discountPercent: 0,
      paymentMethod: "QRIS",

      setTableNumber: (num) => set({ tableNumber: num }),
      setCustomerInfo: (name, phone) =>
        set({ customerName: name, customerPhone: phone }),
      setDiscountPercent: (percent) => set({ discountPercent: percent }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),

      addToCart: (item) =>
        set((state) => {
          // check if identical item exists (same product id, variant, sugar, notes)
          const existingIdx = state.cart.findIndex(
            (c) =>
              c.product.id === item.product.id &&
              c.variant === item.variant &&
              c.sugar === item.sugar &&
              c.notes === item.notes,
          );
          if (existingIdx >= 0) {
            const newCart = [...state.cart];
            newCart[existingIdx].quantity += item.quantity;
            return { cart: newCart };
          }

          const newItem = {
            ...item,
            id: Math.random().toString(36).substring(2, 9),
          };
          return { cart: [...state.cart, newItem] };
        }),
      updateCartItem: (id, updates) =>
        set((state) => ({
          cart: state.cart.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.id !== id),
        })),
      clearCart: () =>
        set({
          cart: [],
          customerName: "",
          customerPhone: "",
          discountPercent: 0,
          tableNumber: "Kasir Utama",
          paymentMethod: "QRIS",
        }),
    }),
    {
      name: "aslam-ledger-cart",
    },
  ),
);
