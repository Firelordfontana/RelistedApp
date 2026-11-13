import type { MarketplaceListingRow, OrderRow, ShippingTier } from '../types/tcg';

export const SHIPPING_TIERS: Record<
  ShippingTier,
  { label: string; weightOz: number; desc: string }
> = {
  raw_single: {
    label: 'Raw Single Card',
    weightOz: 0.5,
    desc: '0.5 oz/card (+0.5 oz mailer base)',
  },
  graded_slab: {
    label: 'Graded Slab (PSA/BGS/CGC)',
    weightOz: 4.0,
    desc: '4.0 oz/slab (+1.5 oz padded box)',
  },
  booster_pack: {
    label: 'Booster Pack',
    weightOz: 1.5,
    desc: '1.5 oz/pack (+0.5 oz mailer)',
  },
  sealed_box: {
    label: 'Sealed ETB / Booster Box',
    weightOz: 24.0,
    desc: '24 oz/box (+1.5 oz shipping box)',
  },
};

function zipLeadingDigit(zip?: string): number {
  const digits = (zip ?? '10001').replace(/\D/g, '');
  const d = parseInt(digits[0] || '1', 10);
  return Number.isFinite(d) ? d : 1;
}

export function calculateWeightShipping(
  totalWeightOz: number,
  sellerZip = '10001',
  buyerZip = '10001'
): number {
  const zoneDiff = Math.abs(zipLeadingDigit(sellerZip) - zipLeadingDigit(buyerZip));

  if (totalWeightOz < 16) {
    return Number((4.85 + zoneDiff * 0.21).toFixed(2));
  }
  if (totalWeightOz <= 32) {
    return Number((7.9 + zoneDiff * 0.28).toFixed(2));
  }
  if (totalWeightOz <= 80) {
    return Number((10.5 + zoneDiff * 0.45).toFixed(2));
  }
  return Number((14.5 + zoneDiff * 0.65).toFixed(2));
}

export interface WeightSellerGroup {
  sellerId: string;
  sellerUsername: string;
  sellerZip: string;
  items: MarketplaceListingRow[];
  itemsSubtotal: number;
  totalWeightOz: number;
  hasFreeShipping: boolean;
  labelCost: number;
  buyerShippingCost: number;
  unbundledShippingTotal: number;
  shippingSaved: number;
}

export function groupCartWithWeightShipping(
  cartItems: MarketplaceListingRow[],
  buyerZip = '10001'
) {
  const map = new Map<string, MarketplaceListingRow[]>();

  for (const item of cartItems) {
    const list = map.get(item.seller_id);
    if (list) {
      list.push(item);
    } else {
      map.set(item.seller_id, [item]);
    }
  }

  const groups: WeightSellerGroup[] = [];

  for (const [sellerId, items] of map.entries()) {
    const sellerUsername = items[0].seller_username;
    const sellerZip = items[0].seller_zip || '10001';
    const itemsSubtotal = items.reduce((s, i) => s + i.asking_price, 0);

    const needsBox = items.some(
      (i) => i.shipping_tier === 'graded_slab' || i.shipping_tier === 'sealed_box'
    );
    const baseOz = needsBox ? 1.5 : 0.5;
    const itemsOz = items.reduce((s, i) => s + (i.weight_oz ?? 0.5), 0);
    const totalWeightOz = Number((baseOz + itemsOz).toFixed(2));

    const labelCost = calculateWeightShipping(totalWeightOz, sellerZip, buyerZip);
    const hasFreeShipping = items.some((i) => Boolean(i.free_shipping));
    const buyerShippingCost = hasFreeShipping ? 0 : labelCost;

    const unbundledShippingTotal = items.reduce((s, i) => {
      if (i.free_shipping) return s;
      const singleBase =
        i.shipping_tier === 'graded_slab' || i.shipping_tier === 'sealed_box'
          ? 1.5
          : 0.5;
      return (
        s +
        calculateWeightShipping(
          singleBase + (i.weight_oz ?? 0.5),
          i.seller_zip || '10001',
          buyerZip
        )
      );
    }, 0);

    const shippingSaved = Math.max(
      0,
      Number((unbundledShippingTotal - buyerShippingCost).toFixed(2))
    );

    groups.push({
      sellerId,
      sellerUsername,
      sellerZip,
      items,
      itemsSubtotal,
      totalWeightOz,
      hasFreeShipping,
      labelCost,
      buyerShippingCost,
      unbundledShippingTotal,
      shippingSaved,
    });
  }

  const subtotal = groups.reduce((acc, g) => acc + g.itemsSubtotal, 0);
  const buyerShippingTotal = groups.reduce((acc, g) => acc + g.buyerShippingCost, 0);
  const totalShippingSaved = groups.reduce((acc, g) => acc + g.shippingSaved, 0);

  return {
    groups,
    subtotal,
    buyerShippingTotal,
    totalShippingSaved,
  };
}

