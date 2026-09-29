import "dotenv/config";
import pg from "pg";
pg.types.setTypeParser(1082, (v) => v); // keep DATE as 'YYYY-MM-DD'
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(sql, params)).rows;
}
