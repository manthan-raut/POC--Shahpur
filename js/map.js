// js/map.js

console.log('[Shahapur GIS - Map] Loading map.js module...');

let appView = null;
let appMap = null;
let featureGroupLayer = null;
let highlightGraphicsLayer = null;

// The MapServer URL
const MAPSERVER_URL = "https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer";

// Default basemap shown on load (Esri World Imagery)
const DEFAULT_BASEMAP = "satellite";

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
  console.info('[Shahapur GIS - Map] initMap() called. Requiring Esri AMD modules...');
  if (typeof require !== 'function') {
    console.error('[Shahapur GIS - Map] ArcGIS JS API AMD loader (require) is missing! Ensure https://js.arcgis.com/4.29/ is loaded.');
    return;
  }

  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GroupLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/geometry/Polygon",
    "esri/geometry/Extent",
    "esri/widgets/Home",
    "esri/widgets/Zoom",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/rest/support/Query"
  ], (Map, MapView, GroupLayer, FeatureLayer, GraphicsLayer, Graphic, Polygon, Extent, Home, Zoom, BasemapGallery, Expand, Query) => {
    
    console.log('[Shahapur GIS - Map] Esri modules resolved. Creating Map instance with Esri Satellite basemap...');
    window.appMap = new Map({
      basemap: DEFAULT_BASEMAP
    });
    appMap = window.appMap;

    // Real spatial location of Shahapur, Thane (WGS84 Lat/Lon)
    console.log('[Shahapur GIS - Map] Initializing MapView on #map-mount centered at [73.3265, 19.4538] (Shahapur)...');
    window.appView = new MapView({
      container: "map-mount",
      map: appMap,
      center: [73.3265, 19.4538],
      zoom: 14.5,
      ui: {
        components: []
      }
    });

    appView = window.appView;

    // Create GroupLayer for Municipal FeatureLayers
    console.log('[Shahapur GIS - Map] Creating Municipal FeatureLayers GroupLayer with local tagged data & MapServer backup...');
    window.featureGroupLayer = new GroupLayer({
      title: "Municipal Feature Layers",
      visible: true
    });
    featureGroupLayer = window.featureGroupLayer;

    // Index building features in memory for instantaneous O(1) attribute lookup
    window.BUILDINGS_BY_ID = {};
    window.BUILDINGS_BY_PROP_KEY = {};
    if (window.SHAHAPUR_BUILDINGS_DATA && window.SHAHAPUR_BUILDINGS_DATA.features) {
      window.SHAHAPUR_BUILDINGS_DATA.features.forEach(f => {
        window.BUILDINGS_BY_ID[f.properties.OBJECTID] = f.properties;
        const w = String(f.properties.wardNo);
        (f.properties.matchedProps || []).forEach(p => {
          window.BUILDINGS_BY_PROP_KEY[`${w}_${p}`] = f.properties;
        });
        window.BUILDINGS_BY_PROP_KEY[`${w}_${f.properties.propNo}`] = f.properties;
      });
      console.info('[Shahapur GIS - Map] Indexed', Object.keys(window.BUILDINGS_BY_ID).length, 'buildings into window.BUILDINGS_BY_ID.');
    }

    // Helper: Client-side Building Layer from local tagged shapefile + Excel data
    let localBuildingLayer = null;
    if (window.SHAHAPUR_BUILDINGS_DATA && window.SHAHAPUR_BUILDINGS_DATA.features) {
      console.info('[Shahapur GIS - Map] Creating Web Mercator FeatureLayer from', window.SHAHAPUR_BUILDINGS_DATA.features.length, 'tagged Shahapur building polygons...');
      const buildingGraphics = window.SHAHAPUR_BUILDINGS_DATA.features.map(f => {
        const rings = (f.geometry_mercator && f.geometry_mercator.coordinates) ? f.geometry_mercator.coordinates : f.geometry.coordinates;
        return new Graphic({
          geometry: new Polygon({
            rings: rings,
            spatialReference: { wkid: 3857 }
          }),
          attributes: {
            OBJECTID: f.properties.OBJECTID,
            OBJECTID_1: f.properties.OBJECTID,
            wardNo: String(f.properties.wardNo),
            Ward_No: String(f.properties.wardNo),
            propNo: String(f.properties.propNo),
            Prop_No: String(f.properties.propNo),
            propertyNoOld: String(f.properties.propertyNoOld || ''),
            ownerName: f.properties.ownerName || '',
            ownerNameMarathi: f.properties.ownerNameMarathi || '',
            buildingName: f.properties.buildingName || '',
            address: f.properties.address || '',
            description: f.properties.description || '',
            contactNo: f.properties.contactNo || '',
            totalAssessed: f.properties.totalAssessed || 0,
            totalPaid: f.properties.totalPaid || 0,
            totalPending: f.properties.totalPending || 0,
            status: f.properties.status || '',
            unitsCount: f.properties.unitsCount || 0  // untagged footprints have no register units
          }
        });
      });

      localBuildingLayer = new FeatureLayer({
        id: "feature-layer-2",
        title: "Building (Properties)",
        source: buildingGraphics,
        objectIdField: "OBJECTID",
        fields: [
          { name: "OBJECTID", type: "oid" },
          { name: "OBJECTID_1", type: "integer" },
          { name: "wardNo", type: "string" },
          { name: "Ward_No", type: "string" },
          { name: "propNo", type: "string" },
          { name: "Prop_No", type: "string" },
          { name: "propertyNoOld", type: "string" },
          { name: "ownerName", type: "string" },
          { name: "ownerNameMarathi", type: "string" },
          { name: "buildingName", type: "string" },
          { name: "address", type: "string" },
          { name: "description", type: "string" },
          { name: "contactNo", type: "string" },
          { name: "totalAssessed", type: "double" },
          { name: "totalPaid", type: "double" },
          { name: "totalPending", type: "double" },
          { name: "status", type: "string" },
          { name: "unitsCount", type: "integer" }
        ],
        geometryType: "polygon",
        spatialReference: { wkid: 3857 },
        visible: false, // shown only after a ward is selected (js/layers.js)
        popupEnabled: false,
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [217, 147, 27, 0.88], // Golden-orange fill matching reference UI
            outline: {
              color: [160, 100, 10, 0.95],
              width: 0.75
            }
          }
        }
      });
    }

    // Helper: Client-side Ward Boundary Layer
    let localWardLayer = null;
    if (window.SHAHAPUR_WARDS_DATA && window.SHAHAPUR_WARDS_DATA.features) {
      console.info('[Shahapur GIS - Map] Creating Web Mercator Ward Boundary FeatureLayer for Wards 1 to 5...');
      const wardGraphics = window.SHAHAPUR_WARDS_DATA.features.map(f => {
        const rings = (f.geometry_mercator && f.geometry_mercator.coordinates) ? f.geometry_mercator.coordinates : f.geometry.coordinates;
        return new Graphic({
          geometry: new Polygon({
            rings: rings,
            spatialReference: { wkid: 3857 }
          }),
          attributes: {
            OBJECTID: f.properties.OBJECTID,
            Ward_No: String(f.properties.Ward_No),
            Ward_Name: f.properties.Ward_Name,
            totalProperties: f.properties.totalProperties,
            totalAssessed: f.properties.totalAssessed,
            totalPaid: f.properties.totalPaid,
            totalPending: f.properties.totalPending
          }
        });
      });

      localWardLayer = new FeatureLayer({
        id: "feature-layer-14",
        title: "Ward Boundary",
        source: wardGraphics,
        objectIdField: "OBJECTID",
        fields: [
          { name: "OBJECTID", type: "oid" },
          { name: "Ward_No", type: "string" },
          { name: "Ward_Name", type: "string" },
          { name: "totalProperties", type: "integer" },
          { name: "totalAssessed", type: "double" },
          { name: "totalPaid", type: "double" },
          { name: "totalPending", type: "double" }
        ],
        geometryType: "polygon",
        spatialReference: { wkid: 3857 },
        visible: false, // shown only after a ward is selected (js/layers.js)
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [0, 210, 255, 0.08],
            outline: {
              color: "#00b4d8",
              width: 2.5
            }
          }
        }
      });
    }

    // Helper: Client-side Council Boundary Layer
    let localCouncilLayer = null;
    if (window.SHAHAPUR_COUNCIL_DATA && window.SHAHAPUR_COUNCIL_DATA.features) {
      console.info('[Shahapur GIS - Map] Creating Web Mercator Council Boundary FeatureLayer...');
      const councilGraphics = window.SHAHAPUR_COUNCIL_DATA.features.map(f => {
        const rings = (f.geometry_mercator && f.geometry_mercator.coordinates) ? f.geometry_mercator.coordinates : f.geometry.coordinates;
        return new Graphic({
          geometry: new Polygon({
            rings: rings,
            spatialReference: { wkid: 3857 }
          }),
          attributes: f.properties
        });
      });

      localCouncilLayer = new FeatureLayer({
        id: "feature-layer-0",
        title: "Council Boundary",
        source: councilGraphics,
        objectIdField: "OBJECTID",
        geometryType: "polygon",
        spatialReference: { wkid: 3857 },
        visible: true,
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [10, 66, 89, 0.06],
            outline: {
              color: "#0A4259",
              width: 2.5
            }
          }
        }
      });
    }

    // Instantiate Layer instances (IDs 0 to 14)
    LAYER_DEFS.forEach(layerDef => {
      let fl = null;
      if (layerDef.id === 2 && localBuildingLayer) {
        fl = localBuildingLayer;
      } else if (layerDef.id === 14 && localWardLayer) {
        fl = localWardLayer;
      } else if (layerDef.id === 0 && localCouncilLayer) {
        fl = localCouncilLayer;
      } else {
        // Fallback / enrichment layers from MRSAC MapServer
        const flOptions = {
          url: `${MAPSERVER_URL}/${layerDef.id}`,
          title: layerDef.title,
          id: `feature-layer-${layerDef.id}`,
          visible: layerDef.defaultVisibility,
          outFields: ["*"],
          popupEnabled: true
        };
        fl = new FeatureLayer(flOptions);
        // Suppress remote loading errors if MapServer is unreachable
        if (typeof fl.load === 'function') {
          fl.load().catch(err => {
            console.warn(`[Shahapur GIS - Map] MapServer Layer #${layerDef.id} offline (running in local backup mode):`, err.message || err);
          });
        }
      }

      featureGroupLayer.add(fl);
    });

    console.info('[Shahapur GIS - Map] Added', LAYER_DEFS.length, 'operational FeatureLayers to GroupLayer.');
    appMap.add(featureGroupLayer);

    // Create GraphicsLayer for ward boundary highlight
    window.highlightGraphicsLayer = new GraphicsLayer({
      title: "Ward Highlight",
      listMode: "hide"
    });
    appMap.add(window.highlightGraphicsLayer);

    // After view is ready
    appView.when(() => {
      console.info('[Shahapur GIS - Map] MapView ready event fired. Mounting UI, tools, and layers...');
      setupMapUI();
      
      // Auto-fit to real spatial extent of Shahapur
      zoomToFullDatasetExtent();

      // Initialize Layers (js/layers.js)
      if (window.initLayers) {
        console.log('[Shahapur GIS - Map] Invoking window.initLayers()...');
        window.initLayers();
      } else {
        console.warn('[Shahapur GIS - Map] window.initLayers is not defined.');
      }
      // Initialize Tools (js/tools.js)
      if (window.initTools) {
        console.log('[Shahapur GIS - Map] Invoking window.initTools(appView)...');
        window.initTools(appView);
      } else {
        console.warn('[Shahapur GIS - Map] window.initTools is not defined.');
      }
    }).catch(err => {
      console.error('[Shahapur GIS - Map] Error during MapView.when() initialization:', err);
    });
  }, (requireErr) => {
    console.error('[Shahapur GIS - Map] RequireJS / Dojo AMD failed to load Map modules:', requireErr);
  });
}


