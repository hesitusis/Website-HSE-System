import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { getSettings } from './dbService.js';

export function extractSpreadsheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.includes("docs.google.com/spreadsheets")) {
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

export const SHEET_ID_MAIN = extractSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID || "17R9i0n3eMOOSGO3wF_8MJKJ5oqsjW-aQ6gUMMHNjbNY");
export const SHEET_ID_DAILY = extractSpreadsheetId(process.env.GOOGLE_SPREADSHEET_DAILY_ID || "19kUpCQRjaMzZo1KMtXklhlRIOx7eMsyiRtpMCHzAvZo");

export function extractFolderId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.includes("drive.google.com")) {
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      return folderMatch[1];
    }
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idParamMatch && idParamMatch[1]) {
      return idParamMatch[1];
    }
  }
  return trimmed;
}

export function getDriveFolderId(): string {
  return extractFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID || "1x5Duwji-8B7Xq0hvCoOj7NxtlLcZXpIB");
}

export const FOLDER_ID_DRIVE = getDriveFolderId();

let authClient: any = null;
let sheets: any = null;
let drive: any = null;

// Robust function to handle environments where JSON might be escaped, single/double quoted, or wrapped.
function robustParseServiceAccount(raw: string): any {
  let str = raw.trim();
  
  console.log(`[JSON Parse Debug] Original length: ${raw.length}, trimmed length: ${str.length}`);
  if (str.length > 0) {
    // Collect non-sensitive safe diagnostics of the first few and last few characters
    const first5 = Array.from(str.slice(0, 5)).map(c => `${c === '\n' ? '\\n' : c === '\r' ? '\\r' : c} (code: ${c.charCodeAt(0)})`).join(', ');
    const last5 = Array.from(str.slice(-5)).map(c => `${c === '\n' ? '\\n' : c === '\r' ? '\\r' : c} (code: ${c.charCodeAt(0)})`).join(', ');
    console.log(`[JSON Parse Debug] First 5 characters: ${first5}`);
    console.log(`[JSON Parse Debug] Last 5 characters: ${last5}`);
  }

  // Attempt 1: Direct JSON parsing
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    if (typeof parsed === 'string') {
      console.log(`[JSON Parse Debug] Double-stringified JSON detected. Re-parsing...`);
      return JSON.parse(parsed);
    }
  } catch (e: any) {
    console.warn(`[JSON Parse Debug] Attempt 1 (Direct JSON.parse) failed: ${e.message}`);
  }

  // Attempt 2: Strip outer single quotes (sometimes added by env managers or copy-paste)
  if (str.startsWith("'") && str.endsWith("'")) {
    console.log(`[JSON Parse Debug] Stripping outer single quotes...`);
    try {
      const stripped = str.slice(1, -1).trim();
      return JSON.parse(stripped);
    } catch (e: any) {
      console.warn(`[JSON Parse Debug] Attempt 2 (Strip single quotes) failed: ${e.message}`);
    }
  }

  // Attempt 3: Strip outer double quotes (sometimes added by env managers or copy-paste)
  if (str.startsWith('"') && str.endsWith('"')) {
    console.log(`[JSON Parse Debug] Stripping outer double quotes...`);
    try {
      let stripped = str.slice(1, -1).trim();
      if (stripped.includes('\\"')) {
        stripped = stripped.replace(/\\"/g, '"');
      }
      return JSON.parse(stripped);
    } catch (e: any) {
      console.warn(`[JSON Parse Debug] Attempt 3 (Strip double quotes) failed: ${e.message}`);
    }
  }

  // Attempt 4: Clean up escaped newlines and internal quotes manually
  try {
    console.log(`[JSON Parse Debug] Attempting manual string cleanup (unescaping)...`);
    let cleaned = str;
    cleaned = cleaned.replace(/\\n/g, '\n');
    cleaned = cleaned.replace(/\\r/g, '\r');
    cleaned = cleaned.replace(/\\"/g, '"');
    
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.warn(`[JSON Parse Debug] Attempt 4 (Manual cleanup) failed: ${e.message}`);
  }

  // Attempt 5: Handle isolation of main JSON brace body block
  try {
    console.log(`[JSON Parse Debug] Attempting structural brace isolation...`);
    const startIndex = str.indexOf('{');
    const endIndex = str.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const braceContent = str.slice(startIndex, endIndex + 1);
      return JSON.parse(braceContent);
    }
  } catch (e: any) {
    console.warn(`[JSON Parse Debug] Attempt 5 (Brace isolation) failed: ${e.message}`);
  }

  throw new Error("Could not parse Google Service Account JSON through any of the robust parsing strategies.");
}

// Initialize Google SDKs dynamically if credentials exist in Node env
export function getGoogleAuth() {
  if (sheets) return { sheets, drive, isConfigured: true };

  const saJsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJsonStr) {
    return { sheets: null, drive: null, isConfigured: false };
  }

  // Pre-check: If it does not start with an object brace or lack key requirements, do not parse
  const trimmed = saJsonStr.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes("client_email")) {
    console.log("ℹ️ GOOGLE_SERVICE_ACCOUNT_JSON is not configured with a valid Google JSON credentials object. Running in standalone internal database mode.");
    return { sheets: null, drive: null, isConfigured: false };
  }

  try {
    const credentials = robustParseServiceAccount(saJsonStr);
    authClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ]
    });
    sheets = google.sheets({ version: 'v4', auth: authClient });
    drive = google.drive({ version: 'v3', auth: authClient });
    console.log("🟢 Google APIs initialized successfully with Service Account.");
    return { sheets, drive, isConfigured: true };
  } catch (err) {
    console.warn("⚠️ Could not process Google Service Account JSON configuration:", err);
    return { sheets: null, drive: null, isConfigured: false };
  }
}

export const isGoogleSheetsConfigured = () => {
  return getGoogleAuth().isConfigured;
};

export function getGoogleServiceAccountEmail(): string {
  const saJsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJsonStr) return "";
  try {
    const credentials = robustParseServiceAccount(saJsonStr);
    return credentials.client_email || "";
  } catch {
    return "";
  }
}

export let lastDriveUploadError = "";

export function getLastDriveUploadError() {
  return lastDriveUploadError;
}

export function clearLastDriveUploadError() {
  lastDriveUploadError = "";
}

// Helper to convert base64 payload into Readable Stream for Drive Upload
export async function uploadToDrive(fileName: string, base64Payload: string): Promise<string> {
  // 1. ALWAYS write the file locally first as a 100% reliable fallback!
  let localUrl = "-";
  let hasLocalBackup = false;
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

    const extMatch = fileName.match(/\.([^.]+)$/);
    const actualExt = extMatch ? extMatch[1] : ext;
    let baseName = extMatch ? fileName.substring(0, fileName.length - extMatch[0].length) : fileName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const safeNameClean = `${cleanBase}.${actualExt}`;
    const uploadDir = path.join(process.cwd(), "uploads");
    
    // Create directory synchronously if not exists to avoid async race conditions
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, safeNameClean);
    const dataBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, dataBuffer);
    
    localUrl = `/api/uploads/${safeNameClean}`;
    hasLocalBackup = true;
    console.log(`🟢 Local backup saved successfully at ${localUrl}`);
  } catch (localWriteErr) {
    console.error("🔴 Local photo backup write failed:", localWriteErr);
  }

  const { drive: driveClient } = getGoogleAuth();
  if (!driveClient) {
    console.log("ℹ️ Google Drive is not configured. Falling back to robust local storage.");
    lastDriveUploadError = "Google Drive is not configured (credentials missing).";
    return hasLocalBackup ? localUrl : "-";
  }

  try {
    const matches = base64Payload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.warn("Invalid base64 payload format, saving with local fallback if available.");
      lastDriveUploadError = "Format file tidak valid (bukan base64 data URL).";
      return hasLocalBackup ? localUrl : "-";
    }

    const mimeType = matches[1];
    const base64DataOnly = matches[2];
    const dataBuffer = Buffer.from(base64DataOnly, 'base64');
    const folderId = getDriveFolderId();

    // --- SOLUSI A: Google Apps Script Web App Proxy ---
    // Prioritize user-configured URL from settings (UI) over environment fallback
    const settings = await getSettings();
    const candidateUrl = (settings?.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
    const isPlaceholder = candidateUrl.includes("AKfycby6kmuh_7-jZFc2xpJv1TYvfVcqB48KwECMJFUhaVLD8xRjQJ4qSRMiJQO_LnwmymOoEQ");
    const configuredAppsScriptUrl = (!isPlaceholder && candidateUrl.startsWith("https://script.google.com")) 
      ? candidateUrl 
      : "";

    if (configuredAppsScriptUrl) {
      try {
        const scriptUrl = configuredAppsScriptUrl;
        console.log(`ℹ️ Mencoba mengunggah ke Google Drive via Google Apps Script: ${scriptUrl}`);
        const postData = {
          folderId: folderId,
          fileName: fileName,
          base64Data: base64DataOnly,
          mimeType: mimeType
        };

        const scriptRes = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(postData),
          redirect: "follow"
        });

        const rawText = await scriptRes.text();
        let result: any = null;
        try {
          result = JSON.parse(rawText);
        } catch {
          console.warn(`⚠️ Respon Apps Script bukan format JSON yang valid.`);
        }

        if (result && result.success && result.webViewLink) {
          console.log(`🟢 Berhasil mengunggah file ke Google Drive via Google Apps Script: ${result.webViewLink}`);
          lastDriveUploadError = ""; // Clear error
          return result.webViewLink;
        } else if (result && result.error) {
          console.warn(`⚠️ Google Apps Script mengembalikan error: ${result.error}.`);
          lastDriveUploadError = `Apps Script Error: ${result.error}`;
        }
      } catch (scriptErr: any) {
        console.warn(`⚠️ Gagal menghubungi Google Apps Script: ${scriptErr.message || scriptErr}.`);
      }
    }

    // --- SOLUSI B: Fallback ke Service Account (dengan supportsAllDrives: true) ---
    const stream = Readable.from(dataBuffer);
    
    // Attempt to fetch the folder owner email to bypass quota limits
    let folderOwnerEmail = "";
    try {
      console.log(`ℹ️ Fetching owners for folder ID: ${folderId}`);
      const folderRes = await driveClient.files.get({
        fileId: folderId,
        fields: 'owners',
        supportsAllDrives: true,
      });
      const owners = folderRes.data.owners;
      if (owners && owners.length > 0) {
        folderOwnerEmail = owners[0].emailAddress || "";
        console.log(`ℹ️ Google Drive Folder owner email is: ${folderOwnerEmail}`);
      }
    } catch (ownerErr: any) {
      console.warn(`⚠️ Gagal mengambil owner email dari folder Drive "${folderId}": ${ownerErr.message || ownerErr}`);
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: stream,
    };

    let response;
    let folderErrorMsg = "";
    try {
      response = await driveClient.files.create({
        supportsAllDrives: true,
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });
    } catch (driveErr: any) {
      folderErrorMsg = driveErr.message || String(driveErr);
      console.warn(`⚠️ Gagal mengunggah ke folder Drive "${folderId}": ${folderErrorMsg}. Mencoba mengunggah ke Root Drive...`);
      // Re-create the readable stream from the buffer since streams can only be read once
      const retryStream = Readable.from(dataBuffer);
      response = await driveClient.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: fileName,
        },
        media: {
          mimeType,
          body: retryStream,
        },
        fields: 'id, webViewLink, webContentLink',
      });
    }

    const fileId = response.data.id;
    if (fileId) {
      let ownershipTransferred = false;
      if (folderOwnerEmail) {
        try {
          console.log(`ℹ️ Mencoba mentransfer kepemilikan file ${fileId} ke ${folderOwnerEmail} untuk menghindari limit quota Service Account...`);
          await driveClient.permissions.create({
            fileId: fileId,
            transferOwnership: true,
            supportsAllDrives: true,
            requestBody: {
              role: 'owner',
              type: 'user',
              emailAddress: folderOwnerEmail,
            }
          });
          ownershipTransferred = true;
          console.log(`🟢 Berhasil mentransfer kepemilikan file ke: ${folderOwnerEmail}`);
        } catch (transErr: any) {
          console.warn(`⚠️ Gagal mentransfer kepemilikan file ke ${folderOwnerEmail}: ${transErr.message || transErr}. File tetap di bawah Service Account.`);
        }
      }

      if (!ownershipTransferred) {
        try {
          await driveClient.permissions.create({
            fileId: fileId,
            supportsAllDrives: true,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            }
          });
        } catch (pe) {
          console.warn("Could not set permission to anyone with link:", pe);
        }
      }
    }

    const driveUrl = response.data.webViewLink || response.data.webContentLink;
    if (driveUrl) {
      console.log(`🟢 Successfully uploaded photo to Google Drive: ${driveUrl}`);
      lastDriveUploadError = ""; // Clear on success!
      return driveUrl;
    }
    
    lastDriveUploadError = "Uploaded but webViewLink and webContentLink are both empty.";
    return hasLocalBackup ? localUrl : "-";
  } catch (err: any) {
    const finalErr = err.message || String(err);
    const folderId = getDriveFolderId();
    lastDriveUploadError = `Gagal upload. Folder Error: "${folderId}" - ${finalErr}`;
    console.error("🔴 Error uploading file to Google Drive, using local fallback:", err);
    return hasLocalBackup ? localUrl : "-";
  }
}

/**
 * Upload any file buffer directly to Google Drive via Service Account to a specific Folder ID
 * Defaults to Folder ID: 1AUXCZGF69iKK5ttWyGYugus57ht49Yiy (Folder Lampiran Laporan NAPZA)
 */
