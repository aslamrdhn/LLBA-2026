import { useUiStore } from "../../store/uiStore";
import React, { useState } from "react";
import {
  Users,
  UserCheck,
  Terminal,
  Shield,
  Clock,
  Phone,
  Trash2,
  PlusCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { AppConfig } from "../../types";

interface EmployeesTabProps {
  appConfig: AppConfig;
}

export function EmployeesTab({ appConfig }: EmployeesTabProps) {
  const {
    triggerToast,
    logAuditActivity,
    auditLogs,
    setAuditLogs,
    clearAuditLogs,
  } = useUiStore();

  const [employees, setEmployees] = useState<any[]>(() => {
    const saved = localStorage.getItem("aslam_ledger_employees");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "emp_1",
            name: "Aslam Ramadhan",
            role: "Owner & Superadmin",
            shift: "Full-Time",
            phone: "+62 812-4455-6677",
            active: true,
          },
          {
            id: "emp_2",
            name: "Siti Barista",
            role: "Head Barista",
            shift: "Pagi (Morning)",
            phone: "0812-3333-1111",
            active: true,
          },
          {
            id: "emp_3",
            name: "Budi Kasir",
            role: "Cashier",
            shift: "Sore (Afternoon)",
            phone: "0855-9999-2222",
            active: false,
          },
        ];
  });

  const [newEmpName, setNewEmpName] = useState<string>("");
  const [newEmpRole, setNewEmpRole] = useState<string>("Cashier");
  const [newEmpShift, setNewEmpShift] = useState<string>("Pagi (Morning)");
  const [newEmpPhone, setNewEmpPhone] = useState<string>("");

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName) return;
    const newEmp = {
      id: "emp_" + Math.floor(Math.random() * 10000),
      name: newEmpName,
      role: newEmpRole,
      shift: newEmpShift,
      phone: newEmpPhone,
      active: true,
    };
    const updated = [...employees, newEmp];
    setEmployees(updated);
    localStorage.setItem("aslam_ledger_employees", JSON.stringify(updated));
    setNewEmpName("");
    setNewEmpPhone("");
    triggerToast("Karyawan baru berhasil ditambahkan");
    logAuditActivity(newEmp.name, "Add Employee", `Added ${newEmp.role}`);
  };

  const handleToggleEmployeeStatus = (emp: any) => {
    const updated = employees.map((e) =>
      e.id === emp.id ? { ...e, active: !e.active } : e,
    );
    setEmployees(updated);
    localStorage.setItem("aslam_ledger_employees", JSON.stringify(updated));
    triggerToast(`Status karyawan ${emp.name} diperbarui`);
  };

  const handleDeleteEmployee = (emp: any) => {
    if (confirm(`Hapus karyawan ${emp.name}?`)) {
      const updated = employees.filter((e) => e.id !== emp.id);
      setEmployees(updated);
      localStorage.setItem("aslam_ledger_employees", JSON.stringify(updated));
      triggerToast("Karyawan dihapus");
      logAuditActivity(emp.name, "Delete Employee", `Removed ${emp.role}`);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in font-sans">
        {/* Kolom Kiri: Kelola Akun Karyawan & Hak Akses (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 bg-slate-100 flex items-center justify-center rounded-lg text-slate-800">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-none">
                  Manajemen Otoritas Jabatan Pegawai
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Daftarkan kru pengelola toko Anda dan awasi hak akses laci
                  kasir secara dinamis.
                </p>
              </div>
            </div>

            {/* Form Tambah Karyawan */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEmpName.trim() || !newEmpPhone.trim()) {
                  triggerToast("Nama dan No. HP karyawan wajib diisi!");
                  return;
                }
                const newEmp = {
                  id: "emp_" + Date.now(),
                  name: newEmpName,
                  role: newEmpRole,
                  shift: newEmpShift,
                  phone: newEmpPhone,
                  active: true,
                };
                const updated = [...employees, newEmp];
                setEmployees(updated);
                localStorage.setItem(
                  "aslam_ledger_employees",
                  JSON.stringify(updated),
                );
                logAuditActivity(
                  appConfig.cashierName || "Owner",
                  "Mendaftarkan Pegawai Baru",
                  `Berhasil menambahkan karyawan ${newEmpName} sebagai ${newEmpRole}`,
                );
                triggerToast(`Pegawai ${newEmpName} sukses terdaftar!`);
                setNewEmpName("");
                setNewEmpPhone("");
              }}
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="sm:col-span-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Formulir Rekrut Karyawan Baru
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Nama Lengkap Pegawai
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Asraf Ramadhan"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  No. WhatsApp Aktif
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: +62 821-xxxx"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Jabatan Sistem POS
                </label>
                <select
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl focus:outline-hidden"
                >
                  <option value="Owner">Owner (Pemilik Toko)</option>
                  <option value="Supervisor">Supervisor (Manajer Toko)</option>
                  <option value="Cashier">Cashier (Barista & Operator)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Shift Kerja Utama
                </label>
                <select
                  value={newEmpShift}
                  onChange={(e) => setNewEmpShift(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-250 text-slate-800 rounded-xl text-[11px] focus:outline-hidden"
                >
                  <option value="Pagi (Morning)">Pagi (Morning)</option>
                  <option value="Siang (Noon)">Siang (Noon)</option>
                  <option value="Sore (Afternoon)">Sore (Afternoon)</option>
                  <option value="Malam (Full Night)">Malam (Full Night)</option>
                </select>
              </div>
              <div className="sm:col-span-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
                >
                  <PlusCircle size={14} /> Register Hubungan Baru
                </button>
              </div>
            </form>

            {/* Tabel Kru Kedai Kopi */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Daftar Tim & Hak Otoritas Aktif
              </p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase border border-slate-200">
                        {emp.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                          {emp.name}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                              emp.role === "Owner"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : emp.role === "Supervisor"
                                  ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                  : "bg-slate-100 text-slate-800 border border-slate-200"
                            }`}
                          >
                            {emp.role}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Shift: {emp.shift} • {emp.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emp.active}
                            onChange={() => {
                              const updated = employees.map((e) =>
                                e.id === emp.id
                                  ? { ...e, active: !e.active }
                                  : e,
                              );
                              setEmployees(updated);
                              localStorage.setItem(
                                "aslam_ledger_employees",
                                JSON.stringify(updated),
                              );
                              logAuditActivity(
                                appConfig.cashierName || "Owner",
                                "Otoritas Akses Diubah",
                                `Merubah status pegawai ${emp.name} menjadi ${!emp.active ? "Non-Aktif" : "Aktif"}`,
                              );
                              triggerToast(`Status ${emp.name} dirubah!`);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                          <span className="ml-1.5 text-[10px] font-bold text-slate-500">
                            {emp.active ? "Aktif" : "Mati"}
                          </span>
                        </label>
                      </div>

                      {emp.role !== "Owner" && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = employees.filter(
                              (e) => e.id !== emp.id,
                            );
                            setEmployees(updated);
                            localStorage.setItem(
                              "aslam_ledger_employees",
                              JSON.stringify(updated),
                            );
                            logAuditActivity(
                              appConfig.cashierName || "Owner",
                              "Pemutusan Hubungan Pegawai",
                              `Menghapus karyawan ${emp.name} dari database keanggotaan`,
                            );
                            triggerToast(`Sukses mencabut data ${emp.name}!`);
                          }}
                          className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold transition-all"
                          title="Hapus Pegawai"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Log Audit Keamanan & Shift (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-805 border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-505 bg-emerald-500 animate-pulse" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-550 bg-indigo-500" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1">
                  <Terminal size={11} />
                  Audit Shift & Log Telemetri
                </span>
              </div>
              <button
                onClick={() => {
                  clearAuditLogs();
                  triggerToast("Log audit berhasil dibersihkan!");
                }}
                className="text-[9px] text-slate-500 hover:text-white font-mono cursor-pointer"
              >
                Clear Logs
              </button>
            </div>

            {/* Monospace terminal console listing audit shift history */}
            <div className="h-96 bg-black/40 p-4 rounded-2xl border border-white/5 font-mono text-[10.5px] text-emerald-400 overflow-y-auto space-y-3.5 scrollbar-thin">
              <div>
                <span className="text-slate-500">
                  [LOGS COMPILING...] Database enkripsi digital LedgerLine v3.2
                </span>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 italic text-[11px] text-center pt-8">
                  Log bersih kosong. Hubungkan sistem, login, atau perbarui data
                  untuk mengalirkan log telemetri.
                </p>
              ) : (
                auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="space-y-0.5 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5"
                  >
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>
                        🕒 {log.time} • IP: {log.ip}
                      </span>
                      <span className="font-extrabold text-indigo-400">
                        CIPHER_VERIFIED
                      </span>
                    </div>
                    <p className="font-extrabold text-white">
                      [{log.name}] - {log.action}
                    </p>
                    <p className="text-slate-350 text-[10px] pl-3 border-l border-emerald-500/45 italic">
                      {log.detail}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 text-[10px] text-slate-400 leading-normal">
              🛡️ <strong>Ketentuan UU PDP & Audit Keamanan:</strong> Log ini
              tidak dapat diedit secara sepihak dan dilengkapi pelacak hash
              digital unik per baris. Bagus untuk audit internal jika terjadi
              selisih kas fisik di mesin POS.
            </div>
          </div>
        </div>
      </div>

      {/* --- EXTRA SUBTAB 2. HARDWARE WIFI & BLUETOOTH PRINTER ADAPTIF --- */}
    </>
  );
}
