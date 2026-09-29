import bcrypt from "bcryptjs";
import { NextFunction, Request, Response, Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { customerSchema, loginSchema, registerSchema } from "@gym/shared";
import { q } from "./db";
import { nextMilestone } from "./progress";
import { AppError, addCustomer, checkIn, getGym, getProgress, listAbsent, listCustomers, listToday, newToken, todayStr } from "./services";
import { normalizePhone } from "./phone";

export const api = Router();
const secret = () => process.env.JWT_SECRET ?? "dev-secret";
const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 50 });
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 7 * 864e5 };

function auth(req: Request, res: Response, next: NextFunction) {
  try { const p = jwt.verify(req.cookies.token, secret()) as any; res.locals.owner = { id: p.id, gymId: p.gymId }; next(); }
  catch { res.status(401).json({ error: { code: "unauthorized", message: "Please log in" } }); }
}
const gymOf = (res: Response) => getGym(res.locals.owner.gymId);
const ownCustomer = async (res: Response, id: string) => {
  const c = (await q("select * from customers where id=$1 and gym_id=$2", [id, res.locals.owner.gymId]))[0];
  if (!c) throw new AppError("not_found", "Customer not found", 404);
  return c;
};

api.post("/auth/register", authLimit, async (req, res) => {
  const b = registerSchema.parse(req.body);
  const phone = normalizePhone(b.phone, b.countryCode);
  if (!phone) throw new AppError("invalid_phone", "Enter a valid owner phone number");
  const code = newToken().slice(0, 6).toUpperCase();
  try {
    const gym = (await q("insert into gyms(name,gym_code,timezone,default_country_code,whatsapp_number) values($1,$2,$3,$4,$5) returning id", [b.gymName, code, b.timezone, b.countryCode, b.whatsappNumber]))[0];
    const o = (await q("insert into owners(gym_id,name,email,phone,password_hash) values($1,$2,$3,$4,$5) returning id", [gym.id, b.ownerName, b.email.toLowerCase(), phone, await bcrypt.hash(b.password, 10)]))[0];
    res.cookie("token", jwt.sign({ id: o.id, gymId: gym.id }, secret(), { expiresIn: "7d" }), cookieOpts).status(201).json({ ok: true });
  } catch (e: any) {
    if (e.code === "23505") throw new AppError("duplicate", "Email or phone already registered", 409);
    throw e;
  }
});
api.post("/auth/login", authLimit, async (req, res) => {
  const b = loginSchema.parse(req.body);
  const o = (await q("select * from owners where email=$1", [b.email.toLowerCase()]))[0];
  if (!o || !(await bcrypt.compare(b.password, o.password_hash))) throw new AppError("bad_credentials", "Wrong email or password", 401);
  res.cookie("token", jwt.sign({ id: o.id, gymId: o.gym_id }, secret(), { expiresIn: "7d" }), cookieOpts).json({ ok: true });
});
api.post("/auth/logout", (_req, res) => { res.clearCookie("token").json({ ok: true }); });
api.get("/auth/me", auth, async (_req, res) => {
  const o = (await q("select id,name,email,phone from owners where id=$1", [res.locals.owner.id]))[0];
  res.json({ owner: o, gym: await gymOf(res) });
});

api.get("/customers", auth, async (req, res) => res.json(await listCustomers(res.locals.owner.gymId, String(req.query.search ?? ""), String(req.query.status ?? ""))));
api.post("/customers", auth, async (req, res) => {
  const b = customerSchema.parse(req.body);
  res.status(201).json(await addCustomer(await gymOf(res), b.name, b.phone));
});
api.patch("/customers/:id", auth, async (req, res) => {
  const b = customerSchema.partial().parse(req.body); const c = await ownCustomer(res, req.params.id);
  const gym = await gymOf(res);
  const phone = b.phone ? normalizePhone(b.phone, gym.default_country_code) : c.phone;
  if (!phone) throw new AppError("invalid_phone", "Enter a valid phone number");
  try { res.json((await q("update customers set name=$1,phone=$2,status=$3 where id=$4 returning *", [b.name ?? c.name, phone, b.status ?? c.status, c.id]))[0]); }
  catch (e: any) { if (e.code === "23505") throw new AppError("duplicate", "A customer with this phone already exists", 409); throw e; }
});
api.get("/customers/:id", auth, async (req, res) => {
  const c = await ownCustomer(res, req.params.id), gym = await gymOf(res);
  const history = await q("select id, to_char(date,'YYYY-MM-DD') date, source, to_char(checked_in_at at time zone $2,'HH12:MI AM') time from attendance where customer_id=$1 order by date desc", [c.id, gym.timezone]);
  res.json({ customer: c, ...(await getProgress(c.id, gym.timezone)), history });
});
api.get("/customers/:id/attendance", auth, async (req, res) => {
  const c = await ownCustomer(res, req.params.id);
  res.json(await q("select id, to_char(date,'YYYY-MM-DD') date, source from attendance where customer_id=$1 and date>=coalesce($2::date,'0001-01-01') and date<=coalesce($3::date,'9999-12-31') order by date desc", [c.id, req.query.from || null, req.query.to || null]));
});
api.post("/customers/:id/attendance", auth, async (req, res) => {
  const c = await ownCustomer(res, req.params.id), gym = await gymOf(res);
  const date = typeof req.body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : todayStr(gym.timezone);
  res.status(201).json(await checkIn(gym, c.id, "manual", date));
});
api.delete("/attendance/:id", auth, async (req, res) => {
  const r = await q("delete from attendance where id=$1 and gym_id=$2 returning id", [req.params.id, res.locals.owner.gymId]);
  if (!r.length) throw new AppError("not_found", "Entry not found", 404);
  res.sendStatus(204);
});
api.get("/attendance/today", auth, async (_req, res) => res.json(await listToday(await gymOf(res))));
api.get("/attendance/absent", auth, async (_req, res) => res.json(await listAbsent(await gymOf(res))));
api.post("/customers/:id/progress-link/regenerate", auth, async (req, res) => {
  const c = await ownCustomer(res, req.params.id);
  res.json((await q("update customers set progress_token=$1 where id=$2 returning progress_token", [newToken(), c.id]))[0]);
});
api.get("/gym", auth, async (_req, res) => res.json(await gymOf(res)));
api.get("/gym/qr", auth, async (_req, res) => {
  const g = await gymOf(res);
  const url = `https://wa.me/${g.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent("CHECKIN " + g.gym_code)}`;
  res.type("png").send(await QRCode.toBuffer(url, { width: 600, margin: 2 }));
});
api.get("/public/progress/:token", async (req, res) => {
  const c = (await q("select c.id, c.name, g.timezone, g.name gym from customers c join gyms g on g.id=c.gym_id where c.progress_token=$1", [req.params.token]))[0];
  if (!c) throw new AppError("not_found", "Link not found", 404);
  const r = await getProgress(c.id, c.timezone);
  res.json({ name: c.name, gym: c.gym, ...r, nextMilestone: nextMilestone(r.progress.total) });
});
