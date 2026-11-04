// js/taxRecords.js

function renderTaxRecords() {
  const mount = document.getElementById('tax-records-mount');
  mount.innerHTML = '';
  
  // Phase 2 Upload UI
  const uploadUI = document.createElement('div');
  uploadUI.className = 'double-bezel-card mb-6';
  uploadUI.innerHTML = `
    <div class="card-inner" style="padding: 1.5rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap: 1rem;">
      <div>
        <div style="display:flex; align-items:center; gap:0.5rem;" class="mb-1">
          <h3 style="margin:0;">Update Tax Records</h3>
          <span class="status-badge paid" style="font-size:0.7rem;">Phase 2 Active</span>
        </div>
        <p class="text-muted" style="font-size:0.875rem; margin:0;">Upload tax collection spreadsheets (.xlsx / .csv) to sync property assessments.</p>
      </div>
      <div style="display:flex; gap: 0.75rem; align-items:center;">
        <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" style="display:none;">
        <button class="btn btn-secondary btn-sm" id="btn-download-sample">
          <i class="ph ph-download-simple"></i> Download Sample Excel
        </button>
        <button class="btn btn-primary btn-sm" id="btn-trigger-upload">
          <i class="ph ph-upload-simple"></i> Upload Excel Sheet
        </button>
      </div>
    </div>
  `;
  mount.appendChild(uploadUI);

  // Success Notification Banner Container
  const bannerContainer = document.createElement('div');
  bannerContainer.id = 'upload-status-banner';
  mount.appendChild(bannerContainer);
  
  // Data Table Container
  const tableCard = document.createElement('div');
  tableCard.className = 'double-bezel-card';
  tableCard.innerHTML = `
    <div class="card-inner" style="padding: 0;">
      <div style="padding: 1.5rem; border-bottom: 1px solid var(--color-border-light); display:flex; gap:1rem; align-items:center;">
        <input type="text" id="tr-search" placeholder="Search Owner, Property ID (#12)..." style="flex:1; padding: 0.5rem 0.75rem; border:1px solid var(--color-border-light); border-radius:var(--radius-sm);">
        <select id="tr-ward" style="padding: 0.5rem 0.75rem; border:1px solid var(--color-border-light); border-radius:var(--radius-sm);">
          <option value="All">All Wards</option>
          <option value="1">Ward 1</option>
          <option value="2">Ward 2</option>
          <option value="3">Ward 3</option>
          <option value="4">Ward 4</option>
          <option value="5">Ward 5</option>
          <option value="6">Ward 6</option>
          <option value="7">Ward 7</option>
          <option value="8">Ward 8</option>
          <option value="9">Ward 9</option>
          <option value="10">Ward 10</option>
        </select>
        <button id="btn-reset-data" class="btn btn-secondary btn-sm" title="Reset to default dataset">
          <i class="ph ph-arrows-counter-clockwise"></i> Reset
        </button>
      </div>
      <div style="overflow-x: auto;">
        <table id="tr-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border-light);">
              <th style="padding: 1rem 1.5rem; font-weight:600;">Prop ID</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Owner Name</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Ward</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Assessed Tax</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Paid Amount</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Pending Dues</th>
              <th style="padding: 1rem 1.5rem; font-weight:600;">Status</th>
            </tr>
          </thead>
          <tbody id="tr-tbody"></tbody>
        </table>
      </div>
    </div>
  `;
  mount.appendChild(tableCard);

  // Wire Upload Handlers
  const fileInput = document.getElementById('excel-file-input');
  document.getElementById('btn-trigger-upload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleExcelUpload);
  document.getElementById('btn-download-sample').addEventListener('click', generateSampleExcel);
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm("Reset tax dataset to default mock records?")) {
      window.TaxDataService.resetData();
      updateTable();
      showBanner("Dataset reset to default mock records.", "info");
    }
  });
  
  updateTable();
  
  document.getElementById('tr-search').addEventListener('input', updateTable);
  document.getElementById('tr-ward').addEventListener('change', updateTable);
}

