"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const svc = require("../solver-service/server.js");
const fn = require("../functions/stale-prices.js");
const { INGREDIENTS } = require("../public/js/data.js");

test("solver service: JSON in, least-cost ration out, bad input is 400", async () => {
  const server = svc.listen(0);
  const base = "http://localhost:" + server.address().port;
  const post = body => fetch(base + "/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  try {
    const usable = INGREDIENTS.filter(i => !i.stale);
    const ok = await post(JSON.stringify({ ingredients: usable, nelFloor: 1.58, band: { floor: 22.4, ceiling: 24.27 } }));
    assert.equal(ok.status, 200);
    const out = await ok.json();
    assert.ok(out.feasible);
    assert.ok(Math.abs(out.cost - 104.95) < 0.01);
    assert.equal(out.kg.length, usable.length);       // the contract: kg is in the order the ingredients were sent
    assert.equal((await post("{}")).status, 400);
  } finally { server.close(); }
});

test("stale-prices function flags only prices older than the threshold", async () => {
  const prices = [{ name: "Soya", ageDays: 2 }, { name: "Brewers grain", ageDays: 19 }];
  assert.deepEqual((await fn.main({ prices })).body.stale, ["Brewers grain"]);
  assert.deepEqual((await fn.main({ thresholdDays: 1, prices })).body.stale, ["Soya", "Brewers grain"]);
  assert.deepEqual((await fn.main({})).body.stale, []);
});
