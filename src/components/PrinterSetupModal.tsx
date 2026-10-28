import React, { useState } from "react";
import {
  Bluetooth,
  Usb,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export const PrinterSetupModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionType, setConnectionType] = useState<
    "bluetooth" | "usb" | null
  >(null);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [btDevice, setBtDevice] = useState<any>(null);
  const [usbPort, setUsbPort] = useState<any>(null);

  const requestBluetooth = async () => {
    try {
      setStatus("connecting");
      setConnectionType("bluetooth");
      // @ts-expect-error Typescript web bluetooth api support
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"], // Standard receipt printer service, often device specific
      });
      setBtDevice(device);
      setDeviceInfo(`Bluetooth: ${device.name || "Unknown Printer"}`);
      setStatus("connected");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "Bluetooth connection failed");
    }
  };

  const requestUsb = async () => {
    try {
      setStatus("connecting");
      setConnectionType("usb");
      // @ts-expect-error Typescript web bluetooth api support
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setUsbPort(port);
      setDeviceInfo(`USB Serial Port Selected`);
      setStatus("connected");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "USB Serial connection failed");
    }
  };

  const testPrint = async () => {
    try {
      // Basic ESC/POS command for testing: Init + text + line feed + cut
      const encoder = new TextEncoder();
      const escposData = new Uint8Array([
        0x1b,
        0x40, // Init
        ...encoder.encode("TEST PRINT SUCCESSFUL\nLedgerLine Web POS\n\n\n"),
        0x1d,
        0x56,
        0x41,
        0x00, // Cut
      ]);

      if (connectionType === "bluetooth" && btDevice) {
        // Assume Web Bluetooth write logic (needs gatt server connection)
        if (!btDevice.gatt.connected) {
          await btDevice.gatt.connect();
        }
        // NOTE: actual printing requires knowing the exact characteristic,
        // which varies by printer. This is just an example stub for the API.
        alert(
          "Bluetooth test print simulated. Actual characteristic writing requires device-specific UUIDs.",
        );
      } else if (connectionType === "usb" && usbPort) {
        const writer = usbPort.writable.getWriter();
        await writer.write(escposData);
        writer.releaseLock();
      }
    } catch (err: any) {
      console.error(err);
      alert("Print failed: " + err.message);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
      >
        <Bluetooth size={14} /> Set Up Real Printer Connection
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                Printer Connection Setup
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={requestBluetooth}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-slate-150 hover:border-indigo-500 hover:bg-indigo-50 transition-colors bg-white text-slate-700 hover:text-indigo-700 group focus:outline-hidden"
                >
                  <Bluetooth
                    size={32}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Web Bluetooth
                  </span>
                </button>
                <button
                  onClick={requestUsb}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-slate-150 hover:border-emerald-500 hover:bg-emerald-50 transition-colors bg-white text-slate-700 hover:text-emerald-700 group focus:outline-hidden"
                >
                  <Usb
                    size={32}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    USB Serial
                  </span>
                </button>
              </div>

              {status === "connecting" && (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <RefreshCw size={14} className="animate-spin" />
                  Connecting to device...
                </div>
              )}

              {status === "connected" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle
                    size={18}
                    className="text-emerald-600 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-800">
                      Connection Established
                    </p>
                    <p className="text-[11px] text-emerald-650 font-mono break-all">
                      {deviceInfo}
                    </p>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle
                    size={18}
                    className="text-red-600 shrink-0 mt-0.5"
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-red-800">
                      Connection Failed
                    </p>
                    <p className="text-[11px] text-red-650 break-all">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {status === "connected" && (
                <button
                  onClick={testPrint}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-sm focus:outline-hidden"
                >
                  Print Test Page
                </button>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center leading-relaxed">
              Requires Chrome 89+ or Edge 89+ for Web Bluetooth/Serial
              capabilities. Please ensure your printer supports standard ESC/POS
              commands.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
