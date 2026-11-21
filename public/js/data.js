"use strict";
/* DATA: everything the screens show. No DOM code in this file.
   Later (Course 6 and 10) this file becomes API responses and database rows. */

// Order matters: every ingredient lists its nutrient values in this order.
// All values are percent of DRY MATTER, except NEL (Mcal per kg DM), AMEn & NE (kcal/kg).
const NUTRIENT_KEYS = [
  "CP", "NEL", "NDF", "peNDF", "Starch", "Sugar", "Fat", "Ca", "P", "K", "Na", "S", "Cl",
  "AMEn", "NE", "SID_Lys", "aP", "STTD_P"
];

function makeIngredient(name, supplier, dm, price, values, sol, max, extra) {
  const n = {};
  NUTRIENT_KEYS.forEach((key, i) => { n[key] = values[i]; });
  // price is rand per kg of DRY MATTER. sol is the stored least-cost answer in kg DM.
  return Object.assign({ name, supplier, dm, price, n, sol, max, min: 0 }, extra);
}

const INGREDIENTS = [
  //                 name              supplier          DM%  R/kgDM  [18 nutrient values mapping to NUTRIENT_KEYS]
  makeIngredient("Maize silage",   "Own bunker",     35, 2.35, [7.5, 1.55, 42,  34,  32,  1.0, 3.0, .25,  .22,  1.10, .02,  .14,  .28,  0,    0,    0.2,    0.11, 0.10], 8, 8.0, { min: 3, group: "forage", order: 3 }),
  makeIngredient("Lucerne hay",    "Nova Feeds",     89, 4.60, [18.5,1.28, 42,  40,  2,   6.0, 2.2, 1.35, .26,  2.40, .08,  .28,  .45,  0,    0,    0.6,    1.20, 1.10], 4.35602602, 6.0, { min: 1, group: "forage", order: 1 }),
  makeIngredient("Eragrostis hay", "Own lands",      90, 3.10, [7.0, 1.05, 68,  62,  1,   5.0, 1.6, .35,  .18,  1.60, .03,  .18,  .55,  0,    0,    0.2,    0.80, 0.70], 0, 6.0, { group: "forage", order: 2 }),
  makeIngredient("Maize meal",     "Epol",           88, 4.95, [8.5, 1.96, 11,  2,   65,  2.0, 3.5, .03,  .30,  .42,  .02,  .12,  .06,  3350, 2450, 0.26,   0.14, 0.12], 0.27352257, 7.0, { group: "concentrate", order: 4 }),
  makeIngredient("Hominy chop",    "Driehoek Voere", 89, 4.15, [10.5,2.00, 22,  3,   35,  2.0, 8.5, .05,  .55,  .65,  .03,  .16,  .07,  3100, 2300, 0.32,   0.22, 0.18], 2.4, 2.4, { group: "concentrate", order: 5 }),
  makeIngredient("Soya oilcake",   "Epol",           89, 9.40, [46,  1.88, 12,  2,   3,   8.0, 2.0, .35,  .68,  2.20, .02,  .42,  .08,  2400, 1950, 2.95,   0.65, 0.55], 3.44690557, 4.0, { group: "concentrate", order: 6, locked: true }),
  makeIngredient("Canola oilcake", "Driehoek Voere", 90, 7.20, [35,  1.72, 26,  4,   3,   7.0, 3.0, .70,  1.10, 1.30, .05,  .70,  .09,  2100, 1700, 1.85,   0.45, 0.38], 0, 2.5, { group: "concentrate", order: 7 }),
  makeIngredient("Wheat bran",     "Nova Feeds",     88, 4.05, [16,  1.60, 40,  8,   21,  5.0, 4.0, .13,  1.20, 1.30, .01,  .21,  .06,  1650, 1400, 0.95,   0.35, 0.30], 2, 2.0, { group: "concentrate", order: 8 }),
  makeIngredient("Brewers grain",  "SAB Rosslyn",    24, 2.10, [25,  1.62, 46,  12,  5,   1.0, 6.5, .30,  .60,  .09,  .03,  .32,  .12,  1400, 1200, 0.90,   0.15, 0.12], 0, 2.8, { group: "concentrate", order: 9, stale: true, ageDays: 19 }),
  makeIngredient("Limestone",      "Nova Feeds",     99, 1.60, [0,   0,    0,   0,   0,   0,   0,   38,   .02,  .03,  .03,  .04,  .03,  0,    0,    0,      36.0, 35.0], 0.12354585, 0.45, { group: "mineral", order: 10 }),
  makeIngredient("Dairy premix",   "Epol",           97, 28.0, [0,   0,    0,   0,   0,   0,   0,   8,    4.0,  .50,  12,   1.5,  8,    0,    0,    0,      7.5,  7.0],  0.3000, 0.30, { min: .25, group: "mineral", order: 11 }),
  makeIngredient("Molasses syrup", "Molatek",        75, 3.80, [3.8, 1.60, .2,  0,   0,   58,  .1,  .90,  .10,  4.80, .20,  .45,  1.50, 2700, 2100, 0.08,   1.50, 1.30], 1.5000, 1.5, { group: "liquid", order: 12 })
];

