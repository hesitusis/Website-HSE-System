import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { Readable } from "stream";
import multer from "multer";
import {
  checkLogin,
  saveOrderData,
  updateOrderDate,
  getInventoryData,
  saveNapzaData,
  getNapzaHistoryData,
  deleteNapzaData,
  updateNapzaData,
  saveDonorDarahData,
  getDonorDarahHistoryData,
  getDaftarKaryawan,
  getMasterApd,
  saveMasterApd,
  getHistoryPerKaryawan,
  getBelumMengisiData,
  getUnfitData,
  saveTrainingData,
  getTrainingDataList,
  deleteTrainingData,
  saveMCUData,
  getMCUDataList,
  deleteMCUData,
  getMasterAsetOptions,
  simpanInspeksiBulanan,
  getInspeksiHistoryData,
  updateInspeksiBulanan,
  getTemuanMioList,
  simpanTemuanMioClosing,
  getDaftarUsers,
  saveUserData,
  saveUserSignature,
  getBakDocs,
  saveBakDoc,
  deleteBakDoc,
  getBaktDocs,
  saveBaktDoc,
  deleteBaktDoc,
  getEmailLogs,
  saveMasterItem,
  deleteMasterItem,
  updateMinePermit,
  deleteKaryawan,
  getVendorsList,
  saveVendor,
  deleteVendor,
  getVendorEvaluationsList,
  saveVendorEvaluation,
  deleteVendorEvaluation,
  getVendorWeights,
  saveVendorWeights,
  getProsedurList,
  saveProsedur,
  deleteProsedur,
  getNomorSuratList,
  saveNomorSurat,
  deleteNomorSurat,
  getSettings,
  saveSettings,
  saveAbsenMitra,
  getTrainingExemptions,
  saveTrainingExemption,
  deleteTrainingExemption,
  getDpbDocs,
  saveDpbDoc,
  deleteDpbDoc
} from "./src/server/dbService.js";
import {
  isGoogleSheetsConfigured,
  SHEET_ID_MAIN,
  getGoogleAuth,
  getGoogleServiceAccountEmail,
  getLastDriveUploadError,
  getDriveFolderId,
  clearLastDriveUploadError,
  healLocalUrlInSheets,
  uploadToDrive,
  uploadFileToGoogleDrive
} from "./src/server/googleSheets.js";
import { readSpipSheet, writeSpipSheet, logAuditUpdate } from "./src/server/spipService.js";

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

  // Configure Multer for in-memory file uploads to Google Drive
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  });

  // Configure body size limits to allow base64 file payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve uploaded assets statically
  app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Custom fallback handler for missing local upload files - searches in Google Drive and redirects if found, self-healing spreadsheet
  app.get("/api/uploads/:filename", async (req, res, next) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "uploads", filename);

      // If the file actually exists on disk, send it (usually express.static handles this, but as fallback if static didn't trigger)
      if (fsSync.existsSync(filePath)) {
        return res.sendFile(filePath);
      }

      console.log(`🔍 File "${filename}" tidak ditemukan di lokal. Mencari di Google Drive...`);

      // Try to search Google Drive
      const { drive: driveClient } = getGoogleAuth();
      if (!driveClient) {
        return res.status(404).json({
          success: false,
          message: `Dokumen "${filename}" tidak ditemukan secara lokal, dan integrasi Google Drive belum diaktifkan.`
        });
      }

      const folderId = getDriveFolderId();

      // Formulate query variations
      let cleanBase = filename;
      const extMatch = filename.match(/\.([^.]+)$/);
      const originalExt = extMatch ? extMatch[1] : "";

      if (extMatch) {
        cleanBase = filename.substring(0, filename.length - extMatch[0].length);
      }

      // If it ends with _pdf, _jpg, etc.
      const endings = ["_pdf", "_jpg", "_jpeg", "_png", "_gif"];
      for (const end of endings) {
        if (cleanBase.endsWith(end)) {
          cleanBase = cleanBase.substring(0, cleanBase.length - end.length);
          break;
        }
      }

      const queryVariations = [
        filename, // e.g., TRAIN_9937_BLS_Rahmat_Hidayat_pdf.pdf
        cleanBase + (originalExt ? "." + originalExt : ""), // e.g., TRAIN_9937_BLS_Rahmat_Hidayat.pdf
        cleanBase, // e.g., TRAIN_9937_BLS_Rahmat_Hidayat
      ];

      let foundFileUrl = "";

      for (const nameQuery of queryVariations) {
        try {
          const driveResponse = await driveClient.files.list({
            q: `'${folderId}' in parents and name = '${nameQuery}' and trashed = false`,
            fields: "files(id, name, webViewLink, webContentLink)",
            spaces: "drive",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });

          const files = driveResponse.data.files || [];
          if (files.length > 0) {
            foundFileUrl = files[0].webViewLink || files[0].webContentLink || "";
            if (foundFileUrl) {
              console.log(`🟢 Menemukan file persis di Google Drive: "${files[0].name}" -> ${foundFileUrl}`);
              break;
            }
          }
        } catch (err) {
          console.error(`Gagal mencari name = '${nameQuery}' di Google Drive:`, err);
        }
      }

      // If still not found, try a wildcard/contains search using the clean base name
      if (!foundFileUrl && cleanBase.length > 4) {
        try {
          const driveResponse = await driveClient.files.list({
            q: `'${folderId}' in parents and name contains '${cleanBase}' and trashed = false`,
            fields: "files(id, name, webViewLink, webContentLink)",
            spaces: "drive",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });

          const files = driveResponse.data.files || [];
          if (files.length > 0) {
            foundFileUrl = files[0].webViewLink || files[0].webContentLink || "";
            if (foundFileUrl) {
              console.log(`🟢 Menemukan file parsial di Google Drive: "${files[0].name}" -> ${foundFileUrl}`);
            }
          }
        } catch (err) {
          console.error(`Gagal mencari name contains '${cleanBase}' di Google Drive:`, err);
        }
      }

      if (foundFileUrl) {
        // Trigger self-healing background job to fix Google Sheets
        const originalLocalUrl = `/api/uploads/${filename}`;
        healLocalUrlInSheets(originalLocalUrl, foundFileUrl).catch(healErr => {
          console.error("Gagal melakukan healing URL di Google Sheets:", healErr);
        });

        // Redirect the client to Google Drive directly!
        return res.redirect(foundFileUrl);
      }

      return res.status(404).json({
        success: false,
        message: `Dokumen atau file "${filename}" tidak ditemukan di server lokal maupun Google Drive (Folder ID: ${folderId}). Pastikan file telah diunggah ke folder Drive Anda.`
      });

    } catch (routeErr: any) {
      console.error("Kesalahan pada route fallback uploads:", routeErr);
      return res.status(500).json({
        success: false,
        message: `Terjadi kesalahan saat memproses pencarian file: ${routeErr.message}`
      });
    }
  });

  // -------------------------------------------------------------
  // Backend API Router Endpoints
  // -------------------------------------------------------------

  // Connection and Mode Status
  app.get("/api/status", (req, res) => {
    res.json({
      googleSheetsConfigured: isGoogleSheetsConfigured(),
      appUrl: process.env.APP_URL || "http://localhost:3000",
      spreadsheetId: SHEET_ID_MAIN,
      serviceAccountEmail: getGoogleServiceAccountEmail(),
      driveFolderId: getDriveFolderId(),
      lastDriveError: getLastDriveUploadError()
    });
  });

  app.post("/api/status/clear-error", (req, res) => {
    clearLastDriveUploadError();
    res.json({ success: true, message: "Drive upload error cleared" });
  });

  // Login Endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
      }
      const data = await checkLogin(username, password);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // User Access & Management Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getSettings();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/settings/save", async (req, res) => {
    try {
      const result = await saveSettings(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/settings/test-appsscript", async (req, res) => {
    try {
      const url = (req.body && req.body.url ? String(req.body.url) : "").trim();
      if (!url) {
        return res.status(400).json({ success: false, message: "URL Apps Script tidak boleh kosong." });
      }

      console.log(`ℹ️ Menguji URL Google Apps Script: ${url}`);
      const testData = {
        folderId: "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy",
        fileName: `TEST_PING_${Date.now()}.txt`,
        base64Data: Buffer.from("Ping test Google Apps Script berhasil!").toString("base64"),
        mimeType: "text/plain"
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
        redirect: "follow",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const text = await response.text();

      if (text.trim().startsWith("<")) {
        return res.json({
          success: false,
          needsAuth: false,
          message: "URL Apps Script mengembalikan halaman HTML. Pastikan saat deploy, 'Who has access' (Siapa yang memiliki akses) disetel ke 'Anyone' (Siapa saja) dan URL berakhiran /exec."
        });
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return res.json({
          success: false,
          needsAuth: false,
          message: `Respon dari Google Apps Script bukan JSON yang valid: ${text.slice(0, 150)}`
        });
      }

      if (parsed.success && (parsed.webViewLink || parsed.fileId)) {
        return res.json({
          success: true,
          webViewLink: parsed.webViewLink,
          fileId: parsed.fileId,
          message: "Koneksi Berhasil! Google Apps Script memiliki otorisasi penuh dan siap menyimpan dokumen langsung ke Google Drive."
        });
      }

      const errString = parsed.error || JSON.stringify(parsed);
      if (errString.includes("DriveApp") || errString.includes("存取遭拒") || errString.includes("Access denied") || errString.includes("Authorization")) {
        return res.json({
          success: false,
          needsAuth: true,
          error: errString,
          message: "Izin Google Drive belum diaktifkan di Google Apps Script (Access Denied: DriveApp). Silakan buka editor script, pilih fungsi 'aktivasiIzinDrive' lalu klik tombol 'Jalankan (Run)' untuk mengizinkan akses."
        });
      }

      return res.json({
        success: false,
        needsAuth: false,
        error: errString,
        message: `Apps Script mengembalikan error: ${errString}`
      });
    } catch (err: any) {
      return res.json({
        success: false,
        needsAuth: false,
        message: `Gagal menghubungi URL Apps Script: ${err.message || err}`
      });
    }
  });

  app.post("/api/absensi-mitra/save", async (req, res) => {
    try {
      const result = await saveAbsenMitra(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await getDaftarUsers();
      res.json({ success: true, list: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/users/save", async (req, res) => {
    try {
      const userObj = req.body;
      const result = await saveUserData(userObj);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/users/signature/save", async (req, res) => {
    try {
      const { username, ttdBase64 } = req.body;
      if (!username || !ttdBase64) {
        return res.status(400).json({ success: false, message: "Parameter username dan ttdBase64 wajib diisi." });
      }
      const result = await saveUserSignature(username, ttdBase64);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Inventory & Order Router
  app.get("/api/inventory", async (req, res) => {
    try {
      const data = await getInventoryData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/order/save", async (req, res) => {
    try {
      const { jenis, kategori, barang, jumlah, keterangan, userName, tanggal, customDate, site } = req.body;
      const data = await saveOrderData(jenis, kategori, barang, jumlah, keterangan, userName, tanggal || customDate, site);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/order/update-date", async (req, res) => {
    try {
      const { originalTimestamp, barang, keterangan, jumlah, oleh, newDate } = req.body;
      const data = await updateOrderDate({ originalTimestamp, barang, keterangan, jumlah, oleh, newDate });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // NAPZA Router
  // Upload attachment file to Google Drive (Folder ID: 1AUXCZGF69iKK5ttWyGYugus57ht49Yiy)
  app.post("/api/napza/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah." });
      }

      const folderId = (req.body && req.body.folderId) ? req.body.folderId : "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy";
      const nrp = req.body?.nrp || "";
      const prefix = nrp ? `NAPZA_${nrp}_` : `NAPZA_`;
      const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${prefix}${Date.now()}_${safeOriginalName}`;

      // Upload using unified helper (Service Account, Apps Script proxy, or safe storage fallback)
      const uploadResult = await uploadFileToGoogleDrive(
        file.buffer,
        fileName,
        file.mimetype,
        folderId
      );

      if (!uploadResult.success || !uploadResult.webViewLink) {
        return res.status(500).json({
          success: false,
          message: uploadResult.error || "Gagal mengunggah file."
        });
      }

      let finalFileUrl = uploadResult.webViewLink;
      // If stored locally as fallback, prepend origin to form full valid HTTP(S) URL
      if (finalFileUrl.startsWith("/")) {
        const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
        const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:3000";
        finalFileUrl = `${protocol}://${host}${finalFileUrl}`;
      }

      console.log(`🟢 Upload file NAPZA berhasil: ${finalFileUrl}`);
      return res.status(200).json({
        success: true,
        fileUrl: finalFileUrl,
        webViewLink: finalFileUrl,
        fileId: uploadResult.fileId || fileName,
        fileName: fileName,
        isDrive: finalFileUrl.includes("drive.google.com"),
        message: "File berhasil diunggah."
      });
    } catch (err: any) {
      console.error("Upload NAPZA file error:", err);
      res.status(500).json({ success: false, message: err.message || "Gagal mengunggah file." });
    }
  });

  // Generic Google Drive Upload endpoint
  app.post("/api/upload-drive", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah." });
      }

      const folderId = (req.body && req.body.folderId) ? req.body.folderId : "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy";
      const fileName = req.body?.fileName || `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const uploadResult = await uploadFileToGoogleDrive(
        file.buffer,
        fileName,
        file.mimetype,
        folderId
      );

      if (!uploadResult.success || !uploadResult.webViewLink) {
        return res.status(500).json({
          success: false,
          message: uploadResult.error || "Gagal mengunggah file ke Google Drive."
        });
      }

      res.json({
        success: true,
        webViewLink: uploadResult.webViewLink,
        fileId: uploadResult.fileId,
        fileName: fileName,
        message: "File berhasil diunggah ke Google Drive."
      });
    } catch (err: any) {
      console.error("Upload drive file error:", err);
      res.status(500).json({ success: false, message: err.message || "Gagal mengunggah file." });
    }
  });

  app.post("/api/napza/save", async (req, res) => {
    try {
      const { nama, nrp, jabatan, periode, hasil, userName, fileData, webViewLink, fileUrl, dokumen, site } = req.body;
      const finalDoc = fileUrl || webViewLink || dokumen || fileData || "-";
      const data = await saveNapzaData(nama, nrp, jabatan, periode, hasil, userName, finalDoc, site);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/napza/history", async (req, res) => {
    try {
      const data = await getNapzaHistoryData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/napza/delete", async (req, res) => {
    try {
      const { rowId, timestamp, nrp, nama } = req.body;
      const data = await deleteNapzaData({ rowId, timestamp, nrp, nama });
      res.json(data);
    } catch (err: any) {
      console.error("deleteNapzaData error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/napza/delete", async (req, res) => {
    try {
      const { rowId, timestamp, nrp, nama } = req.body;
      const data = await deleteNapzaData({ rowId, timestamp, nrp, nama });
      res.json(data);
    } catch (err: any) {
      console.error("deleteNapzaData error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/napza/update", async (req, res) => {
    try {
      const { rowId, oldTimestamp, oldNrp, nama, nrp, jabatan, periode, hasil, userName, fileData, webViewLink, fileUrl, dokumen } = req.body;
      const finalDoc = fileUrl || webViewLink || dokumen || fileData || "-";
      const data = await updateNapzaData({
        rowId,
        oldTimestamp,
        oldNrp,
        nama,
        nrp,
        jabatan,
        periode,
        hasil,
        dokumen: finalDoc,
        userName
      });
      res.json(data);
    } catch (err: any) {
      console.error("updateNapzaData error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put("/api/napza/update", async (req, res) => {
    try {
      const { rowId, oldTimestamp, oldNrp, nama, nrp, jabatan, periode, hasil, userName, fileData, webViewLink, fileUrl, dokumen } = req.body;
      const finalDoc = fileUrl || webViewLink || dokumen || fileData || "-";
      const data = await updateNapzaData({
        rowId,
        oldTimestamp,
        oldNrp,
        nama,
        nrp,
        jabatan,
        periode,
        hasil,
        dokumen: finalDoc,
        userName
      });
      res.json(data);
    } catch (err: any) {
      console.error("updateNapzaData error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Donor Darah Router
  app.post("/api/donor/save", async (req, res) => {
    try {
      const { nama, nrp, jabatan, tanggalDonor, lokasi, tensi, hasilSkrining, userName, site } = req.body;
      const data = await saveDonorDarahData(nama, nrp, jabatan, tanggalDonor, lokasi, tensi, hasilSkrining, userName, site);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/donor/history", async (req, res) => {
    try {
      const data = await getDonorDarahHistoryData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Employee Master Data
  app.get("/api/karyawan", async (req, res) => {
    try {
      const data = await getDaftarKaryawan();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Mine Permit masa berlaku
  app.post("/api/karyawan/update-mine-permit", async (req, res) => {
    try {
      const { nama, nrp, newDate } = req.body;
      if (!nama || !newDate) {
        return res.status(400).json({ success: false, error: "Parameters 'nama' and 'newDate' are required" });
      }
      const result = await updateMinePermit(nama, nrp || "", newDate);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Karyawan from master database
  app.delete("/api/karyawan", async (req, res) => {
    try {
      const nama = (req.body.nama || req.query.nama) as string;
      const nrp = (req.body.nrp || req.query.nrp || "") as string;
      if (!nama) {
        return res.status(400).json({ success: false, error: "Parameter 'nama' required" });
      }
      const result = await deleteKaryawan(nama, nrp);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Training exemptions API routes
  app.get("/api/training-exemptions", async (req, res) => {
    try {
      const result = await getTrainingExemptions();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/training-exemptions", async (req, res) => {
    try {
      const { nama, training } = req.body;
      if (!nama || !training) {
        return res.status(400).json({ success: false, error: "Parameters 'nama' and 'training' are required" });
      }
      const result = await saveTrainingExemption(nama, training);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/training-exemptions", async (req, res) => {
    try {
      const { nama, training } = req.body || req.query;
      const targetNama = nama || req.query.nama;
      const targetTraining = training || req.query.training;
      if (!targetNama || !targetTraining) {
        return res.status(400).json({ success: false, error: "Parameters 'nama' and 'training' are required" });
      }
      const result = await deleteTrainingExemption(targetNama, targetTraining);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Master APD Options
  app.get("/api/master-apd", async (req, res) => {
    try {
      const data = await getMasterApd();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/master-apd", async (req, res) => {
    try {
      const { nama, itemName } = req.body;
      const targetName = nama || itemName;
      if (!targetName) {
        return res.status(400).json({ success: false, error: "Parameter 'nama' wajib diisi" });
      }
      const result = await saveMasterApd(targetName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/karyawan/history", async (req, res) => {
    try {
      const nama = req.query.nama as string;
      if (!nama) {
        return res.status(400).json({ success: false, error: "Query parameter 'nama' is required" });
      }
      const data = await getHistoryPerKaryawan(nama);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // FTW Safety Checks
  app.get("/api/bugar/belum", async (req, res) => {
    try {
      const customSheetId = req.query.customSheetId as string | undefined;
      const data = await getBelumMengisiData(customSheetId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/bugar/unfit", async (req, res) => {
    try {
      const customSheetId = req.query.customSheetId as string | undefined;
      const data = await getUnfitData(customSheetId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Training Router
  app.post("/api/training/save", async (req, res) => {
    try {
      const { nama, nrp, training, tglPelaksanaan, tglExpired, fileData, userName, rowId, existingSertifikatUrl, site } = req.body;
      const data = await saveTrainingData(nama, nrp, training, tglPelaksanaan, tglExpired, fileData, userName, rowId, existingSertifikatUrl, site);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/training", async (req, res) => {
    try {
      const data = await getTrainingDataList();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/training/:rowId", async (req, res) => {
    try {
      const { rowId } = req.params;
      const data = await deleteTrainingData(rowId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // MCU Router
  app.post("/api/mcu/save", async (req, res) => {
    try {
      const { nrp, nama, tglMcu, jenisMcu, hasilMcu, statusMcu, tglExpiredMcu, catatanMcu, rowId, userName, site } = req.body;
      const data = await saveMCUData(nrp, nama, tglMcu, jenisMcu, hasilMcu, statusMcu, tglExpiredMcu, catatanMcu, rowId, userName, site);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/mcu", async (req, res) => {
    try {
      const data = await getMCUDataList();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/mcu/:rowId", async (req, res) => {
    try {
      const { rowId } = req.params;
      const data = await deleteMCUData(rowId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Inspeksi K3 Bulanan Router
  app.get("/api/inspeksi/master-options", async (req, res) => {
    try {
      const data = await getMasterAsetOptions();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/inspeksi/master-item/save", async (req, res) => {
    try {
      const { item, oldIdAlat } = req.body;
      if (!item || !item.idAlat || !item.namaBarang || !item.posisi) {
        return res.status(400).json({ success: false, message: "ID Alat, Nama Barang, dan Posisi wajib diisi." });
      }
      const result = await saveMasterItem(item, oldIdAlat);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/inspeksi/master-item/delete/:idAlat", async (req, res) => {
    try {
      const { idAlat } = req.params;
      const result = await deleteMasterItem(idAlat);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/inspeksi/save", async (req, res) => {
    try {
      const { dataForm, fileData } = req.body;
      const data = await simpanInspeksiBulanan(dataForm, fileData);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/inspeksi/history", async (req, res) => {
    try {
      const data = await getInspeksiHistoryData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/inspeksi/update", async (req, res) => {
    try {
      const { idInspeksi, updatedData, fileData } = req.body;
      const data = await updateInspeksiBulanan(idInspeksi, updatedData, fileData);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Temuan MIO Endpoints
  app.get("/api/mio/list", async (req, res) => {
    try {
      const data = await getTemuanMioList();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/mio/close", async (req, res) => {
    try {
      const { rowId, tanggalPerbaikan, fileData, keterangan } = req.body;
      if (!rowId || !tanggalPerbaikan) {
        return res.status(400).json({ success: false, message: "Parameter rowId dan tanggalPerbaikan wajib diisi." });
      }
      const data = await simpanTemuanMioClosing(parseInt(rowId), tanggalPerbaikan, fileData, keterangan || "");
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== SHARED DOCUMENTS WORKFLOWS & PERSISTENCE ROUTES ==========

  app.get("/api/bak/list", async (req, res) => {
    try {
      const data = await getBakDocs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/bak/save", async (req, res) => {
    try {
      const doc = req.body;
      const data = await saveBakDoc(doc);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/bak/delete/:id", async (req, res) => {
    try {
      const data = await deleteBakDoc(req.params.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/bakt/list", async (req, res) => {
    try {
      const data = await getBaktDocs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/bakt/save", async (req, res) => {
    try {
      const doc = req.body;
      const data = await saveBaktDoc(doc);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/bakt/delete/:id", async (req, res) => {
    try {
      const data = await deleteBaktDoc(req.params.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== DPB (Daftar Permintaan Barang) ENDPOINTS ==========
  app.get("/api/dpb/list", async (req, res) => {
    try {
      const data = await getDpbDocs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/dpb/save", async (req, res) => {
    try {
      const doc = req.body;
      const data = await saveDpbDoc(doc);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/dpb/delete/:id", async (req, res) => {
    try {
      const data = await deleteDpbDoc(req.params.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== VENDOR EVALUATION SYSTEM ENDPOINTS ==========

  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await getVendorsList();
      res.json({ success: true, list: vendors });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/vendors/save", async (req, res) => {
    try {
      const { vendorData, fileData } = req.body;
      if (!vendorData || !vendorData.kode || !vendorData.nama) {
        return res.status(400).json({ success: false, message: "Kode and Nama Vendor are required." });
      }
      const result = await saveVendor(vendorData, fileData);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/vendors/delete/:kode", async (req, res) => {
    try {
      const result = await deleteVendor(req.params.kode);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/vendor-evaluations", async (req, res) => {
    try {
      const evaluations = await getVendorEvaluationsList();
      res.json({ success: true, list: evaluations });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/vendor-evaluations/save", async (req, res) => {
    try {
      const { evalData, fileData } = req.body;
      if (!evalData || !evalData.vendorKode || !evalData.periode) {
        return res.status(400).json({ success: false, message: "Vendor and Periode are required." });
      }
      const result = await saveVendorEvaluation(evalData, fileData);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/vendor-evaluations/delete/:id", async (req, res) => {
    try {
      const result = await deleteVendorEvaluation(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/vendor-weights", async (req, res) => {
    try {
      const weights = await getVendorWeights();
      res.json({ success: true, weights });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/vendor-weights/save", async (req, res) => {
    try {
      const { weights } = req.body;
      if (!weights || typeof weights.user !== "number" || typeof weights.hse !== "number" || typeof weights.ga !== "number") {
        return res.status(400).json({ success: false, message: "Valid weights (user, hse, ga) are required." });
      }
      const result = await saveVendorWeights(weights);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== PROCEDURES (HIRA, JSA, SOP) ENDPOINTS ==========

  app.get("/api/prosedur/list", async (req, res) => {
    try {
      const data = await getProsedurList();
      res.json({ success: true, list: data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/prosedur/save", async (req, res) => {
    try {
      const doc = req.body;
      if (!doc || !doc.title || !doc.type) {
        return res.status(400).json({ success: false, message: "Judul dan Tipe Prosedur wajib diisi." });
      }
      const result = await saveProsedur(doc);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/prosedur/delete/:id", async (req, res) => {
    try {
      const result = await deleteProsedur(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== ABSENSI ROUTES ==========

  app.get("/api/absensi", async (req, res) => {
    try {
      const { getAbsensiRooms } = await import("./src/server/dbService.js");
      const rooms = await getAbsensiRooms();
      res.json({ success: true, list: rooms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/absensi/save", async (req, res) => {
    try {
      const room = req.body;
      const { saveAbsensiRoom } = await import("./src/server/dbService.js");
      const result = await saveAbsensiRoom(room);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/absensi/delete/:id", async (req, res) => {
    try {
      const { deleteAbsensiRoom } = await import("./src/server/dbService.js");
      const result = await deleteAbsensiRoom(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/absensi/sync-peserta", async (req, res) => {
    try {
      const { room, peserta } = req.body;
      const { saveAbsensiToSheets } = await import("./src/server/googleSheets.js");
      const result = await saveAbsensiToSheets(room, peserta);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== NOMOR SURAT ROUTES ==========

  app.get("/api/nomor-surat", async (req, res) => {
    try {
      const list = await getNomorSuratList();
      res.json({ success: true, list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/nomor-surat/save", async (req, res) => {
    try {
      const result = await saveNomorSurat(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.delete("/api/nomor-surat/delete/:id", async (req, res) => {
    try {
      const result = await deleteNomorSurat(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ========== EMAIL NOTIFICATIONS LOGS & DISPATCH ROUTES ==========

  app.get("/api/email-logs", async (req, res) => {
    try {
      const data = await getEmailLogs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/send-approval-email", async (req, res) => {
    try {
      const { toEmail, approverName, docType, docNumber, createdBy, createdAt, roleType, approveUrl } = req.body;
      if (!toEmail || !approverName || !docType || !docNumber || !createdBy || !createdAt || !roleType || !approveUrl) {
        return res.status(400).json({ success: false, message: "Semua parameter email wajib diisi." });
      }
      const { sendApprovalEmail } = await import("./src/server/mailService.js");
      const result = await sendApprovalEmail({
        toEmail,
        approverName,
        docType,
        docNumber,
        createdBy,
        createdAt,
        roleType,
        approveUrl
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });


  app.get("/api/drive-proxy", async (req, res) => {
    try {
      const { id, url } = req.query;
      let fileId = (id as string) || "";
      
      if (!fileId && url) {
        const urlStr = url as string;
        const fdMatch = urlStr.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fdMatch && fdMatch[1]) {
          fileId = fdMatch[1];
        } else {
          const idMatch = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (idMatch && idMatch[1]) {
            fileId = idMatch[1];
          }
        }
      }

      if (!fileId) {
        return res.status(400).send("Parameter id atau url Google Drive wajib ada.");
      }

      // FALLBACK 1: Standard public high-definition Google Drive Thumbnail CDN
      // This is extremely robust, bypasses any security/virus scan warning HTML structures, and serves the raw image instantly.
      try {
        const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
        const thumbRes = await fetch(thumbUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          }
        });
        
        if (thumbRes.ok) {
          const contentType = thumbRes.headers.get("content-type") || "image/jpeg";
          if (!contentType.includes("text/html")) {
            const buffer = await thumbRes.arrayBuffer();
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=604800"); // Cache for 7 days
            return res.send(Buffer.from(buffer));
          }
        }
      } catch (thumbErr) {
        console.warn("Thumbnail CDN fetch failed for fileId:", fileId, thumbErr);
      }

      // FALLBACK 2: Standard unauthenticated public Googleusercontent CDN request
      try {
        const cdnUrl = `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
        const cdnRes = await fetch(cdnUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          }
        });
        
        if (cdnRes.ok) {
          const contentType = cdnRes.headers.get("content-type") || "image/jpeg";
          // If the CDN request returned HTML (like a login screen or warning error), we skip to next fallback
          if (!contentType.includes("text/html")) {
            const buffer = await cdnRes.arrayBuffer();
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=604800"); // Cache for 7 days
            return res.send(Buffer.from(buffer));
          }
        }
      } catch (cdnErr) {
        console.warn("CDN direct fetch failed for fileId:", fileId, cdnErr);
      }

      // FALLBACK 3: Standard unauthenticated public Google Drive uc?export=download
      try {
        const dUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const dRes = await fetch(dUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          }
        });

        if (dRes.ok) {
          const contentType = dRes.headers.get("content-type") || "image/jpeg";
          if (!contentType.includes("text/html")) {
            const buffer = await dRes.arrayBuffer();
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=604800");
            return res.send(Buffer.from(buffer));
          }
        }
      } catch (dErr) {
        console.warn("Direct download fetch failed for fileId:", fileId, dErr);
      }

      // FALLBACK 3: Authenticated Drive API (only if configured and fully enabled on GCP console)
      try {
        const { drive, isConfigured } = getGoogleAuth();
        if (isConfigured && drive) {
          const meta = await drive.files.get({
            fileId: fileId,
            fields: "mimeType, name"
          });

          const mimeType = meta.data.mimeType || "image/jpeg";

          const response = await drive.files.get(
            { fileId: fileId, alt: "media" },
            { responseType: "stream" }
          );

          res.setHeader("Content-Type", mimeType);
          res.setHeader("Cache-Control", "public, max-age=604800");
          return response.data.pipe(res);
        }
      } catch (driveApiErr) {
        console.error("Authenticated Drive API failed too:", driveApiErr);
      }

      // Return a professional placeholder / descriptive error notice
      return res.status(404).send("Gambar tidak dapat diakses. Mohon pastikan link Google Drive diset dengan akses 'Siapa saja yang memiliki link / Anyone with link'.");
    } catch (err: any) {
      console.error("Error proxying Drive file:", err);
      res.status(500).send("Gagal memuat gambar: " + err.message);
    }
  });

  // -------------------------------------------------------------
  // SPIP Monitoring Keselamatan API Endpoints
  // -------------------------------------------------------------

  app.get("/api/spip/sheets/:sheetName", async (req, res) => {
    try {
      const { sheetName } = req.params;
      const data = await readSpipSheet(sheetName);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.log(`[SPIP Endpoints] Handled read for: ${req.params.sheetName}`, err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/spip/sheets/:sheetName/save", async (req, res) => {
    try {
      const { sheetName } = req.params;
      const data = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ success: false, message: "Request body harus berupa Array data." });
      }
      const success = await writeSpipSheet(sheetName, data);
      return res.json({ success });
    } catch (err: any) {
      console.log(`[SPIP Endpoints] Handled save for: ${req.params.sheetName}`, err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/spip/audit/log", async (req, res) => {
    try {
      const { user, type, change } = req.body;
      await logAuditUpdate(user, type, change);
      return res.json({ success: true });
    } catch (err: any) {
      console.log(`[SPIP Endpoints] Handled audit log`, err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post("/api/spip/upload", async (req, res) => {
    try {
      const { fileName, fileData } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ success: false, message: "Parameter fileName dan fileData (base64) wajib diisi." });
      }

      // Convert and upload
      const fileUrl = await uploadToDrive(fileName, fileData);
      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.log(`[SPIP Endpoints] Handled upload`, err.message || err);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // -------------------------------------------------------------
  // Serve Frontend assets using Vite Dev Server or Production Static Files
  // -------------------------------------------------------------
  async function startStandaloneServer() {
    if (process.env.VERCEL) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({
            success: false,
            message: "Dokumen atau file tidak ditemukan (kemungkinan server telah direstart dan file lokal terhapus, gunakan Google Sheets/Drive untuk penyimpanan permanen)."
          });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 HSE ITU full-stack server running on http://localhost:${PORT}`);
    });
  }

  startStandaloneServer();

  export default app;
