/**
 * INFOGEST 2.0 — Calculation Engine
 * Pure math functions for digestion phase calculations.
 * Based on Minekus et al., 2014 (Food & Function, 5(6), 1113–1124).
 *
 * All volumes in mL unless otherwise noted.
 * All masses in mg.
 * All activities in U/mg (powders) or U/mL (solutions).
 * CaCl₂ in µL.
 *
 * Naming convention:
 *   - "per sample" = single tube
 *   - "stock"      = multiplied by n+1
 */

// ═══════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Calculate CaCl₂ volume (µL) from 0.3 M stock.
 * Formula: [Ca²⁺]_final(mM) × V_total(mL) / 300(mM) × 1000 = µL
 */
export function calcCaCl2_uL(totalVol_mL, caTarget_mM) {
  if (!totalVol_mL || !caTarget_mM) return 0;
  return (caTarget_mM * totalVol_mL / 300) * 1000;
}

/**
 * Enzyme minimum weight (mg) from powder.
 * Formula: [Target(U/mL) × Volume(mL)] / Activity(U/mg)
 * If purity is provided (0–1), adjusts: Activity_effective = Activity × purity
 */
export function calcMinWeight(target_UperML, volume_mL, activity_UperMG, purity = 1) {
  const adj = activity_UperMG * purity;
  if (!adj || adj <= 0 || !volume_mL || volume_mL <= 0) return null;
  return (target_UperML * volume_mL) / adj;
}

/**
 * Bile minimum weight (mg).
 * Formula: [Target(mM) × Volume(mL) / 1000] / Measured(mmol/g) × 1000
 */
export function calcBileMinWeight(target_mM, volume_mL, measured_mmolPerG) {
  if (!measured_mmolPerG || measured_mmolPerG <= 0 || !volume_mL || volume_mL <= 0) return null;
  return (target_mM * volume_mL / 1000 / measured_mmolPerG) * 1000;
}

/**
 * Dissolution volume for powder.
 * Given effective weighed mg, the volume the enzyme goes into,
 * and the minimum weight mg, calculate how much solvent is needed.
 * Formula: (effective_mg × enzymeVolume_mL) / minWeight_mg
 *
 * This gives the volume of solution you need to prepare so that
 * when you take enzymeVolume_mL from it, you get the right activity.
 */
export function calcDissolveVolume(effective_mg, enzymeVolume_mL, minWeight_mg) {
  if (!minWeight_mg || minWeight_mg <= 0 || !enzymeVolume_mL) return null;
  if (!effective_mg || effective_mg <= 0) return null;
  return (effective_mg * enzymeVolume_mL) / minWeight_mg;
}

/**
 * For solution-based amylase: volume of stock solution needed.
 * Formula: (target_UperML × totalDigestVol_mL) / stockConc_UperML
 */
export function calcSolutionVolume(target_UperML, totalDigestVol_mL, stockConc_UperML) {
  if (!stockConc_UperML || stockConc_UperML <= 0) return null;
  return (target_UperML * totalDigestVol_mL) / stockConc_UperML;
}


// ═══════════════════════════════════════════════════════
// ORAL PHASE
// ═══════════════════════════════════════════════════════

/**
 * Calculate oral phase composition.
 *
 * Current dashboard logic (food mode):
 *   food1 = user input (g or mL)
 *   ssf  = food × 4/5
 *   amylase_vol = food / 10
 *   cacl2_µL = food × 5  (this is the old formula)
 *   water = food - ssf - amylase_vol - cacl2_mL
 *   total = food × 2
 *
 * BUT the v2 prototype uses a different approach where total is user-editable
 * and water is calculated as: total - food - ssf - amylase_vol - cacl2_mL
 *
 * The INFOGEST protocol says: 1:1 ratio (food:simulated fluid), so total = food × 2
 * The simulated fluid half is composed of: SSF + amylase + CaCl₂ + water
 *
 * We use the current dashboard's math for correctness:
 *   - In FOOD mode: total = food × 2 (INFOGEST standard)
 *   - SSF = food × 4/5 (80% of the simulated fluid volume, excl. enzyme aliquots)
 *   - Amylase volume = food / 10
 *   - CaCl₂(µL) = food × 5  [this corresponds to 0.75mM final in 2× food volume]
 *   - Water = food - SSF - amylase_vol - CaCl₂(mL)
 *
 * Algae mode:
 *   - food_effective = user input volume (mL)
 *   - Same calculations as food mode using the volume input
 *   - Dry biomass is independent and not used in volume calculations
 *
 * NOTE: The v2 prototype's approach of user-editable total with auto-calc water
 * is actually more flexible. We'll support BOTH: default total = food × 2 (auto),
 * but the user can override total if needed.
 */
