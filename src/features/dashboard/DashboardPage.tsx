import React from "react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome to LedgerLine
        </h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition">
          New Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Today's Revenue
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">Rp 2.450.000</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">
            ↑ +14% from yesterday
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Total Orders
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">142</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">
            ↑ +5% from yesterday
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Active Tables
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">8 / 12</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">4 available</p>
        </div>
      </div>
    </div>
  );
}
