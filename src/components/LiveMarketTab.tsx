import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  DollarSign,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { searchPokemonCards } from '../services/pokemonApi';
import type { CardCondition, CardVariant, PokemonCard, SellDraft } from '../types/tcg';
import { formatUSD } from '../utils/fees';
import { CardImage } from './CardImage';

interface LiveMarketTabProps {
  onAddToVault: (
    card: PokemonCard,
    condition: CardCondition,
    variant: CardVariant
  ) => Promise<void>;
  onStartSelling: (draft: SellDraft) => void;
  onLiveCardsLoaded?: (cards: PokemonCard[]) => void;
}

const QUICK_SEARCHES = ['Charizard', 'Umbreon', 'Pikachu', 'Greninja', 'Lugia', 'Mew', 'Gengar'];
const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const VARIANTS: CardVariant[] = ['Holofoil', 'Reverse Holofoil', 'Normal', 'Alt Art / SIR'];

export function LiveMarketTab({
  onAddToVault,
  onStartSelling,
  onLiveCardsLoaded,
}: LiveMarketTabProps) {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<'live' | 'fallback'>('live');
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [statusNote, setStatusNote] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [selectedCondition, setSelectedCondition] = useState<Record<string, CardCondition>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<string, CardVariant>>({});
  const [addingId, setAddingId] = useState<string | null>(null);

  const runSearch = useCallback(
    async (searchTerm: string) => {
      const cleaned = searchTerm.trim();
      if (!cleaned) {
        setCards([]);
        setHasSearched(false);
        setStatusNote(undefined);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      const result = await searchPokemonCards(cleaned);
      setCards(result.cards);
      setSource(result.source);
      setProvider(result.provider);
      setStatusNote(result.note);
      if (result.source === 'live' && result.cards.length > 0) {
        onLiveCardsLoaded?.(result.cards);
      }
      setLoading(false);
    },
    [onLiveCardsLoaded]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setCards([]);
    setHasSearched(false);
    setStatusNote(undefined);
  };

  const getCardVariant = (card: PokemonCard): CardVariant => {
    if (selectedVariant[card.id]) return selectedVariant[card.id];
    const available = card.variantPrices ? (Object.keys(card.variantPrices) as CardVariant[]) : [];
    return available[0] ?? 'Holofoil';
  };

  const getCardPrice = (card: PokemonCard): number => {
    const variant = getCardVariant(card);
    return card.variantPrices?.[variant] ?? card.marketPrice;
  };

  const handleAdd = async (card: PokemonCard) => {
    setAddingId(card.id);
    const cond = selectedCondition[card.id] ?? 'NM';
    const variant = getCardVariant(card);
    const effectiveCard: PokemonCard = {
      ...card,
      marketPrice: getCardPrice(card),
    };
    await onAddToVault(effectiveCard, cond, variant);
    setAddingId(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Activity className="h-3.5 w-3.5" />
              Live Card Lookup &amp; TCGplayer Pricing
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Search Any Card to Vault or Sell
            </h2>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Enter a card name below to pull live market prices, add it to your Vault, or click{' '}
              <strong>Sell (4.5%)</strong>.
            </p>
          </div>

          {hasSearched && (
            <div
              className={`inline-flex shrink-0 items-center gap-2 self-start rounded-xl border px-3 py-2 text-xs font-semibold ${
                loading
                  ? 'border-slate-700 bg-slate-900 text-slate-300'
                  : source === 'live'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              ) : source === 'live' ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>
                {loading
                  ? 'Searching Live API...'
                  : source === 'live'
                  ? `Live (${provider ?? 'API'})`
                  : 'Offline Backup'}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a card name (e.g., Charizard ex, Umbreon VMAX, Pikachu)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/90 py-2.5 pl-10 pr-9 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {(query || hasSearched) && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear search"
                className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>{loading ? 'Searching...' : 'Search Live Cards'}</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Quick search:</span>
          {QUICK_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                runSearch(term);
              }}
              className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-indigo-500/60 hover:text-white"
            >
              {term}
            </button>
          ))}
        </div>

        {statusNote && (
          <p className="mt-3 text-xs text-slate-400">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
            {statusNote}
          </p>
        )}
      </section>

      {!hasSearched ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Search className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-200">
            Search for a card to view live market prices
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Only the card you search for will be loaded—type any Pokémon name above or tap a quick
            search chip to get started.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-96 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="mb-3 h-52 rounded-xl bg-slate-800/60" />
              <div className="h-4 w-2/3 rounded bg-slate-800/60" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-800/40" />
              <div className="mt-4 h-10 rounded-xl bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">
            No live cards found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Check the spelling or try a shorter name (e.g., &ldquo;Charizard&rdquo;).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => {
            const currentCond = selectedCondition[card.id] ?? 'NM';
            const currentVar = getCardVariant(card);
            const price = getCardPrice(card);

            return (
              <div
                key={card.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div>
                  <div className="relative mb-3 flex justify-center overflow-hidden rounded-xl bg-slate-950/80 p-3">
                    <CardImage
                      src={card.imageUrl}
                      alt={card.name}
                      className="h-52 w-auto rounded-lg object-contain transition duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-slate-700">
                      #{card.number}
                    </span>
                    <span
                      className={`absolute right-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        card.priceSource === 'live'
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                      }`}
                    >
                      {card.priceSource === 'live' ? 'LIVE' : 'BACKUP'}
                    </span>
                  </div>

                  <h3 className="truncate text-sm font-bold text-white" title={card.name}>
                    {card.name}
                  </h3>
                  <p className="truncate text-xs text-slate-400">
                    {card.setName} • <span className="text-slate-500">{card.rarity}</span>
                  </p>

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                    <span className="text-[11px] font-medium text-slate-400">TCG Market</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {price > 0 ? formatUSD(price) : 'N/A'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <select
                      value={currentCond}
                      onChange={(e) =>
                        setSelectedCondition((prev) => ({
                          ...prev,
                          [card.id]: e.target.value as CardCondition,
                        }))
                      }
                      className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          Cond: {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={currentVar}
                      onChange={(e) =>
                        setSelectedVariant((prev) => ({
                          ...prev,
                          [card.id]: e.target.value as CardVariant,
                        }))
                      }
                      className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleAdd(card)}
                    disabled={addingId === card.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                  >
                    {addingId === card.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Add to Vault</span>
                  </button>

                  <button
                    onClick={() =>
                      onStartSelling({
                        cardId: card.id,
                        cardName: card.name,
                        setName: card.setName,
                        imageUrl: card.imageUrl,
                        condition: currentCond,
                        marketPrice: price,
                      })
                    }
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>Sell (4.5%)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-xs sm:flex-row">
        <div className="flex items-center gap-2 text-emerald-300">
          <DollarSign className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            Want to cash out? Selling on VaultTCG charges just <strong>4.5% flat</strong> vs{' '}
            <strong>13.25% + $0.30</strong> on eBay &amp; TCGplayer.
          </span>
        </div>
      </div>
    </div>
  );
}