import { q } from "./db";
import { M, chunk, calendar } from "./messages";
import {
  AppError,
  addCustomer,
  checkIn,
  findCustomers,
  getGym,
  getProgress,
  listAbsent,
  listCustomers,
  listToday,
} from "./services";

const base = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

async function historyText(name: string, id: string, tz: string) {
  const { progress, days } = await getProgress(id, tz);
  const present = days.filter((d) => d.present).map((d) => d.date.slice(5));
  return `${M.progress(name, progress)}\nLast 30 days: ${present.length} attended${present.length ? " (" + present.join(", ") + ")" : ""}`;
}
async function monthCalendar(id: string, tz: string) {
  const { days } = await getProgress(id, tz);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const [y, m] = today.split("-").map(Number);
  const attended = days
    .filter((d) => d.present && d.date.startsWith(today.slice(0, 7)))
    .map((d) => Number(d.date.slice(8, 10)));
  return calendar(y, m - 1, attended);
}
/** Returns reply messages for an incoming WhatsApp text. `phone` is E.164 (+...). */
export async function handleText(
  phone: string,
  text: string,
): Promise<string[]> {
  const [c, ...rest] = text.trim().split(/\s+/);
  const cmd = (c ?? "").toUpperCase(),
    arg = rest.join(" ");
  const owner = (
    await q("select gym_id from owners where phone=$1", [phone])
  )[0];

  if (owner) {
    const gym = await getGym(owner.gym_id);
    try {
      if (cmd === "ADD") {
        const phoneArg = rest[rest.length - 1],
          name = rest.slice(0, -1).join(" ");
        if (!name || !phoneArg) return ["Usage: ADD <name> <phone>"];
        const cu = await addCustomer(gym, name, phoneArg);
        return [`Added ${cu.name} (${cu.phone}).`];
      }
      if (cmd === "TODAY") {
        const r = await listToday(gym);
        return chunk([
          `Today: ${r.length} check-ins`,
          ...r.map((x, i) => `${i + 1}. ${x.name}, ${x.time}`),
        ]);
      }
      if (cmd === "CUSTOMERS") {
        const r = await listCustomers(gym.id, "", "active");
        return chunk([
          `Active customers: ${r.length}`,
          ...r.map((x) => `${x.name}: last visit ${x.last_visit ?? "never"}`),
        ]);
      }
      if (cmd === "ABSENT") {
        const r = await listAbsent(gym);
        return chunk([`Absent today: ${r.length}`, ...r.map((x) => x.name)]);
      }
      if ((cmd === "HISTORY" || cmd === "PROGRESS") && arg) {
        const f = await findCustomers(gym, arg);
        if (f.length !== 1)
          return [
            f.length
              ? `${f.length} matches, please use the phone number.`
              : "No customer found.",
          ];
        return [await historyText(f[0].name, f[0].id, gym.timezone)];
      }
      if (cmd === "HELP") return [M.helpOwner];
    } catch (e) {
      if (e instanceof AppError) return [e.message];
      throw e;
    }
  }

  if (cmd === "CHECKIN") {
    const gym = (
      await q("select id from gyms where gym_code=$1", [arg.toUpperCase()])
    )[0];
    const cu =
      gym &&
      (
        await q("select * from customers where gym_id=$1 and phone=$2", [
          gym.id,
          phone,
        ])
      )[0];
    if (!cu) return [M.notRegistered];
    if (cu.status !== "active") return [M.inactive];
    const g = await getGym(gym.id),
      r = await checkIn(g, cu.id);
    if (!r.created)
      return [M.already(r.time), await monthCalendar(cu.id, g.timezone)];
    const out = [
      M.checkedIn(cu.name, r.progress.thisMonth, r.progress.currentStreak),
    ];
    if (r.milestone) out.push(M.milestone(cu.name, r.progress.total));
    out.push(await monthCalendar(cu.id, g.timezone));
    out.push(`Full progress: ${base()}/p/${cu.progress_token}`);
    return out;
  }
  if (cmd === "HISTORY" || cmd === "PROGRESS") {
    const cu = (
      await q(
        "select * from customers where phone=$1 and status='active' order by created_at limit 1",
        [phone],
      )
    )[0];
    if (!cu) return [M.notRegistered];
    const g = await getGym(cu.gym_id);
    return [
      await historyText(cu.name, cu.id, g.timezone),
      await monthCalendar(cu.id, g.timezone),
      ...(cmd === "PROGRESS"
        ? [`Your progress page: ${base()}/p/${cu.progress_token}`]
        : []),
    ];
  }
  return [cmd === "HELP" ? (owner ? M.helpOwner : M.helpCustomer) : M.unknown];
}
