"use strict";
/* SCREENS: the four other tabs. Each is data in, HTML out. */

function renderFeeds() {
  const rows = FEEDS.map(f => {
    const priceDm = f.priceAsFed / (f.dm / 100);
    return Object.assign({}, f, { priceDm,
      perCp:  costPerKgOf(f.priceAsFed, f.dm, f.cp),
      perLys: costPerKgOf(f.priceAsFed, f.dm, f.lysine),
      stale:  f.age > STALE_AFTER_DAYS });
  });
  const usable = rows.filter(r => !r.stale);
  const bestCp  = Math.min(...usable.map(r => r.perCp));
  const bestLys = Math.min(...usable.map(r => r.perLys));
  const tr = rows.map(r =>
    '<tr' + (r.stale ? ' class="rt-row excluded" style="display:table-row"' : '') + '><td>' + esc(r.name) + '</td><td>' + esc(r.supplier) +
    (r.locked ? ' <span class="tag">locked</span>' : '') + '</td>' +
    '<td class="ta num">' + r.priceAsFed.toFixed(2) + '</td><td class="ta num">' + r.priceDm.toFixed(2) + '</td>' +
    '<td class="ta num">' + r.cp.toFixed(1) + '</td><td class="ta num' + (r.perCp === bestCp ? ' best' : '') + '">' + r.perCp.toFixed(2) + '</td>' +
    '<td class="ta num">' + r.lysine.toFixed(2) + '</td><td class="ta num' + (r.perLys === bestLys ? ' best' : '') + '">' + r.perLys.toFixed(2) + '</td>' +
    '<td><span class="tag' + (r.stale ? ' stale' : '') + '">' + r.age + ' days</span></td></tr>').join("");
  document.getElementById("feeds").innerHTML =
    '<p class="lede">Price per kilogram is the wrong unit for buying protein. This ranks suppliers by the cost of the nutrient you are short of.</p>' +
    '<div class="panel"><div class="panel-hd"><h3>Protein sources</h3><span class="note">Prices older than ' + STALE_AFTER_DAYS + ' days are excluded</span></div>' +
    '<div class="tblwrap"><table class="data"><thead><tr><th>Ingredient</th><th>Supplier</th><th class="ta">R/kg as-fed</th><th class="ta">R/kg DM</th>' +
    '<th class="ta">CP %</th><th class="ta">R/kg CP</th><th class="ta">Lysine %</th><th class="ta">R/kg lysine</th><th>Price age</th></tr></thead><tbody>' + tr + '</tbody></table></div>' +
    '<div class="panel-bd" style="border-top:1px solid var(--rule)"><p style="margin:0">Sunflower is the cheapest protein and the dearest lysine. At 142 days in milk and 34 kg of milk, lysine is the limiting amino acid, so soya stays in the ration despite the higher headline price.</p></div></div>';
}

function renderFarms() {
  const tr = FARMS.map(f =>
    '<tr><td>' + esc(f.name) + '</td><td class="ta num">' + f.groups + '</td><td class="ta num">' + money(f.cost) + '</td>' +
    '<td class="ta num">' + money(f.mofc) + '</td><td class="ta num">' + f.eff.toFixed(2) + '</td>' +
    '<td><span class="flag ' + f.level + '">' + esc(f.issue) + '</span></td></tr>').join("");
  document.getElementById("farms").innerHTML =
    '<p class="lede">A consultant home screen, sorted by what is wrong. Access to each farm is an explicit grant the farm can revoke.</p>' +
    '<div class="panel"><div class="panel-hd"><h3>Your farms</h3><span class="note">' + FARMS.length + ' farms</span></div>' +
    '<div class="tblwrap"><table class="data"><thead><tr><th>Farm</th><th class="ta">Groups</th><th class="ta">Cost/cow/day</th><th class="ta">MOFC</th><th class="ta">Feed eff.</th><th>Needs attention</th></tr></thead><tbody>' + tr + '</tbody></table></div></div>';
}

// The form is built once so typing never loses focus; only the requirement panel re-renders.
function renderHerdForm(onChange) {
  const fields = HERD_FIELDS.map(f =>
    '<div class="field"><label for="h-' + f.key + '">' + esc(f.label) + '<small>' + esc(f.hint) + '</small></label>' +
    '<input id="h-' + f.key + '" inputmode="decimal" value="' + GROUP[f.key] + '"></div>').join("");
  document.getElementById("herd").innerHTML =
    '<p class="lede">Requirements recompute on every keystroke, so the target moves before you commit to a formulation.</p>' +
    '<div class="two"><div class="panel"><div class="panel-hd"><h3>' + esc(GROUP.name) + '</h3><span class="note">' + GROUP.cows + ' animals</span></div><div class="panel-bd">' + fields + '</div></div>' +
    '<div class="panel"><div class="panel-hd"><h3>Computed requirement</h3></div><div class="panel-bd" id="herd-req"></div></div></div>';
  HERD_FIELDS.forEach(f => {
    document.getElementById("h-" + f.key).addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      if (v > 0) { GROUP[f.key] = v; onChange(); }     // ignore empty or nonsense input instead of poisoning the maths
    });
  });
}

function renderHerdRequirement() {
  const n = nrc(GROUP);
  const line = (k, v) => '<div class="field"><label>' + k + '</label><span class="num ta">' + v + '</span></div>';
  document.getElementById("herd-req").innerHTML =
    line("Predicted intake, kg DM/d", n.dmi.toFixed(2)) + line("Net energy, maintenance, Mcal/d", n.nelMaint.toFixed(2)) +
    line("Net energy, lactation, Mcal/d", n.nelMilk.toFixed(2)) + line("Net energy, total, Mcal/d", n.nelTotal.toFixed(2)) +
    line("4% fat-corrected milk, kg/d", n.fcm.toFixed(2));
}

const kgFmt = v => Math.round(v).toLocaleString("en-ZA");

function renderMixer(state) {
  const sheet = mixerSheet(state, INGREDIENTS, GROUP.cows, GROUP.targetDmPct);
  let html = '<div class="phone"><div class="phone-in"><div class="mx-hd"><b>' + esc(GROUP.name) + '</b><span>' +
             GROUP.cows + ' cows, ' + kgFmt(sheet.total) + ' kg</span></div>';
  let lastGroup = null, n = 0;
  sheet.steps.forEach(s => {
    if (s.group !== lastGroup) { html += '<div class="mx-group">' + GROUP_LABELS[s.group] + '</div>'; lastGroup = s.group; }
    html += '<div class="mx-step"><div class="n">' + (++n) + '</div><div><b>' + esc(s.name) + '</b><span>Add ' + kgFmt(s.add) +
            ' kg</span></div><div class="w"><b class="num">' + kgFmt(s.cumulative) + '</b><span> kg</span></div></div>';
  });
  html += '<div class="mx-step"><div class="n">' + (++n) + '</div><div><b>Water</b><span>Add ' + kgFmt(sheet.water) + ' kg to reach ' +
          GROUP.targetDmPct + '% DM</span></div><div class="w"><b class="num">' + kgFmt(sheet.total) + '</b><span> kg</span></div></div>' +
          '<div class="mx-total"><span>Mix 4 minutes after the last addition</span><b class="num">' + kgFmt(sheet.total) + '</b></div></div></div>';
  document.getElementById("mx-sheet").innerHTML = html;
}

function initMixerControls(onChange) {
  [["mx-cows", "cows"], ["mx-dm", "targetDmPct"]].forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.value = GROUP[key];
    el.addEventListener("input", () => { const v = parseFloat(el.value); if (v > 0) { GROUP[key] = v; onChange(); } });
  });
}
