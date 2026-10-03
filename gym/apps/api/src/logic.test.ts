import test from "node:test";
import assert from "node:assert/strict";
import { calcProgress, nextMilestone } from "./progress";
import { normalizePhone } from "./phone";
test("phone normalization", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765-43210"), "+919876543210");
  assert.equal(normalizePhone("919876543210"), "+919876543210");
  assert.equal(normalizePhone("123"), null);
});
test("streaks", () => {
  const p = calcProgress(
    ["2026-09-25", "2026-09-27", "2026-09-28", "2026-09-29"],
    "2026-09-29",
  );
  assert.deepEqual([p.total, p.currentStreak, p.longestStreak], [4, 3, 3]);
  assert.equal(calcProgress(["2026-09-20"], "2026-09-29").currentStreak, 0);
  assert.equal(calcProgress(["2026-09-28"], "2026-09-29").currentStreak, 1);
});
test("milestones", () => {
  assert.equal(nextMilestone(9), 10);
  assert.equal(nextMilestone(10), 20);
});