function zoomToFullDatasetExtent() {
  console.log('[Shahapur GIS - Map] zoomToFullDatasetExtent(): Zooming to Shahapur municipal boundary...');
  if (window.SHAHAPUR_SUMMARY_STATS && window.SHAHAPUR_SUMMARY_STATS.extent_mercator && window.appView) {
    const ext = window.SHAHAPUR_SUMMARY_STATS.extent_mercator;
    require(["esri/geometry/Extent"], (Extent) => {
      const fullExt = new Extent({
        xmin: ext[0],
        ymin: ext[1],
        xmax: ext[2],
        ymax: ext[3],
        spatialReference: { wkid: 3857 }
      });
      window.appView.goTo(fullExt.expand(1.15));
    });
    return;
  }
  
  if (window.SHAHAPUR_SUMMARY_STATS && window.SHAHAPUR_SUMMARY_STATS.extent && window.appView) {
    const ext = window.SHAHAPUR_SUMMARY_STATS.extent; // [minX, minY, maxX, maxY]
    require(["esri/geometry/Extent"], (Extent) => {
      const fullExt = new Extent({
        xmin: ext[0],
        ymin: ext[1],
        xmax: ext[2],
        ymax: ext[3],
        spatialReference: { wkid: 4326 }
      });
      window.appView.goTo(fullExt.expand(1.18));
    });
    return;
  }
  
  if (window.appView) {
    window.appView.goTo({ center: [73.3265, 19.4538], zoom: 14.5 });
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

  // Empty-state hint: no property data is shown until a ward is chosen
  const wardHint = document.createElement('div');
  wardHint.className = 'map-ward-hint';
  wardHint.id = 'map-ward-hint';
  wardHint.innerHTML = '<i class="ph ph-map-pin-area"></i> Select a Ward in the Query Section to view its properties';
  mapMount.appendChild(wardHint);

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
      <div class="basemap-card" data-bm="topo-vector" title="Esri Topographic Map">
        <div class="bm-thumb topo">
          <img src="https://www.arcgis.com/sharing/rest/content/items/7dc6cea0b7a34a1996b9e6ff326ad354/info/thumbnail/topo_thumb_b2.jpg" alt="Topographic" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Topographic</span>
      </div>
      <div class="basemap-card active" data-bm="satellite" title="Esri Satellite Imagery">
        <div class="bm-thumb sat">
          <img src="https://www.arcgis.com/sharing/rest/content/items/10df2279f9684e4a9f6a7f08febac2a9/info/thumbnail/thumbnail1584384938644.jpeg" alt="Esri Satellite" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Esri Satellite</span>
      </div>
      <div class="basemap-card" data-bm="hybrid" title="Esri Satellite with Labels">
        <div class="bm-thumb hyb">
          <img src="https://www.arcgis.com/sharing/rest/content/items/5ae9e138a17842688b0b79283a4353f6/info/thumbnail/thumbnail.jpg" alt="Esri Hybrid" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Esri Hybrid</span>
      </div>
      <div class="basemap-card" data-bm="streets-vector" title="Esri Street Map">
        <div class="bm-thumb str">
          <img src="https://www.arcgis.com/sharing/rest/content/items/de26a3cf4cc9451298ea173c4b324736/info/thumbnail/thumbnail.jpg" alt="Streets" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Streets</span>
      </div>
      <div class="basemap-card" data-bm="osm" title="OpenStreetMap">
        <div class="bm-thumb osm">
          <img src="https://www.arcgis.com/sharing/rest/content/items/d0959081a28a4176963e6027a468d6ef/info/thumbnail/thumbnail.jpg" alt="OpenStreetMap" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>OpenStreetMap</span>
      </div>
      <div class="basemap-card" data-bm="dark-gray-vector" title="Dark Gray Canvas">
        <div class="bm-thumb dark">
          <img src="https://www.arcgis.com/sharing/rest/content/items/1970c1995b8f44749f4b9d6eac525029/info/thumbnail/thumbnail.jpg" alt="Dark Gray" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Dark Gray</span>
      </div>
      <div class="basemap-card" data-bm="google-satellite" title="Google Satellite Imagery">
        <div class="bm-thumb gsat">
          <img src="https://mt1.google.com/vt/lyrs=s&x=5842&y=3652&z=13" alt="Google Satellite" loading="lazy" onerror="this.style.opacity='0'">
        </div>
        <span>Google Satellite</span>
      </div>
      <div class="basemap-card" data-bm="google-hybrid" title="Google Hybrid Map">
        <div class="bm-thumb ghyb">
          <img src="https://mt1.google.com/vt/lyrs=y&x=5842&y=3652&z=13" alt="Google Hybrid" loading="lazy" onerror="this.style.opacity='0'">
        </div>
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
    if (window.resetSidePanel) window.resetSidePanel();   // hides panel + clears building highlight
    else propDetailPanel.classList.add('hidden');
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
            <option value="1">Ward 1 (Prabhag 1)</option>
            <option value="2">Ward 2 (Prabhag 2)</option>
            <option value="3">Ward 3 (Prabhag 3)</option>
            <option value="4">Ward 4 (Prabhag 4)</option>
            <option value="5">Ward 5 (Prabhag 5)</option>
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
            Showing municipal assets for <strong>Shahapur, Thane</strong>. Select a Ward to show only its properties.
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
      console.info('[Shahapur GIS - Map] User switched basemap to:', bmType);

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
      console.log('[Shahapur GIS - Map] Opened property search box on map.');
      document.getElementById('map-search-input').focus();
    } else {
      console.log('[Shahapur GIS - Map] Closed property search box on map.');
    }
  });

  document.getElementById('btn-close-search').addEventListener('click', () => {
    document.getElementById('map-search-box').classList.add('hidden');
    document.getElementById('tool-search').classList.remove('active');
  });


  // Basic Tool wiring
  document.getElementById('tool-zoom-in').addEventListener('click', () => {
    console.log('[Shahapur GIS - Map] Zoom In clicked. Current zoom:', appView.zoom);
    appView.goTo({ zoom: appView.zoom + 1 });
  });
  document.getElementById('tool-zoom-out').addEventListener('click', () => {
    console.log('[Shahapur GIS - Map] Zoom Out clicked. Current zoom:', appView.zoom);
    appView.goTo({ zoom: appView.zoom - 1 });
  });
  
  // Home tool resets to dataset extent
  document.getElementById('tool-home').addEventListener('click', () => {
    console.log('[Shahapur GIS - Map] Home extent button clicked.');
    zoomToFullDatasetExtent();
  });
}

// Lazy load map when map view is clicked
let mapInitialized = false;
window.addEventListener('hashchange', () => {
  if (window.location.hash.includes('#/map') && !mapInitialized) {
    console.log('[Shahapur GIS - Map] Route #/map detected on hashchange, initializing map...');
    mapInitialized = true;
    initMap();
  }
});
// Check if starting on map
if (window.location.hash.includes('#/map') && !mapInitialized) {
  console.log('[Shahapur GIS - Map] Initial page load on route #/map, initializing map...');
  mapInitialized = true;
  initMap();
}

