import fs from 'fs/promises';
import path from 'path';
import {
  isGoogleSheetsConfigured,
  checkLoginInSheets,
  saveOrderDataInSheets,
  updateOrderDateInSheets,
  getInventoryDataFromSheets,
  saveNapzaDataInSheets,
  getNapzaHistoryDataFromSheets,
  deleteNapzaDataInSheets,
  updateNapzaDataInSheets,
  saveDonorDarahDataInSheets,
  getDonorDarahHistoryDataFromSheets,
  getDaftarKaryawanFromSheets,
  getHistoryPerKaryawanFromSheets,
  getBelumMengisiDataFromSheets,
  getUnfitDataFromSheets,
  saveTrainingDataInSheets,
  getTrainingDataListFromSheets,
  deleteTrainingDataInSheets,
  saveMCUDataInSheets,
  getMCUDataListFromSheets,
  deleteMCUDataInSheets,
  getMasterAsetOptionsFromSheets,
  saveMasterItemInSheets,
  deleteMasterItemInSheets,
  simpanInspeksiBulananInSheets,
  getInspeksiHistoryDataFromSheets,
  updateInspeksiBulananInSheets,
  getTemuanMioListFromSheets,
  simpanTemuanMioClosingInSheets,
  getUsersFromSheets,
  saveUserInSheets,
  getMasterApdFromSheets,
  saveMasterApdInSheets,
  updateMinePermitInSheets,
  deleteKaryawanInSheets,
  getVendorsFromSheets,
  saveVendorInSheets,
  deleteVendorInSheets,
  getVendorEvaluationsFromSheets,
  saveVendorEvaluationInSheets,
  deleteVendorEvaluationInSheets,
  getBakDocsFromSheets,
  saveBakDocsStateToSheets,
  getBaktDocsFromSheets,
  saveBaktDocsStateToSheets,
  getTrainingExemptionsFromSheets,
  saveTrainingExemptionInSheets,
  deleteTrainingExemptionInSheets,
  getDpbDocsFromSheets,
  saveDpbDocToSheets,
  deleteDpbDocFromSheets
} from './googleSheets.js';

// Local storage backup file path
const dbPath = path.join(process.cwd(), 'src', 'server', 'db.json');

// Memory fallback if reading file fails
let memoryDb: any = null;

// Read JSON Helper
async function readLocalDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    memoryDb = JSON.parse(data);
    if (!memoryDb.temuanMio) memoryDb.temuanMio = [];
    if (!memoryDb.vendors) memoryDb.vendors = [];
    if (!memoryDb.evaluations) memoryDb.evaluations = [];
    if (!memoryDb.vendorWeights) memoryDb.vendorWeights = { user: 40, hse: 30, ga: 30 };
    return memoryDb;
  } catch (err) {
    if (memoryDb) {
      if (!memoryDb.temuanMio) memoryDb.temuanMio = [];
      if (!memoryDb.vendors) memoryDb.vendors = [];
      if (!memoryDb.evaluations) memoryDb.evaluations = [];
      if (!memoryDb.vendorWeights) memoryDb.vendorWeights = { user: 40, hse: 30, ga: 30 };
      return memoryDb;
    }
    console.error("Failed to read local db.json, generating default database in memory", err);
    memoryDb = {
      userLogin: [],
      karyawan: [],
      dataOrder: [],
      laporanNapza: [],
      laporanDonorDarah: [],
      belumMengisi: [],
      unfit: [],
      dataTraining: [],
      dataMcu: [],
      masterItem: [],
      historyInspeksi: [],
      temuanMio: [],
      vendors: [],
      evaluations: [],
      vendorWeights: { user: 40, hse: 30, ga: 30 }
    };
    return memoryDb;
  }
}

// Write JSON Helper
async function writeLocalDb(data: any) {
  memoryDb = data;
  try {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to persist local db.json to disk:", err);
  }
}

// -------------------------------------------------------------
// Core Unified Orchestration Methods
// -------------------------------------------------------------

// 1. checkLogin
export async function checkLogin(username: any, password: any) {
  const targetUser = username.toString().toLowerCase().trim();
  const targetPass = password.toString().trim();

  if (isGoogleSheetsConfigured()) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout Google Sheets login")), 5000)
      );
      const res: any = await Promise.race([
        checkLoginInSheets(username, password),
        timeoutPromise
      ]);

      if (res && res.success) {
        return res;
      }
    } catch (err: any) {
      console.warn("⚠️ Google Sheets checkLogin error/timeout, mencoba fallback data lokal:", err?.message || err);
    }
  }

  const db = await readLocalDb();

  const user = (db.userLogin || []).find((u: any) => 
    ((u.username && u.username.toString().toLowerCase().trim() === targetUser) ||
     (u.nrp && u.nrp.toString().toLowerCase().trim() === targetUser)) &&
    u.password.toString().trim() === targetPass
  );

  if (user) {
    const isDefaultAdmin = targetUser === "admin" || (user.role && user.role.toLowerCase() === "admin");
    const role = isDefaultAdmin ? "admin" : "operator";
    const allowedViews = isDefaultAdmin 
      ? [] 
      : (user.allowedViews || []);

    let loginSite = "ITU-Admo";
    if (isDefaultAdmin || (user.site && (user.site === "ALL" || user.site.toUpperCase() === "ALL" || (user.site.includes("ITU-Admo") && user.site.includes("ITU-MMI") && user.site.includes("ITU-Vale"))))) {
      loginSite = "ALL";
    } else if (user.site) {
      const firstSite = user.site.split(',')[0].trim();
      if (firstSite) loginSite = firstSite;
    }

    return { 
      success: true, 
      message: "Login berhasil!", 
      nama: user.nama,
      username: user.username || user.nrp,
      nrp: user.nrp || "",
      role,
      allowedViews,
      site: loginSite,
      ttdUrl: user.ttdUrl || ""
    };
  } else {
    // Allow demo or bypass logins for instant verification
    if ((targetUser === "admin" || targetUser === "9938" || targetUser === "9999") && targetPass === "admin") {
      return { 
        success: true, 
        message: "Login berhasil!", 
        nama: "Hesi Admo",
        username: targetUser,
        nrp: targetUser,
        role: "admin",
        allowedViews: [],
        site: "ALL",
        ttdUrl: ""
      };
    }
    if (targetUser === "admo" && targetPass === "123") {
      return { 
        success: true, 
        message: "Login berhasil (Demo Bypass)!", 
        nama: "Siswa Demo",
        username: "admo",
        role: "operator",
        allowedViews: ["transaksi_apd", "pengajuan_menu"],
        site: "ITU-Admo",
        ttdUrl: ""
      };
    }
    return { success: false, message: "Username atau password salah." };
  }
}

// User & Access Management Orchestration Helper Methods
export async function getDaftarUsers() {
  if (isGoogleSheetsConfigured()) {
    return await getUsersFromSheets();
  }

  const db = await readLocalDb();
  return db.userLogin.map((u: any) => ({
    nrp: u.nrp || "",
    nama: u.nama || "",
    email: u.email || "",
    username: u.username || "",
    password: u.password || "",
    role: u.role || (u.username === "admin" ? "admin" : "operator"),
    allowedViews: u.allowedViews || [],
    site: u.site || (u.role === "admin" || u.username === "admin" ? "ALL" : "ITU-Admo"),
    ttdUrl: u.ttdUrl || ""
  }));
}

export async function saveUserData(userObj: any) {
  if (isGoogleSheetsConfigured()) {
    return await saveUserInSheets(userObj);
  }

  const db = await readLocalDb();
  if (!db.userLogin) {
    db.userLogin = [];
  }

  const existingIndex = db.userLogin.findIndex((u: any) => u.username.toLowerCase() === userObj.username.toLowerCase());

  const formattedUser = {
    nrp: userObj.nrp || "",
    nama: userObj.nama || "",
    email: userObj.email || "",
    username: userObj.username.toLowerCase().trim(),
    password: userObj.password || "",
    role: userObj.role || "operator",
    allowedViews: userObj.allowedViews || [],
    site: userObj.site || "ITU-Admo",
    ttdUrl: userObj.ttdUrl || (existingIndex !== -1 ? db.userLogin[existingIndex].ttdUrl : "")
  };

  if (existingIndex !== -1) {
    db.userLogin[existingIndex] = formattedUser;
  } else {
    db.userLogin.push(formattedUser);
  }

  await writeLocalDb(db);
  return { success: true };
}

export async function saveUserSignature(username: string, ttdBase64: string) {
  let finalUrl = "";
  const targetUser = username.toLowerCase().trim();

  // Try Google Drive if configured
  if (isGoogleSheetsConfigured()) {
    try {
      const { uploadToDrive } = await import('./googleSheets.js');
      const driveUrl = await uploadToDrive(`ttd_user_${targetUser}.png`, ttdBase64);
      if (driveUrl && driveUrl !== "-") {
        finalUrl = driveUrl;
      }
    } catch (err) {
      console.error("Gagal mengunggah tanda tangan ke Google Drive, falling back...", err);
    }
  }

  // Fallback if no Drive upload was succeeded (sandbox fallback)
  if (!finalUrl) {
    finalUrl = ttdBase64;
  }

  // Update database (sheets vs db.json)
  if (isGoogleSheetsConfigured()) {
    const { saveUserSignatureInSheets } = await import('./googleSheets.js');
    const result = await saveUserSignatureInSheets(username, finalUrl);
    return { ...result, ttdUrl: finalUrl };
  }

  const db = await readLocalDb();
  if (!db.userLogin) {
    db.userLogin = [];
  }

  const userIdx = db.userLogin.findIndex((u: any) => u.username.toLowerCase() === targetUser);
  if (userIdx !== -1) {
    db.userLogin[userIdx].ttdUrl = finalUrl;
    await writeLocalDb(db);
    return { success: true, ttdUrl: finalUrl };
  }
  return { success: false, message: "User tidak ditemukan di database lokal." };
}

