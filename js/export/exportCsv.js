// js/export/exportCsv.js

window.exportCSV = function(data, title) {
  if (!data || data.length === 0) {
    alert("No data available to export for current filters.");
    return;
  }
  
  const headers = ["Property ID", "Owner Name", "Ward No", "Assessed Amount", "Paid Amount", "Pending Amount", "Status", "Last Payment Date"];
  
  const rows = data.map(d => [
    d.propertyId,
    `"${d.ownerName}"`,
    d.wardNo,
    d.assessedAmount,
    d.paidAmount,
    d.pendingAmount,
    d.status,
    d.lastPaymentDate || "N/A"
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${title.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
