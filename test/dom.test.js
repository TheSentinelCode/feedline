"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { JSDOM } = require("jsdom");

test("page loads, renders 12 rows, and sliders recompute totals", async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, "../public/index.html"), { runScripts: "dangerously", resources: "usable" });
  await new Promise(r => dom.window.addEventListener("load", r));
  const d = dom.window.document;
  assert.equal(d.querySelectorAll("#rows .rt-row").length, 12);
  assert.equal(d.getElementById("tot-dm").textContent, "22.40");
  assert.match(d.getElementById("e-cost").textContent, /^R104\.9[45]$/);
  assert.equal(d.getElementById("band-count").textContent, "All 10 within limits");

  // move the soya slider to zero: protein falls below its floor and the page says so
  const soya = d.querySelectorAll("#rows .rt-row")[5].querySelector("input");
  soya.value = "0";
  soya.dispatchEvent(new dom.window.Event("input"));
  assert.match(d.getElementById("band-count").textContent, /broken/);

  // Auto-formulate restores it
  d.getElementById("solve").click();
  assert.equal(d.getElementById("band-count").textContent, "All 10 within limits");

  // tabs
  d.querySelector('[data-screen="mixer"]').click();
  assert.ok(d.getElementById("mixer").classList.contains("on"));
  assert.ok(d.querySelectorAll("#mx-sheet .mx-step").length >= 10);

  // herd input recomputes the requirement
  const w = d.getElementById("h-bodyWeight");
  w.value = "700"; w.dispatchEvent(new dom.window.Event("input"));
  assert.match(d.getElementById("herd-req").textContent, /Predicted intake/);
  assert.equal(d.querySelectorAll("#feeds tbody tr").length, 5);
  assert.equal(d.querySelectorAll("#farms tbody tr").length, 6);
  dom.window.close();
});
