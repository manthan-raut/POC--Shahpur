// js/tools.js

console.log('[Shahapur GIS - Tools] Loading tools.js module...');

/** Ward chosen in the map Query Section, or null when none is selected. */
window.getSelectedWard = function() {
  const sel = document.getElementById('ward-select');
  return sel && /^\d+$/.test(sel.value) ? sel.value : null;
};

window.initTools = function(view) {
  console.info('[Shahapur GIS - Tools] window.initTools() called. Requiring widgets...');
  require([
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/widgets/Measurement"
  ], (BasemapGallery, Expand, Measurement) => {
    
    // Basemap Gallery
    const basemapGallery = new BasemapGallery({
      view: view,
      container: document.createElement("div")
    });
    
    const bgExpand = new Expand({
      view: view,
      content: basemapGallery,
      expandIconClass: "esri-icon-basemap",
      expanded: false
    });
    
    view.ui.add(bgExpand, "bottom-right");
    bgExpand.domNode.style.display = 'none';

    const bmToolBtn = document.getElementById('tool-basemap');
    if (bmToolBtn) {
      bmToolBtn.addEventListener('click', () => {
        console.log('[Shahapur GIS - Tools] Basemap tool clicked.');
        if (bgExpand.expanded) {
          bgExpand.collapse();
        } else {
          bgExpand.expand();
        }
      });
    }

    // Measurement Widget
    console.log('[Shahapur GIS - Tools] Initializing Measurement widget...');
    const measurement = new Measurement({
      view: view
    });
    view.ui.add(measurement, "top-right");

    const btnMeasureArea = document.getElementById('tool-measure-area');
    if (btnMeasureArea) {
      btnMeasureArea.addEventListener('click', () => {
        if (btnMeasureArea.classList.contains('active')) {
          console.log('[Shahapur GIS - Tools] Cleared active Area measurement tool.');
          measurement.clear();
          btnMeasureArea.classList.remove('active');
        } else {
          console.log('[Shahapur GIS - Tools] Activated Area measurement tool.');
          measurement.activeTool = "area";
          btnMeasureArea.classList.add('active');
          const btnDist = document.getElementById('tool-measure-line');
          if (btnDist) btnDist.classList.remove('active');
        }
      });
    }

    const btnMeasureLine = document.getElementById('tool-measure-line');
    if (btnMeasureLine) {
      btnMeasureLine.addEventListener('click', () => {
        if (btnMeasureLine.classList.contains('active')) {
          console.log('[Shahapur GIS - Tools] Cleared active Distance measurement tool.');
          measurement.clear();
          btnMeasureLine.classList.remove('active');
        } else {
          console.log('[Shahapur GIS - Tools] Activated Distance measurement tool.');
          measurement.activeTool = "distance";
          btnMeasureLine.classList.add('active');
          const btnArea = document.getElementById('tool-measure-area');
          if (btnArea) btnArea.classList.remove('active');
        }
      });
    }

    // Identify Tool
    setupIdentify(view);

    // Search Tool
    setupSearch(view);

    // Buffer Tool
    setupBuffer(view);
    console.info('[Shahapur GIS - Tools] Interactive tools initialized successfully.');
  });
};

function setupIdentify(view) {
  console.log('[Shahapur GIS - Tools] Setting up Identify tool listener on MapView...');
  let identifyActive = true;
  
  const identifyBtn = document.getElementById('tool-identify');
  if (identifyBtn) {
    identifyBtn.addEventListener('click', () => {
      identifyActive = !identifyActive;
      identifyBtn.classList.toggle('active');
      console.log('[Shahapur GIS - Tools] Identify tool toggled. State:', identifyActive);
    });
  }

  view.popup.autoOpenEnabled = false;

  view.on("click", (event) => {
    if (!identifyActive) return;
    if (window.bufferActive) {
      console.log('[Shahapur GIS - Tools] Buffer tool is active, skipping Identify query.');
      return;
    }
    // No property data is shown (or identifiable) until a ward is selected
    if (!window.getSelectedWard()) return;

    console.log('[Shahapur GIS - Tools] Map clicked at:', {
      lon: event.mapPoint ? event.mapPoint.longitude.toFixed(5) : null,
      lat: event.mapPoint ? event.mapPoint.latitude.toFixed(5) : null
    });

    const buildingFeatureLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-2") : null;

    if (buildingFeatureLayer) {
      buildingFeatureLayer.queryFeatures({
        geometry: event.mapPoint,
        spatialRelationship: "intersects",
        outFields: ["*"]
      }).then(res => {
        if (res && res.features && res.features.length > 0) {
          const graphic = res.features[0];
          const objectId = graphic.attributes.OBJECTID_1 || graphic.attributes.OBJECTID || 1;
          const bldg = (window.BUILDINGS_BY_ID && window.BUILDINGS_BY_ID[objectId]) ? window.BUILDINGS_BY_ID[objectId] : graphic.attributes;
          console.info('[Shahapur GIS - Tools] Intersected building polygon feature with ID:', objectId, bldg ? bldg.propNo : null);
          showPropertyPanel(objectId, bldg);
          if (window.highlightBuilding) window.highlightBuilding(objectId);
        } else {
          console.log('[Shahapur GIS - Tools] No building polygon intersected. Running view.hitTest fallback...');
          view.hitTest(event).then((response) => {
            if (response.results.length > 0) {
              const hit = response.results.find(r => r.graphic && r.graphic.layer && r.graphic.layer.id === "feature-layer-2") || response.results[0];
              const attr = hit.graphic ? hit.graphic.attributes : null;
              const objectId = (attr && (attr.OBJECTID_1 || attr.OBJECTID)) ? (attr.OBJECTID_1 || attr.OBJECTID) : null;
              const bldg = (objectId && window.BUILDINGS_BY_ID && window.BUILDINGS_BY_ID[objectId]) ? window.BUILDINGS_BY_ID[objectId] : attr;
              console.info('[Shahapur GIS - Tools] HitTest resolved graphic feature with ID:', objectId);
              showPropertyPanel(objectId || 1, bldg);
            }
          });
        }
      }).catch(err => {
        console.warn('[Shahapur GIS - Tools] Building layer query error:', err);
      });
    }
  });
}


