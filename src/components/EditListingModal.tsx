import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Calculator, DollarSign, Package, Save, Truck, X } from 'lucide-react';
import type {
  CardCondition,
  MarketplaceListingRow,
  ShippingTier,
} from '../types/tcg';
import {
  calculateFeeComparison,
  calculateMarketSpread,
  formatUSD,
} from '../utils/fees';
import { calculateWeightShipping, SHIPPING_TIERS } from '../utils/shipping';
import { CardImage } from './CardImage';

interface EditListingModalProps {
  listing: MarketplaceListingRow | null;
  sellerZip: string;
  onClose: () => void;
  onSave: (
    listingId: string,
    updates: {
      asking_price: number;
      condition: CardCondition;
      shipping_tier: ShippingTier;
      weight_oz: number;
      shipping_price: number;
      free_shipping: boolean;
    }
  ) => Promise<void>;
}

const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];

export function EditListingModal({
  listing,
  sellerZip,
  onClose,
  onSave,
}: EditListingModalProps) {
  const [askingPrice, setAskingPrice] = useState('');
  const [condition, setCondition] = useState<CardCondition>('NM');
  const [shippingTier, setShippingTier] = useState<ShippingTier>('raw_single');
  const [freeShipping, setFreeShipping] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setAskingPrice(listing.asking_price.toFixed(2));
      setCondition(listing.condition);
      setShippingTier(listing.shipping_tier ?? 'raw_single');
      setFreeShipping(Boolean(listing.free_shipping));
    }
  }, [listing]);

  if (!listing) return null;

  const parsedAsking = parseFloat(askingPrice) || 0;
  const tierInfo = SHIPPING_TIERS[shippingTier];
  const baseOz =
    shippingTier === 'graded_slab' || shippingTier === 'sealed_box' ? 1.5 : 0.5;
  const estLabelCost = calculateWeightShipping(
    baseOz + tierInfo.weightOz,
    sellerZip || listing.seller_zip || '10001',
    '10001'
  );

  const fees = calculateFeeComparison(parsedAsking);
  const effectiveNet = freeShipping
    ? Math.max(0, fees.ourNet - estLabelCost)
    : fees.ourNet;
  const freeShippingTooLow = freeShipping && fees.ourNet < estLabelCost;
  const spread = calculateMarketSpread(
    parsedAsking,
    listing.market_price_at_listing
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedAsking <= 0 || freeShippingTooLow) return;
    setSaving(true);
    await onSave(listing.id, {
      asking_price: parsedAsking,
      condition,
      shipping_tier: shippingTier,
      weight_oz: tierInfo.weightOz,
      shipping_price: freeShipping ? 0 : estLabelCost,
      free_shipping: freeShipping,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Edit Listing</h2>
            <p className="text-xs text-slate-400">
              Update price, condition, or shipping without deleting your listing
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Locked Card Identity */}
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <CardImage
              src={listing.image_url}
              alt={listing.card_name}
              className="h-20 w-14 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{listing.card_name}</p>
              <p className="truncate text-xs text-slate-400">
                {listing.set_name}{' '}
                {listing.card_number && listing.card_number !== '—'
                  ? `#${listing.card_number}`
                  : ''}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Market Ref: {formatUSD(listing.market_price_at_listing)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span>Asking Price ($)</span>
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
                  className="w-full rounded-xl border border-emerald-500/50 bg-slate-950 py-2 pl-8 pr-3 font-mono text-sm font-bold text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

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
          </div>

          {/* Shipping Weight Profile + Free Shipping */}
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
                  Deducts ~{formatUSD(estLabelCost)} label from your net payout
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
                Asking price is too low to cover the {formatUSD(estLabelCost)} USPS label.
              </p>
            )}
          </div>

          {/* Live Net Payout Summary */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calculator className="h-4 w-4 text-indigo-400" />
              <span>{spread.label}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500">Your Net Payout (after 4.5%): </span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {formatUSD(effectiveNet)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || parsedAsking <= 0 || freeShippingTooLow}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Listing Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}