export function generateSandboxTrackingNumber(): string {
  const randomDigits = Array.from({ length: 18 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  return `9400${randomDigits}`;
}

export function openPrintableShippingLabel(order: OrderRow, sellerFromName: string) {
  const tracking = order.tracking_number || generateSandboxTrackingNumber();
  const addr = order.buyer_address;
  const toBlock = addr
    ? `${addr.fullName}<br/>${addr.street}<br/>${addr.city}, ${addr.state} ${addr.zip}`
    : `${order.buyer_username}<br/>ZIP: ${order.seller_zip || '10001'}`;

  const html = `<!doctype html>
<html>
<head>
  <title>USPS Ground Advantage Label - ${tracking}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; }
    .label { width: 384px; min-height: 576px; border: 3px solid #000; background: #fff; margin: 0 auto; padding: 16px; box-sizing: border-box; color: #000; }
    .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; }
    .g-box { font-size: 46px; font-weight: 900; border: 3px solid #000; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; }
    .postage { border: 2px solid #000; padding: 6px 10px; font-size: 11px; text-align: right; font-weight: bold; }
    .banner { text-align: center; font-size: 16px; font-weight: 900; border-bottom: 2px solid #000; padding: 8px 0; letter-spacing: 0.5px; }
    .section { padding: 12px 0; border-bottom: 2px solid #000; font-size: 13px; line-height: 1.45; }
    .to { font-size: 15px; font-weight: bold; padding-left: 18px; }
    .barcode { text-align: center; padding-top: 18px; }
    .bars { height: 64px; background: repeating-linear-gradient(90deg, #000 0, #000 3px, #fff 3px, #fff 5px, #000 5px, #000 6px, #fff 6px, #fff 10px); margin: 10px 14px; }
    .trk { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 1px; }
    .meta { margin-top: 14px; font-size: 11px; color: #334155; display: flex; justify-content: space-between; }
    @media print { body { background: #fff; padding: 0; } .noprint { display: none; } }
  </style>
</head>
<body>
  <div class="noprint" style="text-align:center;margin-bottom:14px;">
    <button onclick="window.print()" style="padding:10px 18px;font-weight:bold;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <div class="label">
    <div class="top">
      <div class="g-box">G</div>
      <div class="postage">USPS GROUND ADVANTAGE<br/>COMMERCIAL • EASYPOST READY<br/>WT: ${order.weight_oz} OZ</div>
    </div>
    <div class="banner">USPS TRACKING # EP</div>
    <div class="section">
      <strong>FROM:</strong><br/>
      ${sellerFromName} (@${order.seller_username})<br/>
      ZIP ${order.seller_zip || '10001'}
    </div>
    <div class="section to">
      <div style="font-size:11px;font-weight:normal;margin-left:-18px;margin-bottom:4px;">SHIP TO:</div>
      ${toBlock}
    </div>
    <div class="barcode">
      <div class="bars"></div>
      <div class="trk">${tracking}</div>
    </div>
    <div class="meta">
      <span>Item: ${order.card_name}</span>
      <span>Order #${order.id.slice(0, 8)}</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=500,height=720');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}