// 2. saveOrderData
export async function saveOrderData(jenis: string, kategori: string, barang: string, jumlah: number, keterangan: string, userName: string, customDate?: string, site?: string) {
  if (isGoogleSheetsConfigured()) {
    return await saveOrderDataInSheets(jenis, kategori, barang, jumlah, keterangan, userName, customDate);
  }

  const db = await readLocalDb();
  let timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
  if (customDate) {
    let d: Date | null = null;
    if (typeof customDate === "string" && customDate.includes("-")) {
      const p = customDate.split(" ")[0].split("-");
      if (p.length === 3 && p[0].length === 4) {
        d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      }
    }
    if (!d || isNaN(d.getTime())) {
      d = new Date(customDate);
    }
    if (d && !isNaN(d.getTime())) {
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour12: false, timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      timestamp = `${dd}/${mm}/${yyyy} ${timeStr}`;
    }
  }
  
  db.dataOrder.push({
    timestamp,
    jenis,
    kategori,
    barang: barang.trim(),
    jumlah: Number(jumlah) || 0,
    keterangan,
    oleh: userName,
    site: site || "ITU-Admo"
  });

  await writeLocalDb(db);
  return { success: true, message: `Data ${barang} berhasil disimpan!` };
}

// 3. getInventoryData
export async function getInventoryData() {
  if (isGoogleSheetsConfigured()) {
    return await getInventoryDataFromSheets();
  }

  const db = await readLocalDb();
  const history = [...db.dataOrder];
  const stockMap: Record<string, number> = {};

  history.forEach((h: any) => {
    const barang = h.barang;
    const jumlah = h.jumlah;
    if (!stockMap[barang]) stockMap[barang] = 0;
    if (h.jenis === "Barang Masuk") {
      stockMap[barang] += jumlah;
    } else if (h.jenis === "Barang Keluar") {
      stockMap[barang] -= jumlah;
    }
  });

  const stockList = Object.keys(stockMap).map(key => ({
    barang: key,
    total: stockMap[key]
  }));

  // Reverse list to match the newest first (GAS reverse behavior)
  const sortedHistory = [...history].reverse();
  return { history: sortedHistory, stock: stockList };
}

