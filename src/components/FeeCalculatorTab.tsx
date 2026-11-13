import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
} from 'lucide-react';
import { FALLBACK_CHASE_CARDS } from '../data/fallbackCards';
import type {
  CardCondition,
  CardVariant,
  PokemonCard,
  SellDraft,
  ShippingTier,
  UserInventoryRow,
} from '../types/tcg';
import {
  calculateFeeComparison,
  calculateMarketSpread,
  formatUSD,
} from '../utils/fees';
import { calculateWeightShipping, SHIPPING_TIERS } from '../utils/shipping';
import { CardImage } from './CardImage';
import { LiveMarketTab } from './LiveMarketTab';

interface FeeCalculatorTabProps {
  subTab: 'sell' | 'search';
  onSubTabChange: (tab: 'sell' | 'search') => void;
  initialDraft: SellDraft | null;
  vaultItems: UserInventoryRow[];
  listedCountByVaultId: Record<string, number>;
  sellerZip: string;
  onAddToVault: (
    card: PokemonCard,
    condition: CardCondition,
    variant: CardVariant
  ) => Promise<void>;
  onStartSelling: (draft: SellDraft) => void;
  onLiveCardsLoaded: (cards: PokemonCard[]) => void;
  onPublishListing: (payload: {
    cardId: string;
    cardName: string;
    setName: string;
    cardNumber: string;
    rarity: string;
    variant: string;
    vaultItemId?: string;
    imageUrl: string;
    condition: CardCondition;
    askingPrice: number;
    shippingPrice: number;
    weightOz: number;
    shippingTier: ShippingTier;
    freeShipping: boolean;
    marketPriceAtListing: number;
  }) => Promise<boolean>;
}

const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];

