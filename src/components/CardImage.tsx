import { useEffect, useMemo, useState } from 'react';

interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
}

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="245" height="342" viewBox="0 0 245 342">
    <rect width="245" height="342" rx="14" fill="#0f172a" stroke="#334155" stroke-width="4"/>
    <circle cx="122.5" cy="155" r="44" fill="#1e293b" stroke="#10b981" stroke-width="3"/>
    <path d="M78.5 155 h88" stroke="#10b981" stroke-width="3"/>
    <circle cx="122.5" cy="155" r="12" fill="#0f172a" stroke="#6366f1" stroke-width="3"/>
    <text x="122.5" y="245" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="bold">CARD ART</text>
  </svg>
`);

const SET_TO_TCGDEX: Record<string, string> = {
  sv1: 'sv/sv01',
  sv2: 'sv/sv02',
  sv3: 'sv/sv03',
  obf: 'sv/sv03',
  sv3pt5: 'sv/sv03.5',
  sv4: 'sv/sv04',
  sv4pt5: 'sv/sv04.5',
  sv5: 'sv/sv05',
  sv6: 'sv/sv06',
  sv7: 'sv/sv07',
  sv8: 'sv/sv08',
  swsh7: 'swsh/swsh7',
  swsh8: 'swsh/swsh8',
  swsh9: 'swsh/swsh9',
  swsh11: 'swsh/swsh11',
  swsh12: 'swsh/swsh12',
  sm9: 'sm/sm9',
};

function buildCandidateUrls(src: string): string[] {
  if (!src) return [FALLBACK_SVG];

  const list: string[] = [src];

  // Try _hires variant on pokemontcg.io
  const match = src.match(/^https:\/\/images\.pokemontcg\.io\/([^/]+)\/(\d+)(?:_hires)?\.png$/);
  if (match) {
    const [, setId, num] = match;
    if (!src.includes('_hires.png')) {
      list.push(`https://images.pokemontcg.io/${setId}/${num}_hires.png`);
    }
    if (setId === 'svp' && num === '85') {
      list.push(
        'https://assets.pokemon.com/static-assets/content-assets/cms2/img/cards/web/SVP/SVP_EN_85.png'
      );
    }
    const tcgdexSet = SET_TO_TCGDEX[setId];
    if (tcgdexSet) {
      const padded = num.padStart(3, '0');
      list.push(`https://assets.tcgdex.net/en/${tcgdexSet}/${padded}/high.webp`);
      list.push(`https://assets.tcgdex.net/en/${tcgdexSet}/${num}/high.webp`);
    }
  }

  // If primary is tcgdex or pokemon.com, also allow png fallback
  if (src.includes('assets.tcgdex.net') && src.endsWith('/high.webp')) {
    list.push(src.replace('/high.webp', '/low.png'));
  }

  list.push(FALLBACK_SVG);
  return Array.from(new Set(list));
}

export function CardImage({ src, alt, className = '' }: CardImageProps) {
  const candidates = useMemo(() => buildCandidateUrls(src), [src]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [src]);

  const currentSrc = candidates[Math.min(attempt, candidates.length - 1)];

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (attempt < candidates.length - 1) {
          setAttempt((prev) => prev + 1);
        }
      }}
      className={className}
    />
  );
}