// 3b. updateOrderDate
export async function updateOrderDate(data: {
  originalTimestamp: string;
  barang: string;
  keterangan: string;
  jumlah?: number;
  oleh?: string;
  newDate: string;
}) {
  if (isGoogleSheetsConfigured()) {
    return await updateOrderDateInSheets(data);
  }

  const db = await readLocalDb();
  if (!db.dataOrder || !Array.isArray(db.dataOrder)) {
    return { success: false, message: "Data transaksi lokal tidak ditemukan." };
  }

  let bestIndex = -1;
  let highestScore = -1;

  const reqBarang = (data.barang || "").toString().toLowerCase().trim();
  const reqKet = (data.keterangan || "").toString().toLowerCase().trim();
  const reqOleh = (data.oleh || "").toString().toLowerCase().trim();
  const reqJumlah = Number(data.jumlah) || 0;
  const reqTs = (data.originalTimestamp || "").toString().toLowerCase().trim();

  for (let i = 0; i < db.dataOrder.length; i++) {
    const item = db.dataOrder[i];
    const rowBarang = (item.barang || "").toString().toLowerCase().trim();

    if (reqBarang && rowBarang !== reqBarang && !rowBarang.includes(reqBarang) && !reqBarang.includes(rowBarang)) {
      continue;
    }

    let score = 10;

    const rowKet = (item.keterangan || "").toString().toLowerCase().trim();
    if (reqKet && rowKet === reqKet) {
      score += 30;
    } else if (reqKet && (rowKet.includes(reqKet) || reqKet.includes(rowKet))) {
      score += 20;
    }

    const rowOleh = (item.oleh || "").toString().toLowerCase().trim();
    if (reqOleh && (rowOleh === reqOleh || rowOleh.includes(reqOleh) || reqOleh.includes(rowOleh))) {
      score += 15;
    }

    const rowJumlah = Number(item.jumlah) || 0;
    if (reqJumlah && rowJumlah === reqJumlah) {
      score += 10;
    }

    const rowTs = (item.timestamp || "").toString().toLowerCase().trim();
    if (reqTs && (rowTs === reqTs || rowTs.includes(reqTs) || reqTs.includes(rowTs))) {
      score += 40;
    } else if (reqTs) {
      const reqDigits = reqTs.replace(/[^0-9]/g, "");
      const rowDigits = rowTs.replace(/[^0-9]/g, "");
      if (reqDigits && rowDigits && (rowDigits.includes(reqDigits) || reqDigits.includes(rowDigits))) {
        score += 20;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    return { success: false, message: "Transaksi tidak ditemukan secara lokal." };
  }

  let formattedNewDate = data.newDate;
  if (data.newDate.includes("-")) {
    const parts = data.newDate.split("T")[0].split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      formattedNewDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  const origItemTs = db.dataOrder[bestIndex].timestamp || "";
  if (origItemTs.includes(" ")) {
    const timePart = origItemTs.split(" ")[1];
    formattedNewDate = `${formattedNewDate} ${timePart}`;
  }

  db.dataOrder[bestIndex].timestamp = formattedNewDate;

  await writeLocalDb(db);
  return { success: true, message: "Tanggal berhasil diperbarui!" };
}

// 4. saveNapzaData
export async function saveNapzaData(nama: string, nrp: string, jabatan: string, periode: string, hasil: string, userName: string, fileData: any, site?: string) {
  if (isGoogleSheetsConfigured()) {
    return await saveNapzaDataInSheets(nama, nrp, jabatan, periode, hasil, userName, fileData);
  }

  const db = await readLocalDb();
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
  
  let fileUrl = "-";
  if (typeof fileData === "string" && fileData.trim().length > 0) {
    fileUrl = fileData.trim();
  } else if (fileData && (fileData.webViewLink || fileData.url)) {
    fileUrl = fileData.webViewLink || fileData.url;
  } else if (fileData && fileData.name) {
    fileUrl = `https://storage.googleapis.com/codes-assets/placeholder-reports/${fileData.name}`;
  }

  db.laporanNapza.push({
    timestamp,
    nama,
    nrp,
    jabatan,
    periode,
    hasil,
    dokumen: fileUrl,
    oleh: userName,
    site: site || "ITU-Admo"
  });

  await writeLocalDb(db);
  return { success: true, message: `Laporan NAPZA untuk ${nama} berhasil disimpan!` };
}

// 5. getNapzaHistoryData
export async function getNapzaHistoryData() {
  if (isGoogleSheetsConfigured()) {
    return await getNapzaHistoryDataFromSheets();
  }

  const db = await readLocalDb();
  const history = (db.laporanNapza || []).map((item: any, idx: number) => ({
    id: item.id || `napza_${idx + 1}_${item.timestamp || Date.now()}`,
    rowId: idx + 2,
    ...item
  })).reverse();
  return { history: history.slice(0, 50) };
}

// 5b. deleteNapzaData
export async function deleteNapzaData(params: {
  rowId?: string | number;
  timestamp?: string;
  nrp?: string;
  nama?: string;
}) {
  if (isGoogleSheetsConfigured()) {
    return await deleteNapzaDataInSheets(params);
  }

  const db = await readLocalDb();
  if (!db.laporanNapza) db.laporanNapza = [];

  const initialLen = db.laporanNapza.length;
  db.laporanNapza = db.laporanNapza.filter((item: any, idx: number) => {
    if (params.timestamp && params.nrp && item.timestamp === params.timestamp && item.nrp === params.nrp) {
      return false;
    }
    if (params.rowId && (idx + 2) === Number(params.rowId)) {
      return false;
    }
    if (params.nama && params.nrp && item.nama.toLowerCase().includes(params.nama.toLowerCase()) && item.nrp === params.nrp) {
      return false;
    }
    return true;
  });

  if (db.laporanNapza.length === initialLen) {
    return { success: false, message: "Data laporan NAPZA tidak ditemukan." };
  }

  await writeLocalDb(db);
  return { success: true, message: "Data Laporan NAPZA berhasil dihapus!" };
}

// 5c. updateNapzaData
export async function updateNapzaData(params: {
  rowId?: string | number;
  oldTimestamp?: string;
  oldNrp?: string;
  nama: string;
  nrp: string;
  jabatan: string;
  periode: string;
  hasil: string;
  dokumen?: string;
  userName?: string;
}) {
  if (isGoogleSheetsConfigured()) {
    return await updateNapzaDataInSheets(params);
  }

  const db = await readLocalDb();
  if (!db.laporanNapza) db.laporanNapza = [];

  const idx = db.laporanNapza.findIndex((item: any, i: number) => {
    if (params.oldTimestamp && params.oldNrp && item.timestamp === params.oldTimestamp && item.nrp === params.oldNrp) {
      return true;
    }
    if (params.rowId && (i + 2) === Number(params.rowId)) {
      return true;
    }
    if (params.nama && params.nrp && item.nama.toLowerCase().includes(params.nama.toLowerCase()) && item.nrp === params.nrp) {
      return true;
    }
    return false;
  });

  if (idx === -1) {
    return { success: false, message: "Data laporan NAPZA tidak ditemukan untuk diperbarui." };
  }

  const existing = db.laporanNapza[idx];
  db.laporanNapza[idx] = {
    ...existing,
    nama: params.nama,
    nrp: params.nrp,
    jabatan: params.jabatan,
    periode: params.periode,
    hasil: params.hasil,
    dokumen: (params.dokumen && params.dokumen !== "-") ? params.dokumen : existing.dokumen,
    oleh: params.userName || existing.oleh
  };

  await writeLocalDb(db);
  return { success: true, message: `Laporan NAPZA untuk ${params.nama} berhasil diperbarui!` };
}

// 6. saveDonorDarahData
export async function saveDonorDarahData(nama: string, nrp: string, jabatan: string, tanggalDonor: string, lokasi: string, tensi: string, hasilSkrining: string, userName: string, site?: string) {
  if (isGoogleSheetsConfigured()) {
    return await saveDonorDarahDataInSheets(nama, nrp, jabatan, tanggalDonor, lokasi, tensi, hasilSkrining, userName);
  }

  const db = await readLocalDb();
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');

  db.laporanDonorDarah.push({
    timestamp,
    nama,
    nrp,
    jabatan,
    tglDonor: tanggalDonor,
    lokasi,
    tensi,
    hasil: hasilSkrining,
    oleh: userName,
    site: site || "ITU-Admo"
  });

  await writeLocalDb(db);
  return { success: true, message: "Laporan Donor Darah berhasil disimpan!" };
}

// 7. getDonorDarahHistoryData
export async function getDonorDarahHistoryData() {
  if (isGoogleSheetsConfigured()) {
    return await getDonorDarahHistoryDataFromSheets();
  }

  const db = await readLocalDb();
  const history = [...db.laporanDonorDarah].reverse();
  return { history: history.slice(0, 10) };
}

// 8. getDaftarKaryawan
export async function getDaftarKaryawan() {
  if (isGoogleSheetsConfigured()) {
    return await getDaftarKaryawanFromSheets();
  }

  const db = await readLocalDb();

  if (!db.karyawanDetail || db.karyawanDetail.length === 0) {
    db.karyawanDetail = [
      { nama: "PRIANGGONO", nik: "8332", dept: "PART", jabatan: "PART ANALIST", tanggalLahir: "14-Feb-1996", grade: "STAFF", masaBerlakuMinePermit: "01-Nov-2026" },
      { nama: "RIKY ALTARIK SYAH PUTRA", nik: "9944", dept: "SERVICE", jabatan: "MEKANIK 3", tanggalLahir: "20-May-1999", grade: "NON STAFF", masaBerlakuMinePermit: "01-Nov-2026" },
      { nama: "ADITYA SAPARINGGA", nik: "8583", dept: "FOREMAN SERVICE", jabatan: "FOREMAN SERVICE", tanggalLahir: "08-Aug-1994", grade: "PENGAWAS", masaBerlakuMinePermit: "08-Aug-2026" },
      { nama: "AGUS SALIM", nik: "1807", dept: "STOREMAN", jabatan: "STOREMAN", tanggalLahir: "20-Aug-1995", grade: "ADMIN", masaBerlakuMinePermit: "20-Aug-2026" },
      { nama: "AHMAD IFRIYANDI", nik: "8427", dept: "MEKANIK 1", jabatan: "MEKANIK 1", tanggalLahir: "11-Apr-2000", grade: "OPERATION", masaBerlakuMinePermit: "11-Apr-2027" },
      { nama: "MUHAMMAD RIFKI HIDAYAT", nik: "9938", dept: "HSE OFFICER", jabatan: "HSE OFFICER", tanggalLahir: "25-Nov-1996", grade: "OPERATION", masaBerlakuMinePermit: "25-Nov-2026" },
      { nama: "AHMAD SAYUTI", nik: "1806", dept: "STOREMAN", jabatan: "STOREMAN", tanggalLahir: "12-Feb-2000", grade: "ADMIN", masaBerlakuMinePermit: "12-Feb-2027" },
      { nama: "AKHMAD SULAIMAN", nik: "1795", dept: "ADMIN PARTS", jabatan: "ADMIN PARTS", tanggalLahir: "17-Jul-2001", grade: "ADMIN", masaBerlakuMinePermit: "17-Jul-2026" },
      { nama: "ANWAR RIZANIE", nik: "9463", dept: "FOREMAN SERVICE", jabatan: "FOREMAN SERVICE", tanggalLahir: "21-Mei-1990", grade: "PENGAWAS", masaBerlakuMinePermit: "21-May-2027" },
      { nama: "AWANG YULI SETYADI", nik: "9065", dept: "SUPERVISOR SERVICE", jabatan: "SUPERVISOR SERVICE", tanggalLahir: "12-Jul-1993", grade: "ADMIN", masaBerlakuMinePermit: "12-Jul-2026" },
      { nama: "BAJA BARA", nik: "8344", dept: "MEKANIK 3", jabatan: "MEKANIK 3", tanggalLahir: "03-Feb-1998", grade: "OPERATION", masaBerlakuMinePermit: "03-Feb-2027" },
      { nama: "BARA TEGUH PRIBADI", nik: "1797", dept: "STOREMAN", jabatan: "STOREMAN", tanggalLahir: "24-Nov-1996", grade: "ADMIN", masaBerlakuMinePermit: "24-Nov-2026" },
      { nama: "DEWI APRILIANI", nik: "9165", dept: "GA OFFICER", jabatan: "GA OFFICER", tanggalLahir: "17-Apr-1998", grade: "ADMIN", masaBerlakuMinePermit: "17-Apr-2027" },
      { nama: "EDDY SANTOSO", nik: "10298", dept: "MEKANIK 1", jabatan: "MEKANIK 1", tanggalLahir: "01-Dec-1997", grade: "OPERATION", masaBerlakuMinePermit: "01-Dec-2026" },
      { nama: "EKA DARMA WIJAYA", nik: "9741", dept: "MEKANIK 1", jabatan: "MEKANIK 1", tanggalLahir: "15-Jan-2001", grade: "OPERATION", masaBerlakuMinePermit: "15-Jan-2027" },
      { nama: "EKO SETIYANTO", nik: "9413", dept: "FOREMAN SERVICE", jabatan: "FOREMAN SERVICE", tanggalLahir: "27-Oct-1993", grade: "PENGAWAS", masaBerlakuMinePermit: "27-Oct-2026" },
      { nama: "FINO SANDI SAPUTRA", nik: "1825", dept: "HELPER", jabatan: "HELPER", tanggalLahir: "05-Apr-2003", grade: "OPERATION", masaBerlakuMinePermit: "05-Apr-2027" },
      { nama: "Muhammad Ali", nik: "712988", dept: "HSE", jabatan: "Supervisor HSE", tanggalLahir: "10-Jul-1987", grade: "PENGAWAS", masaBerlakuMinePermit: "09-Jul-2026" },
      { nama: "Rifki Hidayat", nik: "219830", dept: "SERVICE", jabatan: "Mekanik Senior", tanggalLahir: "25-Nov-1996", grade: "OPERATION", masaBerlakuMinePermit: "25-Nov-2026" },
      { nama: "Rahmat Hidayat", nik: "348210", dept: "LOGISTIK", jabatan: "Admin Logistik", tanggalLahir: "13-Jan-1994", grade: "ADMIN", masaBerlakuMinePermit: "13-Jan-2027" },
      { nama: "John Doe", nik: "400192", dept: "OPERATION", jabatan: "Operator Crane", tanggalLahir: "15-Jun-1991", grade: "OPERATION", masaBerlakuMinePermit: "15-Jun-2026" },
      { nama: "Bambang Prasetyo", nik: "123456", dept: "SERVICE", jabatan: "Mekanik Assistant", tanggalLahir: "01-Dec-1997", grade: "OPERATION", masaBerlakuMinePermit: "01-Dec-2026" },
      { nama: "Agus Santoso", nik: "992103", dept: "SERVICE", jabatan: "Mekanik Assistant", tanggalLahir: "24-Oct-2001", grade: "OPERATION", masaBerlakuMinePermit: "24-Oct-2026" },
      { nama: "Susi Susanti", nik: "512301", dept: "GUDANG", jabatan: "Helper Gudang", tanggalLahir: "20-Jun-1991", grade: "OPERATION", masaBerlakuMinePermit: "20-Jun-2026" },
      { nama: "Tri Wahyuni", nik: "810293", dept: "SERVICE", jabatan: "Admin Service", tanggalLahir: "30-May-2026", grade: "ADMIN", masaBerlakuMinePermit: "30-May-2027" }
    ];
    await writeLocalDb(db);
  }

  // Filter karyawanDetail to exclude pure login/user management accounts
  const cleanKaryawanDetail = (db.karyawanDetail || []).filter((kd: any) => {
    if (!kd || !kd.dept) return true;
    const d = kd.dept.toString().toUpperCase().trim();
    return d !== "USER / MANAGEMENT" && d !== "USER MANAGEMENT";
  });

  const nameMap = new Map<string, string>();

  if (Array.isArray(cleanKaryawanDetail)) {
    cleanKaryawanDetail.forEach((kd: any) => {
      if (kd && kd.nama && typeof kd.nama === 'string' && kd.nama.trim()) {
        const name = kd.nama.trim();
        if (!nameMap.has(name.toLowerCase())) {
          nameMap.set(name.toLowerCase(), name);
        }
      }
    });
  }

  if (Array.isArray(db.karyawan)) {
    db.karyawan.forEach((item: any) => {
      if (typeof item === 'string' && item.trim()) {
        const cleanName = item.includes(" - ") ? item.split(" - ")[1].trim() : item.trim();
        if (cleanName && !nameMap.has(cleanName.toLowerCase())) {
          nameMap.set(cleanName.toLowerCase(), cleanName);
        }
      }
    });
  }

  const allNames = Array.from(nameMap.values()).sort((a, b) => a.localeCompare(b));

  return { success: true, karyawan: allNames, karyawanDetail: cleanKaryawanDetail };
}

// 8d. updateMinePermit
export async function updateMinePermit(nama: string, nrp: string, newDate: string) {
  if (isGoogleSheetsConfigured()) {
    return await updateMinePermitInSheets(nama, nrp, newDate);
  }

  const db = await readLocalDb();
  if (!db.karyawanDetail || db.karyawanDetail.length === 0) {
    db.karyawanDetail = [
      { nama: "ADITYA SAPARINGGA", nik: "8583", dept: "FOREMAN SERVICE", tanggalLahir: "08-Aug-1994", grade: "PENGAWAS", masaBerlakuMinePermit: "08-Aug-2026" },
      { nama: "AGUS SALIM", nik: "1807", dept: "STOREMAN", tanggalLahir: "20-Aug-1995", grade: "ADMIN", masaBerlakuMinePermit: "20-Aug-2026" },
      { nama: "AHMAD IFRIYANDI", nik: "8427", dept: "MEKANIK 1", tanggalLahir: "11-Apr-2000", grade: "OPERATION", masaBerlakuMinePermit: "11-Apr-2027" },
      { nama: "MUHAMMAD RIFKI HIDAYAT", nik: "9938", dept: "HSE OFFICER", tanggalLahir: "25-Nov-1996", grade: "OPERATION", masaBerlakuMinePermit: "25-Nov-2026" },
      { nama: "AHMAD SAYUTI", nik: "1806", dept: "STOREMAN", tanggalLahir: "12-Feb-2000", grade: "ADMIN", masaBerlakuMinePermit: "12-Feb-2027" },
      { nama: "AKHMAD SULAIMAN", nik: "1795", dept: "ADMIN PARTS", tanggalLahir: "17-Jul-2001", grade: "ADMIN", masaBerlakuMinePermit: "17-Jul-2026" },
      { nama: "ANWAR RIZANIE", nik: "9463", dept: "FOREMAN SERVICE", tanggalLahir: "21-Mei-1990", grade: "PENGAWAS", masaBerlakuMinePermit: "21-May-2027" },
      { nama: "AWANG YULI SETYADI", nik: "9065", dept: "SUPERVISOR SERVICE", tanggalLahir: "12-Jul-1993", grade: "ADMIN", masaBerlakuMinePermit: "12-Jul-2026" },
      { nama: "BAJA BARA", nik: "8344", dept: "MEKANIK 3", tanggalLahir: "03-Feb-1998", grade: "OPERATION", masaBerlakuMinePermit: "03-Feb-2027" },
      { nama: "BARA TEGUH PRIBADI", nik: "1797", dept: "STOREMAN", tanggalLahir: "24-Nov-1996", grade: "ADMIN", masaBerlakuMinePermit: "24-Nov-2026" },
      { nama: "DEWI APRILIANI", nik: "9165", dept: "GA OFFICER", tanggalLahir: "17-Apr-1998", grade: "ADMIN", masaBerlakuMinePermit: "17-Apr-2027" },
      { nama: "EDDY SANTOSO", nik: "10298", dept: "MEKANIK 1", tanggalLahir: "01-Dec-1997", grade: "OPERATION", masaBerlakuMinePermit: "01-Dec-2026" },
      { nama: "EKA DARMA WIJAYA", nik: "9741", dept: "MEKANIK 1", tanggalLahir: "15-Jan-2001", grade: "OPERATION", masaBerlakuMinePermit: "15-Jan-2027" },
      { nama: "EKO SETIYANTO", nik: "9413", dept: "FOREMAN SERVICE", tanggalLahir: "27-Oct-1993", grade: "PENGAWAS", masaBerlakuMinePermit: "27-Oct-2026" },
      { nama: "FINO SANDI SAPUTRA", nik: "1825", dept: "HELPER", tanggalLahir: "05-Apr-2003", grade: "OPERATION", masaBerlakuMinePermit: "05-Apr-2027" },
      { nama: "Muhammad Ali", nik: "712988", dept: "Supervisor HSE", tanggalLahir: "10-Jul-1987", grade: "PENGAWAS", masaBerlakuMinePermit: "09-Jul-2026" },
      { nama: "Rifki Hidayat", nik: "219830", dept: "Mekanik Senior", tanggalLahir: "25-Nov-1996", grade: "OPERATION", masaBerlakuMinePermit: "25-Nov-2026" },
      { nama: "Rahmat Hidayat", nik: "348210", dept: "Admin Logistik", tanggalLahir: "13-Jan-1994", grade: "ADMIN", masaBerlakuMinePermit: "13-Jan-2027" },
      { nama: "John Doe", nik: "400192", dept: "Operator Crane", tanggalLahir: "15-Jun-1991", grade: "OPERATION", masaBerlakuMinePermit: "15-Jun-2026" },
      { nama: "Bambang Prasetyo", nik: "123456", dept: "Mekanik Assistant", tanggalLahir: "01-Dec-1997", grade: "OPERATION", masaBerlakuMinePermit: "01-Dec-2026" },
      { nama: "Agus Santoso", nik: "992103", dept: "Mekanik Assistant", tanggalLahir: "24-Oct-2001", grade: "OPERATION", masaBerlakuMinePermit: "24-Oct-2026" },
      { nama: "Susi Susanti", nik: "512301", dept: "Helper Gudang", tanggalLahir: "20-Jun-1991", grade: "OPERATION", masaBerlakuMinePermit: "20-Jun-2026" },
      { nama: "Tri Wahyuni", nik: "810293", dept: "Admin Service", tanggalLahir: "30-May-2026", grade: "ADMIN", masaBerlakuMinePermit: "30-May-2027" }
    ];
  }

  const index = db.karyawanDetail.findIndex((emp: any) => 
    emp.nama.toLowerCase().trim() === nama.toLowerCase().trim() &&
    (nrp === "" || emp.nik.toLowerCase().trim() === nrp.toLowerCase().trim())
  );

  if (index === -1) {
    throw new Error(`Karyawan dengan nama ${nama} tidak ditemukan secara lokal.`);
  }

  db.karyawanDetail[index].masaBerlakuMinePermit = newDate;
  await writeLocalDb(db);

  return { success: true, message: `Masa berlaku Mine Permit untuk ${nama} berhasil disimpan locally sebagai ${newDate}!` };
}

// deleteKaryawan
export async function deleteKaryawan(nama: string, nrp: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteKaryawanInSheets(nama, nrp);
  }

  const db = await readLocalDb();
  if (db.karyawanDetail) {
    db.karyawanDetail = db.karyawanDetail.filter((emp: any) => {
      const empNik = String(emp.nik || '').trim().toLowerCase();
      const empNama = String(emp.nama || '').trim().toLowerCase();
      return !(empNama === nama.toLowerCase().trim() && (nrp === "" || empNik === nrp.toLowerCase().trim()));
    });
  }
  if (db.karyawan) {
    db.karyawan = db.karyawan.filter((k: string) => {
      return k.toLowerCase().trim() !== nama.toLowerCase().trim();
    });
  }
  await writeLocalDb(db);
  return { success: true, message: `Karyawan "${nama}" berhasil dihapus!` };
}

// getTrainingExemptions
export async function getTrainingExemptions() {
  if (isGoogleSheetsConfigured()) {
    try {
      const list = await getTrainingExemptionsFromSheets();
      return { success: true, list };
    } catch (err: any) {
      console.error("Gagal mendapatkan Pengecualian Training dari Google Sheets, menggunakan fallback lokal:", err);
    }
  }

  const db = await readLocalDb();
  if (!db.trainingExemptions) {
    db.trainingExemptions = [];
    await writeLocalDb(db);
  }
  return { success: true, list: db.trainingExemptions };
}

// saveTrainingExemption
export async function saveTrainingExemption(nama: string, training: string) {
  if (isGoogleSheetsConfigured()) {
    try {
      return await saveTrainingExemptionInSheets(nama, training);
    } catch (err: any) {
      console.error("Gagal menyimpan Pengecualian Training ke Google Sheets, menggunakan fallback lokal:", err);
    }
  }

  const db = await readLocalDb();
  if (!db.trainingExemptions) {
    db.trainingExemptions = [];
  }
  
  const alreadyExisted = db.trainingExemptions.some(
    (e: any) => e.nama.toLowerCase().trim() === nama.toLowerCase().trim() &&
                e.training.toLowerCase().trim() === training.toLowerCase().trim()
  );
  
  if (!alreadyExisted) {
    db.trainingExemptions.push({ nama: nama.trim(), training: training.trim() });
    await writeLocalDb(db);
  }

  return { success: true, message: `Pengecualian training untuk "${nama}" berhasil disimpan!` };
}

// deleteTrainingExemption
export async function deleteTrainingExemption(nama: string, training: string) {
  if (isGoogleSheetsConfigured()) {
    try {
      return await deleteTrainingExemptionInSheets(nama, training);
    } catch (err: any) {
      console.error("Gagal menghapus Pengecualian Training dari Google Sheets, menggunakan fallback lokal:", err);
    }
  }

  const db = await readLocalDb();
  if (db.trainingExemptions) {
    db.trainingExemptions = db.trainingExemptions.filter(
      (e: any) => !(e.nama.toLowerCase().trim() === nama.toLowerCase().trim() &&
                    e.training.toLowerCase().trim() === training.toLowerCase().trim())
    );
    await writeLocalDb(db);
  }

  return { success: true, message: "Pengecualian berhasil dihapus!" };
}

// 8b. getMasterApd
export async function getMasterApd() {
  if (isGoogleSheetsConfigured()) {
    try {
      const res = await getMasterApdFromSheets();
      if (res.success && res.list && res.list.length > 0) {
        return res;
      }
    } catch (err) {
      console.error("Gagal mendapatkan Master APD dari Google Sheets, menggunakan fallback lokal:", err);
    }
  }

  const db = await readLocalDb();
  const sorted = [...(db.masterApd || [])].sort();
  return { success: true, list: sorted, offline: true };
}

// 8c. saveMasterApd
export async function saveMasterApd(itemName: string) {
  if (isGoogleSheetsConfigured()) {
    try {
      const res = await saveMasterApdInSheets(itemName);
      return res;
    } catch (err: any) {
      console.error("Gagal menambahkan Master APD ke Google Sheets, menggunakan fallback lokal:", err);
    }
  }

  const db = await readLocalDb();
  if (!db.masterApd) {
    db.masterApd = [];
  }
  
  if (!db.masterApd.includes(itemName)) {
    db.masterApd.push(itemName);
    await writeLocalDb(db);
  }

  return { success: true, message: `APD "${itemName}" berhasil ditambahkan secara lokal!` };
}

// Helper for flexible name matching in local logs
function matchesLocalName(text: string, searchName: string): boolean {
  if (!text || !searchName) return false;
  const t = text.toLowerCase().trim();
  const s = searchName.toLowerCase().trim();

  if (t.includes(s) || s.includes(t)) return true;

  const cleanS = s.replace(/^(pak|bu|bapak|ibu|sdr|sdri)\s+/gi, "").trim();
  const cleanT = t.replace(/^(pak|bu|bapak|ibu|sdr|sdri)\s+/gi, "").trim();

  if (cleanS && (cleanT.includes(cleanS) || cleanS.includes(cleanT))) return true;

  const tokensS = cleanS.split(/\s+/).filter(w => w.length >= 3);
  if (tokensS.length > 0) {
    const allMatch = tokensS.every(tok => cleanT.includes(tok));
    if (allMatch) return true;
  }

  return false;
}

// 9. getHistoryPerKaryawan
export async function getHistoryPerKaryawan(namaKaryawan: string, site?: string) {
  if (isGoogleSheetsConfigured()) {
    // Note: getHistoryPerKaryawanFromSheets might need update to support site filtering
    return await getHistoryPerKaryawanFromSheets(namaKaryawan, site);
  }

  const db = await readLocalDb();
  const target = namaKaryawan.toLowerCase().trim();
  const timelineHistory: any[] = [];

  // 1. Check Data Order (APD dist)
  db.dataOrder.forEach((h: any) => {
    const itemSite = h.site || 'ITU-Admo';
    if (site && site !== 'ALL' && itemSite !== site) return;
    const ket = h.keterangan || "";
    if (matchesLocalName(ket, target) && h.jenis === "Barang Keluar") {
      timelineHistory.push({
        modul: "Transaksi APD & Barang",
        timestamp: h.timestamp,
        detail: `Menerima ${h.jumlah} pcs ${h.barang} (${h.kategori})`,
        oleh: h.oleh || "-"
      });
    }
  });

  // 2. Check NAPZA
  db.laporanNapza.forEach((n: any) => {
    const itemSite = n.site || 'ITU-Admo';
    if (site && site !== 'ALL' && itemSite !== site) return;
    const nameStr = n.nama || "";
    if (matchesLocalName(nameStr, target)) {
      timelineHistory.push({
        modul: "Medical - NAPZA",
        timestamp: n.timestamp,
        detail: `Pemeriksaan NAPZA periode ${n.periode} (Hasil: ${n.hasil})`,
        oleh: n.oleh || "-"
      });
    }
  });

  // 3. Check Donor Darah
  db.laporanDonorDarah.forEach((d: any) => {
    const itemSite = d.site || 'ITU-Admo';
    if (site && site !== 'ALL' && itemSite !== site) return;
    const nameStr = d.nama || "";
    if (matchesLocalName(nameStr, target)) {
      timelineHistory.push({
        modul: "Medical - Donor Darah",
        timestamp: d.timestamp,
        detail: `Partisipasi Donor Darah di ${d.lokasi} (Status: ${d.hasil})`,
        oleh: d.oleh || "-"
      });
    }
  });

  // Sort by date equivalent
  timelineHistory.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { success: true, data: timelineHistory };
}

// 10. getBelumMengisiData
export async function getBelumMengisiData(customSheetId?: string) {
  if (isGoogleSheetsConfigured()) {
    const sheetData = await getBelumMengisiDataFromSheets(customSheetId);
    if (sheetData && sheetData.success) {
      return sheetData;
    }
    console.log("ℹ️ getBelumMengisiData - Falling back to local Sandbox database due to Google sheet error:", sheetData?.message);
  }

  const db = await readLocalDb();
  const mappedValues = db.belumMengisi.map((b: any) => [
    b.tanggal, b.nrp, b.nama, b.jabatan, b.atasan
  ]);

  return {
    success: true,
    headers: ["Tanggal", "NRP / ID", "Nama Karyawan", "Jabatan", "Atasan Langsung"],
    values: mappedValues
  };
}

// 11. getUnfitData
export async function getUnfitData(customSheetId?: string) {
  if (isGoogleSheetsConfigured()) {
    const sheetData = await getUnfitDataFromSheets(customSheetId);
    if (sheetData && sheetData.success) {
      return sheetData;
    }
    console.log("ℹ️ getUnfitData - Falling back to local Sandbox database due to Google sheet error:", sheetData?.message);
  }

  const db = await readLocalDb();
  const mappedValues = db.unfit.map((u: any) => [
    u.tanggal, u.nrp, u.nama, u.jabatan, u.atasan
  ]);

  return {
    success: true,
    headers: ["Tanggal Lapor", "NRP / ID", "Nama Karyawan", "Jabatan", "Atasan Langsung"],
    values: mappedValues
  };
}

// 12. saveTrainingData
export async function saveTrainingData(nama: string, nrp: string, training: string, tglPelaksanaan: string, tglExpired: string, fileData: any, userName: string, rowId?: string, existingSertifikatUrl?: string, site?: string) {
  if (isGoogleSheetsConfigured()) {
    return await saveTrainingDataInSheets(nama, nrp, training, tglPelaksanaan, tglExpired, fileData, userName, rowId, existingSertifikatUrl);
  }

  const db = await readLocalDb();
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
  const fileUrl = (fileData && fileData.name) ? `https://storage.googleapis.com/codes-assets/placeholder-certificates/${fileData.name}` : "-";

  if (rowId && rowId !== "") {
    const idNum = parseInt(rowId);
    if (db.dataTraining && db.dataTraining[idNum] !== undefined) {
      db.dataTraining[idNum] = {
        ...db.dataTraining[idNum],
        nama,
        nrp,
        training,
        tglPelaksanaan,
        tglExpired,
        sertifikatUrl: (fileData && fileData.name) ? fileUrl : (existingSertifikatUrl || db.dataTraining[idNum].sertifikatUrl),
        oleh: userName,
        site: site || db.dataTraining[idNum].site || "ITU-Admo"
      };
      await writeLocalDb(db);
      return { success: true, message: "Data kualifikasi training berhasil diperbarui!" };
    }
  }

  db.dataTraining.push({
    timestamp,
    nama,
    nrp,
    training,
    tglPelaksanaan,
    tglExpired,
    sertifikatUrl: fileUrl,
    oleh: userName,
    site: site || "ITU-Admo"
  });

  await writeLocalDb(db);
  return { success: true, message: "Data training berhasil disimpan!" };
}

// 13. getTrainingDataList
export async function getTrainingDataList() {
  if (isGoogleSheetsConfigured()) {
    return await getTrainingDataListFromSheets();
  }

  const db = await readLocalDb();
  const listWithIds = (db.dataTraining || []).map((item: any, idx: number) => ({
    ...item,
    site: item.site || "ITU-Admo",
    rowId: idx
  }));
  const reversedList = [...listWithIds].reverse();
  return { data: reversedList };
}

// 13b. deleteTrainingData
export async function deleteTrainingData(rowId: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteTrainingDataInSheets(rowId);
  }

  const db = await readLocalDb();
  const idNum = parseInt(rowId);
  if (db.dataTraining && db.dataTraining[idNum] !== undefined) {
    db.dataTraining.splice(idNum, 1);
    await writeLocalDb(db);
    return { success: true, message: "Data kualifikasi training berhasil dihapus!" };
  }
  return { success: false, message: "Data kualifikasi training tidak ditemukan." };
}

// 14. saveMCUData
export async function saveMCUData(nrp: string, nama: string, tglMcu: string, jenisMcu: string, hasilMcu: string, statusMcu: string, tglExpiredMcu: string, catatanMcu: string, rowId: string, userName: string, site?: string) {
  if (isGoogleSheetsConfigured()) {
    return await saveMCUDataInSheets(nrp, nama, tglMcu, jenisMcu, hasilMcu, statusMcu, tglExpiredMcu, catatanMcu, rowId, userName);
  }

  const db = await readLocalDb();
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');

  if (rowId && rowId !== "") {
    const idNum = parseInt(rowId);
    const index = db.dataMcu.findIndex((m: any) => m.rowId === idNum);
    if (index !== -1) {
      db.dataMcu[index] = {
        ...db.dataMcu[index],
        nrp,
        nama,
        tglMcu,
        jenisMcu,
        hasilMcu,
        statusMcu,
        tglExpiredMcu,
        catatanMcu,
        operator: userName,
        site: site || db.dataMcu[index].site || "ITU-Admo"
      };
      await writeLocalDb(db);
      return { success: true, message: "Data Riwayat MCU berhasil diperbarui!" };
    }
    return { success: false, message: "Data Riwayat MCU tidak ditemukan untuk diupdate." };
  } else {
    // Generate a new row ID
    const nextRowId = db.dataMcu.length > 0 ? Math.max(...db.dataMcu.map((m: any) => m.rowId)) + 1 : 2;
    db.dataMcu.push({
      rowId: nextRowId,
      timestamp,
      nrp,
      nama,
      tglMcu,
      jenisMcu,
      hasilMcu,
      statusMcu,
      tglExpiredMcu,
      catatanMcu,
      operator: userName,
      site: site || "ITU-Admo"
    });
    await writeLocalDb(db);
    return { success: true, message: "Data Riwayat MCU berhasil disimpan!" };
  }
}

// 15. getMCUDataList
export async function getMCUDataList() {
  if (isGoogleSheetsConfigured()) {
    return await getMCUDataListFromSheets();
  }

  const db = await readLocalDb();
  return { data: db.dataMcu };
}

// 16. deleteMCUData
export async function deleteMCUData(rowId: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteMCUDataInSheets(rowId);
  }

  const db = await readLocalDb();
  const idNum = parseInt(rowId);
  const initialLen = db.dataMcu.length;
  db.dataMcu = db.dataMcu.filter((m: any) => m.rowId !== idNum);

  if (db.dataMcu.length < initialLen) {
    await writeLocalDb(db);
    return { success: true, message: "Data Riwayat MCU berhasil dihapus!" };
  }
  return { success: false, message: "Riwayat MCU gagal dihapus atau tidak ditemukan." };
}

