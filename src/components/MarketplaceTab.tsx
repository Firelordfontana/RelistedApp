import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Filter,
  Package,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { POKEMON_AVATARS, SELLER_AVATAR_MAP } from '../data/fallbackCards';
import type {
  CardCondition,
  MarketplaceListingRow,
  SellerReview,
} from '../types/tcg';
import { calculateMarketSpread, formatUSD } from '../utils/fees';
import { calculateWeightShipping } from '../utils/shipping';
import { CardImage } from './CardImage';

export interface SelectedSeller {
  sellerId: string;
  sellerUsername: string;
}

interface MarketplaceTabProps {
  listings: MarketplaceListingRow[];
  cartIds: Set<string>;
  reviews: SellerReview[];
  currentSellerId: string;
  currentUserAvatar: string;
  buyerZip: string;
  focusedSeller: SelectedSeller | null;
  onClearFocusedSeller: () => void;
  onAddToCart: (listing: MarketplaceListingRow) => void;
  onEditListing: (listing: MarketplaceListingRow) => void;
  onDeleteListing: (listingId: string) => Promise<void>;
  onGoToSell: () => void;
  onAddReview: (payload: {
    sellerId: string;
    sellerUsername: string;
    rating: number;
    comment: string;
  }) => void;
}

export function MarketplaceTab({
  listings,
  cartIds,
  reviews,
  currentSellerId,
  currentUserAvatar,
  buyerZip,
  focusedSeller,
  onClearFocusedSeller,
  onAddToCart,
  onEditListing,
  onDeleteListing,
  onGoToSell,
  onAddReview,
}: MarketplaceTabProps) {
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | CardCondition>('ALL');
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [sortBy, setSortBy] = useState<'discount' | 'price-asc' | 'price-desc'>('discount');

  const [selectedSeller, setSelectedSeller] = useState<SelectedSeller | null>(focusedSeller);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedSeller) {
      setSelectedSeller(focusedSeller);
    }
  }, [focusedSeller]);

  const sellerStatsMap = useMemo(() => {
    const map = new Map<string, { avg: number; count: number; items: SellerReview[] }>();
    for (const r of reviews) {
      const existing = map.get(r.sellerId);
      if (!existing) {
        map.set(r.sellerId, { avg: r.rating, count: 1, items: [r] });
      } else {
        const nextItems = [r, ...existing.items];
        const sum = nextItems.reduce((acc, item) => acc + item.rating, 0);
        map.set(r.sellerId, {
          avg: sum / nextItems.length,
          count: nextItems.length,
          items: nextItems,
        });
      }
    }
    return map;
  }, [reviews]);

  const getSellerAvatar = (sellerId: string) => {
    if (sellerId === currentSellerId && currentUserAvatar) {
      return currentUserAvatar;
    }
    return SELLER_AVATAR_MAP[sellerId] ?? POKEMON_AVATARS[4].url;
  };

  const getEstShipping = (item: MarketplaceListingRow) => {
    if (item.free_shipping) return 0;
    const base =
      item.shipping_tier === 'graded_slab' || item.shipping_tier === 'sealed_box'
        ? 1.5
        : 0.5;
    return calculateWeightShipping(
      base + (item.weight_oz ?? 0.5),
      item.seller_zip || '10001',
      buyerZip || '10001'
    );
  };

  const filtered = useMemo(() => {
    const active = listings.filter((l) => l.status === 'active');

    return active
      .filter((item) => {
        if (selectedSeller && item.seller_id !== selectedSeller.sellerId) {
          return false;
        }

        const q = search.trim().toLowerCase();
        const matchesQuery =
          !q ||
          item.card_name.toLowerCase().includes(q) ||
          item.set_name.toLowerCase().includes(q) ||
          item.seller_username.toLowerCase().includes(q);

        const matchesCondition =
          conditionFilter === 'ALL' || item.condition === conditionFilter;

        const spread = calculateMarketSpread(
          item.asking_price,
          item.market_price_at_listing
        );
        const matchesDeals = !onlyDeals || spread.tone === 'deal';

        return matchesQuery && matchesCondition && matchesDeals;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.asking_price - b.asking_price;
        if (sortBy === 'price-desc') return b.asking_price - a.asking_price;
        const spreadA = calculateMarketSpread(
          a.asking_price,
          a.market_price_at_listing
        ).percentDiff;
        const spreadB = calculateMarketSpread(
          b.asking_price,
          b.market_price_at_listing
        ).percentDiff;
        return spreadB - spreadA;
      });
  }, [listings, search, conditionFilter, onlyDeals, sortBy, selectedSeller]);

  const selectedSellerStats = selectedSeller
    ? sellerStatsMap.get(selectedSeller.sellerId)
    : undefined;

  const selectedSellerSoldCount = useMemo(() => {
    if (!selectedSeller) return 0;
    return listings.filter(
      (l) => l.seller_id === selectedSeller.sellerId && l.status === 'sold'
    ).length;
  }, [listings, selectedSeller]);

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;
    onAddReview({
      sellerId: selectedSeller.sellerId,
      sellerUsername: selectedSeller.sellerUsername,
      rating: ratingInput,
      comment: reviewComment.trim() || 'Great transaction!',
    });
    setReviewComment('');
    setRatingInput(5);
  };

  const isTrustedSeller = (sellerId: string) => {
    const stats = sellerStatsMap.get(sellerId);
    return Boolean(stats && stats.avg >= 4.5 && stats.count >= 1);
  };

  const handleDelete = async (listingId: string) => {
    setDeletingId(listingId);
    await onDeleteListing(listingId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {selectedSeller ? (
        <section className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => {
              setSelectedSeller(null);
              onClearFocusedSeller();
            }}
            className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Marketplace</span>
          </button>

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-1.5">
                <img
                  src={getSellerAvatar(selectedSeller.sellerId)}
                  alt={selectedSeller.sellerUsername}
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    {selectedSeller.sellerUsername}&apos;s Storefront
                  </h1>
                  {isTrustedSeller(selectedSeller.sellerId) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Trusted Seller
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {selectedSellerStats
                      ? `${selectedSellerStats.avg.toFixed(1)} (${selectedSellerStats.count} review${
                          selectedSellerStats.count === 1 ? '' : 's'
                        })`
                      : 'New Seller (No reviews yet)'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Package className="h-3.5 w-3.5 text-indigo-400" />
                    {filtered.length} Active Card{filtered.length === 1 ? '' : 's'}
                  </span>
                  {selectedSellerSoldCount > 0 && (
                    <span className="text-emerald-400">
                      {selectedSellerSoldCount} Sold
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <Truck className="h-4 w-4" />
                <span>Weight-Bundled USPS Shipping</span>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-200/80">
                Bundle multiple cards from {selectedSeller.sellerUsername} to combine package
                weight into one tracked Ground Advantage rate!
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              $0 Store Credit Fee • Smart Weight Bundling
            </div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Peer-to-Peer Marketplace</h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Search cards currently listed for sale, inspect deal badges, or click a seller&apos;s
              name to bundle shipping!
            </p>
          </div>

          <button
            onClick={onGoToSell}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            <Tag className="h-4 w-4" />
            <span>List a Card (4.5% Fee)</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              selectedSeller
                ? `Search inside ${selectedSeller.sellerUsername}'s shop...`
                : 'Search cards listed in Marketplace by name, set, or seller...'
            }
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
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'discount' | 'price-asc' | 'price-desc')
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="discount">Sort: Biggest Deal %</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyDeals((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              onlyDeals
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Below Market Only
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">
            No active listings in Marketplace yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Clear your filters or list a card from My Vault / Seller Portal!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const spread = calculateMarketSpread(
              item.asking_price,
              item.market_price_at_listing
            );
            const inCart = cartIds.has(item.id);
            const isOwnListing = Boolean(currentSellerId && item.seller_id === currentSellerId);
            const stats = sellerStatsMap.get(item.seller_id);
            const trusted = isTrustedSeller(item.seller_id);
            const estShipping = getEstShipping(item);

            const badgeClass =
              spread.tone === 'deal'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : spread.tone === 'fair'
                ? 'bg-slate-700/70 text-slate-200 ring-1 ring-slate-600'
                : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
                      {spread.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.free_shipping && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          FREE SHIP
                        </span>
                      )}
                      {isOwnListing && (
                        <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                          YOURS
                        </span>
                      )}
                      <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                        {item.condition}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3.5">
                    <div className="shrink-0 overflow-hidden rounded-xl bg-slate-950 p-1.5">
                      <CardImage
                        src={item.image_url}
                        alt={item.card_name}
                        className="h-36 w-24 rounded-lg object-contain"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <h3 className="truncate text-sm font-bold text-white" title={item.card_name}>
                          {item.card_name}
                        </h3>
                        <p className="truncate text-xs text-slate-400">{item.set_name}</p>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSeller({
                              sellerId: item.seller_id,
                              sellerUsername: item.seller_username,
                            })
                          }
                          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/90 px-2 py-1.5 text-left transition hover:border-indigo-500/60 hover:bg-slate-950"
                        >
                          <img
                            src={getSellerAvatar(item.seller_id)}
                            alt={item.seller_username}
                            className="h-5 w-5 shrink-0 rounded-full object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-[11px] font-semibold text-indigo-300 hover:underline">
                                {item.seller_username}
                              </span>
                              {trusted && (
                                <ShieldCheck
                                  className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                  aria-label="Trusted Seller"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-amber-400">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                              <span>
                                {stats
                                  ? `${stats.avg.toFixed(1)} (${stats.count})`
                                  : 'New Seller'}
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="mt-2.5 space-y-1 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-400">Asking</span>
                          <span className="font-mono text-base font-bold text-white">
                            {formatUSD(item.asking_price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Market Ref</span>
                          <span className="font-mono text-slate-400 line-through">
                            {formatUSD(item.market_price_at_listing)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Truck className="h-3 w-3" /> USPS Tracked
                          </span>
                          <span
                            className={`font-mono ${
                              item.free_shipping
                                ? 'font-bold text-emerald-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {item.free_shipping ? 'FREE' : `+${formatUSD(estShipping)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isOwnListing ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onEditListing(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-2.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{deletingId === item.id ? '...' : 'Delete'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddToCart(item)}
                    disabled={inCart}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                      inCart
                        ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-400'
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Added to Bundle Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Add to Bundle Cart</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedSeller && (
        <section className="grid grid-cols-1 gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div>
              <h2 className="text-base font-bold text-white">
                Rate {selectedSeller.sellerUsername}
              </h2>
              <p className="text-xs text-slate-400">
                Help the community spot reliable sellers with a 1–5 star review.
              </p>
            </div>

            {selectedSeller.sellerId === currentSellerId ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400">
                You are viewing your own Storefront. Buyers can leave 1–5 star reviews for you
                here after ordering.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-300">
                    Your Star Rating
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverStar || ratingInput) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverStar(star)}
                          onMouseLeave={() => setHoverStar(0)}
                          onClick={() => setRatingInput(star)}
                          className="rounded-lg p-1 transition hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              active
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 font-mono text-xs font-bold text-amber-400">
                      {ratingInput} / 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Review Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Fast shipping, card matched condition..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit {ratingInput}-Star Review</span>
                </button>
              </form>
            )}
          </div>

          <div className="space-y-3 lg:col-span-7">
            <h3 className="text-sm font-bold text-white">
              Buyer Reviews ({selectedSellerStats?.count ?? 0})
            </h3>

            {!selectedSellerStats || selectedSellerStats.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                No buyer reviews yet for {selectedSeller.sellerUsername}. Be the first to leave a
                rating!
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedSellerStats.items.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/75 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-300">
                          @{rev.reviewerName}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">{rev.createdAt}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}