export function calcOralPhase(params) {
  const {
    food,          // g or mL of food (volume input for calculations)
    mode,          // 'food' | 'algae'
    nSamples,      // number of samples
    sampling,      // sampling volume (mL) to remove after oral phase
    caTarget_mM,   // target [Ca²⁺] in mM (default 0.75)
    amylaseTarget_UperML, // target amylase activity in final digest
    amylaseActivity_UperMG, // measured activity of powder
    amylasePurity,  // purity factor (0–1), default 1
    amylaseEffective_mg, // actually weighed mg (per sample)
    amylaseEffective_stk_mg, // actually weighed mg (stock)
    // Solution mode for amylase
    amylaseMode,    // 'powder' | 'solution'
    amylaseStockConc_UperML, // concentration of stock solution
    salivaryCarrier = 'solution', // 'solution' | 'water' (algae-only toggle)
  } = params;

  const N1 = nSamples + 1;

  // Use food as foodEffective for both modes
  const foodEffective = food;

  // Phase composition (per sample)
  const ssf = foodEffective * 4 / 5;
  const baseAmylaseVol = foodEffective / 10;
  const amylaseDisabled = mode === 'algae' && salivaryCarrier === 'water';
  const amylaseVol = amylaseDisabled ? 0 : baseAmylaseVol;
  const cacl2_uL = foodEffective * 5; // This gives 0.75 mM in total volume of food×2
  const cacl2_mL = cacl2_uL / 1000;
  const total = foodEffective * 2;

  // Water calculation (same for both modes)
  const water = foodEffective - ssf - amylaseVol - cacl2_mL;

  const finalVol = Math.max(0, total - sampling);

  // Mastermix volume (everything except food)
  const mmPerSample = foodEffective; // total - food = food (since total = 2×food)

  // Enzyme calculations
  let amylaseMinWt = null;
  let amylaseMinWt_stk = null;
  let amylaseDissolve = null;
  let amylaseDissolve_stk = null;

  if (!amylaseDisabled) {
    if (amylaseMode === 'solution') {
      // Solution-based: calc volume of stock solution needed
      const requiredUnits = total * amylaseTarget_UperML;
      amylaseDissolve = amylaseStockConc_UperML > 0
        ? requiredUnits / amylaseStockConc_UperML : null;
      amylaseDissolve_stk = amylaseDissolve !== null ? amylaseDissolve * N1 : null;
      amylaseMinWt = 0;
      amylaseMinWt_stk = 0;
    } else {
      // Powder-based calculation with purity
      const purity = amylasePurity || 1;
      const adjustedActivity = (amylaseActivity_UperMG || 0) * purity;

      if (adjustedActivity > 0) {
        amylaseMinWt = (total * amylaseTarget_UperML) / adjustedActivity;
        amylaseMinWt_stk = amylaseMinWt * N1;
      }

      // Dissolution volume = (effective × amylaseVol) / minWeight
      if (amylaseMinWt && amylaseMinWt > 0) {
        if (amylaseEffective_mg > 0) {
          amylaseDissolve = (amylaseEffective_mg * amylaseVol) / amylaseMinWt;
        }
        if (amylaseEffective_stk_mg > 0 && amylaseMinWt_stk > 0) {
          amylaseDissolve_stk = (amylaseEffective_stk_mg * amylaseVol) / amylaseMinWt;
          // Note: stock dissolution uses single-sample amylaseVol as the per-sample aliquot
          // but multiplied differently: Mdissolve = N1 * (Meffective × amylaseVol) / Mminimal
          amylaseDissolve_stk = (N1 * amylaseEffective_stk_mg * amylaseVol) / amylaseMinWt_stk;
        }
      }
    }
  }

  return {
    // Composition per sample
    food: food, // always show actual input
    foodEffective,
    ssf,
    amylaseVol,
    cacl2_uL,
    cacl2_mL,
    water,
    total,
    sampling,
    finalVol,
    mmPerSample,
    // Stock (×N1)
    food_stk: food * N1,
    ssf_stk: ssf * N1,
    amylaseVol_stk: amylaseVol * N1,
    cacl2_uL_stk: cacl2_uL * N1,
    water_stk: water * N1,
    total_stk: total * N1,
    sampling_stk: sampling * N1,
    finalVol_stk: finalVol * N1,
    mmPerSample_stk: mmPerSample * N1,
    // Mastermix card detail
    mm_ssf_stk: ssf * N1,
    mm_amylase_stk: amylaseVol * N1,
    mm_cacl2_uL_stk: cacl2_uL * N1,
    mm_water_stk: Math.max(0, water) * N1,
    mm_total_stk: mmPerSample * N1,
    // Enzyme
    amylaseMinWt,
    amylaseMinWt_stk,
    amylaseDissolve,
    amylaseDissolve_stk,
    // Context
    N1,
    mode,
    amylaseDisabled,
    salivaryCarrier,
  };
}