// 17. getMasterAsetOptions
export async function getMasterAsetOptions() {
  if (isGoogleSheetsConfigured()) {
    return await getMasterAsetOptionsFromSheets();
  }

  const db = await readLocalDb();

  // Filter out items already inspected this month
  const today = new Date();
  const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const bulanSekarang = listBulan[today.getMonth()];
  const tahunSekarang = today.getFullYear().toString();

  const inspectedIds = db.historyInspeksi
    .filter((h: any) => h.bulan.toLowerCase() === bulanSekarang.toLowerCase() && h.tahun === tahunSekarang)
    .map((h: any) => h.idAlat);

  const filterItems = db.masterItem.filter((item: any) => !inspectedIds.includes(item.idAlat));
  
  const positions = [...new Set(filterItems.map((item: any) => item.posisi))].sort();

  return {
    success: true,
    posisiList: positions,
    masterAset: filterItems,
    allMasterAset: db.masterItem || []
  };
}

// Helper to save base64 uploads locally for offline fallback
async function saveBase64UploadLocally(fileName: string, base64Payload: string): Promise<string> {
  try {
    const matches = base64Payload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = "image/png";
    let base64Data = base64Payload;
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
    
    let ext = "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
    else if (mimeType.includes("gif")) ext = "gif";
    else if (mimeType.includes("pdf")) ext = "pdf";

    const safeNameClean = fileName.replace(/[^a-zA-Z0-9_\-]/g, "_") + "." + ext;
    const uploadDir = path.join(process.cwd(), "uploads");
    
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, safeNameClean);
    const dataBuffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, dataBuffer);
    
    return `/api/uploads/${safeNameClean}`;
  } catch (err) {
    console.error("🔴 Local photo write failed (dbService):", err);
    return "-";
  }
}

