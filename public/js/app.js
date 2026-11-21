"use strict";
/* APP: wires events to the render functions. The only file that owns state. */
let state = INGREDIENTS.map(i => i.sol);     // kg DM per ingredient: the single source of truth

function renderAll() {
  renderContext();
  renderFormulate(state);
  renderHerdRequirement();
  renderMixer(state);
}

function showScreen(id) {
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.screen === id)));
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  window.scrollTo({ top: 0 });
}

function init() {
  buildRows(INGREDIENTS, state, (i, value) => { state[i] = value; renderAll(); });
  buildBands(BANDS);
  renderFeeds();
  renderFarms();
  renderHerdForm(renderAll);
  initMixerControls(renderAll);

  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showScreen(t.dataset.screen)));

  // --- MULTI-SPECIES SELECTOR WIRING ---
const speciesSelect = document.getElementById("species-select");
  if (speciesSelect) {
    speciesSelect.addEventListener("change", (e) => {
      const activeSpecies = e.target.value;
      const profile = SPECIES_PROFILES[activeSpecies];
      
      if (profile) {
        // 1. Swap global BANDS array reference
        BANDS.length = 0;
        Array.prototype.push.apply(BANDS, profile.bands);

        // 2. Update active GROUP object properties in place
        Object.keys(GROUP).forEach(k => delete GROUP[k]);
        Object.assign(GROUP, profile.group);

        // 3. Load the species-specific default state weights
        state = [...profile.defaultState];

        // 4. Rebuild UI components for the new species
        buildBands(BANDS);
        buildRows(INGREDIENTS, state, (i, value) => { state[i] = value; renderAll(); });
        renderAll();
      }
    });
  }

  document.getElementById("solve").addEventListener("click", () => {
    state = INGREDIENTS.map(i => i.sol);        // Phase 3 replaces this with a call to the server
    document.getElementById("diag").hidden = true;
    renderAll();
  });
  document.getElementById("reset").addEventListener("click", () => {
    state = INGREDIENTS.map(() => 0);
    document.getElementById("diag").hidden = true;
    renderAll();
  });
  document.getElementById("showinf").addEventListener("click", () => showDiagnosis(DIAGNOSIS));
  document.getElementById("themebtn").addEventListener("click", () => {
    let cur = document.documentElement.getAttribute("data-theme");
    if (!cur) cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  renderAll();
}
init();
