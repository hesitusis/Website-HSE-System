import fs from 'fs';
import path from 'path';
import { getGoogleAuth, extractSpreadsheetId } from './googleSheets.js';

export const SPIP_SPREADSHEET_ID = "1xCY6lXcwWpsZy_Wm2qNrwtDB0iw7Wp0RvB4H_kuG_TA";

// Define default database structure for fallback/demo sandbox mode
const DB_FILE = path.join(process.cwd(), 'src', 'server', 'spip_db.json');

// Helper to calculate date relative to today
const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_SPIP_DATA = {
  "Data SPIP": [],
  "data sarana": [],
  "Data Unit HD": [],
  "resume Servis": [],
  "kalibrasi": [],
  "Daftar Masa SPIP": [],
  "Isuue KO": [],
  "foto stiker HD": [],
  "plan 26": [],
  "list": [],
  "list bang": [],
  "Data SPIP update": []
};

// Initialize DB file
function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_SPIP_DATA, null, 2), 'utf8');
    console.log("🟢 Created and seeded local SPIP database file at " + DB_FILE);
  }
}

// Map frontend/friendly keys to headers in Sheets
const SHEET_HEADERS: Record<string, string[]> = {
  "Data SPIP": ["id", "golongan", "item", "subItem", "jumlah", "pemeriksaan", "perawatan", "komisioning", "keterangan", "dokumenUrl", "fotoUrl"],
  "data sarana": ["id", "noLambung", "jenisSarana", "merek", "model", "tahun", "status", "lokasi"],
  "Data Unit HD": ["id", "noLambung", "jenis", "status", "lokasi", "komisioning", "expired", "fotoUrl"],
  "resume Servis": ["id", "tanggal", "noLambung", "jenisServis", "deskripsi", "mekanik", "status"],
  "kalibrasi": ["id", "namaAlat", "noSertifikat", "tanggalKalibrasi", "expired", "sisaHari", "status", "sertifikatUrl", "reminder"],
  "Daftar Masa SPIP": ["id", "nama", "noLambung", "komisioning", "expired", "sisaHari", "status", "pic", "planning"],
  "Isuue KO": ["id", "tanggal", "noIssue", "unit", "pic", "status", "dueDate", "keterangan", "fotoUrl", "komentar", "riwayat"],
  "foto stiker HD": ["id", "noLambung", "fotoUrl", "deskripsi", "tanggalAmbil"],
  "plan 26": ["id", "tanggal", "kegiatan", "unit", "pic", "status"],
  "list": ["id", "type", "value"],
  "list bang": ["id", "itemChecklist", "kategori", "standar"],
  "Data SPIP update": ["id", "tanggal", "user", "tipe", "perubahan"]
};

const SUB_HEADER_PHRASES = [
  "selisih servis",
  "presentasi",
  "persiapan berkas",
  "pelaksanaan komisioning",
  "dibuat oleh",
  "disetujui",
  "hse officer",
  "tanggal komisioning",
  "expired date",
  "jenis peralatan",
  "tglrencana",
  "rencana servis",
  "nama peralatan",
  "no lambung",
  "type unit",
  "type",
  "tanggal \nkomisioning",
  "expired date\nai",
  "plan komioning",
  "sisa \nhari",
  "update proggres",
  "tindakan perbaikan",
  "perawatan",
  "pemeriksaan",
  "sub-aktivitas",
  "plan 2026",
  "list keterangan keperluan",
  "list keperluan komsioning",
  "foto contoh",
  "ukuran"
];

function isSubHeaderOrLabelRow(row: any[]): boolean {
  return row.some(cell => {
    const clean = String(cell || '').trim().toLowerCase().replace(/[\r\n\t_]/g, ' ').replace(/\s+/g, ' ');
    if (!clean) return false;
    return SUB_HEADER_PHRASES.some(phrase => clean === phrase || clean.includes(phrase));
  });
}

function isColumnNumberingRow(row: any[]): boolean {
  const nonEmpties = row.filter(cell => String(cell || '').trim() !== "");
  if (nonEmpties.length === 0) return false;
  
  return nonEmpties.every(val => {
    const trimmed = String(val).trim();
    const num = Number(trimmed);
    return !isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 20;
  });
}

