import React from 'react';

export interface AdSlotProps {
  slotId?: string;
  format?: 'banner' | 'card' | 'inline';
  className?: string;
}

/**
 * Reusable AdSlot Abstraction & AdSense Configuration Boundary
 * 
 * Supports production Google AdSense integration via environment variables:
 * - VITE_ADSENSE_PUBLISHER_ID (e.g. ca-pub-XXXXXXXXXXXXXXXX)
 * - VITE_ADSENSE_ENABLED ('true' to render live ads in production when configured)
 * 
 * Safety & Privacy Boundaries:
 * - If publisher ID or enabled flag is absent, renders a clean professional placeholder slot.
 * - Ads are strictly presentation-only and positioned away from inputs, 3D controls, and calculation buttons.
 * - Complies with non-intrusive ad standards.
 */
export const AdSlot: React.FC<AdSlotProps> = ({
  slotId,
  format = 'banner',
  className = '',
}) => {
  // Read environment configuration safely via Vite import.meta.env
  const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;
  const adsEnabled = import.meta.env.VITE_ADSENSE_ENABLED === 'true';

  // If live AdSense is configured and enabled, we render the canonical ins script tag.
  // Otherwise, we display a professional dev/fallback placeholder matching the design language.
  const isLive = Boolean(adsEnabled && publisherId && slotId);

  if (isLive) {
    return (
      <div
        aria-label="Advertisement"
        className={`my-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-center select-none ${className}`}
      >
        <div className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase mb-1">
          Advertisement
        </div>
        <ins
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-ad-format={format === 'banner' ? 'auto' : format}
          data-full-width-responsive="true"
        />
        <script>
          {`(adsbygoogle = window.adsbygoogle || []).push({});`}
        </script>
      </div>
    );
  }

  return (
    <div
      aria-label="Advertisement"
      className={`my-4 p-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/40 text-center select-none transition hover:border-slate-700/80 ${className}`}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 inline-block"></span>
          Sponsored Placement
        </span>
        <div className="text-xs text-slate-400 font-medium">
          {format === 'banner' && 'Construction Material & Tool Partner Banner'}
          {format === 'card' && 'Verified Contractor & Estimator Feature'}
          {format === 'inline' && 'Building Supply & Equipment Partner'}
        </div>
        {slotId && (
          <span className="text-[10px] text-slate-600 font-mono mt-0.5">
            Slot ID: {slotId}
          </span>
        )}
      </div>
    </div>
  );
};

