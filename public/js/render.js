"use strict";
/* RENDER (Formulate screen): turns data into DOM. Reads from compute.js, writes to the page. */

// Anything that came from data and goes into innerHTML must be escaped, or it becomes an XSS hole.
function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const money = v => "R" + v.toFixed(2);
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

// Structure is built ONCE. Values are updated on every change. Rebuilding would destroy the slider being dragged.
function buildRows(ingredients, state, onSlide) {
  const host = document.getElementById("rows");
  host.innerHTML = "";
  ingredients.forEach((ing, i) => {
    const row = document.createElement("div");
    row.className = "rt-row" + (ing.stale ? " excluded" : "");
    row.innerHTML =
      '<div class="ing"><b>' + esc(ing.name) + '</b><span>' + esc(ing.supplier) +
        (ing.locked ? ' <span class="lock">&#9679; locked</span>' : '') +
        (ing.stale ? ' <span class="tag stale">' + ing.ageDays + ' d old</span>' : '') + '</span></div>' +
      '<div class="c-sl"><input type="range" min="0" max="' + ing.max + '" step="0.01" value="' + state[i] +
        '" aria-label="' + esc(ing.name) + ' kilograms dry matter"></div>' +
      '<div class="ta num c-dm" data-cell="dm"></div><div class="ta num c-af" data-cell="af"></div>' +
      '<div class="ta num c-pct" data-cell="pct"></div><div class="ta num c-cost" data-cell="cost"></div>';
    row.querySelector("input").addEventListener("input", e => onSlide(i, parseFloat(e.target.value)));
    host.appendChild(row);
  });
}

function buildBands(bands) {
  const host = document.getElementById("bands");
  host.innerHTML = "";
  bands.forEach(b => {
    const span = b.axis[1] - b.axis[0];
    const left  = b.lo === null ? 0   : (b.lo - b.axis[0]) / span * 100;
    const right = b.hi === null ? 100 : (b.hi - b.axis[0]) / span * 100;
    const div = document.createElement("div");
    div.className = "band";
    div.innerHTML =
      '<div class="band-top"><span class="nm">' + esc(b.label) + '</span><span class="val num" data-v="' + b.key + '"></span></div>' +
      '<div class="track"><div class="zone' + (b.lo === null ? " open-left" : "") + (b.hi === null ? " open-right" : "") +
        '" style="left:' + left + '%;width:' + (right - left) + '%"></div><div class="needle" data-n="' + b.key + '"></div></div>' +
      '<div class="band-foot"><span class="num">' + (b.lo === null ? "no floor" : "min " + b.lo) + '</span>' +
      '<span class="num">' + (b.hi === null ? "no ceiling" : "max " + b.hi) + '</span></div>';
    host.appendChild(div);
  });
}

function renderContext() {
  const cell = (k, v) => '<div class="cell"><span class="k">' + k + '</span><span class="v num">' + v + '</span></div>';
  document.getElementById("ctx-cells").innerHTML =
    cell("Group", esc(GROUP.name)) + cell("Animals", GROUP.cows + " " + esc(GROUP.breed)) +
    cell("Mean DIM", GROUP.dim) + cell("Milk", GROUP.milk + " kg, " + GROUP.fat + " F, " + GROUP.protein + " P");
}

function renderRail(result) {
  const need = nrc(GROUP);
  const balance = result.nutrients.NEL * result.totalDm - need.nelTotal;
  const intakePct = GROUP.measuredDmi / need.dmi * 100;
  const row = (k, v, unit, sub) =>
    '<div class="row"><div class="k">' + k + '</div><div class="v num">' + v + '<em>' + unit + '</em></div><div class="sub">' + sub + '</div></div>';
  document.getElementById("req").innerHTML =
    row("Predicted intake", need.dmi.toFixed(2), "kg DM/d", "NRC 2001, lactating cow") +
    row("Measured intake", GROUP.measuredDmi.toFixed(2), "kg DM/d",
        '<span class="flag ' + (intakePct < 95 ? "warn" : "ok") + '">' + intakePct.toFixed(0) + '% of predicted</span>') +
    row("Net energy required", need.nelTotal.toFixed(2), "Mcal/d", need.nelMaint.toFixed(2) + " maintenance + " + need.nelMilk.toFixed(2) + " milk") +
    row("Energy balance", (balance >= 0 ? "+" : "") + balance.toFixed(2), "Mcal/d",
        '<span class="flag ' + (balance >= 0 ? "ok" : "over") + '">' + (balance >= 0 ? "No negative energy balance" : "Negative energy balance") + '</span>') +
    row("4% fat-corrected milk", need.fcm.toFixed(1), "kg/d", "");
}

