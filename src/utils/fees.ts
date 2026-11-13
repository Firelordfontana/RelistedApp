import type { FeeBreakdown, MarketplaceListingRow, PaymentMethod } from '../types/tcg';

export const OUR_PLATFORM_FEE_RATE = 0.045; // 4.5% flat commission
export const COMPETITOR_FEE_RATE = 0.1325; // 13.25%
export const COMPETITOR_FIXED_FEE = 0.30; // + $0.30 per order

export function calculateFeeComparison(askingPrice: number): FeeBreakdown {
  const safePrice = Number.isFinite(askingPrice) && askingPrice > 0 ? askingPrice : 0;

  const ourFee = safePrice * OUR_PLATFORM_FEE_RATE;
  const ourNet = Math.max(0, safePrice - ourFee);

  const competitorFee = safePrice > 0 ? safePrice * COMPETITOR_FEE_RATE + COMPETITOR_FIXED_FEE : 0;
  const competitorNet = Math.max(0, safePrice - competitorFee);

  const savingsVsCompetitor = Math.max(0, ourNet - competitorNet);
  const percentMoreProfit =
    competitorNet > 0 ? ((ourNet - competitorNet) / competitorNet) * 100 : safePrice > 0 ? 100 : 0;

  return {
    askingPrice: safePrice,
    ourFee,
    ourNet,
    ebayFee: competitorFee,
    ebayNet: competitorNet,
    tcgplayerFee: competitorFee,
    tcgplayerNet: competitorNet,
    savingsVsCompetitor,
    percentMoreProfit,
  };
}

export interface MarketSpread {
  label: string;
  percentDiff: number;
  tone: 'deal' | 'fair' | 'premium';
}

export function calculateMarketSpread(askingPrice: number, marketPrice: number): MarketSpread {
  if (!marketPrice || marketPrice <= 0) {
    return { label: 'Unpriced Market', percentDiff: 0, tone: 'fair' };
  }

  const diffPct = ((marketPrice - askingPrice) / marketPrice) * 100;
  const rounded = Math.round(Math.abs(diffPct));

  if (rounded <= 1) {
    return { label: 'At Market', percentDiff: 0, tone: 'fair' };
  }
  if (diffPct > 1) {
    return {
      label: `${rounded}% Below Market`,
      percentDiff: diffPct,
      tone: 'deal',
    };
  }
  return {
    label: `${rounded}% Above Market`,
    percentDiff: diffPct,
    tone: 'premium',
  };
}

export interface SellerBundleGroup {
  sellerId: string;
  sellerUsername: string;
  items: MarketplaceListingRow[];
  itemsSubtotal: number;
  rawShippingTotal: number;
  combinedShipping: number;
  shippingSaved: number;
}

export function groupCartBySeller(cartItems: MarketplaceListingRow[]) {
  const map = new Map<string, SellerBundleGroup>();

  for (const item of cartItems) {
    const existing = map.get(item.seller_id);
    if (!existing) {
      map.set(item.seller_id, {
        sellerId: item.seller_id,
        sellerUsername: item.seller_username,
        items: [item],
        itemsSubtotal: item.asking_price,
        rawShippingTotal: item.shipping_price,
        combinedShipping: item.shipping_price,
        shippingSaved: 0,
      });
    } else {
      existing.items.push(item);
      existing.itemsSubtotal += item.asking_price;
      existing.rawShippingTotal += item.shipping_price;
      // Bundle shipping: charge only the highest single shipping rate per seller
      existing.combinedShipping = Math.max(existing.combinedShipping, item.shipping_price);
      existing.shippingSaved = existing.rawShippingTotal - existing.combinedShipping;
    }
  }

  const groups = Array.from(map.values());
  const subtotal = groups.reduce((acc, g) => acc + g.itemsSubtotal, 0);
  const combinedShippingTotal = groups.reduce((acc, g) => acc + g.combinedShipping, 0);
  const totalShippingSaved = groups.reduce((acc, g) => acc + g.shippingSaved, 0);
  const buyerProtectionFee = 0; // $0 buyer fee promo
  const grandTotal = subtotal + combinedShippingTotal + buyerProtectionFee;

  return {
    groups,
    subtotal,
    combinedShippingTotal,
    totalShippingSaved,
    buyerProtectionFee,
    grandTotal,
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function calculateBuyerCheckoutFee(
  orderSubtotalPlusShipping: number,
  method: PaymentMethod
): number {
  if (!Number.isFinite(orderSubtotalPlusShipping) || orderSubtotalPlusShipping <= 0) {
    return 0;
  }
  if (method === 'store_credit') return 0;
  if (method === 'ach') {
    return Math.min(5.0, Number((orderSubtotalPlusShipping * 0.008).toFixed(2)));
  }
  return Number((orderSubtotalPlusShipping * 0.029 + 0.3).toFixed(2));
}
