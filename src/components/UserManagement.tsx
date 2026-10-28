import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldAlert,
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Key,
  Mail,
  User,
  Hash,
  Save,
  Check,
  Edit2
} from 'lucide-react';
import { PageHeader, SiteBadge, SiteFilterSelect } from './common/index.js';
import { SITES, SiteFilter, SiteId } from '../constants/sites.js';

interface UserObj {
  nrp: string;
  nama: string;
  email: string;
  username: string;
  password?: string;
  role: 'admin' | 'operator';
  allowedViews: string[];
  site?: string;
  ttdUrl?: string;
}

interface UserManagementProps {
  onBack: () => void;
}

const MODULE_LIST = [
  { key: 'transaksi_apd', label: 'Transaksi APD', desc: 'Penerimaan restock, stok masuk & distribusi keluar APD' },
  { key: 'transaksi_barang', label: 'Transaksi Barang', desc: 'Pencatatan restock barang umum workshop, tools & ATK' },
  { key: 'hse_reports_menu', label: 'Laporan Keselamatan', desc: 'Skrining Napza, tracking donor darah & link eksternal' },
  { key: 'history_karyawan', label: 'History Data Karyawan', desc: 'Peninjauan riwayat log silang per individu' },
  { key: 'bugar_selamat', label: 'Bugar Selamat', desc: 'Pemantauan form harian kuesioner FTW (Fit-To-Work)' },
  { key: 'training', label: 'Training Karyawan', desc: 'Pencatatan logs pelatihan & monitoring sertifikat' },
  { key: 'mcu', label: 'Riwayat MCU', desc: 'Pencatatan rekap hasil Medical Check Up' },
  { key: 'pengajuan_menu', label: 'Menu Pengajuan BAKT', desc: 'Pengisian form Berita Acara Kerusakan/Penggantian' },
  { key: 'absensi', label: 'Absensi Kegiatan', desc: 'Pengelolaan daftar hadir/absensi meeting, briefing & training' },
  { key: 'nomor_surat', label: 'Nomor Surat', desc: 'Kelola daftar penomoran surat resmi berdasarkan departemen' },
  { key: 'mine_permit_monitoring', label: 'Monitoring Expired Mine Permit', desc: 'Pemantauan validitas & tanggal kedaluwarsa Mine Permit karyawan' },
  { key: 'vendor_evaluation', label: 'Manajemen Penilaian Vendor', desc: 'Sistem pengukuran kepatuhan, mutu, safety, dan mutu layanan rekan operasional digital' }
];

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<UserObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [nrp, setNrp] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [allowedViews, setAllowedViews] = useState<string[]>([]);
  const [userSite, setUserSite] = useState<string>('ITU-Admo');
  const [tableSiteFilter, setTableSiteFilter] = useState<SiteFilter>('ALL');
  const [ttdUrl, setTtdUrl] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.list || []);
      } else {
        setError('Gagal memuat daftar pengguna.');
      }
    } catch (e) {
      setError('Koneksi server gagal.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNrp('');
    setNama('');
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('operator');
    setAllowedViews([]);
    setUserSite('ITU-Admo');
    setTtdUrl('');
    setIsEditing(false);
  };

  const handleEditClick = (u: UserObj) => {
    setNrp(u.nrp);
    setNama(u.nama);
    setEmail(u.email);
    setUsername(u.username);
    setPassword(u.password || '');
    setRole(u.role);
    setAllowedViews(u.allowedViews || []);
    setUserSite(u.site || (u.role === 'admin' ? 'ALL' : 'ITU-Admo'));
    setTtdUrl(u.ttdUrl || '');
    setIsEditing(true);
    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckboxChange = (viewKey: string) => {
    if (allowedViews.includes(viewKey)) {
      setAllowedViews(allowedViews.filter(v => v !== viewKey));
    } else {
      setAllowedViews([...allowedViews, viewKey]);
    }
  };

  const handleSelectAll = () => {
    setAllowedViews(MODULE_LIST.map(m => m.key));
  };

  const handleClearAll = () => {
    setAllowedViews([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nama.trim() || !password.trim()) {
      setError('Harap isi Nama, Username, dan Password!');
      return;
    }

    try {
      const payload = {
        nrp,
        nama,
        email,
        username,
        password,
        role,
        site: userSite,
        allowedViews: role === 'admin' ? [] : allowedViews,
        ttdUrl
      };

      const res = await fetch('/api/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEditing ? 'Data pengguna berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!');
        resetForm();
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(data.message || 'Gagal menyimpan data.');
      }
    } catch (err) {
      setError('Gagal mengirim data ke server.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <PageHeader
        title="Manajemen Pengguna & Hak Akses"
        subtitle="Kelola akun rekan kerja dan batasi menu apa saja yang diperbolehkan untuk diakses."
        onBack={onBack}
        icon={<Users className="h-6 w-6" />}
      />

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-2 text-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto underline font-bold">X</button>
        </div>
      )}

      {/* Grid Layout: Left is Form, Right is List of Users */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Registration/Edit Form */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-200 pb-2">
            {isEditing ? <Edit2 className="h-4 w-4 text-amber-600" /> : <UserPlus className="h-4 w-4 text-indigo-600" />}
            {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">NRP / NIK (Opsional)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={nrp}
                  onChange={(e) => setNrp(e.target.value)}
                  placeholder="Contoh: 12345"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={nama}
                  required
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Muhammad Rifki Hidayat"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Email (Opsional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@indotruck-utama.co.id"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Username Login</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    required
                    disabled={isEditing}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="rifki"
                    className="w-full pl-9 pr-3 py-2 bg-white disabled:bg-slate-200 rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sandi Rahasia"
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Tingkatan Peran (Role)</label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRole('operator')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                    role === 'operator'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Operator (Terbatas)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                    role === 'admin'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Admin (Bisa Semua)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                <span>Penempatan Lokasi / Site</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">wilayah kerja akun</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUserSite('ALL')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition text-left cursor-pointer flex items-center justify-between ${
                    userSite === 'ALL'
                      ? 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>🌐 Semua Site</span>
                  {userSite === 'ALL' && <Check className="h-3.5 w-3.5 text-purple-600" />}
                </button>
                {SITES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setUserSite(s.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition text-left cursor-pointer flex items-center justify-between ${
                      userSite === s.id
                        ? `${s.badgeBg} ${s.badgeText} ${s.badgeBorder} ring-1 ring-indigo-200`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">📍 {s.name}</span>
                    {userSite === s.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Signature Upload & Settings for Admin */}
            <div className="space-y-1.5 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">Tanda Tangan (TTD) Digital</label>
              {ttdUrl ? (
                <div className="bg-white border border-indigo-100 rounded-lg p-2.5 flex flex-col items-center gap-1.5 shadow-sm">
                  <p className="text-[9px] text-slate-400 font-bold">Preview TTD untuk pengguna ini:</p>
                  <img
                    src={ttdUrl.startsWith('data:') ? ttdUrl : `/api/drive-proxy?url=${encodeURIComponent(ttdUrl)}`}
                    alt="TTD Preview"
                    className="h-10 object-contain max-w-full bg-slate-50 border rounded p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setTtdUrl('')}
                    className="text-[10px] text-rose-600 hover:underline font-extrabold"
                  >
                    Hapus Tanda Tangan
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic pb-1">Belum ada tanda tangan digital yang tersimpan.</p>
              )}
              <div className="space-y-1">
                <p className="text-[9px] text-indigo-750 font-bold">Unggah file TTD baru (PNG/JPG):</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setTtdUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Checkbox list of views - only active if role is 'operator' */}
            {role === 'operator' && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase">Izinkan Akses Menu:</span>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-indigo-600 hover:underline font-bold"
                    >
                      Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-slate-500 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="space-y-2 h-48 overflow-y-auto pr-1">
                  {MODULE_LIST.map((mod) => {
                    const isChecked = allowedViews.includes(mod.key);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => handleCheckboxChange(mod.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer select-none ${
                          isChecked 
                            ? 'bg-white border-indigo-400 shadow-sm' 
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-350'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-none">{mod.label}</p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5 leading-snug">{mod.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-grow bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> {isEditing ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>


        {/* Desktop User Table & Mobile List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Daftar Pengguna ({users.filter(u => tableSiteFilter === 'ALL' || u.site === tableSiteFilter || u.site === 'ALL').length})
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Akun terdaftar dan hak akses per-site operasional
              </p>
            </div>
            <SiteFilterSelect
              value={tableSiteFilter}
              onChange={setTableSiteFilter}
              allLabel="Semua Site Penempatan"
              size="sm"
              className="sm:w-60"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Memuat data pengguna dari sistem...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada data pengguna yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-2">User &amp; Detail</th>
                    <th className="pb-2">Penempatan Site</th>
                    <th className="pb-2">Username / Sandi</th>
                    <th className="pb-2">Peran &amp; Akses</th>
                    <th className="pb-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users
                    .filter(u => tableSiteFilter === 'ALL' || u.site === tableSiteFilter || u.site === 'ALL')
                    .map((u) => {
                    const isAdmin = u.role === 'admin';
                    return (
                      <tr key={u.username} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="font-extrabold text-slate-800">{u.nama}</div>
                          {u.nrp && <div className="text-[10px] text-slate-400 font-mono">NIK: {u.nrp}</div>}
                          {u.email && <div className="text-[10px] text-slate-400">{u.email}</div>}
                          {u.ttdUrl ? (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-extrabold uppercase">✓ TTD Ada</span>
                              <img
                                src={u.ttdUrl.startsWith('data:') ? u.ttdUrl : `/api/drive-proxy?url=${encodeURIComponent(u.ttdUrl)}`}
                                alt="Signature preview"
                                className="h-4 max-w-[60px] object-contain bg-white border border-slate-200 rounded p-0.5"
                              />
                            </div>
                          ) : (
                            <span className="text-[8px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded font-extrabold uppercase inline-block mt-1 border border-amber-100">✖ No TTD</span>
                          )}
                        </td>
                        <td className="py-3">
                          <SiteBadge site={u.site || (isAdmin ? 'ALL' : 'ITU-Admo')} size="xs" />
                        </td>
                        <td className="py-3">
                          <div className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] inline-block font-bold mb-1">
                            {u.username}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Key className="h-2.5 w-2.5" /> {u.password ? u.password : '•••'}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="mb-1">
                            {isAdmin ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-900 text-white flex items-center gap-1 w-max">
                                <Shield className="h-2.5 w-2.5 text-indigo-400" /> Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1 w-max">
                                <ShieldAlert className="h-2.5 w-2.5" /> Operator
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[9px] text-slate-500 max-w-[200px] truncate leading-normal">
                            {isAdmin ? (
                              <span className="font-semibold text-slate-500">Akses Penuh Semua Menu</span>
                            ) : u.allowedViews && u.allowedViews.length > 0 ? (
                              <span>Menu ({u.allowedViews.length}): {u.allowedViews.map(v => MODULE_LIST.find(m => m.key === v)?.label || v).join(', ')}</span>
                            ) : (
                              <span className="text-amber-600 font-bold">Akses Kosong (Hanya Dashboard)</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-600 border border-indigo-100 rounded-lg hover:shadow-xs font-bold transition flex items-center gap-1 text-[10px] ml-auto cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 bg-blue-50 border border-blue-105 rounded-xl p-3 text-[10.5px] text-blue-800 leading-normal">
                💡 <b>Catatan Google Sheets:</b> Registrasi baru di atas akan langsung sinkron sebagai baris data baru ke lembar kerja <b>&apos;Login Pengguna&apos;</b> pada dokumen Google Spreadsheet milik Anda.
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
