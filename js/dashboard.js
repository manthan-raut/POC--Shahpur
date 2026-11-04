// js/dashboard.js — Shahapur GIS Dashboard (UI-UX Pro Max Bento Grid & Executive Analytics)

let activeDashboardCharts = [];

window.renderDashboard = function() {
  const mount = document.getElementById('dashboard-mount');
  if (!mount) return;

  // Clean up existing Chart instances before rebuilding
  activeDashboardCharts.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  activeDashboardCharts = [];

  mount.innerHTML = `
    <!-- Top Dashboard Header Bar -->
    <div class="db-header-bar">
      <div>
        <div class="db-eyebrow">
          <span class="pulse-dot"></span>
          <span>Municipal Asset & Revenue Intelligence</span>
        </div>
        <h1 class="db-title">Shahapur GIS Executive Dashboard</h1>
        <p class="db-subtitle">Prabhag 1–4 revenue analytics • Geospatial infrastructure monitoring • Real-time council benchmarks</p>
      </div>
      <div class="db-controls">
        <select id="db-ward-filter" class="db-select" title="Filter by Ward">
          <option value="All">All Wards (W1 – W4)</option>
          <option value="1">Ward 1 (Prabhag 1)</option>
          <option value="2">Ward 2 (Prabhag 2)</option>
          <option value="3">Ward 3 (Prabhag 3)</option>
          <option value="4">Ward 4 (Prabhag 4)</option>
        </select>
        <button id="btn-db-refresh" class="db-btn-icon" title="Refresh Live Data"><i class="ph ph-arrows-counter-clockwise"></i></button>
        <a href="#/map" class="db-btn-primary" title="Switch to Full GIS Map">
          <span>Open GIS Map</span>
          <div class="btn-arrow-circle"><i class="ph ph-arrow-right"></i></div>
        </a>
      </div>
    </div>

    <!-- Row 1: Top 6 Infrastructure & Asset KPI Bento Cards -->
    <div class="db-kpi-grid">
      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon blue"><i class="ph ph-buildings"></i></div>
          <span class="db-badge green">↗ +12</span>
        </div>
        <div class="db-kpi-val" id="db-val-buildings">1482</div>
        <div class="db-kpi-lbl">Buildings</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-trend-up"></i> +0.8%</span>
          <span>vs last month</span>
        </div>
      </div>

      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon orange"><i class="ph ph-sun"></i></div>
          <span class="db-badge green">↗ +28</span>
        </div>
        <div class="db-kpi-val" id="db-val-solar">173</div>
        <div class="db-kpi-lbl">Solar Points</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-check-circle"></i> 68%</span>
          <span>coverage pace</span>
        </div>
      </div>

      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon purple"><i class="ph ph-lightning"></i></div>
          <span class="db-badge green">↗ +5</span>
        </div>
        <div class="db-kpi-val" id="db-val-poles">482</div>
        <div class="db-kpi-lbl">Electric Poles</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-activity"></i> 99.4%</span>
          <span>grid uptime</span>
        </div>
      </div>

      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon teal"><i class="ph ph-drop"></i></div>
          <span class="db-badge green">↗ +3</span>
        </div>
        <div class="db-kpi-val" id="db-val-bridges">75</div>
        <div class="db-kpi-lbl">Bridges</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-shield-check"></i> 100%</span>
          <span>audited</span>
        </div>
      </div>

      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon amber"><i class="ph ph-path"></i></div>
          <span class="db-badge green">↗ +1.2</span>
        </div>
        <div class="db-kpi-val" id="db-val-roads">30.3 km</div>
        <div class="db-kpi-lbl">Kutcha Roads</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-navigation-arrow"></i> W1–W4</span>
          <span>arterial</span>
        </div>
      </div>

      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon emerald"><i class="ph ph-grid-four"></i></div>
          <span class="db-badge green">↗ +2.4</span>
        </div>
        <div class="db-kpi-val" id="db-val-fencing">28.2 km</div>
        <div class="db-kpi-lbl">Fencing</div>
        <div class="db-kpi-sub">
          <span class="db-kpi-trend pos"><i class="ph ph-lock-key"></i> 94%</span>
          <span>secured</span>
        </div>
      </div>
    </div>

    <!-- Row 2: Monthly Tax Collection + Spatial Overview (Balanced & Rich) -->
    <div class="db-grid-row-2">
      <!-- Monthly Tax Collection Overview Bar Chart -->
      <div class="db-card db-tax-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-amount-wrap">
              <span class="db-card-amount">₹84.0L</span>
              <span class="db-badge green"><i class="ph ph-trend-up"></i> +18.4% YoY</span>
            </div>
            <div class="db-card-sub">Monthly tax collection & pending assessment overview (FY 2026-27)</div>
          </div>
          <div class="db-legend">
            <span class="db-legend-item"><span class="dot green"></span> Collected (₹68.5L)</span>
            <span class="db-legend-item"><span class="dot amber"></span> Pending (₹15.5L)</span>
          </div>
        </div>
        <div class="db-chart-container" style="height: 195px;">
          <canvas id="chart-monthly-tax"></canvas>
        </div>
        <div class="monthly-tax-summary-strip">
          <div class="mt-stat">
            <span class="mt-lbl">Total Achieved</span>
            <span class="mt-val">₹84.0L <small class="pos">(+18.4%)</small></span>
          </div>
          <div class="mt-stat">
            <span class="mt-lbl">Monthly Average</span>
            <span class="mt-val">₹12.0L <small class="text-muted">/ mo</small></span>
          </div>
          <div class="mt-stat">
            <span class="mt-lbl">Peak Month</span>
            <span class="mt-val">October <small class="pos">(₹22.5L)</small></span>
          </div>
          <div class="mt-stat">
            <span class="mt-lbl">Target Run Rate</span>
            <span class="mt-val">84.0% <small class="pos">On Track</small></span>
          </div>
        </div>
      </div>

      <!-- Spatial Overview Card (Elevated, Large, Clean Live GIS Map) -->
      <div class="db-card db-spatial-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title">
              <i class="ph ph-map-trifold" style="color: #0ea5e9;"></i>
              <span>Spatial Overview</span>
              <span class="db-badge blue"><span class="pulse-dot"></span> LIVE GIS</span>
            </div>
            <div class="db-card-sub">Shahapur Municipal Extent • 18.7247° N, 76.3857° E</div>
          </div>
          <div class="spatial-card-actions">
            <div class="spatial-ward-pills">
              <button class="spatial-pill active" data-ward="All" title="View Full Shahapur Extent">All</button>
              <button class="spatial-pill" data-ward="1" title="Focus Ward 1 (Prabhag 1)">W1</button>
              <button class="spatial-pill" data-ward="2" title="Focus Ward 2 (Prabhag 2)">W2</button>
              <button class="spatial-pill" data-ward="3" title="Focus Ward 3 (Prabhag 3)">W3</button>
              <button class="spatial-pill" data-ward="4" title="Focus Ward 4 (Prabhag 4)">W4</button>
            </div>
            <a href="#/map" class="db-link" title="Open Full GIS Map Studio">Full Map ↗</a>
          </div>
        </div>

        <div class="db-spatial-map-wrapper">
          <!-- Live ArcGIS / Web Map Container -->
          <div id="db-mini-map-view" class="db-mini-map-canvas"></div>

          <!-- Sleek Map Overlay Controls -->
          <div class="spatial-map-overlay">
            <div class="spatial-top-bar">
              <div class="spatial-meta-chip">
                <i class="ph ph-crosshair"></i>
                <span id="mini-map-coords">18.7247°N, 76.3857°E</span>
              </div>
              <div class="spatial-zoom-controls">
                <button id="btn-mini-zoom-in" class="mini-zoom-btn" title="Zoom In"><i class="ph ph-plus"></i></button>
                <button id="btn-mini-zoom-out" class="mini-zoom-btn" title="Zoom Out"><i class="ph ph-minus"></i></button>
                <button id="btn-mini-recenter" class="mini-zoom-btn" title="Reset Extent"><i class="ph ph-arrows-in"></i></button>
              </div>
            </div>

            <div class="spatial-bottom-bar">
              <div class="spatial-legend-chip">
                <span class="leg-dot council"></span> Council Boundary
                <span class="leg-dot ward"></span> Wards 1–4
              </div>
              <span class="spatial-status-tag"><i class="ph ph-shield-check"></i> MRSAC Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Annual Target + Financial Health + Land Use Donut + Building Classification -->
    <div class="db-grid-row-4 mt-4">
      <!-- Annual Target Tracking -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-target"></i> Annual Target</div>
            <div class="db-card-sub">Council FY 2026-27 Goal</div>
          </div>
          <span class="db-badge blue">On Track</span>
        </div>
        <div class="db-target-vals">
          <span class="curr">₹84.0L <small class="text-muted" style="font-size:0.7rem; font-weight:500;">(84.0%)</small></span>
          <span class="tot">₹100.0L Target</span>
        </div>
        <div class="db-progress-bg">
          <div class="db-progress-fill" style="width: 84%;"></div>
        </div>
        <div class="target-sub-metrics" style="margin-top: 0.65rem;">
          <span><i class="ph ph-check-circle" style="color: #10b981;"></i> ₹16.0L Gap</span>
          <span><i class="ph ph-calendar"></i> 147 Days Left</span>
        </div>
      </div>

      <!-- Financial Health Arc Gauge -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-trend-up"></i> Financial Health</div>
            <div class="db-card-sub">Compliance status</div>
          </div>
          <span class="db-badge green">↗ +12.5%</span>
        </div>
        <div class="db-gauge-wrap" style="height: 105px;">
          <canvas id="chart-fin-gauge"></canvas>
          <div class="gauge-center-text">
            <span class="rate">80%</span>
            <span class="sub">RECOVERY</span>
          </div>
        </div>
        <div class="db-fin-grid" style="margin-top: 0.35rem;">
          <div class="db-fin-stat">
            <span class="fin-stat-lbl">Assessed</span>
            <span class="fin-stat-val">₹105.6L</span>
          </div>
          <div class="db-fin-stat">
            <span class="fin-stat-lbl">Collected</span>
            <span class="fin-stat-val text-success">₹84.0L</span>
          </div>
          <div class="db-fin-stat">
            <span class="fin-stat-lbl">Pending</span>
            <span class="fin-stat-val text-warning">₹21.6L</span>
          </div>
        </div>
      </div>

      <!-- Land Use Distribution Donut -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-plant"></i> Land Use</div>
            <div class="db-card-sub">4.8 sq.km breakdown</div>
          </div>
          <span class="db-badge blue">6 Zones</span>
        </div>
        <div class="db-chart-container" style="height: 140px;">
          <canvas id="chart-landuse"></canvas>
          <div class="donut-center-info">
            <span class="val">4,812</span>
            <span class="lbl">Ha</span>
          </div>
        </div>
        <div class="db-donut-legend" style="grid-template-columns: repeat(2, 1fr); gap: 0.25rem 0.45rem; margin-top: 0.35rem;">
          <div class="donut-leg-item"><span class="dot" style="background:#6366f1;"></span> Res. <b>42%</b></div>
          <div class="donut-leg-item"><span class="dot" style="background:#0ea5e9;"></span> Comm. <b>18%</b></div>
          <div class="donut-leg-item"><span class="dot" style="background:#10b981;"></span> Agri. <b>15%</b></div>
          <div class="donut-leg-item"><span class="dot" style="background:#f59e0b;"></span> Open <b>10%</b></div>
          <div class="donut-leg-item"><span class="dot" style="background:#64748b;"></span> Ind. <b>8%</b></div>
          <div class="donut-leg-item"><span class="dot" style="background:#8b5cf6;"></span> Util. <b>7%</b></div>
        </div>
      </div>

      <!-- Building Classification Stacked Bar -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-buildings"></i> Buildings</div>
            <div class="db-card-sub">1,482 mapped structures</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 185px;">
          <canvas id="chart-building-class"></canvas>
        </div>
      </div>
    </div>

    <!-- Row 4: Infrastructure Breakdown -->
    <div class="db-grid-row-3 mt-4">
      <!-- Electric Infrastructure (Lines & Poles) -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-lightning"></i> Electric Infrastructure</div>
            <div class="db-card-sub">Transmission lines (km) & poles distribution</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 160px;">
          <canvas id="chart-electric"></canvas>
        </div>
      </div>

      <!-- Solar Point Installation (Grouped Bar) -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-sun"></i> Solar Point Installation</div>
            <div class="db-card-sub">173 active points • 68% deployment pace</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 160px;">
          <canvas id="chart-solar"></canvas>
        </div>
      </div>

      <!-- Roads & Bridges (Horizontal Bar) -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-path"></i> Roads & Bridges Network</div>
            <div class="db-card-sub">30.3 km Kutcha roads • 75 Bridges</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 160px;">
          <canvas id="chart-roads-bridges"></canvas>
        </div>
      </div>
    </div>

    <!-- Row 5: Fencing Analysis + Infra Coverage Radar + Railway & Recovery + Transaction History -->
    <div class="db-grid-row-4 mt-4">
      <!-- Fencing Analysis -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-grid-four"></i> Fencing Analysis</div>
            <div class="db-card-sub">28.2 km perimeter protection</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 160px;">
          <canvas id="chart-fencing"></canvas>
        </div>
      </div>

      <!-- Infra Coverage Score (Radar Chart) -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-chart-polar"></i> Infra Coverage Score</div>
            <div class="db-card-sub">Multi-ward comparative index</div>
          </div>
        </div>
        <div class="db-chart-container" style="height: 160px;">
          <canvas id="chart-radar-infra"></canvas>
        </div>
      </div>

      <!-- Railway Infrastructure & Ward Recovery Goals -->
      <div class="db-card">
        <div class="db-card-header">
          <div>
            <div class="db-card-title"><i class="ph ph-train"></i> Railway Network & Recovery</div>
          </div>
        </div>
        <div class="rail-mini-grid">
          <div class="rail-box"><i class="ph ph-train-simple"></i><div><span class="val">8.4 km</span><span class="lbl">Track</span></div></div>
          <div class="rail-box"><i class="ph ph-crosshair"></i><div><span class="val">3</span><span class="lbl">Crossings</span></div></div>
          <div class="rail-box"><i class="ph ph-buildings"></i><div><span class="val">1</span><span class="lbl">Station</span></div></div>
          <div class="rail-box"><i class="ph ph-bridge"></i><div><span class="val">2</span><span class="lbl">Bridges</span></div></div>
        </div>

        <div class="db-card-title mt-3" style="font-size: 0.775rem;">Ward Revenue Recovery</div>
        <div class="ward-recovery-list">
          <div class="rec-item">
            <div class="rec-row"><span>W1 Prabhag 1</span> <span>₹14.2L / ₹17.0L <b>(83.5%)</b></span></div>
            <div class="rec-bar-bg"><div class="rec-bar-fill green" style="width: 83.5%;"></div></div>
          </div>
          <div class="rec-item">
            <div class="rec-row"><span>W2 Prabhag 2</span> <span>₹11.8L / ₹16.3L <b>(72.3%)</b></span></div>
            <div class="rec-bar-bg"><div class="rec-bar-fill teal" style="width: 72.3%;"></div></div>
          </div>
          <div class="rec-item">
            <div class="rec-row"><span>W3 Prabhag 3</span> <span>₹18.9L / ₹21.0L <b>(90.0%)</b></span></div>
            <div class="rec-bar-bg"><div class="rec-bar-fill orange" style="width: 90.0%;"></div></div>
          </div>
          <div class="rec-item">
            <div class="rec-row"><span>W4 Prabhag 4</span> <span>₹9.5L / ₹14.7L <b>(64.6%)</b></span></div>
            <div class="rec-bar-bg"><div class="rec-bar-fill blue" style="width: 64.6%;"></div></div>
          </div>
        </div>
      </div>

      <!-- Transaction History -->
      <div class="db-card">
        <div class="db-card-header">
          <div class="db-card-title"><i class="ph ph-receipt"></i> Recent Transactions</div>
          <select class="db-select-sm" title="Filter by timeframe">
            <option>7 Days</option>
            <option>30 Days</option>
          </select>
        </div>

        <div class="tx-history-list">
          <div class="tx-item">
            <div class="tx-icon green"><i class="ph ph-receipt"></i></div>
            <div class="tx-details">
              <div class="name">Ward 3 Property Tax</div>
              <div class="time">25 Oct 2026 • Prabhag 3</div>
            </div>
            <div class="tx-amount pos">+₹14,500 <span class="sub">Completed</span></div>
          </div>

          <div class="tx-item">
            <div class="tx-icon blue"><i class="ph ph-briefcase"></i></div>
            <div class="tx-details">
              <div class="name">Commercial Assessment</div>
              <div class="time">24 Oct 2026 • Ward 1</div>
            </div>
            <div class="tx-amount pos">+₹8,400 <span class="sub">Completed</span></div>
          </div>

          <div class="tx-item">
            <div class="tx-icon red"><i class="ph ph-warning-circle"></i></div>
            <div class="tx-details">
              <div class="name">Recovery Notice Fee</div>
              <div class="time">21 Oct 2026 • Ward 4</div>
            </div>
            <div class="tx-amount neg">-₹900 <span class="sub">Deducted</span></div>
          </div>

          <div class="tx-item">
            <div class="tx-icon purple"><i class="ph ph-arrows-clockwise"></i></div>
            <div class="tx-details">
              <div class="name">Bulk Ward 1 Collection</div>
              <div class="time">20 Oct 2026 • Ward 1</div>
            </div>
            <div class="tx-amount pos">+₹21,100 <span class="sub">Completed</span></div>
          </div>

          <div class="tx-item">
            <div class="tx-icon amber"><i class="ph ph-sun"></i></div>
            <div class="tx-details">
              <div class="name">Solar Installation</div>
              <div class="time">18 Oct 2026 • Ward 2</div>
            </div>
            <div class="tx-amount neg">-₹4,200 <span class="sub">Approved</span></div>
          </div>

          <div class="tx-item">
            <div class="tx-icon teal"><i class="ph ph-path"></i></div>
            <div class="tx-details">
              <div class="name">Road Maintenance</div>
              <div class="time">15 Oct 2026 • Ward 3</div>
            </div>
            <div class="tx-amount neg">-₹1,700 <span class="sub">Completed</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Live REST API Querying from MRSAC MapServer Service
  queryMapServerCounts();

  // Render Charts & Interactive Mini Map
  setTimeout(buildDashboardCharts, 120);
  setTimeout(initDashboardMiniMap, 160);

  // Wire Ward Filter & Refresh Button
  const wardSelect = document.getElementById('db-ward-filter');
  const refreshBtn = document.getElementById('btn-db-refresh');

  if (wardSelect) {
    wardSelect.addEventListener('change', () => {
      queryMapServerCounts();
      buildDashboardCharts();
      if (dbMiniMapView) {
        const selVal = wardSelect.value;
        const pill = document.querySelector(`.spatial-pill[data-ward="${selVal}"]`);
        if (pill) pill.click();
      }
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      queryMapServerCounts();
      buildDashboardCharts();
      const resetBtn = document.getElementById('btn-mini-recenter');
      if (resetBtn) resetBtn.click();
    });
  }
};

function queryMapServerCounts() {
  const MAPSERVER_URL = "https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer";
  
  const wardSelect = document.getElementById('db-ward-filter');
  const wardNo = wardSelect ? wardSelect.value : 'All';
  
  let whereClause = "1=1";
  if (wardNo && wardNo !== 'All') {
    // Both string and numeric fallback for robust query across layers
    whereClause = `Ward_No = '${wardNo}' OR Ward_No = ${wardNo}`;
  }

  require(["esri/rest/query", "esri/rest/support/Query"], (query, Query) => {
    // Query Building count (Layer #2)
    const qBuild = new Query({ where: whereClause, returnCountOnly: true });
    query.executeForCount(`${MAPSERVER_URL}/2`, qBuild).then(count => {
      if (count !== undefined && count !== null) {
        document.getElementById('db-val-buildings').innerText = count;
      }
    }).catch(e => console.warn("Building count query fallback", e));

    // Query Solar Point count (Layer #13)
    const qSolar = new Query({ where: whereClause, returnCountOnly: true });
    query.executeForCount(`${MAPSERVER_URL}/13`, qSolar).then(count => {
      if (count !== undefined && count !== null) {
        document.getElementById('db-val-solar').innerText = count;
      }
    }).catch(e => console.warn("Solar count query fallback", e));

    // Query Electric Poles count (Layer #10)
    const qPoles = new Query({ where: whereClause, returnCountOnly: true });
    query.executeForCount(`${MAPSERVER_URL}/10`, qPoles).then(count => {
      if (count !== undefined && count !== null) {
        document.getElementById('db-val-poles').innerText = count;
      }
    }).catch(e => console.warn("Poles count query fallback", e));

    // Query Bridge count (Layer #1)
    const qBridge = new Query({ where: whereClause, returnCountOnly: true });
    query.executeForCount(`${MAPSERVER_URL}/1`, qBridge).then(count => {
      if (count !== undefined && count !== null) {
        document.getElementById('db-val-bridges').innerText = count;
      }
    }).catch(e => console.warn("Bridge count query fallback", e));

    // Calculate Kutcha Roads Length (Layer #7)
    const qRoads = new Query({
      where: whereClause,
      outStatistics: [{
        statisticType: "sum",
        onStatisticField: "Shape_Length",
        outStatisticFieldName: "Total_Length"
      }]
    });
    query.executeQueryJSON(`${MAPSERVER_URL}/7`, qRoads).then(res => {
      if (res && res.features && res.features.length > 0) {
        const totalMeters = res.features[0].attributes.Total_Length || 0;
        document.getElementById('db-val-roads').innerText = (totalMeters / 1000).toFixed(2) + " km";
      }
    }).catch(e => console.warn("Road length query fallback", e));

    // Calculate Fencing Length (Layer #5)
    const qFencing = new Query({
      where: whereClause,
      outStatistics: [{
        statisticType: "sum",
        onStatisticField: "Shape_Length",
        outStatisticFieldName: "Total_Length"
      }]
    });
    query.executeQueryJSON(`${MAPSERVER_URL}/5`, qFencing).then(res => {
      if (res && res.features && res.features.length > 0) {
        const totalMeters = res.features[0].attributes.Total_Length || 0;
        document.getElementById('db-val-fencing').innerText = (totalMeters / 1000).toFixed(2) + " km";
      }
    }).catch(e => console.warn("Fencing length query fallback", e));
  });
}

function buildDashboardCharts() {
  if (typeof Chart === 'undefined') return;

  try {
    // Set crisp, agency-standard typography and tooltip defaults
    Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
    Chart.defaults.font.size = 10;
    Chart.defaults.color = '#64748b';
    if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.94)';
      Chart.defaults.plugins.tooltip.padding = 8;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.titleFont = { size: 10.5, weight: '700' };
      Chart.defaults.plugins.tooltip.bodyFont = { size: 9.5 };
      Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.12)';
      Chart.defaults.plugins.tooltip.borderWidth = 1;
    }

    const canvasIds = [
      'chart-monthly-tax',
      'chart-landuse',
      'chart-building-class',
      'chart-fin-gauge',
      'chart-electric',
      'chart-solar',
      'chart-roads-bridges',
      'chart-fencing',
      'chart-radar-infra'
    ];

    // Safely destroy any existing chart instances attached to these canvas IDs
    canvasIds.forEach(id => {
      if (Chart.getChart) {
        const existing = Chart.getChart(id);
        if (existing && typeof existing.destroy === 'function') {
          existing.destroy();
        }
      }
    });

    // 1. Monthly Tax Collection Bar Chart (Gradient Fill + Lakhs Currency Formatting)
    const ctxMonthly = document.getElementById('chart-monthly-tax')?.getContext('2d');
    if (ctxMonthly) {
      const gradCollected = ctxMonthly.createLinearGradient(0, 0, 0, 190);
      gradCollected.addColorStop(0, '#10b981');
      gradCollected.addColorStop(1, '#059669');

      const gradPending = ctxMonthly.createLinearGradient(0, 0, 0, 190);
      gradPending.addColorStop(0, '#f59e0b');
      gradPending.addColorStop(1, '#d97706');

      const cMonthly = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
          datasets: [
            {
              label: 'Collected',
              data: [850, 1450, 1480, 1100, 1720, 1950, 2250],
              backgroundColor: gradCollected,
              borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
              borderSkipped: false,
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              maxBarThickness: 52
            },
            {
              label: 'Pending',
              data: [350, 200, 380, 580, 310, 280, 300],
              backgroundColor: gradPending,
              borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
              borderSkipped: false,
              barPercentage: 0.85,
              categoryPercentage: 0.85,
              maxBarThickness: 52
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  const val = ctx.parsed.y;
                  const lakhs = (val / 100).toFixed(2);
                  return ` ${ctx.dataset.label}: ₹${lakhs} Lakh (₹${(val * 1000).toLocaleString('en-IN')})`;
                }
              }
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { font: { size: 10, weight: 600 }, color: '#475569' }
            },
            y: {
              stacked: true,
              grid: { color: 'rgba(241, 245, 249, 0.8)' },
              ticks: {
                font: { size: 9.5, weight: 500 },
                color: '#64748b',
                callback: function(v) {
                  return v === 0 ? '₹0' : '₹' + (v / 100).toFixed(0) + 'L';
                }
              }
            }
          }
        }
      });
      activeDashboardCharts.push(cMonthly);
    }

    // 2. Land Use Distribution Donut Chart (Harmonious Civic Palette)
    const ctxLanduse = document.getElementById('chart-landuse')?.getContext('2d');
    if (ctxLanduse) {
      const cLanduse = new Chart(ctxLanduse, {
        type: 'doughnut',
        data: {
          labels: ['Residential 42%', 'Commercial 18%', 'Agricultural 15%', 'Open Space 10%', 'Industrial 8%', 'Public Utility 7%'],
          datasets: [{
            data: [42, 18, 15, 10, 8, 7],
            backgroundColor: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#64748b', '#8b5cf6'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false }, // Rendered cleanly in custom HTML grid below
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ` ${ctx.label}`;
                }
              }
            }
          }
        }
      });
      activeDashboardCharts.push(cLanduse);
    }

    // 3. Building Classification Stacked Bar (Refined Civic Scheme)
    const ctxBldg = document.getElementById('chart-building-class')?.getContext('2d');
    if (ctxBldg) {
      const cBldg = new Chart(ctxBldg, {
        type: 'bar',
        data: {
          labels: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
          datasets: [
            { label: 'Residential', data: [180, 140, 220, 110], backgroundColor: '#4f46e5', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 38 },
            { label: 'Commercial', data: [45, 35, 60, 30], backgroundColor: '#f59e0b', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 38 },
            { label: 'Civic & Govt', data: [22, 20, 32, 24], backgroundColor: '#0ea5e9', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 38 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9.5, weight: '600' }, color: '#475569', padding: 8 }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 9.5, weight: 600 } } },
            y: {
              stacked: true,
              grid: { color: 'rgba(241, 245, 249, 0.8)' },
              ticks: { font: { size: 9.5 } }
            }
          }
        }
      });
      activeDashboardCharts.push(cBldg);
    }

    // 4. Financial Health Semi-Circle Arc Gauge (Gradient Track)
    const ctxGauge = document.getElementById('chart-fin-gauge')?.getContext('2d');
    if (ctxGauge) {
      const gradGauge = ctxGauge.createLinearGradient(0, 0, 180, 0);
      gradGauge.addColorStop(0, '#10b981');
      gradGauge.addColorStop(1, '#0284c7');

      const cGauge = new Chart(ctxGauge, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [80, 20],
            backgroundColor: [gradGauge, '#e2e8f0'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '80%',
          plugins: { tooltip: { enabled: false } }
        }
      });
      activeDashboardCharts.push(cGauge);
    }

    // 5. Electric Infrastructure (Transmission Lines Area + Poles Line)
    const ctxElectric = document.getElementById('chart-electric')?.getContext('2d');
    if (ctxElectric) {
      const gradElec = ctxElectric.createLinearGradient(0, 0, 0, 150);
      gradElec.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
      gradElec.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

      const cElectric = new Chart(ctxElectric, {
        type: 'line',
        data: {
          labels: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
          datasets: [
            {
              label: 'Lines (km)',
              data: [11.5, 8.2, 14.8, 7.5],
              borderColor: '#9333ea',
              backgroundColor: gradElec,
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#9333ea'
            },
            {
              label: 'Poles (×10)',
              data: [12.4, 9.6, 16.2, 10.0],
              borderColor: '#0284c7',
              borderDash: [3, 3],
              borderWidth: 1.5,
              fill: false,
              tension: 0.35,
              pointRadius: 2.5,
              pointBackgroundColor: '#0284c7'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9, weight: '600' }, color: '#475569', padding: 6 }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9.5 } } },
            y: { grid: { color: 'rgba(241, 245, 249, 0.8)' }, ticks: { font: { size: 9.5 } } }
          }
        }
      });
      activeDashboardCharts.push(cElectric);
    }

    // 6. Solar Point Installation Grouped Bar (Solar Amber + Slate Planned)
    const ctxSolar = document.getElementById('chart-solar')?.getContext('2d');
    if (ctxSolar) {
      const gradSolar = ctxSolar.createLinearGradient(0, 0, 0, 150);
      gradSolar.addColorStop(0, '#f59e0b');
      gradSolar.addColorStop(1, '#d97706');

      const cSolar = new Chart(ctxSolar, {
        type: 'bar',
        data: {
          labels: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
          datasets: [
            { label: 'Installed', data: [32, 24, 45, 12], backgroundColor: gradSolar, borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 24 },
            { label: 'Planned', data: [15, 18, 10, 28], backgroundColor: '#cbd5e1', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 24 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9.5, weight: '600' }, color: '#475569', padding: 6 }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9.5 } } },
            y: { grid: { color: 'rgba(241, 245, 249, 0.8)' }, ticks: { font: { size: 9.5 } } }
          }
        }
      });
      activeDashboardCharts.push(cSolar);
    }

    // 7. Roads & Bridges Horizontal Bar (Emerald + Sky Blue)
    const ctxRoads = document.getElementById('chart-roads-bridges')?.getContext('2d');
    if (ctxRoads) {
      activeDashboardCharts.push(new Chart(ctxRoads, {
        type: 'bar',
        data: {
          labels: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
          datasets: [
            { label: 'Kutcha Road (km)', data: [4.2, 5.1, 3.8, 6.2], backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 18 },
            { label: 'Bridges', data: [12, 8, 16, 7], backgroundColor: '#0284c7', borderRadius: 4, barPercentage: 0.85, categoryPercentage: 0.8, maxBarThickness: 18 }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9.5, weight: '600' }, color: '#475569', padding: 6 }
            }
          },
          scales: {
            x: { grid: { color: 'rgba(241, 245, 249, 0.8)' }, ticks: { font: { size: 9.5 } } },
            y: { grid: { display: false }, ticks: { font: { size: 9.5, weight: 600 } } }
          }
        }
      }));
    }

    // 8. Fencing Analysis Multi-wave Spline (Boundary, Security, Agri)
    const ctxFencing = document.getElementById('chart-fencing')?.getContext('2d');
    if (ctxFencing) {
      const cFencing = new Chart(ctxFencing, {
        type: 'line',
        data: {
          labels: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
          datasets: [
            { label: 'Boundary', data: [4.2, 3.1, 6.5, 3.8], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.35, pointRadius: 2.5 },
            { label: 'Security', data: [2.5, 1.8, 3.8, 2.2], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)', fill: true, tension: 0.35, pointRadius: 2.5 },
            { label: 'Agri', data: [1.8, 1.2, 2.2, 1.5], borderColor: '#0284c7', backgroundColor: 'rgba(2, 132, 199, 0.08)', fill: true, tension: 0.35, pointRadius: 2.5 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9.5, weight: '600' }, color: '#475569', padding: 6 }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9.5 } } },
            y: { grid: { color: 'rgba(241, 245, 249, 0.8)' }, ticks: { font: { size: 9.5 } } }
          }
        }
      });
      activeDashboardCharts.push(cFencing);
    }

    // 9. Infra Coverage Score Radar Chart (Multi-Ward Index)
    const ctxRadar = document.getElementById('chart-radar-infra')?.getContext('2d');
    if (ctxRadar) {
      const cRadar = new Chart(ctxRadar, {
        type: 'radar',
        data: {
          labels: ['Buildings', 'Power', 'Roads', 'Solar', 'Fencing', 'Bridges'],
          datasets: [
            { label: 'Ward 1', data: [85, 78, 92, 70, 80, 88], borderColor: '#0284c7', backgroundColor: 'rgba(2, 132, 199, 0.12)', borderWidth: 1.5, pointRadius: 2 },
            { label: 'Ward 2', data: [90, 85, 80, 82, 85, 82], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.12)', borderWidth: 1.5, pointRadius: 2 },
            { label: 'Ward 3', data: [95, 90, 88, 92, 85, 94], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1.5, pointRadius: 2 },
            { label: 'Ward 4', data: [75, 82, 70, 85, 78, 80], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1.5, pointRadius: 2 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 8, font: { size: 9.5, weight: '600' }, color: '#475569', padding: 6 }
            }
          },
          scales: {
            r: {
              angleLines: { color: '#e2e8f0' },
              grid: { color: 'rgba(241, 245, 249, 0.9)' },
              pointLabels: { font: { size: 9, weight: '600' }, color: '#334155' },
              ticks: { display: false }
            }
          }
        }
      });
      activeDashboardCharts.push(cRadar);
    }
  } catch (err) {
    console.warn("Dashboard chart rendering postponed:", err);
  }
}

// Dedicated Mini-Map View in Spatial Overview
let dbMiniMapView = null;

function initDashboardMiniMap() {
  const mount = document.getElementById('db-mini-map-view');
  if (!mount) return;

  // Defer slightly if ArcGIS require is not yet ready
  if (typeof require === 'undefined') {
    setTimeout(initDashboardMiniMap, 150);
    return;
  }

  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer"
  ], (Map, MapView, FeatureLayer) => {
    // If view already attached to this container, skip rebuild
    if (dbMiniMapView && dbMiniMapView.container === mount) {
      return;
    }
    if (dbMiniMapView && typeof dbMiniMapView.destroy === 'function') {
      try { dbMiniMapView.destroy(); } catch(e) {}
      dbMiniMapView = null;
    }

    const MAPSERVER_URL = "https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer";

    // Council Boundary (Layer #0) & Ward Boundary (Layer #14)
    const councilLyr = new FeatureLayer({
      url: `${MAPSERVER_URL}/0`,
      opacity: 0.95,
      title: "Council Boundary"
    });

    const wardLyr = new FeatureLayer({
      url: `${MAPSERVER_URL}/14`,
      opacity: 0.85,
      title: "Ward Boundary"
    });

    const miniMap = new Map({
      basemap: "hybrid",
      layers: [councilLyr, wardLyr]
    });

    dbMiniMapView = new MapView({
      container: mount,
      map: miniMap,
      center: [76.3857, 18.7247],
      zoom: 13.8,
      ui: { components: [] },
      constraints: {
        rotationEnabled: false,
        minZoom: 11,
        maxZoom: 18
      }
    });

    // Prevent vertical page scroll interruption
    dbMiniMapView.on("mouse-wheel", (evt) => {
      evt.stopPropagation();
    });

    // Real-time cursor coordinates
    dbMiniMapView.on("pointer-move", (evt) => {
      const pt = dbMiniMapView.toMap({ x: evt.x, y: evt.y });
      if (pt) {
        const coordsEl = document.getElementById('mini-map-coords');
        if (coordsEl) {
          coordsEl.textContent = `${pt.latitude.toFixed(4)}°N, ${pt.longitude.toFixed(4)}°E`;
        }
      }
    });

    // Mini Zoom Controls
    const btnZoomIn = document.getElementById('btn-mini-zoom-in');
    const btnZoomOut = document.getElementById('btn-mini-zoom-out');
    const btnRecenter = document.getElementById('btn-mini-recenter');

    if (btnZoomIn) {
      btnZoomIn.onclick = (e) => {
        e.stopPropagation();
        dbMiniMapView.goTo({ zoom: dbMiniMapView.zoom + 1 }, { duration: 250 });
      };
    }
    if (btnZoomOut) {
      btnZoomOut.onclick = (e) => {
        e.stopPropagation();
        dbMiniMapView.goTo({ zoom: dbMiniMapView.zoom - 1 }, { duration: 250 });
      };
    }
    if (btnRecenter) {
      btnRecenter.onclick = (e) => {
        e.stopPropagation();
        dbMiniMapView.goTo({ center: [76.3857, 18.7247], zoom: 13.8 }, { duration: 400 });
        document.querySelectorAll('.spatial-pill').forEach(p => p.classList.remove('active'));
        document.querySelector('.spatial-pill[data-ward="All"]')?.classList.add('active');
      };
    }

    // Ward Extents for Interactive Navigation Pills
    const WARD_EXTENTS = {
      'All': { center: [76.3857, 18.7247], zoom: 13.8 },
      '1': { center: [76.3885, 18.7310], zoom: 15.2 },
      '2': { center: [76.3810, 18.7270], zoom: 15.2 },
      '3': { center: [76.3830, 18.7180], zoom: 15.2 },
      '4': { center: [76.3920, 18.7220], zoom: 15.2 }
    };

    document.querySelectorAll('.spatial-pill').forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.spatial-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const wardKey = pill.getAttribute('data-ward');
        const target = WARD_EXTENTS[wardKey] || WARD_EXTENTS['All'];
        dbMiniMapView.goTo(target, { duration: 500 });
      };
    });
  });
}

// Router Event Listeners for Dashboard initialization
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#/dashboard' || window.location.hash === '' || window.location.hash === '#/') {
    window.renderDashboard();
  }
});

if (window.location.hash === '#/dashboard' || window.location.hash === '' || window.location.hash === '#/') {
  setTimeout(() => {
    window.renderDashboard();
  }, 150);
}
