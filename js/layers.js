// js/layers.js

console.log('[Shahapur GIS - Layers] Loading layers.js module...');

let googleHybridLayer = null;
let googleSatelliteLayer = null;
let mahaDistWMSLayer = null;
let mahaTalukaWMSLayer = null;

window.initLayers = function() {
  console.info('[Shahapur GIS - Layers] window.initLayers() called. Setting up tile layers, WMS, and UI...');

  // Pre-cache Ward Geometries from local synthesized data in Web Mercator (WKID 3857)
  if (window.SHAHAPUR_WARDS_DATA && window.SHAHAPUR_WARDS_DATA.features) {
    require(["esri/geometry/Polygon"], (Polygon) => {
      window.SHAHAPUR_WARDS_DATA.features.forEach(f => {
        const wNo = String(f.properties.Ward_No);
        const rings = (f.geometry_mercator && f.geometry_mercator.coordinates) ? f.geometry_mercator.coordinates : f.geometry.coordinates;
        window.wardGeomCache[wNo] = new Polygon({
          rings: rings,
          spatialReference: { wkid: 3857 }
        });
      });
      console.info('[Shahapur GIS - Layers] Pre-cached Web Mercator geometries for Wards 1 to 5 from local dataset.');
    });
  }

  // Initialize External Tile & WMS Layers
  require(["esri/layers/WebTileLayer", "esri/layers/WMSLayer"], (WebTileLayer, WMSLayer) => {
    const targetMap = window.appMap || appMap;
    if (!googleSatelliteLayer && targetMap && typeof targetMap.add === 'function') {
      console.log('[Shahapur GIS - Layers] Creating Google Satellite & Hybrid WebTileLayers and MRSAC WMS layers...');
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
      console.info('[Shahapur GIS - Layers] Successfully added 4 external base & administrative layers.');
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
  if (!wardSelect) {
    console.warn('[Shahapur GIS - Layers] #ward-select element not found in DOM.');
    return;
  }

  const wardFeatureLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-14") : null;
  
  if (wardFeatureLayer) {
    console.log('[Shahapur GIS - Layers] Querying live Ward_No attributes from FeatureLayer 14...');
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

          console.info('[Shahapur GIS - Layers] Retrieved and cached', sortedWards.length, 'live wards from MapServer:', sortedWards);

          if (sortedWards.length > 0) {
            wardSelect.innerHTML = `<option value="All">Select Ward / Village</option>`;
            sortedWards.forEach(wNo => {
              const opt = document.createElement('option');
              opt.value = wNo;
              opt.innerText = `Ward ${wNo}`;
              wardSelect.appendChild(opt);
            });
          }
        } else {
          console.warn('[Shahapur GIS - Layers] Ward query on Layer 14 returned 0 features.');
        }
      }).catch(err => console.warn("[Shahapur GIS - Layers] Live ward query failed, fallback to defaults:", err));
    });
  } else {
    console.warn('[Shahapur GIS - Layers] Ward FeatureLayer (feature-layer-14) not found in GroupLayer.');
  }

  // Setup Ward Spatial Focus & Masking (FeatureEffect & FeatureFilter)
  wardSelect.addEventListener('change', (e) => {
    const wardNo = e.target.value;
    console.log('[Shahapur GIS - Layers] Ward dropdown changed to:', wardNo);
    // A property panel from another ward no longer matches the map
    if (window.resetSidePanel) window.resetSidePanel();
    applyWardSpatialMask(wardNo);
  });
}


// ---------------------------------------------------------------------------
// Highlight of the building whose details are open
// ---------------------------------------------------------------------------

// Distinct symbol so the open building stands out from the golden-orange
// buildings and the cyan ward boundary on satellite imagery.
const SELECTED_PROPERTY_SYMBOL = {
  type: "simple-fill",
  color: [255, 0, 110, 0.45],             // Magenta fill
  outline: { color: "#FFFFFF", width: 3 } // White halo outline
};
let selectedPropertyGraphic = null;

function clearPropertyHighlight() {
  if (selectedPropertyGraphic && window.highlightGraphicsLayer) {
    window.highlightGraphicsLayer.remove(selectedPropertyGraphic);
  }
  selectedPropertyGraphic = null;
}

/** Outline one building footprint (by OBJECTID) above the ward boundary. */
window.highlightBuilding = function(objectId) {
  const features = (window.SHAHAPUR_BUILDINGS_DATA && window.SHAHAPUR_BUILDINGS_DATA.features) || [];
  const feature = features.find(f => String(f.properties.OBJECTID) === String(objectId));
  if (!feature) return;
  require(["esri/Graphic", "esri/geometry/Polygon"], (Graphic, Polygon) => {
    clearPropertyHighlight();
    const geometry = new Polygon({ rings: feature.geometry_mercator.coordinates, spatialReference: { wkid: 3857 } });
    selectedPropertyGraphic = new Graphic({ geometry, symbol: SELECTED_PROPERTY_SYMBOL });
    if (window.highlightGraphicsLayer) window.highlightGraphicsLayer.add(selectedPropertyGraphic);
  });
};
window.clearBuildingHighlight = clearPropertyHighlight;

