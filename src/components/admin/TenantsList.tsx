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

export default function TenantsList() {
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    fetchWithAuth("/api/admin/tenants", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTenants(data.data);
      });
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4">Tenants</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="pb-2">Name</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Tier</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-3">{t.storeName}</td>
              <td className="py-3">{t.ownerEmail}</td>
              <td className="py-3">{t.subscriptionTier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
