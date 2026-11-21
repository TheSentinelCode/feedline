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
  const ctxCells = document.getElementById("ctx-cells");
  if (ctxCells) {
    if (GROUP.birds !== undefined) {
      ctxCells.innerHTML =
        cell("Batch", esc(GROUP.name)) + cell("Breed", esc(GROUP.breed)) +
        cell("Birds", GROUP.birds) + cell("Age", GROUP.ageDays + " days");
    } else if (GROUP.pigs !== undefined) {
      ctxCells.innerHTML =
        cell("Batch", esc(GROUP.name)) + cell("Breed", esc(GROUP.breed)) +
        cell("Pigs", GROUP.pigs) + cell("Live Wt", GROUP.bodyWeight + " kg");
    } else {
      ctxCells.innerHTML =
        cell("Group", esc(GROUP.name)) + cell("Animals", GROUP.cows + " " + esc(GROUP.breed)) +
        cell("Mean DIM", GROUP.dim) + cell("Milk", GROUP.milk + " kg, " + GROUP.fat + " F, " + GROUP.protein + " P");
    }
  }
}

function renderRail(result) {
  const reqEl = document.getElementById("req");
  if (!reqEl) return;

  const row = (k, v, unit, sub) =>
    '<div class="row"><div class="k">' + k + '</div><div class="v num">' + v + '<em>' + unit + '</em></div><div class="sub">' + sub + '</div></div>';

  if (GROUP.birds !== undefined || GROUP.pigs !== undefined) {
    // Non-ruminant view (Broiler / Pig)
    const animalType = GROUP.birds !== undefined ? "Broiler (Ross 308)" : "Pig Finisher (PIC)";
    const targetEnergy = result.nutrients.AMEn || result.nutrients.NE || 0;
    
    reqEl.innerHTML =
      row("Animal Category", animalType, "", GROUP.name) +
      row("Estimated Intake", (result.totalAsFed * (GROUP.birds || GROUP.pigs)).toFixed(1), "kg as-fed/d", "Total batch consumption") +
      row("Dietary Energy Density", targetEnergy.toFixed(0), GROUP.birds !== undefined ? "kcal AMEn/kg" : "kcal NE/kg", "Concentration check") +
      row("Crude Protein", (result.nutrients.CP || 0).toFixed(2), "%", "Balanced profile") +
      row("Digestible Amino Acids", (result.nutrients.SID_Lys || 0).toFixed(2), "% SID Lys", "Primary limiting amino acid");
  } else {
    // Dairy view (NRC 2001)
    const need = nrc(GROUP);
    const nelVal = (result.nutrients && result.nutrients.NEL !== undefined) ? result.nutrients.NEL : 0;
    const balance = nelVal * result.totalDm - need.nelTotal;
    const intakePct = GROUP.measuredDmi / need.dmi * 100;

    reqEl.innerHTML =
      row("Predicted intake", need.dmi.toFixed(2), "kg DM/d", "NRC 2001, lactating cow") +
      row("Measured intake", GROUP.measuredDmi.toFixed(2), "kg DM/d",
          '<span class="flag ' + (intakePct < 95 ? "warn" : "ok") + '">' + intakePct.toFixed(0) + '% of predicted</span>') +
      row("Net energy required", need.nelTotal.toFixed(2), "Mcal/d", need.nelMaint.toFixed(2) + " maintenance + " + need.nelMilk.toFixed(2) + " milk") +
      row("Energy balance", (balance >= 0 ? "+" : "") + balance.toFixed(2), "Mcal/d",
          '<span class="flag ' + (balance >= 0 ? "ok" : "over") + '">' + (balance >= 0 ? "No negative energy balance" : "Negative energy balance") + '</span>') +
      row("4% fat-corrected milk", need.fcm.toFixed(1), "kg/d", "");
  }
}