function applyWardSpatialMask(wardNo) {
  console.info('[Shahapur GIS - Layers] applyWardSpatialMask() called for Ward:', wardNo);
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
    const buildingLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-2") : null;
    const councilLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-0") : null;

    if (!wardNo || wardNo === 'All') {
      console.info('[Shahapur GIS - Layers] "All Wards" selected. Showing Council, Ward Boundaries & Buildings across Shahapur.');
      if (wardFeatureLayer) {
        wardFeatureLayer.definitionExpression = null;
        wardFeatureLayer.visible = true;
      }
      if (buildingLayer) {
        buildingLayer.definitionExpression = null;
        buildingLayer.visible = true;
      }
      if (councilLayer) {
        councilLayer.visible = true;
      }
      
      if (window.featureGroupLayer) {
        window.featureGroupLayer.layers.forEach(fl => {
          fl.featureEffect = null;
        });
      }

      syncLayerUICheckboxes({ 0: true, 2: true, 14: true });
      if (window.zoomToFullDatasetExtent) window.zoomToFullDatasetExtent();
      if (window.hideMapLoader) window.hideMapLoader();
      return;
    }

    if (!/^\d+$/.test(String(wardNo))) {
      console.warn('[Shahapur GIS - Layers] Ignoring invalid ward value:', wardNo);
      return;
    }
    if (!wardFeatureLayer) {
      console.warn('[Shahapur GIS - Layers] Cannot apply mask: feature-layer-14 is missing.');
      return;
    }

    // Show Map Loading Overlay
    if (window.showMapLoader) window.showMapLoader(`Filtering Ward ${wardNo} Data...`);

    // Filter Layer #14 (Ward Boundary) to show ONLY the selected Ward polygon
    wardFeatureLayer.definitionExpression = `Ward_No = '${wardNo}'`;
    wardFeatureLayer.visible = true;

    // Filter Building Layer (Layer #2) to show selected Ward
    if (buildingLayer) {
      buildingLayer.definitionExpression = `wardNo = '${wardNo}'`;
      buildingLayer.visible = true;
    }
    if (councilLayer) {
      councilLayer.visible = true;
    }

    syncLayerUICheckboxes({ 0: true, 2: true, 14: true });

    // Helper function to apply geometry mask and camera zoom
    const processWardGeometry = (wardGeom) => {
      console.log('[Shahapur GIS - Layers] Applying FeatureEffect spatial mask with geometry for Ward:', wardNo);
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
        console.log('[Shahapur GIS - Layers] Zooming camera to Ward ' + wardNo + ' extent.');
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
      console.info('[Shahapur GIS - Layers] Found cached geometry for Ward ' + wardNo + ' (in-memory hit).');
      processWardGeometry(window.wardGeomCache[wardNo]);
      return;
    }

    console.log('[Shahapur GIS - Layers] Cache miss for Ward ' + wardNo + '. Querying MapServer Layer 14...');
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
        console.info('[Shahapur GIS - Layers] Retrieved geometry from MapServer and cached for Ward:', wardNo);
        processWardGeometry(wardGeom);
      } else {
        console.warn('[Shahapur GIS - Layers] No feature geometry returned for Ward:', wardNo);
        if (window.hideMapLoader) window.hideMapLoader();
      }
    }).catch(err => {
      console.error("[Shahapur GIS - Layers] Error querying ward spatial geometry:", err);
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
  if (!layerListContainer) {
    console.warn('[Shahapur GIS - Layers] #layer-list container not found.');
    return;
  }
  console.log('[Shahapur GIS - Layers] Building layer control list in #layer-list...');
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
    console.log('[Shahapur GIS - Layers] Bulk action: Show All Layers triggered.');
    if (window.featureGroupLayer) {
      window.featureGroupLayer.layers.forEach(fl => { fl.visible = true; });
    }
    layerListContainer.querySelectorAll('.layer-chk').forEach(chk => chk.checked = true);
  });

  bulkRow.querySelector('#btn-hide-all-layers').addEventListener('click', () => {
    console.log('[Shahapur GIS - Layers] Bulk action: Hide All Layers triggered.');
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
        console.log(`[Shahapur GIS - Layers] Toggle layer #${layerDef.id} (${layerDef.title}):`, e.target.checked);
        if (fl) fl.visible = e.target.checked;
      });

      const opacitySlider = itemDiv.querySelector(`#opacity-slider-${layerDef.id}`);
      const opacityBadge = itemDiv.querySelector(`#opacity-val-${layerDef.id}`);
      opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (fl) fl.opacity = val;
        opacityBadge.innerText = `${Math.round(val * 100)}%`;
      });
      opacitySlider.addEventListener('change', (e) => {
        console.log(`[Shahapur GIS - Layers] Set layer #${layerDef.id} (${layerDef.title}) opacity:`, e.target.value);
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
      console.log(`[Shahapur GIS - Layers] Toggle external layer (${ext.title}):`, e.target.checked);
      const lyr = ext.getLayer();
      if (lyr) lyr.visible = e.target.checked;
    });

    extGroupDiv.appendChild(itemDiv);
  });

  layerListContainer.appendChild(extGroupDiv);
  console.info('[Shahapur GIS - Layers] Layer list UI rendered successfully.');
}

