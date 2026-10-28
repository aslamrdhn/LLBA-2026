import React from "react";
import { FileText } from "lucide-react";

export function MigrationTab() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 animate-fade-in font-sans">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 bg-amber-100 flex items-center justify-center rounded-lg text-amber-600">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-none">
                Migration Center
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Ubah dan import file dari POS lain ke dalam sistem cerdas
                LedgerLine dengan bantuan AI & Analyst Specialist kami.
              </p>
            </div>
          </div>

          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800 mb-2">
              Formulir Tiket Migrasi Human-Assisted & AI
            </h4>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = new FormData(form);
                const rootToken = localStorage.getItem("aslam_ledger_token");
                const tenantId = JSON.parse(
                  localStorage.getItem("aslam_ledger_current_store") || "{}",
                )?.id;

                const fData = data.get("fileData") as File;
                const reader = new FileReader();
                reader.onload = async () => {
                  const postData = {
                    tenantId,
                    fileName: fData.name,
                    fileType: fData.type || "text/csv",
                    fileData: reader.result,
                    notes: data.get("notes"),
                  };
                  await fetch("/api/tenant/migration-tickets", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(rootToken ? { Authorization: `Bearer ${rootToken}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify(postData),
                  });

                  alert(
                    "Tiket migrasi berhasil dibuat! Tim kami akan meninjau data Anda.",
                  );
                  form.reset();
                };
                if (fData) reader.readAsDataURL(fData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload File (Excel/CSV/PDF/Image)
                </label>
                <input
                  type="file"
                  name="fileData"
                  required
                  className="w-full text-sm p-2 border rounded-lg focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan / POS Sebelumnya
                </label>
                <textarea
                  name="notes"
                  placeholder="Misal: Saya dulunya pakai aplikasi Kasir X, tolong import data produk"
                  className="w-full text-sm p-3 border rounded-lg h-24 resize-none focus:border-amber-500 outline-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors"
              >
                Buat Tiket Migrasi
              </button>
            </form>
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Proses Migrasi:
            </p>
            <ol className="list-decimal list-inside text-sm text-slate-600 space-y-2">
              <li>Upload file mentah dari POS kompetitor.</li>
              <li>
                Spesialis kami dan sistem AI akan menganalisis format file.
              </li>
              <li>Approval mapping kolom database.</li>
              <li>
                Data sukses diimpor menjadi ekosistem True Profit LedgerLine.
              </li>
              <li>Selamat mencoba standar baru.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