// Each band: legal window (lo / hi, null = no limit on that side) and the axis the track is drawn across.
const BANDS = [
  { key: "CP",     label: "Crude protein",   unit: "%",         lo: 16.0, hi: 17.5, axis: [12, 20],      dp: 2 },
  { key: "NEL",    label: "Net energy",      unit: "Mcal/kg",   lo: 1.58, hi: null, axis: [1.30, 1.85],  dp: 3 },
  { key: "NDF",    label: "NDF",             unit: "%",         lo: 28,   hi: 36,   axis: [22, 42],      dp: 1 },
  { key: "peNDF",  label: "Effective NDF",   unit: "%",         lo: 20,   hi: null, axis: [12, 32],      dp: 1 },
  { key: "Starch", label: "Starch",          unit: "%",         lo: null, hi: 28,   axis: [8, 36],       dp: 1 },
  { key: "Sugar",  label: "Sugar",           unit: "%",         lo: 4,    hi: 8,    axis: [0, 12],       dp: 1 },
  { key: "Fat",    label: "Crude fat",       unit: "%",         lo: null, hi: 6,    axis: [0, 9],        dp: 2 },
  { key: "Ca",     label: "Calcium",         unit: "%",         lo: 0.80, hi: 1.10, axis: [0.4, 1.5],    dp: 2 },
  { key: "P",      label: "Phosphorus",      unit: "%",         lo: 0.38, hi: 0.50, axis: [0.2, 0.7],    dp: 2 },
  { key: "DCAD",   label: "DCAD",            unit: "mEq/100 g", lo: 25,   hi: null, axis: [-10, 70],     dp: 0 }
];