function renderFormulate(state) {
  let r;
  try { r = compute(state, INGREDIENTS); }
  catch (err) { showError(err.message); return; }

  const rowsContainer = document.getElementById("rows");
  if (rowsContainer) {
    Array.from(rowsContainer.children).forEach((row, i) => {
      const ing = INGREDIENTS[i], kg = state[i];
      row.classList.toggle("zero", kg <= 0.0001);
      row.querySelector('[data-cell="dm"]').textContent   = kg.toFixed(2);
      row.querySelector('[data-cell="af"]').textContent   = asFed(kg, ing.dm, ing.name).toFixed(2);
      row.querySelector('[data-cell="pct"]').textContent  = r.totalDm > 0 ? (100 * kg / r.totalDm).toFixed(1) : "0.0";
      row.querySelector('[data-cell="cost"]').textContent = (kg * ing.price).toFixed(2);
      const slider = row.querySelector("input");
      if (slider && parseFloat(slider.value) !== kg) slider.value = kg;
    });
  }

  setText("tot-dm", r.totalDm.toFixed(2));
  setText("tot-af", r.totalAsFed.toFixed(2));
  setText("tot-cost", r.totalCost.toFixed(2));

  let broken = 0;
  BANDS.forEach(b => {
    const v = (r.nutrients && r.nutrients[b.key] !== undefined) ? r.nutrients[b.key] : 0;
    const st = status(b, v);
    if (st === "over") broken++;
    const val = document.querySelector('[data-v="' + b.key + '"]');
    if (val) {
      val.innerHTML = v.toFixed(b.dp) + '<em>' + b.unit + '</em>';
      val.style.color = st === "ok" ? "" : "var(--" + st + ")";
    }
    const needle = document.querySelector('[data-n="' + b.key + '"]');
    if (needle) {
      needle.style.left = needlePercent(b, v) + "%";
      needle.className = "needle " + st;
    }
  });

  const count = document.getElementById("band-count");
  if (count) {
    count.textContent = broken === 0 ? "All " + BANDS.length + " within limits" : broken + (broken === 1 ? " constraint broken" : " constraints broken");
    count.style.color = broken === 0 ? "var(--ok)" : "var(--over)";
  }

  // --- DYNAMIC SPECIES SUMMARY CARD ADAPTATION ---
  setText("e-cost", money(r.totalCost));
  setText("e-perkg", r.totalDm > 0 ? money(r.totalCost / r.totalDm) + " per kg DM" : "");

  if (GROUP.birds !== undefined) {
    const totalBirds = GROUP.birds;
    setText("e-group", "R" + Math.round(r.totalCost * totalBirds * 0.1).toLocaleString("en-ZA"));
    setText("e-groupsub", totalBirds + " broilers");
    setText("e-mofc", "N/A (Grower)");
    setText("e-eff", "-");
    setText("e-ecm", "Batch feed");
    const effSub = document.getElementById("e-effsub");
    if (effSub) effSub.textContent = "Monitor FCR weekly";
  } else if (GROUP.pigs !== undefined) {
    const totalPigs = GROUP.pigs;
    setText("e-group", "R" + Math.round(r.totalCost * totalPigs * 0.5).toLocaleString("en-ZA"));
    setText("e-groupsub", totalPigs + " finishers");
    setText("e-mofc", "Margin over feed");
    setText("e-eff", "-");
    setText("e-ecm", "Finishing phase");
    const effSub = document.getElementById("e-effsub");
    if (effSub) effSub.textContent = "Target ADG > 950g/d";
  } else {
    const milkEcm = ecm(GROUP.milk, GROUP.fat, GROUP.protein);
    const eff = r.totalDm > 0 ? milkEcm / r.totalDm : 0;
    setText("e-group", "R" + Math.round(r.totalCost * GROUP.cows).toLocaleString("en-ZA"));
    setText("e-groupsub", GROUP.cows + " cows");
    setText("e-mofc", money(GROUP.milk * GROUP.milkPrice - r.totalCost));
    setText("e-eff", r.totalDm > 0 ? eff.toFixed(2) : "-");
    const effSub = document.getElementById("e-effsub");
    if (effSub) {
      effSub.textContent = eff >= 1.5 ? "Above the 1.50 target" : "Below 1.50, investigate";
      effSub.style.color = eff >= 1.5 ? "var(--ok)" : "var(--over)";
    }
    setText("e-ecm", milkEcm.toFixed(1) + " kg");
  }

  renderRail(r);
  renderDrivers();
}

function showError(message) { 
  const el = document.getElementById("error"); 
  if (el) { el.textContent = message; el.hidden = false; } 
}

function showDiagnosis(d) {
  const el = document.getElementById("diag");
  if (!el) return;
  el.innerHTML =
    '<h3>No feasible ration at NEL ' + d.requested + ' Mcal/kg DM</h3>' +
    '<p>The highest energy density this ingredient list can reach is <b class="num">' + d.achievable + '</b>. What is blocking it:</p>' +
    '<ul>' + d.conflicts.map(c => '<li>' + esc(c) + '</li>').join("") + '</ul>' +
    '<p>Relaxing the floor to <b class="num">' + d.relaxedTo + '</b> returns a ration. Alternatives: a better forage, or a lower peNDF floor if the bunk score supports it.</p>';
  el.hidden = false;
}

function renderDrivers() {
  const driversEl = document.getElementById("drivers");
  if (!driversEl) return;
  driversEl.innerHTML =
    '<p style="font-size:13px;margin-bottom:8px">Each target has a price. Tightening it costs, per cow per day:</p>' +
    '<ul class="note-list">' + COST_DRIVERS.map(d =>
      '<li>' + esc(d.label) + ', ' + esc(d.change) + ': <b class="num" style="color:var(--money)">' + money(d.rand) + '</b></li>').join("") + '</ul>' +
    '<p class="note" style="margin-top:8px">From re-solving the model with each rule tightened. Valid for the stored prices only.</p>';
}