// ═══════════════════════════════════════════════════════
// GASTRIC PHASE
// ═══════════════════════════════════════════════════════

/**
 * Gastric phase composition.
 *
 * Current dashboard logic:
 *   oral_in = final volume from oral phase
 *   sgf = oral_in × 4/5
 *   cacl2_µL = oral_in / 2  [= oral_in × 0.5]
 *   enzyme_vol = oral_in / 20  (volume for each enzyme solution: RGE, pepsin, lipase)
 *   total = oral_in × 2  (1:1 dilution)
 *
 * RGE mode:
 *   - RGE solution volume = enzyme_vol (or 2× if "Use only RGE" checked)
 *   - Optional extra lipase solution volume = enzyme_vol
 *   - Optional extra pepsin solution volume = enzyme_vol
 *
 * Pepsin-only mode:
 *   - Pepsin solution volume = enzyme_vol
 *
 * Water = oral_in - sgf - cacl2_mL - acid - enzyme_volumes
 *
 * The v2 prototype uses a different approach with user-editable volumes.
 * We'll use the CURRENT dashboard math for correctness, with the v2 UI.
 *
 * Key: the current dashboard calculates enzyme volumes FROM oral_in automatically.
 * The v2 lets user edit them. We'll auto-calculate defaults but allow override.
 */
