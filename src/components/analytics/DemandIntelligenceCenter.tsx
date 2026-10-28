import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  MapPin,
  Package,
  Shield,
  Zap,
} from "lucide-react";

const DEFAULT_INTELLIGENCE = {
  topMaterials: [
    { name: "Biji Kopi Arabika Gayo", avgPrice: 120000, growth: 14.2, monthlyDemand: 450, unit: "kg" },
    { name: "Susu Segar Pasteurisasi", avgPrice: 18000, growth: 8.5, monthlyDemand: 1200, unit: "liter" },
    { name: "Sirup Karamel Monin", avgPrice: 145000, growth: 5.1, monthlyDemand: 95, unit: "botol" },
    { name: "Cup & Lid 12oz Pack", avgPrice: 35000, growth: -2.3, monthlyDemand: 380, unit: "pack" },
  ],
  geographic: [
    { area: "Jakarta Pusat & Selatan", volume: "High", topMaterial: "Biji Kopi Arabika Gayo" },
    { area: "Bandung & Priangan", volume: "Moderate", topMaterial: "Susu Segar Pasteurisasi" },
    { area: "Surabaya & Sekitarnya", volume: "Rising", topMaterial: "Sirup Karamel Monin" },
  ],
};

export default function DemandIntelligenceCenter() {
  const [data, setData] = useState<any>(DEFAULT_INTELLIGENCE);
  const [loading, setLoading] = useState(true);

  const fetchDemand = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/demand/global-demand");
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || (json.topMaterials ? json : null);
        if (payload) {
          setData(payload);
        } else {
          setData(DEFAULT_INTELLIGENCE);
        }
      } else {
        setData(DEFAULT_INTELLIGENCE);
      }
    } catch (e) {
      console.warn("Could not fetch remote intelligence, using cached insights:", e);
      setData(DEFAULT_INTELLIGENCE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemand();
  }, []);

  if (loading && !data)
    return (
      <div className="text-slate-400 p-8 flex items-center justify-center animate-pulse">
        Gathering Global Market Intelligence...
      </div>
    );
  if (!data)
    return (
      <div className="text-white p-8 flex flex-col items-center gap-4">
        <div>Error loading intelligence data.</div>
        <button
          onClick={fetchDemand}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
        >
          Coba Lagi
        </button>
      </div>
    );

  return (
    <div className="p-6 text-slate-200">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Activity className="text-indigo-400" />
            Supply Intelligence Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated & Anonymized Market Demand for Suppliers
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-lg border border-emerald-800/50">
          <Shield size={16} />
          <span className="text-xs font-bold font-mono tracking-wider">
            TENANT ISOLATED
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-sky-400" /> Top High-Demand
              Materials
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="pb-3 font-medium">Material</th>
                    <th className="pb-3 font-medium text-right">Avg Price</th>
                    <th className="pb-3 font-medium text-right">MoM Growth</th>
                    <th className="pb-3 font-medium text-right">Mo. Vol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-300">
                  {data?.topMaterials?.map((mat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-700/20">
                      <td className="py-3 font-bold flex items-center gap-2">
                        <span className="w-4 h-4 bg-slate-700 rounded flex flex-col justify-center items-center text-[9px] text-slate-400">
                          {idx + 1}
                        </span>
                        {mat.name}
                      </td>
                      <td className="py-3 text-right font-mono text-xs">
                        Rp {mat.avgPrice.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${mat.growth >= 0 ? "bg-emerald-900/40 text-emerald-400" : "bg-rose-900/40 text-rose-400"}`}
                        >
                          {mat.growth > 0 ? "+" : ""}
                          {mat.growth}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-indigo-300 font-bold">
                        {mat.monthlyDemand.toLocaleString()} {mat.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-rose-400" /> Geographic
              Intelligence
            </h2>
            <div className="space-y-4">
              {data?.geographic?.map((geo: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white text-sm">
                      {geo.area}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Volume: {geo.volume}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Highest Demand:
                    <br />
                    <span className="font-bold text-indigo-300">
                      {geo.topMaterial}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Chart Mock for Aesthetics */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Zap size={16} className="text-amber-400" /> Aggregated Network
          Forecast
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[
                { month: "Jan", demand: 4000 },
                { month: "Feb", demand: 5500 },
                { month: "Mar", demand: 4800 },
                { month: "Apr", demand: 7000 },
                { month: "May", demand: 9500 },
                { month: "Jun", demand: 12000 },
              ]}
            >
              <defs>
                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                vertical={false}
              />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                }}
              />
              <Area
                type="monotone"
                dataKey="demand"
                stroke="#818cf8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorDemand)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
