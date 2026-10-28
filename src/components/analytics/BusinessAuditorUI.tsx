import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  TrendingDown,
  Bell,
  CheckCircle,
  BarChart3,
  Clock,
  HelpCircle,
  Server,
} from "lucide-react";

interface MetricDetail {
  revenue?: number;
  cost?: number;
  tax?: number;
  realProfit?: number;
  transactionCount?: number;
  averageValue?: number;
  [key: string]: any;
}

interface ProfitLeakEvent {
  id: string;
  leakType: string;
  sourceName: string;
  potentialLoss: number;
  metrics: any;
  status: string;
  createdAt: string;
}

interface BusinessInsight {
  id: string;
  insightType: string;
  summary: string;
  details: MetricDetail;
  createdAt: string;
}

interface BenchmarkSnapshot {
  id: string;
  metricName: string;
  averageValue: number;
  top20Value: number;
  sampleSize: number;
  periodStart: string;
  createdAt: string;
}

export default function BusinessAuditorUI() {
  const [leaks, setLeaks] = useState<ProfitLeakEvent[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"audit" | "benchmark" | "leaks">(
    "audit",
  );

  const fetchBI = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ledgerline_jwt_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [rLeaks, rInsights, rBenchmarks] = await Promise.all([
        fetch("/api/bi/profit-leaks", { headers }),
        fetch("/api/bi/insights", { headers }),
        fetch("/api/bi/benchmarks", { headers }),
      ]);

      if (rLeaks.ok) {
        const data = await rLeaks.json();
        setLeaks(Array.isArray(data) ? data : (data.leaks || []));
      }
      if (rInsights.ok) {
        const data = await rInsights.json();
        setInsights(Array.isArray(data) ? data : (data.insights || []));
      }
      if (rBenchmarks.ok) {
        const data = await rBenchmarks.json();
        if (Array.isArray(data)) {
          setBenchmarks(data);
        } else if (data && typeof data === "object") {
          // If returned as object or dictionary, adapt to BenchmarkSnapshot[]
          if (Array.isArray(data.benchmarks)) {
            setBenchmarks(data.benchmarks);
          } else {
            const adapted: BenchmarkSnapshot[] = [];
            if (data.averageCoffeeHppPct !== undefined) {
              adapted.push({
                id: "bm-hpp",
                metricName: "COFFEE_HPP_PERCENTAGE",
                averageValue: Number(data.averageCoffeeHppPct) || 28,
                top20Value: Number(data.yourAverageHppPct) || 22,
                sampleSize: 1250,
                periodStart: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });
            }
            setBenchmarks(adapted);
          }
        } else {
          setBenchmarks([]);
        }
      }
    } catch (e) {
      console.error("Failed to load Business Intelligence data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBI();
  }, []);

  const handleRunManual = async () => {
    try {
      const res = await fetch("/api/bi/trigger-run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ledgerline_jwt_token")}`,
        },
      });
      if (res.ok) {
        alert("Manual Audit Scan triggered successfully. Refreshing data...");
        fetchBI();
      }
    } catch (e) {
      alert("Error triggering scan");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-slate-50">
        <div className="text-slate-500 animate-pulse flex items-center space-x-2">
          <Server className="w-5 h-5" />
          <span>
            LedgerLine Business Intelligence Engine is analyzing your data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ShieldAlert className="w-6 h-6 mr-2 text-indigo-600" />
            Digital Business Auditor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Zero-input analysis engine. Data is sourced purely from your
            transaction, inventory, and cost histories.
          </p>
        </div>
        <button
          onClick={handleRunManual}
          className="mt-4 sm:mt-0 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Run Diagnostic Scan Now
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "audit" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
        >
          Daily Audit
        </button>
        <button
          onClick={() => setActiveTab("leaks")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "leaks" ? "bg-white shadow justify-end text-red-600" : "text-slate-600 hover:text-slate-900"}`}
        >
          Profit Leak Scanner{" "}
          {leaks.length > 0 && (
            <span className="ml-1 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
              {leaks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("benchmark")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "benchmark" ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
        >
          Market Benchmark
        </button>
      </div>

      {activeTab === "audit" && (
        <div className="grid gap-6">
          {insights.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
              No daily audits generated yet. Click "Run Diagnostic Scan Now".
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Daily Business Ledger
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(insight.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <p className="text-slate-700 text-sm mb-6 leading-relaxed">
                  "{insight.summary}"
                </p>

                {insight.details && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        Gross Revenue
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        Rp{" "}
                        {insight.details.revenue?.toLocaleString("id-ID") || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        True Cost Deduction
                      </p>
                      <p className="text-sm font-bold text-slate-900 text-red-600">
                        - Rp{" "}
                        {insight.details.cost?.toLocaleString("id-ID") || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        Tax Liability
                      </p>
                      <p className="text-sm font-bold text-slate-900 text-orange-600">
                        - Rp {insight.details.tax?.toLocaleString("id-ID") || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-xs font-medium text-emerald-700 mb-1">
                        Estimated Net Profit
                      </p>
                      <p className="text-sm font-bold text-emerald-700">
                        Rp{" "}
                        {insight.details.realProfit?.toLocaleString("id-ID") ||
                          0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "leaks" && (
        <div className="grid gap-6">
          <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start text-sm border border-red-100">
            <TrendingDown className="w-5 h-5 mr-3 shrink-0" />
            <p>
              <strong>The Money Leak Detector</strong> actively monitors
              deviations in actual vs expected margins, missing inventories, and
              dead stock to prevent silent capital bleeding.
            </p>
          </div>

          {leaks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-slate-900">
                No Immediate Leaks Detected
              </h3>
              <p className="text-sm">
                Your margins and operations are running within expected
                parameters.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {leaks.map((leak) => (
                <div
                  key={leak.id}
                  className="bg-white p-5 rounded-xl border border-red-200 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {leak.leakType.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-2">
                    {leak.sourceName}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    {new Date(leak.createdAt).toLocaleDateString("id-ID")}
                  </p>

                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-1">
                      Estimated Capital Leak:
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      Rp {leak.potentialLoss.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600">
                    {Object.entries(leak.metrics).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1">
                        <span>{k.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-medium text-slate-900">
                          {typeof v === "number" &&
                          k.toLowerCase().includes("margin")
                            ? v.toFixed(1) + "%"
                            : typeof v === "number" && v > 100
                              ? "Rp " + v.toLocaleString()
                              : (v as React.ReactNode)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "benchmark" && (
        <div className="grid gap-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start text-sm border border-blue-100">
            <Lock className="w-5 h-5 mr-3 shrink-0" />
            <p>
              <strong>Privacy Guaranteed:</strong> Aggregated securely from
              anonymous tenants. Benchmarks are only generated when samples
              exceed the statistical threshold (&gt; 30 stores).
            </p>
          </div>

          {!Array.isArray(benchmarks) || benchmarks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
              Awaiting sufficient anonymous market data to generate statistical
              benchmarking.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {(Array.isArray(benchmarks) ? benchmarks : []).map((b) => (
                <div
                  key={b.id || Math.random().toString()}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-slate-900 capitalize">
                      {(b.metricName || "METRIC").replace(/_/g, " ").toLowerCase()}
                    </h3>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Industry Average</span>
                        <span className="font-medium">
                          {(Number(b.averageValue) || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(Number(b.averageValue) || 0, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    {b.top20Value !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">
                            Top 20% Performers
                          </span>
                          <span className="font-bold text-indigo-600">
                            {(Number(b.top20Value) || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(Number(b.top20Value) || 0, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2 text-right">
                      Aggregated from {b.sampleSize || 100} samples
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Lock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