// 18. simpanInspeksiBulanan
export async function simpanInspeksiBulanan(dataForm: any, fileData: any) {
  if (isGoogleSheetsConfigured()) {
    return await simpanInspeksiBulananInSheets(dataForm, fileData);
  }

  const db = await readLocalDb();
  const idInspeksi = "INSP-" + Math.floor(10000 + Math.random() * 90000);
  const dateObj = new Date(dataForm.tanggal);
  const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const bulan = listBulan[dateObj.getMonth()];
  const tahun = dateObj.getFullYear().toString();

  const formattedDate = dateObj.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  let fileUrl = "-";
  if (fileData && fileData.data && fileData.name) {
    fileUrl = await saveBase64UploadLocally(`FOTO_INSP_${dataForm.idAlat}_${new Date().getTime()}`, fileData.data);
  } else if (fileData && fileData.name) {
    fileUrl = `https://storage.googleapis.com/codes-assets/placeholder-images/FOTO_INSP_${dataForm.idAlat}_${fileData.name}`;
  }

  db.historyInspeksi.push({
    idInspeksi,
    bulan,
    tahun,
    namaBarang: dataForm.namaBarang,
    idAlat: dataForm.idAlat,
    posisi: dataForm.posisi,
    tanggal: formattedDate,
    pic: dataForm.pic,
    kondisi: dataForm.kondisi,
    temuan: dataForm.temuan || "-",
    linkFoto: fileUrl,
    site: dataForm.site || "ITU-Admo"
  });

  await writeLocalDb(db);
  return { success: true, message: `Inspeksi ${dataForm.idAlat} berhasil disimpan!` };
}

