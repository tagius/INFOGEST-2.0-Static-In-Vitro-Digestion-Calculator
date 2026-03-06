/**
 * INFOGEST 2.0 — UI Controller
 * DOM manipulation, toggle handling, warning display, unit conversion.
 */

import {
  calcOralPhase,
  calcGastricPhase,
  calcIntestinalPancreatin,
  calcIntestinalIndividual,
  generateOralWarnings,
  generateAmylaseWarnings,
  generateGastricWarnings,
  generateEnzymeWarnings,
  generateIntestinalWarnings,
  fmt,
  fmtVolume,
} from './calc.js';

import { saveState, loadState, clearState, exportStateJSON, importStateJSON, initTheme, toggleTheme } from './state.js';
import { exportXLSX } from './export.js';

// ═══════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════
let currentPhase = 0;
let gastricEnzyme = 'rge';       // 'rge' | 'pepsin'
let rgeOnly = true;              // true = RGE only, false = RGE + extra enzymes
let intEnzyme = 'pancreatin';    // 'pancreatin' | 'individual'
let foodMode = 'food';           // 'food' | 'algae'
let amylaseSource = 'powder';    // 'powder' | 'solution'
let salivaryCarrier = 'solution'; // 'solution' | 'water' (algae-only)
let finishedClicked = false;     // flag to track if "Finish & Export" has been clicked, to prevent multiple exports
let defaultsData = null;         // stores loaded defaults from JSON

const phaseNames = ['Oral', 'Gastric', 'Intestinal'];

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function fv(id) {
  const e = document.getElementById(id);
  return e ? (parseFloat(e.value) || 0) : 0;
}
function sv(id) {
  const e = document.getElementById(id);
  return e ? e.value : '';
}
function n1() {
  return (parseInt(document.getElementById('nSamples').value) || 3) + 1;
}

/** Set a calc-value span's text and optional class */
function setCV(id, val, decimals = 3, extraClass = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'calc-value' + (extraClass ? ' ' + extraClass : '');
  if (val === null || val === undefined || isNaN(val)) {
    el.textContent = '—';
    return;
  }
  // Auto mL/µL conversion for volume values
  el.textContent = fmt(val, decimals);
}

/** Set a calc-value with automatic mL↔µL unit switching */
function setCVWithUnit(valueId, unitId, val_mL, decimals = 3, extraClass = '') {
  const el = document.getElementById(valueId);
  const unitEl = document.getElementById(unitId);
  if (!el) return;
  el.className = 'calc-value' + (extraClass ? ' ' + extraClass : '');
  if (val_mL === null || val_mL === undefined || isNaN(val_mL)) {
    el.textContent = '—';
    if (unitEl) unitEl.textContent = 'mL';
    return;
  }
  const { value, unit } = fmtVolume(val_mL, decimals);
  el.textContent = value;
  if (unitEl) unitEl.textContent = unit;
}

function setSpan(id, val, decimals = 3) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (val === null || val === undefined || isNaN(val)) ? '—' : fmt(val, decimals);
}

function updateN1Spans() {
  const N1 = n1();
  document.querySelectorAll('.n1-span, .oral-n1, .gastric-n1, .int-n1').forEach(el => el.textContent = N1);
}

