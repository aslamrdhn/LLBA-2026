import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  role: "SuperAdmin" | "Owner" | "Manager" | "Kasir" | "Supplier" | string;
  name?: string;
  tenantId?: string;
}

interface TenantState {
  tenantId: string | null;
  user: User | null;
  theme: string;
  setTenant: (tenantId: string) => void;
  setUser: (user: User | null) => void;
  setTheme: (theme: string) => void;
  logout: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: localStorage.getItem("aslam_ledger_tenant_id"),
  user: null,
  theme: "slate",
  setTenant: (tenantId) => {
    localStorage.setItem("aslam_ledger_tenant_id", tenantId);
    set({ tenantId });
  },
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
  logout: () => {
    localStorage.removeItem("aslam_ledger_session");
    localStorage.removeItem("aslam_ledger_tenant_id");
    set({ tenantId: null, user: null });
  },
}));
