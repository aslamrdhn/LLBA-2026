import React, { useState, useEffect } from "react";

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

export default function SuppliersList() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/suppliers", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Error updating supplier", error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4">Daftar Supplier</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="p-4">Nama Supplier</th>
                <th className="p-4">Kontak</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{supplier.name}</td>
                  <td className="p-4">
                    {supplier.contactEmail}
                    <br />
                    <span className="text-sm text-gray-500">
                      {supplier.phone}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        supplier.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : supplier.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    {supplier.status === "PENDING" && (
                      <>
                        <button
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                          onClick={() =>
                            handleUpdateStatus(supplier.id, "APPROVED")
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          onClick={() =>
                            handleUpdateStatus(supplier.id, "REJECTED")
                          }
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 && (
            <p className="p-4 text-center text-gray-500">Tidak ada supplier.</p>
          )}
        </div>
      )}
    </div>
  );
}
