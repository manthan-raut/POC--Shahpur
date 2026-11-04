// js/mockData.js

/**
 * MOCK TAX DATA MODULE
 * 
 * Note: Since a real backend API is not provided, we mock the tax dataset here.
 * The primary identifier matches the `OBJECTID_1` field from the MapServer `Building` (Layer 2).
 * Wards match the `Ward_No` from the `Ward_Boundary` (Layer 14).
 * 
 * Expected shape of a real API response:
 * [
 *   {
 *     "propertyId": Number (maps to Building OBJECTID_1),
 *     "wardNo": String (maps to Ward_Boundary Ward_No),
 *     "ownerName": String,
 *     "assessedAmount": Number,
 *     "paidAmount": Number,
 *     "pendingAmount": Number,
 *     "status": "Paid" | "Pending",
 *     "lastPaymentDate": String (YYYY-MM-DD)
 *   },
 *   ...
 * ]
 */

// Load from localStorage if available, otherwise generate
const STORAGE_KEY = 'gis_tax_records_dataset';
let mockTaxData = [];

function initMockData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      mockTaxData = JSON.parse(saved);
      return;
    } catch(e) {
      console.error("Failed to load saved tax data, generating new mock data", e);
    }
  }

  const WARD_NOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const OWNER_FIRST = ["Ramesh", "Suresh", "Anjali", "Priya", "Vikram", "Neha", "Rahul", "Kavita", "Amit", "Sneha"];
  const OWNER_LAST = ["Patil", "Deshmukh", "Joshi", "Kulkarni", "Jadhav", "Shinde", "Pawar", "Bhosale", "Kale", "Kadam"];

  // Generate 500 dummy tax records assuming OBJECTID_1 ranges from 1 to 1000 roughly
  for (let i = 1; i <= 500; i++) {
    const propertyId = i; // Will match OBJECTID_1 in GIS
    const wardNo = WARD_NOS[Math.floor(Math.random() * WARD_NOS.length)];
    const ownerName = `${OWNER_FIRST[Math.floor(Math.random() * OWNER_FIRST.length)]} ${OWNER_LAST[Math.floor(Math.random() * OWNER_LAST.length)]}`;
    
    const assessedAmount = Math.floor(Math.random() * 10000) + 1000;
    
    // 70% paid, 30% pending
    const isPaid = Math.random() > 0.3;
    let paidAmount = 0;
    let pendingAmount = assessedAmount;
    let status = "Pending";
    let lastPaymentDate = null;
    
    if (isPaid) {
      paidAmount = assessedAmount;
      pendingAmount = 0;
      status = "Paid";
      
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365));
      lastPaymentDate = date.toISOString().split('T')[0];
    } else if (Math.random() > 0.5) {
      // Partially paid
      paidAmount = Math.floor(assessedAmount / 2);
      pendingAmount = assessedAmount - paidAmount;
      status = "Pending";
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365) - 365);
      lastPaymentDate = date.toISOString().split('T')[0];
    }
    
    mockTaxData.push({
      propertyId,
      wardNo,
      ownerName,
      assessedAmount,
      paidAmount,
      pendingAmount,
      status,
      lastPaymentDate
    });
  }

  saveDataToStorage();
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTaxData));
}

initMockData();

// Helpers for Dashboard, Map, and Reports
window.TaxDataService = {
  getAll: () => mockTaxData,
  
  getByPropertyId: (id) => mockTaxData.find(t => t.propertyId === parseInt(id)),
  
  getByWard: (wardNo) => mockTaxData.filter(t => t.wardNo === wardNo.toString()),

  searchRecords: (query) => {
    const q = query.toString().toLowerCase();
    return mockTaxData.filter(t => 
      t.propertyId.toString() === q || 
      t.ownerName.toLowerCase().includes(q) || 
      t.wardNo.toString() === q
    );
  },
  
  getSummary: () => {
    let totalAssessed = 0, totalCollected = 0, totalPending = 0;
    mockTaxData.forEach(t => {
      totalAssessed += Number(t.assessedAmount || 0);
      totalCollected += Number(t.paidAmount || 0);
      totalPending += Number(t.pendingAmount || 0);
    });
    return {
      totalProperties: mockTaxData.length,
      totalAssessed,
      totalCollected,
      totalPending,
      collectionPercentage: totalAssessed > 0 ? ((totalCollected / totalAssessed) * 100).toFixed(2) : '0.00'
    };
  },
  
  getWardSummary: (wardNo) => {
    const data = wardNo === 'All' ? mockTaxData : window.TaxDataService.getByWard(wardNo);
    let totalAssessed = 0, totalCollected = 0, totalPending = 0;
    let paidCount = 0, pendingCount = 0;
    
    data.forEach(t => {
      totalAssessed += Number(t.assessedAmount || 0);
      totalCollected += Number(t.paidAmount || 0);
      totalPending += Number(t.pendingAmount || 0);
      if (t.status === 'Paid') paidCount++;
      else pendingCount++;
    });
    
    return {
      totalProperties: data.length,
      totalAssessed,
      totalCollected,
      totalPending,
      collectionPercentage: totalAssessed > 0 ? ((totalCollected / totalAssessed) * 100).toFixed(2) : 0,
      paidCount,
      pendingCount
    };
  },

  bulkUpdateRecords: (newRecords) => {
    let updatedCount = 0;
    let addedCount = 0;

    newRecords.forEach(rec => {
      const existingIdx = mockTaxData.findIndex(t => t.propertyId === Number(rec.propertyId));
      if (existingIdx !== -1) {
        mockTaxData[existingIdx] = {
          ...mockTaxData[existingIdx],
          ...rec,
          propertyId: Number(rec.propertyId),
          assessedAmount: Number(rec.assessedAmount || 0),
          paidAmount: Number(rec.paidAmount || 0),
          pendingAmount: Number(rec.pendingAmount || 0)
        };
        updatedCount++;
      } else {
        mockTaxData.push({
          propertyId: Number(rec.propertyId),
          wardNo: rec.wardNo ? rec.wardNo.toString() : "1",
          ownerName: rec.ownerName || "Unknown Owner",
          assessedAmount: Number(rec.assessedAmount || 0),
          paidAmount: Number(rec.paidAmount || 0),
          pendingAmount: Number(rec.pendingAmount || 0),
          status: rec.status || (Number(rec.pendingAmount) === 0 ? "Paid" : "Pending"),
          lastPaymentDate: rec.lastPaymentDate || new Date().toISOString().split('T')[0]
        });
        addedCount++;
      }
    });

    saveDataToStorage();
    return { updatedCount, addedCount };
  },

  resetData: () => {
    localStorage.removeItem(STORAGE_KEY);
    mockTaxData = [];
    initMockData();
  }
};
