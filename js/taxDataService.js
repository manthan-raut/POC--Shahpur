// js/taxDataService.js  (real register data from data/taxRecordsData.js)

/**
 * SHAHAPUR TAX DATA SERVICE MODULE
 * 
 * Aggregated and verified from:
 * - Shahapur DATA_31-10-26.xlsx (8,685 real property tax assessments across Wards 1 to 5)
 * - Shahapur photos/Shahapur photos (11,005 indexed photographic building assets)
 * - Shahapur Tagged Data/FINAL DATA TAGGED (Ward 1 to 5 polygon footprints)
 */

console.log('[Shahapur GIS - TaxData] Loading TaxDataService module...');

// Bump the key whenever scripts/build_data.py changes the record shape, so stale caches are ignored
const STORAGE_KEY = 'gis_tax_records_dataset_v3';
let taxDataset = [];

function initTaxData() {
  console.log('[Shahapur GIS - TaxData] Initializing tax dataset from storage key:', STORAGE_KEY);
  
  // Remove cached datasets from older app versions
  try {
    ['gis_tax_records_dataset', 'gis_tax_records_dataset_v2'].forEach(k => localStorage.removeItem(k));
  } catch(e) {}

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 8000) {
        taxDataset = parsed;
        console.info('[Shahapur GIS - TaxData] Successfully loaded', taxDataset.length, 'records from localStorage.');
        return;
      }
    } catch(e) {
      console.error("[Shahapur GIS - TaxData] Failed to parse saved tax data from localStorage:", e);
    }
  }

  // Load from pre-synthesized Shahapur Excel dataset
  if (typeof window !== 'undefined' && window.SHAHAPUR_TAX_DATA && window.SHAHAPUR_TAX_DATA.length > 0) {
    taxDataset = window.SHAHAPUR_TAX_DATA;
    console.info('[Shahapur GIS - TaxData] Initialized with', taxDataset.length, 'real Shahapur property records from Excel.');
    saveDataToStorage();
    return;
  }

  console.warn('[Shahapur GIS - TaxData] window.SHAHAPUR_TAX_DATA not found. Waiting for data script load...');
  taxDataset = [];
}

function saveDataToStorage() {
  try {
    // Only store delta/custom if under 5MB or keep in memory
    // For large 8K dataset, avoid hitting browser localStorage quota limits
    if (taxDataset.length <= 1500) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taxDataset));
      console.log('[Shahapur GIS - TaxData] Persisted', taxDataset.length, 'records to localStorage.');
    }
  } catch (err) {
    console.warn('[Shahapur GIS - TaxData] LocalStorage save skipped (exceeds browser quota):', err.message);
  }
}

initTaxData();

// Expose standard API expected across Portal Modules
window.TaxDataService = {
  getAll: () => {
    if ((!taxDataset || taxDataset.length === 0) && window.SHAHAPUR_TAX_DATA) {
      taxDataset = window.SHAHAPUR_TAX_DATA;
    }
    return taxDataset;
  },
  
  // Exact lookup only. A bare property number is NOT accepted because the same number
  // exists in every ward - use getAllByPropertyNo(ward, prop) for that.
  getByPropertyId: (id) => {
    if (id === null || id === undefined || id === '') return null;
    const strId = String(id).trim();
    const records = window.TaxDataService.getAll();
    return records.find(t => String(t.propertyId) === strId)          // ownerID from Excel
      || records.find(t => t.unitKey === strId)                         // "ward-prop-partition"
      || records.find(t => t.propIdentifier === strId)                  // "W1-2/3"
      || null;
  },

  getAllByPropertyNo: (wardNo, propNo) => {
    const w = String(wardNo).trim();
    const p = String(propNo).trim();
    const records = window.TaxDataService.getAll();
    return records.filter(t => String(t.wardNo) === w && String(t.propertyNo) === p);
  },
  
  getByWard: (wardNo) => {
    const records = window.TaxDataService.getAll();
    if (!wardNo || wardNo === 'All') return records;
    return records.filter(t => String(t.wardNo) === String(wardNo));
  },

  searchRecords: (query) => {
    const q = (query || '').toString().toLowerCase().trim();
    if (!q) return [];
    const records = window.TaxDataService.getAll();
    return records.filter(t => 
      String(t.propertyId) === q || 
      String(t.propertyNo) === q ||
      (t.propertyNoOld && t.propertyNoOld.toLowerCase().includes(q)) ||
      (t.shopNo && String(t.shopNo).toLowerCase().includes(q)) ||
      (t.wingNo && t.wingNo.toLowerCase() === q) ||
      (t.propIdentifier && t.propIdentifier.toLowerCase().includes(q)) ||
      (t.ownerName && t.ownerName.toLowerCase().includes(q)) || 
      (t.ownerNameMarathi && t.ownerNameMarathi.includes(q)) ||
      (t.shopBuildingName && t.shopBuildingName.toLowerCase().includes(q)) ||
      (t.citySurveyGatNo && t.citySurveyGatNo.toLowerCase().includes(q)) ||
      (t.contactNo && t.contactNo.includes(q)) ||
      (t.ownerAddress && t.ownerAddress.toLowerCase().includes(q))
    );
  },
  
  bulkUpdateRecords: (newRecords) => {
    console.log('[Shahapur GIS - TaxData] TaxDataService.bulkUpdateRecords() received', newRecords.length, 'records.');
    let updatedCount = 0;
    let addedCount = 0;
    const records = window.TaxDataService.getAll();

    newRecords.forEach(rec => {
      const existingIdx = records.findIndex(t => t.propertyId === Number(rec.propertyId));
      if (existingIdx !== -1) {
        // Merge only the fields supplied; everything else keeps its register value
        records[existingIdx] = { ...records[existingIdx], ...rec, propertyId: Number(rec.propertyId) };
        updatedCount++;
      } else {
        records.push({
          propertyId: Number(rec.propertyId),
          wardNo: rec.wardNo ? String(rec.wardNo) : "",
          ownerName: rec.ownerName || "",
          assessedAmount: Number(rec.assessedAmount || 0),
          paidAmount: Number(rec.paidAmount || 0),
          pendingAmount: Number(rec.pendingAmount || 0),
          status: rec.status || "",
          lastPaymentDate: rec.lastPaymentDate || "",
          photos: [],
          plans: [],
          buildingIds: []
        });
        addedCount++;
      }
    });

    taxDataset = records;
    saveDataToStorage();
    console.info('[Shahapur GIS - TaxData] Bulk update complete:', { updatedCount, addedCount, totalInDataset: records.length });
    return { updatedCount, addedCount };
  },

  resetData: () => {
    console.warn('[Shahapur GIS - TaxData] TaxDataService.resetData() invoked: Re-indexing from Shahapur Excel dataset.');
    localStorage.removeItem(STORAGE_KEY);
    if (window.SHAHAPUR_TAX_DATA) {
      taxDataset = [...window.SHAHAPUR_TAX_DATA];
    } else {
      taxDataset = [];
    }
  }
};
