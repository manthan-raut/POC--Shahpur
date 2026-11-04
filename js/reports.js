// js/reports.js
//
// Reports built only from the real register (data/taxRecordsData.js) and the
// footprint / photo / plan links created by scripts/build_data.py.
// Each report = filters + rows + columns. The same rows feed the on-screen
// preview and the PDF / Excel / CSV exports, so what you see is what you export.

console.log('[Shahapur GIS - Reports] Loading reports.js module...');

const REPORT_WARDS = ['1', '2', '3', '4', '5'];
const repEsc = v => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const repMoney = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const repPct = (a, b) => (b ? (a / b * 100) : 0).toFixed(1) + '%';

// Columns shared by the unit-level reports
const UNIT_COLUMNS = [
  { key: 'wardNo', label: 'Ward' },
  { key: 'propertyNo', label: 'Prop No' },
  { key: 'partitionNo', label: 'Partition' },
  { key: 'propertyNoOld', label: 'Old Prop No' },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'ownerNameMarathi', label: 'Owner (Marathi)' },
  { key: 'description', label: 'Usage' },
  { key: 'buildupAreaSqMtr', label: 'Built-up (sq.m)', type: 'number' },
  { key: 'rvOld', label: 'Rateable Value', type: 'money' },
  { key: 'propertyTaxOld', label: 'Property Tax (Old)', type: 'money' },
  { key: 'assessedAmount', label: 'Tax Demand', type: 'money' },
  { key: 'status', label: 'Status' }
];

const unitWithLinks = u => ({
  ...u,
  photoCount: (u.photos || []).length,
  planCount: (u.plans || (u.plan ? [u.plan] : [])).length,
  onMap: (u.buildingIds || []).length ? 'Yes' : 'No'
});

const REPORTS = {
  ward_summary: {
    label: 'Ward-wise Assessment Summary',
    filters: [],
    columns: [
      { key: 'ward', label: 'Ward' },
      { key: 'properties', label: 'Properties', type: 'number' },
      { key: 'units', label: 'Units', type: 'number' },
      { key: 'assessed', label: 'Assessed', type: 'number' },
      { key: 'unassessed', label: 'Unassessed', type: 'number' },
      { key: 'demand', label: 'Tax Demand', type: 'money' },
      { key: 'rv', label: 'Rateable Value', type: 'money' },
      { key: 'photoPct', label: 'With Photo' },
      { key: 'planPct', label: 'With Plan' },
      { key: 'mapPct', label: 'On Map' }
    ],
    rows: all => {
      const summarise = (label, units) => {
        const n = units.length;
        const count = fn => units.filter(fn).length;
        return {
          ward: label,
          properties: new Set(units.map(u => u.wardNo + '-' + u.propertyNo)).size,
          units: n,
          assessed: count(u => u.status === 'Assessed'),
          unassessed: count(u => u.status !== 'Assessed'),
          demand: units.reduce((s, u) => s + Number(u.assessedAmount || 0), 0),
          rv: units.reduce((s, u) => s + Number(u.rvOld || 0), 0),
          photoPct: repPct(count(u => (u.photos || []).length), n),
          planPct: repPct(count(u => (u.plans || []).length || u.plan), n),
          mapPct: repPct(count(u => (u.buildingIds || []).length), n)
        };
      };
      const rows = REPORT_WARDS.map(w => summarise(`Ward ${w}`, all.filter(u => String(u.wardNo) === w)));
      rows.push(summarise('Total', all));
      return rows;
    }
  },

  register: {
    label: 'Property Register (all units)',
    filters: ['ward', 'status'],
    columns: UNIT_COLUMNS,
    rows: (all, f) => all.filter(u => matchWard(u, f) && matchStatus(u, f))
  },

  high_demand: {
    label: 'High Tax Demand Properties',
    filters: ['ward', 'minTax'],
    columns: UNIT_COLUMNS,
    rows: (all, f) => all
      .filter(u => matchWard(u, f) && Number(u.assessedAmount || 0) >= (f.minTax || 0))
      .sort((a, b) => Number(b.assessedAmount || 0) - Number(a.assessedAmount || 0))
  },

  unassessed: {
    label: 'Unassessed Units (no tax demand)',
    filters: ['ward'],
    columns: UNIT_COLUMNS,
    rows: (all, f) => all.filter(u => matchWard(u, f) && u.status !== 'Assessed')
  },

  data_gaps: {
    label: 'Data Gaps (missing photo / plan / map link)',
    filters: ['ward', 'gap'],
    columns: [
      { key: 'wardNo', label: 'Ward' },
      { key: 'propertyNo', label: 'Prop No' },
      { key: 'partitionNo', label: 'Partition' },
      { key: 'unitKey', label: 'Unit Key' },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'photoCount', label: 'Photos', type: 'number' },
      { key: 'planCount', label: 'Plans', type: 'number' },
      { key: 'onMap', label: 'On Map' }
    ],
    rows: (all, f) => all.map(unitWithLinks).filter(u => {
      if (!matchWard(u, f)) return false;
      if (f.gap === 'photo') return !u.photoCount;
      if (f.gap === 'plan') return !u.planCount;
      if (f.gap === 'map') return u.onMap === 'No';
      return !u.photoCount || !u.planCount || u.onMap === 'No';
    })
  }
};

