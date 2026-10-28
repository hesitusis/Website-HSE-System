import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Warehouse,
  ClipboardList,
  HeartPulse,
  UserCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Pill,
  ExternalLink,
  Lock,
  User,
  Heart,
  Settings,
  Database,
  FileText,
  Users,
  CalendarCheck,
  Pencil,
  ChevronDown,
  UserCog,
  MapPin,
  Activity,
  ArrowLeft,
  FileSpreadsheet,
  Eye,
  EyeOff
} from 'lucide-react';

// Subcomponents
import ApdForm from './components/ApdForm.js';
import NapzaForm from './components/NapzaForm.js';
import DonorDarahForm from './components/DonorDarahForm.js';
import BugarSelamat from './components/BugarSelamat.js';
import TrainingManager from './components/TrainingManager.js';
import McuManager from './components/McuManager.js';
import InspeksiK3 from './components/InspeksiK3.js';
import TemuanMio from './components/TemuanMio.js';
import PengajuanMenu from './components/PengajuanMenu.js';
import BaktApdForm from './components/BaktApdForm.js';
import BakForm from './components/BakForm.js';
import UserManagement from './components/UserManagement.js';
import Absensi from './components/Absensi.js';
import SignatureModal from './components/SignatureModal.js';
import EditProfileModal from './components/EditProfileModal.js';
import MinePermitMonitoring from './components/MinePermitMonitoring.js';
import VendorPenilaian from './components/VendorPenilaian.js';
import ProsedurManager from './components/ProsedurManager.js';
import NomorSurat from './components/NomorSurat.js';
import AppsScriptModal from './components/AppsScriptModal.js';
import SpipDashboard from './components/SpipDashboard.js';
import DpbForm from './components/DpbForm.js';
import { SITES, SiteFilter, SiteId, isValidSiteId } from './constants/sites.js';
import { SiteHeaderSwitcher } from './components/common/SiteHeaderSwitcher.js';
import { DashboardSiteBanner } from './components/common/DashboardSiteBanner.js';
import { SiteBadge } from './components/common/index.js';

const companyLogo = 'https://images.seeklogo.com/logo-png/36/1/pt-indotruck-utama-logo-png_seeklogo-363267.png';

type ViewState = 'dashboard' | 'transaksi_apd' | 'transaksi_barang' | 'hse_reports_menu' | 'napza' | 'donor_darah' | 'bugar_selamat' | 'training' | 'mcu' | 'inspeksi_k3' | 'temuan_mio' | 'pengajuan_menu' | 'bakt_apd' | 'bak' | 'dpb' | 'absensi' | 'user_management' | 'mine_permit_monitoring' | 'vendor_evaluation' | 'prosedur' | 'nomor_surat' | 'monitoring_keselamatan';

