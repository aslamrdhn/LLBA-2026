import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pool size
});

pool.on("error", (err) => {
  logger.error("[DATABASE] Unexpected error on idle client", err);
  // process.exit(-1);
});

/**
 * Execute a query with RLS context applied.
 * This guarantees tenant isolation at the database level.
 */
export async function withRLS<T>(
  tenantId: string,
  outletId: string | null,
  role: string,
  supplierId: string | null,
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Set RLS variables as defined in the PRD's DDL
    await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
    await client.query(`SET LOCAL app.current_user_role = $1`, [role]);

    if (outletId) {
      await client.query(`SET LOCAL app.current_outlet_id = $1`, [outletId]);
    }

    if (supplierId) {
      await client.query(`SET LOCAL app.current_supplier_id = $1`, [
        supplierId,
      ]);
    }

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
