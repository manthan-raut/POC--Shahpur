const fs = require('fs');

// Mock browser environment for Node.js
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
const elemCache = {};
global.document = {
  getElementById: (id) => {
    if (!elemCache[id]) {
      elemCache[id] = {
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        addEventListener: () => {},
        appendChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => null
      };
    }
    return elemCache[id];
  },
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag,
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {}
  }),
  body: { appendChild: () => {}, removeChild: () => {} }
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.encodeURI = encodeURI;
global.encodeURIComponent = encodeURIComponent;

console.log('--- Testing Shahapur GIS Data & Logic Integration ---');

// 1. Load Data Files
eval(fs.readFileSync('data/summaryStats.js', 'utf8'));
eval(fs.readFileSync('data/taxRecordsData.js', 'utf8'));
eval(fs.readFileSync('data/buildingsData.js', 'utf8'));
eval(fs.readFileSync('data/councilData.js', 'utf8'));
eval(fs.readFileSync('data/wardsData.js', 'utf8'));

console.log('✓ Summary Stats: Total Properties =', window.SHAHAPUR_SUMMARY_STATS.totalProperties, 
  '| Buildings =', window.SHAHAPUR_SUMMARY_STATS.totalBuildings,
  '| Total Assessed Tax = Rs.', window.SHAHAPUR_SUMMARY_STATS.totalAssessed,
  '| Rateable Value = Rs.', window.SHAHAPUR_SUMMARY_STATS.totalRateableValue);

console.log('✓ Tax Records Array Length =', window.SHAHAPUR_TAX_DATA.length);
console.log('✓ Building Polygons Array Length =', window.SHAHAPUR_BUILDINGS_DATA.features.length);

// 2. Load Services and Tools
eval(fs.readFileSync('js/mockData.js', 'utf8'));
eval(fs.readFileSync('js/tools.js', 'utf8'));
eval(fs.readFileSync('js/taxRecords.js', 'utf8'));

// 3. Test multi-unit apartment polygon (Property #2 in Ward 1, OBJECTID 186)
const bldg2 = window.SHAHAPUR_BUILDINGS_DATA.features.find(f => f.properties.wardNo === '1' && (f.properties.OBJECTID === 186 || (f.properties.newPropNo && f.properties.newPropNo.startsWith('2,'))));
if (!bldg2) {
  console.error('FAILED: Property #2 not found in buildingsData!');
  process.exit(1);
}

console.log('\n--- Multi-Unit Apartment Verification (Property #2) ---');
console.log('Building Name:', bldg2.properties.buildingName);
console.log('Units Count in Polygon:', bldg2.properties.unitsCount);
console.log('NewPropNo DBF Attribute:', bldg2.properties.newPropNo);
console.log('Total Assessed Tax Demand:', bldg2.properties.totalAssessed);

if (bldg2.properties.units.length < 15) {
  console.error('FAILED: Expected 18-19 units in Property #2, got:', bldg2.properties.units.length);
  process.exit(1);
}

// Verify that photos and plans exist on disk
let diskPhotosFound = 0;
let diskPlansFound = 0;
bldg2.properties.units.forEach((u, idx) => {
  if (u.photos && u.photos.length > 0) {
    const photoPath = 'Shahapur photos/Shahapur photos/' + u.photos[0];
    if (fs.existsSync(photoPath)) diskPhotosFound++;
  }
  if (u.plan) {
    const planPath = 'PLANS/PLANS_PNG/' + u.plan;
    if (fs.existsSync(planPath)) diskPlansFound++;
  }
});

console.log(`✓ Unit Photos verified on disk for Property #2: ${diskPhotosFound} / ${bldg2.properties.units.length}`);
console.log(`✓ Unit Floor Plans verified on disk for Property #2: ${diskPlansFound} / ${bldg2.properties.units.length}`);

// 4. Test showPropertyPanel execution for Property #2
console.log('\n--- Testing showPropertyPanel() with Partition Slider ---');
window.showPropertyPanel(bldg2.properties);

if (!window.__currentPropPanelState) {
  console.error('FAILED: window.__currentPropPanelState was not populated!');
  process.exit(1);
}

const fail = msg => { console.error('FAILED:', msg); process.exit(1); };
const state = window.__currentPropPanelState;
console.log('✓ __currentPropPanelState populated: units =', state.units.length, '| unitIdx =', state.unitIdx);

// Slider moves exactly one unit and clamps at the ends
window.slidePropUnit(1);
if (state.unitIdx !== 1) fail('slidePropUnit(1) should select unit 1, got ' + state.unitIdx);
window.goToPropUnit(5);
if (state.unitIdx !== 5) fail('goToPropUnit(5) should select unit 5, got ' + state.unitIdx);
window.goToPropUnit(999);
if (state.unitIdx !== 5) fail('goToPropUnit(999) must be ignored');
console.log('✓ Partition slider: next / jump / clamp OK');

// The rendered unit shows ONLY its own photo (ward-prop-partition match)
const unit5 = state.units[5];
const unitHtml = document.getElementById('pp-unit').innerHTML + document.getElementById('pp-media').innerHTML;
const [w5, p5, k5] = unit5.unitKey.split('-');
const expectedPrefix = k5 === '0' ? `${w5}-${p5}-` : `${w5}-${p5}-${k5}-`;
if (!unit5.photos.length || !unitHtml.includes(encodeURI(unit5.photos[0]))) fail('unit 5 photo not rendered');
if (!unit5.photos[0].startsWith(expectedPrefix)) fail(`unit 5 photo ${unit5.photos[0]} does not match key ${unit5.unitKey}`);
console.log('✓ Slide 5 shows its own photo:', unit5.photos[0], 'for unit', unit5.unitKey);

// Every unit in the whole register: photos/plans carry the unit's own key
let checked = 0;
// "1-2-3-A.jpg" / "WD 1-2.png" -> "1-2-3" / "1-2-0"
const mediaKey = f => {
  const m = String(f).match(/^(?:WD\s*)?(\d+)-(\d+)(?:-(\d+))?/);
  return m ? `${m[1]}-${m[2]}-${m[3] || 0}` : null;
};
window.SHAHAPUR_TAX_DATA.forEach(u => {
  (u.photos || []).filter(f => !/ to /i.test(f)).concat(u.plans || []).forEach(f => {
    checked++;
    if (mediaKey(f) !== u.unitKey) fail(`media ${f} attached to wrong unit ${u.unitKey}`);
  });
});
console.log(`✓ ${checked} photo/plan links verified against their ward-property-partition key`);

// 5. Test printPropertyCard
console.log('\n--- Testing printPropertyCard() ---');
const printableElem = document.getElementById('printable-property-card');
window.printPropertyCard(bldg2.properties.units[0].propertyId, '1');

const printHtml = printableElem.innerHTML;
if (!printHtml.includes('Official Municipal Property Assessment')) {
  console.error('FAILED: printPropertyCard did not generate expected assessment card!');
  console.error('printHtml content:', printHtml);
  process.exit(1);
}
console.log('✓ printPropertyCard successfully generated clean, printable assessment card (length:', printHtml.length, 'chars)');
if (printHtml.includes('undefined') || printHtml.includes('NaN')) {
  console.error('FAILED: printHtml contains undefined or NaN!');
  process.exit(1);
}
console.log('✓ printPropertyCard has zero undefined or NaN fields');

console.log('\n=== ALL INTEGRATION & PRECISION CHECKS PASSED PERFECTLY ===\n');