export function calcGastricPhase(params) {
  const {
    oralFinalVol,   // final volume from oral phase (mL)
    nSamples,
    sampling,
    caTarget_mM,    // default 0.75
    acid,           // acid/base volume for pH adjustment
    // Enzyme mode
    gastricEnzyme,  // 'rge' | 'pepsin'
    rgeOnly,        // true = use only RGE (no extra pepsin/lipase), false = RGE + extras
    // RGE params
    rgeLipaseTarget_UperML,
    rgeLipaseActivity_UperMG,
    rgePepsinTarget_UperML,
    rgePepsinActivity_UperMG,
    rgePurity,
    rgeEffective_mg,
    rgeEffective_stk_mg,
    // Extra lipase (when RGE insufficient)
    extraLipaseTarget_UperML,
    extraLipaseActivity_UperMG,
    extraLipasePurity,
    extraLipaseEffective_mg,
    extraLipaseEffective_stk_mg,
    // Pepsin-only params
    pepsinTarget_UperML,
    pepsinActivity_UperMG,
    pepsinPurity,
    pepsinEffective_mg,
    pepsinEffective_stk_mg,
  } = params;

  const N1 = nSamples + 1;
  const oralIn = oralFinalVol || 0;

  // Standard INFOGEST ratios
  const sgf = oralIn * 4 / 5;
  const cacl2_uL = oralIn / 2; // = oralIn × 0.5 (this gives 0.075 mM)
  const cacl2_mL = cacl2_uL / 1000;
  const enzymeBaseVol = oralIn / 20; // base volume for each enzyme solution
  const total = oralIn * 2;

  // Determine enzyme volumes based on mode
  let rgeVol = 0, pepsinVol = 0, extraLipaseVol = 0;

  if (gastricEnzyme === 'rge') {
    if (rgeOnly) {
      // "Use only RGE" — double the RGE volume to cover both pepsin + lipase
      rgeVol = enzymeBaseVol * 2;
    } else {
      // RGE + extra lipase solution (2 enzyme volume slots, matching old design)
      rgeVol = enzymeBaseVol;
      extraLipaseVol = enzymeBaseVol;
    }
  } else {
    // Pepsin-only mode
    pepsinVol = enzymeBaseVol;
  }

  const totalEnzymeVol = rgeVol + pepsinVol + extraLipaseVol;
  const water = oralIn - sgf - cacl2_mL - acid - totalEnzymeVol;
  const finalVol = Math.max(0, total - sampling);
  const mmPerSample = oralIn; // total - oralIn = oralIn (since total = 2 × oralIn)

  // ─── RGE enzyme calculations ───
  let rgeMinWt = null, rgeMinWt_stk = null;
  let rgeDissolve = null, rgeDissolve_stk = null;
  let rgeMinWt_lip = null, rgeMinWt_pep = null;
  let rgeLipCalcMethod = 'pepsin'; // always pepsin now
  let rgeLipaseSufficient = true; // new flag

  if (gastricEnzyme === 'rge') {
    const purity = rgePurity || 1;

    // Calculate min weight based on BOTH lipase and pepsin targets
    // The limiting factor (larger weight) determines min weight
    const adjLipAct = (rgeLipaseActivity_UperMG || 0) * purity;
    const adjPepAct = (rgePepsinActivity_UperMG || 0) * purity;

    if (adjLipAct > 0) {
      rgeMinWt_lip = (total * rgeLipaseTarget_UperML) / adjLipAct;
      rgeMinWt_lip = Number.isFinite(rgeMinWt_lip) ? rgeMinWt_lip : null;
    }
    if (adjPepAct > 0) {
      rgeMinWt_pep = (total * rgePepsinTarget_UperML) / adjPepAct;
      rgeMinWt_pep = Number.isFinite(rgeMinWt_pep) ? rgeMinWt_pep : null;
    }

    if (rgeOnly) {
      // Always base on pepsin, even in RGE-only mode
      rgeMinWt = rgeMinWt_pep;
      rgeLipCalcMethod = 'pepsin';
      // Check if lipase is sufficient with this pepsin-based weight
      const rgeProvidedLipase = (rgeLipaseActivity_UperMG || 0) * purity * (rgeMinWt || 0);
      const totalLipaseNeeded = total * (rgeLipaseTarget_UperML || 0);
      rgeLipaseSufficient = rgeProvidedLipase >= totalLipaseNeeded;
    } else {
      // RGE + extra lipase: weight driven by pepsin alone
      rgeMinWt = rgeMinWt_pep;
      rgeLipCalcMethod = 'pepsin';
      rgeLipaseSufficient = true; // extra lipase handles any deficit
    }

    if (rgeMinWt && rgeMinWt > 0) {
      rgeMinWt_stk = rgeMinWt * N1;
      if (rgeEffective_mg > 0) {
        rgeDissolve = (rgeEffective_mg * rgeVol) / rgeMinWt;
      }
      if (rgeEffective_stk_mg > 0) {
        rgeDissolve_stk = (N1 * rgeEffective_stk_mg * rgeVol) / rgeMinWt_stk;
      }
    }
  }

  // ─── Extra lipase calculations ───
  let extraLipaseMinWt = null, extraLipaseMinWt_stk = null;
  let extraLipaseDissolve = null, extraLipaseDissolve_stk = null;

  if (gastricEnzyme === 'rge' && !rgeOnly && extraLipaseVol > 0) {
    const elPurity = extraLipasePurity || 1;
    const adjAct = (extraLipaseActivity_UperMG || 0) * elPurity;
    if (adjAct > 0) {
      // lipase provided by the *pepsin‑based* amount of RGE
      const rgeProvidedLipase = (rgeLipaseActivity_UperMG || 0) * (rgePurity || 1) * (rgeMinWt_pep || 0);
      const totalLipaseNeeded = total * (extraLipaseTarget_UperML || 0);
      const deficit = Math.max(0, totalLipaseNeeded - rgeProvidedLipase);

      extraLipaseMinWt = deficit / adjAct;
      extraLipaseMinWt_stk = extraLipaseMinWt * N1;
    }

    if (extraLipaseMinWt && extraLipaseMinWt > 0 && extraLipaseVol > 0) {
      if (extraLipaseEffective_mg > 0) {
        extraLipaseDissolve = (extraLipaseEffective_mg * extraLipaseVol) / extraLipaseMinWt;
      }
      if (extraLipaseEffective_stk_mg > 0 && extraLipaseMinWt_stk > 0) {
        extraLipaseDissolve_stk = (N1 * extraLipaseEffective_stk_mg * extraLipaseVol) / extraLipaseMinWt_stk;
      }
    }
  }

  // ─── Pepsin-only calculations ───
  let pepsinMinWt = null, pepsinMinWt_stk = null;
  let pepsinDissolve = null, pepsinDissolve_stk = null;

  if (gastricEnzyme === 'pepsin') {
    const purity = pepsinPurity || 1;
    const adjAct = (pepsinActivity_UperMG || 0) * purity;
    if (adjAct > 0) {
      pepsinMinWt = (total * pepsinTarget_UperML) / adjAct;
      pepsinMinWt_stk = pepsinMinWt * N1;
    }
    if (pepsinMinWt && pepsinMinWt > 0 && pepsinVol > 0) {
      if (pepsinEffective_mg > 0) {
        pepsinDissolve = (pepsinEffective_mg * pepsinVol) / pepsinMinWt;
      }
      if (pepsinEffective_stk_mg > 0 && pepsinMinWt_stk > 0) {
        pepsinDissolve_stk = (N1 * pepsinEffective_stk_mg * pepsinVol) / pepsinMinWt_stk;
      }
    }
  }

  return {
    oralIn,
    sgf,
    cacl2_uL,
    cacl2_mL,
    enzymeBaseVol,
    rgeVol,
    pepsinVol,
    extraLipaseVol,
    totalEnzymeVol,
    acid,
    water,
    total,
    sampling,
    finalVol,
    mmPerSample,
    // Stock
    oralIn_stk: oralIn * N1,
    sgf_stk: sgf * N1,
    cacl2_uL_stk: cacl2_uL * N1,
    rgeVol_stk: rgeVol * N1,
    pepsinVol_stk: pepsinVol * N1,
    extraLipaseVol_stk: extraLipaseVol * N1,
    acid_stk: acid * N1,
    water_stk: water * N1,
    total_stk: total * N1,
    sampling_stk: sampling * N1,
    finalVol_stk: finalVol * N1,
    mmPerSample_stk: mmPerSample * N1,
    // Mastermix card
    mm_sgf_stk: sgf * N1,
    mm_rge_stk: rgeVol * N1,
    mm_pepsin_stk: pepsinVol * N1,
    mm_extraLipase_stk: extraLipaseVol * N1,
    mm_cacl2_uL_stk: cacl2_uL * N1,
    mm_acid_stk: acid * N1,
    mm_water_stk: Math.max(0, water) * N1,
    mm_total_stk: mmPerSample * N1,
    // RGE enzyme
    rgeMinWt, rgeMinWt_stk,
    rgeMinWt_lip, rgeMinWt_pep,
    rgeLipCalcMethod,
    rgeLipaseSufficient,
    rgeDissolve, rgeDissolve_stk,
    // Extra lipase
    extraLipaseMinWt, extraLipaseMinWt_stk,
    extraLipaseDissolve, extraLipaseDissolve_stk,
    // Pepsin
    pepsinMinWt, pepsinMinWt_stk,
    pepsinDissolve, pepsinDissolve_stk,
    // Context
    N1,
    gastricEnzyme,
    rgeOnly,
  };
}