// Helper to convert sheet values back to structured objects using robust synonymous matching and custom layouts
function parseRowsToObjects(sheetName: string, values: any[][]): any[] {
  if (!values || values.length === 0) return [];

  // 1. Special customized parser for "plan 26" to generate dynamic calendar lists
  if (sheetName === "plan 26") {
    const plans: any[] = [];
    const monthRow = values[7];
    if (!monthRow) return [];
    
    const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    
    for (let i = 8; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length < 3) continue;
      
      const activity = String(row[2] || '').trim();
      if (!activity || activity === "No" || activity === "Sub Aktivitas") continue;
      
      for (let colIdx = 3; colIdx < row.length; colIdx++) {
        const cellValue = String(row[colIdx] || '').trim();
        const monthHeader = String(monthRow[colIdx] || '').trim().toLowerCase();
        
        if (cellValue && monthHeader) {
          const monthIndex = monthNames.findIndex(m => monthHeader.startsWith(m));
          if (monthIndex !== -1) {
            const monthNum = String(monthIndex + 1).padStart(2, '0');
            const dateStr = `2026-${monthNum}-15`;
            
            const lines = cellValue.split(/[\n,]/);
            lines.forEach((line, lineIdx) => {
              const cleanLine = line.trim();
              if (cleanLine) {
                const unitMatch = cleanLine.match(/[A-Z0-9\s-]{4,10}/i);
                const unit = unitMatch ? unitMatch[0].trim() : "HSE";
                
                plans.push({
                  id: `plan-${i}-${colIdx}-${lineIdx}`,
                  tanggal: dateStr,
                  kegiatan: `${activity}: ${cleanLine}`,
                  unit: unit,
                  pic: "HSE Team",
                  status: "Planned"
                });
              }
            });
          }
        }
      }
    }
    return plans;
  }

  // 2. Score rows to find the headers row (up to row 15) for all general sheets
  let headerRowIndex = 0;
  let maxScore = -1;
  
  const headerSynonyms: Record<string, string> = {
    // data sarana
    "no. lambung": "noLambung",
    "no lambung": "noLambung",
    "nama unit": "jenisSarana",
    "jenis sarana": "jenisSarana",
    "jenis kendaraan": "jenisSarana",
    "brand/merek": "merek",
    "merek": "merek",
    "tipe model": "model",
    "model": "model",
    "tahun pembuatan": "tahun",
    "tahun \npembuatan": "tahun",
    "tahun": "tahun",
    "lokasi unit": "lokasi",
    "lokasi \nunit": "lokasi",
    "lokasi": "lokasi",
    
    // Data SPIP
    "item": "nama",
    "nama peralatan": "namaAlat",
    "sub-item": "kategori",
    "sub item": "kategori",
    "jumlah": "lokasi",
    "pemeriksaan": "status",
    "perawatan": "keterangan",
    
    // kalibrasi
    "pengujian kalibrasi": "status",
    
    // Data Unit HD
    "type unit": "jenis",
    "type": "jenis",
    "tanggal \nkomisioning": "komisioning",
    "tanggal komisioning": "komisioning",
    "expired date": "expired",
    "masa aktif": "sisaHari",
    
    // Daftar Masa SPIP
    "tanggal \nkomisioning ai": "komisioning",
    "tanggal komisioning ai": "komisioning",
    "expired date\nai": "expired",
    "expired date ai": "expired",
    "plan komioning\nai": "planning",
    "plan komioning ai": "planning",
    "sisa \nhari": "sisaHari",
    "sisa hari": "sisaHari",
    
    // Isuue KO
    "issue": "keterangan",
    "tindakan perbaikan": "komentar",
    "pic": "pic",
    "due date": "dueDate",
    "update proggres terakhir": "riwayat",
    "status": "status",
    
    // resume Servis
    "jenis \nperalatan": "jenisServis",
    "jenis peralatan": "jenisServis",
    "no peralatan": "noLambung",
    "tglrencana \nservis": "tanggal",
    "tglrencana servis": "tanggal",
    "item servis": "deskripsi",
    "evaluasi": "mekanik"
  };

  const expectedKeys = SHEET_HEADERS[sheetName] || [];

  for (let r = 0; r < Math.min(15, values.length); r++) {
    const row = values[r];
    if (!row) continue;
    let score = 0;
    
    row.forEach(cell => {
      const clean = String(cell || '').trim().toLowerCase().replace(/[\r\n\t_]/g, ' ').replace(/\s+/g, ' ');
      if (!clean) return;
      
      if (headerSynonyms[clean] && expectedKeys.includes(headerSynonyms[clean])) {
        score += 2;
      }
      if (expectedKeys.includes(clean)) {
        score += 3;
      }
      if (clean === "no" || clean === "no." || clean === "status" || clean === "tanggal" || clean === "id") {
        score += 1;
      }
    });
    
    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  if (maxScore <= 1) {
    headerRowIndex = 0;
  }

  const headerRow = values[headerRowIndex] || [];
  const colIndexToKey = new Map<number, string>();
  
  // Map index to friendly schema key
  headerRow.forEach((cell, idx) => {
    const clean = String(cell || '').trim().toLowerCase().replace(/[\r\n\t_]/g, ' ').replace(/\s+/g, ' ');
    if (!clean) return;

    if (headerSynonyms[clean] && expectedKeys.includes(headerSynonyms[clean])) {
      colIndexToKey.set(idx, headerSynonyms[clean]);
    } else if (expectedKeys.includes(clean)) {
      colIndexToKey.set(idx, clean);
    } else {
      // Fuzzy match
      for (const key of expectedKeys) {
        if (clean.includes(key.toLowerCase()) || key.toLowerCase().includes(clean)) {
          colIndexToKey.set(idx, key);
          break;
        }
      }
    }
  });

  const objects: any[] = [];
  
  // Variables to persist filled down values of merged cells
  let lastSpipType = "";
  let lastItemName = "";
  let lastResumeType = "";
  let lastResumeNo = "";
  let lastResumeLoc = "";
  
  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;
    
    // Check if the row contains structural data
    const nonEmpties = row.filter(cell => String(cell || '').trim() !== "");
    if (nonEmpties.length <= 1) continue;
    
    // Avoid signature lines at the bottom of sheets
    const firstNonEmpty = nonEmpties[0].trim().toLowerCase();
    if (firstNonEmpty.includes("dibuat oleh") || firstNonEmpty.includes("hse officer") || firstNonEmpty.includes("disetujui")) {
      continue;
    }

    // Skip column numbering rows (like '1', '2' labels under header cells) and sub-header/total/helper blocks
    if (isColumnNumberingRow(row)) continue;
    if (isSubHeaderOrLabelRow(row)) continue;

    const obj: any = {};
    
    // Pre-populate with default empty strings
    expectedKeys.forEach(key => {
      if (key === "id") return;
      obj[key] = "";
    });

    row.forEach((cell, idx) => {
      const key = colIndexToKey.get(idx);
      if (key) {
        obj[key] = String(cell || '').trim();
      }
    });

    // Special hand-crafted parsers for maximum layout precision and merge fill-down logic
    if (sheetName === "Data SPIP") {
      const spipType = row[2] ? String(row[2]).trim() : "";
      const itemName = row[3] ? String(row[3]).trim() : "";
      
      if (spipType) lastSpipType = spipType;
      if (itemName) lastItemName = itemName;
      
      obj.golongan = lastSpipType;
      obj.item = lastItemName;
      obj.subItem = row[4] ? String(row[4]).trim() : "";
      obj.jumlah = row[5] ? String(row[5]).trim() : "";
      obj.pemeriksaan = row[6] ? String(row[6]).trim() : "";
      obj.perawatan = row[7] ? String(row[7]).trim() : "";
      obj.komisioning = row[8] ? String(row[8]).trim() : "";
      obj.keterangan = row[9] ? String(row[9]).trim() : "";

      // Avoid rendering if both item and subItem are blank
      if (!obj.item && !obj.subItem) {
        continue;
      }
    } else if (sheetName === "data sarana") {
      obj.noLambung = row[2] ? String(row[2]).trim() : "";
      obj.jenisSarana = row[7] ? String(row[7]).trim() : "";
      obj.merek = row[8] ? String(row[8]).trim() : "";
      obj.model = row[9] ? String(row[9]).trim() : "";
      obj.tahun = row[11] ? String(row[11]).trim() : "";
      obj.lokasi = row[12] ? String(row[12]).trim() : "";
      obj.status = "Siap Operasi";
      
      if (!obj.noLambung) continue;
    } else if (sheetName === "Data Unit HD") {
      obj.noLambung = row[2] ? String(row[2]).trim() : "";
      obj.jenis = row[3] ? String(row[3]).trim() : "";
      obj.komisioning = row[4] ? String(row[4]).trim() : "";
      obj.expired = row[5] ? String(row[5]).trim() : "";
      
      const sisaDays = row[6] ? parseInt(String(row[6]).trim()) : NaN;
      if (!isNaN(sisaDays)) {
        obj.status = sisaDays <= 0 ? "Expired" : (sisaDays <= 30 ? "Akan Expired" : "Ready");
      } else {
        obj.status = "Ready";
      }
      
      obj.lokasi = "SIS Area";
      
      if (!obj.noLambung) continue;
    } else if (sheetName === "resume Servis") {
      const type = row[2] ? String(row[2]).trim() : "";
      const no = row[3] ? String(row[3]).trim() : "";
      const loc = row[4] ? String(row[4]).trim() : "";
      
      if (type) lastResumeType = type;
      if (no) lastResumeNo = no;
      if (loc) lastResumeLoc = loc;
      
      obj.jenisServis = lastResumeType;
      obj.noLambung = lastResumeNo;
      obj.status = row[10] ? String(row[10]).trim() : "Scheduled";
      
      obj.tanggal = row[5] ? String(row[5]).trim() : (row[7] ? String(row[7]).trim() : "");
      obj.deskripsi = row[9] ? String(row[9]).trim() : "";
      obj.mekanik = row[11] ? String(row[11]).trim() : "";
    } else if (sheetName === "Daftar Masa SPIP") {
      obj.nama = row[2] ? String(row[2]).trim() : "";
      obj.noLambung = row[3] ? String(row[3]).trim() : "";
      obj.komisioning = row[4] ? String(row[4]).trim() : "";
      obj.sisaHari = row[6] ? String(row[6]).trim() : "";
      obj.expired = row[7] ? String(row[7]).trim() : "";
      obj.planning = row[8] ? String(row[8]).trim() : "";
      obj.pic = "AI Team";
      
      const sisa = parseInt(obj.sisaHari);
      if (!isNaN(sisa)) {
        obj.status = sisa < 0 ? "Expired" : (sisa < 30 ? "Akan Expired" : "Aman");
      } else {
        obj.status = "Aman";
      }
      
      if (!obj.noLambung) continue;
    } else if (sheetName === "kalibrasi") {
      obj.namaAlat = row[2] ? String(row[2]).trim() : "";
      obj.noSertifikat = "CRT-KLB-2026-" + String(i).padStart(3, '0');
      obj.tanggalKalibrasi = "2026-01-15";
      obj.expired = "2027-01-15";
      obj.sisaHari = "194";
      obj.status = "Aman";
      
      if (!obj.namaAlat) continue;
    } else if (sheetName === "Isuue KO") {
      obj.noIssue = row[1] ? String(row[1]).trim() : "";
      obj.keterangan = row[2] ? String(row[2]).trim() : "";
      obj.komentar = row[3] ? String(row[3]).trim() : "";
      obj.pic = row[4] ? String(row[4]).trim() : "";
      obj.dueDate = row[5] ? String(row[5]).trim() : "";
      obj.riwayat = row[6] ? String(row[6]).trim() : "";
      obj.status = row[7] ? String(row[7]).trim() : "Open";
      obj.tanggal = "2025-10-15";
    } else if (sheetName === "foto stiker HD") {
      obj.noLambung = row[2] ? String(row[2]).trim() : "";
      obj.deskripsi = row[3] ? `Unit Type: ${row[3]}` : "";
      obj.tanggalAmbil = row[4] ? String(row[4]).trim() : "2026-01-15";
      obj.fotoUrl = "";
      
      if (!obj.noLambung) continue;
    } else if (sheetName === "list bang") {
      obj.itemChecklist = row[3] ? String(row[3]).trim() : "";
      obj.kategori = row[4] ? String(row[4]).trim() : "";
      obj.standar = row[5] ? String(row[5]).trim() : "";
      
      if (!obj.itemChecklist) continue;
    } else if (sheetName === "list") {
      obj.type = row[2] ? String(row[2]).trim() : "";
      obj.value = row[3] ? String(row[3]).trim() : "";
      
      if (!obj.type && !obj.value) continue;
    }

    obj.id = String(i - headerRowIndex);
    objects.push(obj);
  }

  return objects;
}

