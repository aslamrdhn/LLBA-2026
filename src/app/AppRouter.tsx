import React from "react";
import { useUiMode } from "../context/UiModeContext";
import { useDataStore } from "../store/dataStore";

// Core views are eagerly imported for instant navigation and zero dynamic chunk failures
import Dashboard from "../components/analytics/Dashboard";
import Cashier from "../components/Cashier";
import Inventory from "../components/Inventory";
import TableOrders from "../components/TableOrders";
import FinancialReports from "../components/reports/FinancialReports";
import StorefrontProfile from "../components/StorefrontProfile";

// Resilient lazy helper with automatic retry for secondary views
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  interval = 800,
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      function attempt(remaining: number) {
        factory()
          .then(resolve)
          .catch((error) => {
            if (remaining > 0) {
              setTimeout(() => attempt(remaining - 1), interval);
            } else {
              reject(error);
            }
          });
      }
      attempt(retries);
    }),
  );
}

// Secondary views lazy loaded with retry resilience
const ShiftHandover = lazyWithRetry(() => import("../components/ShiftHandover"));
const PurchaseOrdersTab = lazyWithRetry(() =>
  import("../components/inventory/PurchaseOrdersTab").then((m) => ({
    default: m.PurchaseOrdersTab,
  }))
);
const DemandIntelligenceCenter = lazyWithRetry(
  () => import("../components/analytics/DemandIntelligenceCenter"),
);
const MarketIntelligence = lazyWithRetry(
  () => import("../components/analytics/MarketIntelligence"),
);
const BusinessAuditorUI = lazyWithRetry(
  () => import("../components/analytics/BusinessAuditorUI"),
);
const SubscriptionPackages = lazyWithRetry(
  () => import("../components/SubscriptionPackages"),
);
const SupplyHubAdmin = lazyWithRetry(() => import("../components/SupplyHubAdmin"));
const TrueCostDashboard = lazyWithRetry(
  () => import("../components/analytics/TrueCostDashboard"),
);
const MigrationCenter = lazyWithRetry(
  () => import("../components/MigrationCenter"),
);
const LedgerLineControlCenter = lazyWithRetry(
  () => import("../components/admin/LedgerLineControlCenter"),
);

class ModuleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ModuleErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 m-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Gagal Memuat Modul</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Terjadi kendala saat memuat berkas modul aplikasi. Silakan muat ulang atau coba lagi.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Segarkan Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AppRouterProps {
  activeTab: string;
  currentStore: any;
  onRefresh: () => void;
  executeLogout: () => void;
  handleUpdateConfig: (config: any) => void;
  // Superadmin Props
  activeSuperAdminMode: string;
  selectedAuditTenant: any;
  setSelectedAuditTenant: (t: any) => void;
  superadminEmail: string;
  superadminPassword: string;
  handleSuperadminDeleteTenant: (id: string) => void;
}

export function AppRouter({
  activeTab,
  currentStore,
  onRefresh,
  executeLogout,
  handleUpdateConfig,
  activeSuperAdminMode,
  selectedAuditTenant,
  setSelectedAuditTenant,
  superadminEmail,
  superadminPassword,
  handleSuperadminDeleteTenant,
}: AppRouterProps) {
  const { uiMode } = useUiMode();
  const {
    products,
    rawMaterials,
    recipes,
    tables,
    orders,
    financeLogs,
    appConfig,
  } = useDataStore();

  const isSuperAdmin =
    currentStore?.cashierRole === "SUPER_ADMIN" ||
    currentStore?.user?.role === "SUPER_ADMIN";

  if (activeTab === "superadmin") {
    if (!isSuperAdmin) {
      return (
        <div className="p-10 text-center text-red-500 font-bold">
          403 Forbidden: You do not have SuperAdmin privileges.
        </div>
      );
    }
    return (
      <ModuleErrorBoundary>
        <React.Suspense
          fallback={
            <div className="flex h-full items-center justify-center font-bold text-slate-500">
              Memuat Modul...
            </div>
          }
        >
          <LedgerLineControlCenter onBackToStore={() => {}} onLogout={executeLogout} />
        </React.Suspense>
      </ModuleErrorBoundary>
    );
  }

  return (
    <ModuleErrorBoundary>
      <React.Suspense
        fallback={
          <div className="flex h-full items-center justify-center font-bold text-slate-500">
            Memuat Modul...
          </div>
        }
      >
        {activeTab === "dashboard" && (
          <Dashboard
            products={products}
            rawMaterials={rawMaterials}
            financeLogs={financeLogs}
            orders={orders}
            appConfig={appConfig || ({} as any)}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "kasir" && (
          <Cashier
            products={products}
            rawMaterials={rawMaterials}
            recipes={recipes}
            tables={tables}
            appConfig={appConfig || ({} as any)}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "stok" && (
          <Inventory
            products={products}
            rawMaterials={rawMaterials}
            recipes={recipes}
            appConfig={appConfig || ({} as any)}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "meja" && (
          <TableOrders
            tables={tables}
            products={products}
            orders={orders}
            appConfig={appConfig || ({} as any)}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "laporan" && (
          <FinancialReports
            financeLogs={financeLogs}
            orders={orders}
            products={products}
            rawMaterials={rawMaterials}
            backupHistory={[]}
            appConfig={appConfig || ({} as any)}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === "suplierhub" && (
          <PurchaseOrdersTab materials={rawMaterials} onRefresh={onRefresh} />
        )}
        {activeTab === "intelligence" && <DemandIntelligenceCenter />}
        {activeTab === "auditor" && <BusinessAuditorUI />}
        {activeTab === "paket" && <SubscriptionPackages />}
        {activeTab === "migrasi" && <MigrationCenter />}
        {activeTab === "pengaturan" && (
          <StorefrontProfile
            appConfig={appConfig || ({} as any)}
            onUpdateConfig={handleUpdateConfig}
            products={products}
            rawMaterials={rawMaterials}
            recipes={recipes}
            onRefresh={onRefresh}
          />
        )}
      </React.Suspense>
    </ModuleErrorBoundary>
  );
}