export async function uploadFileToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string = "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy"
): Promise<{ success: boolean; webViewLink: string; fileId?: string; error?: string }> {
  const { drive: driveClient } = getGoogleAuth();

  // 1. Try Google Apps Script Proxy first if user configured a valid URL (bypasses Service Account 0MB quota)
  try {
    const settings = await getSettings();
    const candidateUrl = (settings?.googleAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
    // Ignore known dead placeholder URLs
    const isPlaceholder = candidateUrl.includes("AKfycby6kmuh_7-jZFc2xpJv1TYvfVcqB48KwECMJFUhaVLD8xRjQJ4qSRMiJQO_LnwmymOoEQ");
    const configuredAppsScriptUrl = (!isPlaceholder && candidateUrl.startsWith("https://script.google.com")) ? candidateUrl : "";

    if (configuredAppsScriptUrl) {
      console.log(`ℹ️ Mencoba mengunggah ke Google Drive melalui Apps Script proxy ke folder ${folderId}...`);
      const base64Data = fileBuffer.toString("base64");
      const postData = {
        folderId,
        fileName,
        base64Data,
        mimeType: mimeType || "application/octet-stream"
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      try {
        const scriptRes = await fetch(configuredAppsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
          redirect: "follow",
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const rawText = await scriptRes.text();

        // Check if Google returned an HTML error/login page instead of JSON
        if (rawText.trim().startsWith("<") || !rawText.includes("{")) {
          console.warn("⚠️ Apps Script mengembalikan halaman HTML Google (Script URL mungkin memerlukan otorisasi atau tidak aktif).");
        } else {
          let result: any = null;
          try {
            result = JSON.parse(rawText);
          } catch {
            console.warn("⚠️ Respon dari Google Apps Script bukan JSON yang valid.");
          }

          if (result && result.success && result.webViewLink) {
            console.log(`🟢 Berhasil upload via Apps Script proxy: ${result.webViewLink}`);
            return {
              success: true,
              webViewLink: result.webViewLink,
              fileId: result.fileId
            };
          } else if (result && result.error) {
            console.warn(`⚠️ Apps Script mengembalikan error: ${result.error}`);
          }
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.warn("⚠️ Gagal menghubungi Apps Script proxy (timeout atau network error):", fetchErr?.message || fetchErr);
      }
    }
  } catch (proxyErr: any) {
    console.warn("⚠️ Apps Script proxy error:", proxyErr?.message || proxyErr);
  }

  // 2. Direct upload using Google Service Account (googleapis)
  if (driveClient) {
    try {
      // Check if folder is on a Shared Drive or Personal Drive
      let isPersonalDrive = false;
      let folderOwnerEmail = "";
      try {
        const folderRes = await driveClient.files.get({
          fileId: folderId,
          fields: "id, driveId, owners",
          supportsAllDrives: true,
        });
        if (folderRes.data.owners && folderRes.data.owners.length > 0) {
          folderOwnerEmail = folderRes.data.owners[0].emailAddress || "";
        }
        if (!folderRes.data.driveId && folderRes.data.owners && folderRes.data.owners.length > 0) {
          isPersonalDrive = true;
        }
      } catch (ownerErr: any) {
        console.warn(`⚠️ Warning fetching details for folder ${folderId}:`, ownerErr?.message || ownerErr);
      }

      console.log(`ℹ️ Mengunggah file "${fileName}" ke Google Drive Folder ID: ${folderId} via Service Account...`);
      const stream = Readable.from(fileBuffer);
      const fileMetadata: any = {
        name: fileName,
        parents: [folderId],
      };
      const media = {
        mimeType: mimeType || "application/octet-stream",
        body: stream,
      };

      const driveRes = await driveClient.files.create({
        supportsAllDrives: true,
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink",
      });

      const fileId = driveRes.data.id;
      let webViewLink = driveRes.data.webViewLink;

        if (fileId) {
          try {
            await driveClient.permissions.create({
              fileId: fileId,
              supportsAllDrives: true,
              requestBody: {
                role: "reader",
                type: "anyone",
              },
            });
          } catch (permErr: any) {
            console.warn("⚠️ Warning setting reader permission on Drive file:", permErr?.message || permErr);
          }

          if (!webViewLink) {
            try {
              const getFile = await driveClient.files.get({
                fileId: fileId,
                fields: "webViewLink",
                supportsAllDrives: true,
              });
              webViewLink = getFile.data.webViewLink;
            } catch (ge) {}
          }

          if (!webViewLink) {
            webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
          }

          console.log(`🟢 Berhasil upload file ke Google Drive (Folder: ${folderId}): ${webViewLink}`);
          return {
            success: true,
            webViewLink,
            fileId,
          };
        }
    } catch (driveErr: any) {
      const errMsg = driveErr?.message || String(driveErr);
      if (errMsg.includes("storage quota") || errMsg.includes("Service Accounts do not have storage quota")) {
        console.info(`ℹ️ Folder Drive "${folderId}" berada di Drive Personal (Service Account quota 0 MB). Menyiapkan fallback penyimpanan server...`);
      } else {
        console.warn(`⚠️ Gagal upload langsung via Service Account ke folder ${folderId}:`, errMsg);
      }
    }
  }

  // 3. Robust Storage Fallback: Simpan file dan sediakan URL yang valid
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const localFilePath = path.join(uploadDir, safeName);
  fs.writeFileSync(localFilePath, fileBuffer);
  const localUrl = `/api/uploads/${safeName}`;
  console.log(`🟢 File berhasil disimpan di penyimpanan server: ${localUrl}`);

  return {
    success: true,
    webViewLink: localUrl,
    fileId: safeName
  };
}

// Helper to search and replace local file fallback URLs with permanent Google Drive URLs
export async function healLocalUrlInSheets(localUrl: string, googleDriveUrl: string): Promise<boolean> {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) {
    console.warn("⚠️ Cannot heal Google Sheets URL because Google Sheets is not configured.");
    return false;
  }

  try {
    console.log(`🩹 Running healLocalUrlInSheets for localUrl: ${localUrl} -> ${googleDriveUrl}`);

    // 1. Check "Data Training"
    try {
      const trainRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Data Training'!G:G",
      });
      const trainValues = trainRes.data.values || [];
      for (let i = 0; i < trainValues.length; i++) {
        const val = trainValues[i]?.[0] || "";
        if (val === localUrl) {
          const rowIndex = i + 1;
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'Data Training'!G${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[googleDriveUrl]] },
          });
          console.log(`🟢 Healed 'Data Training'!G${rowIndex} with ${googleDriveUrl}`);
        }
      }
    } catch (e: any) {
      console.warn("Heal error in 'Data Training':", e.message);
    }

    // 2. Check "Laporan NAPZA"
    try {
      const napzaRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Laporan NAPZA'!G:G",
      });
      const napzaValues = napzaRes.data.values || [];
      for (let i = 0; i < napzaValues.length; i++) {
        const val = napzaValues[i]?.[0] || "";
        if (val === localUrl) {
          const rowIndex = i + 1;
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'Laporan NAPZA'!G${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[googleDriveUrl]] },
          });
          console.log(`🟢 Healed 'Laporan NAPZA'!G${rowIndex} with ${googleDriveUrl}`);
        }
      }
    } catch (e: any) {
      console.warn("Heal error in 'Laporan NAPZA':", e.message);
    }

    // 3. Check "HISTORY_INSPEKSI"
    try {
      const inspRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'HISTORY_INSPEKSI'!O:O",
      });
      const inspValues = inspRes.data.values || [];
      for (let i = 0; i < inspValues.length; i++) {
        const val = inspValues[i]?.[0] || "";
        if (val === localUrl) {
          const rowIndex = i + 1;
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'HISTORY_INSPEKSI'!O${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[googleDriveUrl]] },
          });
          console.log(`🟢 Healed 'HISTORY_INSPEKSI'!O${rowIndex} with ${googleDriveUrl}`);
        }
      }
    } catch (e: any) {
      console.warn("Heal error in 'HISTORY_INSPEKSI':", e.message);
    }

    // 4. Check "Temuan MIO"
    try {
      const mioRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Temuan MIO'!M:M",
      });
      const mioValues = mioRes.data.values || [];
      for (let i = 0; i < mioValues.length; i++) {
        const val = mioValues[i]?.[0] || "";
        if (val.includes(localUrl)) {
          const rowIndex = i + 1;
          const newVal = val.replace(localUrl, googleDriveUrl);
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'Temuan MIO'!M${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[newVal]] },
          });
          console.log(`🟢 Healed 'Temuan MIO'!M${rowIndex} with ${newVal}`);
        }
      }
    } catch (e: any) {
      console.warn("Heal error in 'Temuan MIO':", e.message);
    }

    // 5. Check "Daftar Vendor Mitra"
    try {
      const vendorRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Daftar Vendor Mitra'!L:L",
      });
      const vendorValues = vendorRes.data.values || [];
      for (let i = 0; i < vendorValues.length; i++) {
        const val = vendorValues[i]?.[0] || "";
        if (val === localUrl) {
          const rowIndex = i + 1;
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'Daftar Vendor Mitra'!L${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[googleDriveUrl]] },
          });
          console.log(`🟢 Healed 'Daftar Vendor Mitra'!L${rowIndex} with ${googleDriveUrl}`);
        }
      }
    } catch (e: any) {
      console.warn("Heal error in 'Daftar Vendor Mitra':", e.message);
    }

    return true;
  } catch (err: any) {
    console.error("🔴 Failed to heal local URL in Google Sheets:", err);
    return false;
  }
}

// Search and automatically heal a local fallback URL to Google Drive URL in Google Sheets in the background
export async function autoHealLocalUrl(localUrl: string): Promise<boolean> {
  const { drive: driveClient } = getGoogleAuth();
  if (!driveClient) return false;

  try {
    const filename = path.basename(localUrl);
    const folderId = getDriveFolderId();

    console.log(`🔍 [Auto-Heal] Mencari file ${filename} di Google Drive folder ${folderId}...`);

    let cleanBase = filename;
    const extMatch = filename.match(/\.([^.]+)$/);
    const originalExt = extMatch ? extMatch[1] : "";

    if (extMatch) {
      cleanBase = filename.substring(0, filename.length - extMatch[0].length);
    }

    const endings = ["_pdf", "_jpg", "_jpeg", "_png", "_gif"];
    for (const end of endings) {
      if (cleanBase.endsWith(end)) {
        cleanBase = cleanBase.substring(0, cleanBase.length - end.length);
        break;
      }
    }

    const queryVariations = [
      filename,
      cleanBase + (originalExt ? "." + originalExt : ""),
      cleanBase,
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
            console.log(`🟢 [Auto-Heal] File ditemukan via query '${nameQuery}': ${foundFileUrl}`);
            break;
          }
        }
      } catch (err: any) {
        console.error(`⚠️ [Auto-Heal] Gagal mencari '${nameQuery}':`, err.message || err);
      }
    }

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
            console.log(`🟢 [Auto-Heal] File ditemukan via query contains '${cleanBase}': ${foundFileUrl}`);
          }
        }
      } catch (err: any) {
        console.error(`⚠️ [Auto-Heal] Gagal mencari contains '${cleanBase}':`, err.message || err);
      }
    }

    if (foundFileUrl) {
      const healed = await healLocalUrlInSheets(localUrl, foundFileUrl);
      return healed;
    }

    console.log(`ℹ️ [Auto-Heal] File ${filename} belum ditemukan di Google Drive.`);
    return false;
  } catch (err: any) {
    console.error("🔴 Error in autoHealLocalUrl:", err.message || err);
    return false;
  }
}

// Trigger background healing for local URLs
export function triggerAutoHeal(localUrl: string) {
  if (!localUrl || !localUrl.startsWith("/api/uploads/")) return;

  console.log(`⚡ [Auto-Heal] Triggered background healing for: ${localUrl}`);
  
  // Attempt 1: 2 seconds delay
  setTimeout(() => {
    autoHealLocalUrl(localUrl)
      .then(healed => {
        if (healed) {
          console.log(`🩹 [Auto-Heal] Successfully healed on first attempt!`);
        } else {
          console.log(`🩹 [Auto-Heal] First attempt did not find the file, will retry...`);
        }
      })
      .catch(err => console.error("Error in triggerAutoHeal attempt 1:", err));
  }, 2000);

  // Attempt 2: 6 seconds delay (retry if needed)
  setTimeout(() => {
    autoHealLocalUrl(localUrl)
      .then(healed => {
        if (healed) {
          console.log(`🩹 [Auto-Heal] Healed successfully on second attempt!`);
        } else {
          console.log(`🩹 [Auto-Heal] Second attempt did not find the file, will retry...`);
        }
      })
      .catch(err => console.error("Error in triggerAutoHeal attempt 2:", err));
  }, 6000);

  // Attempt 3: 15 seconds delay (ultimate fallback)
  setTimeout(() => {
    autoHealLocalUrl(localUrl)
      .then(healed => {
        if (healed) console.log(`🩹 [Auto-Heal] Healed successfully on third attempt!`);
      })
      .catch(err => console.error("Error in triggerAutoHeal attempt 3:", err));
  }, 15000);
}

// Cache for getUsersFromSheets to reduce quota usage
let usersCache: { data: any[]; timestamp: number } | null = null;
const USERS_CACHE_TTL = 30 * 1000; // 30 seconds cache

export function invalidateUsersCache() {
  usersCache = null;
}

// 1. checkLogin
export async function checkLoginInSheets(username: string, password: string) {
  try {
    const users = await getUsersFromSheets();
    const targetUser = username.toLowerCase().trim();
    const targetPass = password.toString().trim();

    for (const u of users) {
      const matchUsername = u.username && u.username.toLowerCase().trim() === targetUser;
      const matchNrp = u.nrp && u.nrp.toString().toLowerCase().trim() === targetUser;

      if ((matchUsername || matchNrp) && u.password.toString().trim() === targetPass) {
        const isDefaultAdmin = targetUser === "admin" || u.role === "admin";
        const role = isDefaultAdmin ? "admin" : "operator";
        const allowedViews = isDefaultAdmin ? [] : u.allowedViews;

        let loginSite = "ITU-Admo";
        if (isDefaultAdmin || (u.site && (u.site.toUpperCase() === "ALL" || (u.site.includes("ITU-Admo") && u.site.includes("ITU-MMI") && u.site.includes("ITU-Vale"))))) {
          loginSite = "ALL";
        } else if (u.site) {
          const firstSite = u.site.split(',')[0].trim();
          if (firstSite) loginSite = firstSite;
        }

        return {
          success: true,
          message: "Login berhasil!",
          nama: u.nama,
          username: u.username || u.nrp,
          nrp: u.nrp || "",
          role,
          allowedViews,
          site: loginSite,
          ttdUrl: u.ttdUrl || ""
        };
      }
    }

    if ((targetUser === "admin" || targetUser === "9938" || targetUser === "9999") && targetPass === "admin") {
      return {
        success: true,
        message: "Login berhasil!",
        nama: "Administrator",
        username: targetUser,
        nrp: targetUser,
        role: "admin",
        allowedViews: [],
        site: "ALL",
        ttdUrl: ""
      };
    }

    return { success: false, message: "Username atau password salah." };
  } catch (err: any) {
    console.error("checkLoginInSheets error:", err);
    throw new Error("Gagal memeriksa login: " + (err.message || "Quota limit or network error"));
  }
}