const matchWard = (u, f) => !f.ward || f.ward === 'All' || String(u.wardNo) === f.ward;
const matchStatus = (u, f) => !f.status || f.status === 'All' || u.status === f.status;

function renderReports() {
  const mount = document.getElementById('reports-mount');
  if (!mount) return;

  const summary = window.SHAHAPUR_SUMMARY_STATS || {};
  mount.innerHTML = `
    <div class="double-bezel-card">
      <div class="card-inner rep-card">
        <div class="rep-head">
          <div>
            <h3 style="margin:0;">Generate Report</h3>
            <p class="text-muted" style="margin:0.25rem 0 0; font-size:0.85rem;">
              Source: assessment register (${Number(summary.totalProperties || 0).toLocaleString('en-IN')} units) linked with photos, plans and mapped footprints.
            </p>
          </div>
        </div>

        <div class="rep-controls">
          <label class="rep-field" style="flex:2;">
            <span>Report type</span>
            <select id="report-type-select">
              ${Object.entries(REPORTS).map(([k, r]) => `<option value="${k}">${repEsc(r.label)}</option>`).join('')}
            </select>
          </label>
          <label class="rep-field" data-filter="ward"><span>Ward</span>
            <select id="rf-ward"><option value="All">All Wards (1–5)</option>${REPORT_WARDS.map(w => `<option value="${w}">Ward ${w}</option>`).join('')}</select>
          </label>
          <label class="rep-field" data-filter="status"><span>Status</span>
            <select id="rf-status"><option value="All">All statuses</option><option value="Assessed">Assessed</option><option value="Unassessed">Unassessed</option></select>
          </label>
          <label class="rep-field" data-filter="minTax"><span>Minimum tax demand (₹)</span>
            <input type="number" id="rf-min-tax" min="0" step="500" value="5000">
          </label>
          <label class="rep-field" data-filter="gap"><span>Missing</span>
            <select id="rf-gap"><option value="any">Anything</option><option value="photo">Photo</option><option value="plan">Plan</option><option value="map">Map footprint</option></select>
          </label>
        </div>

        <div class="rep-stats" id="rep-stats"></div>

        <div class="rep-actions">
          <button id="btn-export-pdf" class="btn btn-primary"><i class="ph ph-file-pdf"></i> Export PDF</button>
          <button id="btn-export-excel" class="btn btn-secondary"><i class="ph ph-file-xls"></i> Export Excel</button>
          <button id="btn-export-csv" class="btn btn-secondary"><i class="ph ph-file-csv"></i> Export CSV</button>
        </div>

        <div class="rep-preview-title" id="rep-preview-title"></div>
        <div class="rep-table-wrap"><table class="rep-table" id="rep-table"></table></div>
      </div>
    </div>
  `;

  mount.querySelectorAll('select, input').forEach(el => el.addEventListener('input', refreshReportPreview));
  // Exporters live in js/export/*.js; look them up at click time
  const run = name => () => {
    const { report, rows } = currentReport();
    if (typeof window[name] === 'function') window[name](rows, report.label, report.columns);
    else console.error('[Shahapur GIS - Reports] ' + name + ' is not loaded.');
  };
  document.getElementById('btn-export-pdf').addEventListener('click', run('exportPDF'));
  document.getElementById('btn-export-excel').addEventListener('click', run('exportExcel'));
  document.getElementById('btn-export-csv').addEventListener('click', run('exportCSV'));

  refreshReportPreview();
}

