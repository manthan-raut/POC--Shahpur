// js/export/exportExcel.js

window.exportExcel = function(data, title) {
  if (!data || data.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  
  const sheetData = data.map(d => ({
    "Property ID": d.propertyId,
    "Owner Name": d.ownerName,
    "Ward No": d.wardNo,
    "Assessed Amount (Rs)": d.assessedAmount,
    "Paid Amount (Rs)": d.paidAmount,
    "Pending Amount (Rs)": d.pendingAmount,
    "Status": d.status,
    "Last Payment Date": d.lastPaymentDate || "N/A"
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tax_Report");
  
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
};
