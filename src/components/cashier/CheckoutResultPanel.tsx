import React, { useState } from "react";
import {
  Search,
  ShoppingBag,
  PlusCircle,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  DollarSign,
  Printer,
  Wifi,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Globe,
  Building,
  ChevronLeft,
} from "lucide-react";

interface CheckoutResultPanelProps {
  setCheckoutResult: (val: any) => void;
  setSplitCount: (val: number) => void;
  checkoutResult: any;
  appConfig: any;
  products: any[];
  splitCount: number;
}

export function CheckoutResultPanel({
  checkoutResult,
  appConfig,
  products,
  splitCount,
  setCheckoutResult,
  setSplitCount,
}: CheckoutResultPanelProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("80mm");
  const triggerCashierToast = (msg: string) => {
    console.log(msg);
  };
  const [interactivePaperTorn, setInteractivePaperTorn] =
    useState<boolean>(false);
  const [printerConnected, setPrinterConnected] = useState<
    "Bluetooth" | "WiFi" | null
  >("Bluetooth");
  const [printingStatus, setPrintingStatus] = useState<boolean>(false);
  const [tempPrinterLog, setTempPrinterLog] = useState<string[]>([]);
  const [receiptType, setReceiptType] = useState<"customer" | "kitchen">(
    "customer",
  );
  const [qrisPaidStatus, setQrisPaidStatus] = useState<"pending" | "success">(
    "pending",
  );
  const [edcStep, setEdcStep] = useState<
    "swipe_insert" | "pin_entry" | "authorizing" | "success"
  >("swipe_insert");
  const [edcBank, setEdcBank] = useState<"BCA" | "Mandiri" | "BRI" | "BNI">(
    "BCA",
  );
  const [edcPin, setEdcPin] = useState<string>("");
  const [edcCardHoldName, setEdcCardHoldName] =
    useState<string>("ASLAM RAMADHAN");
  const [edcCardNumber, setEdcCardNumber] = useState<string>(
    "5221-8890-4432-1109",
  );
  const [edcCardType, setEdcCardType] = useState<"Visa" | "MasterCard" | "GPN">(
    "GPN",
  );
  const [midtransStatus, setMidtransStatus] = useState<
    | "payment_list"
    | "gopay_qris"
    | "va_select"
    | "va_waiting"
    | "cc_form"
    | "cc_otp"
    | "success"
    | "failed"
  >("payment_list");
  const [midtransSelectedBank, setMidtransSelectedBank] = useState<
    "bca" | "mandiri" | "bni" | "bri" | null
  >(null);
  const [midtransCardNumber, setMidtransCardNumber] = useState<string>("");
  const [midtransCardExpiry, setMidtransCardExpiry] = useState<string>("");
  const [midtransCardCvv, setMidtransCardCvv] = useState<string>("");
  const [midtransCcOtpCode, setMidtransCcOtpCode] = useState<string>("");
  const [midtransSimulatedCopiedVa, setMidtransSimulatedCopiedVa] =
    useState<boolean>(false);

  const [selectedPrinterModel, setSelectedPrinterModel] = useState<string>(
    "LedgerLine BP-80M (Bluetooth)",
  );

  // Paper width simulation
  const taxPercent =
    appConfig?.taxType === "NON"
      ? 0
      : appConfig?.taxType === "PB1"
        ? 10
        : appConfig?.taxType === "PPN"
          ? 11
          : appConfig?.taxType === "PPN_12"
            ? 12
            : 11;
  const taxLabel = appConfig?.taxType === "NON" ? "Tax" : appConfig?.taxType;

  // Simulasi & Eksekusi Cetak Struk menggunakan Printer Bluetooth / WiFi
  const handlePrintReceipt = async () => {
    if (!checkoutResult) return;
    setPrintingStatus(true);
    setTempPrinterLog((prev) => [
      ...prev,
      `Mengkoneksikan ke printer ${selectedPrinterModel}...`,
    ]);

    let receiptText = "";
    if ((receiptType as string) === "customer") {
      receiptText = `
-----------------------------------------
      ${appConfig.storeName ? appConfig.storeName.toUpperCase() : "LEDGERLINE BY ASLAM"}
   ${appConfig.storeAddress || "Indonesia"}
      TELP: ${appConfig.storePhone || "0812-9988-7766"}
      ${appConfig.receiptHeader ? `${appConfig.receiptHeader.toUpperCase()}\n` : ""}-----------------------------------------
ID TX  : ${checkoutResult.order.id}
TANGGAL: ${new Date(checkoutResult.order.orderTime).toLocaleString("id-ID")}
KASIR  : Shift Kopi Utama (${printerConnected || "Virtual"} Link)
MEJA   : ${checkoutResult.order.tableNumber}
PRINTER: ${selectedPrinterModel} (${paperWidth})
-----------------------------------------
${checkoutResult.order.items
  .map((item: any) => {
    const prod = products.find((p) => p.id === item.productId);
    return `${prod?.name || "Item"} x${item.quantity}\n          @Rp ${item.priceAtSale.toLocaleString("id-ID")} -> Rp ${(item.priceAtSale * item.quantity).toLocaleString("id-ID")}`;
  })
  .join("\n")}
-----------------------------------------
SUBTOTAL    : Rp ${checkoutResult.order.subtotal.toLocaleString("id-ID")}
DISKON      : Rp ${checkoutResult.order.discount.toLocaleString("id-ID")}
${taxLabel.toUpperCase()} (${taxPercent}%) : Rp ${checkoutResult.order.tax.toLocaleString("id-ID")}
GRAND TOTAL : Rp ${checkoutResult.order.totalPrice.toLocaleString("id-ID")}
-----------------------------------------
METODE BAYAR: ${checkoutResult.order.paymentMethod}
-----------------------------------------
   [SHA-256 ENCRYPTED SIGNATURE AUDIT]
       ${checkoutResult.order.secureHash?.substring(0, 32)}...
-----------------------------------------
      ${appConfig.receiptFooter ? appConfig.receiptFooter.toUpperCase() : "TERIMA KASIH ATAS KUNJUNGANNYA"}
      POWERED BY LEDGERLINE POS
\n\n\n`; // Ekstra Enter untuk Thermal Cutter
    } else {
      receiptText = `
=========================================
        TIKET ANTRIAN DAPUR (KOT)
        KEDAI: ${appConfig.storeName ? appConfig.storeName.toUpperCase() : "ASLAM LEDGER"}
=========================================
ID TRANS : ${checkoutResult.order.id}
TANGGAL  : ${new Date(checkoutResult.order.orderTime).toLocaleDateString("id-ID")} ${new Date(checkoutResult.order.orderTime).toLocaleTimeString("id-ID")}
LOKASI   : ${(checkoutResult.order.tableNumber || "").toUpperCase()}
PRINTER  : ${selectedPrinterModel} (Kitchen Link)
-----------------------------------------
Daftar Antrean Porsi Pembuatan Barista/Dapur:
-----------------------------------------
${checkoutResult.order.items
  .map((item: any, index: number) => {
    const prod = products.find((p) => p.id === item.productId);
    const notesText = item.notes
      ? `   * CATATAN: ${item.notes.toUpperCase()} *`
      : "   (Tanpa instruksi tambahan)";
    return `${index + 1}. [ Qty: ${item.quantity} ] ${prod?.name?.toUpperCase() || "MENU"}\n${notesText}`;
  })
  .join("\n\n")}
-----------------------------------------
* Keamanan & Stok Terverifikasi Sistem POS
=========================================
      HARAP DIPROSES SECEPATNYA!
=========================================
\n\n\n`;
    }

    // Attempt Direct Web Bluetooth ESC/POS if enabled/supported
    if (
      (navigator as any).bluetooth &&
      selectedPrinterModel.toLowerCase().includes("bluetooth")
    ) {
      try {
        setTempPrinterLog((prev) => [
          ...prev,
          `Meminta akses Bluetooth (Pilih Perangkat)...`,
        ]);
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            "000018f0-0000-1000-8000-00805f9b34fb",
            "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
          ], // Standar ID PRINTER THERMAL
        });

        setTempPrinterLog((prev) => [
          ...prev,
          `Terhubung ke Bluetooth: ${device.name}`,
        ]);
        const server = await device.gatt?.connect();

        let targetService;
        const services = await server?.getPrimaryServices();
        if (services && services.length > 0) {
          targetService = services[0];
        }

        if (targetService) {
          const characteristics = await targetService.getCharacteristics();
          // Find Write characteristic (usually without notify)
          const writeCharacteristic = characteristics.find(
            (c: any) => c.properties.write || c.properties.writeWithoutResponse,
          );

          if (writeCharacteristic) {
            setTempPrinterLog((prev) => [
              ...prev,
              `Mengirim data ke ESC/POS Printer...`,
            ]);
            const encoder = new TextEncoder();
            const data = encoder.encode(receiptText);
            // Print commands for ESC/POS (Initialize, Text, Feed Lines)
            const initEsc = new Uint8Array([0x1b, 0x40]);
            await writeCharacteristic.writeValue(initEsc);

            // Chunking because BLE MTU might be 20-512 bytes limit
            for (let i = 0; i < data.length; i += 100) {
              await writeCharacteristic.writeValue(data.slice(i, i + 100));
            }

            setTempPrinterLog((prev) => [
              ...prev,
              `Struk berhasil dicetak di Printer Thermal Bluetooth!`,
            ]);
            setPrintingStatus(false);
            return; // Selesai
          }
        }
      } catch (err: any) {
        setTempPrinterLog((prev) => [
          ...prev,
          `Gagal koneksi Bluetooth Thermal: ${err.message}. Mencoba mode browser dialog fallback...`,
        ]);
      }
    }

    // Fallback Timer Mock / Browser Print
    setTimeout(() => {
      setTempPrinterLog((prev) => [
        ...prev,
        `Koneksi ${selectedPrinterModel} Stabil.`,
        `Transmitting print jobs successfully...`,
        `Cetak ${(receiptType as string) === "customer" ? "Struk Transaksi" : "Tiket Antrean Dapur"} ${checkoutResult.order.id} Selesai!`,
      ]);
      setPrintingStatus(false);

      // Buka dialog printer web browser orisinil untuk real-world hardware compatibility
      const printFriendly = window.open("", "_blank");
      if (printFriendly) {
        const enhancedReceiptHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Cetak Struk</title>
            <style>
              @page { margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 58mm; 
                margin: 0 auto; 
                padding: 10px; 
                font-size: 12px; 
                color: #000;
              }
              .center { text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              .flex-row { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="center">
              <strong>${appConfig.storeName ? appConfig.storeName.toUpperCase() : "LEDGERLINE BY ASLAM"}</strong><br/>
              ${appConfig.storeAddress || "Indonesia"}<br/>
              TELP: ${appConfig.storePhone || "0812-9988-7766"}<br/>
              ${appConfig.receiptHeader ? appConfig.receiptHeader.toUpperCase() + "<br/>" : ""}
            </div>
            <div class="divider"></div>
            <div>ID TX: ${checkoutResult.order.id}</div>
            <div>TANGGAL: ${new Date(checkoutResult.order.orderTime).toLocaleString("id-ID")}</div>
            <div>KASIR: Shift Kopi Utama</div>
            <div>MEJA: ${checkoutResult.order.tableNumber}</div>
            <div class="divider"></div>
            ${checkoutResult.order.items
              .map(
                (item: any) => `
              <div><strong>${item.quantity}x ${item.product.name}</strong></div>
              <div class="flex-row">
                <span>Rp ${item.product.price.toLocaleString("id-ID")}</span>
                <span>Rp ${(item.product.price * item.quantity).toLocaleString("id-ID")}</span>
              </div>
            `,
              )
              .join("")}
            <div class="divider"></div>
            <div class="flex-row"><span>SUBTOTAL:</span><span>Rp ${checkoutResult.order.subtotal.toLocaleString("id-ID")}</span></div>
            <div class="flex-row"><span>DISKON:</span><span>-Rp ${checkoutResult.order.discount.toLocaleString("id-ID")}</span></div>
            <div class="flex-row"><span>PAJAK:</span><span>Rp ${checkoutResult.order.tax.toLocaleString("id-ID")}</span></div>
            <div class="divider"></div>
            <div class="flex-row"><strong>TOTAL:</strong><strong>Rp ${checkoutResult.order.totalPrice.toLocaleString("id-ID")}</strong></div>
            <div class="divider"></div>
            <div class="center">
              Terima Kasih!<br/>
              Simpan struk ini sebagai bukti pembayaran.
            </div>
          </body>
          </html>
        `;
        printFriendly.document.write(enhancedReceiptHTML);
        printFriendly.document.close();
        printFriendly.focus();
        setTimeout(() => {
          printFriendly.print();
          printFriendly.close();
        }, 500);
      }
    }, 1200);
  };

  return (
    <>
      {/* HIGH COMPLEMENTARY PHYSICAL THERMAL PRINTER SIMULATOR */}
      {checkoutResult && (
        <div
          className="bg-[#F1F5F9] border border-slate-300/85 p-5 rounded-2xl shadow-xl space-y-4 animate-fade-in relative overflow-hidden"
          id="checkout-receipt-panel"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Printer size={16} className="text-slate-700 shrink-0" />
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                Internal Thermal Slip Simulator
              </span>
            </div>

            <button
              onClick={() => {
                setCheckoutResult(null);
                setQrisPaidStatus("pending");
              }}
              className="text-slate-400 hover:text-slate-600 font-extrabold text-[10px] uppercase cursor-pointer transition-all"
            >
              Tutup Monitor
            </button>
          </div>

          {/* CONFIG SLIP CONTROLLER TOOLS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] bg-slate-200/50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="text-slate-500 font-bold block mb-1">
                Pilih Model Mesin Print:
              </label>
              <select
                value={selectedPrinterModel}
                onChange={(e) => setSelectedPrinterModel(e.target.value)}
                className="w-full p-1 bg-white border border-slate-300 rounded font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="LedgerLine BP-80M (Bluetooth)">
                  LedgerLine BP-80M (Bluetooth)
                </option>
                <option value="Epson TM-T82X (WiFi-Direct)">
                  Epson TM-T82X (WiFi-Direct)
                </option>
                <option value="Star Micronics WebPrint">
                  Star Micronics WebPrint (REST API)
                </option>
              </select>
            </div>
            <div>
              <label className="text-slate-500 font-bold block mb-1">
                Pilih Output Slip Cetak:
              </label>
              <div className="grid grid-cols-2 gap-1 font-sans text-center">
                <button
                  type="button"
                  onClick={() => setReceiptType("customer")}
                  className={`font-bold py-1 rounded-sm transition-all border text-[9px] cursor-pointer ${
                    (receiptType as string) === "customer"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  Struk Tagihan
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType("kitchen")}
                  className={`font-bold py-1 rounded-sm transition-all border text-[9px] cursor-pointer ${
                    (receiptType as string) === "kitchen"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  Dapur (KOT)
                </button>
              </div>
            </div>
            <div>
              <label className="text-slate-500 font-bold block mb-1">
                Ukuran Kertas Thermal:
              </label>
              <div className="grid grid-cols-2 gap-1 font-sans text-center">
                <button
                  type="button"
                  onClick={() => setPaperWidth("58mm")}
                  className={`font-bold py-1 rounded-sm transition-all border text-[9px] cursor-pointer ${
                    paperWidth === "58mm"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  58mm (Kecil)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth("80mm")}
                  className={`font-bold py-1 rounded-sm transition-all border text-[9px] cursor-pointer ${
                    paperWidth === "80mm"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  80mm (Lebar)
                </button>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN GRID FOR SPLIT LAYOUT WHEN QRIS OR DEBIT CARD METHOD USED */}
          <div
            className={`grid grid-cols-1 ${["QRIS", "Debit"].includes(checkoutResult.order.paymentMethod) ? "lg:grid-cols-12" : ""} gap-5`}
          >
            {/* KOLOM Kiri: Kertas Struk Thermal */}
            <div
              className={`${["QRIS", "Debit"].includes(checkoutResult.order.paymentMethod) ? "lg:col-span-6" : "w-full"} flex items-center justify-center`}
            >
              {!interactivePaperTorn ? (
                <div
                  className="bg-[#FAFAFA] text-slate-900 font-mono text-[10px] p-6 shadow-xs border-r border-l border-slate-200 relative mx-auto overflow-hidden transition-all duration-500"
                  style={{
                    width: paperWidth === "58mm" ? "240px" : "340px",
                    boxShadow: "0px 10px 20px -5px rgba(0,0,0,0.1)",
                    backgroundImage:
                      "radial-gradient(circle, #f3f4f6 1px, transparent 1px)",
                    backgroundSize: "4px 4px",
                  }}
                >
                  {/* Visual Top Jagged Cutout Line */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(45deg,transparent_25%,#e2e8f0_25%,#e2e8f0_50%,transparent_50%,transparent_75%,#e2e8f0_75%)] bg-[size:8px_8px]" />

                  {/* SELECTIVE SLIP RECEIPT CONTENT */}
                  {(receiptType as string) === "customer" ? (
                    /* CUSTOMER BILL RECEIPT */
                    <div className="space-y-4 pt-2 text-center">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 tracking-tight">
                          {appConfig.storeName
                            ? appConfig.storeName.toUpperCase()
                            : "LEDGERLINE BY ASLAM"}
                        </h4>
                        <p className="text-[8px] text-slate-500 leading-tight mt-0.5">
                          {appConfig.storeAddress ||
                            "Kawasan Bisnis Senayan, Jakarta"}
                        </p>
                        <p className="text-[8px] text-slate-500 mt-0.5">
                          Telp: {appConfig.storePhone || "0812-9988-7766"}
                        </p>
                      </div>

                      <div className="text-left space-y-0.5 border-t border-b border-dashed border-slate-300 py-1.5 text-[8px] text-slate-600 font-mono">
                        <p>ID TRANS: {checkoutResult.order.id}</p>
                        <p>
                          TANGGAL :{" "}
                          {new Date(
                            checkoutResult.order.orderTime,
                          ).toLocaleDateString("id-ID")}{" "}
                          {new Date(
                            checkoutResult.order.orderTime,
                          ).toLocaleTimeString("id-ID")}
                        </p>
                        <p>MEJA : {checkoutResult.order.tableNumber}</p>
                        <p>PELAYAN : Barista Kasir (Standard)</p>
                      </div>

                      {/* PRODUCTS LIST thermal style */}
                      <div className="space-y-1.5 text-left text-[9px] font-mono">
                        {checkoutResult.order.items.map((item: any, i: number) => {
                          const prod = products.find(
                            (p) => p.id === item.productId,
                          );
                          return (
                            <div
                              key={i}
                              className="flex justify-between items-start gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold truncate text-slate-800">
                                  {prod?.name || "Menu Porsi"}
                                </span>
                                <span className="block text-[8px] text-slate-500">
                                  {item.quantity} x Rp{" "}
                                  {item.priceAtSale.toLocaleString("id-ID")}
                                </span>
                              </div>
                              <span className="font-bold text-slate-850 shrink-0">
                                Rp{" "}
                                {(
                                  item.priceAtSale * item.quantity
                                ).toLocaleString("id-ID")}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* CALCULATOR LOGS thermal standard */}
                      <div className="border-t border-dashed border-slate-300 pt-2 text-left space-y-0.5 font-bold text-[8px] font-mono">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-500">
                            SUBTOTAL
                          </span>
                          <span className="font-bold text-slate-800">
                            Rp{" "}
                            {checkoutResult.order.subtotal.toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-500">
                            DISKON
                          </span>
                          <span className="font-bold text-slate-800">
                            - Rp{" "}
                            {checkoutResult.order.discount.toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-500">
                            PAJAK PPN 11%
                          </span>
                          <span className="font-bold text-slate-800">
                            Rp{" "}
                            {checkoutResult.order.tax.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-solid border-slate-400 pt-1 text-[9px]">
                          <span className="text-slate-900 font-extrabold">
                            TOTAL KESELURUHAN
                          </span>
                          <span className="text-slate-900 font-extrabold">
                            Rp{" "}
                            {checkoutResult.order.totalPrice.toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-300 pt-2 text-[8px] space-y-0.5 text-center text-slate-500 font-mono">
                        <p className="font-bold text-slate-800">
                          SISTEM PEMBAYARAN:{" "}
                          {checkoutResult.order.paymentMethod}
                        </p>
                        <p>Keamanan Terverifikasi Hash SHA-224</p>
                        <p className="font-mono text-[7px] select-all bg-slate-100 p-0.5 rounded leading-none text-slate-400">
                          {checkoutResult.securityHash || "SECURE_HASH"}
                        </p>
                        <p className="pt-2 font-semibold">
                          *** TERIMA KASIH ***
                        </p>
                        <p className="font-mono text-[7px] text-slate-400 mt-1">
                          POWERED BY LEDGERLINE
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* KITCHEN ONLY PREPARATION TICKET (NO PRICES) */
                    <div className="space-y-4 pt-2 text-center text-slate-900">
                      <div className="border-b-2 border-slate-800 pb-1.5">
                        <h4 className="font-black text-xs text-rose-600 tracking-wider">
                          ** ANTRIAN DAPUR (KOT) **
                        </h4>
                        <p className="text-[7px] text-slate-500 font-extrabold uppercase mt-0.5">
                          KITCHEN PREPARATION TICKET
                        </p>
                      </div>

                      <div className="text-left space-y-0.5 text-[8px] text-slate-700 font-mono bg-slate-100 p-2 rounded-lg">
                        <p className="font-bold text-slate-800">
                          ID TRANS: {checkoutResult.order.id}
                        </p>
                        <p>
                          TANGGAL :{" "}
                          {new Date(
                            checkoutResult.order.orderTime,
                          ).toLocaleDateString("id-ID")}{" "}
                          {new Date(
                            checkoutResult.order.orderTime,
                          ).toLocaleTimeString("id-ID")}
                        </p>
                        <p>
                          LOKASI :{" "}
                          {(
                            checkoutResult.order.tableNumber || ""
                          ).toUpperCase()}
                        </p>
                        <p className="text-rose-650 font-extrabold border-t border-dashed border-slate-300 pt-1 mt-1 font-mono">
                          KHUSUS PROSES DAPUR (RAHASIA FINANSIAL)
                        </p>
                      </div>

                      {/* PRODUCTS LIST thermal style without pricing */}
                      <div className="space-y-3.5 text-left text-[9px] pt-1 font-mono">
                        {checkoutResult.order.items.map((item: any, i: number) => {
                          const prod = products.find(
                            (p) => p.id === item.productId,
                          );
                          return (
                            <div
                              key={i}
                              className="border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0"
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-black text-[12px] text-slate-900 leading-tight">
                                  [ Qty: {item.quantity} ]{" "}
                                  {prod?.name?.toUpperCase() || "PORSI MENU"}
                                </span>
                              </div>
                              {item.notes ? (
                                <span className="block text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded p-1 mt-1 font-sans">
                                  👉 NOTE: "{item.notes.toUpperCase()}"
                                </span>
                              ) : (
                                <span className="block text-[7px] text-slate-400 mt-0.5 italic">
                                  (Tidak Ada Catatan Khusus)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t-2 border-dashed border-slate-300 pt-3 text-[8px] space-y-0.5 text-center text-slate-500 font-mono">
                        <p className="font-bold text-slate-800 uppercase tracking-wider font-sans bg-rose-100 text-rose-700 py-1 rounded">
                          DAPUR MENERIMA HASIL PRINT SAJA
                        </p>
                        <p className="font-mono text-[7px] text-slate-400 pt-1">
                          Sistem Otomasi Dapur • Ledger Line by Aslam
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Interactive Scissors Overlay on Hover to Tear Paper */}
                  <button
                    onClick={() => setInteractivePaperTorn(true)}
                    className="absolute inset-x-0 bottom-0 bg-slate-900/90 text-white font-extrabold text-[10px] py-1.5 flex items-center justify-center gap-1.5 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-200"
                  >
                    ✂️ Gunting & Sobek Slip Dapur / Kasir
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 animate-fade-in w-full max-w-[300px]">
                  <p className="text-xs font-bold text-emerald-600">
                    ✂️ Slip Berhasil Disobek!
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                    Kertas antrean dicetak & diserahkan langsung. Dapur akan
                    merespon tiket fisik ini.
                  </p>
                  <button
                    onClick={() => setInteractivePaperTorn(false)}
                    className="mt-3 px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-200 cursor-pointer"
                  >
                    Pasang Kertas Baru
                  </button>
                </div>
              )}
            </div>

            {/* KOLOM Kanan: HIGH RESOLUTION QRIS STAND TABLETOP SIMULATOR */}
            {checkoutResult.order.paymentMethod === "QRIS" && (
              <div className="lg:col-span-6 flex flex-col justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-md">
                {/* QRIS BRAND STANDARD BANNER */}
                <div className="w-full bg-[#E11D48] text-white p-3 rounded-lg text-center shadow-xs">
                  <div className="flex justify-between items-center text-left">
                    <span className="text-[14px] font-black tracking-widest font-sans leading-none">
                      QRIS
                    </span>
                    <span className="text-[8px] font-mono opacity-90 leading-tight text-right uppercase">
                      Sistem GPN Indonesia
                    </span>
                  </div>
                  <p className="text-[7px] uppercase font-bold tracking-tight mt-0.5 text-center leading-none opacity-90">
                    Quick Response Code Indonesian Standard
                  </p>
                </div>

                {/* Merchant / Stand Info */}
                <div className="text-center my-2.5">
                  <h5 className="font-extrabold text-[11px] text-slate-900 tracking-tight uppercase">
                    {appConfig.storeName
                      ? appConfig.storeName.toUpperCase()
                      : "ASLAM'S LEDGER"}
                  </h5>
                  <p className="text-[8px] text-slate-400 font-mono tracking-wider leading-none">
                    NMID : ID102435799100 • ASLAM_POS
                  </p>
                  <div className="h-[1px] bg-slate-150 w-24 mx-auto mt-1.5" />
                </div>

                {/* QRIS Code Box */}
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center justify-center relative group min-h-[160px]">
                  {qrisPaidStatus === "success" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center text-emerald-600 animate-fade-in gap-1.5 p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle2
                        size={36}
                        className="text-emerald-500 animate-bounce"
                      />
                      <p className="text-[11px] font-black uppercase tracking-wide">
                        Pembayaran Sukses!
                      </p>
                      <p className="text-[8px] text-slate-500 font-semibold leading-normal">
                        Dana senilai{" "}
                        <strong>
                          Rp{" "}
                          {checkoutResult.order.totalPrice.toLocaleString(
                            "id-ID",
                          )}
                        </strong>{" "}
                        berhasil dikreditkan ke buku kas utama Aslam.
                      </p>
                    </div>
                  ) : (
                    <>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=1e293b&data=00020101021226500016ID.CO.ASLAM.LEDGER011893075200026207015512345678901235204581153033605406${checkoutResult.order.totalPrice}5802ID5915ASLAM%20LEDGER%20POS6007JAKARTA6304`}
                        alt="Dynamic QRIS QR Code"
                        referrerPolicy="no-referrer"
                        className="w-36 h-36"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/400x400/f8fafc/94a3b8?text=Produk+Tanpa+Foto";
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-1 flex justify-center">
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono text-[7px] font-black rounded shadow-xs uppercase tracking-wider animate-pulse">
                          DINAMIS SIMULATOR
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Invoice / Billing pricing container */}
                <div className="text-center w-full my-2 space-y-0.5 font-sans">
                  <p className="text-[7.5px] text-slate-400 uppercase font-bold tracking-widest font-mono">
                    TOTAL TAGIHAN NOMINAL
                  </p>
                  <p className="text-sm font-black text-slate-900 font-mono tracking-tight text-[#1E293B]">
                    Rp {checkoutResult.order.totalPrice.toLocaleString("id-ID")}
                  </p>
                  {qrisPaidStatus === "pending" && (
                    <div className="flex justify-center items-center gap-1 mt-0.5 text-[8px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 w-max mx-auto border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span>Menunggu pembayaran HP pengunjung...</span>
                    </div>
                  )}
                </div>

                {/* Simulation Controls for Teller/Guest */}
                <div className="w-full space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {qrisPaidStatus === "pending" ? (
                    <button
                      onClick={() => setQrisPaidStatus("success")}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs shadow-emerald-500/10 animate-fade-in"
                    >
                      <CheckCircle2 size={11} />
                      Konfirmasi Pembayaran QRIS Diterima
                    </button>
                  ) : (
                    <button
                      onClick={() => setQrisPaidStatus("pending")}
                      className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      🔄 Ganti Dynamic QRIS (Reset)
                    </button>
                  )}
                  <p className="text-[7px] text-slate-400 text-center font-mono leading-none">
                    QRIS ini dinamis, berubah otomatis mengikuti jumlah billing
                    pesanan.
                  </p>
                </div>
              </div>
            )}

            {/* KOLOM Kanan: HIGH RESOLUTION EDC TERMINAL BANK SIMULATOR */}
            {checkoutResult.order.paymentMethod === "Debit" && (
              <div className="lg:col-span-6 flex flex-col justify-between p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden min-h-[440px] font-sans">
                {/* GLOW DECORATIONS */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

                {/* BANK CORRESPONDING ACCENT BAR */}
                <div
                  className={`w-full p-2.5 rounded-xl text-center shadow-lg transition-all duration-300 ${
                    edcBank === "BCA"
                      ? "bg-blue-600 text-white"
                      : edcBank === "Mandiri"
                        ? "bg-[#1E3A8A] text-[#FBBF24] border border-[#FBBF24]/30"
                        : edcBank === "BRI"
                          ? "bg-blue-800 text-white border-b-2 border-orange-500"
                          : "bg-teal-700 text-white"
                  }`}
                >
                  <div className="flex justify-between items-center text-left">
                    <span className="text-xs font-black tracking-widest font-mono">
                      EDC TERMINAL
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-white/10 px-2 py-0.5 rounded">
                      {edcBank} NETWORK
                    </span>
                  </div>
                  <div className="flex gap-1.5 justify-center items-center mt-1.5 text-[8px] tracking-wider uppercase font-extrabold opacity-95">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Mencari Sinyal GPRS/Ethernet... OK
                  </div>
                </div>

                {/* SIMULATOR SCREEN CONTENT (INSIDE CONSOLE LCD DISPLAY) */}
                <div className="bg-[#0b101d] p-3.5 my-3 rounded-xl border border-slate-800 shadow-inner min-h-[175px] flex flex-col justify-between font-mono text-[10px]">
                  {/* Header */}
                  <div className="flex justify-between items-center text-[#64748B] text-[8px] pb-1 border-b border-white/5">
                    <span>{edcBank} COMMERCE V8.4</span>
                    <span className="animate-pulse">● ONLINE</span>
                  </div>

                  {/* Step-by-Step Display Viewports */}
                  {edcStep === "swipe_insert" && (
                    <div className="space-y-2.5 my-auto text-center py-2 animate-fade-in">
                      <p className="text-[#38BDF8] font-bold text-xs uppercase tracking-wide">
                        SILAKAN TRANSAKSI
                      </p>
                      <p className="text-white text-[11px] leading-relaxed">
                        Masukkan kartu chip Anda ke bawah, gesek pita magnetik,
                        atau tempelkan e-wallet/HP (NFC Pay)
                      </p>
                      <div className="bg-slate-950/80 p-2 rounded border border-white/5 space-y-0.5">
                        <p className="text-[8px] text-slate-500 uppercase font-bold">
                          Total Nominal EDC
                        </p>
                        <p className="text-[#10B981] font-bold text-sm">
                          Rp{" "}
                          {checkoutResult.order.totalPrice.toLocaleString(
                            "id-ID",
                          )}
                        </p>
                      </div>

                      {/* Quick Simulated Actions */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            setEdcCardType("GPN");
                            setEdcCardNumber("5221-8890-4432-1109");
                            setEdcCardHoldName("ASLAM RAMADHAN");
                            setEdcStep("pin_entry");
                          }}
                          className="p-1 px-2 bg-slate-850 hover:bg-slate-800 rounded border border-white/10 text-[9px] text-[#A7F3D0] active:scale-95 transition-all cursor-pointer font-bold"
                        >
                          💳 Tempel GPN Debit (NFC)
                        </button>
                        <button
                          onClick={() => {
                            setEdcCardType("Visa");
                            setEdcCardNumber("4112-9023-1188-7561");
                            setEdcCardHoldName("ASLAM CLIENT GOLD");
                            setEdcStep("pin_entry");
                          }}
                          className="p-1 px-2 bg-slate-850 hover:bg-slate-800 rounded border border-white/10 text-[9px] text-[#93C5FD] active:scale-95 transition-all cursor-pointer font-bold"
                        >
                          💳 Gesek Kartu Visa Gold
                        </button>
                      </div>
                    </div>
                  )}

                  {edcStep === "pin_entry" && (
                    <div className="space-y-2 my-auto py-1 animate-fade-in text-center">
                      <p className="text-[#FBBF24] font-bold text-xs tracking-wide">
                        MASUKKAN PIN DEBIT
                      </p>
                      <p className="text-slate-400 text-[9px] leading-normal font-sans">
                        Silakan mintakan pelanggan memasukkan 6-digit PIN
                        keamanan melalui Keyboard PinPad di bawah.
                      </p>

                      <div className="flex justify-center gap-1.5 my-2">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-xs ${
                              edcPin.length > idx
                                ? "bg-amber-400 border-amber-500 text-slate-950 animate-pulse"
                                : "bg-slate-950 border-slate-800 text-slate-705"
                            }`}
                          >
                            {edcPin.length > idx ? "●" : ""}
                          </div>
                        ))}
                      </div>

                      <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-none font-bold">
                        KARTU: {edcCardType} • {edcCardNumber.substring(14)}
                      </p>
                    </div>
                  )}

                  {edcStep === "authorizing" && (
                    <div className="space-y-2.5 my-auto text-center py-4 animate-fade-in flex flex-col items-center">
                      <RefreshCw
                        size={24}
                        className="text-[#38BDF8] animate-spin"
                      />
                      <div>
                        <p className="text-[#38BDF8] font-bold text-xs uppercase tracking-widest font-mono">
                          DIAL HOST...
                        </p>
                        <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                          Meminta otorisasi pin {edcBank} Bank Network...
                        </p>
                      </div>
                      <div className="bg-slate-950/50 px-3 py-1 rounded text-[8px] text-[#A7F3D0] border border-[#A7F3D0]/10">
                        ID TRACE : {Math.floor(100000 + Math.random() * 900000)}
                      </div>
                    </div>
                  )}

                  {edcStep === "success" && (
                    <div className="space-y-1.5 my-auto text-center animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center mx-auto mb-1">
                        <CheckCircle2
                          size={18}
                          className="text-[#10B981] animate-bounce"
                        />
                      </div>
                      <p className="text-[#10B981] font-bold text-xs tracking-wider uppercase">
                        DITERIMA / APPROVED
                      </p>

                      <div className="bg-slate-950/80 p-2.5 rounded border border-white/5 text-left text-[8px] space-y-0.5 text-slate-350 font-mono text-slate-300">
                        <p>
                          APPR CODE:{" "}
                          {Math.floor(100000 + Math.random() * 900000)
                            .toString(16)
                            .toUpperCase()}
                        </p>
                        <p>
                          KARTU : {edcCardType} ({edcCardNumber})
                        </p>
                        <p>NAMA : {edcCardHoldName}</p>
                        <p>
                          NOMINAL : Rp{" "}
                          {checkoutResult.order.totalPrice.toLocaleString(
                            "id-ID",
                          )}
                        </p>
                      </div>

                      <p className="text-[7.5px] text-slate-500 font-sans leading-none">
                        Transaksi aman bersertifikat Bank GPN Indonesia & OJK.
                      </p>
                    </div>
                  )}

                  {/* Footer LCD */}
                  <div className="flex justify-between items-center text-[#64748B] text-[7px] pt-1 border-t border-white/5">
                    <span>MERCHANT: LEDGERLINE_ASLAM</span>
                    <span>TRACE : 202605</span>
                  </div>
                </div>

                {/* BANK SELECTOR CHIPS - ONLY SHOW IN IDLE/SWIPE_INSERT & SUCCESS RESET */}
                {edcStep === "swipe_insert" && (
                  <div className="space-y-1 pb-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      PILIH JARINGAN BANK EDC:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(["BCA", "Mandiri", "BRI", "BNI"] as const).map((b) => (
                        <button
                          key={b}
                          onClick={() => setEdcBank(b)}
                          className={`p-1 py-1.5 text-[8.5px] font-extrabold rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            edcBank === b
                              ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* EDC NUMERIC KEYBOARD/PINPAD PANEL */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 shadow-inner">
                  <div className="grid grid-cols-3 gap-1.5 text-slate-300 font-mono">
                    {/* Numeric rows */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        disabled={edcStep !== "pin_entry" || edcPin.length >= 6}
                        onClick={() => {
                          setEdcPin((prev) => prev + num.toString());
                        }}
                        className="py-1.5 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 rounded-xl text-center font-black transition-all cursor-pointer text-xs flex items-center justify-center active:scale-90"
                      >
                        {num}
                      </button>
                    ))}

                    {/* CANCEL (Red) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEdcStep("swipe_insert");
                        setEdcPin("");
                      }}
                      className="py-1.5 bg-rose-900/80 hover:bg-rose-900 border border-rose-800 rounded-xl text-slate-100 font-black transition-all cursor-pointer text-[8px] flex items-center justify-center uppercase tracking-wide tracking-tighter"
                    >
                      Batal
                    </button>

                    {/* 0 */}
                    <button
                      type="button"
                      disabled={edcStep !== "pin_entry" || edcPin.length >= 6}
                      onClick={() => {
                        setEdcPin((prev) => prev + "0");
                      }}
                      className="py-1.5 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 border border-slate-800 rounded-xl text-center font-black transition-all cursor-pointer text-xs flex items-center justify-center active:scale-90"
                    >
                      0
                    </button>

                    {/* CLEAR (Yellow) */}
                    <button
                      type="button"
                      disabled={edcStep !== "pin_entry"}
                      onClick={() => {
                        setEdcPin("");
                      }}
                      className="py-1.5 bg-amber-600/80 hover:bg-amber-600 border border-amber-500 rounded-xl text-slate-950 font-black transition-all cursor-pointer text-[8px] flex items-center justify-center uppercase tracking-wide tracking-tighter"
                    >
                      Hapus
                    </button>

                    {/* ENTER KEY (Large bottom wide or corner button - Green) */}
                    <button
                      type="button"
                      disabled={edcStep !== "pin_entry"}
                      onClick={() => {
                        if (edcPin.length < 6) {
                          triggerCashierToast(
                            "PIN Debit Bank wajib terdiri dari 6 digit keamanan!",
                          );
                          return;
                        }
                        setEdcStep("authorizing");
                        setTimeout(() => {
                          setEdcStep("success");
                        }, 1800);
                      }}
                      className="col-span-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 border border-emerald-500 rounded-xl text-slate-950 font-black transition-all cursor-pointer text-[10px] flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <CheckCircle2 size={11} />
                      Kirim PIN & Otorisasi Bank (Enter)
                    </button>
                  </div>
                </div>

                {/* BOTTOM RESET OPTION */}
                {edcStep === "success" && (
                  <button
                    onClick={() => {
                      setEdcStep("swipe_insert");
                      setEdcPin("");
                    }}
                    className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all text-center.5 flex justify-center items-center gap-1 text-slate-300 cursor-pointer"
                  >
                    🔄 Reset / Mulai Ulang EDC
                  </button>
                )}
              </div>
            )}

            {/* KOLOM Kanan: HIGH RESOLUTION MIDTRANS SNAP PAY GATEWAY SIMULATOR */}
            {checkoutResult.order.paymentMethod === "Midtrans" && (
              <div className="lg:col-span-6 flex flex-col bg-[#F3F4F6] text-slate-800 rounded-2xl border border-slate-300 shadow-xl overflow-hidden min-h-[480px] font-sans">
                {/* SNAP HEADER BAR */}
                <div className="bg-[#1E293B] text-white p-3 px-4 flex justify-between items-center text-xs border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center font-bold text-[10px] text-white">
                      M
                    </div>
                    <div>
                      <p className="font-extrabold tracking-wide text-[10px] uppercase">
                        Midtrans Snap
                      </p>
                      <p className="text-[7.5px] text-slate-400">
                        Secure Payment Sandbox
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[8.5px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    SECURE SHIELD ACTIVE
                  </div>
                </div>

                {/* SNAP TRANSACTION BRIEF */}
                <div className="bg-white p-3.5 border-b border-slate-200 shadow-xs flex justify-between items-center text-xs">
                  <div className="space-y-0.5 animate-pulse-slow">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">
                      Merchant Name
                    </p>
                    <p className="font-extrabold text-slate-800">
                      {appConfig.storeName || "LedgerLine Co."}
                    </p>
                    <p className="text-[8.5px] text-slate-500 font-mono">
                      Order ID: {checkoutResult.order.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">
                      Total Tagihan
                    </p>
                    <p className="text-sm font-black text-blue-600 font-mono">
                      Rp{" "}
                      {checkoutResult.order.totalPrice.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[8.5px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded mt-0.5 inline-block text-[7.5px] uppercase border border-amber-200">
                      Sandbox Mode
                    </p>
                  </div>
                </div>

                {/* SNAP SIMULATOR MAIN CONTENT VIEWPORT */}
                <div className="flex-1 p-3.5 flex flex-col justify-between">
                  {/* View 1: Main Menu Payment Selection List */}
                  {midtransStatus === "payment_list" && (
                    <div className="space-y-2.5 animate-fade-in my-auto">
                      <p className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest font-sans">
                        Pilih Metode Pembayaran Sandbox:
                      </p>

                      {/* Option 1: Gopay / QRIS */}
                      <button
                        onClick={() => setMidtransStatus("gopay_qris")}
                        className="w-full p-2.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-xl flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📱</span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              GoPay / QRIS Instan
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Bayar cepat dengan scan QR code otomatis
                            </p>
                          </div>
                        </div>
                        <span className="text-slate-400 font-bold">➔</span>
                      </button>

                      {/* Option 2: Virtual Account (Transfer Bank) */}
                      <button
                        onClick={() => setMidtransStatus("va_select")}
                        className="w-full p-2.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-xl flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🏢</span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              Virtual Account (VA)
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Transfer otomatis dari BCA, Mandiri, BNI, BRI
                            </p>
                          </div>
                        </div>
                        <span className="text-slate-400 font-bold">➔</span>
                      </button>

                      {/* Option 3: Credit Card Online */}
                      <button
                        onClick={() => setMidtransStatus("cc_form")}
                        className="w-full p-2.5 bg-white hover:bg-slate-50 border border-slate-250 rounded-xl flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">💳</span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">
                              Kartu Kredit / Debit Online
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Transaksi online menggunakan kartu Visa/Mastercard
                            </p>
                          </div>
                        </div>
                        <span className="text-slate-400 font-bold">➔</span>
                      </button>
                    </div>
                  )}

                  {/* View 2: Gopay / QRIS View */}
                  {midtransStatus === "gopay_qris" && (
                    <div className="space-y-3 p-3 bg-white rounded-xl border border-slate-200 animate-fade-in flex flex-col items-center justify-center text-center">
                      <button
                        onClick={() => setMidtransStatus("payment_list")}
                        className="self-start text-[8.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft size={12} /> Kembali ke Menu Utama
                      </button>

                      <p className="font-bold text-xs text-slate-800">
                        Pembayaran dengan GoPay / QRIS
                      </p>

                      {/* QRIS Code Box */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-350 border-dashed relative overflow-hidden flex flex-col items-center">
                        <QrCode size={110} className="text-slate-900" />
                        <span className="mt-1.5 text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                          MIDTRANS COMMERCIAL QRIS
                        </span>
                      </div>

                      <p className="text-[9px] text-slate-400 max-w-[280px] leading-relaxed">
                        Pindai kode QRIS di atas dengan aplikasi GoPay, OVO,
                        Dana, atau mobile banking pelanggan untuk pembayaran.
                      </p>

                      <button
                        onClick={() => {
                          setMidtransStatus("success");
                          triggerCashierToast(
                            "✅ Pembayaran via GoPay / QRIS Midtrans berhasil diotorisasi!",
                          );
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md flex justify-center items-center gap-1.5 active:scale-95 text-center"
                      >
                        <CheckCircle2 size={12} />
                        Konfirmasi Pembayaran GoPay Diterima
                      </button>
                    </div>
                  )}

                  {/* View 3: Virtual Account Bank Selection */}
                  {midtransStatus === "va_select" && (
                    <div className="space-y-2.5 animate-fade-in">
                      <button
                        onClick={() => setMidtransStatus("payment_list")}
                        className="text-[8.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer mb-1"
                      >
                        <ChevronLeft size={12} /> Kembali ke Menu Utama
                      </button>

                      <p className="text-[10px] font-extrabold text-[#1E3A8A] uppercase tracking-wide">
                        Pilih Rekening Bank Virtual Account (VA):
                      </p>

                      {(["bca", "mandiri", "bni", "bri"] as const).map(
                        (bank) => (
                          <button
                            key={bank}
                            onClick={() => {
                              setMidtransSelectedBank(bank);
                              setMidtransStatus("va_waiting");
                            }}
                            className="w-full p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-12 text-center font-black uppercase text-[9px] tracking-wider py-1 px-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-mono">
                                {bank}
                              </span>
                              <div>
                                <p className="font-bold text-xs text-slate-800">
                                  {bank.toUpperCase()} Virtual Account
                                </p>
                                <p className="text-[8.5px] text-slate-400">
                                  Verifikasi otomatis tanpa perlu upload bukti
                                  transfer
                                </p>
                              </div>
                            </div>
                            <span className="text-slate-400 font-bold">➔</span>
                          </button>
                        ),
                      )}
                    </div>
                  )}

                  {/* View 4: Virtual Account Waiting/Paying Page */}
                  {midtransStatus === "va_waiting" && (
                    <div className="space-y-3 p-3 bg-white rounded-xl border border-slate-200 animate-fade-in">
                      <button
                        onClick={() => setMidtransStatus("va_select")}
                        className="text-[8.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft size={12} /> Kembali ke Pilihan Bank
                      </button>

                      <div className="bg-slate-55 p-3 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-800">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-bold uppercase">
                            Bank Penerima
                          </span>
                          <span className="font-black font-mono text-blue-800 uppercase px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                            {midtransSelectedBank?.toUpperCase() || "VA BANK"}
                          </span>
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-2 text-center">
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            Nomor Virtual Account
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <strong className="font-mono text-sm tracking-widest text-[#1E3A8A]">
                              8821{" "}
                              {checkoutResult.order.id
                                .replace(/[^0-9]/g, "")
                                .slice(0, 8) || "17482938"}
                            </strong>
                            <button
                              onClick={() => {
                                setMidtransSimulatedCopiedVa(true);
                                setTimeout(
                                  () => setMidtransSimulatedCopiedVa(false),
                                  2000,
                                );
                                triggerCashierToast(
                                  "📋 Nomor Virtual Account berhasil disalin!",
                                );
                              }}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-mono text-[8px] font-black uppercase text-slate-700 cursor-pointer"
                            >
                              {midtransSimulatedCopiedVa ? "Tersalin" : "Salin"}
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-slate-200 pt-2 text-[8px] text-slate-400 space-y-1">
                          <p className="font-bold text-slate-500 text-[8.5px] mb-0.5 uppercase">
                            Langkah Transfer Pembayaran:
                          </p>
                          <p>1. Salin nomor Virtual Account di atas.</p>
                          <p>
                            2. Gunakan aplikasi Mobile Banking / ATM lalu pilih
                            menu Transfer Ke Virtual Account.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setMidtransStatus("success");
                          triggerCashierToast(
                            "✅ Transfer Virtual Account Midtrans berhasil diverifikasi otomatis!",
                          );
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md flex justify-center items-center gap-1.5 active:scale-95 text-center"
                      >
                        <CheckCircle2 size={12} />
                        Konfirmasi Penerimaan Transfer VA
                      </button>
                    </div>
                  )}

                  {/* View 5: Credit Card entry Form */}
                  {midtransStatus === "cc_form" && (
                    <div className="space-y-3 p-3 bg-white rounded-xl border border-slate-200 animate-fade-in">
                      <button
                        onClick={() => setMidtransStatus("payment_list")}
                        className="text-[8.5px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft size={12} /> Kembali ke Menu Utama
                      </button>

                      <p className="font-bold text-xs text-slate-800">
                        Pembayaran dengan Kartu Kredit
                      </p>

                      <div className="space-y-2 text-slate-700">
                        {/* Card Number Input */}
                        <div className="space-y-0.5">
                          <label className="text-[8.5px] font-bold uppercase text-slate-400">
                            Nomor Kartu (Visa/Mastercard)
                          </label>
                          <input
                            type="text"
                            placeholder="4111 2222 3333 4444"
                            value={midtransCardNumber}
                            onChange={(e) =>
                              setMidtransCardNumber(
                                e.target.value.replace(/[^0-9\s]/g, ""),
                              )
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-200 focus:outline-hidden text-xs rounded-lg font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white"
                          />
                        </div>

                        {/* Expiry and CVV */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[8.5px] font-bold uppercase text-slate-400">
                              Masa Berlaku
                            </label>
                            <input
                              type="text"
                              placeholder="MM / YY"
                              maxLength={5}
                              value={midtransCardExpiry}
                              onChange={(e) =>
                                setMidtransCardExpiry(e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 focus:outline-hidden text-xs rounded-lg font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white text-center"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[8.5px] font-bold uppercase text-slate-400">
                              CVV
                            </label>
                            <input
                              type="password"
                              placeholder="123"
                              maxLength={3}
                              value={midtransCardCvv}
                              onChange={(e) =>
                                setMidtransCardCvv(
                                  e.target.value.replace(/[^0-9]/g, ""),
                                )
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-200 focus:outline-hidden text-xs rounded-lg font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (
                            !midtransCardNumber.trim() ||
                            midtransCardNumber.length < 12
                          ) {
                            triggerCashierToast("⚠️ Nomor kartu tidak valid!");
                            return;
                          }
                          setMidtransStatus("cc_otp");
                        }}
                        className="w-full mt-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md flex justify-center items-center gap-1.5 active:scale-95"
                      >
                        💳 Bayar Sekarang via Kartu
                      </button>
                    </div>
                  )}

                  {/* View 6: 3D Secure Card OTP Verification Screen */}
                  {midtransStatus === "cc_otp" && (
                    <div className="space-y-3 p-4 bg-blue-50 text-slate-800 text-slate-700 rounded-xl border border-blue-200 animate-fade-in text-center">
                      <p className="font-extrabold text-xs text-[#1E3A8A] flex items-center justify-center gap-1">
                        🌐 3D-SECURE VERIFICATION
                      </p>
                      <p className="text-[9px] text-slate-500 leading-normal font-sans">
                        Silakan masukkan kode OTP yang dikirimkan bank sebagai
                        otentikasi transaksi.
                      </p>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 max-w-[240px] mx-auto space-y-1.5 relative overflow-hidden">
                        <p className="text-[8px] text-slate-404 uppercase font-black tracking-wider">
                          Masukkan OTP 6-Digit
                        </p>
                        <input
                          type="text"
                          placeholder="123456"
                          maxLength={6}
                          value={midtransCcOtpCode}
                          onChange={(e) =>
                            setMidtransCcOtpCode(
                              e.target.value.replace(/[^0-9]/g, ""),
                            )
                          }
                          className="w-full px-3 py-1 bg-slate-50 border rounded-lg font-mono text-center font-bold text-sm tracking-widest focus:outline-hidden focus:bg-white text-slate-800"
                        />
                        <p className="text-[7px] text-slate-450">
                          Kode simulasi default:{" "}
                          <strong className="font-bold">123456</strong>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setMidtransStatus("cc_form")}
                          className="flex-1 py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] rounded-lg transition-all cursor-pointer uppercase font-sans font-black text-center"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => {
                            if (
                              midtransCcOtpCode !== "123456" &&
                              midtransCcOtpCode.trim() !== ""
                            ) {
                              triggerCashierToast(
                                "❌ OTP salah! Gunakan kode 123456 atau kosongkan.",
                              );
                              return;
                            }
                            setMidtransStatus("success");
                            triggerCashierToast(
                              "✅ Pembayaran Kartu Kredit Midtrans 3D-Secure sukses!",
                            );
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[9.5px] rounded-lg transition-all cursor-pointer uppercase tracking-wider flex justify-center items-center gap-1 active:scale-95 text-center"
                        >
                          <CheckCircle2 size={12} /> Kirim OTP
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View 7: Midtrans Snap Payment Transaction Successful! */}
                  {midtransStatus === "success" && (
                    <div className="space-y-3 p-4 bg-emerald-50 text-slate-800 rounded-xl border border-emerald-200 animate-fade-in text-center mx-auto max-w-[340px] py-4 shadow-xs">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2
                          size={22}
                          className="text-emerald-600 animate-bounce"
                        />
                      </div>

                      <div>
                        <p className="text-emerald-700 font-extrabold text-xs uppercase tracking-widest leading-none">
                          TRANSAKSI APPROVED
                        </p>
                        <p className="text-[9px] text-emerald-505 tracking-normal mt-1 leading-none">
                          Pembayaran Berhasil / Success
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-100 text-left font-mono text-[8px] space-y-1 text-slate-600">
                        <p className="flex justify-between border-b pb-0.5">
                          <span className="font-sans font-semibold text-slate-400">
                            METODE
                          </span>
                          <strong className="text-slate-850">
                            MIDTRANS SNAP
                          </strong>
                        </p>
                        <p className="flex justify-between border-b pb-0.5">
                          <span className="font-sans font-semibold text-slate-400">
                            REF NO.
                          </span>
                          <strong className="text-slate-850">
                            {checkoutResult.order.id}
                          </strong>
                        </p>
                        <p className="flex justify-between border-b pb-0.5">
                          <span className="font-sans font-semibold text-slate-400">
                            TOTAL
                          </span>
                          <strong className="text-emerald-600 text-[10px]">
                            Rp{" "}
                            {checkoutResult.order.totalPrice.toLocaleString(
                              "id-ID",
                            )}
                          </strong>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          // Reset state pembelanjaan kembali ke awal
                          setMidtransStatus("payment_list");
                          setMidtransSelectedBank(null);
                          setMidtransCardNumber("");
                          setMidtransCardExpiry("");
                          setMidtransCardCvv("");
                          setMidtransCcOtpCode("");

                          triggerCashierToast(
                            "📋 Transaksi Midtrans selesai. Printer struk siap diaktifkan.",
                          );
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9.5px] uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95 flex justify-center items-center gap-1.5 text-center"
                      >
                        🔄 Selesai & Buka Antrian POS
                      </button>
                    </div>
                  )}
                </div>

                {/* SNAP SECURITY FOOTER */}
                <div className="bg-white px-4 py-2 text-[7.5px] text-slate-400 text-center font-bold font-sans border-t border-slate-200 flex justify-between items-center shrink-0">
                  <span>
                    © {appConfig.storeName || "LEDGERLINE"} • MIDTRANS
                    COOPERATION
                  </span>
                  <span className="text-blue-500">🔒 PCI-DSS COMPLIANT</span>
                </div>
              </div>
            )}
          </div>

          {/* KALKULATOR PATUNGAN / SPLIT BILL ESTIMATOR (98% Commercial-grade improvement) */}
          <div
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-3 font-sans"
            id="split-bill-card"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-[12px] uppercase tracking-wide">
                <span>🍽️ Kalkulator Patungan (Split Bill)</span>
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-black leading-none">
                  INSTAN
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">
                BILLS: Rp{" "}
                {checkoutResult.order.totalPrice.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs font-sans">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-bold font-sans">
                  Jumlah Orang :
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border rounded-lg font-bold text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-xs w-16 text-center bg-slate-50 border py-1 rounded-md">
                    {splitCount} orang
                  </span>
                  <button
                    type="button"
                    onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border rounded-lg font-bold text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-dashed border-slate-100 pt-2.5 sm:pt-0 font-sans">
                <span className="text-slate-500 text-[11px] font-bold">
                  Hasil Bagi per Orang:
                </span>
                <span className="text-sm font-black text-indigo-600 font-mono tracking-tight">
                  Rp{" "}
                  {Math.ceil(
                    checkoutResult.order.totalPrice / splitCount,
                  ).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Share details via WA and Clipboard copy */}
            <div className="flex justify-end pt-1 bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-2xl border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const text =
                    `📄 RINCIAN BILL PATUNGAN - ${appConfig.storeName ? appConfig.storeName.toUpperCase() : "ASLAM COFFEE"}\n` +
                    `-----------------------------\n` +
                    `ID Transaksi : ${checkoutResult.order.id}\n` +
                    `Meja / Kasir : ${checkoutResult.order.tableNumber}\n` +
                    `Total Tagihan: Rp ${checkoutResult.order.totalPrice.toLocaleString("id-ID")}\n` +
                    `Patungan untuk: ${splitCount} orang\n` +
                    `Hadirin Patungan: Rp ${Math.ceil(checkoutResult.order.totalPrice / splitCount).toLocaleString("id-ID")} / orang\n` +
                    `-----------------------------\n` +
                    `Terima kasih! 🙏 Hubungi Kami di ${appConfig.storePhone || "WhatsApp"}`;

                  navigator.clipboard.writeText(text);
                  triggerCashierToast(
                    "📋 Teks patungan berhasil disalin ke clipboard! Siap dibagikan ke WhatsApp grup teman Anda.",
                  );
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-950 font-extrabold text-[#D9F99D] hover:text-[#BEF264] text-[9.5px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-800"
              >
                💬 Salin & Bagikan Slip Patungan ke WhatsApp
              </button>
            </div>
          </div>

          {/* DIRECT HARDWARE TRIGGER PRINT BUTTON PANEL */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              disabled={printingStatus}
              onClick={handlePrintReceipt}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              <Printer size={13} />
              {printingStatus
                ? "Sedang Mencetak..."
                : "Cetak & Hubungkan Ke USB/Bluetooth"}
            </button>

            <button
              onClick={() => {
                const blob = new Blob(
                  [
                    `LEDGERLINE BY ASLAM - RECEIPT STATUS LUNAS\nID TX: ${checkoutResult.order.id}\nTOTAL: Rp ${checkoutResult.order.totalPrice.toLocaleString("id-ID")}`,
                  ],
                  { type: "text/plain" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `LedgerLine-Struk-${checkoutResult.order.id}.txt`;
                a.click();
              }}
              className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-250 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Unduh File Struk (.txt)
            </button>
          </div>

          {/* SELESAI & TRANSAKSI BARU ACTION BUTTON */}
          <button
            type="button"
            id="new-transaction-btn"
            onClick={() => {
              setCheckoutResult(null);
              setQrisPaidStatus("pending");
            }}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>✓ Selesai & Siap Transaksi Baru</span>
          </button>
        </div>
      )}
    </>
  );
}
