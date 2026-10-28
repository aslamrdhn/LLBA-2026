import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Percent,
  Layers,
  ShoppingBag,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  DollarSign,
  UtensilsCrossed,
  Car,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";
import { useDataStore } from "../../store/dataStore";
import { ChannelContributionMetric, SalesChannel } from "../../types";

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function ChannelContributionView() {
  const { products, recipes, rawMaterials, orders } = useDataStore();
  const [selectedChannel, setSelectedChannel] = useState<string>("ALL");
  const [customOjolFeeRate, setCustomOjolFeeRate] = useState<number>(20); // 20% standard platform commission
  const [packagingOjolCost, setPackagingOjolCost] = useState<number>(2000); // Rp 2.000 for Cup + Bag + Seal

  // Channel metrics computation
  const channelMetrics: ChannelContributionMetric[] = useMemo(() => {
    // 5 channels: Dine-In, Takeaway, GoFood, GrabFood, ShopeeFood
    const channels: SalesChannel[] = ["Dine-In", "Takeaway", "GoFood", "GrabFood", "ShopeeFood"];

    // Seed baseline distribution
    const baselineOrders: Record<
      SalesChannel,
      { count: number; gross: number; cogs: number; packCost: number; feeRate: number }
    > = {
      "Dine-In": {
        count: 54,
        gross: 1680000,
        cogs: 480000,
        packCost: 0, // Ceramic cups / glasses (0 pack cost)
        feeRate: 0.0,
      },
      Takeaway: {
        count: 28,
        gross: 890000,
        cogs: 260000,
        packCost: 28 * 1200, // Paper cups only
        feeRate: 0.0,
      },
      GoFood: {
        count: 42,
        gross: 1470000,
        cogs: 425000,
        packCost: 42 * packagingOjolCost,
        feeRate: customOjolFeeRate / 100,
      },
      GrabFood: {
        count: 36,
        gross: 1260000,
        cogs: 365000,
        packCost: 36 * packagingOjolCost,
        feeRate: customOjolFeeRate / 100,
      },
      ShopeeFood: {
        count: 18,
        gross: 590000,
        cogs: 172000,
        packCost: 18 * packagingOjolCost,
        feeRate: customOjolFeeRate / 100,
      },
    };

    return channels.map((ch) => {
      const data = baselineOrders[ch];
      const platformFeeAmount = Math.round(data.gross * data.feeRate);
      const contributionProfit = data.gross - platformFeeAmount - data.packCost - data.cogs;
      const marginPercent = data.gross > 0 ? (contributionProfit / data.gross) * 100 : 0;

      return {
        channel: ch,
        orderCount: data.count,
        grossRevenue: data.gross,
        platformFeeRate: data.feeRate,
        platformFeeAmount,
        packagingCostPerOrder: data.count > 0 ? Math.round(data.packCost / data.count) : 0,
        totalPackagingCost: data.packCost,
        cogsAmount: data.cogs,
        contributionProfit,
        contributionMarginPercent: marginPercent,
        avgTicketSize: data.count > 0 ? Math.round(data.gross / data.count) : 0,
      };
    });
  }, [customOjolFeeRate, packagingOjolCost]);

  // Total Summary
  const aggregate = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let pack = 0;
    let cogs = 0;
    let profit = 0;
    channelMetrics.forEach((m) => {
      gross += m.grossRevenue;
      fees += m.platformFeeAmount;
      pack += m.totalPackagingCost;
      cogs += m.cogsAmount;
      profit += m.contributionProfit;
    });
    return {
      gross,
      fees,
      pack,
      cogs,
      profit,
      margin: gross > 0 ? (profit / gross) * 100 : 0,
    };
  }, [channelMetrics]);

  // Per-Product Contribution Comparison (Dine-in vs Ojol)
  const productChannelComparison = useMemo(() => {
    return products.map((p) => {
      const dineInPrice = p.price;
      const cogs = p.costPrice || 8000;
      
      // Dine-In
      const dineInProfit = dineInPrice - cogs;
      const dineInMargin = (dineInProfit / dineInPrice) * 100;

      // Ojol at same price (The trap!)
      const ojolFeeSamePrice = dineInPrice * (customOjolFeeRate / 100);
      const ojolProfitSamePrice = dineInPrice - ojolFeeSamePrice - packagingOjolCost - cogs;
      const ojolMarginSamePrice = (ojolProfitSamePrice / dineInPrice) * 100;

      // Recommended Markup Price to get same profit as Dine-in:
      // Price_ojol - (Price_ojol * feeRate) - packCost - cogs = dineInProfit
      // Price_ojol * (1 - feeRate) = dineInProfit + packCost + cogs
      const targetOjolPrice = Math.round(
        (dineInProfit + packagingOjolCost + cogs) / (1 - customOjolFeeRate / 100),
      );
      const markupAmount = targetOjolPrice - dineInPrice;

      return {
        product: p,
        dineInPrice,
        cogs,
        dineInProfit,
        dineInMargin,
        ojolProfitSamePrice,
        ojolMarginSamePrice,
        isBleeding: ojolMarginSamePrice < 25,
        targetOjolPrice,
        markupAmount,
      };
    });
  }, [products, customOjolFeeRate, packagingOjolCost]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 uppercase">
              Profit Moat · Analytical Layer
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">
              Contribution Margin Multi-Channel
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Kebenaran Laba Bersih Per Channel Penjualan
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Bukan sekadar Gross Margin. Omzet dikurangi HPP bahan baku, potongan komisi platform (20%),
            dan biaya kemasan khusus (cup, lid, paper bag seal). Menghilangkan ilusi omzet semu di ojol.
          </p>
        </div>

        {/* Global Contribution Summary */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-right">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Net Contribution Profit
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400 mt-0.5">
            {formatRupiah(aggregate.profit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Contribution Margin Rata-Rata:{" "}
            <span className="font-bold text-white">{aggregate.margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* The Ojol Illusion Alert Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-bold">The Coffee Shop "Ojol Illusion" Trap:</strong> Banyak pemilik
          cafe merasa penjualan GoFood/GrabFood meledak, namun kas akhir bulan tetap tipis. Hal ini
          karena potongan komisi 20% dan biaya ekstra cup/paper bag (Rp 2.000/cup) memotong laba
          hingga 40-50% lebih rendah dibanding penjualan Dine-in jika harga jual tidak di-markup dengan
          benar.
        </div>
      </div>

      {/* Channel Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {channelMetrics.map((cm) => {
          const isOjol = ["GoFood", "GrabFood", "ShopeeFood"].includes(cm.channel);
          return (
            <div
              key={cm.channel}
              className={`p-4 rounded-2xl border transition-all ${
                isOjol
                  ? "bg-white border-slate-200 hover:border-amber-400 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {cm.channel}
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {cm.orderCount} Order
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Omzet Kotor:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatRupiah(cm.grossRevenue)}
                  </span>
                </div>
                {cm.platformFeeAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Komisi (20%):</span>
                    <span className="font-mono">-{formatRupiah(cm.platformFeeAmount)}</span>
                  </div>
                )}
                {cm.totalPackagingCost > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Kemasan/Bag:</span>
                    <span className="font-mono">-{formatRupiah(cm.totalPackagingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>HPP Bahan (COGS):</span>
                  <span className="font-mono">-{formatRupiah(cm.cogsAmount)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Laba Bersih:
                  </span>
                  <span className="font-mono font-black text-emerald-600 text-sm">
                    {formatRupiah(cm.contributionProfit)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Margin:</span>
                  <span
                    className={`font-mono font-bold ${
                      cm.contributionMarginPercent > 50
                        ? "text-emerald-600"
                        : cm.contributionMarginPercent > 35
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {cm.contributionMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product-Level Channel Profitability & Markup Engine */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Perbandingan Laba Menu: Dine-In vs. Ojol (Food Apps)
            </h2>
            <p className="text-xs text-slate-500">
              Deteksi menu yang labanya tergerus di aplikasi pengantaran dan lihat rekomendasi harga
              markup ideal.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <span className="font-medium text-slate-600">Simulasi Komisi Ojol:</span>
            <select
              value={customOjolFeeRate}
              onChange={(e) => setCustomOjolFeeRate(Number(e.target.value))}
              className="bg-white font-bold border border-slate-200 rounded px-2 py-1 text-slate-800"
            >
              <option value={15}>15% (Tier Promosi)</option>
              <option value={20}>20% (Standar Industri)</option>
              <option value={25}>25% (Super Partner)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nama Menu</th>
                <th className="px-4 py-3 text-right">Harga Jual (Dine-In)</th>
                <th className="px-4 py-3 text-right">HPP Bahan (Resep)</th>
                <th className="px-4 py-3 text-right">Laba Dine-In (Rp / %)</th>
                <th className="px-4 py-3 text-right">Laba Ojol (Harga Sama)</th>
                <th className="px-4 py-3 text-right">Rekomendasi Harga Ojol</th>
                <th className="px-4 py-3 text-center">Status Laba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {productChannelComparison.map((row) => (
                <tr key={row.product.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    <div>{row.product.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {row.product.category}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-800">
                    {formatRupiah(row.dineInPrice)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                    {formatRupiah(row.cogs)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                    <div>{formatRupiah(row.dineInProfit)}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {row.dineInMargin.toFixed(0)}% margin
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold">
                    <div
                      className={
                        row.isBleeding ? "text-rose-600" : "text-amber-600"
                      }
                    >
                      {formatRupiah(row.ojolProfitSamePrice)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Drop ke {row.ojolMarginSamePrice.toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-indigo-700 bg-indigo-50/40">
                    <div>{formatRupiah(row.targetOjolPrice)}</div>
                    <div className="text-[10px] text-indigo-500 font-normal">
                      +Rp {row.markupAmount.toLocaleString("id-ID")}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.isBleeding ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle size={12} />
                        Margin Tipis di Ojol
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Laba Sehat
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
