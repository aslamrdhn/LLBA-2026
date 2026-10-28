import { create } from "zustand";

interface ToastMessage {
  id: string;
  message: string;
}

export interface SimpleCartItem {
  menuId: string;
  qty: number;
}

interface UiStoreState {
  cart: SimpleCartItem[];
  addToCart: (menuId: string) => void;
  removeFromCart: (menuId: string) => void;
  clearCart: () => void;

  toasts: ToastMessage[];
  triggerToast: (message: string) => void;
  removeToast: (id: string) => void;

  auditLogs: any[];
  logAuditActivity: (name: string, action: string, detail: string) => void;
  setAuditLogs: (logs: any[]) => void;
  clearAuditLogs: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  cart: [],
  addToCart: (menuId) =>
    set((state) => {
      const idx = state.cart.findIndex((c) => c.menuId === menuId);
      if (idx >= 0) {
        const next = [...state.cart];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return { cart: next };
      }
      return { cart: [...state.cart, { menuId, qty: 1 }] };
    }),
  removeFromCart: (menuId) =>
    set((state) => {
      const idx = state.cart.findIndex((c) => c.menuId === menuId);
      if (idx < 0) return state;
      const item = state.cart[idx];
      if (item.qty > 1) {
        const next = [...state.cart];
        next[idx] = { ...item, qty: item.qty - 1 };
        return { cart: next };
      }
      return { cart: state.cart.filter((c) => c.menuId !== menuId) };
    }),
  clearCart: () => set({ cart: [] }),

  toasts: [],
  triggerToast: (message) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  auditLogs: (() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("aslam_ledger_audit_logs");
    return saved ? JSON.parse(saved) : [];
  })(),
  logAuditActivity: (name, action, detail) => {
    const log = {
      time: new Date().toLocaleTimeString("id-ID"),
      name,
      action,
      detail,
      ip: "192.168.1." + Math.floor(2 + Math.random() * 250),
    };
    set((state) => {
      const newLogs = [log, ...state.auditLogs].slice(0, 100);
      localStorage.setItem("aslam_ledger_audit_logs", JSON.stringify(newLogs));
      return { auditLogs: newLogs };
    });
  },
  setAuditLogs: (logs) => {
    localStorage.setItem("aslam_ledger_audit_logs", JSON.stringify(logs));
    set({ auditLogs: logs });
  },
  clearAuditLogs: () => {
    localStorage.removeItem("aslam_ledger_audit_logs");
    set({ auditLogs: [] });
  },
}));

export const useUIStore = useUiStore;

