// js/export/exportExcel.js
// exportExcel(rows, title, columns) — numbers stay numeric so Excel can sum them

console.log('[Shahapur GIS - Export] Loading exportExcel.js module...');

window.exportExcel = function(rows, title, columns) {
  if (!rows || rows.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert("SheetJS (XLSX) library is not loaded. Cannot export Excel.");
    return;
  }
  try {
    const sheetRows = rows.map(r => Object.fromEntries(columns.map(c => {
      const v = r[c.key];
      return [c.label, c.type ? Number(v || 0) : (v === null || v === undefined ? '' : v)];
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), 'Report');
    XLSX.writeFile(workbook, `${title.replace(/[^\w]+/g, '_')}.xlsx`);
  } catch (err) {
    console.error('[Shahapur GIS - Export Excel] Failed to generate Excel workbook:', err);
    alert("An error occurred while generating the Excel spreadsheet. Check console for details.");
  }
};