// ═══════════════════════════════════════════════════════
// INTESTINAL PHASE — PANCREATIN MODE
// ═══════════════════════════════════════════════════════

/**
 * Intestinal phase with pancreatin.
 *
 * Current dashboard logic:
 *   gastric_in = final volume from gastric phase
 *   pancreatin_vol = gastric_in / 4
 *   bile_vol = gastric_in / 8
 *   sif = gastric_in × 4/5 - pancreatin_vol - bile_vol
 *   cacl2_µL = gastric_in × 2
 *   total = gastric_in × 2
 *   water = gastric_in - sif - cacl2_mL - base - pancreatin_vol - bile_vol
 */
export function calcIntestinalPancreatin(params) {
  const {
    gastricFinalVol,
    nSamples,
    sampling,
    caTarget_mM,    // default 0.6
    base,           // acid/base volume for pH adjustment
    // Pancreatin
    pancreatinTarget_UperML,
    pancreatinActivity_UperMG,
    pancreatinPurity,
    pancreatinEffective_mg,
    pancreatinEffective_stk_mg,
    // Bile
    bileTarget_mM,
    bileMeasured_mmolPerG,
    bilePurity,
    bileEffective_mg,
    bileEffective_stk_mg,
  } = params;

  const N1 = nSamples + 1;
  const gastricIn = gastricFinalVol || 0;

  const pancreatinVol = gastricIn / 4;
  const bileVol = gastricIn / 8;
  const sif = gastricIn * 4 / 5 - pancreatinVol - bileVol;
  const cacl2_uL = gastricIn * 2;
  const cacl2_mL = cacl2_uL / 1000;
  const total = gastricIn * 2;
  const water = gastricIn - sif - cacl2_mL - base - pancreatinVol - bileVol;
  const finalVol = Math.max(0, total - sampling);
  const mmPerSample = gastricIn;

  // Pancreatin min weight
  const pPurity = pancreatinPurity || 1;
  const pAdjAct = (pancreatinActivity_UperMG || 0) * pPurity;
  let pancreatinMinWt = null, pancreatinMinWt_stk = null;
  let pancreatinDissolve = null, pancreatinDissolve_stk = null;

  if (pAdjAct > 0) {
    pancreatinMinWt = (total * pancreatinTarget_UperML) / pAdjAct;
    pancreatinMinWt_stk = pancreatinMinWt * N1;
  }
  if (pancreatinMinWt && pancreatinMinWt > 0 && pancreatinVol > 0) {
    if (pancreatinEffective_mg > 0) {
      pancreatinDissolve = (pancreatinEffective_mg * pancreatinVol) / pancreatinMinWt;
    }
    if (pancreatinEffective_stk_mg > 0 && pancreatinMinWt_stk > 0) {
      pancreatinDissolve_stk = (N1 * pancreatinEffective_stk_mg * pancreatinVol) / pancreatinMinWt_stk;
    }
  }

  // Bile min weight
  let bileMinWt = null, bileMinWt_stk = null;
  let bileDissolve = null, bileDissolve_stk = null;

  if (bileMeasured_mmolPerG && bileMeasured_mmolPerG > 0) {
    bileMinWt = (bileTarget_mM * total / 1000 / bileMeasured_mmolPerG) * 1000;
    bileMinWt_stk = bileMinWt * N1;
  }
  if (bileMinWt && bileMinWt > 0 && bileVol > 0) {
    if (bileEffective_mg > 0) {
      bileDissolve = (bileEffective_mg * bileVol) / bileMinWt;
    }
    if (bileEffective_stk_mg > 0 && bileMinWt_stk > 0) {
      bileDissolve_stk = (N1 * bileEffective_stk_mg * bileVol) / bileMinWt_stk;
    }
  }

  return {
    gastricIn,
    sif, pancreatinVol, bileVol,
    cacl2_uL, cacl2_mL,
    base, water, total,
    sampling, finalVol, mmPerSample,
    // Stock
    gastricIn_stk: gastricIn * N1,
    sif_stk: sif * N1,
    pancreatinVol_stk: pancreatinVol * N1,
    bileVol_stk: bileVol * N1,
    cacl2_uL_stk: cacl2_uL * N1,
    base_stk: base * N1,
    water_stk: water * N1,
    total_stk: total * N1,
    sampling_stk: sampling * N1,
    finalVol_stk: finalVol * N1,
    mmPerSample_stk: mmPerSample * N1,
    // Mastermix
    mm_sif_stk: sif * N1,
    mm_pancreatin_stk: pancreatinVol * N1,
    mm_bile_stk: bileVol * N1,
    mm_cacl2_uL_stk: cacl2_uL * N1,
    mm_base_stk: base * N1,
    mm_water_stk: Math.max(0, water) * N1,
    mm_total_stk: mmPerSample * N1,
    // Enzyme
    pancreatinMinWt, pancreatinMinWt_stk,
    pancreatinDissolve, pancreatinDissolve_stk,
    // Bile
    bileMinWt, bileMinWt_stk,
    bileDissolve, bileDissolve_stk,
    // Context
    N1,
  };
}


