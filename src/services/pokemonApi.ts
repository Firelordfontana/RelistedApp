import { FALLBACK_CHASE_CARDS } from '../data/fallbackCards';
import type { CardVariant, PokemonCard } from '../types/tcg';

interface ApiPriceBucket {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
}

interface PokemonTcgApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set?: {
    name?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  tcgplayer?: {
    prices?: {
      holofoil?: ApiPriceBucket;
      normal?: ApiPriceBucket;
      reverseHolofoil?: ApiPriceBucket;
      '1stEditionHolofoil'?: ApiPriceBucket;
      unlimitedHolofoil?: ApiPriceBucket;
    };
  };
}

const LIVE_BASES = [
  {
    name: 'carddex.dev',
    url: 'https://api.carddex.dev/compat/pokemontcg/v2/cards',
    supportsOrderBy: true,
  },
  {
    name: 'pokemontcg.io',
    url: 'https://api.pokemontcg.io/v2/cards',
    supportsOrderBy: false,
  },
] as const;

function extractPrices(card: PokemonTcgApiCard): {
  marketPrice: number;
  variantPrices: Partial<Record<CardVariant, number>>;
} {
  const prices = card.tcgplayer?.prices;
  const variantPrices: Partial<Record<CardVariant, number>> = {};

  const holo =
    prices?.holofoil?.market ??
    prices?.unlimitedHolofoil?.market ??
    prices?.holofoil?.mid ??
    null;
  const normal = prices?.normal?.market ?? prices?.normal?.mid ?? null;
  const reverse = prices?.reverseHolofoil?.market ?? prices?.reverseHolofoil?.mid ?? null;
  const firstEd = prices?.['1stEditionHolofoil']?.market ?? null;

  if (holo && holo > 0) variantPrices['Holofoil'] = holo;
  if (normal && normal > 0) variantPrices['Normal'] = normal;
  if (reverse && reverse > 0) variantPrices['Reverse Holofoil'] = reverse;
  if (firstEd && firstEd > 0) variantPrices['1st Edition'] = firstEd;

  const primaryPrice =
    prices?.holofoil?.market ??
    prices?.normal?.market ??
    prices?.reverseHolofoil?.market ??
    holo ??
    normal ??
    reverse ??
    firstEd ??
    0;

  return {
    marketPrice: Number(primaryPrice) || 0,
    variantPrices,
  };
}

function buildPokemonTcgQuery(rawQuery: string): string {
  const tokens = rawQuery
    .trim()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return 'subtypes:ex';
  }
  return tokens.map((token) => `name:${token}`).join(' ');
}

async function fetchFromEndpoint(
  baseUrl: string,
  formattedQuery: string,
  useOrderBy: boolean
): Promise<PokemonTcgApiCard[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({
      q: formattedQuery,
      pageSize: useOrderBy ? '16' : '20',
    });
    if (useOrderBy) {
      params.set('orderBy', '-set.releaseDate');
    }

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as { data?: PokemonTcgApiCard[] };
    return json.data ?? [];
  } catch (err) {
    window.clearTimeout(timeoutId);
    throw err;
  }
}

export async function searchPokemonCards(query: string): Promise<{
  cards: PokemonCard[];
  source: 'live' | 'fallback';
  provider?: string;
  note?: string;
}> {
  const trimmed = query.trim();
  const isDefaultFeed = trimmed.length === 0;
  const formattedQuery = buildPokemonTcgQuery(trimmed);
  let lastError = '';

  for (const endpoint of LIVE_BASES) {
    try {
      const apiCards = await fetchFromEndpoint(
        endpoint.url,
        formattedQuery,
        isDefaultFeed && endpoint.supportsOrderBy
      );

      if (apiCards.length === 0) {
        if (!isDefaultFeed) {
          return {
            cards: [],
            source: 'live',
            provider: endpoint.name,
            note: `Connected to ${endpoint.name} — no cards matched "${trimmed}".`,
          };
        }
        continue;
      }

      const mapped: PokemonCard[] = apiCards.map((card) => {
        const { marketPrice, variantPrices } = extractPrices(card);
        return {
          id: card.id,
          name: card.name,
          setName: card.set?.name ?? 'Unknown Set',
          number: card.number ?? '—',
          rarity: card.rarity ?? 'Standard',
          imageUrl: card.images?.small ?? '',
          marketPrice,
          variantPrices,
          priceSource: 'live',
        };
      });

      mapped.sort((a, b) => b.marketPrice - a.marketPrice);

      return {
        cards: mapped,
        source: 'live',
        provider: endpoint.name,
        note: isDefaultFeed
          ? `Live feed loaded (${mapped.length} cards from ${endpoint.name}).`
          : `Showing ${mapped.length} live results from ${endpoint.name}.`,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error';
    }
  }

  const q = trimmed.toLowerCase();
  const fallbackMatches = q
    ? FALLBACK_CHASE_CARDS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.setName.toLowerCase().includes(q) ||
          c.number.toLowerCase().includes(q)
      )
    : FALLBACK_CHASE_CARDS;

  return {
    cards: fallbackMatches,
    source: 'fallback',
    note: `Live APIs unreachable (${lastError || 'offline'}) — showing offline backup.`,
  };
}