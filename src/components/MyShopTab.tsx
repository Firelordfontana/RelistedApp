import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Package,
  Pencil,
  Printer,
  RotateCcw,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import type { MarketplaceListingRow, OrderRow } from '../types/tcg';
import { calculateMarketSpread, formatUSD } from '../utils/fees';
import { CardImage } from './CardImage';

interface MyShopTabProps {
  currentUserId: string;
  myListings: MarketplaceListingRow[];
  orders: OrderRow[];
  onEditListing: (listing: MarketplaceListingRow) => void;
  onChangeListingStatus: (
    listingId: string,
    status: 'active' | 'cancelled'
  ) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onGenerateLabel: (order: OrderRow, customTracking?: string) => Promise<void>;
  onConfirmDelivery: (orderId: string) => Promise<void>;
  onGoToSell: () => void;
}

export function MyShopTab({
  currentUserId,
  myListings,
  orders,
  onEditListing,
  onChangeListingStatus,
  onDeleteListing,
  onGenerateLabel,
  onConfirmDelivery,
  onGoToSell,
}: MyShopTabProps) {
  const [shopSubTab, setShopSubTab] = useState<'listings' | 'sales' | 'purchases'>(
    'listings'
  );
  const [listingFilter, setListingFilter] = useState<'active' | 'all'>('active');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manualTrackByOrder, setManualTrackByOrder] = useState<Record<string, string>>({});

  const activeListings = useMemo(
    () => myListings.filter((l) => l.status === 'active'),
    [myListings]
  );
  const soldListings = useMemo(
    () => myListings.filter((l) => l.status === 'sold'),
    [myListings]
  );

  const purchasedOrders = useMemo(
    () => orders.filter((o) => o.buyer_id === currentUserId),
    [orders, currentUserId]
  );
  const soldOrders = useMemo(
    () => orders.filter((o) => o.seller_id === currentUserId),
    [orders, currentUserId]
  );
  const labelsNeededCount = useMemo(
    () => soldOrders.filter((o) => o.shipping_status === 'label_needed').length,
    [soldOrders]
  );

  const totalActiveValue = activeListings.reduce((s, l) => s + l.asking_price, 0);
  const totalSoldNet = soldListings.reduce((s, l) => s + l.asking_price * 0.955, 0);
  const displayedListings =
    listingFilter === 'active' ? activeListings : myListings;

  const handleDelete = async (listingId: string) => {
    setDeletingId(listingId);
    await onDeleteListing(listingId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Shop Overview Header */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-indigo-950/30 p-5 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Store className="h-3.5 w-3.5" />
                My Shop &amp; Orders
              </span>
              <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                Manage Listings, Labels &amp; Orders
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Edit active listing prices/conditions, print USPS labels, and track purchases.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToSell}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
            >
              + List New Card
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Inventory Value
          </span>
          <div className="mt-1 font-mono text-2xl font-extrabold text-white">
            {formatUSD(totalActiveValue)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {activeListings.length} Active Listing{activeListings.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Total Sold Net
          </span>
          <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-400">
            {formatUSD(totalSoldNet)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {soldOrders.length} Sale{soldOrders.length === 1 ? '' : 's'} •{' '}
            {purchasedOrders.length} Purchase{purchasedOrders.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      {/* Sub-Navigation */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:px-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setShopSubTab('listings')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              shopSubTab === 'listings'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>My Listings ({myListings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShopSubTab('sales')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              shopSubTab === 'sales'
                ? 'bg-emerald-500 font-bold text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Sold ({soldOrders.length})</span>
            {labelsNeededCount > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                {labelsNeededCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShopSubTab('purchases')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              shopSubTab === 'purchases'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Purchased ({purchasedOrders.length})</span>
          </button>
        </div>

        {shopSubTab === 'listings' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setListingFilter('active')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                listingFilter === 'active'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeListings.length})
            </button>
            <button
              type="button"
              onClick={() => setListingFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                listingFilter === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              All History ({myListings.length})
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tab 1: My Listings */}
      {shopSubTab === 'listings' &&
        (displayedListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <h3 className="text-base font-bold text-white">No listings here yet</h3>
            <p className="mt-1 text-xs text-slate-400">
              List a card from My Vault or Seller Portal to manage it here.
            </p>
            <button
              type="button"
              onClick={onGoToSell}
              className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              List a Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedListings.map((item) => {
              const spread = calculateMarketSpread(
                item.asking_price,
                item.market_price_at_listing
              );

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          item.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.status === 'sold'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.free_shipping && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            FREE SHIP
                          </span>
                        )}
                        <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {item.condition}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3.5">
                      <div className="shrink-0 rounded-xl bg-slate-950 p-1.5">
                        <CardImage
                          src={item.image_url}
                          alt={item.card_name}
                          className="h-32 w-22 rounded-lg object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="truncate text-sm font-bold text-white">
                          {item.card_name}
                        </h3>
                        <p className="truncate text-xs text-slate-400">{item.set_name}</p>
                        <p className="text-[11px] font-medium text-emerald-400">
                          {spread.label}
                        </p>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Asking</span>
                            <span className="font-mono font-bold text-white">
                              {formatUSD(item.asking_price)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Shipping</span>
                            <span className="font-mono">
                              {item.free_shipping
                                ? 'FREE (Seller pays)'
                                : `${item.weight_oz ?? 0.5} oz USPS`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.status !== 'sold' && (
                      <button
                        type="button"
                        onClick={() => onEditListing(item)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    {item.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => onChangeListingStatus(item.id, 'cancelled')}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-amber-300 hover:border-amber-500/40"
                      >
                        Pause
                      </button>
                    )}

                    {item.status === 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => onChangeListingStatus(item.id, 'active')}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Relist</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{deletingId === item.id ? '...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* Sub-Tab 2: Sold Cards (Sales) */}
      {shopSubTab === 'sales' &&
        (soldOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <h3 className="text-base font-bold text-white">No sold cards yet</h3>
            <p className="mt-1 text-xs text-slate-400">
              When someone buys your listing, you can print the PDF label &amp; track it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {soldOrders.map((ord) => (
              <div
                key={ord.id}
                className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <CardImage
                      src={ord.image_url}
                      alt={ord.card_name}
                      className="h-18 w-14 shrink-0 rounded-lg object-contain"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{ord.card_name}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            ord.shipping_status === 'delivered'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : ord.shipping_status === 'shipped'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {ord.shipping_status === 'label_needed'
                            ? 'Label Needed'
                            : ord.shipping_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Buyer: <span className="text-indigo-300">@{ord.buyer_username}</span> •{' '}
                        {new Date(ord.created_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-300">
                        Sold: <strong>{formatUSD(ord.card_price)}</strong> → Net Payout:{' '}
                        <strong className="text-emerald-400">
                          {formatUSD(ord.seller_payout)}
                        </strong>{' '}
                        <span className="text-slate-500">
                          (-{formatUSD(ord.platform_fee)} fee
                          {ord.free_shipping ? `, -${formatUSD(ord.label_cost)} free ship` : ''})
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onGenerateLabel(ord, manualTrackByOrder[ord.id]?.trim() || undefined)
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-400"
                  >
                    <Printer className="h-4 w-4" />
                    <span>
                      {ord.tracking_number ? 'Reprint Label (PDF)' : 'Generate Label (PDF)'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col justify-between gap-2 border-t border-slate-800 pt-2.5 text-xs sm:flex-row sm:items-center">
                  <span className="text-slate-400">
                    Ship To:{' '}
                    <span className="text-slate-200">
                      {ord.buyer_address?.street
                        ? `${ord.buyer_address.fullName}, ${ord.buyer_address.street}, ${ord.buyer_address.city}, ${ord.buyer_address.state} ${ord.buyer_address.zip}`
                        : `@${ord.buyer_username} (ZIP ${ord.buyer_address?.zip || '10001'})`}
                    </span>
                  </span>

                  {ord.tracking_number ? (
                    <span className="font-mono text-emerald-400">
                      USPS #{ord.tracking_number}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={manualTrackByOrder[ord.id] ?? ''}
                      onChange={(e) =>
                        setManualTrackByOrder((prev) => ({
                          ...prev,
                          [ord.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional: paste custom tracking #"
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Sub-Tab 3: Purchased Cards (Purchases) */}
      {shopSubTab === 'purchases' &&
        (purchasedOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <h3 className="text-base font-bold text-white">No purchased cards yet</h3>
            <p className="mt-1 text-xs text-slate-400">
              Cards you buy automatically move into your Vault and show tracking here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchasedOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <CardImage
                      src={ord.image_url}
                      alt={ord.card_name}
                      className="h-18 w-14 shrink-0 rounded-lg object-contain"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{ord.card_name}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            ord.shipping_status === 'delivered'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : ord.shipping_status === 'shipped'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {ord.shipping_status === 'label_needed'
                            ? 'Awaiting Label'
                            : ord.shipping_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        From <span className="text-indigo-300">@{ord.seller_username}</span> •{' '}
                        {new Date(ord.created_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-300">
                        Paid: <strong className="text-emerald-400">{formatUSD(ord.total_paid)}</strong>{' '}
                        <span className="text-slate-500">
                          (Card {formatUSD(ord.card_price)} + Ship{' '}
                          {ord.shipping_paid === 0 ? 'FREE' : formatUSD(ord.shipping_paid)})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    {ord.tracking_number ? (
                      <a
                        href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${ord.tracking_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-indigo-300 hover:border-indigo-500/50"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>{ord.tracking_number}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Seller preparing label</span>
                    )}

                    {ord.shipping_status === 'shipped' && (
                      <button
                        type="button"
                        onClick={() => onConfirmDelivery(ord.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm Delivery</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}