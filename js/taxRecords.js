// js/taxRecords.js

console.log('[Shahapur GIS - TaxRecords] Loading taxRecords.js module...');

let currentTablePage = 1;
let currentRowsPerPage = 25;
let currentDetailProperty = null;

function renderTaxRecords() {
  console.info('[Shahapur GIS - TaxRecords] renderTaxRecords() called.');
  const mount = document.getElementById('tax-records-mount');
  if (!mount) {
    console.warn('[Shahapur GIS - TaxRecords] #tax-records-mount container not found in DOM.');
    return;
  }
  mount.innerHTML = '';
  
  // Header / Sync Card
  const uploadUI = document.createElement('div');
  uploadUI.className = 'double-bezel-card mb-6';
  uploadUI.innerHTML = `
    <div class="card-inner" style="padding: 1.5rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap: 1rem;">
      <div>
        <div style="display:flex; align-items:center; gap:0.5rem;" class="mb-1">
          <h3 style="margin:0;">Shahapur Property Tax Records</h3>
          <span class="status-badge paid" style="font-size:0.7rem;">Excel & Photo Synced</span>
        </div>
        <p class="text-muted" style="font-size:0.875rem; margin:0;">
          ${(window.SHAHAPUR_SUMMARY_STATS || {}).totalProperties?.toLocaleString('en-IN') || 0} register units across Wards 1–5 •
          ${(window.SHAHAPUR_SUMMARY_STATS || {}).unitsWithPhoto?.toLocaleString('en-IN') || 0} with survey photos •
          ${(window.SHAHAPUR_SUMMARY_STATS || {}).unitsWithPlan?.toLocaleString('en-IN') || 0} with plans.
        </p>
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
      <!-- Filter Bar -->
      <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border-light); display:flex; flex-wrap:wrap; gap:1rem; align-items:center; justify-content:space-between;">
        <div style="display:flex; flex:1; min-width:280px; gap:0.75rem; align-items:center;">
          <div style="position:relative; flex:1;">
            <i class="ph ph-magnifying-glass" style="position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:1.1rem;"></i>
            <input type="text" id="tr-search" placeholder="Search Owner Name, Marathi Name, Prop ID (#12), Phone..." style="width:100%; padding:0.6rem 0.85rem 0.6rem 2.4rem; border:1px solid var(--color-border-light); border-radius:var(--radius-sm); font-size:0.875rem;">
          </div>
          <select id="tr-ward" style="padding: 0.6rem 0.85rem; border:1px solid var(--color-border-light); border-radius:var(--radius-sm); font-size:0.875rem; font-weight:600;">
            <option value="All">All Wards (1–5)</option>
            <option value="1">Ward 1 (${(((window.SHAHAPUR_SUMMARY_STATS || {}).wardTotals || {})["1"] || {}).totalProperties || 0} units)</option>
            <option value="2">Ward 2 (${(((window.SHAHAPUR_SUMMARY_STATS || {}).wardTotals || {})["2"] || {}).totalProperties || 0} units)</option>
            <option value="3">Ward 3 (${(((window.SHAHAPUR_SUMMARY_STATS || {}).wardTotals || {})["3"] || {}).totalProperties || 0} units)</option>
            <option value="4">Ward 4 (${(((window.SHAHAPUR_SUMMARY_STATS || {}).wardTotals || {})["4"] || {}).totalProperties || 0} units)</option>
            <option value="5">Ward 5 (${(((window.SHAHAPUR_SUMMARY_STATS || {}).wardTotals || {})["5"] || {}).totalProperties || 0} units)</option>
          </select>
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center;">
          <select id="tr-page-size" style="padding: 0.55rem 0.75rem; border:1px solid var(--color-border-light); border-radius:var(--radius-sm); font-size:0.825rem;">
            <option value="25" selected>25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          <button id="btn-reset-data" class="btn btn-secondary btn-sm" title="Reset to default dataset">
            <i class="ph ph-arrows-counter-clockwise"></i> Reset
          </button>
        </div>
      </div>

      <!-- Table View -->
      <div style="overflow-x: auto;">
        <table id="tr-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
          <thead>
            <tr style="background: rgba(10, 66, 89, 0.04); border-bottom: 1px solid var(--color-border-light);">
              <th style="padding: 0.85rem 1rem; font-weight:700; width:65px; text-align:center;">Photo</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; width:130px;">Prop ID</th>
              <th style="padding: 0.85rem 1rem; font-weight:700;">Owner Details</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; width:90px;">Ward</th>
              <th style="padding: 0.85rem 1rem; font-weight:700;">Location / Building</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; text-align:right;">Tax Demand</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; text-align:right;">Rateable Value (RV)</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; text-align:right;">Property Tax</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; text-align:center; width:95px;">Status</th>
              <th style="padding: 0.85rem 1rem; font-weight:700; text-align:center; width:80px;">Action</th>
            </tr>
          </thead>
          <tbody id="tr-tbody"></tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div id="tr-pagination-container" class="tr-pagination-bar"></div>
    </div>
  `;
  mount.appendChild(tableCard);

  // Property Detail Modal Mount Container
  let detailModal = document.getElementById('tr-detail-modal');
  if (!detailModal) {
    detailModal = document.createElement('div');
    detailModal.id = 'tr-detail-modal';
    detailModal.className = 'photo-lightbox-modal';
    document.body.appendChild(detailModal);
  }

  // Wire Upload Handlers
  const fileInput = document.getElementById('excel-file-input');
  document.getElementById('btn-trigger-upload').addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', handleExcelUpload);
  document.getElementById('btn-download-sample').addEventListener('click', generateSampleExcel);
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm("Reset tax dataset to original Shahapur Excel records?")) {
      window.TaxDataService.resetData();
      currentTablePage = 1;
      updateTable();
      showBanner("Dataset restored from Shahapur DATA_31-10-26.xlsx", "info");
    }
  });

  // Filter Event Listeners
  document.getElementById('tr-search').addEventListener('input', () => {
    currentTablePage = 1;
    updateTable();
  });
  document.getElementById('tr-ward').addEventListener('change', () => {
    currentTablePage = 1;
    updateTable();
  });
  document.getElementById('tr-page-size').addEventListener('change', (e) => {
    currentRowsPerPage = parseInt(e.target.value) || 25;
    currentTablePage = 1;
    updateTable();
  });
  
  updateTable();
}

