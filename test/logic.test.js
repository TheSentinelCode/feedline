"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { INGREDIENTS, BANDS, GROUP } = require("../public/js/data.js");
const C = require("../public/js/compute.js");
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + " is not within " + tol + " of " + b);

test("asFed refuses a zero or missing dry matter, naming the feed", () => {
  assert.throws(() => C.asFed(1, 0, "Maize silage"), /Maize silage/);
  assert.throws(() => C.asFed(1, undefined), /dry matter/);
  near(C.asFed(8, 35), 22.857, 0.001);
});

test("DCAD uses equivalent weights", () => {
  near(C.dcad({ Na: .22, K: 1.28, Cl: .41, S: .24 }), 15.8, 0.1);   // the old (Na+K)-(Cl+S) would give 0.85
});

test("NRC 2001 requirement for the demo group", () => {
  const n = C.nrc(GROUP);
  near(n.dmi, 24.27, 0.01);
  near(n.nelMaint, 9.94, 0.01);
  near(n.nelTotal, 34.96, 0.02);
  near(C.ecm(GROUP.milk, GROUP.fat, GROUP.protein), 36.08, 0.01);
});

test("the stored ration sits inside every nutrient band and costs R104.95", () => {
  const r = C.compute(INGREDIENTS.map(i => i.sol), INGREDIENTS);
  near(r.totalDm, 22.40, 0.001);
  near(r.totalCost, 104.95, 0.01);
  BANDS.forEach(b => assert.notEqual(C.status(b, r.nutrients[b.key]), "over", b.key));
});

test("an empty ration gives zeros, not NaN", () => {
  const r = C.compute(INGREDIENTS.map(() => 0), INGREDIENTS);
  assert.equal(r.totalDm, 0);
  assert.equal(r.nutrients.CP, 0);
});

test("mixer sheet: cumulative weights, water brings the load to 48% DM", () => {
  const s = C.mixerSheet(INGREDIENTS.map(i => i.sol), INGREDIENTS, 48, 48);
  near(s.total, 2240, 0.5);
  assert.equal(s.steps[0].name, "Lucerne hay");
  assert.equal(s.steps[s.steps.length - 1].name, "Molasses syrup");
  for (let i = 1; i < s.steps.length; i++) assert.ok(s.steps[i].cumulative > s.steps[i - 1].cumulative);
});

test("needle position is clamped to the track", () => {
  assert.equal(C.needlePercent(BANDS[2], 99), 100);
  assert.equal(C.needlePercent(BANDS[2], -5), 0);
});