export default function App() {
  // Multi-Site State
  const [activeSite, setActiveSite] = useState<SiteFilter>(() => {
    const saved = localStorage.getItem('hse_active_site');
    if (saved && (saved === 'ALL' || isValidSiteId(saved))) return saved as SiteFilter;
    return 'ITU-Admo';
  });

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRealName, setUserRealName] = useState('');
  const [userNrp, setUserNrp] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'operator'>('admin');
  const [userAllowedViews, setUserAllowedViews] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userTtdUrl, setUserTtdUrl] = useState('');
  const [loggedInUsername, setLoggedInUsername] = useState('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [noAccessMessage, setNoAccessMessage] = useState<string | null>(null);

  // Connection status state
  const [googleSheetsConfigured, setGoogleSheetsConfigured] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState('17R9i0n3eMOOSGO3wF_8MJKJ5oqsjW-aQ6gUMMHNjbNY');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [lastDriveError, setLastDriveError] = useState('');

  // Routing navigation view state
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // User dropdown and profile modal state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSheetsMenuOpen, setIsSheetsMenuOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);

  // Load status on view changes and on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [currentView]);

  useEffect(() => {
    const handleRefreshStatus = () => {
      checkConnectionStatus();
    };
    window.addEventListener('app:refresh-status', handleRefreshStatus);
    return () => window.removeEventListener('app:refresh-status', handleRefreshStatus);
  }, []);

  useEffect(() => {
    // Check for deep-linking URL parameters for direct email actions
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const tabParam = params.get('tab');
    const docIdParam = params.get('docId');
    const docTypeParam = params.get('docType');

    if (viewParam) {
      setCurrentView(viewParam as any);
    }
    if (docIdParam) {
      sessionStorage.setItem('highlightDocId', docIdParam);
    }
    if (docTypeParam) {
      sessionStorage.setItem('highlightDocType', docTypeParam);
    }
    if (tabParam) {
      sessionStorage.setItem('highlightTab', tabParam);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setGoogleSheetsConfigured(data.googleSheetsConfigured);
      setAppUrl(data.appUrl);
      if (data.spreadsheetId) {
        setActiveSpreadsheetId(data.spreadsheetId);
      }
      if (data.serviceAccountEmail) {
        setServiceAccountEmail(data.serviceAccountEmail);
      }
      if (data.driveFolderId) {
        setDriveFolderId(data.driveFolderId);
      }
      if (data.lastDriveError !== undefined) {
        setLastDriveError(data.lastDriveError);
      }
    } catch (e) {
      console.warn("Unable to check connection status, fallback to Demo.");
    }
  };

  const handleDismissDriveError = async () => {
    try {
      await fetch("/api/status/clear-error", { method: "POST" });
      await checkConnectionStatus();
    } catch (e) {
      console.warn("Gagal menghapus error:", e);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError("Harap isi username dan password.");
      return;
    }

    setIsLoginLoading(true);
    setLoginError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.success) {
        setUserRealName(data.nama);
        setUserNrp(data.nrp || '');
        setUserRole(data.role || 'admin');
        setUserAllowedViews(data.allowedViews || []);
        setUserTtdUrl(data.ttdUrl || '');
        setLoggedInUsername(data.username || usernameInput.toLowerCase().trim());
        if (data.site && (data.site === 'ALL' || isValidSiteId(data.site))) {
          setActiveSite(data.site);
          localStorage.setItem('hse_active_site', data.site);
        }
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || "Username atau password salah.");
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setLoginError("Proses verifikasi terlalu lama. Silakan coba lagi.");
      } else {
        setLoginError("Koneksi gagal ke server. Periksa username dan password Anda.");
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRealName('');
    setUserNrp('');
    setUserRole('admin');
    setUserAllowedViews([]);
    setUsernameInput('');
    setPasswordInput('');
    setUserTtdUrl('');
    setLoggedInUsername('');
    setCurrentView('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50 flex flex-col justify-between items-center p-4">
        {/* Spacer to keep login centered */}
        <div className="h-4" />

        {/* Primary Login Container Card */}
        <div className="w-full max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="flex justify-center pb-2">
              <img
                src={companyLogo}
                alt="PT INDOTRUCK UTAMA"
                className="h-24 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">
              HSE ITU SYSTEM
            </h1>
            <p className="text-xs text-slate-500">
              Sistem Manajemen Data & Inventory Indotruck Utama
            </p>

          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan Username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan Password"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer select-none"
            >
              {isLoginLoading ? 'Memverifikasi...' : 'Sign In'}
            </button>
          </form>


        </div>

        {/* Footer credits */}
        <div className="text-[10px] text-slate-400 text-center py-2">
          HSE Dept. © 2026 PT. Indotruck Utama. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-40 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <img
            src={companyLogo}
            alt="PT INDOTRUCK UTAMA"
            className="h-10 w-10 object-contain rounded-xl shadow-sm bg-slate-50 border border-slate-100 p-0.5"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
              HSE ITU - SISTEM MANAJEMEN DATA
            </h1>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
              Selamat datang, <span className="font-extrabold text-indigo-600">{userRealName}</span>
              {userRole === 'admin' ? (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-slate-950 text-white uppercase tracking-wider">Admin</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wider">Operator</span>
              )}
            </p>
          </div>
        </div>

        {/* Status badges, site switcher & user menu */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end relative">
          {userRole === 'admin' ? (
            <SiteHeaderSwitcher
              activeSite={activeSite}
              onSelectSite={(newSite) => {
                setActiveSite(newSite);
                localStorage.setItem('hse_active_site', newSite);
              }}
            />
          ) : (
            <SiteBadge site={activeSite} size="sm" />
          )}

          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline-block">Pengaturan Akun</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <>
              {/* Invisible overlay to close dropdown on click outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)}
              ></div>
              <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-slate-200 shadow-xl rounded-xl py-2 z-50 overflow-hidden transform origin-top-right">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsEditProfileModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <UserCog className="h-4 w-4 text-slate-400" /> Edit Profil
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsSignatureModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Pencil className="h-4 w-4 text-slate-400" /> Tanda Tangan Saya
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-400" /> Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Connection notification banner */}
      {!googleSheetsConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-xs print:hidden">
          <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-normal">
              <b>Koneksi Google Sheets Terbuka:</b> Aplikasi saat ini menyimpan data ke media internal sandbox. Agar sistem langsung tersinkronisasi ke Google Sheet milik Anda (<a href={`https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit`} target="_blank" rel="noreferrer" className="underline font-bold text-indigo-700">Tautan Dokumen</a>), silakan daftarkan kredensial Service Account Anda pada menu rahasia variabel env dengan key <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">GOOGLE_SERVICE_ACCOUNT_JSON</code>.
            </p>
          </div>
        </div>
      )}

      {/* Main Container Work Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-250">
            {/* Module Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              
              {/* APD Module */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('transaksi_apd');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('transaksi_apd');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-805' : 'text-slate-400'
                      }`}>
                        Transaksi APD
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Penerimaan restock, stok masuk & distribusi keluar Alat Pelindung Diri karyawan.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* /Barang Module */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('transaksi_barang');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('transaksi_barang');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-amber-50 border-slate-200 hover:border-amber-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <Warehouse className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-amber-700' : 'text-slate-400'
                      }`}>
                        Transaksi Barang
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pencatatan restock barang umum workshop, peralatan kantor, ATK, dan tools.
                      </p>
                    </div>
                  </div>
                );
              })()}


              {/* Laporan Submenu */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('hse_reports_menu');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('hse_reports_menu');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-slate-100 border-slate-200 hover:border-slate-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <ClipboardList className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-slate-900' : 'text-slate-400'
                      }`}>
                        Laporan Keselamatan dan Kesehatan
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pencatatan skrining Napza, tracking donor darah, dan form K3 Google Form eksternal.
                      </p>
                    </div>
                  </div>
                );
              })()}


              {/* Bugar Selamat */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('bugar_selamat');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('bugar_selamat');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <HeartPulse className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-850' : 'text-slate-400'
                      }`}>
                        Bugar Selamat
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pemantauan form harian kuesioner FTW (Fit-To-Work) tentang daftar bugar & un-fit.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Training */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('training');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('training');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-emerald-50 border-slate-200 hover:border-emerald-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <Award className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-400'
                      }`}>
                        Training Karyawan
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Database log pelatihan keselamatan, sertifikat, dan rekap peringatan kedaluwarsa.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* MCU */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('mcu');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('mcu');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-rose-50 border-slate-200 hover:border-rose-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-rose-50 text-rose-550' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <HeartPulse className="h-6 w-6 text-rose-550" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-rose-700' : 'text-slate-400'
                      }`}>
                        Riwayat MCU
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pencatatan klinis rekap hasil serta status kelulusan Medical Check Up Karyawan Indotruck.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Menu Pengajuan Dokumen */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('pengajuan_menu');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('pengajuan_menu');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <FileText className="h-6 w-6 text-indigo-600" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-900' : 'text-slate-400'
                      }`}>
                        Menu Pengajuan
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pengisian form DPB, BAKT APD, BAK, dan Cuti Karyawan dengan cetak PDF resmi.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Absensi Module */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('absensi');
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('absensi');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-sky-50 border-slate-200 hover:border-sky-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <CalendarCheck className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-sky-700' : 'text-slate-400'
                      }`}>
                        Absensi Kegiatan
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pencatatan daftar hadir kegiatan (Meeting, Safety Talk, Briefing, Training, dll) secara instan.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Monitoring Mine Permit */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('mine_permit_monitoring');
                return (
                  <div
                    id="menu-mine-permit-monitoring"
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('mine_permit_monitoring');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-amber-50 border-slate-200 hover:border-amber-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-amber-100 text-amber-705' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <ShieldCheck className="h-6 w-6 text-amber-600 animate-pulse" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-amber-800' : 'text-slate-400'
                      }`}>
                        Monitoring Expired Mine Permit
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Pantau masa berlaku Mine Permit seluruh karyawan, deteksi kadaluwarsa 4 bulan ke depan.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Menengah Penilaian Vendor */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('vendor_evaluation');
                return (
                  <div
                    id="menu-vendor-evaluation"
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('vendor_evaluation');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <Award className="h-6 w-6 text-indigo-600" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-850' : 'text-slate-400'
                      }`}>
                        Manajemen Penilaian Vendor
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Evaluasi, monitoring, dan audit rapor performa vendor/kontraktor secara periodik digital.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Prosedur Module */}
              {(() => {
                const hasAccess = true; // Everyone can view safety procedures
                return (
                  <div
                    id="menu-prosedur"
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('prosedur');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <ClipboardList className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-850' : 'text-slate-400'
                      }`}>
                        Prosedur K3
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Akses dan kelola dokumen HIRA (Hazard Identification), JSA (Job Safety Analysis), & SOP (Standart Operasional Prosedur).
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Nomor Surat Module */}
              {(() => {
                const hasAccess = userRole === 'admin' || userAllowedViews.includes('nomor_surat');
                return (
                  <div
                    id="menu-nomor-surat"
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('nomor_surat');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-50 text-indigo-650' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <FileText className="h-6 w-6 text-[#5B3DF5]" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-indigo-850' : 'text-slate-400'
                      }`}>
                        Nomor Surat
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Kelola dan simpan daftar penomoran surat resmi berdasarkan departemen secara modern & minimalis.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Monitoring Keselamatan Operasional Module */}
              {(() => {
                const hasAccess = true;
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('monitoring_keselamatan');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'hover:bg-sky-50 border-slate-200 hover:border-sky-400 hover:shadow'
                        : 'opacity-40 filter grayscale border-slate-200/60'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {hasAccess ? <Activity className="h-6 w-6 text-sky-600" /> : <Lock className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-800 group-hover:text-sky-700' : 'text-slate-400'
                      }`}>
                        Monitoring Keselamatan Operasional
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        Sistem pelacakan dan dashboard monitoring kondisi keselamatan operasional harian.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* User Management Module (Admin Only) */}
              {(() => {
                const hasAccess = userRole === 'admin';
                return (
                  <div
                    onClick={() => {
                      if (hasAccess) {
                        setCurrentView('user_management');
                      } else {
                        setNoAccessMessage("Akses Tidak Diberikan, Silahkan Hubungi HSE Administrator");
                      }
                    }}
                    className={`border rounded-2xl p-5 text-white transition group flex flex-col justify-between items-start gap-4 cursor-pointer ${
                      hasAccess
                        ? 'bg-slate-910 border-indigo-500/20 hover:bg-slate-800 hover:border-indigo-400 hover:shadow shadow-sm'
                        : 'bg-slate-910 opacity-40 filter grayscale border-slate-800/60 text-slate-400'
                    }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold ${
                      hasAccess ? 'bg-indigo-505/15 text-indigo-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {hasAccess ? <Users className="h-6 w-6" /> : <Lock className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-extrabold leading-snug ${
                        hasAccess ? 'text-slate-100 group-hover:text-indigo-300' : 'text-slate-400'
                      }`}>
                        Manajemen Pengguna
                      </h3>
                      <p className={`text-[11px] mt-1 leading-normal ${
                        hasAccess ? 'text-slate-400' : 'text-slate-400'
                      }`}>
                        Kelola akun rekan kerja, rincian sandi, dan konfigurasikan hak akses menu secara dinamis.
                      </p>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* View Router Assemblies */}
        {currentView === 'transaksi_apd' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <ApdForm kategori="APD" userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'transaksi_barang' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <ApdForm kategori="Barang" userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'hse_reports_menu' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pelaporan Tambahan Departemen HSE</h2>
                <p className="text-xs text-slate-500 mt-0.5">Silakan pilih menu kesehatan atau keselamatan di bawah ini.</p>
              </div>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-1.5 border border-slate-250 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Inspeksi K3 (Bulanan) */}
              <div
                onClick={() => setCurrentView('inspeksi_k3')}
                className="bg-white hover:bg-teal-50/50 p-6 rounded-2xl border border-slate-200 hover:border-teal-300 transition shadow-sm cursor-pointer flex flex-col justify-between items-start gap-4"
              >
                <div className="h-10 w-10 bg-teal-100 text-teal-650 rounded-xl flex items-center justify-center font-bold">
                  <ClipboardList className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-805">Inspeksi K3 (Bulanan)</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pemeriksaan periodik kondisi fisik aset di lapangan (dilengkapi upload lampiran foto bukti).
                  </p>
                </div>
              </div>

              {/* NAPZA */}
              <div
                onClick={() => setCurrentView('napza')}
                className="bg-white hover:bg-purple-50/50 p-6 rounded-2xl border border-slate-200 hover:border-purple-300 transition shadow-sm cursor-pointer flex flex-col justify-between items-start gap-4"
              >
                <div className="h-10 w-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center font-bold">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-805">Hasil Skrining NAPZA</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pelaporan periodik kepatuhan bebas narkotika dan obat-obatan terlarang.
                  </p>
                </div>
              </div>

              {/* Donor Darah */}
              <div
                onClick={() => setCurrentView('donor_darah')}
                className="bg-white hover:bg-rose-50/50 p-6 rounded-2xl border border-slate-200 hover:border-rose-350 transition shadow-sm cursor-pointer flex flex-col justify-between items-start gap-4"
              >
                <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-bold">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-805">Laporan Donor Darah</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mengarsipkan partisipasi donor serta status kriteria tensi tekanan darah.
                  </p>
                </div>
              </div>

              {/* Temuan MIO */}
              <div
                onClick={() => setCurrentView('temuan_mio')}
                className="bg-white hover:bg-indigo-50/50 p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 transition shadow-sm cursor-pointer flex flex-col justify-between items-start gap-4"
              >
                <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-805">Closing Temuan MIO</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pemandu penutupan audit penyimpangan Management Inspection & Observation lapangan.
                  </p>
                </div>
              </div>

              {/* External Temuan K3 Google Form */}
              <a
                href="https://docs.google.com/forms/d/1_9iE2VfB7K4G-a-D_T3z6-f-A_z-N_8-"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-350 transition shadow-sm cursor-pointer flex flex-col justify-between items-start gap-4 group"
              >
                <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-805 flex items-center gap-1 group-hover:text-indigo-650">
                    Form Temuan K3 <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Menghubungkan langsung ke tautan Form K3 eksternal untuk audit insiden lapangan.
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {currentView === 'napza' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <NapzaForm userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('hse_reports_menu')} />
          </div>
        )}

        {currentView === 'donor_darah' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <DonorDarahForm userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('hse_reports_menu')} />
          </div>
        )}

        {currentView === 'bugar_selamat' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <BugarSelamat onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'training' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <TrainingManager userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'mcu' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 font-sans">
            <McuManager userRealName={userRealName} activeSite={activeSite as string} userRole={userRole} onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'inspeksi_k3' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <InspeksiK3 userRealName={userRealName} userRole={userRole} activeSite={activeSite as string} onBack={() => setCurrentView('hse_reports_menu')} />
          </div>
        )}

        {currentView === 'temuan_mio' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <TemuanMio userRealName={userRealName} onBack={() => setCurrentView('hse_reports_menu')} />
          </div>
        )}

        {currentView === 'pengajuan_menu' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <PengajuanMenu 
              onSelectForm={(formId) => {
                if (formId === 'dpb') setCurrentView('dpb');
                if (formId === 'bakt_apd') setCurrentView('bakt_apd');
                if (formId === 'bak') setCurrentView('bak');
              }} 
              onBack={() => setCurrentView('dashboard')} 
            />
          </div>
        )}

        {currentView === 'dpb' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <DpbForm 
              userRealName={userRealName} 
              userRole={userRole} 
              username={loggedInUsername}
              onBack={() => setCurrentView('pengajuan_menu')} 
            />
          </div>
        )}

        {currentView === 'bakt_apd' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <BaktApdForm 
              userRealName={userRealName} 
              userRole={userRole} 
              userTtdUrl={userTtdUrl}
              username={loggedInUsername}
              onBack={() => setCurrentView('pengajuan_menu')} 
            />
          </div>
        )}

        {currentView === 'bak' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <BakForm 
              userRealName={userRealName} 
              userRole={userRole} 
              userTtdUrl={userTtdUrl}
              username={loggedInUsername}
              onBack={() => setCurrentView('pengajuan_menu')} 
            />
          </div>
        )}

        {currentView === 'absensi' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <Absensi userRealName={userRealName} userNrp={userNrp} userRole={userRole} onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'nomor_surat' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <NomorSurat 
              userRealName={userRealName} 
              userNrp={userNrp} 
              userRole={userRole} 
              onBack={() => setCurrentView('dashboard')} 
            />
          </div>
        )}

        {currentView === 'mine_permit_monitoring' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <MinePermitMonitoring 
              activeSite={activeSite} 
              userRole={userRole}
              onBack={() => setCurrentView('dashboard')} 
            />
          </div>
        )}

        {currentView === 'user_management' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <UserManagement onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'vendor_evaluation' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <VendorPenilaian 
              userRealName={userRealName} 
              userRole={userRole} 
              username={loggedInUsername}
              onBack={() => setCurrentView('dashboard')} 
            />
          </div>
        )}

        {currentView === 'prosedur' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <ProsedurManager
              userRealName={userRealName}
              userRole={userRole}
              userTtdUrl={userTtdUrl}
              onBack={() => setCurrentView('dashboard')}
            />
          </div>
        )}

        {currentView === 'monitoring_keselamatan' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Monitoring Keselamatan Operasional (SPIP)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Sistem pelacakan dan dashboard monitoring kondisi keselamatan operasional harian terintegrasi.</p>
              </div>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3.5 py-1.5 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-700"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" /> Kembali ke Dashboard
              </button>
            </div>
            
            <SpipDashboard 
              userRealName={userRealName}
              userRole={userRole}
              onBack={() => setCurrentView('dashboard')}
            />
          </div>
        )}
      </main>

      {/* Corporate footer badge */}
      <footer className="print:hidden bg-white border-t border-gray-200 py-4 text-center text-xs text-slate-550 flex items-center justify-center gap-1 shrink-0">
        PT. Indotruck Utama | Departemen HSE
      </footer>

      {noAccessMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150">
            <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Akses Dibatasi</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {noAccessMessage}
              </p>
            </div>
            <button
              onClick={() => setNoAccessMessage(null)}
              className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        username={loggedInUsername}
        currentTtdUrl={userTtdUrl}
        onSaveSuccess={(newUrl) => setUserTtdUrl(newUrl)}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentUsername={loggedInUsername}
      />

      <AppsScriptModal 
        isOpen={isAppsScriptModalOpen} 
        onClose={() => setIsAppsScriptModalOpen(false)} 
      />
    </div>
  );
}
