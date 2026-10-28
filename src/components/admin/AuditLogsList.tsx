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

export default function AuditLogsList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/audit-logs", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Error fetching logs", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Aksi</th>
                <th className="p-4">Operator</th>
                <th className="p-4">Entitas</th>
                <th className="p-4">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-sm font-medium">{log.tenantId}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{log.userId}</td>
                  <td className="p-4 text-sm">
                    {log.entityName} ({log.entityId})
                  </td>
                  <td className="p-4 text-sm break-words max-w-xs">
                    {log.newValue || log.oldValue || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="p-4 text-center text-gray-500">Tidak ada log.</p>
          )}
        </div>
      )}
    </div>
  );
}
