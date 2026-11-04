// js/export/exportCsv.js
// exportCSV(rows, title, columns) — RFC 4180 quoting, UTF-8 BOM so Excel shows Marathi correctly

console.log('[Shahapur GIS - Export] Loading exportCsv.js module...');

window.exportCSV = function(rows, title, columns) {
  if (!rows || rows.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  try {
    const quote = v => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    const lines = [
      columns.map(c => quote(c.label)).join(','),
      ...rows.map(r => columns.map(c => c.type ? Number(r[c.key] || 0) : quote(r[c.key])).join(','))
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^\w]+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Shahapur GIS - Export CSV] Failed to generate CSV export:', err);
    alert("An error occurred while generating the CSV file. Check console for details.");
  }
};
