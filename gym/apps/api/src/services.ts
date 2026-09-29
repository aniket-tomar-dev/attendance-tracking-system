import crypto from "crypto";
import { q } from "./db";
import { normalizePhone } from "./phone";
import { calcProgress, lastDays } from "./progress";

export class AppError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }
export interface Gym { id: string; name: string; gym_code: string; timezone: string; default_country_code: string; whatsapp_number: string }

export const getGym = async (id: string) => (await q<Gym>("select * from gyms where id=$1", [id]))[0];
export const todayStr = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
export const newToken = () => crypto.randomBytes(24).toString("hex");

export async function getProgress(customerId: string, tz: string) {
  const dates = (await q("select to_char(date,'YYYY-MM-DD') d from attendance where customer_id=$1", [customerId])).map((r) => r.d);
  const today = todayStr(tz);
  return { progress: calcProgress(dates, today), days: lastDays(today, dates) };
}

export async function addCustomer(gym: Gym, name: string, phone: string) {
  const p = normalizePhone(phone, gym.default_country_code);
  if (!p) throw new AppError("invalid_phone", "Enter a valid phone number");
  try {
    return (await q("insert into customers(gym_id,name,phone,progress_token) values($1,$2,$3,$4) returning *", [gym.id, name.trim(), p, newToken()]))[0];
  } catch (e: any) {
    if (e.code === "23505") throw new AppError("duplicate", "A customer with this phone already exists", 409);
    throw e;
  }
}

export async function findCustomers(gym: Gym, query: string) {
  const p = normalizePhone(query, gym.default_country_code);
  return q("select * from customers where gym_id=$1 and (phone=$2 or name ilike $3) order by name limit 5", [gym.id, p ?? "", `%${query}%`]);
}

export async function checkIn(gym: Gym, customerId: string, source: "whatsapp" | "manual" = "whatsapp", date?: string) {
  const day = date ?? todayStr(gym.timezone);
  const ins = await q("insert into attendance(gym_id,customer_id,date,source) values($1,$2,$3,$4) on conflict (customer_id,date) do nothing returning id", [gym.id, customerId, day, source]);
  const time = (await q("select to_char(checked_in_at at time zone $2,'HH12:MI AM') t from attendance where customer_id=$1 and date=$3", [customerId, gym.timezone, day]))[0].t as string;
  const { progress } = await getProgress(customerId, gym.timezone);
  return { created: ins.length > 0, time, progress, milestone: ins.length > 0 && progress.total % 10 === 0 };
}

export const listToday = (gym: Gym) => q(
  `select c.id customer_id, c.name, a.id attendance_id, a.source, to_char(a.checked_in_at at time zone $2,'HH12:MI AM') time
   from attendance a join customers c on c.id=a.customer_id where a.gym_id=$1 and a.date=$3 order by a.checked_in_at`,
  [gym.id, gym.timezone, todayStr(gym.timezone)]);

export const listAbsent = (gym: Gym) => q(
  `select c.id, c.name, c.phone from customers c where c.gym_id=$1 and c.status='active'
   and not exists (select 1 from attendance a where a.customer_id=c.id and a.date=$2) order by c.name`,
  [gym.id, todayStr(gym.timezone)]);

export const listCustomers = (gymId: string, search = "", status = "") => q(
  `select c.id,c.name,c.phone,c.status,c.joined_on,
    (select count(*)::int from attendance a where a.customer_id=c.id) total,
    (select to_char(max(date),'YYYY-MM-DD') from attendance a where a.customer_id=c.id) last_visit
   from customers c where c.gym_id=$1 and ($2='' or c.name ilike '%'||$2||'%' or c.phone like '%'||$2||'%') and ($3='' or c.status=$3) order by c.name`,
  [gymId, search, status]);
