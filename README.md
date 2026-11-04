# Shahapur Ward-wise Property Tax & Civic GIS Portal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)
[![ArcGIS API](https://img.shields.io/badge/ArcGIS%20JS%20API-v4.29-blue?logo=esri&logoColor=white)](https://developers.arcgis.com/javascript/)
[![Chart.js](https://img.shields.io/badge/Chart.js-v4.x-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![SheetJS](https://img.shields.io/badge/SheetJS-xlsx-green)](https://sheetjs.com/)
[![jsPDF](https://img.shields.io/badge/jsPDF-AutoTable-red)](https://github.com/parallax/jsPDF)
[![UI/UX Pro Max](https://img.shields.io/badge/Design-UI%2FUX%20Pro%20Max-0A4259)](css/components.css)

A high-performance, responsive, client-side Single Page Application (SPA) designed for municipal revenue collection, civic infrastructure monitoring, and geospatial land administration for the **Shahapur Municipal Council**.

The portal integrates live spatial MapServer services from **MRSAC (Maharashtra Remote Sensing Applications Centre)** with executive revenue analytics, property assessment records, and multi-format reporting (PDF, Excel, CSV).

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Repository Directory Structure](#repository-directory-structure)
4. [File Breakdown ("What is in each file")](#file-breakdown-what-is-in-each-file)
   - [Root Entrypoints & Configurations](#1-root-entrypoints--configurations)
   - [Stylesheets (`css/`)](#2-stylesheets-css)
   - [Core Application Logic (`js/`)](#3-core-application-logic-js)
   - [Export Engines (`js/export/`)](#4-export-engines-jsexport)
   - [Design Skills & Assets (`.agents/skills/`)](#5-design-skills--assets-agentsskills)
5. [Geospatial Layer Catalog (MRSAC MapServer)](#geospatial-layer-catalog-mrsac-mapserver)
6. [Getting Started & Local Setup](#getting-started--local-setup)
7. [Default Login Credentials](#default-login-credentials)
8. [Developer Notes & Script Load Order Rules](#developer-notes--script-load-order-rules)
9. [Git Repository & Sync](#git-repository--sync)

---

## Key Features

- **Executive Bento Analytics Dashboard**:
  - 6 Asset KPI summary cards (1,482 Buildings, 173 Solar Units, 482 Poles, 75 Bridges, 30.3 km Kutcha Roads, 28.2 km Fencing).
  - Monthly tax collection bar chart with Canvas 2D linear gradient fills and rupee formatting (`₹ Lakhs`).
  - Spatial extent radar overview linked to live GIS coordinates.
  - Annual Council Target progress bar (84% of ₹1.0 Cr).
  - Land use distribution donut chart with centered hectarage callout (`240 Ha`) and custom HTML legend.
  - Ward-wise building classification stacked bar chart.
  - 80% Recovery Rate financial health gauge with on-time collection and backlog metrics.
  - Electric transmission area chart, solar installation bar chart, roads & bridges horizontal bar chart.
  - Railway asset grid and live municipal audit event log.
  - Live Ward filtering (All Wards, Ward 1 to Ward 4) with zero-latency metric recalculation.

- **Interactive GIS Map Portal**:
  - Powered by **ArcGIS JavaScript API 4.29**.
  - Direct connection to live MRSAC MapServer (`Test2/MapServer`) centered on Shahapur (`76.3857°E, 18.7247°N`).
  - 15 operational feature layers grouped into Boundaries, Roads & Rail, Utilities, Structures, and Labels.
  - External base layers: Google Satellite, Google Hybrid, and Maharashtra District/Taluka WMS layers.
  - Interactive toolbar: Area & Distance measurement widgets, Basemap switcher, Coordinate tracking, and Reset Extent.
  - Spatial masking: Ward-specific boundary isolation with in-memory geometry caching.

- **Property Tax Assessment Records**:
  - Ward-wise property assessment data table with instant search and multi-ward filtering.
  - Phase 2 Excel spreadsheet ingestion (`.xlsx`, `.csv`) allowing administrators to update property records in real time.
  - One-click sample Excel template download for data entry staff.
  - Detailed property inspection modal displaying owner name, assessed tax, paid amount, pending balance, and payment status.
  - LocalStorage persistence (`gis_tax_records_dataset`) with factory-reset recovery.

- **Municipal Reporting Engine**:
  - Filter by report type: Ward-wise Tax Collection, Unpaid Properties, Defaulters List.
  - Instant PDF report generation with municipal header, formatted auto-tables, and timestamps.
  - Formatted Excel export via SheetJS (`.xlsx`) with typed column headers.
  - RFC 4180-compliant CSV export with UTF-8 BOM encoding for Marathi and English compatibility.

---

## Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
|                            Client Browser (SPA)                                   |
+-----------------------------------------------------------------------------------+
        |                                   |                              |
        v                                   v                              v
+-------------------+             +-------------------+          +-------------------+
|  Executive Bento  |             |  ArcGIS JS 4.29   |          |  Tax Records &    |
|  Dashboard        |             |  Interactive Map  |          |  Reports Engine   |
|  (Chart.js 4.x)   |             |  (MRSAC Services) |          |  (SheetJS / jsPDF)|
+-------------------+             +-------------------+          +-------------------+
        |                                   |                              |
        +-----------------------------------+------------------------------+
                                            |
                                            v
                                 +---------------------+
                                 |  Session & Storage  |
                                 |  - sessionStorage   |
                                 |  - localStorage     |
                                 +---------------------+
```

- **Frontend Core**: Vanilla JavaScript (ES6+), HTML5, CSS3 Custom Properties (No node build step required).
- **Mapping & GIS**: ArcGIS Maps SDK for JavaScript v4.29 (`esri/views/MapView`, `esri/layers/FeatureLayer`, `esri/layers/WebTileLayer`, `esri/layers/WMSLayer`).
- **Data Visualizations**: Chart.js v4.x with Canvas 2D linear gradient fills and custom DOM legend connectors.
- **Export Utilities**: SheetJS (XLSX v0.19+), jsPDF v2.5.1, jsPDF-AutoTable v3.5.28.
- **Iconography & Fonts**: Phosphor Icons, Google Fonts (*Plus Jakarta Sans*).

---

## Repository Directory Structure

```text
Shahapur/
├── index.html                           # Landing page & authentication gateway
├── app.html                             # Main application portal shell (SPA)
├── .gitignore                           # Git ignore rules for temporary & OS files
├── skills-lock.json                     # Agentic UI skill metadata configuration
├── README.md                            # Comprehensive project documentation
│
├── css/                                 # Modular CSS Architecture
│   ├── base.css                         # Design tokens, CSS variables, typography & resets
│   ├── layout.css                       # Application grid shell, header navigation & views
│   ├── components.css                   # Bento cards, KPI grids, tables, badges & charts
│   └── map.css                          # ArcGIS widget overrides, floating rails & popups
│
├── js/                                  # Application Scripts & Logic
│   ├── 06-08-26(POC Portal).code-workspace # VS Code workspace environment configuration
│   ├── auth.js                          # Session authentication, login/logout & route guard
│   ├── router.js                        # Hash-based SPA routing (#/dashboard, #/map, etc.)
│   ├── sidebar.js                       # Header module menu & sidebar collapse mechanics
│   ├── dashboard.js                     # Bento analytics dashboard & 9 Chart.js instances
│   ├── map.js                           # ArcGIS MapView lifecycle, layers & extent setup
│   ├── layers.js                        # Layer registry, MRSAC sublayers, WMS & opacity UI
│   ├── tools.js                         # Map measurement, basemap gallery & spatial tools
│   ├── mockData.js                      # 500+ record fallback property tax dataset generator
│   ├── taxRecords.js                    # Assessment records table, search & Excel upload UI
│   ├── reports.js                       # Municipal reports filter interface & export actions
│   │
│   └── export/                          # Client-Side Export Utilities
│       ├── exportCsv.js                 # RFC-4180 CSV builder with UTF-8 encoding
│       ├── exportExcel.js               # SheetJS Excel (.xlsx) workbook generator
│       └── exportPdf.js                 # jsPDF + AutoTable printable report generator
│
└── .agents/skills/                      # AI Design Intelligence Skills & Data
    ├── brainstorming/                   # Exploratory design questioning & plan refinement
    ├── frontend-design/                 # Aesthetic guidelines & creative direction
    ├── ui-styling/                      # Canvas typography, font assets & color pairings
    └── ui-ux-pro-max/                   # Design system profiles, charts, icons & heuristics
```

---

## File Breakdown ("What is in each file")

### 1. Root Entrypoints & Configurations

#### `index.html`
- **Purpose**: The public-facing entry point and authentication gateway.
- **Contents**:
  - Hero landing section with portal title, description, and "Access Portal" call to action.
  - Modal-style login form with credentials validation (`admin@gmail.com` / `112233`).
  - Browser extension crash guard shield that intercepts third-party extension errors.
  - Smooth opacity-based transition switching between the hero view and the login view.
- **Key Elements**: `#landing-view`, `#login-view`, `#login-form`, `#btn-show-login`.

#### `app.html`
- **Purpose**: The core application shell hosting all portal modules within a single-page architecture.
- **Contents**:
  - Global top header with council emblem, portal title, module navigation tabs (`Dashboard`, `Map View`, `Tax Records`, `Reports`), quick module switcher dropdown, and logout button.
  - Swappable `<section>` containers for `#sec-dashboard`, `#sec-map`, `#sec-tax-records`, and `#sec-reports`.
  - Strict script-loading hierarchy ensuring external libraries (Chart.js, SheetJS, jsPDF) load before the ArcGIS JS API AMD loader to prevent Dojo `multipleDefine` errors.
- **Key Elements**: `.app-header`, `.header-nav-center`, `#app-content`, `#dashboard-mount`, `#map-mount`, `#tax-records-mount`, `#reports-mount`.

#### `.gitignore`
- **Purpose**: Prevents operating system artifacts, temporary build caches, and logs from polluting the repository.
- **Contents**: Ignores `Thumbs.db`, `.DS_Store`, `Desktop.ini`, `*.tmp`, `*.log`.

#### `skills-lock.json`
- **Purpose**: Version lockfile for installed agentic design and UI styling skills (`ui-ux-pro-max`, `frontend-design`, `ui-styling`).

#### `js/06-08-26(POC Portal).code-workspace`
- **Purpose**: VS Code workspace settings file defining editor conventions and folder bindings for the Shahapur GIS project.

---

### 2. Stylesheets (`css/`)

#### `css/base.css`
- **Purpose**: Foundation stylesheet establishing design tokens, typography, and base CSS variables.
- **Contents**:
  - Google Font import: *Plus Jakarta Sans* (weights 300 to 800).
  - `:root` design tokens:
    - Primary ocean/teal civic palette: `--color-primary: #0A4259`, `--color-primary-light: #00B4D8`, `--color-primary-dark: #072e3f`.
    - Surface colors: `--color-bg-base: #F8F9FA`, `--color-bg-surface: #FFFFFF`.
    - Semantic feedback: `--color-success: #10B981`, `--color-warning: #F59E0B`, `--color-danger: #EF4444`.
    - Elevation shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-inner`).
    - Smooth cubic-bezier transition curves (`--transition-fluid`, `--transition-fast`).
  - Global box-sizing, typography scales, and custom scrollbar overrides.

#### `css/layout.css`
- **Purpose**: Structural layout framework governing page shells, header bars, and responsive view containers.
- **Contents**:
  - Layout styles for the landing hero section and centered login card.
  - `.app-body` and `.app-header` styling (gradient teal background, fixed 56px height, navigation pills).
  - Main viewport container (`.app-container`, `.content-area`) managing full-bleed map docking and scrolling dashboards.
  - Responsive media queries for mobile devices, tablets, and desktop displays.

#### `css/components.css`
- **Purpose**: Visual styling for UI components adhering to the **UI/UX Pro Max** design system.
- **Contents**:
  - **Bento Grid Architecture**: `.db-kpi-grid`, `.db-bento-card`, `.db-header-bar`.
  - **KPI Cards**: Squircle badge counters, status pills, and trend indicators (`↗ +12`, `↗ +28`).
  - **Dashboard Chart Containers**: Custom responsive aspect ratio containers for Canvas charts.
  - **Custom Donut Legends**: Grid-aligned HTML legends with color swatches and percentage values.
  - **Buttons & Forms**: `.btn-primary`, `.btn-secondary`, `.btn-logout-pill`, inputs, select dropdowns.
  - **Data Tables**: Striped assessment table styles, status badges (`paid`, `pending`), search bars, and pagination controls.
  - **Audit Timeline**: Feed items, pulsing status dots, and timestamp badges.

#### `css/map.css`
- **Purpose**: Specialized styling and theme overrides for the ArcGIS JS API MapView.
- **Contents**:
  - `.full-bleed-map` absolute positioning covering 100% of the map viewport.
  - Hides default Esri attribution bars and repositions default zoom/home controls.
  - Custom floating tool rail (`.map-tool-rail`) housing measurement, layer, and basemap buttons.
  - Collapsible side layer control panel with opacity sliders and visibility toggles.
  - Live cursor coordinate badge (`.map-coords`) showing real-time Latitude/Longitude.
  - Custom skinning for ArcGIS FeatureLayer popup windows and graphic highlight markers.

---

### 3. Core Application Logic (`js/`)

#### `js/auth.js`
- **Purpose**: Client-side authentication and session lifecycle management.
- **Key Functions**:
  - `initLogin()`: Validates form input against predefined credentials, sets session token, and navigates to `app.html`.
  - `checkAuth()`: Inspects `sessionStorage.getItem('tax_portal_session')`. Redirects unauthenticated visitors to `index.html` and authenticated users directly into `app.html`.
  - `initLogout()`: Clears session storage and redirects to the login screen.
- **Session Key**: `'tax_portal_session'`.

#### `js/router.js`
- **Purpose**: Lightweight, zero-dependency client-side hash router.
- **Key Functions**:
  - `initRouter()`: Listens to the `window.onhashchange` event.
  - Translates hash routes (`#/dashboard`, `#/map`, `#/tax-records`, `#/reports`) into view visibility changes.
  - Synchronizes active link styling across both header navigation pills and mobile dropdowns.
  - Dynamically invokes render callbacks (`window.renderDashboard()`, `window.renderTaxRecords()`, `window.renderReports()`).

#### `js/sidebar.js`
- **Purpose**: Controls navigation drawer toggles and header module dropdowns.
- **Key Functions**:
  - `initSidebar()`: Handles toggle actions for the header module menu and responsive sidebar drawers.
  - Dispatches `window.dispatchEvent(new Event('resize'))` when toggling so the ArcGIS MapView and Chart.js canvases reflow smoothly.

#### `js/dashboard.js`
- **Purpose**: Powers the executive analytics dashboard with 9 interactive visualizations and Bento metrics.
- **Key Functions**:
  - `window.renderDashboard()`: Mounts the Bento grid DOM structure and initializes all Chart.js instances.
  - Chart Initializers:
    - **Monthly Tax Collection**: Canvas linear gradient vertical bar chart with collected vs pending revenue.
    - **Annual Council Target**: Progress bar metric tracking ₹84.0L towards ₹100.0L budget goal.
    - **Land Use Distribution**: Donut chart with centered `240 Ha` typography and custom HTML legend.
    - **Building Classification**: Stacked bar chart across Wards 1 to 4 (Residential, Commercial, Government).
    - **Financial Health Gauge**: Semi-donut gauge displaying 80% collection efficiency.
    - **Electric Infrastructure**: Curved area chart with purple gradient fill (transmission lines vs poles).
    - **Solar Point Installation**: Comparison bar chart (Installed vs Planned units).
    - **Roads & Bridges**: Horizontal bar chart comparing Kutcha road lengths and bridge counts.
  - Ward Filter Controller (`#db-ward-filter`): Dynamically updates dataset numbers and re-renders chart series when switching between Ward 1, 2, 3, 4, or All Wards.
  - Chart lifecycle safety: Automatically destroys existing `activeDashboardCharts` before re-rendering to prevent canvas memory leaks.

#### `js/map.js`
- **Purpose**: ArcGIS Maps SDK for JavaScript (v4.29) Map and MapView lifecycle manager.
- **Key Constants & Functions**:
  - `MAPSERVER_URL`: Live MRSAC MapServer endpoint (`https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer`).
  - `LAYER_DEFS`: Array of 15 layer metadata definitions (IDs 0 to 14) with titles, groups, and initial visibility.
  - `initMap()`: Creates `esri/Map`, `esri/views/MapView`, registers layers, sets initial extent (`center: [76.3857, 18.7247]`, `zoom: 14`), and mounts interactive widgets.
  - Coordinate Tracking: Listens to `view.on('pointer-move')` and updates real-time geographic coordinates.

#### `js/layers.js`
- **Purpose**: Operational layer registry, WMS layer integration, and layer visibility controller.
- **Key Features**:
  - External Tile Layers: Adds Google Satellite and Google Hybrid base layers.
  - WMS Services: Connects to MRSAC Geoserver WMS for Maharashtra District and Taluka administrative boundaries.
  - `buildLayerUI()`: Generates the collapsible layer panel with bulk "Show All / Hide All" controls and real-time opacity sliders.
  - Spatial Masking (`applyWardSpatialMask(ward)`): Queries Ward boundary geometry and applies a spatial definition query across all feature layers.
  - In-Memory Cache: Stores fetched geometries in `window.wardGeomCache` for instant ward switching.

#### `js/tools.js`
- **Purpose**: Interactive map measurement tools and geospatial utilities.
- **Key Features**:
  - Area measurement widget (`esri/widgets/Measurement` with `activeTool = "area"`).
  - Distance measurement widget (`activeTool = "distance"`).
  - Expandable Basemap Gallery (`esri/widgets/BasemapGallery`).
  - Fullscreen toggle, GPS locate tool, and Extent reset button.

#### `js/mockData.js`
- **Purpose**: Generates and persists a realistic property tax dataset when no live backend API is connected.
- **Key Details**:
  - Generates 500 property records matching GIS `OBJECTID_1` building identifiers across Wards 1 to 10.
  - Attributes: `propertyId`, `wardNo`, `ownerName`, `assessedAmount`, `paidAmount`, `pendingAmount`, `status` ("Paid" | "Pending"), and `lastPaymentDate`.
  - Persists data in browser `localStorage` under `'gis_tax_records_dataset'`.
  - Exposes `resetMockData()` to restore the initial state.

#### `js/taxRecords.js`
- **Purpose**: Ward-wise tax assessment table, search interface, and Excel upload parser.
- **Key Features**:
  - Search by Property ID or Owner Name with live table debounce filtering.
  - Ward dropdown filter (Wards 1–10).
  - **Phase 2 Excel Ingestion**: Reads uploaded `.xlsx`, `.xls`, or `.csv` files using SheetJS (`XLSX.read`), validates column headers, updates the dataset in memory and `localStorage`, and displays a success banner.
  - Sample Excel generator (`#btn-download-sample`): Generates and downloads a pre-formatted template spreadsheet for quick testing.
  - Modal Property Inspector: Clicking any table row opens a modal dialog displaying detailed tax history.

#### `js/reports.js`
- **Purpose**: Municipal report filtering interface and export orchestration.
- **Key Features**:
  - Report type selector:
    1. *Ward-wise Tax Collection* (aggregates assessed vs paid amounts by ward).
    2. *Ward-wise Unpaid Tax Properties* (filters records with pending balances).
    3. *Defaulters List (All Wards)* (identifies top outstanding balances).
  - Dynamic filter panel: Ward selector and minimum outstanding balance slider.
  - Export action triggers dispatching filtered data to PDF, Excel, and CSV export modules.

---

### 4. Export Engines (`js/export/`)

#### `js/export/exportCsv.js`
- **Purpose**: Client-side CSV generation following the RFC-4180 standard.
- **Features**:
  - Prepends UTF-8 Byte Order Mark (`\uFEFF`) so Marathi and Unicode characters render correctly in Microsoft Excel.
  - Sanitizes and escapes text fields with quotes to prevent CSV injection.
  - Automatically triggers browser download via a temporary Blob URL.

#### `js/export/exportExcel.js`
- **Purpose**: Native Excel (`.xlsx`) workbook generation using SheetJS (`XLSX`).
- **Features**:
  - Converts JSON assessment objects into an Excel worksheet via `XLSX.utils.json_to_sheet()`.
  - Assigns clean column headers (`Property ID`, `Owner Name`, `Ward No`, `Assessed Amount (Rs)`, `Paid Amount (Rs)`, `Pending Amount (Rs)`, `Status`).
  - Packages sheets into a workbook and triggers an instant download.

#### `js/export/exportPdf.js`
- **Purpose**: Formatted municipal PDF certificate and report generator using `jsPDF` and `jspdf-autotable`.
- **Features**:
  - Adds municipal report header with title and timestamp.
  - Formats data into a striped auto-table with branded header styling (`#0A4259`).
  - Supports automatic multi-page pagination with clean page numbering.

---

### 5. Design Skills & Assets (`.agents/skills/`)

#### `.agents/skills/brainstorming/`
- **Purpose**: Interactive exploratory design and requirement refinement skill. Contains guidance for scoping design directions, visual companion specs, and design checking routines before code generation.

#### `.agents/skills/ui-ux-pro-max/`
- **Purpose**: Design intelligence skill containing color reasoning palettes, typographic pairings, chart specifications, and UX guidelines used to craft the Shahapur portal interface.
- **Contents**:
  - `data/`: CSV catalogs for charts, colors, Google fonts, icons, product archetypes, motion curves, and UX heuristics.
  - `scripts/`: Python utility scripts (`core.py`, `design_system.py`, `search.py`) for querying design systems and tokens.
  - `references/`: UI design rule references and style taxonomies.

#### `.agents/skills/ui-styling/`
- **Purpose**: Typography repository containing font licenses and open-source TrueType font files (Geist Mono, Outfit, Instrument Sans, IBM Plex, Bricolage Grotesque) for canvas drawing.

#### `.agents/skills/frontend-design/`
- **Purpose**: Creative frontend design guidelines focusing on intentional typography, spatial layouts, and avoiding generic templates.

---

## Geospatial Layer Catalog (MRSAC MapServer)

The portal connects directly to the MRSAC live ArcGIS MapServer endpoint:  
`https://gsc.mrsac.org.in/webadpgis2/rest/services/test/Test2/MapServer`

| Layer ID | Layer Name | Layer Group | Geometry Type | Default State |
| :---: | :--- | :--- | :--- | :---: |
| **0** | Council Boundary | Boundaries | Polygon | **ON** |
| **14** | Ward Boundary | Boundaries | Polygon | OFF |
| **11** | Landuse | Boundaries | Polygon | OFF |
| **7** | Kutcha Road | Roads & Rail | Polyline | OFF |
| **12** | Railway Line | Roads & Rail | Polyline | OFF |
| **4** | Electric Line | Utilities | Polyline | OFF |
| **10** | Street Light Poles | Utilities | Point | OFF |
| **13** | Solar Panel | Utilities | Point | OFF |
| **6** | High Tension Line | Utilities | Polyline | OFF |
| **2** | Building (Properties) | Structures | Polygon | OFF |
| **3** | Compound Wall | Structures | Polyline | OFF |
| **5** | Fencing | Structures | Polyline | OFF |
| **1** | Bridge | Structures | Polygon / Point | OFF |
| **8** | Location Name | Labels | Point / Annotation | OFF |
| **9** | Other | Labels | Miscellaneous | OFF |

### External Tile & WMS Layers

- **Google Satellite**: High-resolution aerial imagery (`https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}`).
- **Google Hybrid**: Satellite imagery with street names and administrative labels (`lyrs=y`).
- **Maharashtra District WMS**: State district boundaries via `https://geo.mrsac.org.in/geoserver/admin_boundary/wms` (`admin_boundary:district`).
- **Maharashtra Taluka WMS**: Taluka administrative boundaries (`admin_boundary:taluka`).

---

## Getting Started & Local Setup

Because the portal is built as a pure client-side web application without build pipelines or Node bundling requirements, you can run it using any local HTTP server.

### Option 1: Python HTTP Server (Recommended)

1. Open PowerShell or Command Prompt in the project root directory:
   ```powershell
   cd "e:\Share_Me\MANTHAN BACKUP\Abhijeet Sir 2\Shahapur"
   ```
2. Start the Python web server:
   ```powershell
   python -m http.server 8080
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:8080
   ```

### Option 2: Node.js `serve` / `http-server`

```powershell
npx serve -l 8080 .
# or
npx http-server -p 8080
```

### Option 3: VS Code Live Server Extension

1. Open the project folder in **Visual Studio Code**.
2. Right-click [`index.html`](index.html) and select **Open with Live Server**.

---

## Default Login Credentials

Access to [`app.html`](app.html) is protected by a session guard in [`js/auth.js`](js/auth.js). Use the following credentials to authenticate:

| Field | Value |
| :--- | :--- |
| **Email** | `admin@gmail.com` |
| **Password** | `112233` |
| **Session Mode** | `sessionStorage` token (`tax_portal_session: true`) |

> [!NOTE]
> Logging out removes the session token and automatically redirects the user back to `index.html`.

---

## Developer Notes & Script Load Order Rules

### 1. Dojo AMD / ArcGIS Script Conflict Prevention
The ArcGIS JavaScript API uses a Dojo-based AMD loader (`require([...])`). If generic UMD libraries like Chart.js or SheetJS are loaded *after* `https://js.arcgis.com/4.29/`, Dojo will intercept their `define` calls and trigger a `multipleDefine` fatal error.

**Strict Script Hierarchy in `app.html`**:
```html
<!-- 1. Third-party UMD libraries MUST load FIRST -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>

<!-- 2. ArcGIS JS API loads SECOND -->
<link rel="stylesheet" href="https://js.arcgis.com/4.29/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.29/"></script>

<!-- 3. Application modules load THIRD -->
<script src="js/mockData.js"></script>
<script src="js/auth.js"></script>
<script src="js/router.js"></script>
<script src="js/map.js"></script>
...
```

### 2. Browser Extension Crash Guard Shield
Certain browser extensions (e.g., price trackers, shopping assistants) inject content scripts that throw unhandled runtime errors. Both [`index.html`](index.html) and [`app.html`](app.html) include a crash guard shield at the very top of `<head>` that intercepts and suppresses these third-party errors without interrupting application execution.

---

## Git Repository & Sync

This project is tracked in Git and synced with GitHub:

- **Remote Origin**: `https://github.com/manthan-raut/POC--Shahpur.git`
- **Default Branch**: `main`

To stage and push future modifications:
```powershell
git add .
git commit -m "feat: your feature description"
git push origin main
```

---

*Authored for the Shahapur Municipal Council Geospatial Tax Administration System.*
