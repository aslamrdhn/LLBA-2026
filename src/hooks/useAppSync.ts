import { useQuery } from "@tanstack/react-query";
import { useDataStore } from "../store/dataStore";
import { useEffect } from "react";

export function useAppSync(
  tenantId: string | undefined,
  token: string | undefined,
) {
  const {
    setProducts,
    setRawMaterials,
    setRecipes,
    setTables,
    setOrders,
    setFinanceLogs,
    setAppConfig,
  } = useDataStore();

  const query = useQuery({
    queryKey: ["app-state", tenantId],
    queryFn: async () => {
      if (!tenantId || !token) throw new Error("No token or tenantId");

      const response = await fetch("/api/orders/state", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch state");
      }

      return response.json();
    },
    enabled: !!tenantId && !!token,
    refetchInterval: 30000, // Background sync every 30s
    staleTime: 10000,
  });

  useEffect(() => {
    if (query.data && !query.isError) {
      const data = query.data;
      if (data.products) setProducts(data.products);
      if (data.rawMaterials) setRawMaterials(data.rawMaterials);
      if (data.recipes) setRecipes(data.recipes);
      if (data.tables) setTables(data.tables);
      if (data.orders) setOrders(data.orders);
      if (data.financeLogs) setFinanceLogs(data.financeLogs);
      if (data.appConfig) setAppConfig(data.appConfig);
    }
  }, [query.data, query.isError]);

  return query;
}
