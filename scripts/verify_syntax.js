const vm = require('vm');
const fs = require('fs');

const files = [
  'data/summaryStats.js',
  'data/councilData.js',
  'data/wardsData.js',
  'data/buildingsData.js',
  'data/taxRecordsData.js',
  'js/taxDataService.js',
  'js/auth.js',
  'js/sidebar.js',
  'js/router.js',
  'js/map.js',
  'js/layers.js',
  'js/tools.js',
  'js/dashboard.js',
  'js/taxRecords.js',
  'js/reports.js',
  'js/export/exportPdf.js',
  'js/export/exportExcel.js',
  'js/export/exportCsv.js'
];

let allOk = true;
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    new vm.Script(code, { filename: f });
    console.log('[VALID]', f, `(${(code.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    allOk = false;
    console.error(`[SYNTAX ERROR in ${f}]:`, err.message);
  }
}

if (allOk) {
  console.log('\nALL 15 JAVASCRIPT FILES ARE 100% SYNTACTICALLY VALID!');
} else {
  process.exit(1);
}