// 19. getInspeksiHistoryData
export async function getInspeksiHistoryData() {
  if (isGoogleSheetsConfigured()) {
    return await getInspeksiHistoryDataFromSheets();
  }

  const db = await readLocalDb();
  const history = [...db.historyInspeksi].reverse();
  return { success: true, history: history.slice(0, 50) };
}

// 19b. updateInspeksiBulanan
export async function updateInspeksiBulanan(idInspeksi: string, updatedData: any, fileData: any) {
  if (isGoogleSheetsConfigured()) {
    return await updateInspeksiBulananInSheets(idInspeksi, updatedData, fileData);
  }

  const db = await readLocalDb();
  const idx = db.historyInspeksi.findIndex((item: any) => item.idInspeksi === idInspeksi);
  if (idx === -1) {
    return { success: false, message: "Laporan inspeksi tidak ditemukan." };
  }

  let fileUrl = db.historyInspeksi[idx].linkFoto || "-";
  if (fileData && fileData.data && fileData.name) {
    fileUrl = await saveBase64UploadLocally(`FOTO_INSP_${updatedData.idAlat || 'ID'}_${new Date().getTime()}`, fileData.data);
  }

  const dateObj = new Date(updatedData.tanggal);
  const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const bulan = listBulan[dateObj.getMonth()];
  const tahun = dateObj.getFullYear().toString();
  const formattedDate = dateObj.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

  db.historyInspeksi[idx] = {
    ...db.historyInspeksi[idx],
    bulan,
    tahun,
    tanggal: formattedDate,
    kondisi: updatedData.kondisi,
    temuan: updatedData.temuan || "-",
    linkFoto: fileUrl
  };

  await writeLocalDb(db);
  return { success: true, message: "Laporan inspeksi berhasil diperbarui!" };
}

// 20. Seed Data for Temuan MIO Sandbox Falling Back
function getSeedMioData() {
  return [
    {
      rowId: 2,
      tanggal: "15/06/2026",
      sebelum: "https://images.unsplash.com/photo-1590402421685-65cdd2929e71?w=400",
      penyimpangan: "Kabel daya kompresor utama terkelupas parah di dekat area basah pompa cuci unit.",
      lokasi: "Workshop Utama",
      detailLokasi: "Samping pompa air cuci unit workshop",
      tindakanPerbaikan: "Rapikan instalasi kabel, pasang conduit baja pelindung, dan ganti soket kelistrikan.",
      priority: "HIGH",
      pic: "Agus Santoso",
      section: "Maintenance Workshop",
      batasWaktu: "20/06/2026",
      tanggalPerbaikan: "",
      kategoriTemuan: "Electrical Safety",
      buktiTindakLanjut: "",
      status: "OPEN"
    },
    {
      rowId: 3,
      tanggal: "16/06/2026",
      sebelum: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=400",
      penyimpangan: "Tabung pemadam kebakaran (APAR CO2) kadaluwarsa sejak April 2026 tanpa segel keselamatan.",
      lokasi: "Gudang APD & Sparepart",
      detailLokasi: "Dekat pintu keluar nomor 2 barat",
      tindakanPerbaikan: "Ganti tabung APAR dengan cadangan baru yang teregistrasi, lalu kirim tabung lama untuk pengisian ulang.",
      priority: "MEDIUM",
      pic: "Susi Susanti",
      section: "Warehouse Security",
      batasWaktu: "22/06/2026",
      tanggalPerbaikan: "",
      kategoriTemuan: "Fire Safety",
      buktiTindakLanjut: "",
      status: "OPEN"
    }
  ];
}

// 21. getTemuanMioList
export async function getTemuanMioList() {
  if (isGoogleSheetsConfigured()) {
    return await getTemuanMioListFromSheets();
  }

  const db = await readLocalDb();
  if (!db.temuanMio || db.temuanMio.length === 0) {
    db.temuanMio = getSeedMioData();
    await writeLocalDb(db);
  }
  return { success: true, list: db.temuanMio };
}

// 22. simpanTemuanMioClosing
export async function simpanTemuanMioClosing(rowId: number, tanggalPerbaikan: string, fileData: any, keterangan: string) {
  if (isGoogleSheetsConfigured()) {
    return await simpanTemuanMioClosingInSheets(rowId, tanggalPerbaikan, fileData, keterangan);
  }

  const db = await readLocalDb();
  if (!db.temuanMio || db.temuanMio.length === 0) {
    db.temuanMio = getSeedMioData();
  }

  const index = db.temuanMio.findIndex((item: any) => item.rowId === rowId);
  if (index !== -1) {
    let mockUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400";
    if (fileData && fileData.name) {
      mockUrl = `[Demo Terunggah: ${fileData.name}]`;
    }

    let finalBuktiText = mockUrl;
    if (keterangan && keterangan.trim()) {
      finalBuktiText = `${mockUrl} - Note: ${keterangan}`;
    }

    db.temuanMio[index] = {
      ...db.temuanMio[index],
      tanggalPerbaikan,
      buktiTindakLanjut: finalBuktiText,
      status: "CLOSED"
    };

    await writeLocalDb(db);
    return { success: true, message: "Sukses Menutup Temuan MIO (Sandbox Demo)!" };
  }

  return { success: false, message: `Data Temuan MIO dengan RowID ${rowId} tidak ditemukan secara lokal.` };
}

// 23. Shared Email and Approval Logs Persistence
export async function recordEmailLog(logObj: any) {
  const db = await readLocalDb();
  if (!db.emailLogs) {
    db.emailLogs = [];
  }
  db.emailLogs.unshift(logObj); // Add newest first
  await writeLocalDb(db);
}

export async function getEmailLogs() {
  const db = await readLocalDb();
  return { success: true, list: db.emailLogs || [] };
}

// 24. Shared Action / Archives for BAK & BAKT Documents
export async function getBakDocs() {
  if (isGoogleSheetsConfigured()) {
    const list = await getBakDocsFromSheets();
    if (list !== null) {
      return { success: true, list };
    }
  }
  const db = await readLocalDb();
  return { success: true, list: db.bak_archives || [] };
}

