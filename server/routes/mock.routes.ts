import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.ts";

export async function mockRoutes(fastify: FastifyInstance) {
  // Customer Loyalty & Points
  fastify.get(
    "/customer/:phone/points",
    async (request: FastifyRequest<{ Params: { phone: string } }>) => {
      const { phone } = request.params;
      return {
        phone,
        customerName: "Pelanggan Prioritas",
        points: 250,
        tier: "Gold",
        eligibleDiscount: 10000,
      };
    },
  );

  // Midtrans Payment Gateway Token
  fastify.post("/midtrans/token", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const orderId = body.orderId || `ORDER-${Date.now()}`;
    return {
      token: `snap-token-${Date.now()}`,
      redirect_url: "#",
      orderId,
      gross_amount: body.grossAmount || 50000,
    };
  });

  // Products & Menu management
  fastify.get("/products", async () => {
    try {
      const menus = await prisma.menu.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      if (menus.length > 0) {
        return menus.map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          category: m.category,
          stock: 99,
          barcode: "",
          isSync: true,
        }));
      }
    } catch {}

    // Fallback default coffee products
    return [
      { id: "p1", name: "Espresso Single Origin", price: 22000, category: "Coffee", stock: 85, barcode: "8991001", isSync: true },
      { id: "p2", name: "Cappuccino Classic", price: 28000, category: "Coffee", stock: 64, barcode: "8991002", isSync: true },
      { id: "p3", name: "Caramel Macchiato", price: 34000, category: "Coffee", stock: 42, barcode: "8991003", isSync: true },
      { id: "p4", name: "Cold Brew Signature", price: 30000, category: "Coffee", stock: 50, barcode: "8991004", isSync: true },
      { id: "p5", name: "Artisan Butter Croissant", price: 25000, category: "Pastry", stock: 20, barcode: "8991005", isSync: true },
      { id: "p6", name: "Matcha Latte Supreme", price: 32000, category: "Non-Coffee", stock: 35, barcode: "8991006", isSync: true },
    ];
  });

  fastify.post("/products", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    try {
      const tenant = await prisma.tenant.findFirst();
      if (tenant && body.name) {
        const created = await prisma.menu.create({
          data: {
            tenantId: tenant.id,
            name: body.name,
            price: Number(body.price) || 0,
            category: body.category || "General",
            isActive: true,
          },
        });
        return { success: true, product: { ...body, id: created.id } };
      }
    } catch {}
    return { success: true, product: { ...body, id: `prod-${Date.now()}` } };
  });

  fastify.all("/products/:id", async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;
    const body = (request.body as any) || {};
    try {
      if (request.method === "DELETE") {
        await prisma.menu.deleteMany({ where: { id } });
        return { success: true };
      }
      if (request.method === "PUT" || request.method === "PATCH") {
        await prisma.menu.updateMany({
          where: { id },
          data: {
            name: body.name,
            price: body.price !== undefined ? Number(body.price) : undefined,
            category: body.category,
          },
        });
        return { success: true, product: { ...body, id } };
      }
    } catch {}
    return { success: true, id };
  });

  // Raw Materials
  fastify.get("/raw-materials", async () => [
    {
      id: "rm1",
      name: "Biji Kopi Arabika Gayo (kg)",
      stock: 15.5,
      stockQuantity: 15.5,
      unit: "kg",
      stockUnit: "kg",
      minStock: 5,
      warningLimit: 5,
      costPerUnit: 120000,
      unitCost: 120000,
      supplierName: "Koperasi Tani Gayo Highland",
      supplierContact: "0812-3456-7890",
    },
    {
      id: "rm2",
      name: "Susu Segar Pasteurisasi (liter)",
      stock: 24,
      stockQuantity: 24,
      unit: "liter",
      stockUnit: "liter",
      minStock: 10,
      warningLimit: 10,
      costPerUnit: 18000,
      unitCost: 18000,
      supplierName: "PT Susu Murni Nusantara",
      supplierContact: "0821-9876-5432",
    },
    {
      id: "rm3",
      name: "Sirup Karamel Monin (botol)",
      stock: 6,
      stockQuantity: 6,
      unit: "botol",
      stockUnit: "botol",
      minStock: 2,
      warningLimit: 2,
      costPerUnit: 145000,
      unitCost: 145000,
      supplierName: "Syrup & Sauce Indonesia Hub",
      supplierContact: "0819-1122-3344",
    },
    {
      id: "rm4",
      name: "Cup & Lid 12oz (pack)",
      stock: 8,
      stockQuantity: 8,
      unit: "pack",
      stockUnit: "pack",
      minStock: 3,
      warningLimit: 3,
      costPerUnit: 35000,
      unitCost: 35000,
      supplierName: "Packaging Express",
      supplierContact: "0811-2233-4455",
    },
  ]);

  fastify.post("/raw-materials", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    return { success: true, item: { ...body, id: `rm-${Date.now()}` } };
  });

  // Inventory Waste
  fastify.post("/inventory-waste", async () => ({ success: true, message: "Pencatatan limbah/waste berhasil disimpan" }));

  // Tables & QR Orders
  fastify.post("/tables/generate", async () => ({ success: true, message: "QR Meja berhasil diperbarui" }));

  fastify.get("/orders/table-public/:token", async (request: FastifyRequest<{ Params: { token: string } }>) => {
    const { token } = request.params;
    return {
      storeName: "LedgerLine Coffee & Roastery",
      tableNumber: token.replace(/[^0-9]/g, "") || "01",
      activeOrder: null,
      currency: "IDR",
    };
  });

  fastify.post("/orders/table-public/checkout", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    return {
      success: true,
      orderId: `TB-${Date.now()}`,
      tableNumber: body.tableNumber || "01",
      message: "Pesanan meja berhasil dikirim ke kasir & kitchen!",
    };
  });

  fastify.post("/table-public/checkout", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    return {
      success: true,
      orderId: `TB-${Date.now()}`,
      tableNumber: body.tableNumber || "01",
      message: "Pesanan meja berhasil dikirim ke kasir & kitchen!",
    };
  });

  fastify.all("/orders/:orderId/confirm-payment", async () => ({ success: true, status: "PAID" }));
  fastify.all("/orders/:orderId/status", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    return { success: true, status: body.status || "COMPLETED" };
  });

  // App Sync State
  fastify.get("/orders/state", async () => {
    return {
      products: [
        { id: "p1", name: "Espresso Single Origin", price: 22000, category: "Coffee", stock: 85, barcode: "8991001", isSync: true },
        { id: "p2", name: "Cappuccino Classic", price: 28000, category: "Coffee", stock: 64, barcode: "8991002", isSync: true },
        { id: "p3", name: "Caramel Macchiato", price: 34000, category: "Coffee", stock: 42, barcode: "8991003", isSync: true },
        { id: "p4", name: "Cold Brew Signature", price: 30000, category: "Coffee", stock: 50, barcode: "8991004", isSync: true },
        { id: "p5", name: "Artisan Butter Croissant", price: 25000, category: "Pastry", stock: 20, barcode: "8991005", isSync: true },
        { id: "p6", name: "Matcha Latte Supreme", price: 32000, category: "Non-Coffee", stock: 35, barcode: "8991006", isSync: true },
      ],
      rawMaterials: [
        {
          id: "rm1",
          name: "Biji Kopi Arabika Gayo (kg)",
          stock: 15.5,
          stockQuantity: 15.5,
          unit: "kg",
          stockUnit: "kg",
          minStock: 5,
          warningLimit: 5,
          costPerUnit: 120000,
          unitCost: 120000,
          supplierName: "Koperasi Tani Gayo Highland",
          supplierContact: "0812-3456-7890",
        },
        {
          id: "rm2",
          name: "Susu Segar Pasteurisasi (liter)",
          stock: 24,
          stockQuantity: 24,
          unit: "liter",
          stockUnit: "liter",
          minStock: 10,
          warningLimit: 10,
          costPerUnit: 18000,
          unitCost: 18000,
          supplierName: "PT Susu Murni Nusantara",
          supplierContact: "0821-9876-5432",
        },
        {
          id: "rm3",
          name: "Sirup Karamel Monin (botol)",
          stock: 6,
          stockQuantity: 6,
          unit: "botol",
          stockUnit: "botol",
          minStock: 2,
          warningLimit: 2,
          costPerUnit: 145000,
          unitCost: 145000,
          supplierName: "Syrup & Sauce Indonesia Hub",
          supplierContact: "0819-1122-3344",
        },
        {
          id: "rm4",
          name: "Cup & Lid 12oz (pack)",
          stock: 8,
          stockQuantity: 8,
          unit: "pack",
          stockUnit: "pack",
          minStock: 3,
          warningLimit: 3,
          costPerUnit: 35000,
          unitCost: 35000,
          supplierName: "Packaging Express",
          supplierContact: "0811-2233-4455",
        },
      ],
      recipes: [],
      tables: [
        { id: "t1", number: "Meja 01", capacity: 4, status: "available" },
        { id: "t2", number: "Meja 02", capacity: 2, status: "available" },
        { id: "t3", number: "Meja 03", capacity: 6, status: "occupied" },
        { id: "t4", number: "Meja 04", capacity: 4, status: "available" },
      ],
      orders: [],
      financeLogs: [],
      appConfig: {
        storeName: "LedgerLine Coffee & Roastery",
        address: "Jl. Veteran No. 45, Jakarta Pusat",
        phone: "0812-3456-7890",
        taxPercentage: 11,
        serviceChargePercentage: 0,
        currency: "IDR",
        enableQrTable: true,
      },
    };
  });

  // Procurement & Market Intelligence
  fastify.get("/procurement/smart-suggestions", async () => [
    {
      id: "sug-1",
      materialName: "Biji Kopi Arabika Gayo",
      currentStock: 15.5,
      recommendedOrder: 20,
      unit: "kg",
      supplierName: "Koperasi Tani Gayo Highland",
      estCost: 2400000,
      urgency: "HIGH",
    },
    {
      id: "sug-2",
      materialName: "Susu Segar Pasteurisasi",
      currentStock: 24,
      recommendedOrder: 40,
      unit: "liter",
      supplierName: "PT Susu Murni Nusantara",
      estCost: 720000,
      urgency: "MEDIUM",
    },
  ]);

  fastify.get("/suppliers/public", async () => [
    { id: "sup-1", name: "Koperasi Tani Gayo Highland", category: "Coffee Beans", rating: 4.9, minOrder: "5 kg", city: "Aceh Tengah" },
    { id: "sup-2", name: "PT Susu Murni Nusantara", category: "Dairy", rating: 4.8, minOrder: "20 Liter", city: "Lembang, Bandung" },
    { id: "sup-3", name: "Syrup & Sauce Indonesia Hub", category: "Syrup & Flavors", rating: 4.7, minOrder: "3 Botol", city: "Surabaya" },
  ]);

  fastify.get("/suppliers/tenant", async () => [
    { id: "sup-1", name: "Koperasi Tani Gayo Highland", category: "Coffee Beans", status: "Active Partner" },
    { id: "sup-2", name: "PT Susu Murni Nusantara", category: "Dairy", status: "Active Partner" },
  ]);

  fastify.get("/purchase-requests/tenant", async () => [
    { id: "pr-101", materialName: "Biji Kopi Arabika Gayo", quantity: 20, status: "APPROVED", date: "2026-09-27" },
  ]);

  fastify.post("/purchase-request", async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    return { success: true, message: "Purchase request berhasil dibuat", data: body };
  });

  // True Cost & BI Analytics
  fastify.get("/cost-engine/true-cost/:id", async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;
    return {
      productId: id,
      hpp: 9500,
      overheadCost: 3000,
      laborCost: 2500,
      totalTrueCost: 15000,
      sellingPrice: 28000,
      grossMarginPct: 46.4,
      shieldLevel: "OPTIMAL",
    };
  });

  fastify.get("/bi/profit-leaks", async () => []);
  fastify.get("/bi/insights", async () => [
    {
      id: "ins-1",
      insightType: "DAILY_SUMMARY",
      summary: "Peluang Margin Caramel Macchiato: Penyesuaian porsi sirup karamel dapat meningkatkan gross margin sebesar 4.2% tanpa menurunkan kepuasan rasa pelanggan.",
      details: {
        revenue: 4250000,
        cost: 1680000,
        tax: 467500,
        realProfit: 2102500,
        transactionCount: 86,
        averageValue: 49418,
      },
      createdAt: new Date().toISOString(),
    },
  ]);
  fastify.get("/bi/benchmarks", async () => [
    {
      id: "bm-1",
      metricName: "COFFEE_HPP_PERCENTAGE",
      averageValue: 28.5,
      top20Value: 22.0,
      sampleSize: 1420,
      periodStart: "2026-09-01",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bm-2",
      metricName: "FOOD_WASTE_PERCENTAGE",
      averageValue: 4.8,
      top20Value: 1.5,
      sampleSize: 980,
      periodStart: "2026-09-01",
      createdAt: new Date().toISOString(),
    },
    {
      id: "bm-3",
      metricName: "AVERAGE_ORDER_VALUE",
      averageValue: 45.0,
      top20Value: 68.0,
      sampleSize: 2150,
      periodStart: "2026-09-01",
      createdAt: new Date().toISOString(),
    },
  ]);
  fastify.post("/bi/trigger-run", async () => ({ success: true, message: "Analisis Auditor Bisnis selesai dijalankan" }));

  fastify.get("/demand/global-demand", async () => ({
    success: true,
    data: {
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
      trends: [
        { menu: "Cold Brew Signature", trend: "+18%", reason: "Cuaca panas siang hari" },
        { menu: "Cappuccino Classic", trend: "+12%", reason: "Waktu sarapan pagi" },
      ],
      alerts: [],
    },
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
    trends: [
      { menu: "Cold Brew Signature", trend: "+18%", reason: "Cuaca panas siang hari" },
      { menu: "Cappuccino Classic", trend: "+12%", reason: "Waktu sarapan pagi" },
    ],
    alerts: [],
  }));

  // AI Assistant Analyze
  fastify.post("/ai/analyze", async () => ({
    analysis: "Performa penjualan outlet sangat stabil. Rekomendasi utama: Tingkatkan bundling minuman Cold Brew + Croissant untuk meningkatkan rata-rata belanja per struk (AOV) sebesar 15%.",
  }));
}
