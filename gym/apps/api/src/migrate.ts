import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { pool } from "./db";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
for (const f of fs.readdirSync(dir).sort()) { await pool.query(fs.readFileSync(path.join(dir, f), "utf8")); console.log("applied", f); }
await pool.end();
