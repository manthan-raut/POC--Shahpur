// js/layers.js

let googleHybridLayer = null;
let googleSatelliteLayer = null;
let mahaDistWMSLayer = null;
let mahaTalukaWMSLayer = null;

window.initLayers = function() {
  // Initialize External Tile & WMS Layers
  require(["esri/layers/WebTileLayer", "esri/layers/WMSLayer"], (WebTileLayer, WMSLayer) => {
    const targetMap = window.appMap || appMap;
    if (!googleSatelliteLayer && targetMap && typeof targetMap.add === 'function') {
      googleSatelliteLayer = new WebTileLayer({
        urlTemplate: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        title: "Google Satellite",
        visible: false
      });
      targetMap.add(googleSatelliteLayer, 0);

      googleHybridLayer = new WebTileLayer({
        urlTemplate: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        title: "Google Hybrid",
        visible: false
      });
      targetMap.add(googleHybridLayer, 1);

      mahaDistWMSLayer = new WMSLayer({
        url: "https://geo.mrsac.org.in/geoserver/admin_boundary/wms",
        sublayers: [{ name: "admin_boundary:district" }],
        title: "Maha District Boundary",
        visible: false
      });
      targetMap.add(mahaDistWMSLayer);

      mahaTalukaWMSLayer = new WMSLayer({
        url: "https://geo.mrsac.org.in/geoserver/admin_boundary/wms",
        sublayers: [{ name: "admin_boundary:taluka" }],
        title: "Maha Taluka Boundary",
        visible: false
      });
      targetMap.add(mahaTalukaWMSLayer);
    }

    // Build Layer UI with Opacity Sliders & Bulk Controls
    buildLayerUI();
    
    // Ensure default state: ONLY Council Boundary Layer (Layer #0) is turned ON
    applyWardSpatialMask('All');
  });

  // Dynamic Live Ward Fetching & Spatial Masking
  fetchLiveWardsAndSetupFilter();
};


// Cache fetched Ward geometries in memory for instant switching (0ms latency)
window.wardGeomCache = window.wardGeomCache || {};

function fetchLiveWardsAndSetupFilter() {
  const wardSelect = document.getElementById('ward-select');
  if (!wardSelect) return;

  const wardFeatureLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-14") : null;
  
  if (wardFeatureLayer) {
    // Dynamic Ward Fetching from Layer #14
    wardFeatureLayer.when(() => {
      wardFeatureLayer.queryFeatures({
        where: "1=1",
        outFields: ["Ward_No"],
        returnGeometry: true,
        outSpatialReference: appView ? appView.spatialReference : null
      }).then(res => {
        if (res && res.features && res.features.length > 0) {
          const wardNumbers = new Set();
          res.features.forEach(f => {
            const wNo = f.attributes.Ward_No;
            if (wNo !== undefined && wNo !== null) {
              const strNo = wNo.toString().trim();
              wardNumbers.add(strNo);
              // Pre-cache geometry in background for instant 0ms responses
              if (f.geometry) {
                window.wardGeomCache[strNo] = f.geometry;
              }
            }
          });

          const sortedWards = Array.from(wardNumbers).sort((a, b) => {
            const numA = parseInt(a), numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          });

          if (sortedWards.length > 0) {
            wardSelect.innerHTML = `<option value="All">Select Ward / Village</option>`;
            sortedWards.forEach(wNo => {
              const opt = document.createElement('option');
              opt.value = wNo;
              opt.innerText = `Ward ${wNo}`;
              wardSelect.appendChild(opt);
            });
          }
        }
      }).catch(err => console.warn("Live ward query fallback to defaults", err));
    });
  }

  // Setup Ward Spatial Focus & Masking (FeatureEffect & FeatureFilter)
  wardSelect.addEventListener('change', (e) => {
    const wardNo = e.target.value;
    applyWardSpatialMask(wardNo);
  });
}

