import { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Filter,
  Layers,
  Minus,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  Vault,
} from 'lucide-react';
import type {
  CardCondition,
  CardVariant,
  PokemonCard,
  SellDraft,
  UserInventoryRow,
} from '../types/tcg';
import { formatUSD } from '../utils/fees';
import { CardImage } from './CardImage';
import { LiveMarketTab } from './LiveMarketTab';

interface MyVaultTabProps {
  items: UserInventoryRow[];
  listedCountByVaultId: Record<string, number>;
  loading: boolean;
  demoMode: boolean;
  userEmail: string | null;
  onAddToVault: (
    card: PokemonCard,
    condition: CardCondition,
    variant: CardVariant
  ) => Promise<void>;
  onUpdateQuantity: (item: UserInventoryRow, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onListForSale: (draft: SellDraft) => void;
  onOpenAddCard: () => void;
  onOpenAuth: () => void;
  onLiveCardsLoaded: (cards: PokemonCard[]) => void;
}

export function MyVaultTab({
  items,
  listedCountByVaultId,
  loading,
  demoMode,
  userEmail,
  onAddToVault,
  onUpdateQuantity,
  onRemoveItem,
  onListForSale,
  onOpenAddCard,
  onOpenAuth,
  onLiveCardsLoaded,
}: MyVaultTabProps) {
  const [vaultView, setVaultView] = useState<'collection' | 'lookup'>('collection');
  const [inventorySearch, setInventorySearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | CardCondition>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'value-desc' | 'name-asc'>('recent');

  const totalPortfolioValue = items.reduce(
    (sum, item) => sum + Number(item.market_price || 0) * Number(item.quantity || 1),
    0
  );
  const totalCardsCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const uniqueTitles = items.length;

  const filteredItems = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    const list = items.filter((item) => {
      const matchesQuery =
        !q ||
        item.card_name.toLowerCase().includes(q) ||
        item.set_name.toLowerCase().includes(q) ||
        item.card_number.toLowerCase().includes(q) ||
        item.rarity.toLowerCase().includes(q);
      const matchesCond = conditionFilter === 'ALL' || item.condition === conditionFilter;
      return matchesQuery && matchesCond;
    });

    if (sortBy === 'value-desc') {
      return [...list].sort(
        (a, b) =>
          Number(b.market_price || 0) * Number(b.quantity || 1) -
          Number(a.market_price || 0) * Number(a.quantity || 1)
      );
    }
    if (sortBy === 'name-asc') {
      return [...list].sort((a, b) => a.card_name.localeCompare(b.card_name));
    }
    return list;
  }, [items, inventorySearch, conditionFilter, sortBy]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/30 p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Total Portfolio Value
              </span>
              <div className="mt-1 font-mono text-3xl font-extrabold text-white sm:text-4xl">
                {formatUSD(totalPortfolioValue)}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {demoMode
                  ? 'Demo Mode Active (stored locally in browser)'
                  : userEmail
                  ? `Synced with Supabase (${userEmail})`
                  : 'Sign in to save cards to your Supabase Vault'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenAddCard}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                <Camera className="h-4 w-4" />
                <span>+ Add / Scan Card</span>
              </button>

              {!userEmail && !demoMode && (
                <button
                  onClick={onOpenAuth}
                  className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Vault Stats
            </span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="my-2 flex items-baseline gap-4">
            <div>
              <span className="font-mono text-2xl font-bold text-white">{totalCardsCount}</span>
              <span className="ml-1.5 text-xs text-slate-400">Total Cards</span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div>
              <span className="font-mono text-2xl font-bold text-indigo-400">{uniqueTitles}</span>
              <span className="ml-1.5 text-xs text-slate-400">Unique</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setVaultView((prev) => (prev === 'collection' ? 'lookup' : 'collection'))
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-500/60"
          >
            <Search className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              {vaultView === 'collection' ? 'Search to Add Card' : 'Back to My Inventory'}
            </span>
          </button>
        </div>
      </section>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:px-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setVaultView('collection')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              vaultView === 'collection'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Vault className="h-3.5 w-3.5" />
            <span>My Inventory ({totalCardsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setVaultView('lookup')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              vaultView === 'lookup'
                ? 'bg-emerald-500 font-bold text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search to Add Card</span>
          </button>
        </div>

        <p className="text-xs text-slate-400">
          {vaultView === 'collection'
            ? 'Cards listed on the Marketplace show a Listed badge until purchased.'
            : 'Search live Pokémon cards by name to add them straight into your Vault.'}
        </p>
      </div>

      {vaultView === 'lookup' ? (
        <LiveMarketTab
          onAddToVault={onAddToVault}
          onStartSelling={onListForSale}
          onLiveCardsLoaded={onLiveCardsLoaded}
        />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm text-slate-400">
          Loading your Vault from Supabase...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Vault className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <h3 className="text-base font-bold text-white">Your Vault is Empty</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            Search for a card to add it with live pricing, or scan/manually enter any card.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setVaultView('lookup')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              <Search className="h-4 w-4" />
              <span>Search to Add Card</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddCard}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Camera className="h-4 w-4" />
              <span>+ Add / Scan Card</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search your inventory by card name, set, #, or rarity..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value as 'ALL' | CardCondition)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Conditions</option>
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'recent' | 'value-desc' | 'name-asc')
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="recent">Sort: Recently Added</option>
                <option value="value-desc">Value: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
              <p className="text-sm font-semibold text-slate-300">
                No cards in your Vault match &ldquo;{inventorySearch}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setInventorySearch('');
                  setConditionFilter('ALL');
                }}
                className="mt-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-indigo-300 hover:text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const lineValue =
                  Number(item.market_price || 0) * Number(item.quantity || 1);
                const listedCount = listedCountByVaultId[item.id] ?? 0;
                const allListed = listedCount >= item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700"
                  >
                    <div>
                      <div className="relative mb-3 flex justify-center rounded-xl bg-slate-950/80 p-3">
                        <CardImage
                          src={item.image_url}
                          alt={item.card_name}
                          className="h-48 w-auto rounded-lg object-contain"
                        />
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-slate-200 ring-1 ring-slate-700">
                          {item.condition}
                        </span>
                        <span className="absolute right-2.5 top-2.5 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                          x{item.quantity}
                        </span>
                        {listedCount > 0 && (
                          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/40">
                            <CheckCircle2 className="h-3 w-3" />
                            Listed ({listedCount}/{item.quantity})
                          </span>
                        )}
                      </div>

                      <h3 className="truncate text-sm font-bold text-white" title={item.card_name}>
                        {item.card_name}
                      </h3>
                      <p className="truncate text-xs text-slate-400">
                        {item.set_name} #{item.card_number}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {item.variant} • {item.rarity}
                      </p>

                      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
                        <div>
                          <span className="block text-[10px] text-slate-500">Unit Market</span>
                          <span className="font-mono text-xs font-semibold text-slate-300">
                            {formatUSD(item.market_price)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-500">Total Value</span>
                          <span className="font-mono text-sm font-bold text-emerald-400">
                            {formatUSD(lineValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 pt-1">
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5">
                        <span className="text-[11px] font-medium text-slate-400">Quantity</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(item, -1)}
                            disabled={item.quantity - 1 < listedCount}
                            title={
                              item.quantity - 1 < listedCount
                                ? 'Delete active listing before reducing below listed count'
                                : 'Decrease quantity'
                            }
                            className="rounded-lg bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[20px] text-center font-mono text-xs font-bold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item, 1)}
                            className="rounded-lg bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        <button
                          disabled={allListed}
                          onClick={() =>
                            onListForSale({
                              cardId: item.card_id || item.id,
                              cardName: item.card_name,
                              setName: item.set_name,
                              cardNumber: item.card_number,
                              rarity: item.rarity,
                              variant: item.variant,
                              imageUrl: item.image_url,
                              condition: item.condition,
                              marketPrice: item.market_price,
                              vaultItemId: item.id,
                            })
                          }
                          className={`col-span-4 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            allListed
                              ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300 opacity-75'
                              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          }`}
                        >
                          <Tag className="h-3.5 w-3.5" />
                          <span>{allListed ? 'All Copies Listed' : 'List for Sale'}</span>
                        </button>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          disabled={listedCount > 0}
                          title={
                            listedCount > 0
                              ? 'Delete active Marketplace listing first'
                              : 'Remove from Vault'
                          }
                          className="col-span-1 inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}