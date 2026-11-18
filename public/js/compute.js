"use strict";
/* COMPUTE: pure functions. They take numbers in and give numbers out.
   No DOM and no fetch. That is what makes them testable in Node. */

// In the browser, data.js has already defined NUTRIENT_KEYS as a global. In Node it has not, so we import it.
// This browser-versus-Node difference is exactly what modules (import / require) solve in Courses 4 to 6.
const NUTRIENT_LIST = (typeof NUTRIENT_KEYS !== "undefined") ? NUTRIENT_KEYS : require("./data.js").NUTRIENT_KEYS;

// Floats carry rounding noise (0.1 + 0.2 is not 0.3). A value sitting exactly on a limit must not flip to "over" because of it.
const EPSILON = 1e-6;

// Dry-matter kg to as-fed kg. A zero here would give Infinity (JavaScript does not throw), so guard it.
function asFed(kgDm, dmPercent, label) {
  if (!(dmPercent > 0 && dmPercent <= 100)) {
    throw new Error((label || "Ingredient") + " has dry matter " + dmPercent + "%. Enter it from the lab report.");
  }
  return kgDm / (dmPercent / 100);
}

// DCAD in mEq per 100 g DM. Each percentage is divided by the ion's equivalent weight.
// The sulphur divisor is 0.016 (not 0.032) because sulphur carries two charges.
function dcad(n) {
  return n.Na / 0.023 + n.K / 0.039 - n.Cl / 0.0355 - n.S / 0.016;
}

// Energy-corrected milk, metric coefficients only. NRC 2001 style.
function ecm(milk, fat, protein) {
  return 0.325 * milk + 12.86 * (milk * fat / 100) + 7.04 * (milk * protein / 100);
}

// NRC (2001): predicted intake and net energy requirement for a lactating cow.
function nrc(animal) {
  const fcm  = 0.4 * animal.milk + 15 * (animal.milk * animal.fat / 100);          // 4% fat-corrected milk
  const mbw  = Math.pow(animal.bodyWeight, 0.75);                                   // metabolic body weight
  const ramp = 1 - Math.exp(-0.192 * (animal.dim / 7 + 3.67));                      // intake ramps up after calving
  const dmi  = (0.372 * fcm + 0.0968 * mbw) * ramp;
  const nelMaint = 0.080 * mbw;
  const nelMilk  = (0.0929 * animal.fat + 0.0547 * animal.protein + 0.0395 * 4.85) * animal.milk;
  return { fcm, dmi, nelMaint, nelMilk, nelTotal: nelMaint + nelMilk };
}

// state is an array: kg DM of each ingredient. Everything else is derived from it.
function compute(state, ingredients) {
  let totalDm = 0, totalAsFed = 0, totalCost = 0;
  const sums = {};
  NUTRIENT_LIST.forEach(k => { sums[k] = 0; });

  ingredients.forEach((ing, i) => {
    const kg = state[i];
    totalDm += kg;
    totalAsFed += asFed(kg, ing.dm, ing.name);
    totalCost += kg * ing.price;
    NUTRIENT_LIST.forEach(k => { sums[k] += kg * ing.n[k]; });
  });

  // Weighted average: sum(kg x percent) / total kg. 0/0 is NaN, so guard the empty ration.
  const nutrients = {};
  NUTRIENT_LIST.forEach(k => { nutrients[k] = totalDm > 0 ? sums[k] / totalDm : 0; });
  nutrients.DCAD = dcad(nutrients);
  return { totalDm, totalAsFed, totalCost, nutrients };
}

// "ok" inside the window, "warn" within 3.5% of the axis of an edge, "over" outside.
function status(band, value) {
  const outside = (band.lo !== null && value < band.lo - EPSILON) || (band.hi !== null && value > band.hi + EPSILON);
  if (outside) return "over";
  const near = (band.axis[1] - band.axis[0]) * 0.035;
  if ((band.lo !== null && value - band.lo < near) || (band.hi !== null && band.hi - value < near)) return "warn";
  return "ok";
}

// Where a value sits on its track, 0 to 100, clamped so a wild value parks at the edge.
function needlePercent(band, value) {
  const pct = (value - band.axis[0]) / (band.axis[1] - band.axis[0]) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Price per kg of a nutrient delivered: the number you actually buy on.
function costPerKgOf(priceAsFed, dmPercent, nutrientPercent) {
  return priceAsFed / (dmPercent / 100) / (nutrientPercent / 100);
}

// Cumulative loading sheet. A scale head shows the running total, so we give running totals.
function mixerSheet(state, ingredients, cows, targetDmPct) {
  const lines = ingredients
    .map((ing, i) => ({ ing, kg: state[i] }))
    .filter(l => l.kg > 0.0001)
    .sort((a, b) => a.ing.order - b.ing.order)
    .map(l => ({ name: l.ing.name, group: l.ing.group, add: asFed(l.kg, l.ing.dm, l.ing.name) * cows }));

  const dmTotal = state.reduce((a, b) => a + b, 0) * cows;
  const batchTotal = dmTotal / (targetDmPct / 100);
  const water = Math.max(0, batchTotal - lines.reduce((a, l) => a + l.add, 0));

  let running = 0;
  const steps = lines.map(l => { running += l.add; return Object.assign({}, l, { cumulative: running }); });
  return { steps, water, total: running + water };
}

if (typeof module !== "undefined") {
  module.exports = { asFed, dcad, ecm, nrc, compute, status, needlePercent, costPerKgOf, mixerSheet };
}