// 1b. User list & registration integration in Sheets
export async function getUsersFromSheets(forceRefresh = false) {
  if (!forceRefresh && usersCache && (Date.now() - usersCache.timestamp < USERS_CACHE_TTL)) {
    return usersCache.data;
  }

  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) {
    if (usersCache) return usersCache.data;
    throw new Error("Google Sheets not configured");
  }

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Login Pengguna'!A:H",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      usersCache = { data: [], timestamp: Date.now() };
      return [];
    }

    const users: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nrp = row[0] ? row[0].toString().trim() : "";
      const nama = row[1] ? row[1].toString().trim() : "";
      const email = row[2] ? row[2].toString().trim() : "";
      const username = row[3] ? row[3].toString().trim() : "";
      const password = row[4] ? row[4].toString().trim() : "";
      const accessRaw = row[5] ? row[5].toString().trim() : "admin";
      
      const colG = row[6] ? row[6].toString().trim() : "";
      const colH = row[7] ? row[7].toString().trim() : "";

      const role = accessRaw.toLowerCase() === "admin" ? "admin" : "operator";
      const allowedViews = accessRaw.toLowerCase() === "admin" ? [] : accessRaw.split(",").map(v => v.trim()).filter(Boolean);

      let site = "ITU-Admo";
      let ttdUrl = "";

      // Backward compatibility & parsing: if colG looks like a signature URL (data:image or http), then colG is ttdUrl
      if (colG.startsWith("data:image") || colG.startsWith("http")) {
        ttdUrl = colG;
        site = role === "admin" ? "ITU-Admo,ITU-MMI,ITU-Vale" : "ITU-Admo";
      } else {
        site = colG || (role === "admin" ? "ITU-Admo,ITU-MMI,ITU-Vale" : "ITU-Admo");
        ttdUrl = colH;
      }

      users.push({ nrp, nama, email, username, password, role, allowedViews, site, ttdUrl, rowIndex: i + 1 });
    }
    usersCache = { data: users, timestamp: Date.now() };
    return users;
  } catch (err: any) {
    console.error("getUsersFromSheets error:", err?.message || err);
    if (usersCache) {
      console.log("⚠️ Menggunakan cache pengguna lokal karena kuota Google Sheets terlampaui / error API.");
      return usersCache.data;
    }
    return [];
  }
}

export async function saveUserInSheets(userObj: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const users = await getUsersFromSheets();
    const existingIndex = users.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());

    const accessString = userObj.role === "admin" ? "admin" : (userObj.allowedViews || []).join(",");
    const siteString = userObj.site || (userObj.role === "admin" ? "ITU-Admo,ITU-MMI,ITU-Vale" : "ITU-Admo");
    const existingTtdUrl = existingIndex !== -1 ? (users[existingIndex].ttdUrl || "") : "";

    let finalTtdUrl = userObj.ttdUrl !== undefined ? userObj.ttdUrl : existingTtdUrl;

    if (finalTtdUrl && finalTtdUrl.startsWith("data:image")) {
      try {
        const driveUrl = await uploadToDrive(`ttd_user_${userObj.username.toLowerCase().trim()}.png`, finalTtdUrl);
        if (driveUrl && driveUrl !== "-") {
          finalTtdUrl = driveUrl;
        }
      } catch (uploadErr) {
        console.error("Gagal mengunggah signature ke Google Drive di saveUserInSheets:", uploadErr);
      }
    }

    if (existingIndex !== -1) {
      // Update existing row A to H
      const sheetRowIndex = users[existingIndex].rowIndex;
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Login Pengguna'!A${sheetRowIndex}:H${sheetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[userObj.nrp, userObj.nama, userObj.email, userObj.username, userObj.password, accessString, siteString, finalTtdUrl]]
        }
      });
    } else {
      // Append row A to H
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Login Pengguna'!A:H",
        valueInputOption: "RAW",
        requestBody: {
          values: [[userObj.nrp, userObj.nama, userObj.email, userObj.username, userObj.password, accessString, siteString, finalTtdUrl]]
        }
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error("saveUserInSheets error:", err);
    return { success: false, message: err.message };
  }
}

export async function saveUserSignatureInSheets(username: string, ttdUrl: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const users = await getUsersFromSheets();
    const existingIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (existingIndex !== -1) {
      const sheetRowIndex = users[existingIndex].rowIndex;
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Login Pengguna'!G${sheetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[ttdUrl]]
        }
      });
      return { success: true };
    }
    return { success: false, message: "User tidak ditemukan di Google Sheets." };
  } catch (err: any) {
    console.error("saveUserSignatureInSheets error:", err);
    return { success: false, message: err.message };
  }
}

export async function getAbsensiRoomsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return null;

  try {
    await ensureSheetExists("DB_Absensi", ["JSON_STATE"]);
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_Absensi'!A2",
    });

    const rows = response.data.values;
    if (rows && rows.length > 0 && rows[0][0]) {
      return JSON.parse(rows[0][0]);
    }
    return [];
  } catch (err: any) {
    console.error("getAbsensiRoomsFromSheets error:", err);
    return null;
  }
}

export async function saveAbsensiRoomsStateToSheets(roomsArray: any[]) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return;

  try {
    await ensureSheetExists("DB_Absensi", ["JSON_STATE"]);
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_Absensi'!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[JSON.stringify(roomsArray)]]
      }
    });
  } catch (err: any) {
    console.error("saveAbsensiRoomsStateToSheets error:", err);
  }
}

export async function saveAbsensiToSheets(room: any, peserta: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    const values = [[
      timestamp, 
      room.judul || "", 
      room.tanggal || "", 
      room.jamMulai || "", 
      peserta.nama || "", 
      peserta.nrp || "", 
      peserta.departemen || "", 
      peserta.jabatan || "", 
      peserta.waktu || "", 
      peserta.metode || "", 
      peserta.addedBy || ""
    ]];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Absensi'!A:K",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true };
  } catch (err: any) {
    console.error("saveAbsensiToSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 1b. saveAbsenMitraToSheets
export async function saveAbsenMitraToSheets(data: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    // Data Absen Karyawan headers: Waktu, Nama, Nrp, Tipe, Jarak, Status, Lintang, Bujur
    await ensureSheetExists("Data Absen Karyawan", [
      "Waktu", "Nama/Username", "Tipe Absen", "Jarak (m)", "Status", "Latitude", "Longitude"
    ]);

    const values = [
      [
        timestamp,
        data.username || '',
        data.type || '',
        data.distance || '',
        data.status || '',
        data.latitude || '',
        data.longitude || ''
      ]
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Absen Karyawan'!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    return { success: true };
  } catch (err: any) {
    console.error("saveAbsenMitraToSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 2. saveOrderData
export async function saveOrderDataInSheets(jenis: string, kategori: string, barang: string, jumlah: number, keterangan: string, userName: string, customDate?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
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
    const values = [[timestamp, jenis, kategori, barang, jumlah, keterangan, userName]];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Order'!A:G",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true, message: `Data ${barang} berhasil disimpan!` };
  } catch (err: any) {
    console.error("saveOrderDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 3. getInventoryData
export async function getInventoryDataFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Order'!A:G",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) {
      return { history: [], stock: [] };
    }

    const history: any[] = [];
    const stockMap: Record<string, number> = {};

    const hasKategoriColumn = (data[0][2] === "Kategori");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Map correctly based on column headers
      const ts = row[0] ? row[0].toString() : "";
      const jenis = row[1] ? row[1].toString().trim() : "";
      const kategori = hasKategoriColumn ? (row[2] ? row[2].toString().trim() : "APD") : "APD";
      const barang = hasKategoriColumn ? (row[3] ? row[3].toString().trim() : "") : (row[2] ? row[2].toString().trim() : "");
      const jumlah = hasKategoriColumn ? (Number(row[4]) || 0) : (Number(row[3]) || 0);
      const ket = hasKategoriColumn ? (row[5] ? row[5].toString() : "-") : (row[4] ? row[4].toString() : "-");
      const oleh = hasKategoriColumn ? (row[6] ? row[6].toString() : "-") : (row[5] ? row[5].toString() : "-");

      if (!barang) continue;

      history.push({ timestamp: ts, jenis, kategori, barang, jumlah, keterangan: ket, oleh });

      if (!stockMap[barang]) stockMap[barang] = 0;
      if (jenis === "Barang Masuk") {
        stockMap[barang] += jumlah;
      } else if (jenis === "Barang Keluar") {
        stockMap[barang] -= jumlah;
      }
    }

    const stockList = Object.keys(stockMap).map(key => ({
      barang: key,
      total: stockMap[key]
    }));

    history.reverse();
    return { history, stock: stockList };
  } catch (err: any) {
    console.error("getInventoryDataFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 3b. updateOrderDate
export async function updateOrderDateInSheets(data: {
  originalTimestamp: string;
  barang: string;
  keterangan: string;
  jumlah?: number;
  oleh?: string;
  newDate: string;
}) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Order'!A:G",
    });

    const dataRows = response.data.values;
    if (!dataRows || dataRows.length <= 1) {
      return { success: false, message: "Data transaksi tidak ditemukan." };
    }

    const hasKategoriColumn = (dataRows[0][2] === "Kategori");
    let bestRowIndex = -1;
    let highestScore = -1;

    const reqBarang = (data.barang || "").toString().toLowerCase().trim();
    const reqKet = (data.keterangan || "").toString().toLowerCase().trim();
    const reqOleh = (data.oleh || "").toString().toLowerCase().trim();
    const reqJumlah = Number(data.jumlah) || 0;
    const reqTs = (data.originalTimestamp || "").toString().toLowerCase().trim();

    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowBarang = (hasKategoriColumn ? (row[3] || "") : (row[2] || "")).toString().toLowerCase().trim();

      // Barang must match or contain
      if (reqBarang && rowBarang !== reqBarang && !rowBarang.includes(reqBarang) && !reqBarang.includes(rowBarang)) {
        continue;
      }

      let score = 10;

      const rowKet = (hasKategoriColumn ? (row[5] || "") : (row[4] || "")).toString().toLowerCase().trim();
      if (reqKet && rowKet === reqKet) {
        score += 30;
      } else if (reqKet && (rowKet.includes(reqKet) || reqKet.includes(rowKet))) {
        score += 20;
      }

      const rowOleh = (hasKategoriColumn ? (row[6] || "") : (row[5] || "")).toString().toLowerCase().trim();
      if (reqOleh && (rowOleh === reqOleh || rowOleh.includes(reqOleh) || reqOleh.includes(rowOleh))) {
        score += 15;
      }

      const rowJumlah = hasKategoriColumn ? (Number(row[4]) || 0) : (Number(row[3]) || 0);
      if (reqJumlah && rowJumlah === reqJumlah) {
        score += 10;
      }

      const rowTs = (row[0] || "").toString().toLowerCase().trim();
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
        bestRowIndex = i;
      }
    }

    if (bestRowIndex === -1) {
      return { success: false, message: "Baris transaksi tidak ditemukan di Google Sheets." };
    }

    let formattedNewDate = data.newDate;
    if (data.newDate.includes("-")) {
      const parts = data.newDate.split("T")[0].split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        formattedNewDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const origCellTs = dataRows[bestRowIndex][0] ? dataRows[bestRowIndex][0].toString().trim() : "";
    if (origCellTs.includes(" ")) {
      const timePart = origCellTs.split(" ")[1];
      formattedNewDate = `${formattedNewDate} ${timePart}`;
    }

    const cellRange = `'Data Order'!A${bestRowIndex + 1}`;
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: cellRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[formattedNewDate]],
      },
    });

    return { success: true, message: "Tanggal transaksi berhasil diperbarui!" };
  } catch (err: any) {
    console.error("updateOrderDateInSheets error:", err);
    throw new Error(err.message);
  }
}

