import bcrypt from "bcryptjs";
import { pool, q } from "./db";
import { newToken } from "./services";
const gym = (await q("insert into gyms(name,gym_code,timezone,whatsapp_number) values('Demo Gym','DEMO01','Asia/Kolkata','+919999900000') on conflict (gym_code) do update set name=excluded.name returning id"))[0];
await q("insert into owners(gym_id,name,email,phone,password_hash) values($1,'Demo Owner','demo@gym.test','+919999911111',$2) on conflict do nothing", [gym.id, await bcrypt.hash("password123", 10)]);
for (let i = 1; i <= 15; i++) {
  const c = (await q("insert into customers(gym_id,name,phone,progress_token) values($1,$2,$3,$4) on conflict (gym_id,phone) do update set name=excluded.name returning id", [gym.id, `Member ${i}`, `+9198000000${String(i).padStart(2, "0")}`, newToken()]))[0];
  for (let d = 0; d < 30; d++) if (Math.random() < 0.3 + i / 40) await q("insert into attendance(gym_id,customer_id,date,source) values($1,$2,current_date-$3::int,'manual') on conflict do nothing", [gym.id, c.id, d]);
}
console.log("Seeded. Login: demo@gym.test / password123  (gym code DEMO01)");
await pool.end();
