import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Truck } from "lucide-react";
import TenantsList from "./TenantsList";
import SuppliersList from "./SuppliersList";
import AuditLogsList from "./AuditLogsList";

const fetchWithAuth = (url: string, options: any = {}) => {
  const token = localStorage.getItem("ledgerline_jwt_token");
  const store = JSON.parse(
    localStorage.getItem("aslam_ledger_current_store") || "{}",
  );

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "X-Tenant-Id": store.id,
  };

  return fetch(url, { ...options, headers });
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "tenants" | "suppliers" | "audit"
  >("overview");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchWithAuth("/api/admin/overview", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      });
  }, []);

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded \${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("tenants")}
          className={`px-4 py-2 rounded \${activeTab === 'tenants' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
        >
          Tenants
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 rounded \${activeTab === 'suppliers' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded \${activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
        >
          Audit Log
        </button>
      </div>

      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-slate-500">Total Tenants</h3>
            <p className="text-3xl font-bold">{stats.totalTenants}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-slate-500">Active Tenants</h3>
            <p className="text-3xl font-bold">{stats.activeTenants}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-slate-500">Total Suppliers</h3>
            <p className="text-3xl font-bold">{stats.totalSuppliers}</p>
          </div>
        </div>
      )}

      {activeTab === "tenants" && <TenantsList />}
      {activeTab === "suppliers" && <SuppliersList />}
      {activeTab === "audit" && <AuditLogsList />}
    </div>
  );
}