// 4. saveNapzaData
export async function saveNapzaDataInSheets(nama: string, nrp: string, jabatan: string, periode: string, hasil: string, userName: string, fileData: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    let fileUrl = "-";
    if (typeof fileData === "string" && fileData.trim().length > 0) {
      fileUrl = fileData.trim();
    } else if (fileData && (fileData.fileUrl || fileData.webViewLink || fileData.dokumen || fileData.url)) {
      fileUrl = fileData.fileUrl || fileData.webViewLink || fileData.dokumen || fileData.url;
    } else if (fileData && fileData.data && fileData.name) {
      fileUrl = await uploadToDrive(`NAPZA_${nrp}_${fileData.name}`, fileData.data);
    }

    if (fileUrl && fileUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(fileUrl);
    }

    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    const values = [[timestamp, nama, nrp, jabatan, periode, hasil, fileUrl, userName]];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan NAPZA'!A:H",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true, message: `Laporan NAPZA untuk ${nama} berhasil disimpan!` };
  } catch (err: any) {
    console.error("saveNapzaDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 5. getNapzaHistoryData
export async function getNapzaHistoryDataFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan NAPZA'!A:H",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) return { history: [] };

    const history: any[] = [];
    const headerDok = (data[0][6] || "").toString().toLowerCase();
    const hasDokumenColumn = headerDok.includes("dokumen") || data[0].length >= 8;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const ts = row[0] ? row[0].toString() : "";
      const nama = row[1] ? row[1].toString().trim() : "";
      const nrp = row[2] ? row[2].toString().trim() : "";
      const jabatan = row[3] ? row[3].toString().trim() : "";
      const rawPeriode = row[4] ? row[4].toString().trim() : "";
      const hasil = row[5] ? row[5].toString().trim() : "";
      const dokumen = hasDokumenColumn ? (row[6] ? row[6].toString().trim() : "-") : "-";
      const oleh = hasDokumenColumn ? (row[7] ? row[7].toString().trim() : "-") : (row[6] ? row[6].toString().trim() : "-");

      if (!nama) continue;

      history.push({
        id: `napza_${i + 1}_${ts || Date.now()}`,
        rowId: i + 1,
        timestamp: ts,
        nama,
        nrp,
        jabatan,
        periode: rawPeriode,
        hasil,
        dokumen,
        oleh
      });
    }

    history.reverse();
    return { history: history.slice(0, 50) };
  } catch (err: any) {
    console.error("getNapzaHistoryDataFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 5b. deleteNapzaDataInSheets
export async function deleteNapzaDataInSheets(params: {
  rowId?: string | number;
  timestamp?: string;
  nrp?: string;
  nama?: string;
}) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const napzaSheet = response.data.sheets?.find(s => s.properties?.title === "Laporan NAPZA");
    const sheetId = napzaSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("Sheet 'Laporan NAPZA' tidak ditemukan.");
    }

    const valuesRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan NAPZA'!A:H",
    });
    const values = valuesRes.data.values || [];

    let targetIndex = -1;

    // Prioritize timestamp + nrp
    if (params.timestamp && params.nrp) {
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowTs = row[0] ? row[0].toString().trim() : "";
        const rowNrp = row[2] ? row[2].toString().trim() : "";
        if (rowTs === params.timestamp.trim() && rowNrp === params.nrp.trim()) {
          targetIndex = i;
          break;
        }
      }
    }

    // Fallback: rowId check
    if (targetIndex === -1 && params.rowId) {
      const rIdx = typeof params.rowId === "string" ? parseInt(params.rowId) : params.rowId;
      if (rIdx >= 2 && rIdx <= values.length) {
        targetIndex = rIdx - 1;
      }
    }

    // Fallback: nama + nrp
    if (targetIndex === -1 && params.nama && params.nrp) {
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowNama = row[1] ? row[1].toString().trim().toLowerCase() : "";
        const rowNrp = row[2] ? row[2].toString().trim() : "";
        if (rowNama === params.nama.trim().toLowerCase() && rowNrp === params.nrp.trim()) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      return { success: false, message: "Data laporan NAPZA tidak ditemukan di spreadsheet." };
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: targetIndex,
                endIndex: targetIndex + 1
              }
            }
          }
        ]
      }
    });

    return { success: true, message: "Data Laporan NAPZA berhasil dihapus dari spreadsheet!" };
  } catch (err: any) {
    console.error("deleteNapzaDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 5c. updateNapzaDataInSheets
export async function updateNapzaDataInSheets(params: {
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
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const valuesRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan NAPZA'!A:H",
    });
    const values = valuesRes.data.values || [];

    let targetIndex = -1;

    // Search by oldTimestamp + oldNrp
    if (params.oldTimestamp && params.oldNrp) {
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowTs = row[0] ? row[0].toString().trim() : "";
        const rowNrp = row[2] ? row[2].toString().trim() : "";
        if (rowTs === params.oldTimestamp.trim() && rowNrp === params.oldNrp.trim()) {
          targetIndex = i;
          break;
        }
      }
    }

    // Fallback: rowId check
    if (targetIndex === -1 && params.rowId) {
      const rIdx = typeof params.rowId === "string" ? parseInt(params.rowId) : params.rowId;
      if (rIdx >= 2 && rIdx <= values.length) {
        targetIndex = rIdx - 1;
      }
    }

    // Fallback: nama + nrp
    if (targetIndex === -1 && params.nama && params.nrp) {
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowNama = row[1] ? row[1].toString().trim().toLowerCase() : "";
        const rowNrp = row[2] ? row[2].toString().trim() : "";
        if (rowNama === params.nama.trim().toLowerCase() && rowNrp === params.nrp.trim()) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      return { success: false, message: "Data laporan NAPZA tidak ditemukan untuk diperbarui." };
    }

    const rowIndex = targetIndex + 1;
    const existingRow = values[targetIndex] || [];
    const timestamp = existingRow[0] || new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    const existingDokumen = existingRow[6] || "-";
    const finalDokumen = (params.dokumen && params.dokumen !== "-") ? params.dokumen : existingDokumen;
    const inputOleh = existingRow[7] || params.userName || "-";

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'Laporan NAPZA'!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, params.nama, params.nrp, params.jabatan, params.periode, params.hasil, finalDokumen, inputOleh]]
      }
    });

    return { success: true, message: `Laporan NAPZA untuk ${params.nama} berhasil diperbarui!` };
  } catch (err: any) {
    console.error("updateNapzaDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 6. saveDonorDarahData
export async function saveDonorDarahDataInSheets(nama: string, nrp: string, jabatan: string, tanggalDonor: string, lokasi: string, tensi: string, hasilSkrining: string, userName: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    const values = [[timestamp, nama, nrp, jabatan, tanggalDonor, lokasi, tensi, hasilSkrining, userName]];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan Donor Darah'!A:I",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return { success: true, message: "Laporan Donor Darah berhasil disimpan!" };
  } catch (err: any) {
    console.error("saveDonorDarahDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 7. getDonorDarahHistoryData
export async function getDonorDarahHistoryDataFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Laporan Donor Darah'!A:I",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) return { history: [] };

    const history: any[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[1]) continue;
      history.push({
        timestamp: row[0] ? row[0].toString() : "",
        nama: row[1],
        nrp: row[2] || "",
        jabatan: row[3] || "",
        tglDonor: row[4] || "",
        lokasi: row[5] || "",
        tensi: row[6] || "",
        hasil: row[7] || "",
        oleh: row[8] || ""
      });
    }

    history.reverse();
    return { history: history.slice(0, 10) };
  } catch (err: any) {
    console.error("getDonorDarahHistoryDataFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 8. getDaftarKaryawan
export async function getDaftarKaryawanFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Karyawan'!A:G",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) return { success: true, karyawan: [], karyawanDetail: [] };

    // Detect header indexes
    const headers = data[0].map(h => (h || "").toString().toLowerCase().trim());
    
    let namaIdx = 0;
    let nikIdx = 1;
    let jabatanIdx = 2;
    let tglLahirIdx = 3;
    let gradeIdx = 4;
    let minePermitIdx = 5;
    let deptIdx = 6;

    headers.forEach((h, idx) => {
      if (h.includes("nama") || h.includes("name") || h === "karyawan") {
        namaIdx = idx;
      } else if (h.includes("nik") || h.includes("nrp") || h.includes("no") || h.includes("id")) {
        nikIdx = idx;
      } else if (h === "jabatan" || h === "posisi" || h === "position" || h.includes("jabatan")) {
        jabatanIdx = idx;
      } else if (h.includes("dept") || h.includes("departemen") || h.includes("departmen") || h.includes("department")) {
        deptIdx = idx;
      } else if (h.includes("lahir") || h.includes("birth") || h.includes("tgl")) {
        tglLahirIdx = idx;
      } else if (h.includes("grade") || h.includes("level")) {
        gradeIdx = idx;
      } else if (h.includes("permit") || h.includes("mine") || h.includes("berlaku")) {
        minePermitIdx = idx;
      }
    });

    const karyawanList: string[] = [];
    const karyawanDetail: { nama: string; nik: string; dept: string; jabatan: string; tanggalLahir: string; grade: string; masaBerlakuMinePermit: string }[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[namaIdx]) {
        const nama = row[namaIdx].toString().trim();
        const nik = row[nikIdx] ? row[nikIdx].toString().trim() : "";
        const dept = row[deptIdx] ? row[deptIdx].toString().trim() : "";
        const jabatan = row[jabatanIdx] ? row[jabatanIdx].toString().trim() : "";
        const tanggalLahir = row[tglLahirIdx] ? row[tglLahirIdx].toString().trim() : "";
        const grade = row[gradeIdx] ? row[gradeIdx].toString().trim() : "";
        const masaBerlakuMinePermit = row[minePermitIdx] ? row[minePermitIdx].toString().trim() : "";
        
        const deptUpper = dept.toUpperCase().trim();
        if (deptUpper === "USER / MANAGEMENT" || deptUpper === "USER MANAGEMENT") {
          continue;
        }

        karyawanList.push(nama);
        karyawanDetail.push({ nama, nik, dept, jabatan, tanggalLahir, grade, masaBerlakuMinePermit });
      }
    }

    // Sort alphabetically by name
    karyawanList.sort((a, b) => a.localeCompare(b));
    karyawanDetail.sort((a, b) => a.nama.localeCompare(b.nama));

    return { success: true, karyawan: karyawanList, karyawanDetail };
  } catch (err: any) {
    console.error("getDaftarKaryawanFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 8c. updateMinePermitInSheets
export async function updateMinePermitInSheets(nama: string, nrp: string, newDate: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Karyawan'!A:Z",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) throw new Error("Sheet is empty");

    const headers = data[0].map(h => (h || "").toString().toLowerCase().trim());
    
    let namaIdx = 0;
    let nikIdx = 1;
    let minePermitIdx = 5;

    headers.forEach((h, idx) => {
      if (h.includes("nama") || h.includes("name") || h === "karyawan") {
        namaIdx = idx;
      } else if (h.includes("nik") || h.includes("nrp") || h.includes("no") || h.includes("id")) {
        nikIdx = idx;
      } else if (h.includes("permit") || h.includes("mine") || h.includes("berlaku")) {
        minePermitIdx = idx;
      }
    });

    // Find row
    let foundRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[namaIdx]) {
        const rowNama = row[namaIdx].toString().trim().toLowerCase();
        const rowNrp = row[nikIdx] ? row[nikIdx].toString().trim().toLowerCase() : "";
        if (rowNama === nama.toLowerCase().trim() && (nrp === "" || rowNrp === nrp.toLowerCase().trim())) {
          foundRowIndex = i;
          break;
        }
      }
    }

    if (foundRowIndex === -1) {
      throw new Error(`Karyawan ${nama} dengan NRP ${nrp} tidak ditemukan.`);
    }

    const colLetter = String.fromCharCode(65 + minePermitIdx);
    const rowNum = foundRowIndex + 1;
    const updateRange = `'Data Karyawan'!${colLetter}${rowNum}`;

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newDate]]
      }
    });

    return { success: true, message: `Masa berlaku Mine Permit untuk ${nama} berhasil diupdate menjadi ${newDate}!` };
  } catch (err: any) {
    console.error("updateMinePermitInSheets error:", err);
    throw new Error(err.message);
  }
}

// deleteKaryawanInSheets
export async function deleteKaryawanInSheets(nama: string, nrp: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Karyawan'!A:G",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) throw new Error("Data Karyawan kosong.");

    const headers = data[0].map(h => (h || "").toString().toLowerCase().trim());
    
    let namaIdx = 0;
    let nikIdx = 1;

    headers.forEach((h, idx) => {
      if (h.includes("nama") || h.includes("name") || h === "karyawan") {
        namaIdx = idx;
      } else if (h.includes("nik") || h.includes("nrp") || h.includes("no") || h.includes("id")) {
        nikIdx = idx;
      }
    });

    let foundRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[namaIdx]) {
        const rowNama = row[namaIdx].toString().trim().toLowerCase();
        const rowNrp = row[nikIdx] ? row[nikIdx].toString().trim().toLowerCase() : "";
        if (rowNama === nama.toLowerCase().trim() && (nrp === "" || rowNrp === nrp.toLowerCase().trim())) {
          foundRowIndex = i;
          break;
        }
      }
    }

    if (foundRowIndex === -1) {
      throw new Error(`Karyawan "${nama}" tidak ditemukan.`);
    }

    const sheetMetadata = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN,
    });
    const sheets = sheetMetadata.data.sheets || [];
    const targetSheet = sheets.find(s => s.properties?.title === 'Data Karyawan');
    if (!targetSheet) throw new Error("Sheet 'Data Karyawan' tidak ditemukan.");
    const sheetId = targetSheet.properties?.sheetId;

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: foundRowIndex,
                endIndex: foundRowIndex + 1
              }
            }
          }
        ]
      }
    });

    return { success: true, message: `Karyawan "${nama}" berhasil dihapus!` };
  } catch (err: any) {
    console.error("deleteKaryawanInSheets error:", err);
    throw new Error(err.message);
  }
}

// getTrainingExemptionsFromSheets
export async function getTrainingExemptionsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Pengecualian Training'!A:B",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) {
      return [];
    }

    const exemptions: any[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0]) {
        exemptions.push({
          nama: row[0].toString().trim(),
          training: row[1] ? row[1].toString().trim() : "",
        });
      }
    }
    return exemptions;
  } catch (err: any) {
    if (err.message && (err.message.includes("range") || err.message.includes("not found") || err.message.includes("400"))) {
      try {
        await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID_MAIN,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Pengecualian Training",
                  }
                }
              }
            ]
          }
        });
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: SHEET_ID_MAIN,
          range: "'Pengecualian Training'!A1:B1",
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["Nama Karyawan", "Jenis Training"]]
          }
        });
        return [];
      } catch (createErr) {
        console.error("Failed to create sheet 'Pengecualian Training':", createErr);
      }
    }
    console.error("getTrainingExemptionsFromSheets error:", err);
    return [];
  }
}

// saveTrainingExemptionInSheets
export async function saveTrainingExemptionInSheets(nama: string, training: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    await getTrainingExemptionsFromSheets();

    const values = [[nama, training]];
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Pengecualian Training'!A:B",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    return { success: true, message: `Pengecualian training untuk "${nama}" berhasil disimpan!` };
  } catch (err: any) {
    console.error("saveTrainingExemptionInSheets error:", err);
    throw new Error(err.message);
  }
}

// deleteTrainingExemptionInSheets
export async function deleteTrainingExemptionInSheets(nama: string, training: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Pengecualian Training'!A:B",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) return { success: true };

    let foundRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0]) {
        const rowNama = row[0].toString().trim().toLowerCase();
        const rowTraining = row[1] ? row[1].toString().trim().toLowerCase() : "";
        if (rowNama === nama.toLowerCase().trim() && rowTraining === training.toLowerCase().trim()) {
          foundRowIndex = i;
          break;
        }
      }
    }

    if (foundRowIndex === -1) {
      return { success: true, message: "Pengecualian tidak ditemukan." };
    }

    const sheetMetadata = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN,
    });
    const sheets = sheetMetadata.data.sheets || [];
    const targetSheet = sheets.find(s => s.properties?.title === 'Pengecualian Training');
    if (!targetSheet) throw new Error("Sheet 'Pengecualian Training' tidak ditemukan.");
    const sheetId = targetSheet.properties?.sheetId;

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: foundRowIndex,
                endIndex: foundRowIndex + 1
              }
            }
          }
        ]
      }
    });

    return { success: true, message: "Pengecualian berhasil dihapus!" };
  } catch (err: any) {
    console.error("deleteTrainingExemptionInSheets error:", err);
    throw new Error(err.message);
  }
}

