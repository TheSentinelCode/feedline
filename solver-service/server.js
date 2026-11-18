"use strict";
/* SOLVER SERVICE (Course 9): the solver on its own, behind a small HTTP contract. */
const express = require("express");
const { highProducing, formulate } = require("../solver.js");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Contract in:  { ingredients: [...], nelFloor: number, band: { floor, ceiling } }
// Contract out: { feasible, cost, kg: [...], relaxations: [...] }   (kg is in the order of the ingredients sent)
app.post("/solve", (req, res) => {
  const { ingredients, nelFloor, band } = req.body || {};
  if (!Array.isArray(ingredients) || !band || !Number.isFinite(nelFloor)) {
    return res.status(400).json({ detail: "ingredients, nelFloor and band are required." });
  }
  res.json(formulate(ingredients, highProducing(nelFloor), band));
});
app.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 4000, () => console.log("solver service up"));