// --- MULTI-SPECIES PROFILES ---
const SPECIES_PROFILES = {
  dairy_lactating: {
    id: "dairy_lactating",
    name: "Dairy Cattle (Lactating - NRC 2001)",
    basis: "DM",
    energyUnit: "Mcal NEL/kg",
    group: {
      name: "High group, Pen 3", breed: "Holstein-Friesian", cows: 48,
      bodyWeight: 620, dim: 142, milk: 34.2, fat: 3.88, protein: 3.28,
      measuredDmi: 22.40, milkPrice: 8.20, targetDmPct: 48
    },
    defaultState: [8.0, 4.35602602, 0, 0.27352257, 2.4, 3.44690557, 0, 2, 0, 0.12354585, 0.30, 1.5],
    herdFields: [
      { key: "cows",       label: "Number of cows",   hint: "head" },
      { key: "bodyWeight", label: "Live weight",      hint: "kg" },
      { key: "dim",        label: "Days in milk",     hint: "days" },
      { key: "milk",       label: "Milk yield",       hint: "kg / cow / day" },
      { key: "fat",        label: "Butterfat",        hint: "%" },
      { key: "protein",    label: "True protein",     hint: "%" }
    ],
    bands: [
      { key: "CP",     label: "Crude protein",   unit: "%",         lo: 16.0, hi: 17.5, axis: [12, 20],      dp: 2 },
      { key: "NEL",    label: "Net energy",      unit: "Mcal/kg",   lo: 1.58, hi: null, axis: [1.30, 1.85],  dp: 3 },
      { key: "NDF",    label: "NDF",             unit: "%",         lo: 28,   hi: 36,   axis: [22, 42],      dp: 1 },
      { key: "peNDF",  label: "Effective NDF",   unit: "%",         lo: 20,   hi: null, axis: [12, 32],      dp: 1 },
      { key: "Starch", label: "Starch",          unit: "%",         lo: null, hi: 28,   axis: [8, 36],       dp: 1 },
      { key: "Sugar",  label: "Sugar",           unit: "%",         lo: 4,    hi: 8,    axis: [0, 12],       dp: 1 },
      { key: "Fat",    label: "Crude fat",       unit: "%",         lo: null, hi: 6,    axis: [0, 9],        dp: 2 },
      { key: "Ca",     label: "Calcium",         unit: "%",         lo: 0.80, hi: 1.10, axis: [0.4, 1.5],    dp: 2 },
      { key: "P",      label: "Phosphorus",      unit: "%",         lo: 0.38, hi: 0.50, axis: [0.2, 0.7],    dp: 2 },
      { key: "DCAD",   label: "DCAD",            unit: "mEq/100 g", lo: 25,   hi: null, axis: [-10, 70],     dp: 0 }
    ]
  },
  broiler_grower: {
    id: "broiler_grower",
    name: "Broiler Chicken (Grower 11-24d - Ross 308)",
    basis: "As-Fed (88% DM)",
    energyUnit: "kcal AMEn/kg",
    group: {
      name: "House 2 Grower", breed: "Ross 308", birds: 5000,
      bodyWeight: 0.85, ageDays: 18, targetWeight: 1.2, adg: 0.055
    },
    defaultState: [0, 0, 0, 0.62, 0, 0.34, 0, 0, 0, 0.015, 0.025, 0],
    herdFields: [
      { key: "birds",        label: "Number of birds",  hint: "birds" },
      { key: "bodyWeight",   label: "Current weight",   hint: "kg" },
      { key: "ageDays",      label: "Age",              hint: "days" },
      { key: "targetWeight", label: "Target weight",    hint: "kg" }
    ],
    bands: [
      { key: "CP",      label: "Crude protein",   unit: "%",       lo: 21.0, hi: 21.5, axis: [16, 26], dp: 1 },
      { key: "AMEn",    label: "Energy (AMEn)",   unit: "kcal/kg", lo: 3050, hi: null, axis: [2700, 3400], dp: 0 },
      { key: "SID_Lys", label: "SID Lysine",      unit: "%",       lo: 1.10, hi: 1.15, axis: [0.8, 1.5], dp: 2 },
      { key: "Ca",      label: "Calcium",         unit: "%",       lo: 0.85, hi: 0.95, axis: [0.5, 1.2], dp: 2 },
      { key: "aP",      label: "Avail. Phosphorus", unit: "%",     lo: 0.42, hi: null, axis: [0.2, 0.6], dp: 2 }
    ]
  },
  pig_finisher: {
    id: "pig_finisher",
    name: "Pig (Finisher 85-120kg - PIC Standard)",
    basis: "As-Fed (88% DM)",
    energyUnit: "kcal NE/kg",
    group: {
      name: "Finishing Batch A", breed: "PIC Camborough", pigs: 250,
      bodyWeight: 95, targetGain: 0.95, daysOnFeed: 42
    },
    defaultState: [0, 0, 0, 0.55, 0.15, 0.18, 0, 0, 0, 0.012, 0.028, 0],
    herdFields: [
      { key: "pigs",       label: "Number of pigs",   hint: "head" },
      { key: "bodyWeight", label: "Live weight",      hint: "kg" },
      { key: "targetGain", label: "Target gain",      hint: "kg / day" },
      { key: "daysOnFeed", label: "Days on feed",     hint: "days" }
    ],
    bands: [
      { key: "CP",      label: "Crude protein",   unit: "%",       lo: 14.5, hi: 15.5, axis: [10, 20], dp: 1 },
      { key: "NE",      label: "Net Energy",      unit: "kcal/kg", lo: 2400, hi: null, axis: [2100, 2700], dp: 0 },
      { key: "SID_Lys", label: "SID Lysine",      unit: "%",       lo: 0.75, hi: null, axis: [0.5, 1.1], dp: 2 },
      { key: "Ca",      label: "Calcium",         unit: "%",       lo: 0.55, hi: 0.65, axis: [0.3, 0.9], dp: 2 },
      { key: "STTD_P",  label: "STTD Phosphorus", unit: "%",       lo: 0.28, hi: null, axis: [0.1, 0.5], dp: 2 }
    ]
  }
};
// The animal group. Mutable: the Herd screen edits these numbers.
const GROUP = {
  name: "High group, Pen 3", breed: "Holstein-Friesian", cows: 48,
  bodyWeight: 620, dim: 142, milk: 34.2, fat: 3.88, protein: 3.28,
  measuredDmi: 22.40,   // from the bunk: (offered - refused) x DM% / cows
  milkPrice: 8.20,      // rand per kg, excluding VAT
  targetDmPct: 48       // mixer target: the water line makes up the difference
};