function updateTable() {
  const searchInput = document.getElementById('tr-search');
  const wardSelect = document.getElementById('tr-ward');
  const tbody = document.getElementById('tr-tbody');
  const paginationContainer = document.getElementById('tr-pagination-container');
  
  if (!tbody) return;

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const ward = wardSelect ? wardSelect.value : 'All';
  
  let data = window.TaxDataService.getAll();
  
  // Filter by Ward
  if (ward !== 'All') {
    data = data.filter(d => String(d.wardNo) === ward.toString());
  }

  // Search by query
  if (search) {
    data = data.filter(d => 
      String(d.propertyId) === search ||
      String(d.propertyNo) === search ||
      (d.propertyNoOld && d.propertyNoOld.toLowerCase().includes(search)) ||
      (d.shopNo && String(d.shopNo).toLowerCase().includes(search)) ||
      (d.propIdentifier && d.propIdentifier.toLowerCase().includes(search)) ||
      (d.ownerName && d.ownerName.toLowerCase().includes(search)) ||
      (d.ownerNameMarathi && d.ownerNameMarathi.includes(search)) ||
      (d.shopBuildingName && d.shopBuildingName.toLowerCase().includes(search)) ||
      (d.citySurveyGatNo && d.citySurveyGatNo.toLowerCase().includes(search)) ||
      (d.ownerAddress && d.ownerAddress.toLowerCase().includes(search)) ||
      (d.contactNo && d.contactNo.includes(search))
    );
  }
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / currentRowsPerPage) || 1;
  if (currentTablePage > totalPages) currentTablePage = totalPages;
  if (currentTablePage < 1) currentTablePage = 1;

  const startIndex = (currentTablePage - 1) * currentRowsPerPage;
  const paginatedRows = data.slice(startIndex, startIndex + currentRowsPerPage);
  
  if (paginatedRows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="padding:3rem 1.5rem; text-align:center;" class="text-muted">
          <i class="ph ph-magnifying-glass" style="font-size:2rem; color:#94a3b8; display:block; margin-bottom:0.5rem;"></i>
          No Shahapur property tax records found matching current query.
        </td>
      </tr>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  tbody.innerHTML = paginatedRows.map(row => {
    const hasPhoto = row.photos && row.photos.length > 0;
    const photoFile = hasPhoto ? row.photos[0] : null;
    const photoUrl = photoFile ? encodeURI(`Shahapur photos/Shahapur photos/${photoFile}`) : '';
    const safeCaption = (row.propIdentifier || ('Prop #' + row.propertyNo)) + ' - ' + (row.ownerName || '');

    const photoCellHtml = hasPhoto ? `
      <img src="${photoUrl}" class="prop-table-thumb" alt="Photo" loading="lazy"
        onclick="window.openUnitMedia(${Number(row.propertyId)}, 'photos', 0)"
        title="Click to view full photo (${row.photos.length} available)">
    ` : `
      <div class="prop-table-thumb-placeholder" title="No survey photo attached">
        <i class="ph ph-buildings"></i>
      </div>
    `;

    const statusClass = row.status === 'Assessed' || row.status === 'Paid' ? 'paid' : 'pending';
    const locationStr = row.shopBuildingName || row.ownerAddress || row.ownerAddressMarathi || '';
    const propIdStr = row.propIdentifier || `W${row.wardNo}-#${row.propertyNo}${row.partitionNo ? '/' + row.partitionNo : ''}`;

    return `
      <tr style="border-bottom: 1px solid var(--color-border-light); transition: background 120ms ease;" onmouseover="this.style.background='rgba(0,0,0,0.015)'" onmouseout="this.style.background='transparent'">
        <td class="table-photo-cell">${photoCellHtml}</td>
        <td style="padding: 0.85rem 1rem; font-weight:700; color:var(--color-primary); font-variant-numeric:tabular-nums;">
          ${propIdStr}
          ${row.propertyNoOld ? `<div style="font-size:0.75rem; color:#0369a1; font-weight:600; margin-top:0.15rem;"><i class="ph ph-hash"></i> Old: ${row.propertyNoOld}</div>` : ''}
          ${row.shopNo ? `<div style="font-size:0.7rem; color:#64748b; font-weight:500;">Flat/Shop #${row.shopNo}${row.wingNo ? ' (Wing ' + row.wingNo + ')' : ''}</div>` : ''}
          <div style="font-size:0.7rem; color:#94a3b8; font-weight:500;">ID #${row.propertyId}</div>
        </td>
        <td style="padding: 0.85rem 1rem;">
          <div class="prop-owner-wrap">
            <span class="prop-owner-en">${row.ownerName || '<span class="data-na">Owner not recorded</span>'}</span>
            ${row.ownerNameMarathi ? `<span class="prop-owner-mr">${row.ownerNameMarathi}</span>` : ''}
          </div>
        </td>
        <td style="padding: 0.85rem 1rem; font-weight:600; color:#334155;">Ward ${row.wardNo}</td>
        <td style="padding: 0.85rem 1rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#475569;" title="${locationStr}">
          ${locationStr || '<span class="data-na">Not recorded</span>'}
        </td>
        <td style="padding: 0.85rem 1rem; text-align:right; font-weight:700; color:var(--color-primary);">₹${Number(row.assessedAmount || 0).toLocaleString()}</td>
        <td style="padding: 0.85rem 1rem; text-align:right; color:#0284c7; font-weight:600;">₹${Number(row.rvOld || 0).toLocaleString()}</td>
        <td style="padding: 0.85rem 1rem; text-align:right; color:#059669; font-weight:600;">₹${Number(row.propertyTaxOld || 0).toLocaleString()}</td>
        <td style="padding: 0.85rem 1rem; text-align:center;">
          <span class="status-badge ${statusClass}">${row.status}</span>
        </td>
        <td style="padding: 0.85rem 1rem; text-align:center;">
          <button class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="viewPropertyAssessmentModal(${row.propertyId})" title="View Complete Assessment Details">
            <i class="ph ph-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Render Pagination Bar
  if (paginationContainer) {
    const startRange = startIndex + 1;
    const endRange = Math.min(startIndex + currentRowsPerPage, totalItems);

    paginationContainer.innerHTML = `
      <div class="tr-pagination-info">
        Showing <strong>${startRange.toLocaleString()}</strong>–<strong>${endRange.toLocaleString()}</strong> of <strong>${totalItems.toLocaleString()}</strong> properties
      </div>
      <div class="tr-pagination-controls">
        <button class="tr-page-btn" ${currentTablePage === 1 ? 'disabled' : ''} onclick="changeTaxTablePage(1)" title="First Page">
          <i class="ph ph-caret-double-left"></i>
        </button>
        <button class="tr-page-btn" ${currentTablePage === 1 ? 'disabled' : ''} onclick="changeTaxTablePage(${currentTablePage - 1})" title="Previous Page">
          <i class="ph ph-caret-left"></i> Prev
        </button>
        <span style="font-size:0.825rem; font-weight:600; padding:0 0.5rem; color:#475569;">
          Page ${currentTablePage} of ${totalPages}
        </span>
        <button class="tr-page-btn" ${currentTablePage === totalPages ? 'disabled' : ''} onclick="changeTaxTablePage(${currentTablePage + 1})" title="Next Page">
          Next <i class="ph ph-caret-right"></i>
        </button>
        <button class="tr-page-btn" ${currentTablePage === totalPages ? 'disabled' : ''} onclick="changeTaxTablePage(${totalPages})" title="Last Page">
          <i class="ph ph-caret-double-right"></i>
        </button>
      </div>
    `;
  }
}

window.changeTaxTablePage = function(page) {
  currentTablePage = page;
  updateTable();
  const table = document.getElementById('tr-table');
  if (table) table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.viewPropertyAssessmentModal = function(propId) {
  const rec = window.TaxDataService.getByPropertyId(propId);
  if (!rec) return;

  // Create the modal on demand so "Full details" also works from the map panel
  let modal = document.getElementById('tr-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tr-detail-modal';
    modal.className = 'photo-lightbox-modal';
    document.body.appendChild(modal);
  }

  const hasPhotos = rec.photos && rec.photos.length > 0;
  const mainPhoto = hasPhotos ? rec.photos[0] : null;
  const mainPhotoUrl = mainPhoto ? encodeURI(`Shahapur photos/Shahapur photos/${mainPhoto}`) : '';

  const hasPlan = Boolean(rec.plan);
  const planUrl = hasPlan ? encodeURI(`PLANS/PLANS_PNG/${rec.plan}`) : '';

  function fmtModalVal(v, suffix = '') {
    if (v === null || v === undefined || v === '' || String(v).trim() === '' || 
        String(v).toLowerCase() === 'none' || String(v).toLowerCase() === 'null' || 
        String(v).toLowerCase() === 'n/a' || String(v) === '0' || Number(v) === 0) {
      return '<span class="data-na">Information Not Available</span>';
    }
    return `<span>${v}${suffix ? ' ' + suffix : ''}</span>`;
  }

  modal.innerHTML = `
    <div class="photo-lightbox-dialog" style="max-width: 780px;">
      <div class="photo-lightbox-header">
        <div class="photo-lightbox-title">
          <i class="ph ph-receipt"></i> Assessment Record: ${rec.propIdentifier || ('Property #' + rec.propertyNo)}
        </div>
        <button class="btn-icon" onclick="document.getElementById('tr-detail-modal').classList.remove('active')"><i class="ph ph-x"></i></button>
      </div>

      <div style="padding: 1.5rem; max-height: calc(85vh - 120px); overflow-y: auto;">
        <!-- Side-by-Side Photographic & Floor Plan Preview -->
        ${(hasPhotos || hasPlan) ? `
          <div style="display:grid; grid-template-columns: ${hasPhotos && hasPlan ? 'repeat(2, 1fr)' : '1fr'}; gap:0.75rem; margin-bottom:1.25rem;">
            ${hasPhotos ? `
              <div style="position:relative; border-radius:8px; overflow:hidden; background:#0f172a; height:200px; text-align:center;">
                <img src="${mainPhotoUrl}" style="width:100%; height:100%; object-fit:contain; cursor:pointer;" onclick="window.openUnitMedia(${Number(rec.propertyId)}, 'photos', ${0})" title="Click for high-resolution survey photo">
                <span class="prop-panel-photo-badge"><i class="ph ph-camera"></i> ${rec.photos.length} Survey Photo${rec.photos.length > 1 ? 's' : ''}</span>
              </div>
            ` : ''}

            ${hasPlan ? `
              <div style="position:relative; border-radius:8px; overflow:hidden; background:#ffffff; border:1px solid #cbd5e1; height:200px; text-align:center;">
                <img src="${planUrl}" style="width:100%; height:100%; object-fit:contain; cursor:pointer;" onclick="window.openUnitMedia(${Number(rec.propertyId)}, 'plans', ${0})" title="Click for high-resolution architectural plan">
                <span class="prop-panel-photo-badge" style="background:rgba(2,132,199,0.9);"><i class="ph ph-blueprint"></i> Floor Plan</span>
              </div>
            ` : ''}
          </div>
          ${rec.photos && rec.photos.length > 1 ? `
            <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem; overflow-x:auto;">
              ${rec.photos.map((p, i) => `
                <img src="${encodeURI('Shahapur photos/Shahapur photos/' + p)}" style="width:55px; height:55px; border-radius:4px; object-fit:cover; cursor:pointer; border:1px solid #cbd5e1;" onclick="window.openUnitMedia(${Number(rec.propertyId)}, 'photos', ${i})" title="${p}">
              `).join('')}
            </div>
          ` : ''}
        ` : ''}

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.25rem;">
          <div class="double-bezel-card" style="padding: 1rem;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700; text-transform:uppercase;">Owner Name (English & Marathi)</div>
            <div style="font-size:1.02rem; font-weight:700; color:#0f172a; margin-top:0.25rem;">${fmtModalVal(rec.ownerName)}</div>
            ${rec.ownerNameMarathi ? `<div style="font-size:0.875rem; color:#475569; margin-top:0.2rem; font-weight:600;">${rec.ownerNameMarathi}</div>` : ''}
          </div>
          <div class="double-bezel-card" style="padding: 1rem;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700; text-transform:uppercase;">Ward & Property Identifiers</div>
            <div style="font-size:1.02rem; font-weight:700; color:var(--color-primary); margin-top:0.25rem;">
              Ward ${rec.wardNo} — Prop #${rec.propertyNo}${rec.partitionNo ? ' (Unit ' + rec.partitionNo + ')' : ''}
            </div>
            ${rec.propertyNoOld ? `
              <div style="font-size:0.8rem; color:#0369a1; font-weight:700; margin-top:0.2rem;">
                <i class="ph ph-hash"></i> Old Property No: ${rec.propertyNoOld}
              </div>
            ` : ''}
            <div style="font-size:0.72rem; color:#64748b; margin-top:0.15rem;">Record Assessment ID: #${rec.propertyId}</div>
          </div>
        </div>

        <div style="margin-bottom: 1.25rem; text-align:center;">
          <div style="background:rgba(10,66,89,0.05); padding:0.85rem; border-radius:8px; border:1px solid rgba(10,66,89,0.1);">
            <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase;">PROPERTY TAX</div>
            <div style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-top:0.2rem;">₹${Number(rec.assessedAmount || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; font-size:0.85rem;">
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.6rem 1rem;">
            <div><strong style="color:#64748b;">Building / Society:</strong> ${fmtModalVal(rec.shopBuildingName)}</div>
            <div><strong style="color:#64748b;">Flat / Shop No:</strong> ${rec.shopNo ? ((rec.wingNo ? 'Wing ' + rec.wingNo + ' • ' : '') + 'Flat/Shop #' + rec.shopNo) : fmtModalVal('')}</div>
            <div><strong style="color:#64748b;">Old Property No:</strong> ${fmtModalVal(rec.propertyNoOld)}</div>
            <div><strong style="color:#64748b;">City Survey / Gat No:</strong> ${fmtModalVal(rec.citySurveyGatNo)}</div>
            <div><strong style="color:#64748b;">Description / Usage:</strong> ${fmtModalVal(rec.description)}</div>
            <div><strong style="color:#64748b;">Buildup Area:</strong> ${rec.buildupAreaSqMtr ? `${rec.buildupAreaSqMtr} sq.m (${rec.buildupAreaSqFt || (rec.buildupAreaSqMtr * 10.7639).toFixed(1)} sq.ft)` : fmtModalVal('')}</div>
            <div><strong style="color:#64748b;">Contact Number:</strong> ${rec.contactNo ? '+91 ' + rec.contactNo : fmtModalVal('')}</div>
            <div><strong style="color:#64748b;">Last Payment Date:</strong> ${fmtModalVal(rec.lastPaymentDate)}</div>
          </div>
          <div style="margin-top:0.85rem; padding-top:0.85rem; border-top:1px solid #e2e8f0;">
            <strong style="color:#64748b; display:block; margin-bottom:0.4rem;">Utilities & Infrastructure Amenities:</strong>
            <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
              <span class="prop-badge-pill" style="background:${rec.waterConnection === 'Yes' ? 'rgba(16,185,129,0.1)' : '#f1f5f9'}; color:${rec.waterConnection === 'Yes' ? '#059669' : '#94a3b8'};">
                <i class="ph ph-drop"></i> Water Connection: ${rec.waterConnection || 'No'}
              </span>
              <span class="prop-badge-pill" style="background:${rec.borewell === 'Yes' ? 'rgba(16,185,129,0.1)' : '#f1f5f9'}; color:${rec.borewell === 'Yes' ? '#059669' : '#94a3b8'};">
                <i class="ph ph-waves"></i> Borewell: ${rec.borewell || 'No'}
              </span>
              <span class="prop-badge-pill" style="background:${rec.solar === 'Yes' ? 'rgba(245,158,11,0.1)' : '#f1f5f9'}; color:${rec.solar === 'Yes' ? '#d97706' : '#94a3b8'};">
                <i class="ph ph-sun"></i> Solar Panel: ${rec.solar || 'No'}
              </span>
              <span class="prop-badge-pill" style="background:${rec.rainwaterHarvesting === 'Yes' ? 'rgba(16,185,129,0.1)' : '#f1f5f9'}; color:${rec.rainwaterHarvesting === 'Yes' ? '#059669' : '#94a3b8'};">
                <i class="ph ph-cloud-rain"></i> Rainwater Harvesting: ${rec.rainwaterHarvesting || 'No'}
              </span>
              <span class="prop-badge-pill" style="background:${rec.lift === 'Yes' ? 'rgba(16,185,129,0.1)' : '#f1f5f9'}; color:${rec.lift === 'Yes' ? '#059669' : '#94a3b8'};">
                <i class="ph ph-arrows-down-up"></i> Lift: ${rec.lift || 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="photo-lightbox-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <button class="btn btn-primary btn-sm" onclick="window.printPropertyCard('${rec.propertyId}', '${rec.wardNo}')">
            <i class="ph ph-printer"></i> Print Assessment Card
          </button>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('tr-detail-modal').classList.remove('active')">Close</button>
          ${hasPhotos ? `<button class="btn btn-secondary btn-sm" onclick="window.openUnitMedia(${Number(rec.propertyId)}, 'photos', ${0})"><i class="ph ph-arrows-out"></i> Full Photo</button>` : ''}
          ${hasPlan ? `<button class="btn btn-secondary btn-sm" onclick="window.openUnitMedia(${Number(rec.propertyId)}, 'plans', ${0})"><i class="ph ph-blueprint"></i> Full Plan</button>` : ''}
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  modal.onclick = (e) => {
    if (e.target.id === 'tr-detail-modal') modal.classList.remove('active');
  };
};

function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      if (typeof XLSX === 'undefined') {
        throw new Error('SheetJS (XLSX) library is not loaded on window.');
      }
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonRows.length === 0) {
        showBanner("Uploaded Excel file is empty.", "error");
        return;
      }

      // Only columns present in the uploaded sheet are applied, so a payments-only
      // sheet never overwrites real register values with defaults.
      const pick = (row, ...keys) => { for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]; return undefined; };
      const parsedRecords = jsonRows.map(row => {
        const rec = { propertyId: Number(pick(row, 'Property ID', 'propertyId', 'ownerID')) };
        const fields = {
          ownerName: pick(row, 'Owner Name', 'ownerName'),
          wardNo: pick(row, 'Ward No', 'wardNo'),
          assessedAmount: pick(row, 'Assessed Amount', 'assessedAmount'),
          paidAmount: pick(row, 'Paid Amount', 'paidAmount'),
          pendingAmount: pick(row, 'Pending Amount', 'pendingAmount'),
          status: pick(row, 'Status', 'status'),
          lastPaymentDate: pick(row, 'Last Payment Date', 'lastPaymentDate')
        };
        Object.entries(fields).forEach(([k, v]) => {
          if (v === undefined) return;
          rec[k] = /Amount$/.test(k) ? Number(v) || 0 : String(v);
        });
        if (rec.paidAmount !== undefined && rec.pendingAmount === undefined && rec.assessedAmount !== undefined) {
          rec.pendingAmount = Math.max(0, rec.assessedAmount - rec.paidAmount);
        }
        return rec;
      }).filter(r => Number.isFinite(r.propertyId) && r.propertyId > 0);

      const res = window.TaxDataService.bulkUpdateRecords(parsedRecords);
      currentTablePage = 1;
      updateTable();
      const successMsg = `Successfully synced ${jsonRows.length} tax records! (${res.updatedCount} updated, ${res.addedCount} new added).`;
      showBanner(successMsg, "success");
    } catch(err) {
      console.error("[Shahapur GIS - TaxRecords] Excel file parsing error:", err);
      showBanner("Error parsing Excel file. Please ensure valid format.", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}

function generateSampleExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) library is not loaded on window.');
    }
    // Template built from the first real register rows; payment columns are left for the user
    const sampleData = window.TaxDataService.getAll().slice(0, 4).map(r => ({
      "Property ID": r.propertyId, "Owner Name": r.ownerName, "Ward No": r.wardNo,
      "Assessed Amount": r.assessedAmount, "Paid Amount": "", "Pending Amount": "", "Status": "", "Last Payment Date": ""
    }));
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample_Tax_Data");
    XLSX.writeFile(wb, "Sample_Shahapur_Tax_Data.xlsx");
  } catch(e) {
    console.error('[Shahapur GIS - TaxRecords] Sample Excel generation failed:', e);
  }
}

function showBanner(msg, type = "success") {
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

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#/tax-records') {
    const mount = document.getElementById('tax-records-mount');
    if (mount) renderTaxRecords();
  }
});