// ═══════════════════════════════════════════════════════
// INTESTINAL PHASE — INDIVIDUAL ENZYMES MODE
// ═══════════════════════════════════════════════════════

/**
 * Intestinal phase with individual enzymes.
 *
 * Current dashboard logic:
 *   gastric_in = final volume from gastric phase
 *   trypsin_vol = chymo_vol = lipase_vol = colipase_vol = amylase_vol = gastric_in / 20
 *   bile_vol = gastric_in / 8
 *   sif = gastric_in × 4/5 - trypsin - chymo - lipase - colipase - amylase - bile
 *   cacl2_µL = gastric_in × 2
 *   total = gastric_in × 2
 *   water = gastric_in - sif - cacl2_mL - base - all_enzyme_vols - bile
 */
export function calcIntestinalIndividual(params) {
  const {
    gastricFinalVol,
    nSamples,
    sampling,
    base,
    // Individual enzyme params (each has target, activity, purity, effective)
    enzymes, // array of { id, target, activity, purity, effective_mg, effective_stk_mg }
    // Bile
    bileTarget_mM,
    bileMeasured_mmolPerG,
    bileEffective_mg,
    bileEffective_stk_mg,
    // Colipase special: calculated as ratio of lipase
    colipaseTarget_UperMG, // target units per mg of lipase
  } = params;

  const N1 = nSamples + 1;
  const gastricIn = gastricFinalVol || 0;

  const enzymeBaseVol = gastricIn / 20;
  const bileVol = gastricIn / 8;
  const cacl2_uL = gastricIn * 2;
  const cacl2_mL = cacl2_uL / 1000;
  const total = gastricIn * 2;

  // Each enzyme gets enzymeBaseVol
  const enzymeIds = ['trypsin', 'chymotrypsin', 'lipase', 'colipase', 'amylase'];
  const enzymeVols = {};
  let totalEnzymeVol = 0;
  enzymeIds.forEach(id => {
    enzymeVols[id] = enzymeBaseVol;
    totalEnzymeVol += enzymeBaseVol;
  });

  const sif = gastricIn * 4 / 5 - totalEnzymeVol - bileVol;
  const water = gastricIn - sif - cacl2_mL - base - totalEnzymeVol - bileVol;
  const finalVol = Math.max(0, total - sampling);
  const mmPerSample = gastricIn;

  // Calculate min weights for each enzyme
  const enzymeResults = {};
  (enzymes || []).forEach(e => {
    const purity = e.purity || 1;
    const adjAct = (e.activity || 0) * purity;
    const vol = enzymeVols[e.id] || enzymeBaseVol;
    let minWt = null, minWt_stk = null;
    let dissolve = null, dissolve_stk = null;

    if (e.id === 'colipase') {
      // Colipase: min weight = (total × lipaseTarget × 0.4) / colipaseActivity
      // This is the special formula from the current code
      const lipaseEnzyme = (enzymes || []).find(x => x.id === 'lipase');
      const lipaseTarget = lipaseEnzyme ? lipaseEnzyme.target : 0;
      if (e.activity > 0) {
        minWt = (total * lipaseTarget * 0.4) / e.activity;
        minWt_stk = minWt * N1;
      }
    } else {
      if (adjAct > 0) {
        minWt = (total * e.target) / adjAct;
        minWt_stk = minWt * N1;
      }
    }

    if (minWt && minWt > 0 && vol > 0) {
      if (e.effective_mg > 0) {
        dissolve = (e.effective_mg * vol) / minWt;
      }
      if (e.effective_stk_mg > 0 && minWt_stk > 0) {
        dissolve_stk = (N1 * e.effective_stk_mg * vol) / minWt_stk;
      }
    }

    enzymeResults[e.id] = { minWt, minWt_stk, dissolve, dissolve_stk, vol };
  });

  // Bile
  let bileMinWt = null, bileMinWt_stk = null;
  let bileDissolve = null, bileDissolve_stk = null;

  if (bileMeasured_mmolPerG && bileMeasured_mmolPerG > 0) {
    bileMinWt = (bileTarget_mM * total / 1000 / bileMeasured_mmolPerG) * 1000;
    bileMinWt_stk = bileMinWt * N1;
  }
  if (bileMinWt && bileMinWt > 0 && bileVol > 0) {
    if (bileEffective_mg > 0) {
      bileDissolve = (bileEffective_mg * bileVol) / bileMinWt;
    }
    if (bileEffective_stk_mg > 0 && bileMinWt_stk > 0) {
      bileDissolve_stk = (N1 * bileEffective_stk_mg * bileVol) / bileMinWt_stk;
    }
  }

  return {
    gastricIn, sif, bileVol,
    cacl2_uL, cacl2_mL,
    enzymeBaseVol, totalEnzymeVol,
    base, water, total,
    sampling, finalVol, mmPerSample,
    enzymeVols,
    // Stock
    gastricIn_stk: gastricIn * N1,
    sif_stk: sif * N1,
    bileVol_stk: bileVol * N1,
    cacl2_uL_stk: cacl2_uL * N1,
    base_stk: base * N1,
    water_stk: water * N1,
    total_stk: total * N1,
    sampling_stk: sampling * N1,
    finalVol_stk: finalVol * N1,
    mmPerSample_stk: mmPerSample * N1,
    // Enzymes
    enzymeResults,
    // Bile
    bileMinWt, bileMinWt_stk,
    bileDissolve, bileDissolve_stk,
    // Context
    N1,
  };
}


