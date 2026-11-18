"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server.js");
const S = require("../solver.js");
const { INGREDIENTS } = require("../public/js/data.js");

let server, base;
test.before(async () => { server = app.listen(0); base = "http://localhost:" + server.address().port; });
test.after(() => server.close());
const post = body => fetch(base + "/api/formulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("solver: energy floor 1.58 gives the stored least-cost ration", () => {
  const usable = INGREDIENTS.filter(i => !i.stale);
  const r = S.formulate(usable, S.highProducing(1.58), { floor: 22.4, ceiling: 24.27 });
  assert.ok(r.feasible);
  assert.ok(Math.abs(r.cost - 104.95) < 0.01);
  assert.ok(Math.abs(r.kg.reduce((a, b) => a + b, 0) - 22.4) < 1e-6, "least cost sits on the floor of the intake band");
});

test("solver: an impossible 1.65 floor is relaxed to about 1.61 and named", () => {
  const usable = INGREDIENTS.filter(i => !i.stale);
  const r = S.formulate(usable, S.highProducing(1.65), { floor: 22.4, ceiling: 24.27 });
  assert.ok(r.feasible);
  assert.equal(r.relaxations[0].key, "nel_min");
  assert.ok(Math.abs(r.relaxations[0].to - 1.609) < 0.005);
});

test("POST /api/formulate returns a ration", async () => {
  const res = await post({ nelFloor: 1.58, dmiFloor: 22.4, dmiCeiling: 24.27 });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Math.abs(body.cost - 104.95) < 0.01);
  assert.equal(body.relaxations.length, 0);
});

test("POST /api/formulate: bad input is 400, floor above ceiling is 422", async () => {
  assert.equal((await post({ nelFloor: "x" })).status, 400);
  assert.equal((await post({ dmiFloor: 30, dmiCeiling: 22 })).status, 422);
});