function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonRows.length === 0) {
        showBanner("Uploaded Excel file is empty.", "error");
        return;
      }

      // Map rows
      const parsedRecords = jsonRows.map((row, idx) => {
        const propId = row['Property ID'] || row['propertyId'] || row['OBJECTID_1'] || row['PropertyID'] || (idx + 1);
        const ownerName = row['Owner Name'] || row['ownerName'] || row['Owner'] || "Property Owner";
        const wardNo = row['Ward No'] || row['wardNo'] || row['Ward'] || "1";
        const assessed = parseFloat(row['Assessed Amount'] || row['assessedAmount'] || row['Assessed'] || 5000);
        const paid = parseFloat(row['Paid Amount'] || row['paidAmount'] || row['Paid'] || 0);
        const pending = parseFloat(row['Pending Amount'] || row['pendingAmount'] || (assessed - paid));
        const status = row['Status'] || row['status'] || (pending <= 0 ? "Paid" : "Pending");
        const lastPaymentDate = row['Last Payment Date'] || row['lastPaymentDate'] || new Date().toISOString().split('T')[0];

        return {
          propertyId: Number(propId),
          ownerName: String(ownerName),
          wardNo: String(wardNo),
          assessedAmount: assessed,
          paidAmount: paid,
          pendingAmount: pending,
          status: String(status),
          lastPaymentDate: String(lastPaymentDate)
        };
      });

      const res = window.TaxDataService.bulkUpdateRecords(parsedRecords);
      updateTable();
      showBanner(`Successfully synced ${jsonRows.length} tax records! (${res.updatedCount} updated, ${res.addedCount} new added).`, "success");
    } catch(err) {
      console.error("Excel parse error", err);
      showBanner("Error parsing Excel file. Please ensure valid columns (Property ID, Owner Name, Ward No, Assessed Amount, Paid Amount, Pending Amount).", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function generateSampleExcel() {
  const sampleData = [
    { "Property ID": 1, "Owner Name": "Ramesh Patil", "Ward No": "1", "Assessed Amount": 7500, "Paid Amount": 7500, "Pending Amount": 0, "Status": "Paid", "Last Payment Date": "2026-03-15" },
    { "Property ID": 2, "Owner Name": "Suresh Deshmukh", "Ward No": "2", "Assessed Amount": 9200, "Paid Amount": 4600, "Pending Amount": 4600, "Status": "Pending", "Last Payment Date": "2025-11-20" },
    { "Property ID": 3, "Owner Name": "Anjali Joshi", "Ward No": "3", "Assessed Amount": 12000, "Paid Amount": 12000, "Pending Amount": 0, "Status": "Paid", "Last Payment Date": "2026-01-10" },
    { "Property ID": 4, "Owner Name": "Vikram Pawar", "Ward No": "4", "Assessed Amount": 8500, "Paid Amount": 0, "Pending Amount": 8500, "Status": "Pending", "Last Payment Date": "" }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tax_Collection_Data");
  XLSX.writeFile(wb, "Sample_Property_Tax_Collection.xlsx");
}

function showBanner(msg, type) {
  const banner = document.getElementById('upload-status-banner');
  if (!banner) return;
  const bg = type === 'success' ? 'rgba(16, 185, 129, 0.1)' : (type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 180, 216, 0.1)');
  const color = type === 'success' ? 'var(--color-success)' : (type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)');

  banner.innerHTML = `
    <div style="background:${bg}; color:${color}; padding:0.75rem 1.25rem; border-radius:var(--radius-md); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.875rem; font-weight:500;">
      <span>${msg}</span>
      <button class="btn-icon" onclick="this.parentElement.remove()"><i class="ph ph-x"></i></button>
    </div>
  `;
}

function updateTable() {
  const search = document.getElementById('tr-search').value.toLowerCase();
  const ward = document.getElementById('tr-ward').value;
  const tbody = document.getElementById('tr-tbody');
  
  let data = window.TaxDataService.getAll();
  
  if (ward !== 'All') {
    data = data.filter(d => d.wardNo === ward.toString());
  }
  if (search) {
    data = data.filter(d => 
      d.ownerName.toLowerCase().includes(search) || 
      d.propertyId.toString().includes(search)
    );
  }
  
  data = data.slice(0, 100);
  
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding:2rem; text-align:center;" class="text-muted">No tax records found matching current filters.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr style="border-bottom: 1px solid var(--color-border-light);">
      <td style="padding: 1rem 1.5rem; font-weight:600;">#${row.propertyId}</td>
      <td style="padding: 1rem 1.5rem;">${row.ownerName}</td>
      <td style="padding: 1rem 1.5rem;">Ward ${row.wardNo}</td>
      <td style="padding: 1rem 1.5rem;">₹${Number(row.assessedAmount || 0).toLocaleString()}</td>
      <td style="padding: 1rem 1.5rem;">₹${Number(row.paidAmount || 0).toLocaleString()}</td>
      <td style="padding: 1rem 1.5rem; color:${Number(row.pendingAmount) > 0 ? 'var(--color-danger)' : 'inherit'}; font-weight:${Number(row.pendingAmount) > 0 ? '600' : 'normal'};">₹${Number(row.pendingAmount || 0).toLocaleString()}</td>
      <td style="padding: 1rem 1.5rem;">
        <span class="status-badge ${row.status === 'Paid' ? 'paid' : 'pending'}">${row.status}</span>
      </td>
    </tr>
  `).join('');
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#/tax-records') {
    const mount = document.getElementById('tax-records-mount');
    if (mount) renderTaxRecords();
  }
});

