import React from 'react';
import { MapPin } from 'lucide-react';
import { getSiteInfo, normalizeSiteId, SiteId } from '../../constants/sites.js';

interface SiteBadgeProps {
  site?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const SiteBadge: React.FC<SiteBadgeProps> = ({
  site,
  size = 'xs',
  showIcon = true,
  className = ''
}) => {
  if (!site || site === 'ALL' || site.toLowerCase() === 'semua site') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold rounded-lg border bg-purple-50 text-purple-700 border-purple-200 ${
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${className}`}>
        {showIcon && <MapPin className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
        <span>Semua Site</span>
      </span>
    );
  }

  const siteId = normalizeSiteId(site);
  const info = getSiteInfo(siteId);

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${info.badgeBg} ${info.badgeText} ${info.badgeBorder} ${
      size === 'xs' ? 'px-2 py-0.5 text-[10.5px]' : size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
    } ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${info.dotColor} shrink-0`} />
      {showIcon && <MapPin className={size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      <span>{info.name}</span>
    </span>
  );
};

export default SiteBadge;