export async function saveBakDoc(docObj: any) {
  if (isGoogleSheetsConfigured()) {
    const list = await getBakDocsFromSheets() || [];
    const existingIndex = list.findIndex((d: any) => d.id === docObj.id);
    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...docObj };
    } else {
      list.unshift(docObj);
    }
    await saveBakDocsStateToSheets(list);
    return { success: true, doc: docObj };
  }

  const db = await readLocalDb();
  if (!db.bak_archives) {
    db.bak_archives = [];
  }
  const existingIndex = db.bak_archives.findIndex((d: any) => d.id === docObj.id);
  if (existingIndex !== -1) {
    db.bak_archives[existingIndex] = { ...db.bak_archives[existingIndex], ...docObj };
  } else {
    db.bak_archives.unshift(docObj);
  }
  await writeLocalDb(db);
  return { success: true, doc: docObj };
}

export async function deleteBakDoc(id: string) {
  if (isGoogleSheetsConfigured()) {
    let list = await getBakDocsFromSheets() || [];
    list = list.filter((d: any) => d.id !== id);
    await saveBakDocsStateToSheets(list);
    return { success: true };
  }

  const db = await readLocalDb();
  if (db.bak_archives) {
    db.bak_archives = db.bak_archives.filter((d: any) => d.id !== id);
    await writeLocalDb(db);
  }
  return { success: true };
}

export async function getBaktDocs() {
  if (isGoogleSheetsConfigured()) {
    const list = await getBaktDocsFromSheets();
    if (list !== null) {
      return { success: true, list };
    }
  }
  const db = await readLocalDb();
  return { success: true, list: db.bakt_apd_archives || [] };
}

export async function saveBaktDoc(docObj: any) {
  if (isGoogleSheetsConfigured()) {
    const list = await getBaktDocsFromSheets() || [];
    const existingIndex = list.findIndex((d: any) => d.id === docObj.id);
    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...docObj };
    } else {
      list.unshift(docObj);
    }
    await saveBaktDocsStateToSheets(list);
    return { success: true, doc: docObj };
  }

  const db = await readLocalDb();
  if (!db.bakt_apd_archives) {
    db.bakt_apd_archives = [];
  }
  const existingIndex = db.bakt_apd_archives.findIndex((d: any) => d.id === docObj.id);
  if (existingIndex !== -1) {
    db.bakt_apd_archives[existingIndex] = { ...db.bakt_apd_archives[existingIndex], ...docObj };
  } else {
    db.bakt_apd_archives.unshift(docObj);
  }
  await writeLocalDb(db);
  return { success: true, doc: docObj };
}

export async function deleteBaktDoc(id: string) {
  if (isGoogleSheetsConfigured()) {
    let list = await getBaktDocsFromSheets() || [];
    list = list.filter((d: any) => d.id !== id);
    await saveBaktDocsStateToSheets(list);
    return { success: true };
  }

  const db = await readLocalDb();
  if (db.bakt_apd_archives) {
    db.bakt_apd_archives = db.bakt_apd_archives.filter((d: any) => d.id !== id);
    await writeLocalDb(db);
  }
  return { success: true };
}

export async function saveMasterItem(item: { namaBarang: string; idAlat: string; posisi: string }, oldIdAlat?: string) {
  if (isGoogleSheetsConfigured()) {
    const res = await saveMasterItemInSheets(item, oldIdAlat);
    if (!res.success) return res;
    const finalOptions = await getMasterAsetOptionsFromSheets();
    return { success: true, list: finalOptions.allMasterAset || [] };
  }

  const db = await readLocalDb();
  if (!db.masterItem) {
    db.masterItem = [];
  }

  const cleanedItem = {
    namaBarang: item.namaBarang.trim(),
    idAlat: item.idAlat.trim(),
    posisi: item.posisi.trim()
  };

  if (oldIdAlat) {
    const idx = db.masterItem.findIndex((m: any) => m.idAlat.toLowerCase() === oldIdAlat.toLowerCase());
    if (idx !== -1) {
      db.masterItem[idx] = cleanedItem;
    } else {
      const idExists = db.masterItem.some((m: any) => m.idAlat.toLowerCase() === cleanedItem.idAlat.toLowerCase());
      if (idExists) {
        return { success: false, message: `No. ID Alat "${cleanedItem.idAlat}" sudah digunakan!` };
      }
      db.masterItem.push(cleanedItem);
    }
  } else {
    const idExists = db.masterItem.some((m: any) => m.idAlat.toLowerCase() === cleanedItem.idAlat.toLowerCase());
    if (idExists) {
      return { success: false, message: `No. ID Alat "${cleanedItem.idAlat}" sudah terdaftar!` };
    }
    db.masterItem.push(cleanedItem);
  }

  await writeLocalDb(db);
  return { success: true, list: db.masterItem };
}

export async function deleteMasterItem(idAlat: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteMasterItemInSheets(idAlat);
  }

  const db = await readLocalDb();
  if (db.masterItem) {
    db.masterItem = db.masterItem.filter((m: any) => m.idAlat.toLowerCase() !== idAlat.toLowerCase());
    await writeLocalDb(db);
  }
  return { success: true };
}

// ==========================================
// VENDOR EVALUATION SYSTEMS ORCHESTRATION
// ==========================================

export async function getVendorsList() {
  if (isGoogleSheetsConfigured()) {
    return await getVendorsFromSheets();
  }

  const db = await readLocalDb();
  return db.vendors || [];
}

export async function saveVendor(vendorData: any, fileData?: any) {
  if (isGoogleSheetsConfigured()) {
    return await saveVendorInSheets(vendorData, fileData);
  }

  const db = await readLocalDb();
  if (!db.vendors) db.vendors = [];
  
  if (fileData && fileData.base64 && fileData.fileName) {
    const savedUrl = await saveBase64UploadLocally(`vendor_${vendorData.kode}_${Date.now()}`, fileData.base64);
    if (savedUrl && savedUrl !== "-") {
      vendorData.dokumenUrl = savedUrl;
    }
  }

  const existingIdx = db.vendors.findIndex((v: any) => v.kode.toLowerCase() === vendorData.kode.toLowerCase());
  
  const finalVendor = {
    ...vendorData,
    kode: vendorData.kode.trim().toUpperCase(),
    nama: vendorData.nama.trim(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    // Preserve old document url if no new one provided
    if (!finalVendor.dokumenUrl && db.vendors[existingIdx].dokumenUrl) {
      finalVendor.dokumenUrl = db.vendors[existingIdx].dokumenUrl;
    }
    db.vendors[existingIdx] = finalVendor;
  } else {
    finalVendor.createdAt = new Date().toISOString();
    db.vendors.push(finalVendor);
  }

  await writeLocalDb(db);
  return { success: true, list: db.vendors };
}

export async function deleteVendor(kode: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteVendorInSheets(kode);
  }

  const db = await readLocalDb();
  if (db.vendors) {
    db.vendors = db.vendors.filter((v: any) => v.kode.toLowerCase() !== kode.toLowerCase());
    await writeLocalDb(db);
  }
  return { success: true, list: db.vendors };
}

export async function getVendorEvaluationsList() {
  if (isGoogleSheetsConfigured()) {
    return await getVendorEvaluationsFromSheets();
  }
  const db = await readLocalDb();
  return db.evaluations || [];
}

export async function saveVendorEvaluation(evalData: any, fileData?: any) {
  if (fileData && fileData.base64 && fileData.fileName) {
    const savedUrl = await saveBase64UploadLocally(`eval_${evalData.vendorKode}_${Date.now()}`, fileData.base64);
    if (savedUrl && savedUrl !== "-") {
      evalData.buktiUrl = savedUrl;
    }
  }

  if (isGoogleSheetsConfigured()) {
    return await saveVendorEvaluationInSheets(evalData);
  }

  const db = await readLocalDb();
  if (!db.evaluations) db.evaluations = [];

  const existingIdx = db.evaluations.findIndex((e: any) => e.id === evalData.id);
  const finalEval = {
    ...evalData,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    if (!finalEval.buktiUrl && db.evaluations[existingIdx].buktiUrl) {
      finalEval.buktiUrl = db.evaluations[existingIdx].buktiUrl;
    }
    db.evaluations[existingIdx] = finalEval;
  } else {
    finalEval.id = evalData.id || `eval_${Date.now()}`;
    finalEval.createdAt = new Date().toISOString();
    db.evaluations.push(finalEval);
  }

  await writeLocalDb(db);
  return { success: true, list: db.evaluations };
}

export async function deleteVendorEvaluation(id: string) {
  if (isGoogleSheetsConfigured()) {
    return await deleteVendorEvaluationInSheets(id);
  }

  const db = await readLocalDb();
  if (db.evaluations) {
    db.evaluations = db.evaluations.filter((e: any) => e.id !== id);
    await writeLocalDb(db);
  }
  return { success: true, list: db.evaluations };
}

export async function getVendorWeights() {
  const db = await readLocalDb();
  return db.vendorWeights || { user: 40, hse: 30, ga: 30 };
}

export async function saveVendorWeights(weights: { user: number; hse: number; ga: number }) {
  const db = await readLocalDb();
  db.vendorWeights = weights;
  await writeLocalDb(db);
  return { success: true, weights: db.vendorWeights };
}

export async function getSettings() {
  const db = await readLocalDb();
  if (!db.settings) {
    db.settings = { 
      absensiMitra: { lat: -6.200000, lng: 106.816666, radius: 2000 },
      googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || ""
    };
    await writeLocalDb(db);
  } else if (db.settings.googleAppsScriptUrl && db.settings.googleAppsScriptUrl.includes("AKfycby6kmuh_7-jZFc2xpJv1TYvfVcqB48KwECMJFUhaVLD8xRjQJ4qSRMiJQO_LnwmymOoEQ")) {
    db.settings.googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "";
    await writeLocalDb(db);
  }
  return db.settings;
}

