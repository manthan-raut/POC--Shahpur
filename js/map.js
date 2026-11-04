// js/map.js

let appView = null;
let appMap = null;
let featureGroupLayer = null;
let highlightGraphicsLayer = null;

// The MapServer URL
const MAPSERVER_URL = "https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer";

// Predefined Layer Definitions (IDs 0 to 14)
const LAYER_DEFS = [
  { id: 0, title: "Council Boundary", group: "Boundaries", defaultVisibility: true },
  { id: 14, title: "Ward Boundary", group: "Boundaries", defaultVisibility: false },
  { id: 11, title: "Landuse", group: "Boundaries", defaultVisibility: false },
  
  { id: 7, title: "Kutcha Road", group: "Roads & Rail", defaultVisibility: false },
  { id: 12, title: "Railway Line", group: "Roads & Rail", defaultVisibility: false },
  
  { id: 4, title: "Electric Line", group: "Utilities", defaultVisibility: false },
  { id: 10, title: "Street Light Poles", group: "Utilities", defaultVisibility: false },
  { id: 13, title: "Solar Panel", group: "Utilities", defaultVisibility: false },
  { id: 6, title: "High Tension Line", group: "Utilities", defaultVisibility: false },
  
  { id: 2, title: "Building (Properties)", group: "Structures", defaultVisibility: false },
  { id: 3, title: "Compound Wall", group: "Structures", defaultVisibility: false },
  { id: 5, title: "Fencing", group: "Structures", defaultVisibility: false },
  { id: 1, title: "Bridge", group: "Structures", defaultVisibility: false },
  
  { id: 8, title: "Location Name", group: "Labels", defaultVisibility: false },
  { id: 9, title: "Other", group: "Labels", defaultVisibility: false }
];


function initMap() {
  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GroupLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Home",
    "esri/widgets/Zoom",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/rest/support/Query"
  ], (Map, MapView, GroupLayer, FeatureLayer, GraphicsLayer, Home, Zoom, BasemapGallery, Expand, Query) => {
    
    window.appMap = new Map({
      basemap: "topo-vector"
    });
    appMap = window.appMap;

    // Real spatial location of MapServer data (WGS84 Lat/Lon)
    window.appView = new MapView({
      container: "map-mount",
      map: appMap,
      center: [76.3857, 18.7247],
      zoom: 14,
      ui: {
        components: []
      }
    });

    appView = window.appView;

    // Create GroupLayer for 14 individual FeatureLayers
    window.featureGroupLayer = new GroupLayer({
      title: "Municipal Feature Layers",
      visible: true
    });
    featureGroupLayer = window.featureGroupLayer;

    // Instantiate 14 FeatureLayer instances (IDs 0 to 14)
    LAYER_DEFS.forEach(layerDef => {
      const flOptions = {
        url: `${MAPSERVER_URL}/${layerDef.id}`,
        title: layerDef.title,
        id: `feature-layer-${layerDef.id}`,
        visible: layerDef.defaultVisibility,
        outFields: ["*"],
        popupEnabled: true
      };

      // Custom Building Symbology matching reference screenshot (Golden/Orange Fill)
      if (layerDef.id === 2) {
        flOptions.renderer = {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [217, 147, 27, 0.88], // Golden-orange fill matching screenshot
            outline: {
              color: [160, 100, 10, 0.95],
              width: 0.75
            }
          }
        };
      }

      // Custom Ward Boundary Symbology matching reference screenshot (Cyan Outline)
      if (layerDef.id === 14) {
        flOptions.renderer = {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [0, 255, 255, 0.05],
            outline: {
              color: "#00FFFF",
              width: 3.5
            }
          }
        };
      }

      const fl = new FeatureLayer(flOptions);
      featureGroupLayer.add(fl);
    });


    appMap.add(featureGroupLayer);

    // Create GraphicsLayer for ward boundary highlight
    window.highlightGraphicsLayer = new GraphicsLayer({
      title: "Ward Highlight",
      listMode: "hide"
    });
    appMap.add(window.highlightGraphicsLayer);

    // After view is ready
    appView.when(() => {
      setupMapUI();
      
      // Auto-fit to real spatial extent of Ward Boundary (Layer 14)
      zoomToFullDatasetExtent();

      // Initialize Layers (js/layers.js)
      if (window.initLayers) window.initLayers();
      // Initialize Tools (js/tools.js)
      if (window.initTools) window.initTools(appView);
    });
  });
}