export function FeeCalculatorTab({
  subTab,
  onSubTabChange,
  initialDraft,
  vaultItems,
  listedCountByVaultId,
  sellerZip,
  onAddToVault,
  onStartSelling,
  onLiveCardsLoaded,
  onPublishListing,
}: FeeCalculatorTabProps) {
  const defaultCard = FALLBACK_CHASE_CARDS[0];

  const [cardId, setCardId] = useState(initialDraft?.cardId ?? defaultCard.id);
  const [cardName, setCardName] = useState(initialDraft?.cardName ?? defaultCard.name);
  const [setName, setSetName] = useState(initialDraft?.setName ?? defaultCard.setName);
  const [cardNumber, setCardNumber] = useState(initialDraft?.cardNumber ?? defaultCard.number);
  const [rarity, setRarity] = useState(initialDraft?.rarity ?? defaultCard.rarity);
  const [variant, setVariant] = useState(initialDraft?.variant ?? 'Holofoil');
  const [vaultItemId, setVaultItemId] = useState<string | undefined>(initialDraft?.vaultItemId);
  const [imageUrl, setImageUrl] = useState(initialDraft?.imageUrl ?? defaultCard.imageUrl);
  const [condition, setCondition] = useState<CardCondition>(initialDraft?.condition ?? 'NM');
  const [marketPrice, setMarketPrice] = useState<string>(
    String(initialDraft?.marketPrice ?? defaultCard.marketPrice)
  );
  const [askingPrice, setAskingPrice] = useState<string>(
    initialDraft?.marketPrice
      ? (initialDraft.marketPrice * 0.9).toFixed(2)
      : (defaultCard.marketPrice * 0.9).toFixed(2)
  );

  const [shippingTier, setShippingTier] = useState<ShippingTier>('raw_single');
  const [freeShipping, setFreeShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      setCardId(initialDraft.cardId);
      setCardName(initialDraft.cardName);
      setSetName(initialDraft.setName);
      setCardNumber(initialDraft.cardNumber ?? '—');
      setRarity(initialDraft.rarity ?? 'Standard');
      setVariant(initialDraft.variant ?? 'Holofoil');
      setVaultItemId(initialDraft.vaultItemId);
      setImageUrl(initialDraft.imageUrl);
      setCondition(initialDraft.condition);
      setMarketPrice(initialDraft.marketPrice.toFixed(2));
      setAskingPrice((initialDraft.marketPrice * 0.9).toFixed(2));
    }
  }, [initialDraft]);

  const parsedAsking = parseFloat(askingPrice) || 0;
  const parsedMarket = parseFloat(marketPrice) || 0;

  const tierInfo = SHIPPING_TIERS[shippingTier];
  const baseOz =
    shippingTier === 'graded_slab' || shippingTier === 'sealed_box' ? 1.5 : 0.5;
  const estLabelCost = calculateWeightShipping(
    baseOz + tierInfo.weightOz,
    sellerZip || '10001',
    '10001'
  );

  const fees = calculateFeeComparison(parsedAsking);
  const effectiveOurNet = freeShipping
    ? Math.max(0, fees.ourNet - estLabelCost)
    : fees.ourNet;
  const freeShippingTooLow = freeShipping && fees.ourNet < estLabelCost;
  const spread = calculateMarketSpread(parsedAsking, parsedMarket);

  const availableVaultItems = vaultItems.filter(
    (v) => (listedCountByVaultId[v.id] ?? 0) < v.quantity
  );

  const handleSelectFromVault = (selectedId: string) => {
    const found = vaultItems.find((v) => v.id === selectedId);
    if (!found) return;
    setCardId(found.card_id || found.id);
    setCardName(found.card_name);
    setSetName(found.set_name);
    setCardNumber(found.card_number);
    setRarity(found.rarity);
    setVariant(found.variant);
    setVaultItemId(found.id);
    setImageUrl(found.image_url);
    setCondition(found.condition);
    setMarketPrice(found.market_price.toFixed(2));
    setAskingPrice((found.market_price * 0.9).toFixed(2));
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || parsedAsking <= 0 || freeShippingTooLow) return;

    setSubmitting(true);
    await onPublishListing({
      cardId: cardId || crypto.randomUUID(),
      cardName: cardName.trim(),
      setName: setName.trim() || 'Custom Set',
      cardNumber: cardNumber.trim() || '—',
      rarity: rarity.trim() || 'Standard',
      variant: variant.trim() || 'Holofoil',
      vaultItemId,
      imageUrl,
      condition,
      askingPrice: parsedAsking,
      shippingPrice: freeShipping ? 0 : estLabelCost,
      weightOz: tierInfo.weightOz,
      shippingTier,
      freeShipping,
      marketPriceAtListing: parsedMarket > 0 ? parsedMarket : parsedAsking,
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:px-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs font-bold text-indigo-300">
            Seller Portal
          </span>
          <span className="text-xs text-slate-400">
            Listings automatically sync to your Vault so every card stays tracked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => onSubTabChange('sell')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              subTab === 'sell'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>List &amp; Fee Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange('search')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              subTab === 'search'
                ? 'bg-emerald-500 font-bold text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Live Card Search</span>
          </button>
        </div>
      </div>

      {subTab === 'search' ? (
        <LiveMarketTab
          onAddToVault={onAddToVault}
          onStartSelling={onStartSelling}
          onLiveCardsLoaded={onLiveCardsLoaded}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handlePublish}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 lg:col-span-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Tag className="h-5 w-5 text-emerald-400" />
                  List Card for Sale
                </h1>
                <p className="text-xs text-slate-400">
                  Auto-adds to your Vault &amp; transfers to buyer on sale
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSubTabChange('search')}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-300 hover:border-indigo-500/50"
              >
                <Search className="h-3 w-3" />
                <span>Lookup Card</span>
              </button>
            </div>

            {availableVaultItems.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Quick-Fill from My Vault
                </label>
                <select
                  onChange={(e) => handleSelectFromVault(e.target.value)}
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Choose an unlisted card from your Vault...
                  </option>
                  {availableVaultItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.card_name} ({item.set_name}) — {formatUSD(item.market_price)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <CardImage
                src={imageUrl}
                alt={cardName}
                className="h-20 w-14 shrink-0 rounded-lg object-contain"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value);
                    setVaultItemId(undefined);
                  }}
                  placeholder="Card Name"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-sm font-semibold text-white focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="Set Name"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Market Reference ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Your Asking Price ($)</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    spread.tone === 'deal'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : spread.tone === 'fair'
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {spread.label}
                </span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  required
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/50 bg-slate-950 py-2 pl-8 pr-3 font-mono text-base font-bold text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Weight-Based USPS Shipping Profile */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Package className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Shipping Weight Profile</span>
                </label>
                <span className="font-mono text-xs text-slate-400">
                  Est. Label: <strong className="text-white">{formatUSD(estLabelCost)}</strong>
                </span>
              </div>

              <select
                value={shippingTier}
                onChange={(e) => setShippingTier(e.target.value as ShippingTier)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                {(Object.keys(SHIPPING_TIERS) as ShippingTier[]).map((key) => (
                  <option key={key} value={key}>
                    {SHIPPING_TIERS[key].label} — {SHIPPING_TIERS[key].desc}
                  </option>
                ))}
              </select>

              {/* Free Shipping Seller Toggle */}
              <button
                type="button"
                onClick={() => setFreeShipping((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
                  freeShipping
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Truck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Offer Free Shipping to Buyer</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Shows a FREE SHIP badge. Label cost (~{formatUSD(estLabelCost)}) is deducted
                    from your sale payout.
                  </p>
                </div>
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    freeShipping ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      freeShipping ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </button>

              {freeShippingTooLow && (
                <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
                  Asking price is too low to cover the {formatUSD(estLabelCost)} USPS label. Raise
                  your asking price or turn off Free Shipping.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || parsedAsking <= 0 || freeShippingTooLow}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <span>{submitting ? 'Publishing Listing...' : 'Publish Listing to Marketplace'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    <Calculator className="h-3.5 w-3.5" />
                    Live Payout Breakdown
                  </div>
                  <h2 className="mt-0.5 text-xl font-bold text-white">
                    Fee Comparison at {formatUSD(parsedAsking)}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Flat 4.5% Seller Fee
                </span>
              </div>

              <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-slate-900 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <p className="text-sm font-bold text-emerald-400 sm:text-base">
                    You save {formatUSD(fees.savingsVsCompetitor)} (+
                    {fees.percentMoreProfit.toFixed(1)}% more profit) selling here vs. eBay/TCGplayer!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="relative rounded-2xl border-2 border-emerald-500/60 bg-slate-950 p-4 shadow-lg shadow-emerald-500/10">
                  <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-950">
                    Best Payout
                  </span>
                  <h3 className="text-sm font-bold text-white">VaultTCG (Here)</h3>
                  <p className="text-[11px] text-emerald-400">4.5% flat commission</p>

                  <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Sale Price</span>
                      <span className="font-mono text-slate-200">{formatUSD(fees.askingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Platform Fee (4.5%)</span>
                      <span className="font-mono text-rose-400">-{formatUSD(fees.ourFee)}</span>
                    </div>
                    {freeShipping && (
                      <div className="flex justify-between text-amber-300">
                        <span>Free Ship Label</span>
                        <span className="font-mono">-{formatUSD(estLabelCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                      <span className="text-white">Your Net</span>
                      <span className="font-mono text-emerald-400">{formatUSD(effectiveOurNet)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-bold text-slate-200">eBay</h3>
                  <p className="text-[11px] text-slate-500">13.25% + $0.30 per order</p>

                  <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Sale Price</span>
                      <span className="font-mono text-slate-300">{formatUSD(fees.askingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>eBay Fees</span>
                      <span className="font-mono text-rose-400">-{formatUSD(fees.ebayFee)}</span>
                    </div>
                    {freeShipping && (
                      <div className="flex justify-between text-slate-500">
                        <span>Free Ship Label</span>
                        <span className="font-mono">-{formatUSD(estLabelCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                      <span className="text-slate-300">Your Net</span>
                      <span className="font-mono text-slate-300">
                        {formatUSD(
                          freeShipping ? Math.max(0, fees.ebayNet - estLabelCost) : fees.ebayNet
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h3 className="text-sm font-bold text-slate-200">TCGplayer</h3>
                  <p className="text-[11px] text-slate-500">13.25% + $0.30 per order</p>

                  <div className="mt-4 space-y-2 border-t border-slate-800 pt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Sale Price</span>
                      <span className="font-mono text-slate-300">{formatUSD(fees.askingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>TCGplayer Fees</span>
                      <span className="font-mono text-rose-400">-{formatUSD(fees.tcgplayerFee)}</span>
                    </div>
                    {freeShipping && (
                      <div className="flex justify-between text-slate-500">
                        <span>Free Ship Label</span>
                        <span className="font-mono">-{formatUSD(estLabelCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                      <span className="text-slate-300">Your Net</span>
                      <span className="font-mono text-slate-300">
                        {formatUSD(
                          freeShipping
                            ? Math.max(0, fees.tcgplayerNet - estLabelCost)
                            : fees.tcgplayerNet
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Profit Retention Comparison</span>
                  <span className="text-slate-400">
                    {freeShipping ? 'Includes Free Shipping label deduction' : 'Buyer pays USPS label'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="font-semibold text-emerald-400">VaultTCG Net</span>
                      <span className="font-mono text-emerald-400">{formatUSD(effectiveOurNet)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${
                            fees.askingPrice > 0
                              ? Math.min(100, (effectiveOurNet / fees.askingPrice) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-slate-400">eBay / TCGplayer Net</span>
                      <span className="font-mono text-slate-400">
                        {formatUSD(
                          freeShipping ? Math.max(0, fees.ebayNet - estLabelCost) : fees.ebayNet
                        )}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-500 transition-all duration-300"
                        style={{
                          width: `${
                            fees.askingPrice > 0
                              ? Math.min(
                                  100,
                                  ((freeShipping
                                    ? Math.max(0, fees.ebayNet - estLabelCost)
                                    : fees.ebayNet) /
                                    fees.askingPrice) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> EasyPost-ready USPS
                  Ground Advantage tracking
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Card transfers
                  straight to buyer&apos;s Vault on checkout
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}