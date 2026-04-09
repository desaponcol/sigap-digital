/**
 * GOOGLE APPS SCRIPT FOR SIGAP APP (AUTO-SETUP VERSION)
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste this code.
 * 4. Click "Deploy" > "New Deployment".
 * 5. Select "Web App", Execute as "Me", Who has access "Anyone".
 * 6. Update SCRIPT_URL in src/services/api.ts with the new URL.
 */

// --- CONFIGURATION ---
// If you are using a standalone script, put your Spreadsheet ID here.
// Otherwise, it will use the active spreadsheet where the script is bound.
const SPREADSHEET_ID = ""; 

function getSS() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Automatically creates a menu in the Spreadsheet for manual setup
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 SIGAP SETUP')
    .addItem('Inisialisasi Semua Sheet', 'setupSheets')
    .addToUi();
}

/**
 * Main Setup Function
 */
function setupSheets() {
  const ss = getSS();
  
  const sheets = [
    { name: 'users', headers: ['email', 'password', 'name', 'role', 'avatar'] },
    { name: 'attendance', headers: ['timestamp', 'email', 'status', 'location'] },
    { name: 'reports', headers: ['date', 'email', 'detail', 'output', 'timestamp'] },
    { name: 'settings', headers: ['office_lat', 'office_lng', 'allowed_radius', 'nama_desa', 'nama_kecamatan', 'nama_kepala_desa', 'nama_sekretaris_desa'] }
  ];

  sheets.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
    }
    
    // Always ensure headers are correct and formatted
    sheet.getRange(1, 1, 1, s.headers.length).setValues([s.headers]);
    sheet.getRange(1, 1, 1, s.headers.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, s.headers.length).setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  });

  // Add a default user if users sheet is empty (except header)
  const userSheet = ss.getSheetByName('users');
  if (userSheet.getLastRow() === 1) {
    userSheet.appendRow(['maswardi75@gmail.com', '123456', 'Ahmad Dani', 'Admin', '']);
  }

  return "Setup Berhasil!";
}

function doPost(e) {
  return doGet(e);
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = getSS();
  
  // Auto-setup on every request if sheets are missing
  if (!ss.getSheetByName('settings')) {
    setupSheets();
  }
  
  const output = (data) => {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  };

  try {
    // Helper to get sheet
    const getSheet = (name) => ss.getSheetByName(name);

    // --- SETUP ACTION ---
    if (action === 'setup') {
      const msg = setupSheets();
      return output({ success: true, message: msg });
    }

    // --- LOGIN ---
    if (action === 'login') {
      const email = e.parameter.email;
      const pass = e.parameter.pass;
      const sheet = getSheet('users');
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === String(email).toLowerCase() && String(data[i][1]) === String(pass)) {
          return output({
            success: true,
            user: {
              email: data[i][0],
              name: data[i][2],
              role: data[i][3],
              avatar: data[i][4] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
            }
          });
        }
      }
      return output({ success: false });
    }

    // --- GET USERS (Admin only) ---
    if (action === 'getUsers') {
      const sheet = getSheet('users');
      const data = getRowsData(sheet);
      return output(data);
    }

    // --- ATTENDANCE ---
    if (action === 'getAttendance') {
      const sheet = getSheet('attendance');
      const email = e.parameter.email;
      let data = getRowsData(sheet);
      if (email) {
        data = data.filter(r => String(r.email).toLowerCase() === String(email).toLowerCase());
      }
      return output(data);
    }

    if (action === 'saveAttendance') {
      const sheet = getSheet('attendance');
      const now = new Date();
      const formattedTimestamp = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm:ss");
      sheet.appendRow([
        formattedTimestamp,
        e.parameter.email || "",
        e.parameter.status || "",
        e.parameter.location || ""
      ]);
      return output({ success: true });
    }

    // --- REPORTS ---
    if (action === 'getReports') {
      const sheet = getSheet('reports');
      const email = e.parameter.email;
      let data = getRowsData(sheet);
      if (email) {
        data = data.filter(r => String(r.email).toLowerCase() === String(email).toLowerCase());
      }
      return output(data);
    }

    if (action === 'saveReport') {
      const sheet = getSheet('reports');
      const now = new Date();
      const formattedTimestamp = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm:ss");
      
      let reportDate = e.parameter.date || "";
      // Convert YYYY-MM-DD to DD/MM/YYYY if needed
      if (reportDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = reportDate.split('-');
        reportDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      sheet.appendRow([
        reportDate,
        e.parameter.email || "",
        e.parameter.detail || "",
        e.parameter.output || "",
        formattedTimestamp
      ]);
      return output({ success: true });
    }

    // --- SETTINGS ---
    if (action === 'getSettings') {
      const sheet = getSheet('settings', ['office_lat', 'office_lng', 'allowed_radius', 'nama_desa', 'nama_kecamatan', 'nama_kepala_desa', 'nama_sekretaris_desa']);
      const data = getRowsData(sheet);
      return output(data[0] || {});
    }

    if (action === 'saveSettings') {
      const headers = ['office_lat', 'office_lng', 'allowed_radius', 'nama_desa', 'nama_kecamatan', 'nama_kepala_desa', 'nama_sekretaris_desa'];
      const sheet = getSheet('settings', headers);
      
      // Force headers in row 1
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      
      // Clear all data except header to ensure "overwrite" behavior
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      
      const newRowData = headers.map(header => e.parameter[header] || "");
      
      // Use setValues for row 2 to be more explicit than appendRow
      sheet.getRange(2, 1, 1, headers.length).setValues([newRowData]);
      return output({ success: true, saved: newRowData });
    }

    return output({ error: 'Action not found: ' + action });
  } catch (err) {
    return output({ error: err.toString() });
  }
}

/**
 * Helper to convert sheet rows to JSON objects
 */
function getRowsData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = { id: i };
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}