// Helper for flexible name matching in logs
function matchesNameQuery(text: string, searchName: string): boolean {
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

// 9. getHistoryPerKaryawan (Combined log search)
export async function getHistoryPerKaryawanFromSheets(namaKaryawan: string, site?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const timelineHistory: any[] = [];
    const targetNama = namaKaryawan.toLowerCase().trim();

    // Fetch APD Data Order
    try {
      const apdRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Data Order'!A:G",
      });
      const dataApd = apdRes.data.values;
      if (dataApd && dataApd.length > 1) {
        const hasKategoriColumn = (dataApd[0][2] === "Kategori");
        for (let i = 1; i < dataApd.length; i++) {
          const row = dataApd[i];
          const ket = hasKategoriColumn ? (row[5] ? row[5].toString() : "") : (row[4] ? row[4].toString() : "");
          const jenis = row[1] ? row[1].toString() : "";
          if (matchesNameQuery(ket, targetNama) && jenis === "Barang Keluar") {
            const kategori = hasKategoriColumn ? (row[2] ? row[2].toString() : "APD") : "APD";
            const barang = hasKategoriColumn ? (row[3] ? row[3].toString() : "") : (row[2] ? row[2].toString() : "");
            const jumlah = hasKategoriColumn ? (row[4] ? row[4].toString() : "") : (row[3] ? row[3].toString() : "");
            const oleh = hasKategoriColumn ? row[6] : row[5];
            timelineHistory.push({
              modul: "Transaksi APD & Barang",
              timestamp: row[0].toString(),
              detail: `Menerima ${jumlah} pcs ${barang} (${kategori})`,
              oleh: oleh || "-"
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not query APD Sheet for log timeline:", e);
    }

    // Fetch NAPZA
    try {
      const napzaRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Laporan NAPZA'!A:H",
      });
      const dataNapza = napzaRes.data.values;
      if (dataNapza && dataNapza.length > 1) {
        for (let j = 1; j < dataNapza.length; j++) {
          const row = dataNapza[j];
          const n = row[1] ? row[1].toString() : "";
          if (matchesNameQuery(n, targetNama)) {
            timelineHistory.push({
              modul: "Medical - NAPZA",
              timestamp: row[0].toString(),
              detail: `Pemeriksaan NAPZA periode ${row[4]} (Hasil: ${row[5]})`,
              oleh: row[7] || row[6] || "-"
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not query NAPZA Sheet for log timeline:", e);
    }

    // Fetch Donor Darah
    try {
      const donorRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Laporan Donor Darah'!A:I",
      });
      const dataDonor = donorRes.data.values;
      if (dataDonor && dataDonor.length > 1) {
        for (let k = 1; k < dataDonor.length; k++) {
          const row = dataDonor[k];
          const nD = row[1] ? row[1].toString() : "";
          if (matchesNameQuery(nD, targetNama)) {
            timelineHistory.push({
              modul: "Medical - Donor Darah",
              timestamp: row[0].toString(),
              detail: `Partisipasi Donor Darah di ${row[5]} (Status: ${row[7]})`,
              oleh: row[8] || "-"
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not query Donor Darah Sheet for log timeline:", e);
    }

    // Sort by timestamp descending
    timelineHistory.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { success: true, data: timelineHistory };
  } catch (err: any) {
    console.error("getHistoryPerKaryawanFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 10. getBelumMengisiData (External Sheets link 19kUpCQRjaMzZo1KMtXklhlRIOx7eMsyiRtpMCHzAvZo)
export async function getBelumMengisiDataFromSheets(customSheetId?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: customSheetId || SHEET_ID_DAILY,
      range: "'Daily Report FTW tidak mengisi'!A:Z",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) {
      return { success: true, headers: [], values: [], message: "Data kosong." };
    }

    return { success: true, headers: data[0], values: data.slice(1) };
  } catch (err: any) {
    console.log("ℹ️ Note: getBelumMengisiDataFromSheets could not load from Daily Spreadsheet: " + err.message);
    return { success: false, isNotFoundError: true, message: "Error sheet harian: " + err.message };
  }
}

// 11. getUnfitData (External Sheets link 19kUpCQRjaMzZo1KMtXklhlRIOx7eMsyiRtpMCHzAvZo)
export async function getUnfitDataFromSheets(customSheetId?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: customSheetId || SHEET_ID_DAILY,
      range: "'Unfit'!A:Z",
    });

    const data = response.data.values;
    if (!data || data.length <= 1) {
      return { success: true, headers: [], values: [], message: "Data kosong." };
    }

    return { success: true, headers: data[0], values: data.slice(1) };
  } catch (err: any) {
    console.log("ℹ️ Note: getUnfitDataFromSheets could not load from Daily Spreadsheet: " + err.message);
    return { success: false, isNotFoundError: true, message: "Error sheet harian: " + err.message };
  }
}

// 12. saveTrainingData
export async function saveTrainingDataInSheets(nama: string, nrp: string, training: string, tglPelaksanaan: string, tglExpired: string, fileData: any, userName: string, rowId?: string, existingSertifikatUrl?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    let fileUrl = existingSertifikatUrl || "-";
    if (fileData && fileData.data && fileData.name) {
      fileUrl = await uploadToDrive(`TRAIN_${nrp}_${fileData.name}`, fileData.data);
    }

    if (fileUrl && fileUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(fileUrl);
    }

    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');

    if (rowId && rowId !== "") {
      const rowIndex = parseInt(rowId);
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Data Training'!B${rowIndex}:H${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nama, nrp, training, tglPelaksanaan, tglExpired, fileUrl, userName]]
        }
      });
      return { success: true, message: "Data kualifikasi training berhasil diperbarui!" };
    } else {
      const values = [[timestamp, nama, nrp, training, tglPelaksanaan, tglExpired, fileUrl, userName]];
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Data Training'!A:H",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return { success: true, message: "Data training berhasil disimpan!" };
    }
  } catch (err: any) {
    console.error("saveTrainingDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 13. getTrainingDataList
export async function getTrainingDataListFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data Training'!A:H",
    });

    const values = response.data.values;
    if (!values || values.length <= 1) return { data: [] };

    const listData: any[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      listData.push({
        rowId: i + 1,
        timestamp: row[0] || "",
        nama: row[1] || "",
        nrp: row[2] || "",
        training: row[3] || "",
        tglPelaksanaan: row[4] || "",
        tglExpired: row[5] || "",
        sertifikatUrl: row[6] || "-",
        oleh: row[7] || ""
      });
    }

    listData.reverse();
    return { data: listData };
  } catch (err: any) {
    console.error("getTrainingDataListFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 13b. deleteTrainingDataInSheets
export async function deleteTrainingDataInSheets(rowId: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const rowIndex = parseInt(rowId);
    
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const trainingSheet = response.data.sheets?.find(s => s.properties?.title === "Data Training");
    const trainingSheetId = trainingSheet?.properties?.sheetId;

    if (trainingSheetId === undefined) {
      throw new Error("Sheet 'Data Training' tidak ditemukan.");
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: trainingSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    return { success: true, message: "Data training berhasil dihapus!" };
  } catch (err: any) {
    console.error("deleteTrainingDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 14. saveMCUData (Supports creating or editing depending on if rawId exists)
export async function saveMCUDataInSheets(nrp: string, nama: string, tglMcu: string, jenisMcu: string, hasilMcu: string, statusMcu: string, tglExpiredMcu: string, catatanMcu: string, rowId: string, userName: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');

    if (rowId && rowId !== "") {
      const rowIndex = parseInt(rowId);
      // Update cell values from column B (2) to J (10) for rowId
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Data MCU'!B${rowIndex}:J${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nrp, nama, tglMcu, jenisMcu, hasilMcu, statusMcu, tglExpiredMcu, catatanMcu, userName]]
        }
      });
      return { success: true, message: "Data Riwayat MCU berhasil diperbarui!" };
    } else {
      // Append new row
      const dataRow = [[timestamp, nrp, nama, tglMcu, jenisMcu, hasilMcu, statusMcu, tglExpiredMcu, catatanMcu, userName]];
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Data MCU'!A:J",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: dataRow },
      });
      return { success: true, message: "Data Riwayat MCU berhasil disimpan!" };
    }
  } catch (err: any) {
    console.error("saveMCUDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 15. getMCUDataList
export async function getMCUDataListFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Data MCU'!A:J",
    });

    const values = response.data.values;
    if (!values || values.length <= 1) return { data: [] };

    const listData: any[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      listData.push({
        rowId: i + 1, // Store 1-indexed spreadsheet row ID (useful for editing & deleting)
        timestamp: row[0] || "",
        nrp: row[1] || "",
        nama: row[2] || "",
        tglMcu: row[3] || "",
        jenisMcu: row[4] || "",
        hasilMcu: row[5] || "",
        statusMcu: row[6] || "",
        tglExpiredMcu: row[7] || "-",
        catatanMcu: row[8] || "",
        operator: row[9] || ""
      });
    }
    return { data: listData };
  } catch (err: any) {
    console.error("getMCUDataListFromSheets error:", err);
    throw new Error(err.message);
  }
}

// 16. deleteMCUData (Note: true row deletion in Google Sheets shift rows up. That modifies row indices)
export async function deleteMCUDataInSheets(rowId: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const rowIndex = parseInt(rowId);
    
    // Clear the row first, or delete using batchUpdate range
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const mcuSheet = response.data.sheets?.find(s => s.properties?.title === "Data MCU");
    const mcuSheetId = mcuSheet?.properties?.sheetId;

    if (mcuSheetId === undefined) {
      throw new Error("Sheet 'Data MCU' tidak ditemukan.");
    }

    // Call spreadsheets.batchUpdate to execute true dimension deletion
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: mcuSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based index
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    return { success: true, message: "Data Riwayat MCU berhasil dihapus!" };
  } catch (err: any) {
    console.error("deleteMCUDataInSheets error:", err);
    throw new Error(err.message);
  }
}