// ═══════════════════════════════════════════════════════
// WARNING DISPLAY
// ═══════════════════════════════════════════════════════
function clearWarnings(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

function renderWarnings(containerId, warnings) {
  clearWarnings(containerId);
  const el = document.getElementById(containerId);
  if (!el) return;
  warnings.forEach(w => {
    const div = document.createElement('div');
    div.className = `warn-item warn-${w.type}`;
    const icons = { error: '✖', warning: '⚠', info: 'ℹ' };
    div.innerHTML = `<span class="warn-icon">${icons[w.type] || 'ℹ'}</span><span>${w.message}</span>`;
    el.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════
// PHASE NAVIGATION
// ═══════════════════════════════════════════════════════
function goToPhase(n) {
  // Deactivate current
  const prevTab = document.getElementById('tab-' + currentPhase);
  if (prevTab) {
    prevTab.classList.remove('active');
    if (n > currentPhase) prevTab.classList.add('done');
  }
  const prevPanel = document.getElementById('phase-' + currentPhase);
  if (prevPanel) prevPanel.classList.remove('active');

  currentPhase = n;

  // Activate new
  const newTab = document.getElementById('tab-' + n);
  if (newTab) {
    newTab.classList.add('active');
    newTab.classList.remove('done');
  }
  const newPanel = document.getElementById('phase-' + n);
  if (newPanel) newPanel.classList.add('active');

  // Footer nav
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.disabled = (n === 0);
  if (next) {
    if (n === 2) {
      next.disabled = false;  // Ensure it's enabled
      next.textContent = 'Finished';
      next.className = 'btn btn-primary';
      next.onclick = () => {
        if (!finishedClicked) {
          finishedClicked = true;
          next.textContent = '⬇ Export .xlsx';
          next.className = 'btn btn-export';
        } else {
          exportXLSX(getExportContext());
        }
      };
    } else {
      finishedClicked = false;
      next.textContent = 'Next: ' + phaseNames[n + 1] + ' →';
      next.className = 'btn btn-primary';
      next.onclick = () => goToPhase(currentPhase + 1);
    }
  }

  recalcAll();
}

// ═══════════════════════════════════════════════════════
// TOGGLE HANDLERS
// ═══════════════════════════════════════════════════════
function activateToggle(btn) {
  btn.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setSalivaryCarrierToggleState(mode) {
  const toggle = document.getElementById('oral-salivary-carrier-toggle');
  if (!toggle) return;
  const buttons = toggle.querySelectorAll('.toggle-btn');
  if (buttons.length < 2) return;
  buttons[0].classList.toggle('active', mode === 'solution');
  buttons[1].classList.toggle('active', mode === 'water');
}

/**
 * Update Oral phase display based on composition mode and food mode.
 * Shows/hides amylase source fields based on amylaseSource state.
 */
function updateOralDisplay() {
  const isIndiv = document.querySelector('#oral-mode-toggle .toggle-btn.active').textContent.trim() === 'Individual';
  const isAlgae = foodMode === 'algae';
  const amylaseDisabled = isAlgae && salivaryCarrier === 'water';
  
  // Show/hide composition rows
  document.querySelectorAll('.oral-individual-row').forEach(el => el.style.display = isIndiv ? '' : 'none');
  document.querySelectorAll('.oral-mastermix-row').forEach(el => el.style.display = isIndiv ? 'none' : '');
  document.querySelectorAll('.oral-amylase-row').forEach(el => el.style.display = (isIndiv && !amylaseDisabled) ? '' : 'none');
  const mmAmylaseRow = document.getElementById('oral-mm-amylase-row');
  if (mmAmylaseRow) mmAmylaseRow.style.display = (!isIndiv && !amylaseDisabled) ? '' : 'none';
  
  // Show/hide amylase source fields
  const isPowder = amylaseSource === 'powder';
  document.querySelectorAll('.amylase-powder-field').forEach(el => el.style.display = isPowder ? '' : 'none');
  document.querySelectorAll('.amylase-solution-field').forEach(el => el.style.display = isPowder ? 'none' : '');

  const salivaryCarrierToggle = document.getElementById('oral-salivary-carrier-toggle');
  if (salivaryCarrierToggle) salivaryCarrierToggle.style.display = isAlgae ? '' : 'none';
  setSalivaryCarrierToggleState(salivaryCarrier);
}

/**
 * Update Gastric phase display based on composition mode AND enzyme type.
 * Respects both Individual/Mastermix toggle AND RGE/Pepsin enzyme toggle.
 */
function updateGastricDisplay() {
  const isIndiv = document.querySelector('#gastric-mode-toggle .toggle-btn.active').textContent.trim() === 'Individual';
  const isRge = gastricEnzyme === 'rge';
  
  // Show/hide composition mode rows
  document.querySelectorAll('.gastric-individual-row').forEach(el => el.style.display = isIndiv ? '' : 'none');
  document.querySelectorAll('.gastric-mastermix-row').forEach(el => el.style.display = isIndiv ? 'none' : '');
  
  // Show/hide enzyme-specific rows (only in individual mode)
  if (isIndiv) {
    document.getElementById('gastric-rge-row').style.display = isRge ? '' : 'none';
    document.getElementById('gastric-pepsin-row').style.display = isRge ? 'none' : '';
    document.getElementById('gastric-extralipase-row').style.display = (isRge && !rgeOnly) ? '' : 'none';
  }
  
  // Show/hide enzyme cards (always visible, but content changes)
  document.getElementById('gastric-rge-card').style.display = isRge ? '' : 'none';
  document.getElementById('gastric-pepsin-card').style.display = isRge ? 'none' : '';
  document.getElementById('gastric-extralipase-card').style.display = (isRge && !rgeOnly) ? '' : 'none';
  
  // Show/hide mastermix card enzyme rows
  document.querySelectorAll('#gastric-mm-card [id*="gastric-mm"]').forEach(el => {
    if (el.id.includes('rge')) el.style.display = isRge ? '' : 'none';
    if (el.id.includes('pepsin')) el.style.display = isRge ? 'none' : '';
  });
}

/**
 * Update Intestinal phase display based on composition mode AND enzyme type.
 * Respects both Individual/Mastermix toggle AND Pancreatin/Individual enzyme toggle.
 */
function updateIntestinalDisplay() {
  const isIndiv = document.querySelector('#int-mode-toggle .toggle-btn.active').textContent.trim() === 'Individual';
  const isPancreatin = intEnzyme === 'pancreatin';
  
  // Show/hide composition mode rows
  document.querySelectorAll('.int-individual-row').forEach(el => el.style.display = isIndiv ? '' : 'none');
  document.querySelectorAll('.int-mastermix-row').forEach(el => el.style.display = isIndiv ? 'none' : '');
  
  // Show/hide enzyme-specific rows (only in individual mode)
  if (isIndiv) {
    document.getElementById('int-pancreatin-row').style.display = isPancreatin ? '' : 'none';
    ['trypsin', 'chymo', 'lipase', 'colipase', 'intamylase'].forEach(id => {
      const row = document.getElementById('int-' + id + '-row');
      if (row) row.style.display = isPancreatin ? 'none' : '';
    });
  }
  
  // Show/hide enzyme cards
  document.getElementById('int-pancreatin-card').style.display = isPancreatin ? '' : 'none';
  const indivBlock = document.getElementById('int-individual-block');
  if (indivBlock) indivBlock.style.display = isPancreatin ? 'none' : 'block';
  
  // Show/hide mastermix card enzyme rows
  const mmPanc = document.getElementById('int-mm-pancreatin-row');
  const mmIndiv = document.getElementById('int-mm-indiv-row');
  if (mmPanc) mmPanc.style.display = isPancreatin ? '' : 'none';
  if (mmIndiv) mmIndiv.style.display = isPancreatin ? 'none' : '';
}

window.setMode = function(phase, mode, btn) {
  activateToggle(btn);
  // Update display based on phase
  if (phase === 'oral') updateOralDisplay();
  else if (phase === 'gastric') updateGastricDisplay();
  else if (phase === 'int') updateIntestinalDisplay();
  recalcAll();
};

window.setFoodMode = function(mode, btn) {
  foodMode = mode;
  activateToggle(btn);
  const isAlgae = mode === 'algae';

  // Show/hide algae-specific rows
  document.querySelectorAll('.algae-only').forEach(el => el.style.display = isAlgae ? '' : 'none');
  document.querySelectorAll('.food-only').forEach(el => el.style.display = isAlgae ? 'none' : '');

  // Update food label
  const foodLabel = document.getElementById('food-label');
  if (foodLabel) foodLabel.textContent = isAlgae ? 'Algae solution volume' : 'Food';

  // Update default food value from JSON defaults (fallback to hardcoded if not available)
  if (isAlgae) {
    const algaeVolumeInput = document.getElementById('oral-food-algae');
    const algaeBiomassInput = document.getElementById('oral-food-algae-biomass');
    if (algaeVolumeInput && algaeVolumeInput.value === '') {
      const algaeVolumeDefault = defaultsData?.header?.algaeVolume || 0.5;
      algaeVolumeInput.value = algaeVolumeDefault;
    }
    if (algaeBiomassInput && algaeBiomassInput.value === '') {
      const algaeBiomassDefault = defaultsData?.header?.algaeDryMassMg || 125;
      algaeBiomassInput.value = algaeBiomassDefault;
    }
  } else {
    const foodInput = document.getElementById('oral-food');
    if (foodInput) {
      const foodDefault = defaultsData?.oral?.food || 5;
      foodInput.value = foodDefault;
      foodInput.step = '0.1';
    }
  }

  // Update unit label
  const foodUnit = document.getElementById('oral-food-unit');
  if (foodUnit) foodUnit.textContent = isAlgae ? 'g or mL' : 'g or mL';

  if (isAlgae) btn.classList.add('algae-active');

  updateOralDisplay();
  recalcAll();
  persistState();
};

window.setGastricEnzyme = function(type, btn) {
  gastricEnzyme = type;
  activateToggle(btn);
  updateGastricDisplay();
  recalcAll();
  persistState();
};

window.setRgeSufficient = function(sufficient, btn) {
  rgeOnly = sufficient;
  activateToggle(btn);
  updateGastricDisplay();
  recalcAll();
  persistState();
};

window.setIntEnzyme = function(type, btn) {
  intEnzyme = type;
  activateToggle(btn);
  updateIntestinalDisplay();
  recalcAll();
  persistState();
};

window.setAmylaseSource = function(source, btn) {
  amylaseSource = source;
  activateToggle(btn);
  updateOralDisplay();
  recalcAll();
  persistState();
};

window.setSalivaryCarrier = function(mode, btn) {
  salivaryCarrier = mode;
  activateToggle(btn);
  updateOralDisplay();
  recalcAll();
  persistState();
};

// ═══════════════════════════════════════════════════════
// CALCULATION ORCHESTRATION
// ═══════════════════════════════════════════════════════

function calcOral() {
  const N1 = n1();
  const result = calcOralPhase({
    food: foodMode === 'algae' ? fv('oral-food-algae') : fv('oral-food'),
    mode: foodMode,
    nSamples: N1 - 1,
    sampling: fv('oral-sampling'),
    caTarget_mM: fv('oral-ca-target'),
    amylaseTarget_UperML: fv('oral-amylase-target'),
    amylaseActivity_UperMG: fv('oral-amylase-activity'),
    amylasePurity: fv('oral-amylase-purity') / 100 || 1,
    amylaseEffective_mg: fv('oral-amylase-eff'),
    amylaseEffective_stk_mg: fv('oral-amylase-eff-stk'),
    amylaseMode: amylaseSource,
    amylaseStockConc_UperML: fv('oral-amylase-conc'),
    salivaryCarrier,
  });

  // Update composition table
  if (foodMode === 'algae') {
    setCV('oral-food-algae-stk', result.food_stk);
    setCV('oral-food-algae-biomass-stk', fv('oral-food-algae-biomass') * N1);
  } else {
    setCV('oral-food-stk', result.food_stk);
  }
  setCVWithUnit('oral-ssf-val', 'oral-ssf-unit-sample', result.ssf);
  setCV('oral-ssf-stk', result.ssf_stk);
  setCVWithUnit('oral-amylase-vol-val', 'oral-amylase-vol-unit-sample', result.amylaseVol);
  setCV('oral-amylase-vol-stk', result.amylaseVol_stk);
  setCV('oral-cacl2', result.cacl2_uL, 1);
  setCV('oral-cacl2-stk', result.cacl2_uL_stk, 1);
  setCV('oral-water', result.water, 3, result.water < -0.001 ? 'error' : '');
  setCV('oral-water-stk', result.water_stk, 3, result.water < -0.001 ? 'error' : '');
  setCV('oral-total-val', result.total);
  setCV('oral-total-stk', result.total_stk);
  setCV('oral-sampling-stk', result.sampling_stk);
  setCV('oral-final', result.finalVol);
  setCV('oral-final-stk', result.finalVol_stk);
  setCV('oral-mm-per-sample', result.mmPerSample, 3, 'mm');
  setCV('oral-mm-stock', result.mmPerSample_stk, 3, 'mm');

  // Mastermix card
  setSpan('oral-mm-ssf-stk', result.mm_ssf_stk);
  setSpan('oral-mm-amylase-stk', result.mm_amylase_stk);
  setSpan('oral-mm-cacl2-stk', result.mm_cacl2_uL_stk, 1);
  setSpan('oral-mm-water-stk', result.mm_water_stk);
  setSpan('oral-mm-total-stk', result.mm_total_stk);
  setSpan('oral-mm-aliquot', result.mmPerSample);

  // Enzyme card
  setCV('oral-amylase-minwt-s', result.amylaseMinWt, 2);
  setCV('oral-amylase-minwt-stk', result.amylaseMinWt_stk, 2);
  setCV('oral-amylase-diss-s', result.amylaseDissolve);
  setCV('oral-amylase-diss-stk', result.amylaseDissolve_stk);

  const badge = document.getElementById('oral-amylase-badge');
  if (badge) badge.textContent = 'Target: ' + fv('oral-amylase-target') + ' U/mL';

  // Warnings
  const phaseWarnings = generateOralWarnings(result);
  renderWarnings('oral-warnings', phaseWarnings);

  const enzymeWarnings = generateAmylaseWarnings(
    result,
    fv('oral-amylase-activity'),
    fv('oral-amylase-purity'),
    fv('oral-amylase-eff'),
    result.amylaseMinWt,
    result.amylaseDissolve,
    'per sample',
    { amylaseDisabled: result.amylaseDisabled, showPurityInfo: true }
);
  // Stock warnings
  if (N1 > 2 && !result.amylaseDisabled) {
    const stkWarnings = generateAmylaseWarnings(
      result,
      fv('oral-amylase-activity'),
      fv('oral-amylase-purity'),
      fv('oral-amylase-eff-stk'),
      result.amylaseMinWt_stk,
      result.amylaseDissolve_stk,
      'stock',
      { showPurityInfo: false }
    );
    enzymeWarnings.push(...stkWarnings);
  }
  renderWarnings('oral-amylase-warnings', enzymeWarnings);

  return result;
}

function calcGastric() {
  const N1 = n1();
  const oralResult = calcOralPhase({
    food: foodMode === 'algae' ? fv('oral-food-algae') : fv('oral-food'),
    mode: foodMode,
    nSamples: N1 - 1,
    sampling: fv('oral-sampling'),
    caTarget_mM: fv('oral-ca-target'),
    amylaseTarget_UperML: fv('oral-amylase-target'),
    amylaseActivity_UperMG: fv('oral-amylase-activity'),
    amylasePurity: fv('oral-amylase-purity') / 100 || 1,
    amylaseEffective_mg: fv('oral-amylase-eff'),
    amylaseEffective_stk_mg: fv('oral-amylase-eff-stk'),
    amylaseMode: amylaseSource,
    amylaseStockConc_UperML: fv('oral-amylase-conc'),
    salivaryCarrier,
  });

  const result = calcGastricPhase({
    oralFinalVol: oralResult.finalVol,
    nSamples: N1 - 1,
    sampling: fv('gastric-sampling'),
    caTarget_mM: fv('gastric-ca-target'),
    acid: fv('gastric-acid'),
    gastricEnzyme,
    rgeOnly,
    rgeLipaseTarget_UperML: fv('gastric-rge-lipase-target'),
    rgeLipaseActivity_UperMG: fv('gastric-rge-lipase-activity'),
    rgePepsinTarget_UperML: fv('gastric-rge-pepsin-target'),
    rgePepsinActivity_UperMG: fv('gastric-rge-pepsin-activity'),
    rgePurity: fv('gastric-rge-purity') / 100 || 1,
    rgeEffective_mg: fv('gastric-rge-eff'),
    rgeEffective_stk_mg: fv('gastric-rge-eff-stk'),
    extraLipaseTarget_UperML: fv('gastric-extralipase-target'),
    extraLipaseActivity_UperMG: fv('gastric-extralipase-activity'),
    extraLipasePurity: fv('gastric-extralipase-purity') / 100 || 1,
    extraLipaseEffective_mg: fv('gastric-extralipase-eff'),
    extraLipaseEffective_stk_mg: fv('gastric-extralipase-eff-stk'),
    pepsinTarget_UperML: fv('gastric-pepsin-target'),
    pepsinActivity_UperMG: fv('gastric-pepsin-activity'),
    pepsinPurity: fv('gastric-pepsin-purity') / 100 || 1,
    pepsinEffective_mg: fv('gastric-pepsin-eff'),
    pepsinEffective_stk_mg: fv('gastric-pepsin-eff-stk'),
  });

  // Update composition table
  setCV('gastric-oral-in', result.oralIn);
  setCV('gastric-oral-in-stk', result.oralIn_stk);
  setCVWithUnit('gastric-sgf-val', 'gastric-sgf-unit-sample', result.sgf);
  setCV('gastric-sgf-stk', result.sgf_stk);
  setCVWithUnit('gastric-rge-vol-val', 'gastric-rge-vol-unit-sample', result.rgeVol);
  setCV('gastric-rge-vol-stk', result.rgeVol_stk);
  setCVWithUnit('gastric-extralipase-vol-val', 'gastric-extralipase-vol-unit-sample', result.extraLipaseVol);
  setCV('gastric-extralipase-vol-stk', result.extraLipaseVol_stk);
  setCVWithUnit('gastric-pepsin-vol-val', 'gastric-pepsin-vol-unit-sample', result.pepsinVol);
  setCV('gastric-pepsin-vol-stk', result.pepsinVol_stk);
  setCV('gastric-cacl2', result.cacl2_uL, 1);
  setCV('gastric-cacl2-stk', result.cacl2_uL_stk, 1);
  setCV('gastric-acid-stk', result.acid_stk);
  setCV('gastric-water', result.water, 3, result.water < -0.001 ? 'error' : '');
  setCV('gastric-water-stk', result.water_stk, 3, result.water < -0.001 ? 'error' : '');
  setCV('gastric-total-val', result.total);
  setCV('gastric-total-stk', result.total_stk);
  setCV('gastric-sampling-stk', result.sampling_stk);
  setCV('gastric-final', result.finalVol);
  setCV('gastric-final-stk', result.finalVol_stk);
  setCV('gastric-mm-per-sample', result.mmPerSample, 3, 'mm');
  setCV('gastric-mm-stock', result.mmPerSample_stk, 3, 'mm');

  // Mastermix card
  setSpan('gastric-mm-sgf-stk', result.mm_sgf_stk);
  setSpan('gastric-mm-rge-stk', result.mm_rge_stk);
  setSpan('gastric-mm-pepsin-stk', result.mm_pepsin_stk);
  setSpan('gastric-mm-extralipase-stk', result.mm_extraLipase_stk);
  setSpan('gastric-mm-cacl2-stk', result.mm_cacl2_uL_stk, 1);
  setSpan('gastric-mm-acid-stk', result.mm_acid_stk);
  setSpan('gastric-mm-water-stk', result.mm_water_stk);
  setSpan('gastric-mm-total-stk', result.mm_total_stk);
  setSpan('gastric-mm-aliquot', result.mmPerSample);

  // RGE enzyme card
  if (gastricEnzyme === 'rge') {
    setCV('gastric-rge-minwt-s', result.rgeMinWt, 2);
    setCV('gastric-rge-minwt-stk', result.rgeMinWt_stk, 2);
    setCVWithUnit('gastric-rge-diss-s', 'gastric-rge-diss-unit', result.rgeDissolve);
    setCVWithUnit('gastric-rge-diss-stk', 'gastric-rge-diss-stk-unit', result.rgeDissolve_stk);

    const badge = document.getElementById('gastric-rge-badge');
    if (badge) badge.textContent = `Lipase: ${fv('gastric-rge-lipase-target')} U/mL | Pepsin: ${fv('gastric-rge-pepsin-target')} U/mL`;

    // RGE warnings
    const rgeWarnings = [];
    if (!fv('gastric-rge-lipase-activity')) rgeWarnings.push({ type: 'warning', message: 'Enter measured RGE lipase activity (U/mg).' });
    if (!fv('gastric-rge-pepsin-activity')) rgeWarnings.push({ type: 'warning', message: 'Enter measured RGE pepsin activity (U/mg).' });
    if (!result.rgeLipaseSufficient) {
      const msg = rgeOnly
        ? 'RGE lipase activity is insufficient for the target. Consider adding extra lipase.'
        : 'RGE lipase alone would be insufficient; supplementary lipase will be added.';
      rgeWarnings.push({ type: 'warning', message: msg });
    }
    rgeWarnings.push(...generateEnzymeWarnings('RGE', fv('gastric-rge-eff'), result.rgeMinWt, result.rgeDissolve, 250));
    renderWarnings('gastric-rge-warnings', rgeWarnings);

    // Extra lipase display and warnings
    if (!rgeOnly) {
      setCV('gastric-extralipase-minwt-s', result.extraLipaseMinWt, 2);
      setCV('gastric-extralipase-minwt-stk', result.extraLipaseMinWt_stk, 2);
      setCV('gastric-extralipase-diss-s', result.extraLipaseDissolve);
      setCV('gastric-extralipase-diss-stk', result.extraLipaseDissolve_stk);

      const elWarnings = [];
      if (!fv('gastric-extralipase-activity')) elWarnings.push({ type: 'warning', message: 'Enter measured supplementary lipase activity (U/mg).' });
      elWarnings.push(...generateEnzymeWarnings('Supplementary lipase', fv('gastric-extralipase-eff'), result.extraLipaseMinWt, result.extraLipaseDissolve, 50));
      renderWarnings('gastric-extralipase-warnings', elWarnings);
    }
  } else {
    // Pepsin card
    setCV('gastric-pepsin-minwt-s', result.pepsinMinWt, 2);
    setCV('gastric-pepsin-minwt-stk', result.pepsinMinWt_stk, 2);
    setCVWithUnit('gastric-pepsin-diss-s', 'gastric-pepsin-diss-unit', result.pepsinDissolve);
    setCVWithUnit('gastric-pepsin-diss-stk', 'gastric-pepsin-diss-stk-unit', result.pepsinDissolve_stk);

    const pepWarnings = [];
    if (!fv('gastric-pepsin-activity')) pepWarnings.push({ type: 'warning', message: 'Enter measured pepsin activity (U/mg).' });
    pepWarnings.push(...generateEnzymeWarnings('Pepsin', fv('gastric-pepsin-eff'), result.pepsinMinWt, result.pepsinDissolve, 50));
    renderWarnings('gastric-pepsin-warnings', pepWarnings);
  }

  // Phase warnings
  const phaseWarnings = generateGastricWarnings(result);
  renderWarnings('gastric-warnings', phaseWarnings);

  return result;
}

function calcInt() {
  const N1 = n1();
  // Get gastric final vol
  const oralResult = calcOralPhase({
    food: foodMode === 'algae' ? fv('oral-food-algae') : fv('oral-food'), mode: foodMode, nSamples: N1 - 1,
    sampling: fv('oral-sampling'), caTarget_mM: fv('oral-ca-target'),
    amylaseTarget_UperML: fv('oral-amylase-target'),
    amylaseActivity_UperMG: fv('oral-amylase-activity'),
    amylasePurity: fv('oral-amylase-purity') / 100 || 1,
    amylaseEffective_mg: fv('oral-amylase-eff'),
    amylaseEffective_stk_mg: fv('oral-amylase-eff-stk'),
    amylaseMode: amylaseSource,
    amylaseStockConc_UperML: fv('oral-amylase-conc'),
    salivaryCarrier,
  });
  const gastricResult = calcGastricPhase({
    oralFinalVol: oralResult.finalVol, nSamples: N1 - 1,
    sampling: fv('gastric-sampling'), caTarget_mM: fv('gastric-ca-target'),
    acid: fv('gastric-acid'), gastricEnzyme, rgeOnly,
    rgeLipaseTarget_UperML: fv('gastric-rge-lipase-target'),
    rgeLipaseActivity_UperMG: fv('gastric-rge-lipase-activity'),
    rgePepsinTarget_UperML: fv('gastric-rge-pepsin-target'),
    rgePepsinActivity_UperMG: fv('gastric-rge-pepsin-activity'),
    rgePurity: fv('gastric-rge-purity') / 100 || 1,
    rgeEffective_mg: fv('gastric-rge-eff'),
    rgeEffective_stk_mg: fv('gastric-rge-eff-stk'),
    extraLipaseTarget_UperML: fv('gastric-extralipase-target'),
    extraLipaseActivity_UperMG: fv('gastric-extralipase-activity'),
    extraLipasePurity: fv('gastric-extralipase-purity') / 100 || 1,
    extraLipaseEffective_mg: fv('gastric-extralipase-eff'),
    extraLipaseEffective_stk_mg: fv('gastric-extralipase-eff-stk'),
    pepsinTarget_UperML: fv('gastric-pepsin-target'),
    pepsinActivity_UperMG: fv('gastric-pepsin-activity'),
    pepsinPurity: fv('gastric-pepsin-purity') / 100 || 1,
    pepsinEffective_mg: fv('gastric-pepsin-eff'),
    pepsinEffective_stk_mg: fv('gastric-pepsin-eff-stk'),
  });

  const gastricFinalVol = gastricResult.finalVol;
  let result;

  if (intEnzyme === 'pancreatin') {
    result = calcIntestinalPancreatin({
      gastricFinalVol,
      nSamples: N1 - 1,
      sampling: fv('int-sampling'),
      caTarget_mM: fv('int-ca-target'),
      base: fv('int-base'),
      pancreatinTarget_UperML: fv('int-pancreatin-target'),
      pancreatinActivity_UperMG: fv('int-pancreatin-activity'),
      pancreatinPurity: fv('int-pancreatin-purity') / 100 || 1,
      pancreatinEffective_mg: fv('int-pancreatin-eff'),
      pancreatinEffective_stk_mg: fv('int-pancreatin-eff-stk'),
      bileTarget_mM: fv('int-bile-conc-target'),
      bileMeasured_mmolPerG: fv('int-bile-measured'),
      bileEffective_mg: fv('int-bile-eff'),
      bileEffective_stk_mg: fv('int-bile-eff-stk'),
    });

    // Pancreatin display
    setCVWithUnit('int-pancreatin-vol-val', 'int-pancreatin-vol-unit-sample', result.pancreatinVol);
    setCV('int-pancreatin-vol-stk', result.pancreatinVol_stk);
    setCV('int-pancreatin-minwt-s', result.pancreatinMinWt, 2);
    setCV('int-pancreatin-minwt-stk', result.pancreatinMinWt_stk, 2);
    setCVWithUnit('int-pancreatin-diss-s', 'int-pancreatin-diss-unit', result.pancreatinDissolve);
    setCVWithUnit('int-pancreatin-diss-stk', 'int-pancreatin-diss-stk-unit', result.pancreatinDissolve_stk);

    const pWarnings = [];
    if (!fv('int-pancreatin-activity')) pWarnings.push({ type: 'warning', message: 'Enter measured pancreatin activity (U/mg).' });
    pWarnings.push(...generateEnzymeWarnings('Pancreatin', fv('int-pancreatin-eff'), result.pancreatinMinWt, result.pancreatinDissolve, 250));
    renderWarnings('int-pancreatin-warnings', pWarnings);

  } else {
    // Individual enzymes
    const enzymes = [
      { id: 'trypsin', target: fv('int-trypsin-target'), activity: fv('int-trypsin-activity'), effective_mg: fv('int-trypsin-eff'), effective_stk_mg: fv('int-trypsin-eff-stk') || 0 },
      { id: 'chymotrypsin', target: fv('int-chymo-target'), activity: fv('int-chymo-activity'), effective_mg: fv('int-chymo-eff'), effective_stk_mg: fv('int-chymo-eff-stk') || 0 },
      { id: 'lipase', target: fv('int-lipase-target'), activity: fv('int-lipase-activity'), effective_mg: fv('int-lipase-eff'), effective_stk_mg: fv('int-lipase-eff-stk') || 0 },
      { id: 'colipase', target: fv('int-colipase-target'), activity: fv('int-colipase-activity'), effective_mg: fv('int-colipase-eff'), effective_stk_mg: fv('int-colipase-eff-stk') || 0 },
      { id: 'amylase', target: fv('int-intamylase-target'), activity: fv('int-intamylase-activity'), effective_mg: fv('int-intamylase-eff'), effective_stk_mg: fv('int-intamylase-eff-stk') || 0 },
    ];

    result = calcIntestinalIndividual({
      gastricFinalVol,
      nSamples: N1 - 1,
      sampling: fv('int-sampling'),
      base: fv('int-base'),
      enzymes,
      bileTarget_mM: fv('int-bile-conc-target'),
      bileMeasured_mmolPerG: fv('int-bile-measured'),
      bileEffective_mg: fv('int-bile-eff'),
      bileEffective_stk_mg: fv('int-bile-eff-stk'),
    });

    // Display each enzyme
    const nameMap = { trypsin: 'Trypsin', chymotrypsin: 'Chymotrypsin', lipase: 'Pancreatic lipase', colipase: 'Colipase', amylase: 'Int. amylase' };
    const idMap = { trypsin: 'trypsin', chymotrypsin: 'chymo', lipase: 'lipase', colipase: 'colipase', amylase: 'intamylase' };
    Object.keys(result.enzymeResults || {}).forEach(key => {
      const r = result.enzymeResults[key];
      const uiId = idMap[key] || key;
      setCVWithUnit('int-' + uiId + '-vol-val', 'int-' + uiId + '-vol-unit-sample', r.vol);
      setCV('int-' + uiId + '-vol-stk', r.vol * N1);
      setCV('int-' + uiId + '-minwt-s', r.minWt, 2);
      setCV('int-' + uiId + '-minwt-stk', r.minWt_stk, 2);
      setCVWithUnit('int-' + uiId + '-diss-s', 'int-' + uiId + '-diss-unit', r.dissolve);

      const warnId = 'int-' + uiId + '-warnings';
      if (document.getElementById(warnId)) {
        const w = [];
        const enz = enzymes.find(e => e.id === key);
        if (enz && !enz.activity) w.push({ type: 'warning', message: `Enter measured ${nameMap[key]} activity.` });
        w.push(...generateEnzymeWarnings(nameMap[key], enz?.effective_mg, r.minWt, r.dissolve, 250));
        renderWarnings(warnId, w);
      }
    });
  }

  // Common display
  setCV('int-gastric-in', gastricFinalVol);
  setCV('int-gastric-in-stk', gastricFinalVol * N1);
  setCVWithUnit('int-sif-val', 'int-sif-unit-sample', result.sif);
  setCV('int-sif-stk', result.sif_stk);
  setCVWithUnit('int-bile-vol-val', 'int-bile-vol-unit-sample', result.bileVol);
  setCV('int-bile-vol-stk', result.bileVol_stk);
  setCV('int-cacl2', result.cacl2_uL, 1);
  setCV('int-cacl2-stk', result.cacl2_uL_stk, 1);
  setCV('int-base-stk', result.base_stk);
  setCV('int-water', result.water, 3, result.water < -0.001 ? 'error' : '');
  setCV('int-water-stk', result.water_stk, 3, result.water < -0.001 ? 'error' : '');
  setCV('int-total-val', result.total);
  setCV('int-total-stk', result.total_stk);
  setCV('int-sampling-stk', result.sampling_stk);
  setCV('int-final', result.finalVol);
  setCV('int-final-stk', result.finalVol_stk);
  setCV('int-mm-per-sample', result.mmPerSample, 3, 'mm');
  setCV('int-mm-stock', result.mmPerSample_stk, 3, 'mm');

  // Mastermix card
  setSpan('int-mm-sif-stk', result.sif_stk);
  if (intEnzyme === 'pancreatin') {
    setSpan('int-mm-pancreatin-stk', result.pancreatinVol_stk);
  }
  setSpan('int-mm-bile-stk', result.bileVol_stk);
  setSpan('int-mm-cacl2-stk', result.cacl2_uL_stk, 1);
  setSpan('int-mm-base-stk', result.base_stk);
  setSpan('int-mm-water-stk', Math.max(0, result.water_stk));
  setSpan('int-mm-total-stk', result.mmPerSample_stk);
  setSpan('int-mm-aliquot', result.mmPerSample);

  // Bile
  setCV('int-bile-minwt-s', result.bileMinWt, 2);
  setCV('int-bile-minwt-stk', result.bileMinWt_stk, 2);
  setCVWithUnit('int-bile-diss-s', 'int-bile-diss-unit', result.bileDissolve);
  setCVWithUnit('int-bile-diss-stk', 'int-bile-diss-stk-unit', result.bileDissolve_stk);

  const badge = document.getElementById('int-bile-badge');
    if (badge) badge.textContent = `Target: ${fv('int-bile-conc-target')} mM`;

  const bileWarnings = [];
  if (!fv('int-bile-measured')) bileWarnings.push({ type: 'warning', message: 'Enter measured bile salt concentration (mmol/g).' });
  bileWarnings.push(...generateEnzymeWarnings('Bile salts', fv('int-bile-eff'), result.bileMinWt, result.bileDissolve, 500));
  renderWarnings('int-bile-warnings', bileWarnings);

  const phaseWarnings = generateIntestinalWarnings(result);
  renderWarnings('int-warnings', phaseWarnings);

  return result;
}

// ═══════════════════════════════════════════════════════
// MASTER RECALC
// ═══════════════════════════════════════════════════════
function recalcAll() {
  calcOral();
  calcGastric();
  calcInt();
  updateN1Spans();

  // Footer info
  const n = parseInt(document.getElementById('nSamples').value) || 3;
  const oralTotal = fv('oral-food') * 2;
  const oralFinal = Math.max(0, oralTotal - fv('oral-sampling'));
  const gastricTotal = oralFinal * 2;
  const gastricFinal = Math.max(0, gastricTotal - fv('gastric-sampling'));
  const intTotal = gastricFinal * 2;
  const info = document.getElementById('footer-info');
  if (info) info.textContent = `n=${n} · Oral ${fmt(oralTotal, 1)} mL → Gastric ${fmt(gastricTotal, 1)} mL → Intestinal ${fmt(intTotal, 1)} mL`;

  persistState();
}

// ═══════════════════════════════════════════════════════
// STATE PERSISTENCE
// ═══════════════════════════════════════════════════════
function persistState() {
  saveState({
    __gastricEnzyme: gastricEnzyme,
    __rgeOnly: rgeOnly,
    __intEnzyme: intEnzyme,
    __foodMode: foodMode,
    __amylaseSource: amylaseSource,
    __salivaryCarrier: salivaryCarrier,
    __currentPhase: currentPhase,
  });
}

// ═══════════════════════════════════════════════════════
// EXPORT CONTEXT
// ═══════════════════════════════════════════════════════
function getExportContext() {
  return {
    fv, sv, n1, fmt, setCV,
    gastricEnzyme, rgeOnly, intEnzyme, foodMode, amylaseSource,
    gcv: (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; },
  };
}

// ═══════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════
function resetAll() {
  if (!confirm('Reset all values to defaults? This cannot be undone.')) return;
  clearState();

  // Reset state vars
  gastricEnzyme = 'rge';
  rgeOnly = true;
  intEnzyme = 'pancreatin';
  foodMode = 'food';
  amylaseSource = 'powder';
  salivaryCarrier = 'solution';

  // Reset all toggles
  document.querySelectorAll('.toggle-group').forEach(grp => {
    grp.querySelectorAll('.toggle-btn').forEach((btn, i) => btn.classList.toggle('active', i === 0));
  });

  // Reset visibility
  //['oral', 'gastric', 'int'].forEach(p => {
  //  document.querySelectorAll('.' + p + '-mastermix-row').forEach(el => el.style.display = 'none');
  //  document.querySelectorAll('.' + p + '-individual-row').forEach(el => el.style.display = '');
  //});
  // Reset visibility by calling display functions
  updateOralDisplay();
  updateGastricDisplay();
  updateIntestinalDisplay();

  // Reset enzyme visibility
  document.getElementById('gastric-rge-row').style.display = '';
  document.getElementById('gastric-pepsin-row').style.display = 'none';
  document.getElementById('gastric-rge-card').style.display = '';
  document.getElementById('gastric-pepsin-card').style.display = 'none';
  document.getElementById('gastric-extralipase-row') && (document.getElementById('gastric-extralipase-row').style.display = 'none');
  document.getElementById('gastric-extralipase-card') && (document.getElementById('gastric-extralipase-card').style.display = 'none');
  document.getElementById('int-pancreatin-row').style.display = '';
  document.getElementById('int-pancreatin-card').style.display = '';
  const indivBlock = document.getElementById('int-individual-block');
  if (indivBlock) indivBlock.style.display = 'none';
  ['trypsin', 'chymo', 'lipase', 'colipase', 'intamylase'].forEach(id => {
    const row = document.getElementById('int-' + id + '-row');
    if (row) row.style.display = 'none';
    const card = document.getElementById('int-' + id + '-card');
    if (card) card.style.display = 'none';
  });

  // Food mode
  document.querySelectorAll('.algae-only').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.food-only').forEach(el => el.style.display = '');

  // Amylase source
  document.querySelectorAll('.amylase-powder-field').forEach(el => el.style.display = '');
  document.querySelectorAll('.amylase-solution-field').forEach(el => el.style.display = 'none');
  setSalivaryCarrierToggleState(salivaryCarrier);

  // Set date
  const t = new Date();
  document.getElementById('expDate').value =
    String(t.getDate()).padStart(2, '0') + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + t.getFullYear();

  // Reload defaults by clearing input values (HTML defaults take over on full page reload)
  // Since we can't easily enumerate defaults, we reload
  location.reload();
}

// ═══════════════════════════════════════════════════════
// DEFAULTS LOADING
// ═══════════════════════════════════════════════════════

/**
 * Load default values from data/defaults.json.
 * Only populates inputs that are currently empty (no user/saved data).
 */
async function loadDefaults() {
  try {
    const res = await fetch('./data/defaults.json');
    if (!res.ok) return;
    const d = await res.json();
    defaultsData = d; // Store globally for later use (e.g., in setFoodMode)

    // Helper: set input value only if empty
    const setIfEmpty = (id, val) => {
      if (val === undefined || val === null) return;
      const el = document.getElementById(id);
      if (!el) return;
      // For text inputs: set if empty
      // For number inputs: set if empty (no value attribute or value is "")
      if (el.type === 'text') {
        if (!el.value) el.value = val;
      } else {
        if (el.value === '' || el.value === undefined) el.value = val;
      }
    };

    // ─── Header ───
    if (d.header) {
      setIfEmpty('nSamples', d.header.nSamples);
      setIfEmpty('operator', d.header.operator);
      // algaeFood is used when food mode is switched to algae, handled by setFoodMode
    }

    // ─── Oral phase ───
    if (d.oral) {
      setIfEmpty('oral-food', d.oral.food);
      setIfEmpty('oral-sampling', d.oral.sampling);
      setIfEmpty('oral-duration', d.oral.duration);
      setIfEmpty('oral-temp', d.oral.temp);
      setIfEmpty('oral-ca-target', d.oral.caTarget);

      if (d.oral.amylase) {
        const a = d.oral.amylase;
        if (a.additionMode === 'solution' || a.additionMode === 'water') {
          salivaryCarrier = a.additionMode;
        }
        setIfEmpty('oral-amylase-product', a.product);
        setIfEmpty('oral-amylase-lot', a.lot);
        setIfEmpty('oral-amylase-activity', a.activity);
        setIfEmpty('oral-amylase-purity', a.purity);
        setIfEmpty('oral-amylase-target', a.target);
        setIfEmpty('oral-amylase-eff', a.effective);
        setIfEmpty('oral-amylase-eff-stk', a.effectiveStk);
      }
    }

    // ─── Gastric phase ───
    if (d.gastric) {
      setIfEmpty('gastric-sampling', d.gastric.sampling);
      setIfEmpty('gastric-duration', d.gastric.duration);
      setIfEmpty('gastric-temp', d.gastric.temp);
      setIfEmpty('gastric-acid', d.gastric.acid);
      setIfEmpty('gastric-ca-target', d.gastric.caTarget);

      if (d.gastric.rge) {
        const r = d.gastric.rge;
        setIfEmpty('gastric-rge-product', r.product);
        setIfEmpty('gastric-rge-lot', r.lot);
        setIfEmpty('gastric-rge-lipase-activity', r.lipaseActivity);
        setIfEmpty('gastric-rge-pepsin-activity', r.pepsinActivity);
        setIfEmpty('gastric-rge-purity', r.purity);
        setIfEmpty('gastric-rge-lipase-target', r.lipaseTarget);
        setIfEmpty('gastric-rge-pepsin-target', r.pepsinTarget);
        setIfEmpty('gastric-rge-eff', r.effective);
        setIfEmpty('gastric-rge-eff-stk', r.effectiveStk);
      }

      if (d.gastric.pepsin) {
        const p = d.gastric.pepsin;
        setIfEmpty('gastric-pepsin-product', p.product);
        setIfEmpty('gastric-pepsin-lot', p.lot);
        setIfEmpty('gastric-pepsin-activity', p.activity);
        setIfEmpty('gastric-pepsin-purity', p.purity);
        setIfEmpty('gastric-pepsin-target', p.target);
        setIfEmpty('gastric-pepsin-eff', p.effective);
        setIfEmpty('gastric-pepsin-eff-stk', p.effectiveStk);
      }

      if (d.gastric.extraLipase) {
        const x = d.gastric.extraLipase;
        setIfEmpty('gastric-extralipase-product', x.product);
        setIfEmpty('gastric-extralipase-lot', x.lot);
        setIfEmpty('gastric-extralipase-activity', x.activity);
        setIfEmpty('gastric-extralipase-purity', x.purity);
        setIfEmpty('gastric-extralipase-target', x.target);
        setIfEmpty('gastric-extralipase-eff', x.effective);
        setIfEmpty('gastric-extralipase-eff-stk', x.effectiveStk);
      }
    }

    // ─── Intestinal phase ───
    if (d.intestinal) {
      setIfEmpty('int-sampling', d.intestinal.sampling);
      setIfEmpty('int-duration', d.intestinal.duration);
      setIfEmpty('int-temp', d.intestinal.temp);
      setIfEmpty('int-base', d.intestinal.base);
      setIfEmpty('int-ca-target', d.intestinal.caTarget);

      if (d.intestinal.pancreatin) {
        const p = d.intestinal.pancreatin;
        setIfEmpty('int-pancreatin-product', p.product);
        setIfEmpty('int-pancreatin-lot', p.lot);
        setIfEmpty('int-pancreatin-activity', p.activity);
        setIfEmpty('int-pancreatin-purity', p.purity);
        setIfEmpty('int-pancreatin-target', p.target);
        setIfEmpty('int-pancreatin-eff', p.effective);
        setIfEmpty('int-pancreatin-eff-stk', p.effectiveStk);
      }

      if (d.intestinal.bile) {
        const b = d.intestinal.bile;
        setIfEmpty('int-bile-product', b.product);
        setIfEmpty('int-bile-lot', b.lot);
        setIfEmpty('int-bile-measured', b.measured);
        setIfEmpty('int-bile-conc-target', b.target);
        setIfEmpty('int-bile-eff', b.effective);
        setIfEmpty('int-bile-eff-stk', b.effectiveStk);
      }

      if (d.intestinal.trypsin) {
        const t = d.intestinal.trypsin;
        setIfEmpty('int-trypsin-product', t.product);
        setIfEmpty('int-trypsin-lot', t.lot);
        setIfEmpty('int-trypsin-activity', t.activity);
        setIfEmpty('int-trypsin-target', t.target);
        setIfEmpty('int-trypsin-eff', t.effective);
        setIfEmpty('int-trypsin-eff-stk', t.effectiveStk);
      }

      if (d.intestinal.chymotrypsin) {
        const c = d.intestinal.chymotrypsin;
        setIfEmpty('int-chymo-product', c.product);
        setIfEmpty('int-chymo-lot', c.lot);
        setIfEmpty('int-chymo-activity', c.activity);
        setIfEmpty('int-chymo-target', c.target);
      }

      if (d.intestinal.lipase) {
        const l = d.intestinal.lipase;
        setIfEmpty('int-lipase-product', l.product);
        setIfEmpty('int-lipase-lot', l.lot);
        setIfEmpty('int-lipase-activity', l.activity);
        setIfEmpty('int-lipase-target', l.target);
      }

      if (d.intestinal.colipase) {
        const co = d.intestinal.colipase;
        setIfEmpty('int-colipase-product', co.product);
        setIfEmpty('int-colipase-lot', co.lot);
        setIfEmpty('int-colipase-activity', co.activity);
        setIfEmpty('int-colipase-target', co.target);
      }

      if (d.intestinal.amylase) {
        const ia = d.intestinal.amylase;
        setIfEmpty('int-intamylase-product', ia.product);
        setIfEmpty('int-intamylase-lot', ia.lot);
        setIfEmpty('int-intamylase-activity', ia.activity);
        setIfEmpty('int-intamylase-target', ia.target);
      }
    }
  } catch (e) {
    console.warn('Could not load defaults.json:', e);
  }
}

// ═══════════════════════════════════════════════════════
// RESPONSIVE HEADER MENU
// ═══════════════════════════════════════════════════════

function syncMenuFields() {
  const operator = document.getElementById('operator');
  const operatorMenu = document.getElementById('operator-menu');
  const expDate = document.getElementById('expDate');
  const expDateMenu = document.getElementById('expDate-menu');
  
  if (operator && operatorMenu) operatorMenu.value = operator.value;
  if (expDate && expDateMenu) expDateMenu.value = expDate.value;
}

function syncMainFields() {
  const operator = document.getElementById('operator');
  const operatorMenu = document.getElementById('operator-menu');
  const expDate = document.getElementById('expDate');
  const expDateMenu = document.getElementById('expDate-menu');
  
  if (operator && operatorMenu) operator.value = operatorMenu.value;
  if (expDate && expDateMenu) expDate.value = expDateMenu.value;
}

function initHeaderMenu() {
  const menuToggle = document.getElementById('header-menu-toggle');
  const menu = document.getElementById('header-menu');
  
  if (!menuToggle || !menu) return;
  
  // Toggle menu visibility
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
      menu.classList.remove('active');
    }
  });
  
  // Sync operator and date fields
  const operator = document.getElementById('operator');
  const operatorMenu = document.getElementById('operator-menu');
  const expDate = document.getElementById('expDate');
  const expDateMenu = document.getElementById('expDate-menu');
  
  if (operator && operatorMenu) {
    operatorMenu.addEventListener('input', () => {
      operator.value = operatorMenu.value;
      persistState();
    });
    operator.addEventListener('input', syncMenuFields);
  }
  
  if (expDate && expDateMenu) {
    expDateMenu.addEventListener('input', () => {
      expDate.value = expDateMenu.value;
      persistState();
    });
    expDate.addEventListener('input', syncMenuFields);
  }
  
  // Bind menu action buttons
  const btnResetMenu = document.getElementById('btn-reset-menu');
  const btnExportMenu = document.getElementById('btn-export-menu');
  const btnExportJsonMenu = document.getElementById('btn-export-json-menu');
  const btnImportJsonMenu = document.getElementById('btn-import-json-menu');
  
  if (btnResetMenu) {
    btnResetMenu.addEventListener('click', () => {
      resetAll();
      menu.classList.remove('active');
    });
  }
  
  if (btnExportMenu) {
    btnExportMenu.addEventListener('click', () => {
      exportXLSX(getExportContext());
      menu.classList.remove('active');
    });
  }
  
  if (btnExportJsonMenu) {
    btnExportJsonMenu.addEventListener('click', () => {
      exportStateJSON();
      menu.classList.remove('active');
    });
  }
  
  if (btnImportJsonMenu) {
    btnImportJsonMenu.addEventListener('click', () => {
      importStateJSON().then(() => {
        recalcAll();
        syncMenuFields();
        menu.classList.remove('active');
      }).catch(err => alert(err));
    });
  }
  
  // Initialize menu field values
  syncMenuFields();
}

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════
export async function init() {
  // Theme
  initTheme();

  // Initialize responsive header menu
  initHeaderMenu();

  // Set today's date
  const t = new Date();
  const dateEl = document.getElementById('expDate');
  if (dateEl && !dateEl.value) {
    dateEl.value = String(t.getDate()).padStart(2, '0') + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + t.getFullYear();
  }
  // Also set in menu
  const dateMenuEl = document.getElementById('expDate-menu');
  if (dateMenuEl && !dateMenuEl.value) {
    dateMenuEl.value = String(t.getDate()).padStart(2, '0') + '.' + String(t.getMonth() + 1).padStart(2, '0') + '.' + t.getFullYear();
  }

  // Load defaults from JSON (before saved state, so saved state overrides)
  await loadDefaults();
  salivaryCarrier = defaultsData?.oral?.amylase?.additionMode === 'water' ? 'water' : 'solution';
  setSalivaryCarrierToggleState(salivaryCarrier);

  // Load saved state
  const extra = loadState();
  if (extra) {
    if (extra.__gastricEnzyme && extra.__gastricEnzyme !== 'rge') {
      const btn = document.querySelector('#gastric-enzyme-toggle .toggle-btn:last-child');
      if (btn) setGastricEnzyme('pepsin', btn);
    }
    if (extra.__rgeOnly === false) {
      const btn = document.querySelector('#gastric-rge-sufficient-toggle .toggle-btn:last-child');
      if (btn) setRgeSufficient(false, btn);
    }
    if (extra.__intEnzyme === 'individual') {
      const btn = document.querySelector('#int-enzyme-toggle .toggle-btn:last-child');
      if (btn) setIntEnzyme('individual', btn);
    }
    if (extra.__foodMode === 'algae') {
      const btn = document.querySelector('#food-mode-toggle .toggle-btn:last-child');
      if (btn) setFoodMode('algae', btn);
    }
    if (extra.__amylaseSource === 'solution') {
      const btn = document.querySelector('#amylase-source-toggle .toggle-btn:last-child');
      if (btn) setAmylaseSource('solution', btn);
    }
    if (extra.__salivaryCarrier === 'water' || extra.__salivaryCarrier === 'solution') {
      salivaryCarrier = extra.__salivaryCarrier;
      setSalivaryCarrierToggleState(salivaryCarrier);
    }
  }

  // Run initial calculation
  recalcAll();

  // Bind all input changes to recalcAll
  document.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', recalcAll);
    el.addEventListener('change', persistState);
  });

  // Bind buttons
  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  document.getElementById('btn-export')?.addEventListener('click', () => exportXLSX(getExportContext()));
  document.getElementById('btn-export-json')?.addEventListener('click', exportStateJSON);
  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    importStateJSON().then(() => recalcAll()).catch(err => alert(err));
  });
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-prev')?.addEventListener('click', () => { if (currentPhase > 0) goToPhase(currentPhase - 1); });
  document.getElementById('btn-next')?.addEventListener('click', () => { if (currentPhase < 2) goToPhase(currentPhase + 1); });

  // Stepper tabs
  [0, 1, 2].forEach(i => {
    document.getElementById('tab-' + i)?.addEventListener('click', () => goToPhase(i));
  });
}

// Make recalcAll available globally for inline oninput handlers (fallback)
window.recalcAll = recalcAll;