function setupSearch(view) {
  console.log('[Shahapur GIS - Tools] Setting up Search tool listener...');
  const searchInput = document.getElementById('map-search-input');
  const resultsContainer = document.getElementById('search-results-list');
  if (!searchInput || !resultsContainer) {
    console.warn('[Shahapur GIS - Tools] Search input or results container missing from DOM.');
    return;
  }

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (!val) {
      resultsContainer.innerHTML = '';
      return;
    }

    // Search only inside the selected ward; nothing is searchable before one is chosen
    const ward = window.getSelectedWard();
    if (!ward) {
      resultsContainer.innerHTML = '<div class="search-item text-muted">Select a Ward first to search its properties.</div>';
      return;
    }
    const matches = window.TaxDataService.searchRecords(val)
      .filter(m => !ward || String(m.wardNo) === ward)
      .slice(0, 10);
    console.log('[Shahapur GIS - Tools] Search for "' + val + '" found', matches.length, 'matches.');
    if (matches.length === 0) {
      resultsContainer.innerHTML = `<div class="search-item text-muted">No properties found matching "${esc(val)}".</div>`;
      return;
    }

    resultsContainer.innerHTML = matches.map(m => `
      <div class="search-item" data-id="${esc(m.propertyId)}">
        <div>
          <div style="font-weight:700; color:#0f172a;">${orNA(m.ownerName)} ${m.ownerNameMarathi ? `<span style="font-weight:normal; color:#64748b;">(${esc(m.ownerNameMarathi)})</span>` : ''}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:0.15rem;">
            Ward ${esc(m.wardNo)} • Prop ${esc(m.propertyNo)}${m.partitionNo ? '/' + esc(m.partitionNo) : ''}
            ${m.propertyNoOld ? ` • Old: <strong style="color:var(--color-primary);">${esc(m.propertyNoOld)}</strong>` : ''}
            ${m.shopNo ? ` • Flat ${esc(m.shopNo)}` : ''}
            • ${money(m.assessedAmount)} (${esc(m.status)})
            ${(m.buildingIds && m.buildingIds.length) ? '' : ' • <em>not mapped</em>'}
          </div>
        </div>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', () => {
        const propId = el.getAttribute('data-id');
        console.info('[Shahapur GIS - Tools] Property item clicked from search list:', propId);
        document.getElementById('map-search-box').classList.add('hidden');
        document.getElementById('tool-search').classList.remove('active');

        // Each unit knows the footprint(s) it was linked to by the data builder
        const targetRec = window.TaxDataService.getByPropertyId(propId);
        const bldgId = targetRec && targetRec.buildingIds && targetRec.buildingIds[0];
        const bldg = (bldgId && window.BUILDINGS_BY_ID) ? window.BUILDINGS_BY_ID[bldgId] : null;

        showPropertyPanel(bldg ? bldg.OBJECTID : propId, bldg, targetRec);
        if (bldg && window.highlightBuilding) window.highlightBuilding(bldg.OBJECTID);
        
        // Fast Zoom to Building in Web Mercator meters
        if (bldg && bldg.centroid_mercator && view) {
          require(["esri/Graphic", "esri/geometry/Point"], (Graphic, Point) => {
            view.graphics.removeAll();
            const pt = new Point({
              x: bldg.centroid_mercator[0],
              y: bldg.centroid_mercator[1],
              spatialReference: { wkid: 3857 }
            });
            const highlightGraphic = new Graphic({
              geometry: pt,
              symbol: {
                type: "simple-marker",
                color: [0, 180, 216, 0.9],
                size: "18px",
                outline: { color: [255, 255, 255], width: 2.5 }
              }
            });
            view.graphics.add(highlightGraphic);
            console.log('[Shahapur GIS - Tools] Centering camera on property Web Mercator coordinate:', pt);
            view.goTo({ target: pt, zoom: 18 });
          });
        }
      });
    });
  });
}

function setupBuffer(view) {
  const btn = document.getElementById('tool-buffer');
  if (!btn) return;

  btn.addEventListener('click', () => {
    window.bufferActive = !window.bufferActive;
    btn.classList.toggle('active');
    console.info('[Shahapur GIS - Tools] Buffer tool toggled. State:', window.bufferActive);

    if (window.bufferActive) {
      alert("Buffer Tool Active: Click anywhere on the map to generate a 100-meter radius buffer zone.");
    } else {
      console.log('[Shahapur GIS - Tools] Cleared buffer graphics from MapView.');
      view.graphics.removeAll();
    }
  });

  view.on("click", (event) => {
    if (!window.bufferActive) return;

    console.log('[Shahapur GIS - Tools] Generating 100m buffer circle at:', event.mapPoint);
    require([
      "esri/Graphic",
      "esri/geometry/geometryEngine",
      "esri/geometry/Circle"
    ], (Graphic, geometryEngine, Circle) => {
      view.graphics.removeAll();

      const circle = new Circle({
        center: event.mapPoint,
        radius: 100,
        radiusUnit: "meters"
      });

      const bufferGraphic = new Graphic({
        geometry: circle,
        symbol: {
          type: "simple-fill",
          color: [0, 180, 216, 0.25],
          outline: {
            color: [0, 180, 216, 0.9],
            width: 2
          }
        }
      });

      const centerGraphic = new Graphic({
        geometry: event.mapPoint,
        symbol: {
          type: "simple-marker",
          color: [239, 68, 68, 0.9],
          size: "8px"
        }
      });

      view.graphics.addMany([bufferGraphic, centerGraphic]);

      // Count the real building footprints (and their register units) inside the buffer
      const buildingLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-2") : null;
      if (!buildingLayer) return;
      buildingLayer.queryFeatures({ geometry: circle, spatialRelationship: "intersects", outFields: ["OBJECTID", "unitsCount"] })
        .then(res => {
          const buildings = res.features.length;
          const units = res.features.reduce((sum, f) => sum + (Number(f.attributes.unitsCount) || 0), 0);
          console.info('[Shahapur GIS - Tools] Buffer: ' + buildings + ' buildings / ' + units + ' units within 100m.');
          alert(`Buffer complete (100 m radius).\n${buildings} building footprints, ${units} registered units inside the buffer.`);
        })
        .catch(err => console.warn('[Shahapur GIS - Tools] Buffer query failed:', err));
    });
  });
}

// ---------------------------------------------------------------------------
// Property Details Panel
//
// One footprint (building) can hold many register units (partitions / flats).
// The panel shows ONE unit at a time with a slider, and every photo / plan shown
// belongs to that exact unit (ward-property-partition), never to a neighbour.
// ---------------------------------------------------------------------------

const PHOTO_DIR = 'Shahapur photos/Shahapur photos/';
const PLAN_DIR = 'PLANS/PLANS_PNG/';

/** Escape text for safe insertion into innerHTML (owner names etc. come from Excel). */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Shown for empty register fields instead of invented placeholder values. */
function orNA(value, suffix = '') {
  const v = value === null || value === undefined ? '' : String(value).trim();
  if (!v || v === '0' || v.toLowerCase() === 'none') return '<span class="data-na">Not recorded</span>';
  return esc(v) + (suffix ? ' ' + suffix : '');
}

const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');

/** "Wing A • Flat 12", "Partition 3" or "Main unit". */
function unitLabel(u) {
  if (!u) return '';
  if (u.shopNo) return (u.wingNo ? `Wing ${u.wingNo} • ` : '') + `Flat / Shop ${u.shopNo}`;
  return u.partitionNo ? `Partition ${u.partitionNo}` : 'Main unit';
}

/** Photo caption from file name: "1-2-3-A.jpg" -> "Photo A". */
function photoLabel(file) {
  const m = String(file).match(/-([A-Z])(?:\s*\((\d+)\))?\.jpg$/i);
  if (/ to /i.test(file)) return 'Building photo';
  return m ? `Photo ${m[1].toUpperCase()}${m[2] ? ' (' + m[2] + ')' : ''}` : 'Photo';
}

/** Resolve the building + units to display from any of the call styles used in the app. */
function resolvePanelData(propertyId, bldgData, selectedUnit) {
  let bldg = bldgData || null;
  if (propertyId && typeof propertyId === 'object') {
    bldg = propertyId.properties || propertyId;
    propertyId = bldg.OBJECTID;
  }
  if (!bldg && window.BUILDINGS_BY_ID) bldg = window.BUILDINGS_BY_ID[propertyId] || null;

  let unit = selectedUnit || null;
  if (!bldg && !unit && window.TaxDataService) unit = window.TaxDataService.getByPropertyId(propertyId);
  if (!bldg && unit && Array.isArray(unit.buildingIds) && unit.buildingIds.length && window.BUILDINGS_BY_ID) {
    bldg = window.BUILDINGS_BY_ID[unit.buildingIds[0]] || null;
  }

  let units = bldg && Array.isArray(bldg.units) ? bldg.units : [];
  // Unit without a mapped footprint: show all units of its property from the register
  if (!units.length && unit && window.TaxDataService) {
    units = window.TaxDataService.getAllByPropertyNo(unit.wardNo, unit.propertyNo);
  }
  const startIdx = unit ? Math.max(0, units.findIndex(u => u.unitKey === unit.unitKey)) : 0;
  return { bldg, units, startIdx };
}

function showPropertyPanel(propertyId, bldgData, selectedUnit) {
  const panel = document.getElementById('property-detail-panel');
  const content = document.getElementById('prop-detail-content');
  if (!panel || !content) {
    console.warn('[Shahapur GIS - Tools] Property detail panel container not found in DOM.');
    return;
  }

  const { bldg, units, startIdx } = resolvePanelData(propertyId, bldgData, selectedUnit);
  if (!bldg && !units.length) {
    content.innerHTML = '<div class="pp-empty">No register record found for this property.</div>';
    panel.classList.remove('hidden');
    return;
  }

  const first = units[0] || {};
  const wardNo = bldg ? bldg.wardNo : first.wardNo;
  const propLabel = bldg ? bldg.propNo : first.propertyNo;
  const title = (bldg && bldg.buildingName) || first.shopBuildingName || first.ownerName || `Property ${propLabel}`;

  window.__currentPropPanelState = { bldg, units, unitIdx: startIdx, mediaMode: 'photos', mediaIdx: 0 };
  console.info('[Shahapur GIS - Tools] Property panel for Ward', wardNo, 'Prop', propLabel, '-', units.length, 'unit(s).');

  content.innerHTML = `
    <div class="pp-header">
      <div class="pp-eyebrow">Ward ${esc(wardNo)} • Property ${esc(propLabel)}</div>
      <h3 class="pp-title">${esc(title)}</h3>
      ${bldg && !units.length ? `<div class="pp-note"><i class="ph ph-warning"></i> This footprint is not tagged with a register property (tag: "${esc(bldg.newPropNo || '—')}").</div>` : ''}
    </div>

    ${units.length > 1 ? `
      <div class="pp-slider" aria-label="Partition slider">
        <div class="pp-slider-row">
          <button class="unit-slider-btn" data-action="unit-step" data-delta="-1" title="Previous partition (←)"><i class="ph ph-caret-left"></i></button>
          <div class="pp-slider-label">
            <span class="unit-slider-badge">UNIT <span id="pp-unit-num">1</span> / ${units.length}</span>
            <span class="pp-slider-name" id="pp-unit-name"></span>
          </div>
          <button class="unit-slider-btn" data-action="unit-step" data-delta="1" title="Next partition (→)"><i class="ph ph-caret-right"></i></button>
        </div>
        <input type="range" class="pp-range" id="pp-unit-range" min="0" max="${units.length - 1}" step="1" value="0" aria-label="Choose partition">
        <select class="pp-jump" id="pp-unit-jump" aria-label="Jump to partition">
          ${units.map((u, i) => `<option value="${i}">${esc(unitLabel(u))}${u.propertyNoOld ? ' [Old ' + esc(u.propertyNoOld) + ']' : ''} — ${esc(u.ownerName || 'Owner not recorded')}</option>`).join('')}
        </select>
      </div>
    ` : ''}

    <div id="pp-unit"></div>

    <div class="pp-footer">
      <span><i class="ph ph-database"></i> Shahapur Municipal Register</span>
      <button class="btn btn-secondary btn-sm" data-action="close">Close</button>
    </div>
  `;

  // Event delegation keeps the markup free of inline JS (and of injected owner names)
  content.onclick = onPanelClick;
  const range = document.getElementById('pp-unit-range');
  const jump = document.getElementById('pp-unit-jump');
  if (range) range.oninput = e => window.goToPropUnit(parseInt(e.target.value, 10));
  if (jump) jump.onchange = e => window.goToPropUnit(parseInt(e.target.value, 10));

  window.goToPropUnit(startIdx);
  panel.classList.remove('hidden');
}

function onPanelClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const state = window.__currentPropPanelState;
  const unit = state && state.units[state.unitIdx];
  switch (el.dataset.action) {
    case 'unit-step': window.slidePropUnit(parseInt(el.dataset.delta, 10)); break;
    case 'media-mode': state.mediaMode = el.dataset.mode; state.mediaIdx = 0; renderUnitMedia(); break;
    case 'media-pick':  // clicking any thumbnail selects it and opens it expanded
      state.mediaIdx = parseInt(el.dataset.idx, 10);
      renderUnitMedia();
      openUnitMediaViewer();
      break;
    case 'media-open': openUnitMediaViewer(); break;
    case 'print': if (unit) window.printPropertyCard(unit.propertyId); break;
    case 'details': if (unit && window.viewPropertyAssessmentModal) window.viewPropertyAssessmentModal(unit.propertyId); break;
    case 'close': window.resetSidePanel(); break;
  }
}

window.slidePropUnit = function(delta) {
  const state = window.__currentPropPanelState;
  if (state) window.goToPropUnit(state.unitIdx + delta);
};

window.goToPropUnit = function(idx) {
  const state = window.__currentPropPanelState;
  if (!state || !state.units.length || isNaN(idx) || idx < 0 || idx >= state.units.length) return;
  state.unitIdx = idx;
  state.mediaIdx = 0;
  const u = state.units[idx];
  state.mediaMode = (u.photos && u.photos.length) ? 'photos' : 'plans';

  const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
  set('pp-unit-num', el => { el.textContent = String(idx + 1); });
  set('pp-unit-name', el => { el.textContent = unitLabel(u); });
  set('pp-unit-range', el => { el.value = idx; });
  set('pp-unit-jump', el => { el.value = idx; });
  document.querySelectorAll('#prop-detail-content [data-action="unit-step"]').forEach(btn => {
    btn.disabled = (btn.dataset.delta === '-1') ? idx === 0 : idx === state.units.length - 1;
  });

  renderUnitCard(u);
};

function renderUnitCard(u) {
  const box = document.getElementById('pp-unit');
  if (!box) return;
  const area = u.buildupAreaSqMtr ? `${u.buildupAreaSqMtr} sq.m (${u.buildupAreaSqFt} sq.ft)` : '';
  const amenities = [
    ['waterConnection', 'ph-drop', 'Water'], ['borewell', 'ph-waves', 'Borewell'],
    ['solar', 'ph-sun', 'Solar'], ['rainwaterHarvesting', 'ph-cloud-rain', 'Rainwater'], ['lift', 'ph-arrows-down-up', 'Lift']
  ];
  const linkNote = u.linkType === 'inferred'
    ? 'Footprint inferred: this partition is not named in the shapefile tag (tag text was cut off).'
    : u.linkType === 'parent'
      ? 'This footprint is a structure of the property; the register has no separate row for it, so the main record is shown.'
      : '';

  box.innerHTML = `
    <div class="pp-unit">
      <div class="pp-unit-head">
        <div>
          <div class="pp-unit-tags">
            <span class="prop-unit-flat-badge">${esc(unitLabel(u))}</span>
            <span class="prop-unit-old-badge">Key ${esc(u.unitKey || '')}</span>
            ${u.propertyNoOld ? `<span class="prop-unit-old-badge">Old ${esc(u.propertyNoOld)}</span>` : ''}
          </div>
          <div class="pp-owner">${orNA(u.ownerName)}</div>
          ${u.ownerNameMarathi ? `<div class="pp-owner-mr">${esc(u.ownerNameMarathi)}</div>` : ''}
        </div>
        <span class="status-badge ${u.status === 'Assessed' ? 'paid' : 'pending'}">${esc(u.status)}</span>
      </div>
      ${linkNote ? `<div class="pp-note"><i class="ph ph-info"></i> ${esc(linkNote)}</div>` : ''}

      <div id="pp-media"></div>

      <div class="pp-grid">
        <span>Usage</span><strong>${orNA(u.description)}</strong>
        <span>Built-up area</span><strong>${area ? esc(area) : orNA('')}</strong>
        <span>Plot area</span><strong>${u.plotAreaSqMtr ? esc(u.plotAreaSqMtr) + ' sq.m' : orNA('')}</strong>
        <span>City survey / Gat</span><strong>${orNA(u.citySurveyGatNo)}</strong>
        <span>Address</span><strong>${orNA(u.ownerAddress || u.ownerAddressMarathi)}</strong>
        <span>Contact</span><strong>${orNA(u.contactNo)}</strong>
      </div>

      <div class="pp-tax">
        <div><span>Tax demand</span><strong>${money(u.assessedAmount)}</strong></div>
        <div><span>Rateable value</span><strong>${money(u.rvOld)}</strong></div>
        <div><span>Property tax (old)</span><strong>${money(u.propertyTaxOld)}</strong></div>
      </div>

      <div class="pp-amenities">
        ${amenities.map(([k, icon, label]) => `<span class="prop-badge-pill ${u[k] === 'Yes' ? 'on' : ''}"><i class="ph ${icon}"></i> ${label}: ${u[k] === 'Yes' ? 'Yes' : 'No'}</span>`).join('')}
      </div>

      <div class="pp-actions">
        <button class="btn btn-primary btn-sm" data-action="print"><i class="ph ph-printer"></i> Print card</button>
        <button class="btn btn-secondary btn-sm" data-action="details"><i class="ph ph-eye"></i> Full details</button>
      </div>
    </div>
  `;
  renderUnitMedia();
}

/** Photos / plan of the active unit only. */
function renderUnitMedia() {
  const state = window.__currentPropPanelState;
  const box = document.getElementById('pp-media');
  if (!state || !box) return;
  const u = state.units[state.unitIdx];
  const photos = u.photos || [];
  const plans = u.plans || (u.plan ? [u.plan] : []);
  if (!photos.length && !plans.length) {
    box.innerHTML = '<div class="pp-media-empty"><i class="ph ph-image-broken"></i> No photo or plan recorded for this unit</div>';
    return;
  }
  const isPlan = state.mediaMode === 'plans' && plans.length;
  const items = isPlan ? plans : photos;
  const file = items[Math.min(state.mediaIdx, items.length - 1)];
  const src = encodeURI((isPlan ? PLAN_DIR : PHOTO_DIR) + file);

  box.innerHTML = `
    <div class="pp-media-tabs">
      <button class="prop-media-tab ${!isPlan ? 'active' : ''}" data-action="media-mode" data-mode="photos" ${photos.length ? '' : 'disabled'}>
        <i class="ph ph-camera"></i> Photos <span class="badge">${photos.length}</span></button>
      <button class="prop-media-tab ${isPlan ? 'active' : ''}" data-action="media-mode" data-mode="plans" ${plans.length ? '' : 'disabled'}>
        <i class="ph ph-blueprint"></i> Plan <span class="badge">${plans.length}</span></button>
    </div>
    <div class="pp-media-hero ${isPlan ? 'is-plan' : ''}" data-action="media-open" title="Open viewer with zoom">
      <img src="${src}" alt="${esc(isPlan ? 'Plan' : photoLabel(file))} of ${esc(u.unitKey)}" loading="lazy"
           onerror="this.closest('.pp-media-hero').classList.add('is-missing')">
      <span class="pp-media-caption"><i class="ph ${isPlan ? 'ph-blueprint' : 'ph-camera'}"></i> ${esc(isPlan ? 'Plan' : photoLabel(file))}</span>
      <span class="pp-media-zoom"><i class="ph ph-magnifying-glass-plus"></i> Zoom</span>
    </div>
    ${items.length > 1 ? `
      <div class="pp-thumbs">
        ${items.map((f, i) => `<button class="pp-thumb ${f === file ? 'active' : ''}" data-action="media-pick" data-idx="${i}" title="${esc(f)}">
          <img src="${encodeURI((isPlan ? PLAN_DIR : PHOTO_DIR) + f)}" alt="" loading="lazy"><span>${esc(isPlan ? 'Plan ' + (i + 1) : photoLabel(f).replace('Photo ', ''))}</span></button>`).join('')}
      </div>` : ''}
  `;
}

function openUnitMediaViewer() {
  const state = window.__currentPropPanelState;
  if (!state || !window.openMediaViewer) return;
  const u = state.units[state.unitIdx];
  window.openMediaViewer({
    photos: u.photos || [],
    plans: u.plans || (u.plan ? [u.plan] : []),
    mode: state.mediaMode,
    index: state.mediaIdx,
    caption: `Ward ${u.wardNo} • Property ${u.propertyNo} • ${unitLabel(u)}`
  });
}

// Official Printable Municipal Property Assessment Card / Sheet Generator
window.printPropertyCard = function(propertyIdentifier, wardNo) {
  console.info('[Shahapur GIS - Tools] Generating official assessment printable sheet for:', propertyIdentifier, 'Ward:', wardNo);
  const printModal = document.getElementById('property-print-modal');
  const printableContainer = document.getElementById('printable-property-card');
  if (!printModal || !printableContainer) {
    console.error('[Shahapur GIS - Tools] Print modal containers missing from DOM.');
    return;
  }

  // The card is always for one register unit, looked up by its unique propertyId (ownerID)
  const rec = window.TaxDataService ? window.TaxDataService.getByPropertyId(propertyIdentifier) : null;
  if (!rec) {
    alert("Property record details could not be found for assessment printing.");
    return;
  }
  const bldg = (rec.buildingIds && rec.buildingIds.length && window.BUILDINGS_BY_ID) ? window.BUILDINGS_BY_ID[rec.buildingIds[0]] : null;

  const wNo = esc(rec.wardNo);
  const pNo = esc(rec.propertyNo + (rec.partitionNo ? '/' + rec.partitionNo : ''));
  const pOld = esc(rec.propertyNoOld);
  const ownerEn = rec.ownerName;
  const ownerMr = rec.ownerNameMarathi;
  const bldgName = rec.shopBuildingName || (bldg ? bldg.buildingName : '');
  const flatNo = unitLabel(rec);
  const address = rec.ownerAddress || rec.ownerAddressMarathi;
  const gatNo = esc(rec.citySurveyGatNo);
  const desc = rec.description;
  const phone = esc(rec.contactNo);
  const assessed = Number(rec.assessedAmount || 0);
  const status = esc(rec.status);
  const areaMtr = rec.buildupAreaSqMtr;
  const areaFt = rec.buildupAreaSqFt;
  const plotMtr = rec.plotAreaSqMtr;

  // Photo and plan of this exact unit only
  const photoFile = (rec.photos && rec.photos[0]) || null;
  const planFile = (rec.plans && rec.plans[0]) || rec.plan || null;

  function fmtPrintVal(v) {
    const s = v === null || v === undefined ? '' : String(v).trim();
    if (!s || s === '0' || s.toLowerCase() === 'none') return '<span class="data-na">Not recorded</span>';
    return `<strong>${esc(s)}</strong>`;
  }

  // Populate Printable Municipal Sheet
  printableContainer.innerHTML = `
    <!-- Municipal Emblem & Official Header -->
    <div class="official-header">
      <div class="official-crest">
        <i class="ph ph-buildings"></i>
      </div>
      <h2>शहापूर नगरपंचायत, शहापूर (जि. ठाणे)</h2>
      <h3>SHAHAPUR NAGAR PANCHAYAT, SHAHAPUR (DIST. THANE)</h3>
      <p>मालमत्ता कर आकारणी व पाहणी नोंदणी अधिकृत पत्रक (२०२५–२०२६)</p>
      <div class="official-doc-title">
        Official Municipal Property Assessment & Survey Verification Card
      </div>
    </div>

    <!-- Key Identification Grid -->
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.65rem 1rem; margin-bottom:1rem; display:grid; grid-template-columns: repeat(4, 1fr); gap:0.5rem; text-align:center;">
      <div>
        <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase;">Ward Number</div>
        <div style="font-size:1.05rem; font-weight:800; color:var(--color-primary); margin-top:0.15rem;">Ward ${wNo}</div>
      </div>
      <div>
        <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase;">New Assessment No</div>
        <div style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:0.15rem;">Property #${pNo}</div>
      </div>
      <div>
        <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase;">Old Property Number</div>
        <div style="font-size:0.95rem; font-weight:800; color:#0284c7; margin-top:0.15rem;">${pOld ? pOld : '<span class="data-na">Information Not Available</span>'}</div>
      </div>
      <div>
        <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase;">City Survey / Gat No</div>
        <div style="font-size:0.95rem; font-weight:800; color:#0f172a; margin-top:0.15rem;">${gatNo ? gatNo : '<span class="data-na">Information Not Available</span>'}</div>
      </div>
    </div>

    <!-- Section: Owner & Location Particulars -->
    <div class="official-section-title">
      <i class="ph ph-user"></i> 1. Owner & Property Particulars / मालमत्ता धारकाची माहिती
    </div>
    <div class="official-grid">
      <div class="official-grid-item">
        <span class="label">Owner Name (English):</span>
        <span class="val">${fmtPrintVal(ownerEn)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">धारक नाव (मराठी):</span>
        <span class="val">${fmtPrintVal(ownerMr)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Building / Society:</span>
        <span class="val">${fmtPrintVal(bldgName)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Flat / Shop / Unit No:</span>
        <span class="val">${fmtPrintVal(flatNo)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Property Address / पत्ता:</span>
        <span class="val" style="max-width:250px;">${fmtPrintVal(address)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Contact Phone / दूरध्वनी:</span>
        <span class="val">${phone ? '+91 ' + phone : '<span class="data-na">Information Not Available</span>'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Category of Use / वापर:</span>
        <span class="val">${fmtPrintVal(desc)}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Built-up Area / क्षेत्रफळ:</span>
        <span class="val">${areaMtr ? `${areaMtr} sq.m (${areaFt} sq.ft)` : '<span class="data-na">Information Not Available</span>'}</span>
      </div>
    </div>

    <!-- Section: Side-by-Side Survey Photo & Floor Plan Evidence -->
    <div class="official-section-title">
      <i class="ph ph-image"></i> 2. Photographic Evidence & Architectural Floor Plan / छायाचित्र व आराखडा
    </div>
    <div class="official-media-row">
      <div class="official-media-box">
        ${photoFile ? `
          <img src="${encodeURI('Shahapur photos/Shahapur photos/' + photoFile)}" alt="Survey Photo">
          <div class="official-media-caption">
            <i class="ph ph-camera"></i> Field Survey Photo: ${esc(photoFile)}
          </div>
        ` : `
          <div style="height:170px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.8rem; font-style:italic; background:#f8fafc;">
            Field Survey Photographic Asset Not Available
          </div>
          <div class="official-media-caption">Field Survey Photo: N/A</div>
        `}
      </div>

      <div class="official-media-box">
        ${planFile ? `
          <img src="${encodeURI('PLANS/PLANS_PNG/' + planFile)}" alt="Floor Plan">
          <div class="official-media-caption">
            <i class="ph ph-blueprint"></i> Architectural / Cadastral Plan: ${esc(planFile)}
          </div>
        ` : `
          <div style="height:170px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.8rem; font-style:italic; background:#f8fafc;">
            Architectural Floor Plan Not Available
          </div>
          <div class="official-media-caption">Cadastral Plan: N/A</div>
        `}
      </div>
    </div>

    <!-- Section: Civic Amenities & Infrastructure -->
    <div class="official-section-title">
      <i class="ph ph-check-square"></i> 3. Infrastructure & Civic Amenities Checklist / नागरी सुविधांची स्थिती
    </div>
    <div class="official-grid" style="margin-bottom:1rem;">
      <div class="official-grid-item">
        <span class="label">Nagar Panchayat Water Connection:</span>
        <span class="val">${rec ? rec.waterConnection : 'No'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Borewell Installation:</span>
        <span class="val">${rec ? rec.borewell : 'No'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Solar Power / Water Heating:</span>
        <span class="val">${rec ? rec.solar : 'No'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Rainwater Harvesting Unit:</span>
        <span class="val">${rec ? rec.rainwaterHarvesting : 'No'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Elevator / Lift Facility:</span>
        <span class="val">${rec ? rec.lift : 'No'}</span>
      </div>
      <div class="official-grid-item">
        <span class="label">Plot Ground Area:</span>
        <span class="val">${plotMtr ? `${plotMtr} sq.m` : '<span class="data-na">Information Not Available</span>'}</span>
      </div>
    </div>

    <!-- Section: Tax Assessment & Demand -->
    <div class="official-section-title">
      <i class="ph ph-currency-inr"></i> 4. Municipal Tax Assessment & Demand Ledger / कर आकारणी तपशील
    </div>
    <div style="border:1px solid #cbd5e1; border-radius:6px; overflow:hidden; margin-bottom:1rem;">
      <table style="width:100%; border-collapse:collapse; font-size:0.825rem; text-align:left;">
        <thead style="background:#f1f5f9; border-bottom:1px solid #cbd5e1;">
          <tr>
            <th style="padding:0.5rem 0.75rem;">Assessment Cycle</th>
            <th style="padding:0.5rem 0.75rem; text-align:right;">Total Tax Demand</th>
            <th style="padding:0.5rem 0.75rem; text-align:right;">Rateable Value (RV)</th>
            <th style="padding:0.5rem 0.75rem; text-align:right;">Property Tax (Old)</th>
            <th style="padding:0.5rem 0.75rem; text-align:center;">Assessment Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:0.6rem 0.75rem; font-weight:600;">FY 2025–2026</td>
            <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:800; color:var(--color-primary);">₹${assessed.toLocaleString()}</td>
            <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:700; color:#0284c7;">₹${Number(rec ? (rec.rvOld || 0) : 0).toLocaleString()}</td>
            <td style="padding:0.6rem 0.75rem; text-align:right; font-weight:700; color:#059669;">₹${Number(rec ? (rec.propertyTaxOld || 0) : 0).toLocaleString()}</td>
            <td style="padding:0.6rem 0.75rem; text-align:center;">
              <span class="status-badge ${status === 'Assessed' ? 'paid' : 'pending'}" style="font-size:0.68rem; padding:0.15rem 0.45rem;">
                ${status}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Official Certification & Signatures -->
    <div class="official-signatures">
      <div class="official-sign-box">
        <div class="official-sign-line"></div>
        <strong>Field Surveyor / Assessor</strong>
        <div style="color:#64748b; font-size:0.7rem; margin-top:0.15rem;">GIS Survey Wing, Shahapur</div>
      </div>
      <div class="official-sign-box" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div style="width:65px; height:65px; border:2px dashed #94a3b8; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.65rem; text-align:center; padding:0.25rem;">
          MUNICIPAL SEAL
        </div>
      </div>
      <div class="official-sign-box">
        <div class="official-sign-line"></div>
        <strong>Chief Officer / Kar Adhikari</strong>
        <div style="color:#64748b; font-size:0.7rem; margin-top:0.15rem;">Shahapur Nagar Panchayat</div>
      </div>
    </div>
  `;

  // Open Modal
  printModal.classList.add('active');
  printModal.onclick = (e) => {
    if (e.target.id === 'property-print-modal') {
      printModal.classList.remove('active');
    }
  };
};

window.resetSidePanel = function() {
  const panel = document.getElementById('property-detail-panel');
  if (panel) panel.classList.add('hidden');
  if (window.clearBuildingHighlight) window.clearBuildingHighlight();
};

window.showPropertyPanel = showPropertyPanel;




// Keyboard: ← / → move through partitions while the property panel is open
// (the lightbox handles its own arrow keys while it is open).
document.addEventListener('keydown', (e) => {
  const panel = document.getElementById('property-detail-panel');
  const lightbox = document.getElementById('photo-lightbox-modal');
  if (!panel || panel.classList.contains('hidden')) return;
  if (lightbox && lightbox.classList.contains('active')) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') window.slidePropUnit(-1);
  if (e.key === 'ArrowRight') window.slidePropUnit(1);
});

/**
 * Open the media viewer for one register unit by its propertyId (ownerID).
 * mode: 'photos' | 'plans'; index: which image to start with.
 * Used by the Tax Records table / modal so they never mix images of other units.
 */
window.openUnitMedia = function(propertyId, mode, index) {
  const u = window.TaxDataService ? window.TaxDataService.getByPropertyId(propertyId) : null;
  if (!u || !window.openMediaViewer) return;
  window.openMediaViewer({
    photos: u.photos || [],
    plans: u.plans || (u.plan ? [u.plan] : []),
    mode: mode || 'photos',
    index: index || 0,
    caption: `Ward ${u.wardNo} • Property ${u.propertyNo} • ${unitLabel(u)}`
  });
};