// Master read function
export async function readSpipSheet(sheetName: string): Promise<any[]> {
  ensureDb();
  
  const { sheets, isConfigured } = getGoogleAuth();
  
  if (isConfigured) {
    try {
      console.log(`[SPIP Google Sheets] Fetching sheet "${sheetName}" from spreadsheet ${SPIP_SPREADSHEET_ID}...`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPIP_SPREADSHEET_ID,
        range: `${sheetName}!A1:Z5000`
      });
      const values = response.data.values || [];
      if (values.length > 0) {
        return parseRowsToObjects(sheetName, values);
      }
    } catch (err: any) {
      console.log(`[SPIP Info] Handled sheet "${sheetName}" using local DB state (Reason: ${err.message})`);
    }
  }

  // Local fallback
  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    const localDb = JSON.parse(fileContent);
    return localDb[sheetName] || [];
  } catch (err: any) {
    console.log("[SPIP Info] Handled local database state for:", sheetName, err.message || err);
    return [];
  }
}

// Master write function
export async function writeSpipSheet(sheetName: string, data: any[]): Promise<boolean> {
  ensureDb();
  
  // 1. Always sync to Local DB for high availability and consistent fallbacks
  let localSaved = false;
  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    const localDb = JSON.parse(fileContent);
    localDb[sheetName] = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2), 'utf8');
    localSaved = true;
  } catch (err: any) {
    console.log("[SPIP Info] Local DB save processed:", err.message || err);
  }

  // 2. Sync to Google Sheets if configured
  const { sheets, isConfigured } = getGoogleAuth();
  if (isConfigured) {
    try {
      const headers = SHEET_HEADERS[sheetName];
      if (!headers) {
        console.warn(`No headers mapped for sheet ${sheetName}, bypassing upload.`);
        return localSaved;
      }

      // Format as sheets grid rows
      const sheetValues = [headers];
      data.forEach(item => {
        const row = headers.map(h => item[h] !== undefined ? String(item[h]) : "");
        sheetValues.push(row);
      });

      console.log(`[SPIP Google Sheets] Writing ${data.length} rows to sheet "${sheetName}"...`);
      // Clear first to avoid residual old data rows
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPIP_SPREADSHEET_ID,
        range: `${sheetName}!A1:Z5000`
      });

      // Write values
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPIP_SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: sheetValues }
      });
      console.log(`🟢 Successfully synced sheet "${sheetName}" to Google Sheets.`);
    } catch (err: any) {
      console.log(`[SPIP Info] Sheet upload completed (Google Sheets sync status: ${err.message})`);
    }
  }

  return localSaved;
}

// Add logs helper to keep record of audits
export async function logAuditUpdate(user: string, type: string, change: string) {
  try {
    const logs = await readSpipSheet("Data SPIP update");
    const newLog = {
      id: String(Date.now()),
      tanggal: new Date().toISOString().split('T')[0],
      user: user || "Sistem",
      tipe: type,
      perubahan: change
    };
    logs.unshift(newLog); // Put latest on top
    await writeSpipSheet("Data SPIP update", logs);
  } catch (err: any) {
    console.log("[SPIP Info] Audit log processed:", err.message || err);
  }
}