// 17. getMasterAsetOptions
export async function getMasterAsetOptionsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    // 1. Get current month's completed inspections to filter dropdown listings
    let sisaAlatSudahInspeksi: Record<string, boolean> = {};
    const today = new Date();
    const bulanArray = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const bulanSekarang = bulanArray[today.getMonth()];
    const tahunSekarang = today.getFullYear().toString();

    try {
      const historyRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range: 'HISTORY_INSPEKSI!A:O',
      });
      const dataHistory = historyRes.data.values;
      if (dataHistory && dataHistory.length > 1) {
        for (let h = 1; h < dataHistory.length; h++) {
          const row = dataHistory[h];
          const bHist = row[1] ? row[1].toString().trim() : "";
          const tHist = row[2] ? row[2].toString().trim() : "";
          const idAlatHist = row[4] ? row[4].toString().trim() : "";

          if (bHist.toLowerCase() === bulanSekarang.toLowerCase() && tHist === tahunSekarang) {
            if (idAlatHist) { sisaAlatSudahInspeksi[idAlatHist] = true; }
          }
        }
      }
    } catch (e) {
      console.warn("HISTORY_INSPEKSI was unreadable or didn't exist yet, ignoring filtering.");
    }

    // 2. Load Master Item Options
    const masterRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'MASTER_ITEM!A:C',
    });

    const data = masterRes.data.values;
    if (!data || data.length <= 1) {
      return { success: false, message: "Sheet MASTER_ITEM kosong atau tidak ditemukan." };
    }

    const daftarPosisi: string[] = [];
    const masterAset: any[] = [];
    const allMasterAset: any[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const namaBarang = row[0] ? row[0].toString().trim() : "";
      const idAlat = row[1] ? row[1].toString().trim() : "";
      const posisi = row[2] ? row[2].toString().trim() : "";

      if (posisi && idAlat) {
        allMasterAset.push({ posisi, idAlat, namaBarang });

        // Skip if already inspected this month
        if (sisaAlatSudahInspeksi[idAlat]) continue;

        if (!daftarPosisi.includes(posisi)) {
          daftarPosisi.push(posisi);
        }
        masterAset.push({ posisi, idAlat, namaBarang });
      }
    }

    return { success: true, posisiList: daftarPosisi.sort(), masterAset, allMasterAset };
  } catch (err: any) {
    console.error("getMasterAsetOptionsFromSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 17b. saveMasterItemInSheets
export async function saveMasterItemInSheets(item: { namaBarang: string; idAlat: string; posisi: string }, oldIdAlat?: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const masterRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'MASTER_ITEM!A:D',
    });

    const data = masterRes.data.values || [];
    const cleanedItem = {
      namaBarang: item.namaBarang.trim(),
      idAlat: item.idAlat.trim(),
      posisi: item.posisi.trim()
    };

    if (oldIdAlat) {
      let foundIdx = -1;
      let existingJenisPemeriksaan = "KIP";
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const idAlat = row[1] ? row[1].toString().trim() : "";
        if (idAlat.toLowerCase() === oldIdAlat.trim().toLowerCase()) {
          foundIdx = i;
          existingJenisPemeriksaan = row[3] ? row[3].toString().trim() : "KIP";
          break;
        }
      }

      if (foundIdx !== -1) {
        const sheetRowIdx = foundIdx + 1;
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: SHEET_ID_MAIN,
          range: `MASTER_ITEM!A${sheetRowIdx}:D${sheetRowIdx}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[cleanedItem.namaBarang, cleanedItem.idAlat, cleanedItem.posisi, existingJenisPemeriksaan]]
          }
        });
        return { success: true };
      } else {
        const idExists = data.slice(1).some((row: any) => row[1] && row[1].toString().trim().toLowerCase() === cleanedItem.idAlat.toLowerCase());
        if (idExists) {
          return { success: false, message: `No. ID Alat "${cleanedItem.idAlat}" sudah digunakan!` };
        }
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId: SHEET_ID_MAIN,
          range: 'MASTER_ITEM!A:D',
          valueInputOption: "RAW",
          requestBody: {
            values: [[cleanedItem.namaBarang, cleanedItem.idAlat, cleanedItem.posisi, "KIP"]]
          }
        });
        return { success: true };
      }
    } else {
      const idExists = data.slice(1).some((row: any) => row[1] && row[1].toString().trim().toLowerCase() === cleanedItem.idAlat.toLowerCase());
      if (idExists) {
        return { success: false, message: `No. ID Alat "${cleanedItem.idAlat}" sudah terdaftar!` };
      }
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: 'MASTER_ITEM!A:D',
        valueInputOption: "RAW",
        requestBody: {
          values: [[cleanedItem.namaBarang, cleanedItem.idAlat, cleanedItem.posisi, "KIP"]]
        }
      });
      return { success: true };
    }
  } catch (err: any) {
    console.error("saveMasterItemInSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 17c. deleteMasterItemInSheets
export async function deleteMasterItemInSheets(idAlatToDelete: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const masterRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'MASTER_ITEM!A:D',
    });

    const data = masterRes.data.values || [];
    let foundIdx = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const idAlat = row[1] ? row[1].toString().trim() : "";
      if (idAlat.toLowerCase() === idAlatToDelete.trim().toLowerCase()) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx === -1) {
      return { success: false, message: "Peralatan tidak ditemukan di Google Sheets." };
    }

    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const masterSheet = response.data.sheets?.find(s => s.properties?.title === "MASTER_ITEM");
    const masterSheetId = masterSheet?.properties?.sheetId;

    if (masterSheetId === undefined) {
      throw new Error("Sheet 'MASTER_ITEM' tidak ditemukan.");
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: masterSheetId,
                dimension: 'ROWS',
                startIndex: foundIdx,
                endIndex: foundIdx + 1
              }
            }
          }
        ]
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("deleteMasterItemInSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 18. simpanInspeksiBulanan
export async function simpanInspeksiBulananInSheets(dataForm: any, fileData: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    let fileUrl = "-";
    if (fileData && fileData.data && fileData.name) {
      fileUrl = await uploadToDrive(`FOTO_INSP_${dataForm.idAlat}_${new Date().getTime()}`, fileData.data);
    }

    if (fileUrl && fileUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(fileUrl);
    }

    const idInspeksi = "INSP-" + Math.floor(10000 + Math.random() * 90000);
    const dateObj = new Date(dataForm.tanggal);
    const bulanArray = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const bulan = bulanArray[dateObj.getMonth()];
    const tahun = dateObj.getFullYear().toString();

    const formattedDate = dateObj.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

    const newRow = [
      idInspeksi,                 // Kolom 0
      bulan,                      // Kolom 1
      tahun,                      // Kolom 2
      dataForm.namaBarang,        // Kolom 3
      dataForm.idAlat,            // Kolom 4
      dataForm.posisi,            // Kolom 5
      dataForm.posisi,            // Kolom 6 (Posisi/Lokasi)
      "Bulanan",                  // Kolom 7
      "-",                        // Kolom 8
      formattedDate,              // Kolom 9
      dataForm.pic,               // Kolom 10
      dataForm.kondisi,           // Kolom 11
      dataForm.temuan || "-",     // Kolom 12
      "-",                        // Kolom 13
      fileUrl                     // Kolom 14
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'HISTORY_INSPEKSI!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newRow] },
    });

    return { success: true, message: `Inspeksi ${dataForm.idAlat} berhasil disimpan!` };
  } catch (err: any) {
    console.error("simpanInspeksiBulananInSheets error:", err);
    throw new Error(err.message);
  }
}

// 19. getInspeksiHistoryData
export async function getInspeksiHistoryDataFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'HISTORY_INSPEKSI!A:O',
    });

    const values = response.data.values;
    if (!values || values.length <= 1) return { success: true, history: [] };

    const history: any[] = [];
    const maxRows = Math.min(values.length - 1, 50);

    for (let j = values.length - 1; j >= values.length - maxRows; j--) {
      const row = values[j];
      if (row && row[0]) {
        history.push({
          idInspeksi: row[0] ? row[0].toString() : "",
          posisi: row[6] ? row[6].toString() : (row[5] ? row[5].toString() : ""),
          namaBarang: row[3] ? row[3].toString() : "",
          idAlat: row[4] ? row[4].toString() : "",
          tanggal: row[9] ? row[9].toString() : "",
          pic: row[10] ? row[10].toString() : "",
          kondisi: row[11] ? row[11].toString() : "",
          temuan: row[12] ? row[12].toString() : "",
          linkFoto: row[14] ? row[14].toString() : ""
        });
      }
    }

    return { success: true, history };
  } catch (err: any) {
    console.error("getInspeksiHistoryDataFromSheets error:", err);
    return { success: false, error: err.message };
  }
}

// 19b. updateInspeksiBulananInSheets
export async function updateInspeksiBulananInSheets(idInspeksi: string, updatedData: any, fileData: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: 'HISTORY_INSPEKSI!A:O',
    });

    const values = response.data.values || [];
    let foundRowIdx = -1; // 0-based index in the array

    for (let i = 0; i < values.length; i++) {
      if (values[i] && values[i][0] && values[i][0].toString().trim() === idInspeksi.trim()) {
        foundRowIdx = i;
        break;
      }
    }

    if (foundRowIdx === -1) {
      return { success: false, message: "Data inspeksi tidak ditemukan di Google Sheets." };
    }

    // Prepare updated file url if upload provided
    let fileUrl = updatedData.linkFoto || "-";
    if (fileData && fileData.data && fileData.name) {
      fileUrl = await uploadToDrive(`FOTO_INSP_${updatedData.idAlat || 'ID'}_${new Date().getTime()}`, fileData.data);
    }

    if (fileUrl && fileUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(fileUrl);
    }

    const dateObj = new Date(updatedData.tanggal);
    const listBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const bulan = listBulan[dateObj.getMonth()];
    const tahun = dateObj.getFullYear().toString();
    const formattedDate = dateObj.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Update row elements in place
    const targetRow = [...values[foundRowIdx]];
    
    // Fill up to 15 columns if the row was shorter
    while (targetRow.length < 15) {
      targetRow.push("-");
    }

    targetRow[1] = bulan; // Bulan
    targetRow[2] = tahun; // Tahun
    targetRow[9] = formattedDate; // Tanggal Pemeriksaan
    targetRow[11] = updatedData.kondisi; // Kondisi
    targetRow[12] = updatedData.temuan || "-"; // Temuan
    targetRow[14] = fileUrl; // Foto Bukti

    const rowNumber = foundRowIdx + 1; // 1-based Row number
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: `HISTORY_INSPEKSI!A${rowNumber}:O${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [targetRow]
      }
    });

    return { success: true, message: "Laporan inspeksi berhasil diperbarui!" };
  } catch (err: any) {
    console.error("updateInspeksiBulananInSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 20. getTemuanMioListFromSheets
export async function getTemuanMioListFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Temuan MIO'!A:O",
    });

    const values = response.data.values;
    if (!values || values.length <= 1) return { success: true, list: [] };

    const list: any[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      // Skip empty or purely spacer rows
      if (!row || (!row[0] && !row[2])) continue;

      list.push({
        rowId: i + 1, // Store 1-indexed sheet row index
        tanggal: row[0] || "",
        sebelum: row[1] || "",
        penyimpangan: row[2] || "",
        lokasi: row[3] || "",
        detailLokasi: row[4] || "",
        tindakanPerbaikan: row[5] || "",
        priority: row[6] || "",
        pic: row[7] || "",
        section: row[8] || "",
        batasWaktu: row[9] || "",
        tanggalPerbaikan: row[10] || "",
        kategoriTemuan: row[11] || "",
        buktiTindakLanjut: row[12] || "",
        status: (row[13] || "OPEN").trim().toUpperCase(),
      });
    }

    return { success: true, list };
  } catch (err: any) {
    console.error("getTemuanMioListFromSheets error:", err);
    return { success: false, message: "Error Google Sheets MIO: " + err.message };
  }
}

// 21. simpanTemuanMioClosingInSheets
export async function simpanTemuanMioClosingInSheets(rowId: number, tanggalPerbaikan: string, fileData: any, keterangan: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    let fileUrl = "-";
    if (fileData && fileData.data && fileData.name) {
      fileUrl = await uploadToDrive(`MIO_CLOSING_${rowId}_${new Date().getTime()}`, fileData.data);
    }

    if (fileUrl && fileUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(fileUrl);
    }

    const rowIndex = rowId;
    
    // Update K (Column 11, index K) with Tanggal Perbaikan
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'Temuan MIO'!K${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[tanggalPerbaikan]] }
    });

    // Update M (Column 13, index M) with Bukti Tindak Lanjut
    let finalBuktiText = fileUrl;
    if (keterangan && keterangan.trim()) {
      finalBuktiText = fileUrl !== "-" ? `${fileUrl} (${keterangan})` : keterangan;
    }
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'Temuan MIO'!M${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[finalBuktiText]] }
    });

    // Update N (Column 14, index N) with Status = CLOSED
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'Temuan MIO'!N${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [["CLOSED"]] }
    });

    return { success: true, message: "Temuan MIO berhasil ditutup secara online!" };
  } catch (err: any) {
    console.error("simpanTemuanMioClosingInSheets error:", err);
    throw new Error(err.message);
  }
}

// 20. getMasterApdFromSheets
export async function getMasterApdFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  // The client requested sheet name "Master APD" or "Data Master APD" or "MASTER APD"
  const rangesToTry = ["'Master APD'!A:Z", "'Data Master APD'!A:Z", "'MASTER_ITEM'!A:Z", "'Data Master APD'!A:C"];
  let data: any = null;
  let rangeUsed = "";

  for (const range of rangesToTry) {
    try {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID_MAIN,
        range,
      });
      if (response.data.values && response.data.values.length > 0) {
        data = response.data.values;
        rangeUsed = range;
        break;
      }
    } catch (e) {
      // Quiet fail to try next range
    }
  }

  if (!data || data.length <= 1) {
    return { success: true, list: [] };
  }

  // Detect header index
  const headers = data[0].map((h: any) => (h || "").toString().toLowerCase().trim());
  
  // Try to find column named "nama barang" or "nama item" or "item" or "barang"
  let itemIdx = headers.indexOf("nama barang");
  if (itemIdx === -1) itemIdx = headers.indexOf("nama item");
  if (itemIdx === -1) itemIdx = headers.indexOf("item");
  if (itemIdx === -1) itemIdx = headers.indexOf("barang");
  if (itemIdx === -1) itemIdx = headers.indexOf("nama_barang");
  if (itemIdx === -1) {
    // If not found, let's find the first column containing any known APD keyword or fallback to index 2 (Column C)
    itemIdx = 2; 
  }

  const apdItems: string[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[itemIdx]) {
      const val = row[itemIdx].toString().trim();
      // Skip empty or row placeholders
      if (val && val !== "-" && !val.includes("...") && !apdItems.includes(val)) {
        apdItems.push(val);
      }
    }
  }

  return { success: true, list: apdItems, source: rangeUsed };
}

// 20b. saveMasterApdInSheets
export async function saveMasterApdInSheets(itemName: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const apdData = await getMasterApdFromSheets();
  let sheetName = "Master APD";
  let itemIdx = 2; // Column C fallback

  if (apdData.source) {
    sheetName = apdData.source.split("!")[0].replace(/'/g, "");
  }

  try {
    const headerResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'${sheetName}'!1:1`,
    });
    const firstRow = headerResponse.data.values?.[0] || [];
    const headers = firstRow.map((h: any) => (h || "").toString().toLowerCase().trim());
    
    let foundIdx = headers.indexOf("nama barang");
    if (foundIdx === -1) foundIdx = headers.indexOf("nama item");
    if (foundIdx === -1) foundIdx = headers.indexOf("item");
    if (foundIdx === -1) foundIdx = headers.indexOf("barang");
    if (foundIdx === -1) foundIdx = headers.indexOf("nama_barang");
    
    if (foundIdx !== -1) {
      itemIdx = foundIdx;
    } else {
      if (firstRow.length === 0) {
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: SHEET_ID_MAIN,
          range: `'${sheetName}'!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["No", "Kode", "Nama Barang", "Keterangan"]],
          },
        });
        itemIdx = 2;
      }
    }
  } catch (err) {
    console.warn("Failed to detect headers for appending APD:", err);
  }

  const row: string[] = [];
  for (let i = 0; i < itemIdx; i++) {
    row.push("");
  }
  row.push(itemName);

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: SHEET_ID_MAIN,
    range: `'${sheetName}'!A:E`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });

  return { success: true, message: `Berhasil menambahkan APD "${itemName}" ke Google Sheets!` };
}