// ═══════════════════════════════════════════════════════
// WARNING GENERATORS
// ═══════════════════════════════════════════════════════

/**
 * Generate warnings for a phase.
 * Returns array of { type: 'error'|'warning'|'info', message: string }
 */
export function generateOralWarnings(result) {
  const warnings = [];

  if (result.water < -0.001) {
    warnings.push({
      type: 'error',
      message: `Component volumes (${fmt(result.ssf + result.amylaseVol + result.cacl2_mL + result.food, 3)} mL) exceed total digest volume (${fmt(result.total, 3)} mL). Water make-up would be negative.`
    });
  }
  if (result.sampling > result.total) {
    warnings.push({
      type: 'warning',
      message: 'Sampling volume exceeds total digest volume.'
    });
  }
  if (result.finalVol <= 0 && result.sampling > 0) {
    warnings.push({
      type: 'error',
      message: 'Reduce sampling volume — final volume is zero or negative.'
    });
  }

  return warnings;
}

export function generateAmylaseWarnings(
  result,
  activity,
  purity,
  effective,
  minWt,
  dissolve,
  label = 'per sample',
  options = {}
) {
  const warnings = [];
  const { amylaseDisabled = false, isPowderMode = true, showPurityInfo = true } = options;
  

  if (amylaseDisabled) {
    warnings.push({
      type: 'info',
      message: 'Salivary amylase addition is disabled (Water selected in Algae mode). Amylase slot volume is reassigned to water for Oral phase only.'
    });
    return warnings;
  }
  
  // No powder-related warnings in solution mode
  if (!isPowderMode) return warnings;

  if (!activity || activity <= 0) {
    warnings.push({
      type: 'warning',
      message: `Enter measured salivary amylase activity (U/mg) to calculate minimum weight.`
    });
  } else {
    if (showPurityInfo && purity > 0) {
      warnings.push({
        type: 'info',
        message: `Current purity: ${fmt(purity, 2)}%. Verify supplier COA and ensure purity.`
      });
    }
    if (effective === null || effective == 0) {
      warnings.push({
        type: 'warning',
        message: `Weighed amylase mass (${label}) is zero or not entered. Enter effective mass to dilution volume.`
      });
    }
    if (effective > 0 && minWt !== null && effective < minWt) {
      warnings.push({
        type: 'error',
        message: `Not enough weighed amylase (${label}): ${fmt(effective, 2)} mg < minimum ${fmt(minWt, 2)} mg.`
      });
    }
    if (dissolve && effective > 0 && effective / dissolve > 10) {
      warnings.push({
        type: 'warning',
        message: `Dissolution of amylase (${label}) may be critical — try using more active enzyme.`
      });
    }
  } 

  return warnings;
}