function renderFormulate(state) {
  let r;
  try { r = compute(state, INGREDIENTS); }
  catch (err) { showError(err.message); return; }

  Array.from(document.getElementById("rows").children).forEach((row, i) => {
    const ing = INGREDIENTS[i], kg = state[i];
    row.classList.toggle("zero", kg <= 0.0001);
    row.querySelector('[data-cell="dm"]').textContent   = kg.toFixed(2);
    row.querySelector('[data-cell="af"]').textContent   = asFed(kg, ing.dm, ing.name).toFixed(2);
    row.querySelector('[data-cell="pct"]').textContent  = r.totalDm > 0 ? (100 * kg / r.totalDm).toFixed(1) : "0.0";
    row.querySelector('[data-cell="cost"]').textContent = (kg * ing.price).toFixed(2);
    const slider = row.querySelector("input");
    if (parseFloat(slider.value) !== kg) slider.value = kg;   // only touch it when it differs, so a drag is not interrupted
  });
  setText("tot-dm", r.totalDm.toFixed(2));
  setText("tot-af", r.totalAsFed.toFixed(2));
  setText("tot-cost", r.totalCost.toFixed(2));

  let broken = 0;
  BANDS.forEach(b => {
    const v = r.nutrients[b.key], st = status(b, v);
    if (st === "over") broken++;
    const val = document.querySelector('[data-v="' + b.key + '"]');
    val.innerHTML = v.toFixed(b.dp) + '<em>' + b.unit + '</em>';
    val.style.color = st === "ok" ? "" : "var(--" + st + ")";
    const needle = document.querySelector('[data-n="' + b.key + '"]');
    needle.style.left = needlePercent(b, v) + "%";
    needle.className = "needle " + st;
  });
  const count = document.getElementById("band-count");
  count.textContent = broken === 0 ? "All " + BANDS.length + " within limits" : broken + (broken === 1 ? " constraint broken" : " constraints broken");
  count.style.color = broken === 0 ? "var(--ok)" : "var(--over)";

  const milkEcm = ecm(GROUP.milk, GROUP.fat, GROUP.protein);
  const eff = r.totalDm > 0 ? milkEcm / r.totalDm : 0;
  setText("e-cost", money(r.totalCost));
  setText("e-perkg", r.totalDm > 0 ? money(r.totalCost / r.totalDm) + " per kg DM" : "");
  setText("e-group", "R" + Math.round(r.totalCost * GROUP.cows).toLocaleString("en-ZA"));
  setText("e-groupsub", GROUP.cows + " cows");
  setText("e-mofc", money(GROUP.milk * GROUP.milkPrice - r.totalCost));
  setText("e-eff", r.totalDm > 0 ? eff.toFixed(2) : "-");
  const effSub = document.getElementById("e-effsub");
  effSub.textContent = eff >= 1.5 ? "Above the 1.50 target" : "Below 1.50, investigate";
  effSub.style.color = eff >= 1.5 ? "var(--ok)" : "var(--over)";
  setText("e-ecm", milkEcm.toFixed(1) + " kg");
  renderRail(r);
  renderDrivers();
}

function showError(message) { const el = document.getElementById("error"); el.textContent = message; el.hidden = false; }

function showDiagnosis(d) {
  const el = document.getElementById("diag");
  el.innerHTML =
    '<h3>No feasible ration at NEL ' + d.requested + ' Mcal/kg DM</h3>' +
    '<p>The highest energy density this ingredient list can reach is <b class="num">' + d.achievable + '</b>. What is blocking it:</p>' +
    '<ul>' + d.conflicts.map(c => '<li>' + esc(c) + '</li>').join("") + '</ul>' +
    '<p>Relaxing the floor to <b class="num">' + d.relaxedTo + '</b> returns a ration. Alternatives: a better forage, or a lower peNDF floor if the bunk score supports it.</p>';
  el.hidden = false;
}

function renderDrivers() {
  document.getElementById("drivers").innerHTML =
    '<p style="font-size:13px;margin-bottom:8px">Each target has a price. Tightening it costs, per cow per day:</p>' +
    '<ul class="note-list">' + COST_DRIVERS.map(d =>
      '<li>' + esc(d.label) + ', ' + esc(d.change) + ': <b class="num" style="color:var(--money)">' + money(d.rand) + '</b></li>').join("") + '</ul>' +
    '<p class="note" style="margin-top:8px">From re-solving the model with each rule tightened. Valid for the stored prices only.</p>';
}
