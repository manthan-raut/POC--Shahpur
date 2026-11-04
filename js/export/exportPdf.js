// js/export/exportPdf.js
// exportPDF(rows, title, columns) — columns: [{ key, label, type? }] from js/reports.js

console.log('[Shahapur GIS - Export] Loading exportPdf.js module...');

window.exportPDF = function(rows, title, columns) {
  if (!rows || rows.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF library is not loaded. Cannot export PDF.");
    return;
  }
  try {
    const { jsPDF } = window.jspdf;
    // Landscape gives room for the wider unit-level reports
    const doc = new jsPDF({ orientation: columns.length > 8 ? 'landscape' : 'portrait' });
    if (typeof doc.autoTable !== 'function') {
      alert("jsPDF-AutoTable plugin is not loaded.");
      return;
    }
    doc.setFontSize(13);
    doc.text(`Shahapur Nagar Panchayat - ${title}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')} • ${rows.length} rows • Source: assessment register`, 14, 21);

    // jsPDF's built-in font has no Devanagari or ₹ glyphs: use "Rs." and skip Marathi-only columns
    const cols = columns.filter(c => !/Marathi/i.test(c.label));
    const cell = (r, c) => window.formatReportCell(r, c).replace('₹', 'Rs. ');
    doc.autoTable({
      startY: 26,
      head: [cols.map(c => c.label)],
      body: rows.map(r => cols.map(c => cell(r, c))),
      theme: 'striped',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [10, 66, 89] },
      columnStyles: Object.fromEntries(cols.map((c, i) => [i, c.type ? { halign: 'right' } : {}]))
    });
    doc.save(`${title.replace(/[^\w]+/g, '_')}.pdf`);
  } catch (err) {
    console.error('[Shahapur GIS - Export PDF] Failed to generate PDF document:', err);
    alert("An error occurred while generating the PDF. Check console for details.");
  }
};