export function generateGastricWarnings(result) {
  const warnings = [];

  if (result.water < -0.001) {
    warnings.push({
      type: 'error',
      message: `Component volumes exceed total digest volume by ${fmt(Math.abs(result.water), 3)} mL. Use more concentrated acid/base or increase total volume.`
    });
  }
  if (result.oralIn <= 0) {
    warnings.push({
      type: 'info',
      message: 'Oral chyme volume is 0 — complete the Oral phase first.'
    });
  }
  if (result.finalVol <= 0 && result.sampling > 0) {
    warnings.push({
      type: 'error',
      message: 'Reduce sampling volume.'
    });
  }

  return warnings;
}

export function generateEnzymeWarnings(name, effective, minWt, dissolve, dissolutionLimit = 250) {
  const warnings = [];

  if (effective === null || effective == 0) {
      warnings.push({
        type: 'warning',
        message: `Weighed amylase mass (${label}) is zero or not entered. Enter effective mass to dilution volume.`
      });
    }
  if (effective > 0 && minWt !== null && effective < minWt) {
    warnings.push({
      type: 'error',
      message: `Not enough weighed ${name}: ${fmt(effective, 2)} mg < minimum ${fmt(minWt, 2)} mg.`
    });
  }
  if (dissolve && effective > 0 && dissolve > 0 && effective / dissolve > dissolutionLimit) {
    warnings.push({
      type: 'warning',
      message: `Dissolution of ${name} may be critical — concentration too high. Try using more active enzyme.`
    });
  }

  return warnings;
}

export function generateIntestinalWarnings(result) {
  const warnings = [];

  if (result.water < -0.001) {
    warnings.push({
      type: 'error',
      message: `Component volumes exceed total digest volume by ${fmt(Math.abs(result.water), 3)} mL. Use more concentrated acid/base or increase total volume.`
    });
  }
  if (result.gastricIn <= 0) {
    warnings.push({
      type: 'info',
      message: 'Gastric chyme volume is 0 — complete the Gastric phase first.'
    });
  }
  if (result.finalVol <= 0 && result.sampling > 0) {
    warnings.push({
      type: 'error',
      message: 'Reduce sampling volume.'
    });
  }

  return warnings;
}


// ═══════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Format a number for display.
 */
export function fmt(v, decimals = 3) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return parseFloat(v.toFixed(decimals)).toString();
}

/**
 * Format volume with auto mL/µL conversion.
 * Returns { value: string, unit: string }
 */
export function fmtVolume(mL, decimals = 3) {
  if (mL === null || mL === undefined || isNaN(mL)) return { value: '—', unit: 'mL' };
  if (Math.abs(mL) < 1 && Math.abs(mL) > 0) {
    return { value: fmt(mL * 1000, Math.max(0, decimals - 1)), unit: 'µL' };
  }
  return { value: fmt(mL, decimals), unit: 'mL' };
}