function readReportFilters() {
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  return {
    ward: val('rf-ward') || 'All',
    status: val('rf-status') || 'All',
    minTax: parseFloat(val('rf-min-tax')) || 0,
    gap: val('rf-gap') || 'any'
  };
}

function currentReport() {
  const key = (document.getElementById('report-type-select') || {}).value || 'ward_summary';
  const report = REPORTS[key];
  const all = window.TaxDataService ? window.TaxDataService.getAll() : [];
  return { key, report, rows: report.rows(all, readReportFilters()) };
}

/** Format a cell for screen and PDF (Excel/CSV keep raw numbers). */
function formatReportCell(row, col) {
  const v = row[col.key];
  if (col.type === 'money') return repMoney(v);
  if (col.type === 'number') return Number(v || 0).toLocaleString('en-IN');
  return v === null || v === undefined ? '' : String(v);
}
window.formatReportCell = formatReportCell;

const PREVIEW_LIMIT = 50;

function refreshReportPreview() {
  const { report, rows } = currentReport();

  // Show only the filters this report uses
  document.querySelectorAll('.rep-field[data-filter]').forEach(el => {
    el.hidden = !report.filters.includes(el.dataset.filter);
  });

  const unitRows = rows.filter(r => r.assessedAmount !== undefined);
  const demand = unitRows.reduce((s, r) => s + Number(r.assessedAmount || 0), 0);
  document.getElementById('rep-stats').innerHTML = report === REPORTS.ward_summary ? '' : `
    <div><span>Rows</span><strong>${rows.length.toLocaleString('en-IN')}</strong></div>
    <div><span>Properties</span><strong>${new Set(rows.map(r => r.wardNo + '-' + r.propertyNo)).size.toLocaleString('en-IN')}</strong></div>
    ${unitRows.length ? `<div><span>Tax demand</span><strong>${repMoney(demand)}</strong></div>` : ''}
  `;

  document.getElementById('rep-preview-title').textContent = rows.length > PREVIEW_LIMIT
    ? `Preview — first ${PREVIEW_LIMIT} of ${rows.length.toLocaleString('en-IN')} rows (exports include all rows)`
    : `Preview — ${rows.length.toLocaleString('en-IN')} rows`;

  document.getElementById('rep-table').innerHTML = `
    <thead><tr>${report.columns.map(c => `<th class="${c.type ? 'num' : ''}">${repEsc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(0, PREVIEW_LIMIT).map(r => `<tr class="${r.ward === 'Total' ? 'rep-total' : ''}">${report.columns.map(c =>
      `<td class="${c.type ? 'num' : ''}">${repEsc(formatReportCell(r, c))}</td>`).join('')}</tr>`).join('')
      || `<tr><td colspan="${report.columns.length}" class="text-muted" style="text-align:center; padding:1.5rem;">No rows match these filters.</td></tr>`}
    </tbody>`;
}

// js/router.js calls this whenever the #/reports route is opened
window.renderReports = renderReports;
