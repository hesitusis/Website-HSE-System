import { SiteId, SiteFilter } from './constants/sites.js';
export type { SiteId, SiteFilter };

export interface UserLogin {
  nrp?: string;
  nama: string;
  email?: string;
  site?: SiteId | string;
}

export interface InventoryItem {
  barang: string;
  total: number;
  site?: SiteId | string;
}

export interface InventoryHistory {
  timestamp: string;
  jenis: 'Barang Masuk' | 'Barang Keluar' | string;
  kategori: 'APD' | 'Barang' | string;
  barang: string;
  jumlah: number;
  keterangan: string;
  oleh: string;
  site?: SiteId | string;
}

export interface NapzaRecord {
  id?: string;
  rowId?: number | string;
  timestamp: string;
  nama: string;
  nrp: string;
  jabatan: string;
  periode: string;
  hasil: 'Negatif' | 'Positif' | 'Invalid' | string;
  dokumen: string;
  oleh: string;
  site?: SiteId | string;
}

export interface DonorDarahRecord {
  timestamp: string;
  nama: string;
  nrp: string;
  jabatan: string;
  tglDonor: string;
  lokasi: string;
  tensi: string;
  hasil: string;
  oleh: string;
  site?: SiteId | string;
}

export interface TrainingRecord {
  timestamp: string;
  nama: string;
  nrp: string;
  training: string;
  tglPelaksanaan: string;
  tglExpired: string;
  sertifikatUrl: string;
  oleh: string;
  site?: SiteId | string;
}

export interface MCURecord {
  rowId: number;
  timestamp: string;
  nrp: string;
  nama: string;
  tglMcu: string;
  jenisMcu: string;
  hasilMcu: string;
  statusMcu: 'Lulus' | 'Tidak Lulus' | 'Perlu Tindak Lanjut' | string;
  tglExpiredMcu: string;
  catatanMcu: string;
  operator: string;
  site?: SiteId | string;
}

export interface InspeksiItem {
  idInspeksi: string;
  posisi: string;
  namaBarang: string;
  idAlat: string;
  tanggal: string;
  pic: string;
  kondisi: 'Baik' | 'Rusak' | 'Hilang' | string;
  temuan: string;
  linkFoto: string;
  site?: SiteId | string;
}

export interface MasterAsetItem {
  posisi: string;
  idAlat: string;
  namaBarang: string;
}

export interface BugarRecord {
  tanggal: string;
  nrp: string;
  nama: string;
  jabatan: string;
  atasan: string;
}

export interface TemuanMioRecord {
  rowId: number;
  tanggal: string;
  sebelum: string;
  penyimpangan: string;
  lokasi: string;
  detailLokasi: string;
  tindakanPerbaikan: string;
  priority: string;
  pic: string;
  section: string;
  batasWaktu: string;
  tanggalPerbaikan: string;
  kategoriTemuan: string;
  buktiTindakLanjut: string;
  status: string;
}

export interface ProsedurRecord {
  id: string;
  type: 'hira' | 'jsa' | 'sop';
  documentNo: string;
  title: string;
  department: string;
  date: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;

  // Metadata JSA & SOP Resmi
  namaJabatan?: string;        // e.g. Grup Leader
  seksiDepartemen?: string;    // e.g. Plant Hauler & Wheel Loader
  jabatanSuperior?: string;    // e.g. Unit Head
  disusunOleh?: string;        // Nama penyusun
  diperiksaOleh?: string;      // Nama pemeriksa
  disetujuiOleh?: string;      // Nama penyetuju
  noRevisi?: string;           // No revisi
  direviewOleh?: string;       // Reviewer (e.g. Muhammad Ali - SHE Officer)
  apdWajib?: string;           // APD yang harus dipakai
  lokasiKerja?: string;        // Lokasi Kerja (e.g. PT Saptaindra Sejati Site Admo)

  // HIRA specific fields
  hiraRows?: {
    id: string;
    activity: string;
    hazard: string;
    risk: string;
    initProbability: number; // 1-5
    initSeverity: number; // 1-5
    initRiskScore: number; // probability * severity
    initRiskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
    mitigation: string;
    resProbability: number; // 1-5
    resSeverity: number; // 1-5
    resRiskScore: number; // probability * severity
    resRiskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  }[];

  // JSA specific fields (Hierarchical / Bersarang)
  jsaSteps?: {
    id: string;
    stepNo: number;
    stepDescription: string;
    hazards: {
      id: string;
      hazardNo: string; // e.g. "1.1"
      hazardDescription: string;
      actions: {
        id: string;
        actionNo: string; // e.g. "1.1.1"
        actionDescription: string;
      }[];
    }[];
  }[];

  // SOP specific fields
  sopPurpose?: string;
  sopScope?: string;
  sopReferences?: string;
  sopToolsMaterials?: string;
  sopSteps?: {
    id: string;
    stepNo: number;
    title: string;
    description: string;
  }[];
}

