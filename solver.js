"use strict";
/* SOLVER: least-cost formulation as a linear program. Runs in Node (Course 6).
   Same idea as the Python version, rebuilt in JavaScript so the whole stack matches the course. */
const LP = require("javascript-lp-solver");
const { dcad } = require("./public/js/compute.js");

// One rule per entry. crit: lower numbers are relaxed first. limit: how far a relaxable rule may move (null = never).
function highProducing(nelFloor) {
  return [
    { key: "cp_min",     label: "Crude protein floor",   kind: "min", nutrient: "CP",     value: 16.0,     crit: 70, limit: 14.5 },
    { key: "cp_max",     label: "Crude protein ceiling", kind: "max", nutrient: "CP",     value: 17.5,     crit: 30, limit: null },
    { key: "nel_min",    label: "Energy density floor",  kind: "min", nutrient: "NEL",    value: nelFloor, crit: 60, limit: 1.30 },
    { key: "ndf_min",    label: "NDF floor",             kind: "min", nutrient: "NDF",    value: 28,       crit: 50, limit: 24 },
    { key: "ndf_max",    label: "NDF ceiling",           kind: "max", nutrient: "NDF",    value: 36,       crit: 40, limit: null },
    { key: "pendf_min",  label: "Effective NDF floor",   kind: "min", nutrient: "peNDF",  value: 20,       crit: 80, limit: 18 },
    { key: "starch_max", label: "Starch ceiling",        kind: "max", nutrient: "Starch", value: 28,       crit: 75, limit: null },
    { key: "sugar_min",  label: "Sugar floor",           kind: "min", nutrient: "Sugar",  value: 4,        crit: 20, limit: 0 },
    { key: "sugar_max",  label: "Sugar ceiling",         kind: "max", nutrient: "Sugar",  value: 8,        crit: 25, limit: null },
    { key: "fat_max",    label: "Fat ceiling",           kind: "max", nutrient: "Fat",    value: 6,        crit: 85, limit: null },
    { key: "ca_min",     label: "Calcium floor",         kind: "min", nutrient: "Ca",     value: 0.80,     crit: 90, limit: null },
    { key: "ca_max",     label: "Calcium ceiling",       kind: "max", nutrient: "Ca",     value: 1.10,     crit: 95, limit: null },
    { key: "p_min",      label: "Phosphorus floor",      kind: "min", nutrient: "P",      value: 0.38,     crit: 90, limit: null },
    { key: "p_max",      label: "Phosphorus ceiling",    kind: "max", nutrient: "P",      value: 0.50,     crit: 95, limit: null },
    { key: "dcad_min",   label: "DCAD floor",           kind: "min", nutrient: "DCAD",   value: 25,       crit: 88, limit: null },
    { key: "forage_min", label: "Forage share floor",    kind: "min", nutrient: "FORAGE", value: 0.45,     crit: 65, limit: 0.40 }
  ];
}

// Coefficient of one ingredient in one density rule.
// "diet % >= target" is not linear (the total is in the denominator), so multiply out:
//   sum(kg x nutrient) >= target x sum(kg)   becomes   sum((nutrient - target) x kg) >= 0
function coefficient(ing, c) {
  if (c.nutrient === "DCAD")   return dcad(ing.n) - c.value;
  if (c.nutrient === "FORAGE") return (ing.group === "forage" ? 1 : 0) - c.value;
  return ing.n[c.nutrient] - c.value;
}

function buildModel(ingredients, rules, band) {
  const model = { optimize: "cost", opType: "min", constraints: { dm: { min: band.floor, max: band.ceiling } }, variables: {} };
  rules.forEach(c => { model.constraints[c.key] = c.kind === "min" ? { min: 0 } : { max: 0 }; });
  ingredients.forEach((ing, i) => {
    const bound = "bound_" + i;                                  // per-ingredient kg limits
    model.constraints[bound] = { min: ing.min || 0, max: ing.max };
    const v = { cost: ing.price, dm: 1 };
    v[bound] = 1;
    rules.forEach(c => { v[c.key] = coefficient(ing, c); });
    model.variables[ing.name] = v;
  });
  return model;
}

function solveOnce(ingredients, rules, band) {
  const out = LP.Solve(buildModel(ingredients, rules, band));
  if (!out.feasible) return { feasible: false };
  return { feasible: true, cost: out.result, kg: ingredients.map(ing => out[ing.name] || 0) };
}

// Infeasible is a normal answer here, so it is a return value, not an exception.
function formulate(ingredients, rules, band) {
  const first = solveOnce(ingredients, rules, band);
  if (first.feasible) return Object.assign(first, { relaxations: [] });

  const candidates = rules.filter(c => c.limit !== null).sort((a, b) => a.crit - b.crit);
  for (const c of candidates) {
    const without = rules.filter(r => r.key !== c.key);
    if (!solveOnce(ingredients, without, band).feasible) continue;       // not the blocker

    // Bisect between the loosest allowed value (ok) and the requested one (bad).
    let ok = c.limit, bad = c.value;
    const tryValue = v => solveOnce(ingredients, without.concat([Object.assign({}, c, { value: v })]), band).feasible;
    if (!tryValue(ok)) continue;
    for (let i = 0; i < 30; i++) {
      const mid = (ok + bad) / 2;
      if (tryValue(mid)) ok = mid; else bad = mid;
    }
    const result = solveOnce(ingredients, without.concat([Object.assign({}, c, { value: ok })]), band);
    return Object.assign(result, {
      relaxations: [{ key: c.key, label: c.label, from: c.value, to: ok }]
    });
  }
  return { feasible: false, relaxations: [] };
}

// What does each rule cost? Tighten it a little, re-solve, and compare. No dual values needed.
function costDrivers(ingredients, rules, band, base) {
  return rules.map(c => {
    const step = Math.max(Math.abs(c.value) * 0.01, 0.001);
    const tighter = Object.assign({}, c, { value: c.kind === "min" ? c.value + step : c.value - step });
    const r = solveOnce(ingredients, rules.map(x => x.key === c.key ? tighter : x), band);
    return { key: c.key, label: c.label, randPerUnit: r.feasible ? (r.cost - base.cost) / step : null };
  }).filter(d => d.randPerUnit !== null && d.randPerUnit > 1e-6).sort((a, b) => b.randPerUnit - a.randPerUnit);
}

module.exports = { highProducing, buildModel, solveOnce, formulate, costDrivers };