function zoomToFullDatasetExtent() {
  const wardLayer = window.featureGroupLayer ? window.featureGroupLayer.findLayerById("feature-layer-14") : null;
  if (wardLayer && typeof wardLayer.queryExtent === 'function') {
    wardLayer.queryExtent().then(res => {
      if (res && res.extent && window.appView) {
        window.appView.goTo(res.extent.expand(1.15));
      } else if (window.appView) {
        window.appView.goTo({ center: [76.3857, 18.7247], zoom: 14 });
      }
    }).catch(() => {
      if (window.appView) window.appView.goTo({ center: [76.3857, 18.7247], zoom: 14 });
    });
  } else if (window.appView) {
    window.appView.goTo({ center: [76.3857, 18.7247], zoom: 14 });
  }
}



function setupMapUI() {
  const mapMount = document.getElementById('map-mount');
  
  // Custom tool rail
  const toolRail = document.createElement('div');
  toolRail.className = 'map-tool-rail';
  toolRail.innerHTML = `
    <button id="tool-layers" class="map-tool-btn active" title="Collapse"><i class="ph ph-sidebar-simple"></i></button>
    <button id="tool-zoom-in" class="map-tool-btn" title="Zoom In"><i class="ph ph-plus"></i></button>
    <button id="tool-zoom-out" class="map-tool-btn" title="Zoom Out"><i class="ph ph-minus"></i></button>
    <button id="tool-home" class="map-tool-btn" title="Home Extent"><i class="ph ph-house"></i></button>
    <button id="tool-search" class="map-tool-btn" title="Search Property"><i class="ph ph-magnifying-glass"></i></button>
    <button id="tool-basemap" class="map-tool-btn" title="Basemaps"><i class="ph ph-map-trifold"></i></button>
    <button id="tool-identify" class="map-tool-btn active" title="Identify"><i class="ph ph-info"></i></button>
    <button id="tool-buffer" class="map-tool-btn" title="Buffer Tool"><i class="ph ph-circle-dashed"></i></button>
    <button id="tool-measure-area" class="map-tool-btn" title="Measure Area"><i class="ph ph-polygon"></i></button>
    <button id="tool-measure-line" class="map-tool-btn" title="Measure Distance"><i class="ph ph-ruler"></i></button>
  `;
  mapMount.appendChild(toolRail);


  // Search Container Overlay
  const searchBox = document.createElement('div');
  searchBox.className = 'map-search-box hidden';
  searchBox.id = 'map-search-box';
  searchBox.innerHTML = `
    <div class="search-input-wrap">
      <i class="ph ph-magnifying-glass search-icon"></i>
      <input type="text" id="map-search-input" placeholder="Search Property ID (#12), Owner, Ward...">
      <button class="btn-icon" id="btn-close-search"><i class="ph ph-x"></i></button>
    </div>
    <div id="search-results-list" class="search-results-list"></div>
  `;
  mapMount.appendChild(searchBox);

  // Map Loading Overlay Indicator
  const mapLoader = document.createElement('div');
  mapLoader.className = 'map-loading-overlay hidden';
  mapLoader.id = 'map-loading-overlay';
  mapLoader.innerHTML = `
    <div class="map-spinner-box">
      <i class="ph ph-spinner map-spinner-icon"></i>
      <span id="map-loading-text">Loading Ward spatial data...</span>
    </div>
  `;
  mapMount.appendChild(mapLoader);

  window.showMapLoader = function(msg) {
    const loader = document.getElementById('map-loading-overlay');
    const txt = document.getElementById('map-loading-text');
    if (loader) {
      if (txt && msg) txt.innerText = msg;
      loader.classList.remove('hidden');
    }
  };

  window.hideMapLoader = function() {
    const loader = document.getElementById('map-loading-overlay');
    if (loader) loader.classList.add('hidden');
  };


  // Custom Basemap Selector Popover
  const basemapBox = document.createElement('div');
  basemapBox.className = 'map-popover-box hidden';
  basemapBox.id = 'basemap-popover';
  basemapBox.innerHTML = `
    <div class="popover-header">
      <span><i class="ph ph-map-trifold"></i> Select Basemap</span>
      <button class="btn-icon" id="btn-close-basemap"><i class="ph ph-x"></i></button>
    </div>
    <div class="basemap-grid">
      <div class="basemap-card active" data-bm="topo-vector">
        <div class="bm-thumb topo"></div>
        <span>Topographic</span>
      </div>
      <div class="basemap-card" data-bm="satellite">
        <div class="bm-thumb sat"></div>
        <span>Esri Satellite</span>
      </div>
      <div class="basemap-card" data-bm="hybrid">
        <div class="bm-thumb hyb"></div>
        <span>Esri Hybrid</span>
      </div>
      <div class="basemap-card" data-bm="streets-vector">
        <div class="bm-thumb str"></div>
        <span>Streets</span>
      </div>
      <div class="basemap-card" data-bm="osm">
        <div class="bm-thumb osm"></div>
        <span>OpenStreetMap</span>
      </div>
      <div class="basemap-card" data-bm="dark-gray-vector">
        <div class="bm-thumb dark"></div>
        <span>Dark Gray</span>
      </div>
      <div class="basemap-card" data-bm="google-satellite">
        <div class="bm-thumb gsat"></div>
        <span>Google Satellite</span>
      </div>
      <div class="basemap-card" data-bm="google-hybrid">
        <div class="bm-thumb ghyb"></div>
        <span>Google Hybrid</span>
      </div>
    </div>
  `;
  mapMount.appendChild(basemapBox);

  // Dedicated Right-Side Property Details Panel (Leaves Left Sidebar Intact!)
  const propDetailPanel = document.createElement('div');
  propDetailPanel.className = 'property-detail-panel right-dock hidden';
  propDetailPanel.id = 'property-detail-panel';
  propDetailPanel.innerHTML = `
    <div class="panel-header">
      <span><i class="ph ph-building-apartment"></i> Property Details</span>
      <button class="btn-icon" id="btn-close-prop-detail"><i class="ph ph-x"></i></button>
    </div>
    <div class="panel-content" id="prop-detail-content"></div>
  `;
  mapMount.appendChild(propDetailPanel);

  propDetailPanel.querySelector('#btn-close-prop-detail').addEventListener('click', () => {
    propDetailPanel.classList.add('hidden');
  });

  // Custom coordinate readout
  const coords = document.createElement('div');
  coords.className = 'map-coords';
  coords.id = 'map-coords';
  coords.innerText = 'Lon: 0.000, Lat: 0.000';
  mapMount.appendChild(coords);


  appView.on("pointer-move", (evt) => {
    const point = appView.toMap({ x: evt.x, y: evt.y });
    if (point) {
      coords.innerText = `Lon: ${point.longitude.toFixed(5)}, Lat: ${point.latitude.toFixed(5)}`;
    }
  });

  // Left Side Dock Panel (Query Section & Layers Section matching Reference UI)
  const sidePanel = document.createElement('div');
  sidePanel.className = 'map-side-panel left-dock';
  sidePanel.id = 'map-side-panel';
  sidePanel.innerHTML = `
    <div class="panel-tab-bar">
      <button class="panel-tab active" id="tab-btn-query">Query Section</button>
      <button class="panel-tab" id="tab-btn-layers">Layers Section</button>
    </div>

    <div class="panel-content" id="panel-content">
      <!-- Query Section Tab -->
      <div id="tab-content-query" class="tab-pane active">
        <div class="query-form-group">
          <div class="query-label-row">
            <label class="query-label">District</label>
            <span class="locked-badge"><i class="ph ph-lock-key"></i> Locked</span>
          </div>
          <select id="query-district" class="query-select locked-select" disabled>
            <option value="Thane" selected>Thane</option>
          </select>
        </div>

        <div class="query-form-group">
          <div class="query-label-row">
            <label class="query-label">Taluka</label>
            <span class="locked-badge"><i class="ph ph-lock-key"></i> Locked</span>
          </div>
          <select id="query-taluka" class="query-select locked-select" disabled>
            <option value="Shahapur" selected>Shahapur</option>
          </select>
        </div>

        <div class="query-form-group">
          <label class="query-label">Village / Ward</label>
          <select id="ward-select" class="query-select">
            <option value="All">Select Ward / Village</option>
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
        </div>

        <div class="query-btn-row">
          <button id="btn-query-submit" class="btn-query-submit">
            <span>Submit</span> <i class="ph ph-arrow-right"></i>
          </button>
          <button id="btn-query-clear" class="btn-query-clear">
            <i class="ph ph-arrows-counter-clockwise"></i> Clear
          </button>
        </div>

        <div class="query-note">
          <i class="ph ph-info"></i>
          <div>
            <strong>Spatial Query Filter</strong><br>
            Showing municipal assets for <strong>Shahapur, Thane</strong>. Select a Ward to zoom to geometries.
          </div>
        </div>
      </div>

      <!-- Layers Section Tab -->
      <div id="tab-content-layers" class="tab-pane hidden">

        <div id="layer-list"></div>
      </div>
    </div>
  `;
  mapMount.appendChild(sidePanel);

  // Tab Switcher Logic
  const tabQueryBtn = sidePanel.querySelector('#tab-btn-query');
  const tabLayersBtn = sidePanel.querySelector('#tab-btn-layers');
  const paneQuery = sidePanel.querySelector('#tab-content-query');
  const paneLayers = sidePanel.querySelector('#tab-content-layers');

  tabQueryBtn.addEventListener('click', () => {
    tabQueryBtn.classList.add('active');
    tabLayersBtn.classList.remove('active');
    paneQuery.classList.add('active');
    paneQuery.classList.remove('hidden');
    paneLayers.classList.remove('active');
    paneLayers.classList.add('hidden');
  });

  tabLayersBtn.addEventListener('click', () => {
    tabLayersBtn.classList.add('active');
    tabQueryBtn.classList.remove('active');
    paneLayers.classList.add('active');
    paneLayers.classList.remove('hidden');
    paneQuery.classList.remove('active');
    paneQuery.classList.add('hidden');
  });

  // Query Buttons Logic
  sidePanel.querySelector('#btn-query-submit').addEventListener('click', () => {
    const wardSelect = document.getElementById('ward-select');
    if (wardSelect) {
      const event = new Event('change');
      wardSelect.dispatchEvent(event);
    }
  });

  sidePanel.querySelector('#btn-query-clear').addEventListener('click', () => {
    const wardSelect = document.getElementById('ward-select');
    if (wardSelect) {
      wardSelect.selectedIndex = 0;
      const event = new Event('change');
      wardSelect.dispatchEvent(event);
    }
  });


  document.getElementById('tool-layers').addEventListener('click', () => {
    sidePanel.classList.toggle('hidden');
    document.getElementById('tool-layers').classList.toggle('active');
    const isHidden = sidePanel.classList.contains('hidden');
    mapMount.classList.toggle('side-panel-hidden', isHidden);
  });



  // Basemap Selector Toggle
  document.getElementById('tool-basemap').addEventListener('click', () => {
    const bBox = document.getElementById('basemap-popover');
    bBox.classList.toggle('hidden');
    document.getElementById('tool-basemap').classList.toggle('active');
  });

  document.getElementById('btn-close-basemap').addEventListener('click', () => {
    document.getElementById('basemap-popover').classList.add('hidden');
    document.getElementById('tool-basemap').classList.remove('active');
  });

  // Basemap Card Click Handling
  document.querySelectorAll('#basemap-popover .basemap-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#basemap-popover .basemap-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const bmType = card.getAttribute('data-bm');

      if (bmType === 'google-satellite') {
        if (window.googleSatelliteLayer) window.googleSatelliteLayer.visible = true;
        if (window.googleHybridLayer) window.googleHybridLayer.visible = false;
        appMap.basemap = "none";
      } else if (bmType === 'google-hybrid') {
        if (window.googleHybridLayer) window.googleHybridLayer.visible = true;
        if (window.googleSatelliteLayer) window.googleSatelliteLayer.visible = false;
        appMap.basemap = "none";
      } else {
        if (window.googleSatelliteLayer) window.googleSatelliteLayer.visible = false;
        if (window.googleHybridLayer) window.googleHybridLayer.visible = false;
        appMap.basemap = bmType;
      }

      document.getElementById('basemap-popover').classList.add('hidden');
      document.getElementById('tool-basemap').classList.remove('active');
    });
  });

  // Search Toggle
  document.getElementById('tool-search').addEventListener('click', () => {
    const sBox = document.getElementById('map-search-box');
    sBox.classList.toggle('hidden');
    document.getElementById('tool-search').classList.toggle('active');
    if (!sBox.classList.contains('hidden')) {
      document.getElementById('map-search-input').focus();
    }
  });

  document.getElementById('btn-close-search').addEventListener('click', () => {
    document.getElementById('map-search-box').classList.add('hidden');
    document.getElementById('tool-search').classList.remove('active');
  });


  // Basic Tool wiring
  document.getElementById('tool-zoom-in').addEventListener('click', () => {
    appView.goTo({ zoom: appView.zoom + 1 });
  });
  document.getElementById('tool-zoom-out').addEventListener('click', () => {
    appView.goTo({ zoom: appView.zoom - 1 });
  });
  
  // Home tool resets to dataset extent
  document.getElementById('tool-home').addEventListener('click', () => {
    zoomToFullDatasetExtent();
  });
}

// Lazy load map when map view is clicked
let mapInitialized = false;
window.addEventListener('hashchange', () => {
  if (window.location.hash.includes('#/map') && !mapInitialized) {
    mapInitialized = true;
    initMap();
  }
});
// Check if starting on map
if (window.location.hash.includes('#/map') && !mapInitialized) {
  mapInitialized = true;
  initMap();
}