const GROUP_LABELS = { forage: "Forages first", concentrate: "Concentrates", mineral: "Minerals", liquid: "Liquids last" };

const FEEDS = [  // protein sources: price as delivered, nutrient percentages
  { name: "Sunflower oilcake",  supplier: "Nova Feeds, Lichtenburg", priceAsFed: 5.31,  dm: 90, cp: 37, lysine: 1.3, age: 4 },
  { name: "Soya oilcake",       supplier: "Epol, Klerksdorp",        priceAsFed: 8.37,  dm: 89, cp: 46, lysine: 2.8, age: 2, locked: true },
  { name: "Canola oilcake",     supplier: "Driehoek Voere",          priceAsFed: 6.48,  dm: 90, cp: 35, lysine: 2.0, age: 6 },
  { name: "Fishmeal",           supplier: "Marine Protein SA",       priceAsFed: 20.93, dm: 93, cp: 65, lysine: 4.8, age: 9 },
  { name: "Brewers grain, wet", supplier: "SAB Rosslyn",             priceAsFed: 0.504, dm: 24, cp: 25, lysine: 1.6, age: 19 }
];
const STALE_AFTER_DAYS = 14;

const FARMS = [
  { name: "Sandspruit, Vryburg",        groups: 3, cost: 118.40, mofc: 142.10, eff: 1.38, issue: "Feed efficiency under 1.50",             level: "over" },
  { name: "Doornkop Melkery",           groups: 4, cost: 109.85, mofc: 168.30, eff: 1.54, issue: "2 fresh cows in negative energy balance", level: "over" },
  { name: "Vaalkop Dairy, Lichtenburg", groups: 4, cost: 104.95, mofc: 175.49, eff: 1.61, issue: "Lucerne analysis 214 days old",           level: "warn" },
  { name: "Rietvlei Jerseys",           groups: 3, cost: 96.20,  mofc: 181.05, eff: 1.66, issue: "3 prices past 14 days",                   level: "warn" },
  { name: "Maquassi Hills Dairy",       groups: 3, cost: 101.70, mofc: 173.90, eff: 1.58, issue: "Nothing outstanding",                     level: "ok" },
  { name: "Klipdrift Ayrshires",        groups: 2, cost: 99.40,  mofc: 170.20, eff: 1.57, issue: "Nothing outstanding",                     level: "ok" }
];

const HERD_FIELDS = [
  { key: "bodyWeight", label: "Live weight",      hint: "kg" },
  { key: "dim",        label: "Days in milk",     hint: "days" },
  { key: "milk",       label: "Milk yield",       hint: "kg per cow per day" },
  { key: "fat",        label: "Butterfat",        hint: "%" },
  { key: "protein",    label: "True milk protein", hint: "%" }
];

// A stored explanation for the "no feasible ration" panel. Phase 3 replaces it with the real solver.
const DIAGNOSIS = {
  requested: 1.65, achievable: 1.61, relaxedTo: 1.58,
  conflicts: [
    "peNDF floor 20% forces in maize silage and lucerne, which top out at 1.55 and 1.28 Mcal/kg.",
    "Starch ceiling 28% stops more maize meal replacing that forage.",
    "Fat ceiling 6% stops hominy chop covering the gap."
  ]
};

// What the binding rules cost, from re-solving the LP with each rule tightened a little (see solver.js costDrivers).
// Units matter: these are rand per cow per day for the stated change in the TARGET.
const COST_DRIVERS = [
  { label: "Energy density floor", change: "+0.01 Mcal/kg", rand: 2.42 },
  { label: "Calcium floor",        change: "+0.1 percentage point", rand: 1.09 },
  { label: "DCAD floor",           change: "+1 mEq/100 g", rand: 4.60 }
];

if (typeof module !== "undefined") {
  module.exports = { COST_DRIVERS, NUTRIENT_KEYS, INGREDIENTS, BANDS, GROUP, GROUP_LABELS, FEEDS, FARMS, HERD_FIELDS, STALE_AFTER_DAYS, DIAGNOSIS, SPECIES_PROFILES};
}
