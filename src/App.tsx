import { useAppSync } from "./hooks/useAppSync";
import React, { useEffect, useState } from "react";
import { useDataStore } from "./store/dataStore";
import { useUiMode } from "./context/UiModeContext";
import { AppRouter } from "./app/AppRouter";
import { MainLayout } from "./layouts/MainLayout";
import StoreLoginPortal from "./components/StoreLoginPortal";
import SupplierPortal from "./components/SupplierPortal";
import LedgerLineControlCenter from "./components/admin/LedgerLineControlCenter";
import OwnerSetupWizard from "./components/onboarding/OwnerSetupWizard";

export default function App() {
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const { uiMode } = useUiMode();

  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "kasir"
    | "stok"
    | "meja"
    | "laporan"
    | "pengaturan"
    | "intelligence"
    | "paket"
    | "suplierhub"
    | "auditor"
    | "migrasi"
    | "superadmin"
  >(
    window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/platform-admin")
      ? "superadmin"
      : uiMode === "simple"
      ? "kasir"
      : "dashboard"
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [currentStore, setCurrentStore] = useState<any>(() => {
    const saved = localStorage.getItem("aslam_ledger_current_store");
    return saved ? JSON.parse(saved) : null;
  });

  const [supplierSession, setSupplierSession] = useState<any>(() => {
    const saved = localStorage.getItem("aslam_ledger_supplier_session");
    return saved ? JSON.parse(saved) : null;
  });

  const { appConfig, setAppConfig, syncOfflineOrders } = useDataStore();

  const syncQuery = useAppSync(
    currentStore?.id,
    localStorage.getItem("ledgerline_jwt_token") || "",
  );

  const isKasir = React.useMemo(
    () => currentStore?.cashierRole === "Kasir",
    [currentStore],
  );

  useEffect(() => {
    if (isKasir && activeTab !== "kasir" && activeTab !== "meja") {
      setActiveTab("kasir");
    }
  }, [isKasir, activeTab]);

  useEffect(() => {
    if (navigator.onLine) {
      syncOfflineOrders();
    }

    const handleOnline = () => {
      syncOfflineOrders();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncOfflineOrders]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) {
          if (data.user.role === "SUPER_ADMIN") {
            setCurrentStore({
              id: "system_admin",
              name: "Super Admin Platform HQ",
              cashierRole: "SUPER_ADMIN",
              user: data.user,
            });
            return;
          }
          const tenant = data.tenant || {
            id: data.user.tenantId || "default_tenant",
            name: "Kedai Kopi Utama",
          };
          setCurrentStore({
            ...tenant,
            cashierRole: data.user.role === "KASIR" ? "Kasir" : data.user.role,
            user: data.user,
            activeOutlet: data.activeOutlet,
          });
        }
      })
      .catch(() => {});
  }, []);

  const executeLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // Ignored
    }
    setCurrentStore(null);
    setSupplierSession(null);
    localStorage.removeItem("aslam_ledger_current_store");
    localStorage.removeItem("aslam_ledger_supplier_session");
    localStorage.removeItem("ledgerline_jwt_token");
    localStorage.removeItem("aslam_ledger_token");
    setShowLogoutConfirm(false);
  };

  const handleUpdateConfig = async (updated: Partial<any>) => {
    // Config updating logic
  };

  if (visitorToken) {
    const VisitorMenu = React.lazy(() => import("./components/VisitorMenu"));
    return (
      <React.Suspense fallback={<div>Loading Visitor...</div>}>
        <VisitorMenu token={visitorToken} />
      </React.Suspense>
    );
  }

  // 1. Dedicated Supplier Persona
  if (supplierSession) {
    return (
      <SupplierPortal
        onLogout={() => {
          setSupplierSession(null);
          localStorage.removeItem("aslam_ledger_supplier_session");
        }}
      />
    );
  }

  // 2. Unauthenticated Gate
  if (!currentStore) {
    if (window.location.pathname.startsWith("/admin")) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black">SaaS Platform Control</h2>
              <p className="text-xs text-slate-400">Autentikasi Master Administrator Platform LedgerLine</p>
            </div>
            <button
              onClick={async () => {
                const res = await fetch("/api/auth/google-auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ idToken: "mock_superadmin", action: "login" }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  setCurrentStore({
                    id: "system_admin",
                    name: "Super Admin Platform HQ",
                    cashierRole: "SUPER_ADMIN",
                    user: data.user,
                  });
                }
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Masuk ke Control Center Admin
            </button>
            <div className="text-center pt-2">
              <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
                ← Kembali ke Portal Kedai Kopi
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative isolate min-h-screen">
        <StoreLoginPortal
          tenants={[]}
          onLogin={(t, tok) => {
            setCurrentStore(t);
            localStorage.setItem(
              "aslam_ledger_current_store",
              JSON.stringify(t),
            );
            if (tok) localStorage.setItem("ledgerline_jwt_token", tok);
          }}
          onRegister={() => {}}
          onSupplierLogin={(s) => {
            setSupplierSession(s);
          }}
        />
      </div>
    );
  }

  const isSuperAdminUser =
    currentStore?.cashierRole === "SUPER_ADMIN" ||
    currentStore?.user?.role === "SUPER_ADMIN";

  // 3. Super Admin Platform Cockpit Isolation (Zero Coffee Shop Layout)
  if (isSuperAdminUser) {
    return (
      <LedgerLineControlCenter
        onBackToStore={() => {
          executeLogout();
        }}
        onLogout={executeLogout}
      />
    );
  }

  // Display Owner Setup Wizard if store owner has not finished onboarding
  if (
    !isSuperAdminUser &&
    currentStore?.onboardingCompleted === false &&
    (currentStore?.cashierRole === "OWNER" || currentStore?.user?.role === "OWNER")
  ) {
    return (
      <OwnerSetupWizard
        tenant={currentStore}
        onComplete={() => {
          const updated = { ...currentStore, onboardingCompleted: true };
          setCurrentStore(updated);
          localStorage.setItem("aslam_ledger_current_store", JSON.stringify(updated));
        }}
        onSkip={() => {
          const updated = { ...currentStore, onboardingCompleted: true };
          setCurrentStore(updated);
          localStorage.setItem("aslam_ledger_current_store", JSON.stringify(updated));
        }}
      />
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentStore={currentStore}
      appConfig={appConfig || {}}
      demoTimeRemaining={""}
      handleLogoutStore={() => setShowLogoutConfirm(true)}
      isKasir={isKasir}
    >
      <AppRouter
        activeTab={activeTab}
        currentStore={currentStore}
        onRefresh={() => syncQuery.refetch()}
        executeLogout={executeLogout}
        handleUpdateConfig={handleUpdateConfig}
        activeSuperAdminMode={"audit"}
        selectedAuditTenant={null}
        setSelectedAuditTenant={() => {}}
        superadminEmail={""}
        superadminPassword={""}
        handleSuperadminDeleteTenant={() => {}}
      />

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold">Konfirmasi Keluar</h3>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-slate-500"
              >
                Batal
              </button>
              <button
                onClick={executeLogout}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl"
              >
                Keluar Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
