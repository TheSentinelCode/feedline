"use strict";
/* SERVER (Course 6): serves the front end and exposes the solver as an API. */
const express = require("express");
const path = require("path");
const { INGREDIENTS } = require("./public/js/data.js");
const { highProducing, formulate, costDrivers } = require("./solver.js");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));   // only public/ is exposed, never server.js

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/formulate", (req, res) => {
  const { nelFloor = 1.58, dmiFloor, dmiCeiling, excludeStale = true } = req.body || {};

  // Validate at the boundary. 400 = malformed request, 422 = understood but unusable.
  if (![nelFloor, dmiFloor, dmiCeiling].every(Number.isFinite)) {
    return res.status(400).json({ kind: "bad_request", detail: "nelFloor, dmiFloor and dmiCeiling must be numbers." });
  }
  if (dmiFloor > dmiCeiling) {
    return res.status(422).json({ kind: "invalid_data", detail: "Intake floor is above the ceiling. The floor is what the bunk measured, the ceiling is the NRC prediction." });
  }

  const usable = INGREDIENTS.filter(i => !(excludeStale && i.stale));
  const rules = highProducing(nelFloor);
  const band = { floor: dmiFloor, ceiling: dmiCeiling };
  const result = formulate(usable, rules, band);

  if (!result.feasible) {
    return res.status(422).json({ kind: "infeasible", detail: "No ration satisfies the rules, even after relaxing." });
  }
  res.json({
    cost: result.cost,
    relaxations: result.relaxations,
    lineItems: usable.map((ing, i) => ({ ingredient: ing.name, kgDm: result.kg[i] })).filter(l => l.kgDm > 1e-6),
    drivers: costDrivers(usable, rules, band, result)
  });
});

module.exports = app;     // exported so tests can call it without opening a port
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("Feedline on http://localhost:" + PORT));
}