export async function saveSettings(settings: any) {
  const db = await readLocalDb();
  db.settings = { ...db.settings, ...settings };
  await writeLocalDb(db);
  return { success: true, settings: db.settings };
}

// ========== PROCEDURES (HIRA, JSA, SOP) DATABASE METHODS ==========

export async function getProsedurList() {
  const db = await readLocalDb();
  if (!db.prosedur) {
    db.prosedur = [];
    await writeLocalDb(db);
  }
  return db.prosedur;
}

export async function saveProsedur(doc: any) {
  const db = await readLocalDb();
  if (!db.prosedur) db.prosedur = [];

  const existingIdx = db.prosedur.findIndex((p: any) => p.id === doc.id);
  const finalDoc = {
    ...doc,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    db.prosedur[existingIdx] = finalDoc;
  } else {
    finalDoc.id = doc.id || `proc_${Date.now()}`;
    finalDoc.createdAt = new Date().toISOString();
    db.prosedur.push(finalDoc);
  }

  await writeLocalDb(db);
  return { success: true, list: db.prosedur };
}

export async function deleteProsedur(id: string) {
  const db = await readLocalDb();
  if (!db.prosedur) db.prosedur = [];

  db.prosedur = db.prosedur.filter((p: any) => p.id !== id);
  await writeLocalDb(db);
  return { success: true, list: db.prosedur };
}

export async function getAbsensiRooms() {
  const db = await readLocalDb();
  if (!db.absensiRooms || db.absensiRooms.length === 0) {
    if (isGoogleSheetsConfigured()) {
      const { getAbsensiRoomsFromSheets } = await import('./googleSheets.js');
      const sheetsRooms = await getAbsensiRoomsFromSheets();
      if (sheetsRooms && sheetsRooms.length > 0) {
        db.absensiRooms = sheetsRooms;
        await writeLocalDb(db);
        return sheetsRooms;
      }
    }
    db.absensiRooms = [];
    await writeLocalDb(db);
  }
  return db.absensiRooms || [];
}

export async function saveAbsenMitra(data: any) {
  if (isGoogleSheetsConfigured()) {
    const { saveAbsenMitraToSheets } = await import('./googleSheets.js');
    return await saveAbsenMitraToSheets(data);
  }
  // Local logic if necessary
  const db = await readLocalDb();
  if (!db.absenMitraLogs) db.absenMitraLogs = [];
  db.absenMitraLogs.push({ ...data, timestamp: new Date().toISOString() });
  await writeLocalDb(db);
  return { success: true };
}

export async function saveAbsensiRoom(room: any) {
  const db = await readLocalDb();
  if (!db.absensiRooms) db.absensiRooms = [];

  const existingIdx = db.absensiRooms.findIndex((r: any) => r.id === room.id);
  const finalRoom = {
    ...room,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    db.absensiRooms[existingIdx] = finalRoom;
  } else {
    finalRoom.createdAt = new Date().toISOString();
    db.absensiRooms.push(finalRoom);
  }

  // Sort by newest first
  db.absensiRooms.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  await writeLocalDb(db);
  
  if (isGoogleSheetsConfigured()) {
    const { saveAbsensiRoomsStateToSheets } = await import('./googleSheets.js');
    await saveAbsensiRoomsStateToSheets(db.absensiRooms);
  }
  
  return { success: true, list: db.absensiRooms };
}

export async function deleteAbsensiRoom(id: string) {
  const db = await readLocalDb();
  if (!db.absensiRooms) db.absensiRooms = [];

  db.absensiRooms = db.absensiRooms.filter((r: any) => r.id !== id);
  await writeLocalDb(db);
  
  if (isGoogleSheetsConfigured()) {
    const { saveAbsensiRoomsStateToSheets } = await import('./googleSheets.js');
    await saveAbsensiRoomsStateToSheets(db.absensiRooms);
  }
  
  return { success: true, list: db.absensiRooms };
}

// ========== NOMOR SURAT SYSTEM ==========
export async function getNomorSuratList() {
  if (isGoogleSheetsConfigured()) {
    const { getNomorSuratFromSheets } = await import("./googleSheets.js");
    return await getNomorSuratFromSheets();
  }
  const db = await readLocalDb();
  return db.nomorSurat || [];
}

export async function saveNomorSurat(suratObj: any) {
  if (isGoogleSheetsConfigured()) {
    const { saveNomorSuratToSheets, getNomorSuratFromSheets } = await import("./googleSheets.js");
    const saveRes = await saveNomorSuratToSheets(suratObj);
    if (saveRes.success) {
      const list = await getNomorSuratFromSheets();
      return { success: true, list };
    } else {
      return { success: false, message: saveRes.message };
    }
  }

  const db = await readLocalDb();
  if (!db.nomorSurat) db.nomorSurat = [];

  const existingIdx = db.nomorSurat.findIndex((s: any) => s.id === suratObj.id);
  const finalSurat = {
    ...suratObj,
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    db.nomorSurat[existingIdx] = {
      ...db.nomorSurat[existingIdx],
      ...finalSurat
    };
  } else {
    finalSurat.id = finalSurat.id || "ns-" + Date.now();
    finalSurat.createdAt = new Date().toISOString();
    db.nomorSurat.push(finalSurat);
  }

  // Sort by newest first (using tanggal or createdAt)
  db.nomorSurat.sort((a: any, b: any) => new Date(b.tanggal || b.createdAt).getTime() - new Date(a.tanggal || a.createdAt).getTime());

  await writeLocalDb(db);
  return { success: true, list: db.nomorSurat };
}

export async function deleteNomorSurat(id: string) {
  if (isGoogleSheetsConfigured()) {
    const { deleteNomorSuratFromSheets, getNomorSuratFromSheets } = await import("./googleSheets.js");
    const delRes = await deleteNomorSuratFromSheets(id);
    if (delRes.success) {
      const list = await getNomorSuratFromSheets();
      return { success: true, list };
    } else {
      return { success: false, message: delRes.message };
    }
  }

  const db = await readLocalDb();
  if (!db.nomorSurat) db.nomorSurat = [];

  db.nomorSurat = db.nomorSurat.filter((s: any) => s.id !== id);
  await writeLocalDb(db);
  return { success: true, list: db.nomorSurat };
}

// 34. DPB (Daftar Permintaan Barang) Service Functions
export function calculateNextDpbNoReg(docs: any[] = []): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');

  let maxSeq = 0;

  docs.forEach((doc: any) => {
    if (!doc) return;
    const rawNoReg = doc.noReg || doc.no_reg || "";
    if (rawNoReg) {
      const parts = rawNoReg.split('/');
      const lastPart = parts[parts.length - 1];
      const parsedNum = parseInt(lastPart, 10);
      if (!isNaN(parsedNum) && parsedNum > maxSeq) {
        maxSeq = parsedNum;
      }
    }
  });

  const nextSeqNum = maxSeq + 1;
  const paddedSeq = String(nextSeqNum).padStart(3, '0');
  return `DPB/${year}/${month}/${paddedSeq}`;
}

export async function getDpbDocs() {
  let list: any[] = [];
  if (isGoogleSheetsConfigured()) {
    const sheetList = await getDpbDocsFromSheets();
    if (sheetList !== null) {
      list = sheetList;
    }
  }

  const db = await readLocalDb();
  if (!db.dpb_archives) db.dpb_archives = [];

  if (list.length === 0) {
    list = db.dpb_archives;
  } else {
    // Merge local items if not already in sheet list
    const sheetIds = new Set(list.map((d: any) => d.id || d.noReg));
    db.dpb_archives.forEach((localDoc: any) => {
      if (!sheetIds.has(localDoc.id) && !sheetIds.has(localDoc.noReg)) {
        list.push(localDoc);
      }
    });
  }

  // Filter out any header rows that might have been accidentally saved or read
  list = list.filter((doc: any) => {
    if (!doc) return false;
    const nr = (doc.noReg || '').toString().toLowerCase();
    const dohl = (doc.dimintaOleh || '').toString().toLowerCase();
    if (nr.includes('registrasi') || nr === 'no reg' || dohl === 'diminta oleh') return false;
    return true;
  });

  // Sort descending by createdAt or tanggal
  list.sort((a, b) => new Date(b.createdAt || b.tanggal || 0).getTime() - new Date(a.createdAt || a.tanggal || 0).getTime());

  const nextNoReg = calculateNextDpbNoReg(list);
  return { success: true, list, nextNoReg };
}

export async function saveDpbDoc(docObj: any) {
  if (isGoogleSheetsConfigured()) {
    await saveDpbDocToSheets(docObj);
  }

  const db = await readLocalDb();
  if (!db.dpb_archives) {
    db.dpb_archives = [];
  }

  const existingIndex = db.dpb_archives.findIndex((d: any) => d.id === docObj.id || d.noReg === docObj.noReg);
  if (existingIndex !== -1) {
    db.dpb_archives[existingIndex] = { ...db.dpb_archives[existingIndex], ...docObj };
  } else {
    db.dpb_archives.unshift(docObj);
  }
  await writeLocalDb(db);

  const allDocs = await getDpbDocs();
  return { success: true, doc: docObj, list: allDocs.list, nextNoReg: allDocs.nextNoReg };
}

export async function deleteDpbDoc(id: string) {
  if (isGoogleSheetsConfigured()) {
    await deleteDpbDocFromSheets(id);
  }

  const db = await readLocalDb();
  if (db.dpb_archives) {
    db.dpb_archives = db.dpb_archives.filter((d: any) => d.id !== id && d.noReg !== id);
    await writeLocalDb(db);
  }

  const allDocs = await getDpbDocs();
  return { success: true, list: allDocs.list, nextNoReg: allDocs.nextNoReg };
}