function applyWardSpatialMask(wardNo) {
  require([
    "esri/layers/support/FeatureEffect",
    "esri/layers/support/FeatureFilter",
    "esri/Graphic"
  ], (FeatureEffect, FeatureFilter, Graphic) => {
    
    // Clear existing highlight graphics
    if (window.highlightGraphicsLayer) {
      window.highlightGraphicsLayer.removeAll();
    }

    const wardFeatureLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-14") : null;

    if (!wardNo || wardNo === 'All') {
      // WHEN "Select Ward / Village" IS SELECTED: TURN ON COUNCIL BOUNDARY LAYER ONLY!
      if (wardFeatureLayer) wardFeatureLayer.definitionExpression = null;
      
      if (window.featureGroupLayer) {
        window.featureGroupLayer.layers.forEach(fl => {
          fl.featureEffect = null;
          if (fl.id === "feature-layer-0") {
            fl.visible = true;
          } else {
            fl.visible = false;
          }
        });
      }

      syncLayerUICheckboxes({ 0: true });
      if (window.zoomToFullDatasetExtent) window.zoomToFullDatasetExtent();
      if (window.hideMapLoader) window.hideMapLoader();
      return;
    }

    if (!wardFeatureLayer) return;

    // Show Map Loading Overlay
    if (window.showMapLoader) window.showMapLoader(`Filtering Ward ${wardNo} Data...`);

    // Enable Google Satellite / Hybrid layer when ward selected
    if (googleSatelliteLayer) googleSatelliteLayer.visible = true;

    // Filter Layer #14 (Ward Boundary) to show ONLY the selected Ward polygon
    wardFeatureLayer.definitionExpression = `Ward_No = '${wardNo}'`;
    wardFeatureLayer.visible = false; // Hide default ward boundary to display clean cyan highlight graphic

    // Turn ON Building (Layer #2) & Council Boundary (Layer #0)
    const buildingLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-2") : null;
    if (buildingLayer) buildingLayer.visible = true;

    const councilLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-0") : null;
    if (councilLayer) councilLayer.visible = true;

    syncLayerUICheckboxes({ 0: true, 2: true });

    // Helper function to apply geometry mask and camera zoom
    const processWardGeometry = (wardGeom) => {
      const wardEffect = new FeatureEffect({
        filter: new FeatureFilter({
          geometry: wardGeom,
          spatialRelationship: "intersects"
        }),
        excludedEffect: "opacity(0%)" // Completely hide non-selected ward data & buildings outside
      });

      if (window.featureGroupLayer) {
        window.featureGroupLayer.layers.forEach(fl => {
          if (fl.id === "feature-layer-0") {
            fl.featureEffect = null;
          } else {
            fl.featureEffect = wardEffect;
          }
        });
      }

      // Draw Cyan Highlight Boundary Graphic around selected Ward
      const highlightGraphic = new Graphic({
        geometry: wardGeom,
        symbol: {
          type: "simple-fill",
          color: [0, 180, 216, 0.08],
          outline: {
            color: "#00B4D8", // Cyan / Sky Blue boundary stroke
            width: 4
          }
        }
      });

      if (window.highlightGraphicsLayer) {
        window.highlightGraphicsLayer.add(highlightGraphic);
      }

      // Fast Camera Zoom to Selected Ward Extent
      if (wardGeom && wardGeom.extent && appView) {
        appView.goTo(wardGeom.extent.expand(1.22), { duration: 600 }).then(() => {
          if (window.hideMapLoader) window.hideMapLoader();
        }).catch(() => {
          if (window.hideMapLoader) window.hideMapLoader();
        });
      } else {
        if (window.hideMapLoader) window.hideMapLoader();
      }
    };

    // Fast Execution: Check Memory Cache First (0ms Response!)
    if (window.wardGeomCache[wardNo]) {
      processWardGeometry(window.wardGeomCache[wardNo]);
      return;
    }

    // Query MapServer Layer #14 if not cached
    wardFeatureLayer.queryFeatures({
      where: `Ward_No = '${wardNo}'`,
      returnGeometry: true,
      outSpatialReference: appView ? appView.spatialReference : null
    }).then(res => {
      if (res && res.features && res.features.length > 0) {
        const wardFeature = res.features[0];
        const wardGeom = wardFeature.geometry;
        window.wardGeomCache[wardNo] = wardGeom; // Save to cache
        processWardGeometry(wardGeom);
      } else {
        if (window.hideMapLoader) window.hideMapLoader();
      }
    }).catch(err => {
      console.warn("Error querying ward spatial geometry", err);
      if (window.hideMapLoader) window.hideMapLoader();
    });

  });
}


function syncLayerUICheckboxes(activeMap) {
  const container = document.getElementById('layer-list');
  if (!container) return;

  container.querySelectorAll('.layer-chk').forEach(chk => {
    const layerId = chk.id.replace('layer-chk-', '');
    if (activeMap[layerId]) {
      chk.checked = true;
    } else if (chk.id.startsWith('layer-chk-')) {
      chk.checked = false;
    }
  });
}



