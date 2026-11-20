import React, { useState } from 'react';
import type { EquipmentCategory } from '../types/domain';

interface AssetIllustrationProps {
  category: EquipmentCategory;
  code: string;
  name: string;
  photoDataUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CategorySchematicSvg: React.FC<{ category: EquipmentCategory }> = ({
  category,
}) => {
  switch (category) {
    case 'Climatização':
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="hvacBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CFDCE8" />
            </linearGradient>
            <linearGradient id="hvacFan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#176B5B" />
              <stop offset="100%" stopColor="#0E4A3E" />
            </linearGradient>
          </defs>
          {/* Base shadow & concrete plinth */}
          <rect x="20" y="114" width="160" height="10" rx="2" fill="#9FB3C8" opacity="0.55" />
          {/* Main chiller cabinet */}
          <rect x="24" y="22" width="152" height="92" rx="6" fill="url(#hvacBody)" stroke="#17324D" strokeWidth="2.2" />
          {/* Top cornice */}
          <rect x="22" y="18" width="156" height="9" rx="3" fill="#17324D" />
          {/* Fan housing */}
          <rect x="34" y="34" width="80" height="70" rx="5" fill="#FFFFFF" stroke="#647F99" strokeWidth="1.6" />
          <circle cx="74" cy="69" r="27" fill="#E9F0F6" stroke="#17324D" strokeWidth="2" />
          <circle cx="74" cy="69" r="22" fill="none" stroke="#8FA7BE" strokeWidth="1" strokeDasharray="3 2" />
          {/* Fan blades */}
          <path
            d="M74 44 C79 52, 80 61, 74 69 C82 64, 91 64, 99 69 C91 74, 82 74, 74 69 C79 77, 79 86, 74 94 C69 86, 68 77, 74 69 C66 74, 57 74, 49 69 C57 64, 66 64, 74 69 C69 61, 69 52, 74 44 Z"
            fill="url(#hvacFan)"
          />
          <circle cx="74" cy="69" r="5" fill="#17324D" />
          {/* Louvers & control panel */}
          <rect x="124" y="34" width="42" height="34" rx="3" fill="#DDE6F0" stroke="#647F99" strokeWidth="1.2" />
          <line x1="130" y1="42" x2="160" y2="42" stroke="#4D6B88" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="130" y1="50" x2="160" y2="50" stroke="#4D6B88" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="130" y1="58" x2="160" y2="58" stroke="#4D6B88" strokeWidth="2.5" strokeLinecap="round" />
          {/* Digital controller box */}
          <rect x="124" y="74" width="42" height="30" rx="3" fill="#17324D" />
          <rect x="129" y="79" width="22" height="10" rx="1.5" fill="#23A58C" />
          <circle cx="158" cy="84" r="2.5" fill="#F2B84B" />
          <circle cx="158" cy="94" r="2.5" fill="#4ADE80" />
        </svg>
      );
    case 'Compressores':
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="tankGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DCE8F4" />
              <stop offset="50%" stopColor="#B8CCE0" />
              <stop offset="100%" stopColor="#8CA7C2" />
            </linearGradient>
            <linearGradient id="motorGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1D836F" />
              <stop offset="100%" stopColor="#115145" />
            </linearGradient>
          </defs>
          {/* Floor pad */}
          <rect x="20" y="114" width="160" height="8" rx="2" fill="#9FB3C8" opacity="0.5" />
          {/* Tank feet */}
          <rect x="44" y="102" width="14" height="12" rx="2" fill="#17324D" />
          <rect x="142" y="102" width="14" height="12" rx="2" fill="#17324D" />
          {/* Pressure air receiver tank */}
          <rect x="26" y="64" width="148" height="40" rx="20" fill="url(#tankGrad)" stroke="#17324D" strokeWidth="2.2" />
          <line x1="50" y1="72" x2="150" y2="72" stroke="#FFFFFF" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
          {/* Compressor head unit */}
          <rect x="46" y="24" width="66" height="40" rx="5" fill="url(#motorGrad)" stroke="#17324D" strokeWidth="2" />
          <line x1="56" y1="34" x2="102" y2="34" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />
          <line x1="56" y1="42" x2="102" y2="42" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />
          <line x1="56" y1="50" x2="102" y2="50" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.45" strokeLinecap="round" />
          {/* Piping & pressure gauge */}
          <path d="M112 44 L138 44 L138 64" fill="none" stroke="#17324D" strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="138" cy="36" r="14" fill="#FFFFFF" stroke="#17324D" strokeWidth="2" />
          <circle cx="138" cy="36" r="10" fill="#F4F7FA" stroke="#8FA7BE" strokeWidth="1" />
          <line x1="138" y1="36" x2="145" y2="29" stroke="#B76A12" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="138" cy="36" r="2.2" fill="#17324D" />
          {/* Valve wheel */}
          <rect x="74" y="78" width="52" height="12" rx="2" fill="#17324D" />
          <rect x="78" y="81" width="44" height="6" rx="1" fill="#F2B84B" />
        </svg>
      );
    case 'Movimentação':
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="forkBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6C453" />
              <stop offset="100%" stopColor="#D4941E" />
            </linearGradient>
          </defs>
          {/* Bay line */}
          <rect x="16" y="114" width="168" height="8" rx="2" fill="#9FB3C8" opacity="0.45" />
          {/* Counterweight & chassis */}
          <rect x="34" y="62" width="76" height="42" rx="7" fill="url(#forkBody)" stroke="#17324D" strokeWidth="2.2" />
          <rect x="34" y="82" width="22" height="16" rx="3" fill="#17324D" />
          {/* Overhead ROPS cabin */}
          <path d="M48 62 L56 26 L98 26 L104 62" fill="none" stroke="#17324D" strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="64" y="21" width="10" height="5" rx="2" fill="#D9822B" />
          {/* Seat */}
          <path d="M68 62 L68 48 L78 48" fill="none" stroke="#17324D" strokeWidth="4" strokeLinecap="round" />
          {/* Mast & forks */}
          <rect x="114" y="18" width="9" height="90" rx="2" fill="#35506B" stroke="#17324D" strokeWidth="1.8" />
          <rect x="123" y="92" width="52" height="7" rx="2" fill="#17324D" />
          <rect x="123" y="72" width="12" height="26" rx="2" fill="#526980" />
          {/* Wheels */}
          <circle cx="52" cy="105" r="13" fill="#17324D" />
          <circle cx="52" cy="105" r="5.5" fill="#DCE4EC" />
          <circle cx="98" cy="105" r="13" fill="#17324D" />
          <circle cx="98" cy="105" r="5.5" fill="#DCE4EC" />
        </svg>
      );
    case 'Energia':
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="genHousing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD8E6" />
            </linearGradient>
          </defs>
          <rect x="18" y="114" width="164" height="8" rx="2" fill="#9FB3C8" opacity="0.5" />
          {/* Exhaust stack */}
          <path d="M48 32 L48 16 L60 16" fill="none" stroke="#4D6B88" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Steel skid base */}
          <rect x="26" y="102" width="148" height="12" rx="2" fill="#17324D" />
          {/* Main canopy */}
          <rect x="28" y="32" width="144" height="70" rx="6" fill="url(#genHousing)" stroke="#17324D" strokeWidth="2.2" />
          {/* Inspection door */}
          <rect x="38" y="42" width="58" height="50" rx="3" fill="#FFFFFF" stroke="#647F99" strokeWidth="1.5" />
          <path d="M70 50 L58 68 L67 68 L62 84 L78 64 L68 64 Z" fill="#D9822B" stroke="#17324D" strokeWidth="1" />
          {/* Digital control module */}
          <rect x="106" y="42" width="56" height="50" rx="4" fill="#17324D" />
          <rect x="113" y="49" width="42" height="18" rx="2" fill="#176B5B" />
          <text x="117" y="61" fill="#FFFFFF" fontSize="9" fontFamily="monospace" fontWeight="bold">220V OK</text>
          <circle cx="118" cy="79" r="3.5" fill="#4ADE80" />
          <circle cx="131" cy="79" r="3.5" fill="#FBBF24" />
          <circle cx="144" cy="79" r="3.5" fill="#B42318" />
        </svg>
      );
    case 'Elétrica':
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="panelCab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E9EFF5" />
              <stop offset="100%" stopColor="#C4D2E0" />
            </linearGradient>
          </defs>
          <rect x="44" y="14" width="112" height="112" rx="5" fill="url(#panelCab)" stroke="#17324D" strokeWidth="2.2" />
          <rect x="54" y="24" width="92" height="92" rx="3" fill="#FFFFFF" stroke="#647F99" strokeWidth="1.5" />
          {/* Main breakers */}
          <rect x="64" y="34" width="32" height="20" rx="2" fill="#17324D" />
          <rect x="104" y="34" width="32" height="20" rx="2" fill="#176B5B" />
          <rect x="68" y="41" width="10" height="6" rx="1" fill="#F2B84B" />
          <rect x="108" y="41" width="10" height="6" rx="1" fill="#4ADE80" />
          {/* Busbar indicators */}
          <line x1="64" y1="68" x2="136" y2="68" stroke="#8FA7BE" strokeWidth="2.5" />
          <line x1="64" y1="78" x2="136" y2="78" stroke="#8FA7BE" strokeWidth="2.5" />
          {/* High voltage warning triangle */}
          <polygon points="100,85 114,108 86,108" fill="#F2B84B" stroke="#17324D" strokeWidth="1.6" />
          <path d="M101 92 L97 100 L101 100 L99 105 L104 98 L100 98 Z" fill="#17324D" />
        </svg>
      );
    case 'Ferramentas':
    default:
      return (
        <svg viewBox="0 0 200 140" className="h-full w-full" aria-hidden="true">
          <rect x="24" y="108" width="152" height="12" rx="3" fill="#C4D2E0" stroke="#17324D" strokeWidth="1.5" />
          {/* Power tool body */}
          <rect x="34" y="44" width="90" height="30" rx="8" fill="#176B5B" stroke="#17324D" strokeWidth="2.2" />
          <rect x="44" y="74" width="22" height="32" rx="4" fill="#17324D" />
          <rect x="46" y="52" width="52" height="7" rx="2" fill="#FFFFFF" opacity="0.4" />
          {/* Gear head & safety guard */}
          <rect x="124" y="50" width="22" height="18" rx="3" fill="#8CA4BA" stroke="#17324D" strokeWidth="1.8" />
          <path d="M126 42 A26 26 0 0 1 174 60" fill="none" stroke="#D9822B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="150" cy="60" r="22" fill="#DCE4EC" stroke="#17324D" strokeWidth="2.2" />
          <circle cx="150" cy="60" r="7" fill="#FFFFFF" stroke="#17324D" strokeWidth="1.8" />
        </svg>
      );
  }
};

export const AssetIllustration: React.FC<AssetIllustrationProps> = ({
  category,
  code,
  name,
  photoDataUrl,
  className = '',
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  if (photoDataUrl && !imgError) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-[#DCE4EC] bg-[#EEF3F8] ${className}`}
      >
        <img
          src={photoDataUrl}
          alt={`Foto do equipamento ${name} (${code})`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-[#CBD7E4] bg-gradient-to-br from-[#F4F8FB] via-[#EDF3F8] to-[#DCE7F2] ${className}`}
      aria-label={`Representação técnica de ${name}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(23,50,77,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,50,77,0.06) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="relative z-10 h-[86%] w-[86%]">
        <CategorySchematicSvg category={category} />
      </div>
      {size !== 'sm' && (
        <span className="absolute bottom-1.5 left-2 z-10 rounded bg-[#17324D] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight text-white shadow-sm">
          {code}
        </span>
      )}
    </div>
  );
};
