// js/reports.js

function renderReports() {
  const mount = document.getElementById('reports-mount');

  const card = document.createElement('div');
  card.className = 'double-bezel-card';
  card.innerHTML = `
    <div class="card-inner" style="padding: 2rem;">
      <h3 class="mb-4">Generate Report</h3>
      
      <div class="input-group mb-4">
        <label>Select Report Type</label>
        <select id="report-type-select" style="width:100%; padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--color-border-light);">
          <option value="collection">Ward-wise Tax Collection</option>
          <option value="unpaid">Ward-wise Unpaid Tax Properties</option>
          <option value="defaulters">Defaulters List (All Wards)</option>
        </select>
      </div>

      <div id="report-filters" style="display:flex; gap:1rem; margin-bottom: 2rem;">
        <!-- Dynamic filters -->
      </div>
      
      <div style="display:flex; gap: 1rem; border-top: 1px solid var(--color-border-light); padding-top: 2rem;">
        <button id="btn-export-pdf" class="btn btn-primary"><i class="ph ph-file-pdf"></i> Export PDF</button>
        <button id="btn-export-excel" class="btn btn-secondary"><i class="ph ph-file-xls"></i> Export Excel</button>
        <button id="btn-export-csv" class="btn btn-secondary"><i class="ph ph-file-csv"></i> Export CSV</button>
      </div>
    </div>
  `;
  mount.appendChild(card);

  const typeSelect = document.getElementById('report-type-select');
  typeSelect.addEventListener('change', updateFiltersUI);

  // Attach export handlers
  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    if (window.exportPDF) window.exportPDF(getFilteredData(), typeSelect.options[typeSelect.selectedIndex].text);
  });
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    if (window.exportExcel) window.exportExcel(getFilteredData(), typeSelect.options[typeSelect.selectedIndex].text);
  });
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (window.exportCSV) window.exportCSV(getFilteredData(), typeSelect.options[typeSelect.selectedIndex].text);
  });

  updateFiltersUI();
}

function updateFiltersUI() {
  const type = document.getElementById('report-type-select').value;
  const filterContainer = document.getElementById('report-filters');

  let html = '';
  if (type === 'collection') {
    html = `
      <div class="input-group" style="flex:1">
        <label>Ward</label>
        <select id="rf-ward" style="width:100%; padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--color-border-light);">
          <option value="All">All Wards</option>
          <option value="1">Ward 1</option>
          <option value="2">Ward 2</option>
          <option value="3">Ward 3</option>
        </select>
      </div>
    `;
  } else if (type === 'unpaid') {
    html = `
      <div class="input-group" style="flex:1">
        <label>Ward</label>
        <select id="rf-ward" style="width:100%; padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--color-border-light);">
          <option value="All">All Wards</option>
          <option value="1">Ward 1</option>
          <option value="2">Ward 2</option>
        </select>
      </div>
      <div class="input-group" style="flex:1">
        <label>Minimum Pending (₹)</label>
        <input type="number" id="rf-min-pending" value="5000">
      </div>
    `;
  } else if (type === 'defaulters') {
    html = `
      <div class="input-group" style="flex:1">
        <label>Minimum Pending (₹)</label>
        <input type="number" id="rf-min-pending" value="10000">
      </div>
    `;
  }

  filterContainer.innerHTML = html;
}

function getFilteredData() {
  const type = document.getElementById('report-type-select').value;
  let data = window.TaxDataService.getAll();

  if (type === 'collection') {
    const ward = document.getElementById('rf-ward').value;
    if (ward !== 'All') data = data.filter(d => d.wardNo === ward);
  } else if (type === 'unpaid') {
    const ward = document.getElementById('rf-ward').value;
    const minPending = parseInt(document.getElementById('rf-min-pending').value) || 0;
    data = data.filter(d => d.status === 'Pending' && d.pendingAmount >= minPending);
    if (ward !== 'All') data = data.filter(d => d.wardNo === ward);
  } else if (type === 'defaulters') {
    const minPending = parseInt(document.getElementById('rf-min-pending').value) || 0;
    data = data.filter(d => d.status === 'Pending' && d.pendingAmount >= minPending);
    // Sort descending by pending amount
    data.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }

  return data;
}

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#/reports') {
    const mount = document.getElementById('reports-mount');
    if (mount && mount.innerHTML === '') renderReports();
  }
});