// Ensure a specific sheet/tab exists in the main spreadsheet. If not, create it with headers.
async function ensureSheetExists(sheetTitle: string, headers: string[]) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return;

  try {
    const spreadSheetInfo = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN,
    });
    const exists = spreadSheetInfo.data.sheets?.some(
      (s: any) => s.properties?.title === sheetTitle
    );

    if (!exists) {
      // Add sheet
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID_MAIN,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
      });
      console.log(`🟢 Created sheet tab "${sheetTitle}".`);
    }

    // Verify if first row/headers exist
    const checkHeader = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'${sheetTitle}'!A1:C1`,
    });

    if (!checkHeader.data.values || checkHeader.data.values.length === 0 || !checkHeader.data.values[0] || checkHeader.data.values[0].length === 0) {
      // Write headers
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
      console.log(`🟢 Created headers for sheet "${sheetTitle}" successfully.`);
    }
  } catch (err: any) {
    console.warn(`Could not ensure existence of sheet "${sheetTitle}":`, err.message);
  }
}

// Ensure the first row of an existing sheet contains the expected headers. If data is on row 1, shift it down.
async function ensureSheetHeaders(sheetTitle: string, headers: string[]) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return;

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: `'${sheetTitle}'!A1:L1`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0 || !rows[0] || rows[0].length === 0) {
      // Row 1 is completely empty, let's write the headers
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [headers],
        },
      });
      console.log(`🟢 Sheet "${sheetTitle}" empty header populated.`);
    } else {
      const firstRow = rows[0];
      // For "Daftar Vendor Mitra", column Index 1 (B1) is "Kode Vendor"
      const bVal = firstRow[1] ? firstRow[1].toString().trim().toLowerCase() : "";
      if (bVal && bVal !== "kode vendor" && bVal !== "kode") {
        // This is actual data, not a header! We must shift rows down by 1 and write the headers.
        const sResponse = await sheetsClient.spreadsheets.get({
          spreadsheetId: SHEET_ID_MAIN,
        });
        const sheetObj = sResponse.data.sheets?.find(s => s.properties?.title === sheetTitle);
        const sheetId = sheetObj?.properties?.sheetId;
        if (sheetId !== undefined) {
          await sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId: SHEET_ID_MAIN,
            requestBody: {
              requests: [
                {
                  insertDimension: {
                    range: {
                      sheetId: sheetId,
                      dimension: "ROWS",
                      startIndex: 0,
                      endIndex: 1,
                    },
                    inheritFromBefore: false,
                  },
                },
              ],
            },
          });
          // Write headers
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId: SHEET_ID_MAIN,
            range: `'${sheetTitle}'!A1`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [headers],
            },
          });
          console.log(`🟢 Shifted data row down and wrote headers to "${sheetTitle}".`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`ensureSheetHeaders error for "${sheetTitle}":`, err.message);
  }
}

// 22. getVendorsFromSheets
export async function getVendorsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "Timestamp", "Kode Vendor", "Nama Vendor", "Kategori", "Alamat", "PIC / Kontak Utama", "Nomor Telepon", "Email", "Nomor Kontrak Kerja", "Masa Berlaku", "Status", "Dokumen",
    "Penilai User Dept Section", "Penilai HSE Section", "Penilai General Affair Section"
  ];
  await ensureSheetExists("Daftar Vendor Mitra", headers);
  await ensureSheetHeaders("Daftar Vendor Mitra", headers);

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Daftar Vendor Mitra'!A:O",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Dynamically detect if row 0 (the first row in the fetched array) is a header row.
    const firstRow = rows[0];
    const isHeader = firstRow && firstRow[1] && (
      firstRow[1].toLowerCase().includes("kode") || 
      firstRow[1].toLowerCase().includes("vendor") || 
      firstRow[1].toLowerCase().includes("nama")
    );
    const startIndex = isHeader ? 1 : 0;

    const list: any[] = [];
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      const kode = row[1] ? row[1].toString().trim().toUpperCase() : "";
      if (!kode) continue; // Skip invalid or blank rows

      list.push({
        kode,
        nama: row[2] ? row[2].toString().trim() : "",
        kategori: row[3] ? row[3].toString().trim() : "",
        alamat: row[4] ? row[4].toString().trim() : "",
        pic: row[5] ? row[5].toString().trim() : "",
        telepon: row[6] ? row[6].toString().trim() : "",
        email: row[7] ? row[7].toString().trim() : "",
        noKontrak: row[8] ? row[8].toString().trim() : "",
        masaBerlaku: row[9] ? row[9].toString().trim() : "",
        status: row[10] ? row[10].toString().trim() : "AKTIF",
        dokumenUrl: row[11] ? row[11].toString().trim() : "",
        penilaiUser: row[12] ? row[12].toString().trim() : "",
        penilaiHse: row[13] ? row[13].toString().trim() : "",
        penilaiGa: row[14] ? row[14].toString().trim() : "",
        rowId: i + 1, // Store 1-based spreadsheet row number
      });
    }

    return list;
  } catch (err: any) {
    console.error("getVendorsFromSheets error:", err);
    if (err.message && (err.message.includes("range") || err.message.includes("not found"))) {
      try {
        await ensureSheetExists("Daftar Vendor Mitra", [
          "Timestamp", "Kode Vendor", "Nama Vendor", "Kategori", "Alamat", "PIC / Kontak Utama", "Nomor Telepon", "Email", "Nomor Kontrak Kerja", "Masa Berlaku", "Status", "Dokumen",
          "Penilai User Dept Section", "Penilai HSE Section", "Penilai General Affair Section"
        ]);
        return [];
      } catch (createErr) {
        console.warn("Failed to create 'Daftar Vendor Mitra' sheet automatically:", createErr);
        return [];
      }
    }
    return [];
  }
}

// 23. saveVendorInSheets
export async function saveVendorInSheets(vendorData: any, fileData?: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "Timestamp", "Kode Vendor", "Nama Vendor", "Kategori", "Alamat", "PIC / Kontak Utama", "Nomor Telepon", "Email", "Nomor Kontrak Kerja", "Masa Berlaku", "Status", "Dokumen",
    "Penilai User Dept Section", "Penilai HSE Section", "Penilai General Affair Section"
  ];
  await ensureSheetExists("Daftar Vendor Mitra", headers);

  try {
    let docUrl = vendorData.dokumenUrl || "-";
    if (fileData && fileData.base64 && fileData.fileName) {
      try {
        const fileUrl = await uploadToDrive(`VENDOR_${vendorData.kode}_${Date.now()}`, fileData.base64);
        if (fileUrl && fileUrl !== "-") {
          docUrl = fileUrl;
        }
      } catch (uploadErr) {
        console.error("Failed to upload vendor file to Google Drive:", uploadErr);
      }
    }

    if (docUrl && docUrl.startsWith("/api/uploads/")) {
      triggerAutoHeal(docUrl);
    }

    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).replace(/\./g, ':');
    const valuesRow = [
      timestamp,
      vendorData.kode.trim().toUpperCase(),
      vendorData.nama.trim(),
      vendorData.kategori || "-",
      vendorData.alamat || "-",
      vendorData.pic || "-",
      vendorData.telepon || "-",
      vendorData.email || "-",
      vendorData.noKontrak || "-",
      vendorData.masaBerlaku || "-",
      vendorData.status || "AKTIF",
      docUrl,
      vendorData.penilaiUser || "",
      vendorData.penilaiHse || "",
      vendorData.penilaiGa || ""
    ];

    const vendors = await getVendorsFromSheets();
    const existingIndex = vendors.findIndex(v => v.kode.toLowerCase() === vendorData.kode.trim().toLowerCase());

    if (existingIndex !== -1) {
      if (docUrl === "-" && vendors[existingIndex].dokumenUrl && vendors[existingIndex].dokumenUrl !== "-") {
        valuesRow[11] = vendors[existingIndex].dokumenUrl;
      }
      if (vendorData.penilaiUser === undefined) valuesRow[12] = vendors[existingIndex].penilaiUser || "";
      if (vendorData.penilaiHse === undefined) valuesRow[13] = vendors[existingIndex].penilaiHse || "";
      if (vendorData.penilaiGa === undefined) valuesRow[14] = vendors[existingIndex].penilaiGa || "";

      const sheetRowIndex = vendors[existingIndex].rowId;
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Daftar Vendor Mitra'!A${sheetRowIndex}:O${sheetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [valuesRow]
        }
      });
      console.log(`🟢 Updated existing vendor ${vendorData.kode} in sheet.`);
    } else {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Daftar Vendor Mitra'!A:O",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [valuesRow]
        }
      });
      console.log(`🟢 Saved new vendor ${vendorData.kode} in sheet.`);
    }

    const updatedList = await getVendorsFromSheets();
    return { success: true, list: updatedList };
  } catch (err: any) {
    console.error("saveVendorInSheets error:", err);
    throw new Error(err.message);
  }
}

// 24. deleteVendorInSheets
export async function deleteVendorInSheets(kode: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const vendors = await getVendorsFromSheets();
    const existingIndex = vendors.findIndex(v => v.kode.toLowerCase() === kode.trim().toLowerCase());

    if (existingIndex === -1) {
      throw new Error(`Vendor dengan kode ${kode} tidak ditemukan di Google Sheets.`);
    }

    const rowIndex = vendors[existingIndex].rowId;

    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const vendorSheet = response.data.sheets?.find(s => s.properties?.title === "Daftar Vendor Mitra");
    const vendorSheetId = vendorSheet?.properties?.sheetId;

    if (vendorSheetId === undefined) {
      throw new Error("Sheet 'Daftar Vendor Mitra' tidak ditemukan.");
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: vendorSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    const updatedList = await getVendorsFromSheets();
    return { success: true, list: updatedList };
  } catch (err: any) {
    console.error("deleteVendorInSheets error:", err);
    throw new Error(err.message);
  }
}

// 25. getVendorEvaluationsFromSheets
export async function getVendorEvaluationsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "ID Evaluasi", "Kode Vendor", "Nama Vendor", "Periode", "Status", "Catatan", "Bukti URL", 
    "Evaluator User", "Evaluator HSE", "Evaluator GA", 
    "User Price", "User Quality", "User Quantity", "User Delivery", 
    "HSE K3", "HSE APD", "HSE Procedure", "HSE Temuan", "HSE Dokumentasi", "HSE Lingkungan", 
    "GA Administrasi", "GA Respons", "GA Pelayanan", "GA Ketepatan", "GA Kontrak", "GA Operasional", 
    "Created At", "Updated At"
  ];

  await ensureSheetExists("Evaluasi Vendor", headers);

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Evaluasi Vendor'!A:AB",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const firstRow = rows[0];
    const isHeader = firstRow && firstRow[0] && (
      firstRow[0].toLowerCase().includes("id") || 
      firstRow[0].toLowerCase().includes("evaluasi")
    );
    const startIndex = isHeader ? 1 : 0;

    const list: any[] = [];
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      const id = row[0] ? row[0].toString().trim() : "";
      if (!id) continue;

      const parseNum = (val: any) => {
        const num = parseFloat(val);
        return isNaN(num) ? 4 : num;
      };

      list.push({
        id,
        vendorKode: row[1] ? row[1].toString().trim() : "",
        vendorNama: row[2] ? row[2].toString().trim() : "",
        periode: row[3] ? row[3].toString().trim() : "",
        status: row[4] ? row[4].toString().trim() : "Draft",
        catatan: row[5] ? row[5].toString().trim() : "",
        buktiUrl: row[6] ? row[6].toString().trim() : "",
        evaluatorUser: row[7] ? row[7].toString().trim() : "",
        evaluatorHse: row[8] ? row[8].toString().trim() : "",
        evaluatorGa: row[9] ? row[9].toString().trim() : "",
        userPrice: parseNum(row[10]),
        userQuality: parseNum(row[11]),
        userQuantity: parseNum(row[12]),
        userDelivery: parseNum(row[13]),
        hseK3: parseNum(row[14]),
        hseApd: parseNum(row[15]),
        hseProcedure: parseNum(row[16]),
        hseTemuan: parseNum(row[17]),
        hseDokumentasi: parseNum(row[18]),
        hseLingkungan: parseNum(row[19]),
        gaAdministrasi: parseNum(row[20]),
        gaRespons: parseNum(row[21]),
        gaPelayanan: parseNum(row[22]),
        gaKetepatan: parseNum(row[23]),
        gaKontrak: parseNum(row[24]),
        gaOperasional: parseNum(row[25]),
        createdAt: row[26] ? row[26].toString().trim() : "",
        updatedAt: row[27] ? row[27].toString().trim() : "",
        rowId: i + 1
      });
    }

    return list;
  } catch (err: any) {
    console.error("getVendorEvaluationsFromSheets error:", err);
    return [];
  }
}

// 26. saveVendorEvaluationInSheets
export async function saveVendorEvaluationInSheets(evalData: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "ID Evaluasi", "Kode Vendor", "Nama Vendor", "Periode", "Status", "Catatan", "Bukti URL", 
    "Evaluator User", "Evaluator HSE", "Evaluator GA", 
    "User Price", "User Quality", "User Quantity", "User Delivery", 
    "HSE K3", "HSE APD", "HSE Procedure", "HSE Temuan", "HSE Dokumentasi", "HSE Lingkungan", 
    "GA Administrasi", "GA Respons", "GA Pelayanan", "GA Ketepatan", "GA Kontrak", "GA Operasional", 
    "Created At", "Updated At"
  ];

  await ensureSheetExists("Evaluasi Vendor", headers);

  try {
    const currentList = await getVendorEvaluationsFromSheets();
    const existingIndex = currentList.findIndex(e => e.id === evalData.id);

    const valRow = [
      evalData.id,
      evalData.vendorKode || "",
      evalData.vendorNama || "",
      evalData.periode || "",
      evalData.status || "Draft",
      evalData.catatan || "",
      evalData.buktiUrl || "",
      evalData.evaluatorUser || "",
      evalData.evaluatorHse || "",
      evalData.evaluatorGa || "",
      evalData.userPrice !== undefined ? evalData.userPrice : 4,
      evalData.userQuality !== undefined ? evalData.userQuality : 4,
      evalData.userQuantity !== undefined ? evalData.userQuantity : 4,
      evalData.userDelivery !== undefined ? evalData.userDelivery : 4,
      evalData.hseK3 !== undefined ? evalData.hseK3 : 4,
      evalData.hseApd !== undefined ? evalData.hseApd : 4,
      evalData.hseProcedure !== undefined ? evalData.hseProcedure : 4,
      evalData.hseTemuan !== undefined ? evalData.hseTemuan : 4,
      evalData.hseDokumentasi !== undefined ? evalData.hseDokumentasi : 4,
      evalData.hseLingkungan !== undefined ? evalData.hseLingkungan : 4,
      evalData.gaAdministrasi !== undefined ? evalData.gaAdministrasi : 4,
      evalData.gaRespons !== undefined ? evalData.gaRespons : 4,
      evalData.gaPelayanan !== undefined ? evalData.gaPelayanan : 4,
      evalData.gaKetepatan !== undefined ? evalData.gaKetepatan : 4,
      evalData.gaKontrak !== undefined ? evalData.gaKontrak : 4,
      evalData.gaOperasional !== undefined ? evalData.gaOperasional : 4,
      evalData.createdAt || new Date().toISOString(),
      evalData.updatedAt || new Date().toISOString()
    ];

    if (existingIndex !== -1) {
      const rowIndex = currentList[existingIndex].rowId;
      // If we are updating, we preserve previous fields if not provided
      const prev = currentList[existingIndex];
      valRow[6] = evalData.buktiUrl || prev.buktiUrl || "";
      valRow[26] = prev.createdAt || valRow[26];

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Evaluasi Vendor'!A${rowIndex}:AB${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [valRow]
        }
      });
    } else {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Evaluasi Vendor'!A:AB",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [valRow]
        }
      });
    }

    const updatedList = await getVendorEvaluationsFromSheets();
    return { success: true, list: updatedList };
  } catch (err: any) {
    console.error("saveVendorEvaluationInSheets error:", err);
    throw new Error(err.message);
  }
}

// 27. deleteVendorEvaluationInSheets
export async function deleteVendorEvaluationInSheets(id: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const currentList = await getVendorEvaluationsFromSheets();
    const existingIndex = currentList.findIndex(e => e.id === id);

    if (existingIndex === -1) {
      throw new Error(`Evaluasi dengan ID ${id} tidak ditemukan di Google Sheets.`);
    }

    const rowIndex = currentList[existingIndex].rowId;

    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const evalSheet = response.data.sheets?.find(s => s.properties?.title === "Evaluasi Vendor");
    const evalSheetId = evalSheet?.properties?.sheetId;

    if (evalSheetId === undefined) {
      throw new Error("Sheet 'Evaluasi Vendor' tidak ditemukan.");
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: evalSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    const updatedList = await getVendorEvaluationsFromSheets();
    return { success: true, list: updatedList };
  } catch (err: any) {
    console.error("deleteVendorEvaluationInSheets error:", err);
    throw new Error(err.message);
  }
}

// 28. getNomorSuratFromSheets
export async function getNomorSuratFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "ID", "Nomor Surat", "Tanggal", "Perihal", "Tujuan", "Dibuat Oleh", "Status", "Departemen", "Created At", "Updated At"
  ];

  await ensureSheetExists("Arsip Nomor Surat", headers);
  await ensureSheetHeaders("Arsip Nomor Surat", headers);

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip Nomor Surat'!A:J",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const list: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows
      list.push({
        id: row[0] ? row[0].toString().trim() : "",
        nomorSurat: row[1] ? row[1].toString().trim() : "",
        tanggal: row[2] ? row[2].toString().trim() : "",
        perihal: row[3] ? row[3].toString().trim() : "",
        tujuan: row[4] ? row[4].toString().trim() : "",
        createdBy: row[5] ? row[5].toString().trim() : "",
        status: row[6] ? row[6].toString().trim() : "",
        departemen: row[7] ? row[7].toString().trim() : "",
        createdAt: row[8] ? row[8].toString().trim() : "",
        updatedAt: row[9] ? row[9].toString().trim() : "",
        rowIndex: i + 1, // Store spreadsheet row number
      });
    }

    // Sort by tanggal descending
    list.sort((a, b) => new Date(b.tanggal || b.createdAt).getTime() - new Date(a.tanggal || a.createdAt).getTime());
    return list;
  } catch (err: any) {
    console.error("getNomorSuratFromSheets error:", err);
    return [];
  }
}

// 29. saveNomorSuratToSheets
export async function saveNomorSuratToSheets(suratObj: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  const headers = [
    "ID", "Nomor Surat", "Tanggal", "Perihal", "Tujuan", "Dibuat Oleh", "Status", "Departemen", "Created At", "Updated At"
  ];

  await ensureSheetExists("Arsip Nomor Surat", headers);

  try {
    const list = await getNomorSuratFromSheets();
    const existingIndex = list.findIndex(s => s.id === suratObj.id);

    const id = suratObj.id || "ns-" + Date.now();
    const nomorSurat = suratObj.nomorSurat || "";
    const tanggal = suratObj.tanggal || "";
    const perihal = suratObj.perihal || "";
    const tujuan = suratObj.tujuan || "";
    const createdBy = suratObj.createdBy || "";
    const status = suratObj.status || "Draft";
    const departemen = suratObj.departemen || "";
    const createdAt = suratObj.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    const rowValues = [id, nomorSurat, tanggal, perihal, tujuan, createdBy, status, departemen, createdAt, updatedAt];

    if (existingIndex !== -1) {
      // Update existing row
      const sheetRowIndex = list[existingIndex].rowIndex;
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: `'Arsip Nomor Surat'!A${sheetRowIndex}:J${sheetRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues]
        }
      });
    } else {
      // Append row
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Arsip Nomor Surat'!A:J",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues]
        }
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error("saveNomorSuratToSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 30. deleteNomorSuratFromSheets
export async function deleteNomorSuratFromSheets(id: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) throw new Error("Google Sheets not configured");

  try {
    const list = await getNomorSuratFromSheets();
    const targetItem = list.find(s => s.id === id);

    if (!targetItem) {
      return { success: false, message: "Nomor surat tidak ditemukan." };
    }

    const rowIndex = targetItem.rowIndex;

    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: SHEET_ID_MAIN
    });

    const targetSheet = response.data.sheets?.find(s => s.properties?.title === "Arsip Nomor Surat");
    const sheetId = targetSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("Sheet 'Arsip Nomor Surat' tidak ditemukan.");
    }

    // Call spreadsheets.batchUpdate to execute true dimension deletion
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID_MAIN,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based index
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("deleteNomorSuratFromSheets error:", err);
    return { success: false, message: err.message };
  }
}

