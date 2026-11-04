// js/export/exportPdf.js

window.exportPDF = function(data, title) {
  if (!data || data.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
  
  const tableData = data.map(d => [
    d.propertyId,
    d.ownerName,
    `Ward ${d.wardNo}`,
    `Rs. ${d.assessedAmount}`,
    `Rs. ${d.paidAmount}`,
    `Rs. ${d.pendingAmount}`,
    d.status
  ]);
  
  doc.autoTable({
    startY: 28,
    head: [['Prop ID', 'Owner', 'Ward', 'Assessed', 'Paid', 'Pending', 'Status']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [10, 66, 89] } // var(--color-primary)
  });
  
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
