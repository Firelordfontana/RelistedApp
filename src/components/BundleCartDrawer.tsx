import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import type { MarketplaceListingRow, PaymentMethod } from '../types/tcg';
import { calculateBuyerCheckoutFee, formatUSD } from '../utils/fees';
import { groupCartWithWeightShipping } from '../utils/shipping';
import { CardImage } from './CardImage';

interface BundleCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarketplaceListingRow[];
  storeCreditBalance: number;
  buyerZip: string;
  hasShippingAddress: boolean;
  onOpenWallet: () => void;
  onOpenAddress: () => void;
  onRemoveItem: (listingId: string) => void;
  onClearCart: () => void;
  onCheckout: (items: MarketplaceListingRow[], method: PaymentMethod) => Promise<void>;
}

export function BundleCartDrawer({
  isOpen,
  onClose,
  items,
  storeCreditBalance,
  buyerZip,
  hasShippingAddress,
  onOpenWallet,
  onOpenAddress,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: BundleCartDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('store_credit');
  const [checkingOut, setCheckingOut] = useState(false);

  if (!isOpen) return null;

  const summary = groupCartWithWeightShipping(items, buyerZip || '10001');
  const baseTotal = summary.subtotal + summary.buyerShippingTotal;
  const processingFee = calculateBuyerCheckoutFee(baseTotal, paymentMethod);
  const finalTotal = baseTotal + processingFee;
  const insufficientCredit =
    paymentMethod === 'store_credit' && storeCreditBalance < finalTotal;

  const handleCheckout = async () => {
    if (insufficientCredit) return;
    setCheckingOut(true);
    await onCheckout(items, paymentMethod);
    setCheckingOut(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Bundle Cart</h2>
              <p className="text-[11px] text-slate-400">
                Weight-based USPS Ground Advantage • ZIP {buyerZip || '10001'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {items.length > 0 && !hasShippingAddress && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-200">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-indigo-400" />
                <span>Add your Shipping Address for exact zone rate &amp; labels.</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddress();
                }}
                className="shrink-0 rounded-lg bg-indigo-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-400"
              >
                Add
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-3 h-10 w-10 text-slate-700" />
              <p className="text-sm font-semibold text-slate-300">Your Bundle Cart is empty</p>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Add multiple cards from the Marketplace—cards from the same seller bundle into
                one weighed USPS package!
              </p>
            </div>
          ) : (
            summary.groups.map((group) => (
              <div
                key={group.sellerId}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-indigo-300">
                    Seller: {group.sellerUsername}
                  </span>
                  {group.hasFreeShipping ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      FREE SHIPPING
                    </span>
                  ) : group.shippingSaved > 0 ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Saved {formatUSD(group.shippingSaved)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      {group.totalWeightOz} oz total
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <CardImage
                        src={item.image_url}
                        alt={item.card_name}
                        className="h-14 w-10 shrink-0 rounded object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{item.card_name}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {item.set_name} • {item.condition} • {item.weight_oz ?? 0.5} oz
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-white">
                          {formatUSD(item.asking_price)}
                        </p>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-rose-400 hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Truck className="h-3.5 w-3.5" /> USPS ({group.totalWeightOz} oz)
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    {!group.hasFreeShipping && group.shippingSaved > 0 && (
                      <span className="text-slate-500 line-through">
                        {formatUSD(group.unbundledShippingTotal)}
                      </span>
                    )}
                    <span
                      className={`font-semibold ${
                        group.hasFreeShipping ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {group.hasFreeShipping ? 'FREE' : formatUSD(group.buyerShippingCost)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-slate-800 bg-slate-900/95 p-5">
            {summary.totalShippingSaved > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                <PackageCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Weight bundling saved {formatUSD(summary.totalShippingSaved)} on shipping!
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Payment Method
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('store_credit')}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                    paymentMethod === 'store_credit'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wallet className="mb-1 h-4 w-4" />
                  <span className="text-[11px] font-bold">Store Credit</span>
                  <span className="text-[9px] text-emerald-400">$0 Fee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ach')}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                    paymentMethod === 'ach'
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="mb-1 h-4 w-4" />
                  <span className="text-[11px] font-bold">Bank / ACH</span>
                  <span className="text-[9px] text-slate-400">0.8% (max $5)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                    paymentMethod === 'card'
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="mb-1 h-4 w-4" />
                  <span className="text-[11px] font-bold">Card</span>
                  <span className="text-[9px] text-slate-400">2.9% + $0.30</span>
                </button>
              </div>
            </div>

            {insufficientCredit && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  Credit balance: {formatUSD(storeCreditBalance)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="shrink-0 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-300"
                >
                  + Top Up
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Cards Subtotal ({items.length})</span>
                <span className="font-mono text-slate-200">{formatUSD(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>USPS Tracked Shipping</span>
                <span className="font-mono text-slate-200">
                  {summary.buyerShippingTotal === 0 ? 'FREE' : formatUSD(summary.buyerShippingTotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Checkout Processing Fee</span>
                <span
                  className={`font-mono font-semibold ${
                    processingFee === 0 ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {processingFee === 0 ? '$0.00 (Free)' : formatUSD(processingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold text-white">
                <span>Order Total</span>
                <span className="font-mono text-emerald-400">{formatUSD(finalTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClearCart}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={checkingOut || insufficientCredit}
                onClick={handleCheckout}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {checkingOut
                    ? 'Processing...'
                    : `Complete Order (${formatUSD(finalTotal)})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}