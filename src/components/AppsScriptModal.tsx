import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, Code2, AlertTriangle, ExternalLink, Save, Loader2, PlayCircle, ShieldAlert } from 'lucide-react';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppsScriptModal({ isOpen, onClose }: AppsScriptModalProps) {
  const [copied, setCopied] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; needsAuth?: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load current settings when modal opens
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data && data.settings && data.settings.googleAppsScriptUrl) {
            setAppsScriptUrl(data.settings.googleAppsScriptUrl);
          }
        })
        .catch(err => console.error("Error loading settings:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveUrl = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleAppsScriptUrl: appsScriptUrl }),
      });
      
      if (response.ok) {
        setSaveMessage('✅ URL berhasil disimpan! Upload ke Drive sekarang akan menggunakan proxy ini.');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        setSaveMessage('❌ Gagal menyimpan URL.');
      }
    } catch (error) {
      setSaveMessage('❌ Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestUrl = async () => {
    if (!appsScriptUrl) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/settings/test-appsscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appsScriptUrl })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        needsAuth: false,
        message: 'Gagal terhubung ke server untuk menguji URL: ' + (err.message || err)
      });
    } finally {
      setIsTesting(false);
    }
  };

  const scriptCode = `// Google Apps Script - Proxy Upload File ke Google Drive (Bypass Quota)

function aktivasiIzinDrive() {
  var folder = DriveApp.getFolderById("1AUXCZGF69iKK5ttWyGYugus57ht49Yiy");
  Logger.log("Aktivasi izin DriveApp berhasil! Folder: " + folder.getName());
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId || "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy";
    var fileName = data.fileName || ("NAPZA_" + new Date().getTime() + ".jpg");
    var base64Data = data.base64Data;
    var mimeType = data.mimeType || "application/octet-stream";

    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var file = folder.createFile(blob);

    // Buka izin lihat agar file dapat diakses siapapun yang memiliki link
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (errShare) {
      // Abaikan jika akun Google membatasi setSharing publik
    }

    var driveLink = "https://drive.google.com/file/d/" + file.getId() + "/view?usp=drivesdk";

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      webViewLink: driveLink,
      fileId: file.getId(),
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Solusi Upload Drive Personal</h2>
              <p className="text-xs text-slate-500">Bypass limitasi 0-Byte Service Account menggunakan Google Apps Script</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto text-sm">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">Kenapa Upload Gagal (Lokal Sementara)?</p>
              <p>Google membatasi Service Account agar <b>TIDAK memiliki kuota penyimpanan (0 Bytes)</b> jika Anda menggunakan Google Drive Personal (akun @gmail.com). Meskipun Anda sudah share folder ke Service Account sebagai Editor, kuota upload tetap dihitung dari Service Account, bukan akun Anda. Akibatnya, upload akan selalu gagal.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b pb-2">Langkah Mudah Memperbaiki (1 Menit):</h3>
            
            <ol className="list-decimal list-inside space-y-4 text-slate-600">
              <li className="leading-relaxed">
                Buka <a href="https://script.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">Google Apps Script <ExternalLink className="w-3 h-3"/></a> menggunakan akun Gmail Anda (yang memiliki folder Drive).
              </li>
              <li className="leading-relaxed">
                Klik tombol <b>"New Project"</b> (Proyek Baru).
              </li>
              <li className="leading-relaxed">
                Hapus semua kode yang ada, lalu salin (copy) dan tempel (paste) kode sakti di bawah ini:
              </li>
            </ol>

            <div className="relative group">
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  {copied ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Tersalin!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Salin Kode</>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-50 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed shadow-inner">
                <code>{scriptCode}</code>
              </pre>
            </div>

            <ol className="list-decimal list-inside space-y-4 text-slate-600" start={4}>
              <li className="leading-relaxed">
                Klik tombol <b>Simpan (Save)</b> (ikon disket).
              </li>
              <li className="leading-relaxed">
                <strong className="text-rose-600 font-bold">LANGKAH WAJIB (OTORISASI):</strong> Di toolbar atas, pastikan fungsi yang terpilih adalah <b>aktivasiIzinDrive</b> (atau pilih dari menu dropdown di sebelah tombol Jalankan), lalu klik tombol <b>Jalankan (Run)</b>.
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5 text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    Cara Mengizinkan Akses Google Drive (Jika Muncul Popup Otorisasi):
                  </p>
                  <p>1. Klik <b>Tinjau Izin (Review Permissions)</b> &rarr; Pilih akun Google Anda.</p>
                  <p>2. Jika muncul tulisan <i>"Google hasn't verified this app"</i> (Google belum memverifikasi aplikasi ini), klik tulisan <b>Advanced (Lanjutan)</b> di kiri bawah.</p>
                  <p>3. Klik <b>Go to Untitled project (unsafe) / Buka proyek (tidak aman)</b> di bagian bawah.</p>
                  <p>4. Klik tombol biru <b>Allow (Izinkan)</b>.</p>
                  <p className="text-[11px] text-amber-700 italic pt-1">*Langkah ini hanya dilakukan 1x agar Google mengizinkan script membuat file di Drive Anda.</p>
                </div>
              </li>
              <li className="leading-relaxed">
                Klik tombol <b>Deploy</b> (Terapkan) di kanan atas, pilih <b>New Deployment</b> (Penerapan Baru).
              </li>
              <li className="leading-relaxed">
                Klik ikon Roda Gigi ⚙️, pilih <b>Web App</b>.
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-slate-500">
                  <li>Description: bebas (misal: "Proxy Upload")</li>
                  <li>Execute as: <b>Me</b> (Diri saya / email Anda)</li>
                  <li>Who has access: <b>Anyone</b> (Siapa saja) &mdash; <i>wajib 'Anyone' agar sistem web dapat mengaksesnya</i></li>
                </ul>
              </li>
              <li className="leading-relaxed">
                Klik <b>Deploy</b> (jika sebelumnya sudah pernah deploy, pastikan Anda memilih <b>New version</b>).
              </li>
              <li className="leading-relaxed bg-blue-50 p-4 border border-blue-200 rounded-lg text-blue-900 mt-4">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Salin dan Uji URL di bawah ini
                </div>
                <p className="text-xs mb-3 text-slate-600">
                  Salin <b>Web app URL</b> yang muncul di jendela Apps Script (berakhiran <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">/exec</code>), lalu masukkan ke kolom di bawah:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="url" 
                    placeholder="https://script.google.com/macros/s/AKfy.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => {
                      setAppsScriptUrl(e.target.value);
                      setTestResult(null);
                    }}
                    className="flex-1 bg-white border border-blue-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleTestUrl}
                    disabled={isTesting || !appsScriptUrl}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    title="Uji apakah URL dan izin Google Drive sudah aktif"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    Uji Koneksi
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUrl}
                    disabled={isSaving || !appsScriptUrl}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Simpan URL
                  </button>
                </div>

                {/* Test Connection Feedback */}
                {testResult && (
                  <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : testResult.needsAuth
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {testResult.success ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Koneksi Berhasil & Aktif!</>
                      ) : testResult.needsAuth ? (
                        <><ShieldAlert className="w-4 h-4 text-amber-600" /> Perlu Izin Otorisasi di Apps Script</>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-rose-600" /> Uji Koneksi Gagal</>
                      )}
                    </div>
                    <p>{testResult.message}</p>
                    {testResult.needsAuth && (
                      <div className="mt-2 pt-2 border-t border-amber-200/80 font-medium">
                        👉 <b>Solusi Cepat:</b> Buka kembali tab Google Apps Script Anda, pilih fungsi <b>aktivasiIzinDrive</b> di bagian atas &rarr; klik tombol <b>Jalankan (Run)</b> &rarr; berikan izin (Review Permissions &gt; Advanced &gt; Go to ... &gt; Allow). Setelah itu klik <b>Uji Koneksi</b> lagi di sini!
                      </div>
                    )}
                  </div>
                )}

                {saveMessage && (
                  <div className={`mt-2 text-xs font-semibold ${saveMessage.includes('✅') ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {saveMessage}
                  </div>
                )}
              </li>
            </ol>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Tutup & Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