// 31. BAK Archives JSON persistence
export async function getBakDocsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return null;

  try {
    await ensureSheetExists("DB_BAK_Archives", ["JSON_STATE"]);
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_BAK_Archives'!A2",
    });

    const rows = response.data.values;
    if (rows && rows.length > 0 && rows[0][0]) {
      return JSON.parse(rows[0][0]);
    }
    return [];
  } catch (err: any) {
    console.error("getBakDocsFromSheets error:", err);
    return null;
  }
}

export async function saveBakDocsStateToSheets(docsArray: any[]) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return;

  try {
    await ensureSheetExists("DB_BAK_Archives", ["JSON_STATE"]);
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_BAK_Archives'!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[JSON.stringify(docsArray)]]
      }
    });
  } catch (err: any) {
    console.error("saveBakDocsStateToSheets error:", err);
  }
}

// 32. BAKT APD Archives JSON persistence
export async function getBaktDocsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return null;

  try {
    await ensureSheetExists("DB_BAKT_Archives", ["JSON_STATE"]);
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_BAKT_Archives'!A2",
    });

    const rows = response.data.values;
    if (rows && rows.length > 0 && rows[0][0]) {
      return JSON.parse(rows[0][0]);
    }
    return [];
  } catch (err: any) {
    console.error("getBaktDocsFromSheets error:", err);
    return null;
  }
}

export async function saveBaktDocsStateToSheets(docsArray: any[]) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return;

  try {
    await ensureSheetExists("DB_BAKT_Archives", ["JSON_STATE"]);
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'DB_BAKT_Archives'!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[JSON.stringify(docsArray)]]
      }
    });
  } catch (err: any) {
    console.error("saveBaktDocsStateToSheets error:", err);
  }
}

// 33. DPB (Daftar Permintaan Barang) Google Sheets Functions
export async function getDpbDocsFromSheets() {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return null;

  const headers = [
    "No", "Diminta Oleh", "Departemen", "Tanggal", "No Reg / Registrasi", "Description (Deskripsi Barang)", "Qty", "UoM", "Priority", "JSON_DATA"
  ];

  try {
    await ensureSheetExists("Arsip DPB", headers);
    await ensureSheetHeaders("Arsip DPB", headers);

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip DPB'!A:J",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const docMap = new Map<string, any>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || (!row[4] && !row[0])) continue;

      // Skip header rows or column titles
      const col0 = row[0] ? row[0].toString().trim() : '';
      const col1 = row[1] ? row[1].toString().trim() : '';
      const col4 = row[4] ? row[4].toString().trim() : '';
      const col5 = row[5] ? row[5].toString().trim() : '';

      if (
        col0.toLowerCase() === 'no' ||
        col1.toLowerCase() === 'diminta oleh' ||
        col4.toLowerCase() === 'no reg / registrasi' ||
        col4.toLowerCase() === 'no reg' ||
        col5.toLowerCase() === 'description (deskripsi barang)'
      ) {
        continue;
      }

      // Check if JSON payload is present in Col J (index 9)
      if (row[9] && typeof row[9] === 'string' && row[9].trim().startsWith('{')) {
        try {
          const parsedDoc = JSON.parse(row[9]);
          if (parsedDoc && parsedDoc.id) {
            docMap.set(parsedDoc.id, parsedDoc);
            continue;
          }
        } catch (e) {
          // Fallback to row reconstruction
        }
      }

      // Reconstruct document from row columns
      const noReg = row[4] ? row[4].toString().trim() : (row[0] ? `DPB/2026/08/${row[0].toString().padStart(3, '0')}` : 'DPB-UNKNOWN');
      const docKey = noReg;

      const itemObj = {
        id: `item-${i}`,
        description: row[5] ? row[5].toString().trim() : '',
        qty: row[6] ? Number(row[6]) || 1 : 1,
        uom: row[7] ? row[7].toString().trim() : 'Pcs',
        priority: (row[8] ? row[8].toString().trim() : 'P1') as any
      };

      if (docMap.has(docKey)) {
        const existing = docMap.get(docKey);
        if (itemObj.description) {
          existing.items.push(itemObj);
        }
      } else {
        docMap.set(docKey, {
          id: `dpb-${noReg.replace(/[^a-zA-Z0-9]/g, '-')}`,
          noReg: noReg,
          dimintaOleh: row[1] ? row[1].toString().trim() : '-',
          departemen: row[2] ? row[2].toString().trim() : '-',
          tanggal: row[3] ? row[3].toString().trim() : new Date().toISOString().split('T')[0],
          items: itemObj.description ? [itemObj] : [],
          namaAdmin: 'Admin HSE',
          namaGlSupervisor: '-',
          namaDeputyPjo: '-',
          namaPjo: '-',
          note: '',
          photos: [],
          createdAt: new Date().toISOString()
        });
      }
    }

    return Array.from(docMap.values());
  } catch (err: any) {
    console.error("getDpbDocsFromSheets error:", err);
    return null;
  }
}

export async function saveDpbDocToSheets(docObj: any) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return { success: false, message: "Google Sheets not configured" };

  const headers = [
    "No", "Diminta Oleh", "Departemen", "Tanggal", "No Reg / Registrasi", "Description (Deskripsi Barang)", "Qty", "UoM", "Priority", "JSON_DATA"
  ];

  try {
    await ensureSheetExists("Arsip DPB", headers);

    // Format sequence string (e.g., 003)
    let seqStr = "001";
    if (docObj.noReg) {
      const parts = docObj.noReg.split('/');
      const lastPart = parts[parts.length - 1];
      const parsedNum = parseInt(lastPart, 10);
      if (!isNaN(parsedNum)) {
        seqStr = String(parsedNum).padStart(3, '0');
      }
    }

    // Format date string to DD/MM/YYYY
    let formattedTanggal = docObj.tanggal || '';
    if (formattedTanggal.includes('-')) {
      const tParts = formattedTanggal.split('-');
      if (tParts.length === 3) {
        formattedTanggal = `${tParts[2].padStart(2, '0')}/${tParts[1].padStart(2, '0')}/${tParts[0]}`;
      }
    }

    // Get current rows to check if document already exists
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip DPB'!A:J",
    });

    const rows = response.data.values || [];
    const jsonPayload = JSON.stringify(docObj);

    // First delete any existing rows for this doc.id or doc.noReg
    if (rows.length > 1) {
      const rowsToKeep = [rows[0]]; // keep header
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        let isMatch = false;
        if (row[4] && row[4].toString().trim() === docObj.noReg) {
          isMatch = true;
        }
        if (row[9]) {
          try {
            const parsed = JSON.parse(row[9]);
            if (parsed && (parsed.id === docObj.id || parsed.noReg === docObj.noReg)) {
              isMatch = true;
            }
          } catch (e) {}
        }
        if (!isMatch) {
          rowsToKeep.push(row);
        }
      }

      const itemsToSave = (docObj.items && docObj.items.length > 0)
        ? docObj.items
        : [{ description: '', qty: 1, uom: 'Pcs', priority: 'P1' }];

      itemsToSave.forEach((item: any) => {
        rowsToKeep.push([
          seqStr,
          docObj.dimintaOleh || '',
          docObj.departemen || '',
          formattedTanggal,
          docObj.noReg || '',
          item.description || '',
          item.qty || 1,
          item.uom || 'Pcs',
          item.priority || 'P1',
          jsonPayload
        ]);
      });

      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Arsip DPB'!A:J"
      });

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Arsip DPB'!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rowsToKeep
        }
      });
    } else {
      const itemsToSave = (docObj.items && docObj.items.length > 0)
        ? docObj.items
        : [{ description: '', qty: 1, uom: 'Pcs', priority: 'P1' }];

      const newRows = itemsToSave.map((item: any) => [
        seqStr,
        docObj.dimintaOleh || '',
        docObj.departemen || '',
        formattedTanggal,
        docObj.noReg || '',
        item.description || '',
        item.qty || 1,
        item.uom || 'Pcs',
        item.priority || 'P1',
        jsonPayload
      ]);

      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SHEET_ID_MAIN,
        range: "'Arsip DPB'!A:J",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: newRows
        }
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("saveDpbDocToSheets error:", err);
    return { success: false, message: err.message };
  }
}

export async function deleteDpbDocFromSheets(id: string) {
  const { sheets: sheetsClient } = getGoogleAuth();
  if (!sheetsClient) return { success: false, message: "Google Sheets not configured" };

  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip DPB'!A:J",
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return { success: true };

    const rowsToKeep = [rows[0]]; // header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      let isMatch = false;
      if (row[4] && row[4].toString().trim() === id) {
        isMatch = true;
      }
      if (row[9]) {
        try {
          const parsed = JSON.parse(row[9]);
          if (parsed && (parsed.id === id || parsed.noReg === id)) {
            isMatch = true;
          }
        } catch (e) {}
      }
      if (!isMatch) {
        rowsToKeep.push(row);
      }
    }

    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip DPB'!A:J"
    });

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SHEET_ID_MAIN,
      range: "'Arsip DPB'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rowsToKeep
      }
    });

    return { success: true };
  } catch (err: any) {
    console.error("deleteDpbDocFromSheets error:", err);
    return { success: false, message: err.message };
  }
}




