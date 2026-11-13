export type TabId = 'marketplace' | 'vault' | 'shop' | 'calculator';

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export type CardVariant =
  | 'Holofoil'
  | 'Reverse Holofoil'
  | 'Normal'
  | '1st Edition'
  | 'Alt Art / SIR';

export type ShippingTier =
  | 'raw_single'
  | 'graded_slab'
  | 'booster_pack'
  | 'sealed_box';

export type PaymentMethod = 'store_credit' | 'ach' | 'card';

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface PokemonCard {
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity: string;
  imageUrl: string;
  marketPrice: number;
  variantPrices?: Partial<Record<CardVariant, number>>;
  priceSource: 'live' | 'fallback';
}

export interface UserInventoryRow {
  id: string;
  user_id: string;
  card_id?: string;
  card_name: string;
  set_name: string;
  card_number: string;
  rarity: string;
  image_url: string;
  condition: CardCondition;
  variant: CardVariant | string;
  market_price: number;
  quantity: number;
}

export interface MarketplaceListingRow {
  id: string;
  seller_id: string;
  seller_username: string;
  card_id: string;
  card_name: string;
  set_name: string;
  card_number?: string;
  rarity?: string;
  variant?: string;
  vault_item_id?: string | null;
  image_url: string;
  condition: CardCondition;
  asking_price: number;
  shipping_price: number;
  weight_oz?: number;
  shipping_tier?: ShippingTier;
  free_shipping?: boolean;
  seller_zip?: string;
  market_price_at_listing: number;
  status: 'active' | 'sold' | 'cancelled';
}

export interface FeeBreakdown {
  askingPrice: number;
  ourFee: number;
  ourNet: number;
  ebayFee: number;
  ebayNet: number;
  tcgplayerFee: number;
  tcgplayerNet: number;
  savingsVsCompetitor: number;
  percentMoreProfit: number;
}

export interface SellDraft {
  cardId: string;
  cardName: string;
  setName: string;
  cardNumber?: string;
  rarity?: string;
  variant?: string;
  imageUrl: string;
  condition: CardCondition;
  marketPrice: number;
  vaultItemId?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  address?: ShippingAddress;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  sellerUsername: string;
  reviewerId?: string;
  reviewerName: string;
  orderId?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface WalletState {
  user_id: string;
  store_credit: number;
  seller_balance: number;
  stripe_connect_status: 'not_connected' | 'pending' | 'connected';
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'credit_topup' | 'purchase' | 'sale_proceeds' | 'credit_convert' | 'payout';
  bucket: 'store_credit' | 'seller_balance' | 'external';
  amount: number;
  fee_amount: number;
  description: string;
  created_at: string;
}

export interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_username: string;
  seller_id: string;
  seller_username: string;
  card_name: string;
  set_name: string;
  card_number: string;
  image_url: string;
  condition: CardCondition;
  card_price: number;
  shipping_paid: number;
  label_cost: number;
  free_shipping: boolean;
  processing_fee: number;
  platform_fee: number;
  seller_payout: number;
  total_paid: number;
  payment_method: PaymentMethod;
  weight_oz: number;
  buyer_address?: ShippingAddress | null;
  seller_zip?: string;
  carrier: string;
  tracking_number?: string | null;
  label_url?: string | null;
  shipping_status: 'label_needed' | 'shipped' | 'delivered';
  created_at: string;
}