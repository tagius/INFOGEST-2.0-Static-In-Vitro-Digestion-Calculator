/**
 * INFOGEST 2.0 — Excel Export
 * Clean, minimalist lab notebook template.
 */

export function exportXLSX(ctx) {
  const { fv, sv, n1, fmt, gcv, gastricEnzyme, rgeOnly, intEnzyme, foodMode } = ctx;
  const wb = XLSX.utils.book_new();
  const N = parseInt(document.getElementById('nSamples').value) || 3;
  const N1 = N + 1;
  const op = sv('operator') || 'N/A';
  const dt = sv('expDate') || new Date().toLocaleDateString('de-CH');
  const enziG = gastricEnzyme === 'rge' ? 'RGE' : 'Pepsin';
  const enziI = intEnzyme === 'pancreatin' ? 'Pancreatin' : 'Individual enzymes';
  const modeLabel = foodMode === 'algae' ? 'Algae' : 'Food';

  // ─────────────────────────────────────────────────
  // SHEET 1: Summary
  // ─────────────────────────────────────────────────
  const sum = [
    ['INFOGEST 2.0 — DIGESTION PROTOCOL'],
    [''],
    ['Operator', op],
    ['Date', dt],
    ['Mode', modeLabel],
    ['Samples (n)', N],
    ['Stock multiplier (n+1)', N1],
    ['Gastric enzyme', enziG + (gastricEnzyme === 'rge' && !rgeOnly ? ' + extra lipase' : '')],
    ['Intestinal enzyme', enziI],
    [''],
    ['PHASE', 'pH', 'Duration (min)', 'Temperature (°C)', 'Final [Ca²⁺] (mM)'],
    ['Oral', '7.0', sv('oral-duration') || '2', sv('oral-temp') || '37', sv('oral-ca-target') || '0.75'],
    ['Gastric', '3.0', sv('gastric-duration') || '120', sv('gastric-temp') || '37', sv('gastric-ca-target') || '0.075'],
    ['Intestinal', '7.0', sv('int-duration') || '120', sv('int-temp') || '37', sv('int-ca-target') || '0.6'],
    [''],
    ['VOLUMES', 'Total / sample (mL)', 'Final / sample (mL)'],
    ['Oral', gcv('oral-total-val') || fmt((foodMode === 'algae' ? fv('oral-food-algae') : fv('oral-food')) * 2), gcv('oral-final')],
    ['Gastric', gcv('gastric-total-val'), gcv('gastric-final')],
    ['Intestinal', gcv('int-total-val'), gcv('int-final')],
    [''],
    ['Reference', 'Minekus M. et al. (2014). Food & Function, 5(6), 1113–1124.'],
    ['Generated', new Date().toLocaleString('de-CH')],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(sum);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  // Merge title row
  wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Helper for phase sheets
  function mkSheet(rows) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
    return ws;
  }

  // ─────────────────────────────────────────────────
  // SHEET 2: Oral Phase
  // ─────────────────────────────────────────────────
  const oralRows = [
    ['ORAL PHASE', '', 'Per sample', 'Stock ×' + N1, 'Unit'],
    [''],
    ['COMPOSITION'],
  ];

  if (foodMode === 'algae') {
    oralRows.push(
      ['Algae solution volume', '', fv('oral-food-algae'), fv('oral-food-algae') * N1, 'g or mL'],
      ['Algae dry biomass', '', fv('oral-food-algae-biomass'), fv('oral-food-algae-biomass') * N1, 'mg']
    );
  } else {
    oralRows.push(['Food', '', fv('oral-food'), fv('oral-food') * N1, 'g or mL']);
  }

  oralRows.push(
    ['SSF', '', gcv('oral-ssf-val') || fmt((foodMode === 'algae' ? fv('oral-food-algae') : fv('oral-food')) * 4 / 5), gcv('oral-ssf-stk'), 'mL'],
    ['Salivary amylase sol.', '', gcv('oral-amylase-vol-val'), gcv('oral-amylase-vol-stk'), 'mL'],
    ['0.3 M CaCl₂', '', gcv('oral-cacl2'), gcv('oral-cacl2-stk'), 'µL'],
    ['Water (mQ)', '', gcv('oral-water'), gcv('oral-water-stk'), 'mL'],
    [''],
    ['TOTAL DIGEST', '', gcv('oral-total-val'), gcv('oral-total-stk'), 'mL'],
    ['Sampling', '', fv('oral-sampling'), gcv('oral-sampling-stk'), 'mL'],
    ['FINAL VOLUME', '', gcv('oral-final'), gcv('oral-final-stk'), 'mL'],
    [''],
    ['CONDITIONS'],
    ['pH', '', '7.0'],
    ['Duration', '', sv('oral-duration') || '2', '', 'min'],
    ['Temperature', '', sv('oral-temp') || '37', '', '°C'],
    ['Final [Ca²⁺]', '', sv('oral-ca-target') || '0.75', '', 'mM'],
    [''],
    ['SALIVARY α-AMYLASE'],
    ['Product', sv('oral-amylase-product') || '—'],
    ['Lot No.', sv('oral-amylase-lot') || '—'],
    ['Target activity', '', sv('oral-amylase-target') || '75', '', 'U/mL (in final digest)'],
    ['Measured activity', '', sv('oral-amylase-activity') || '—', '', 'U/mg'],
    ['Purity', '', (sv('oral-amylase-purity') || '100'), '', '%'],
    ['Minimum weight', '', gcv('oral-amylase-minwt-s'), gcv('oral-amylase-minwt-stk'), 'mg'],
    ['Effective weighed', '', sv('oral-amylase-eff') || '—', sv('oral-amylase-eff-stk') || '—', 'mg'],
    ['Dissolve in', '', gcv('oral-amylase-diss-s'), gcv('oral-amylase-diss-stk'), 'mL'],
  );
  XLSX.utils.book_append_sheet(wb, mkSheet(oralRows), 'Oral Phase');

  // ─────────────────────────────────────────────────
  // SHEET 3: Gastric Phase
  // ─────────────────────────────────────────────────
  const gRows = [
    ['GASTRIC PHASE', '', 'Per sample', 'Stock ×' + N1, 'Unit'],
    ['Enzyme mode: ' + enziG + (gastricEnzyme === 'rge' && !rgeOnly ? ' + extra lipase' : '')],
    [''],
    ['COMPOSITION'],
    ['Oral chyme (in)', '', gcv('gastric-oral-in'), gcv('gastric-oral-in-stk'), 'mL'],
    ['SGF', '', gcv('gastric-sgf-val'), gcv('gastric-sgf-stk'), 'mL'],
  ];

  if (gastricEnzyme === 'rge') {
    gRows.push(['RGE solution', '', gcv('gastric-rge-vol-val'), gcv('gastric-rge-vol-stk'), 'mL']);
    if (!rgeOnly) {
      gRows.push(['Extra lipase solution', '', gcv('gastric-extralipase-vol-val'), gcv('gastric-extralipase-vol-stk'), 'mL']);
    }
  } else {
    gRows.push(['Pepsin solution', '', gcv('gastric-pepsin-vol-val'), gcv('gastric-pepsin-vol-stk'), 'mL']);
  }

  gRows.push(
    ['0.3 M CaCl₂', '', gcv('gastric-cacl2'), gcv('gastric-cacl2-stk'), 'µL'],
    ['Acid/base (pH 3.0)', '', fv('gastric-acid'), gcv('gastric-acid-stk'), 'mL'],
    ['Water (mQ)', '', gcv('gastric-water'), gcv('gastric-water-stk'), 'mL'],
    [''],
    ['TOTAL DIGEST', '', gcv('gastric-total-val'), gcv('gastric-total-stk'), 'mL'],
    ['Sampling', '', fv('gastric-sampling'), gcv('gastric-sampling-stk'), 'mL'],
    ['FINAL VOLUME', '', gcv('gastric-final'), gcv('gastric-final-stk'), 'mL'],
    [''],
    ['CONDITIONS'],
    ['pH', '', '3.0'],
    ['Duration', '', sv('gastric-duration') || '120', '', 'min'],
    ['Temperature', '', sv('gastric-temp') || '37', '', '°C'],
    ['Final [Ca²⁺]', '', sv('gastric-ca-target') || '0.075', '', 'mM'],
    [''],
  );

  if (gastricEnzyme === 'rge') {
    gRows.push(
      ['RABBIT GASTRIC EXTRACT (RGE)'],
      ['Product', sv('gastric-rge-product') || '—'],
      ['Lot No.', sv('gastric-rge-lot') || '—'],
      ['Purity', '', sv('gastric-rge-purity') || '100', '', '%'],
      ['Lipase target', '', sv('gastric-rge-lipase-target'), '', 'U/mL'],
      ['Measured lipase', '', sv('gastric-rge-lipase-activity') || '—', '', 'U/mg'],
      ['Pepsin target', '', sv('gastric-rge-pepsin-target'), '', 'U/mL'],
      ['Measured pepsin', '', sv('gastric-rge-pepsin-activity') || '—', '', 'U/mg'],
      ['Minimum weight', '', gcv('gastric-rge-minwt-s'), gcv('gastric-rge-minwt-stk'), 'mg'],
      ['Effective weighed', '', sv('gastric-rge-eff') || '—', sv('gastric-rge-eff-stk') || '—', 'mg'],
      ['Dissolve in SGF', '', gcv('gastric-rge-diss-s'), gcv('gastric-rge-diss-stk'), 'mL'],
    );
    if (!rgeOnly) {
      gRows.push(
        [''],
        ['SUPPLEMENTARY LIPASE'],
        ['Product', sv('gastric-extralipase-product') || '—'],
        ['Lot No.', sv('gastric-extralipase-lot') || '—'],
        ['Target', '', sv('gastric-extralipase-target'), '', 'U/mL'],
        ['Measured', '', sv('gastric-extralipase-activity') || '—', '', 'U/mg'],
        ['Minimum weight', '', gcv('gastric-extralipase-minwt-s'), gcv('gastric-extralipase-minwt-stk'), 'mg'],
        ['Effective weighed', '', sv('gastric-extralipase-eff') || '—', '', 'mg'],
      );
    }
  } else {
    gRows.push(
      ['PEPSIN'],
      ['Product', sv('gastric-pepsin-product') || '—'],
      ['Lot No.', sv('gastric-pepsin-lot') || '—'],
      ['Purity', '', sv('gastric-pepsin-purity') || '100', '', '%'],
      ['Target', '', sv('gastric-pepsin-target'), '', 'U/mL'],
      ['Measured', '', sv('gastric-pepsin-activity') || '—', '', 'U/mg'],
      ['Minimum weight', '', gcv('gastric-pepsin-minwt-s'), gcv('gastric-pepsin-minwt-stk'), 'mg'],
      ['Effective weighed', '', sv('gastric-pepsin-eff') || '—', sv('gastric-pepsin-eff-stk') || '—', 'mg'],
      ['Dissolve in SGF', '', gcv('gastric-pepsin-diss-s'), gcv('gastric-pepsin-diss-stk'), 'mL'],
    );
  }
  XLSX.utils.book_append_sheet(wb, mkSheet(gRows), 'Gastric Phase');

  // ─────────────────────────────────────────────────
  // SHEET 4: Intestinal Phase
  // ─────────────────────────────────────────────────
  const iRows = [
    ['INTESTINAL PHASE', '', 'Per sample', 'Stock ×' + N1, 'Unit'],
    ['Enzyme mode: ' + enziI],
    [''],
    ['COMPOSITION'],
    ['Gastric chyme (in)', '', gcv('int-gastric-in'), gcv('int-gastric-in-stk'), 'mL'],
    ['SIF', '', gcv('int-sif-val'), gcv('int-sif-stk'), 'mL'],
  ];

  if (intEnzyme === 'pancreatin') {
    iRows.push(['Pancreatin solution', '', gcv('int-pancreatin-vol-val'), gcv('int-pancreatin-vol-stk'), 'mL']);
  } else {
    const indivIds = [
      { id: 'trypsin', label: 'Trypsin solution' },
      { id: 'chymo', label: 'Chymotrypsin solution' },
      { id: 'lipase', label: 'Pancreatic lipase sol.' },
      { id: 'colipase', label: 'Colipase solution' },
      { id: 'intamylase', label: 'Int. amylase solution' },
    ];
    indivIds.forEach(e => {
      iRows.push([e.label, '', gcv('int-' + e.id + '-vol-val'), gcv('int-' + e.id + '-vol-stk'), 'mL']);
    });
  }

  iRows.push(
    ['Bile solution', '', gcv('int-bile-vol-val'), gcv('int-bile-vol-stk'), 'mL'],
    ['0.3 M CaCl₂', '', gcv('int-cacl2'), gcv('int-cacl2-stk'), 'µL'],
    ['Acid/base (pH 7.0)', '', fv('int-base'), gcv('int-base-stk'), 'mL'],
    ['Water (mQ)', '', gcv('int-water'), gcv('int-water-stk'), 'mL'],
    [''],
    ['TOTAL DIGEST', '', gcv('int-total-val'), gcv('int-total-stk'), 'mL'],
    ['Sampling', '', fv('int-sampling'), gcv('int-sampling-stk'), 'mL'],
    ['FINAL VOLUME', '', gcv('int-final'), gcv('int-final-stk'), 'mL'],
    [''],
    ['CONDITIONS'],
    ['pH', '', '7.0'],
    ['Duration', '', sv('int-duration') || '120', '', 'min'],
    ['Temperature', '', sv('int-temp') || '37', '', '°C'],
    ['Final [Ca²⁺]', '', sv('int-ca-target') || '0.6', '', 'mM'],
    [''],
  );

  if (intEnzyme === 'pancreatin') {
    iRows.push(
      ['PANCREATIN'],
      ['Product', sv('int-pancreatin-product') || '—'],
      ['Lot No.', sv('int-pancreatin-lot') || '—'],
      ['Purity', '', sv('int-pancreatin-purity') || '100', '', '%'],
      ['Target (trypsin)', '', sv('int-pancreatin-target'), '', 'U/mL'],
      ['Measured', '', sv('int-pancreatin-activity') || '—', '', 'U/mg'],
      ['Minimum weight', '', gcv('int-pancreatin-minwt-s'), gcv('int-pancreatin-minwt-stk'), 'mg'],
      ['Effective weighed', '', sv('int-pancreatin-eff') || '—', sv('int-pancreatin-eff-stk') || '—', 'mg'],
      ['Dissolve in SIF', '', gcv('int-pancreatin-diss-s'), gcv('int-pancreatin-diss-stk'), 'mL'],
    );
  } else {
    const indiv = [
      { id: 'trypsin', name: 'TRYPSIN', unit: 'U/mL' },
      { id: 'chymo', name: 'CHYMOTRYPSIN', unit: 'U/mL' },
      { id: 'lipase', name: 'PANCREATIC LIPASE', unit: 'U/mL' },
      { id: 'colipase', name: 'COLIPASE', unit: 'U/mg' },
      { id: 'intamylase', name: 'INTESTINAL AMYLASE', unit: 'U/mL' },
    ];
    indiv.forEach(e => {
      iRows.push(
        [''],
        [e.name],
        ['Product', sv('int-' + e.id + '-product') || '—'],
        ['Lot No.', sv('int-' + e.id + '-lot') || '—'],
        ['Target', '', sv('int-' + e.id + '-target'), '', e.unit],
        ['Measured', '', sv('int-' + e.id + '-activity') || '—', '', 'U/mg'],
        ['Minimum weight', '', gcv('int-' + e.id + '-minwt-s'), gcv('int-' + e.id + '-minwt-stk'), 'mg'],
        ['Effective weighed', '', sv('int-' + e.id + '-eff') || '—', '', 'mg'],
        ['Dissolve in SIF', '', gcv('int-' + e.id + '-diss-s'), '', 'mL'],
      );
    });
  }

  iRows.push(
    [''],
    ['BILE SALTS'],
    ['Product', sv('int-bile-product') || '—'],
    ['Lot No.', sv('int-bile-lot') || '—'],
    ['Target concentration', '', sv('int-bile-conc-target'), '', 'mM'],
    ['Measured concentration', '', sv('int-bile-measured') || '—', '', 'mmol/g'],
    ['Minimum weight', '', gcv('int-bile-minwt-s'), gcv('int-bile-minwt-stk'), 'mg'],
    ['Effective weighed', '', sv('int-bile-eff') || '—', '', 'mg'],
    ['Dissolve in SIF', '', gcv('int-bile-diss-s'), '', 'mL'],
  );
  XLSX.utils.book_append_sheet(wb, mkSheet(iRows), 'Intestinal Phase');

  // ─────────────────────────────────────────────────
  // SHEET 5: Protocol Notes & Formulas
  // ─────────────────────────────────────────────────
  const notes = [
    ['PROTOCOL NOTES & REFERENCE'],
    [''],
    ['Reference', 'Minekus M. et al. (2014). A standardised static in vitro digestion method suitable for food – an international consensus. Food & Function, 5(6), 1113–1124.'],
    [''],
    ['STANDARD CONDITIONS'],
    ['Parameter', 'Oral', 'Gastric', 'Intestinal'],
    ['Dilution ratio', '1:1', '1:1', '1:1'],
    ['pH', '7.0', '3.0', '7.0'],
    ['Temperature (°C)', '37', '37', '37'],
    ['Duration (min)', '2', '120', '120'],
    ['Final [Ca²⁺] (mM)', '0.75', '0.075', '0.6'],
    [''],
    ['ENZYME TARGETS'],
    ['Enzyme', 'Activity in final digest', 'Unit'],
    ['Salivary α-amylase', '75', 'U/mL'],
    ['Pepsin', '2000', 'U/mL'],
    ['Gastric lipase (RGE)', '60', 'U/mL'],
    ['Pancreatin (trypsin basis)', '100', 'U/mL'],
    ['Trypsin', '100', 'U/mL'],
    ['Chymotrypsin', '25', 'U/mL'],
    ['Pancreatic lipase', '2000', 'U/mL'],
    ['Colipase', '2× lipase molar', ''],
    ['Intestinal amylase', '200', 'U/mL'],
    ['Bile salts', '10', 'mM'],
    [''],
    ['CALCULATION FORMULAS'],
    ['Enzyme min. weight (mg)', '= [Target (U/mL) × Total volume (mL)] / [Measured activity (U/mg) × Purity]'],
    ['Bile min. weight (mg)', '= [Target (mM) × Volume (mL) / 1000] / Measured (mmol/g) × 1000'],
    ['CaCl₂ volume (µL)', '= [Final [Ca²⁺] (mM) × Total volume (mL) / 300 mM] × 1000'],
    ['Dissolution volume (mL)', '= [Effective weight (mg) × Enzyme solution volume (mL)] / Min. weight (mg)'],
    ['Stock solutions', 'Prepared for n+1 samples to account for pipetting losses'],
    [''],
    ['Generated by INFOGEST 2.0 Calculator', new Date().toLocaleString('de-CH')],
  ];
  const wsNotes = XLSX.utils.aoa_to_sheet(notes);
  wsNotes['!cols'] = [{ wch: 35 }, { wch: 55 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Protocol Notes');

  // Generate filename
  const filename = `INFOGEST_${dt.replace(/\./g, '-')}_${op.replace(/\s/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
