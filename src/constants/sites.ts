export type SiteId = 'ITU-Admo' | 'ITU-MMI' | 'ITU-Vale';
export type SiteFilter = SiteId | 'ALL';

export interface SiteInfo {
  id: SiteId;
  name: string;
  shortName: string;
  fullName: string;
  location: string;
  description: string;
  color: 'emerald' | 'blue' | 'amber';
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  bgLight: string;
  dotColor: string;
}

export const SITES: SiteInfo[] = [
  {
    id: 'ITU-Admo',
    name: 'ITU-Admo',
    shortName: 'Admo',
    fullName: 'PT Indotruck Utama - Site Admo (SIS Adaro Tutupan)',
    location: 'Adaro Tutupan, Tabalong, Kalimantan Selatan',
    description: 'Site Operation FMC SIS Adaro Tutupan Project',
    color: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    bgLight: 'bg-emerald-500/10',
    dotColor: 'bg-emerald-500'
  },
  {
    id: 'ITU-MMI',
    name: 'ITU-MMI',
    shortName: 'MMI',
    fullName: 'PT Indotruck Utama - Site MMI (Merdeka Mining Indonesia)',
    location: 'Site Merdeka Mining Indonesia (MMI)',
    description: 'Site Operation MMI Mining Support & Fleet',
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    bgLight: 'bg-blue-500/10',
    dotColor: 'bg-blue-500'
  },
  {
    id: 'ITU-Vale',
    name: 'ITU-Vale',
    shortName: 'Vale',
    fullName: 'PT Indotruck Utama - Site Vale',
    location: 'Site Vale Indonesia, Sorowako, Sulawesi Selatan',
    description: 'Site Operation Vale Nickel Mining Project',
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    bgLight: 'bg-amber-500/10',
    dotColor: 'bg-amber-500'
  }
];

export const DEFAULT_SITE_ID: SiteId = 'ITU-Admo';

export function getSiteInfo(siteId?: string | null): SiteInfo {
  if (!siteId) return SITES[0];
  const found = SITES.find(s => s.id.toLowerCase() === siteId.toLowerCase() || s.name.toLowerCase() === siteId.toLowerCase());
  return found || SITES[0];
}

export function isValidSiteId(id: string): id is SiteId {
  return SITES.some(s => s.id === id);
}

export function normalizeSiteId(raw?: string | null): SiteId {
  if (!raw) return DEFAULT_SITE_ID;
  const lower = raw.toLowerCase().trim();
  if (lower.includes('mmi')) return 'ITU-MMI';
  if (lower.includes('vale')) return 'ITU-Vale';
  if (lower.includes('admo') || lower.includes('adaro') || lower.includes('sis')) return 'ITU-Admo';
  return DEFAULT_SITE_ID;
}