function buildLayerUI() {
  const layerListContainer = document.getElementById('layer-list');
  if (!layerListContainer) return;
  layerListContainer.innerHTML = '';

  // Bulk Control Buttons (Show All / Hide All)
  const bulkRow = document.createElement('div');
  bulkRow.className = 'layer-bulk-btn-row';
  bulkRow.innerHTML = `
    <button class="btn-bulk-toggle" id="btn-show-all-layers"><i class="ph ph-eye"></i> Show All</button>
    <button class="btn-bulk-toggle" id="btn-hide-all-layers"><i class="ph ph-eye-slash"></i> Hide All</button>
  `;
  layerListContainer.appendChild(bulkRow);

  bulkRow.querySelector('#btn-show-all-layers').addEventListener('click', () => {
    if (window.featureGroupLayer) {
      window.featureGroupLayer.layers.forEach(fl => { fl.visible = true; });
    }
    layerListContainer.querySelectorAll('.layer-chk').forEach(chk => chk.checked = true);
  });

  bulkRow.querySelector('#btn-hide-all-layers').addEventListener('click', () => {
    if (window.featureGroupLayer) {
      window.featureGroupLayer.layers.forEach(fl => { fl.visible = false; });
    }
    layerListContainer.querySelectorAll('.layer-chk').forEach(chk => chk.checked = false);
  });

  // Group layers
  const groups = {};
  LAYER_DEFS.forEach(l => {
    if (!groups[l.group]) groups[l.group] = [];
    groups[l.group].push(l);
  });

  // Create UI for Operational Feature Layers with Opacity Sliders
  Object.keys(groups).forEach(groupName => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'layer-group';
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'layer-group-title';
    groupTitle.innerText = groupName;
    groupDiv.appendChild(groupTitle);
    
    groups[groupName].forEach(layerDef => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'layer-item-card';
      
      const fl = window.featureGroupLayer ? window.featureGroupLayer.findLayerById(`feature-layer-${layerDef.id}`) : null;

      itemDiv.innerHTML = `
        <div class="layer-item-top">
          <label class="layer-item-label">
            <input type="checkbox" class="layer-chk" id="layer-chk-${layerDef.id}" ${layerDef.defaultVisibility ? 'checked' : ''}>
            <span>${layerDef.title}</span>
          </label>
          <span class="opacity-val-badge" id="opacity-val-${layerDef.id}">100%</span>
        </div>
        <div class="layer-opacity-row">
          <i class="ph ph-circle-half"></i>
          <input type="range" class="layer-opacity-slider" id="opacity-slider-${layerDef.id}" min="0.1" max="1.0" step="0.05" value="1.0">
        </div>
      `;

      const checkbox = itemDiv.querySelector(`#layer-chk-${layerDef.id}`);
      checkbox.addEventListener('change', (e) => {
        if (fl) fl.visible = e.target.checked;
      });

      const opacitySlider = itemDiv.querySelector(`#opacity-slider-${layerDef.id}`);
      const opacityBadge = itemDiv.querySelector(`#opacity-val-${layerDef.id}`);
      opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (fl) fl.opacity = val;
        opacityBadge.innerText = `${Math.round(val * 100)}%`;
      });

      groupDiv.appendChild(itemDiv);
    });
    
    layerListContainer.appendChild(groupDiv);
  });

  // External Layers Group (Google Satellite & MRSAC WMS)
  const extGroupDiv = document.createElement('div');
  extGroupDiv.className = 'layer-group';
  extGroupDiv.innerHTML = `<div class="layer-group-title">Base & Admin Layers</div>`;

  const extLayers = [
    { title: "Google Satellite", getLayer: () => googleSatelliteLayer },
    { title: "Google Hybrid", getLayer: () => googleHybridLayer },
    { title: "Maha District WMS", getLayer: () => mahaDistWMSLayer },
    { title: "Maha Taluka WMS", getLayer: () => mahaTalukaWMSLayer }
  ];

  extLayers.forEach((ext, i) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'layer-item-card';
    itemDiv.innerHTML = `
      <div class="layer-item-top">
        <label class="layer-item-label">
          <input type="checkbox" class="layer-chk" id="ext-chk-${i}">
          <span>${ext.title}</span>
        </label>
      </div>
    `;

    const checkbox = itemDiv.querySelector(`#ext-chk-${i}`);
    checkbox.addEventListener('change', (e) => {
      const lyr = ext.getLayer();
      if (lyr) lyr.visible = e.target.checked;
    });

    extGroupDiv.appendChild(itemDiv);
  });

  layerListContainer.appendChild(extGroupDiv);
}

