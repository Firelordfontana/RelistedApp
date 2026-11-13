import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AddCardModal } from './components/AddCardModal';
import { AuthModal } from './components/AuthModal';
import { BundleCartDrawer } from './components/BundleCartDrawer';
import { EditListingModal } from './components/EditListingModal';
import { FeeCalculatorTab } from './components/FeeCalculatorTab';
import { MarketplaceTab } from './components/MarketplaceTab';
import type { SelectedSeller } from './components/MarketplaceTab';
import { MyShopTab } from './components/MyShopTab';
import { MyVaultTab } from './components/MyVaultTab';
import { Navbar } from './components/Navbar';
import { ProfileModal } from './components/ProfileModal';
import { WalletModal } from './components/WalletModal';
import {
  INITIAL_DEMO_MARKETPLACE,
  INITIAL_DEMO_VAULT,
  INITIAL_SELLER_REVIEWS,
  POKEMON_AVATARS,
} from './data/fallbackCards';
import { supabase } from './lib/supabase';
import { searchPokemonCards } from './services/pokemonApi';
import type {
  CardCondition,
  CardVariant,
  MarketplaceListingRow,
  OrderRow,
  PaymentMethod,
  PokemonCard,
  SellDraft,
  SellerReview,
  ShippingAddress,
  ShippingTier,
  TabId,
  ToastMessage,
  UserInventoryRow,
  UserProfile,
  WalletState,
  WalletTransaction,
} from './types/tcg';
import { calculateBuyerCheckoutFee, formatUSD } from './utils/fees';
import {
  generateSandboxTrackingNumber,
  groupCartWithWeightShipping,
  openPrintableShippingLabel,
} from './utils/shipping';

const LS_DEMO_MODE = 'vaulttcg_demo_mode';
const LS_DEMO_VAULT = 'vaulttcg_demo_vault';
const LS_DEMO_LISTINGS = 'vaulttcg_demo_listings';
const LS_DEMO_PROFILE = 'vaulttcg_demo_profile';
const LS_DEMO_WALLET = 'vaulttcg_demo_wallet';
const LS_DEMO_TX = 'vaulttcg_demo_wallet_tx';
const LS_DEMO_ORDERS = 'vaulttcg_demo_orders';
const LS_SELLER_REVIEWS = 'vaulttcg_seller_reviews';

const DEFAULT_AVATAR = POKEMON_AVATARS[0].url;

const DEFAULT_DEMO_PROFILE: UserProfile = {
  username: 'DemoCollector',
  avatarUrl: DEFAULT_AVATAR,
  address: {
    fullName: 'Demo Collector',
    street: '151 Indigo Plateau Way',
    city: 'New York',
    state: 'NY',
    zip: '10001',
  },
};

const EMPTY_WALLET: WalletState = {
  user_id: '',
  store_credit: 0,
  seller_balance: 0,
  stripe_connect_status: 'not_connected',
};

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('marketplace');
  const [sellerSubTab, setSellerSubTab] = useState<'sell' | 'search'>('sell');
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    return localStorage.getItem(LS_DEMO_MODE) === 'true';
  });

  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [focusedSeller, setFocusedSeller] = useState<SelectedSeller | null>(null);
  const [editingListing, setEditingListing] = useState<MarketplaceListingRow | null>(null);
  const [liveTickerCards, setLiveTickerCards] = useState<PokemonCard[]>([]);

  const [profile, setProfile] = useState<UserProfile>(() =>
    loadLocal(LS_DEMO_PROFILE, DEFAULT_DEMO_PROFILE)
  );

  const [reviews, setReviews] = useState<SellerReview[]>(() =>
    loadLocal(LS_SELLER_REVIEWS, INITIAL_SELLER_REVIEWS)
  );

  const [orders, setOrders] = useState<OrderRow[]>(() =>
    demoMode ? loadLocal(LS_DEMO_ORDERS, []) : []
  );

  const [wallet, setWallet] = useState<WalletState>(() =>
    demoMode
      ? loadLocal(LS_DEMO_WALLET, { ...EMPTY_WALLET, user_id: 'demo-guest' })
      : EMPTY_WALLET
  );

  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() =>
    demoMode ? loadLocal(LS_DEMO_TX, []) : []
  );

  const [vaultItems, setVaultItems] = useState<UserInventoryRow[]>(() =>
    demoMode ? loadLocal(LS_DEMO_VAULT, INITIAL_DEMO_VAULT) : []
  );
  const [vaultLoading, setVaultLoading] = useState(false);

  const [listings, setListings] = useState<MarketplaceListingRow[]>(() =>
    demoMode ? loadLocal(LS_DEMO_LISTINGS, INITIAL_DEMO_MARKETPLACE) : []
  );
  const [cartItems, setCartItems] = useState<MarketplaceListingRow[]>([]);
  const [sellDraft, setSellDraft] = useState<SellDraft | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    searchPokemonCards('').then((res) => {
      if (res.cards.length > 0) {
        setLiveTickerCards(res.cards);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_DEMO_MODE, String(demoMode));
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) {
      localStorage.setItem(LS_SELLER_REVIEWS, JSON.stringify(reviews));
      localStorage.setItem(LS_DEMO_VAULT, JSON.stringify(vaultItems));
      localStorage.setItem(LS_DEMO_LISTINGS, JSON.stringify(listings));
      localStorage.setItem(LS_DEMO_PROFILE, JSON.stringify(profile));
      localStorage.setItem(LS_DEMO_WALLET, JSON.stringify(wallet));
      localStorage.setItem(LS_DEMO_TX, JSON.stringify(walletTransactions));
      localStorage.setItem(LS_DEMO_ORDERS, JSON.stringify(orders));
    }
  }, [reviews, vaultItems, listings, profile, wallet, walletTransactions, orders, demoMode]);

  const syncProfileFromSession = useCallback(
    (nextSession: Session | null, isDemo: boolean) => {
      if (isDemo) {
        setProfile(loadLocal(LS_DEMO_PROFILE, DEFAULT_DEMO_PROFILE));
        return;
      }
      if (!nextSession?.user) {
        setProfile({ username: 'Guest', avatarUrl: DEFAULT_AVATAR });
        return;
      }
      const meta = nextSession.user.user_metadata as
        | { username?: string; avatar_url?: string; address?: ShippingAddress }
        | undefined;
      setProfile({
        username:
          meta?.username ||
          nextSession.user.email?.split('@')[0] ||
          'Collector',
        avatarUrl: meta?.avatar_url || DEFAULT_AVATAR,
        address: meta?.address,
      });
    },
    []
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setDemoMode(false);
        syncProfileFromSession(data.session, false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) {
          setDemoMode(false);
          syncProfileFromSession(nextSession, false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [syncProfileFromSession]);

  const fetchSupabaseData = useCallback(async () => {
    if (demoMode) {
      setVaultItems(loadLocal(LS_DEMO_VAULT, INITIAL_DEMO_VAULT));
      setListings(loadLocal(LS_DEMO_LISTINGS, INITIAL_DEMO_MARKETPLACE));
      setProfile(loadLocal(LS_DEMO_PROFILE, DEFAULT_DEMO_PROFILE));
      setWallet(
        loadLocal(LS_DEMO_WALLET, { ...EMPTY_WALLET, user_id: 'demo-guest' })
      );
      setWalletTransactions(loadLocal(LS_DEMO_TX, []));
      setOrders(loadLocal(LS_DEMO_ORDERS, []));
      setReviews(loadLocal(LS_SELLER_REVIEWS, INITIAL_SELLER_REVIEWS));
      return;
    }

    const query = supabase.from('marketplace_listings').select('*');
    const { data: marketData, error: marketErr } = session?.user
      ? await query.or(`status.eq.active,seller_id.eq.${session.user.id}`)
      : await query.eq('status', 'active');

    if (marketErr) {
      notify('error', 'Marketplace sync error: ' + marketErr.message);
      setListings([]);
    } else {
      setListings((marketData as MarketplaceListingRow[]) ?? []);
    }

    const { data: revData, error: revErr } = await supabase
      .from('seller_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!revErr && revData) {
      const mappedReviews: SellerReview[] = (
        revData as Array<{
          id: string;
          seller_id: string;
          seller_username: string;
          reviewer_id: string;
          reviewer_username: string;
          order_id?: string | null;
          rating: number;
          comment: string;
          created_at: string;
        }>
      ).map((r) => ({
        id: r.id,
        sellerId: r.seller_id,
        sellerUsername: r.seller_username,
        reviewerId: r.reviewer_id,
        reviewerName: r.reviewer_username,
        orderId: r.order_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.created_at).toLocaleDateString(),
      }));
      setReviews(mappedReviews);
    }

    if (session?.user) {
      setVaultLoading(true);
      const { data: invData, error: invErr } = await supabase
        .from('user_inventory')
        .select('*')
        .eq('user_id', session.user.id);

      setVaultLoading(false);
      if (invErr) {
        notify('error', 'Vault sync error: ' + invErr.message);
        setVaultItems([]);
      } else {
        setVaultItems((invData as UserInventoryRow[]) ?? []);
      }

      const { data: ordData, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (!ordErr && ordData) {
        setOrders(
          (ordData as OrderRow[]).map((o) => ({
            ...o,
            card_price: Number(o.card_price) || 0,
            shipping_paid: Number(o.shipping_paid) || 0,
            label_cost: Number(o.label_cost) || 0,
            processing_fee: Number(o.processing_fee) || 0,
            platform_fee: Number(o.platform_fee) || 0,
            seller_payout: Number(o.seller_payout) || 0,
            total_paid: Number(o.total_paid) || 0,
            weight_oz: Number(o.weight_oz) || 1,
          }))
        );
      }

      const { data: wData, error: wErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!wErr) {
        if (wData) {
          const row = wData as WalletState;
          setWallet({
            ...row,
            store_credit: Number(row.store_credit) || 0,
            seller_balance: Number(row.seller_balance) || 0,
          });
        } else {
          const { data: created } = await supabase
            .from('wallets')
            .insert({ user_id: session.user.id })
            .select()
            .single();
          if (created) {
            const row = created as WalletState;
            setWallet({
              ...row,
              store_credit: Number(row.store_credit) || 0,
              seller_balance: Number(row.seller_balance) || 0,
            });
          }
        }

        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (txData) {
          setWalletTransactions(
            (txData as WalletTransaction[]).map((t) => ({
              ...t,
              amount: Number(t.amount) || 0,
              fee_amount: Number(t.fee_amount) || 0,
            }))
          );
        }
      }
    } else {
      setVaultItems([]);
      setOrders([]);
      setWallet(EMPTY_WALLET);
      setWalletTransactions([]);
    }
  }, [demoMode, session, notify]);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  // Wallet Handlers
  const handleTopUpStoreCredit = async (amount: number, method: 'ach' | 'card') => {
    const fee = calculateBuyerCheckoutFee(amount, method);
    const desc = `Loaded Store Credit via ${method === 'ach' ? 'Bank/ACH' : 'Card'}`;

    if (demoMode) {
      setWallet((prev) => ({
        ...prev,
        store_credit: Number((prev.store_credit + amount).toFixed(2)),
      }));
      setWalletTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          user_id: 'demo-guest',
          type: 'credit_topup',
          bucket: 'store_credit',
          amount,
          fee_amount: fee,
          description: desc,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      notify('success', `Added ${formatUSD(amount)} to Demo Store Credit!`);
      return;
    }

    if (!session?.user) return;
    const nextCredit = Number((wallet.store_credit + amount).toFixed(2));
    const { error } = await supabase.from('wallets').upsert({
      user_id: session.user.id,
      store_credit: nextCredit,
      seller_balance: wallet.seller_balance,
      stripe_connect_status: wallet.stripe_connect_status,
    });

    if (error) {
      notify('error', 'Wallet update error: ' + error.message);
      return;
    }

    await supabase.from('wallet_transactions').insert({
      user_id: session.user.id,
      type: 'credit_topup',
      bucket: 'store_credit',
      amount,
      fee_amount: fee,
      description: desc,
    });

    await fetchSupabaseData();
    notify('success', `Loaded ${formatUSD(amount)} Store Credit!`);
  };

  const handleConvertEarningsToCredit = async (amount: number) => {
    if (amount <= 0 || amount > wallet.seller_balance) return;

    if (demoMode) {
      setWallet((prev) => ({
        ...prev,
        seller_balance: Number((prev.seller_balance - amount).toFixed(2)),
        store_credit: Number((prev.store_credit + amount).toFixed(2)),
      }));
      setWalletTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          user_id: 'demo-guest',
          type: 'credit_convert',
          bucket: 'store_credit',
          amount,
          fee_amount: 0,
          description: 'Moved Seller Balance to Store Credit ($0 fee)',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      notify('success', `Moved ${formatUSD(amount)} to Store Credit!`);
      return;
    }

    if (!session?.user) return;
    const { error } = await supabase
      .from('wallets')
      .update({
        seller_balance: Number((wallet.seller_balance - amount).toFixed(2)),
        store_credit: Number((wallet.store_credit + amount).toFixed(2)),
      })
      .eq('user_id', session.user.id);

    if (error) {
      notify('error', error.message);
      return;
    }

    await supabase.from('wallet_transactions').insert({
      user_id: session.user.id,
      type: 'credit_convert',
      bucket: 'store_credit',
      amount,
      fee_amount: 0,
      description: 'Moved Seller Balance to Store Credit ($0 fee)',
    });

    await fetchSupabaseData();
    notify('success', `Moved ${formatUSD(amount)} to Store Credit!`);
  };

  const handleConnectStripePayout = async () => {
    if (demoMode) {
      setWallet((prev) => ({ ...prev, stripe_connect_status: 'connected' }));
      notify('success', 'Demo Stripe Connect account linked!');
      return;
    }
    if (!session?.user) return;
    const { error } = await supabase.from('wallets').upsert({
      user_id: session.user.id,
      store_credit: wallet.store_credit,
      seller_balance: wallet.seller_balance,
      stripe_connect_status: 'connected',
    });
    if (error) {
      notify('error', error.message);
      return;
    }
    await fetchSupabaseData();
    notify('success', 'Payout account connected (Sandbox)!');
  };

  const handleWithdrawToBank = async (amount: number) => {
    if (amount <= 0 || amount > wallet.seller_balance) return;

    if (demoMode) {
      setWallet((prev) => ({
        ...prev,
        seller_balance: Number((prev.seller_balance - amount).toFixed(2)),
      }));
      setWalletTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          user_id: 'demo-guest',
          type: 'payout',
          bucket: 'seller_balance',
          amount: -amount,
          fee_amount: 0,
          description: 'Stripe Connect bank payout (Sandbox)',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      notify('success', `Withdrew ${formatUSD(amount)} to bank!`);
      return;
    }

    if (!session?.user) return;
    const { error } = await supabase
      .from('wallets')
      .update({
        seller_balance: Number((wallet.seller_balance - amount).toFixed(2)),
      })
      .eq('user_id', session.user.id);

    if (error) {
      notify('error', error.message);
      return;
    }

    await supabase.from('wallet_transactions').insert({
      user_id: session.user.id,
      type: 'payout',
      bucket: 'seller_balance',
      amount: -amount,
      fee_amount: 0,
      description: 'Stripe Connect bank payout (Sandbox)',
    });

    await fetchSupabaseData();
    notify('success', `Withdrew ${formatUSD(amount)} to bank!`);
  };

  const handleSaveProfile = async (next: UserProfile) => {
    const cleanName = next.username.trim();
    if (!cleanName) return;

    if (demoMode) {
      setProfile({
        username: cleanName,
        avatarUrl: next.avatarUrl,
        address: next.address,
      });
      setListings((prev) =>
        prev.map((l) =>
          l.seller_id === 'demo-guest'
            ? {
                ...l,
                seller_username: cleanName,
                seller_zip: next.address?.zip || l.seller_zip || '10001',
              }
            : l
        )
      );
      notify('success', 'Demo profile & shipping address updated!');
      return;
    }

    if (!session?.user) return;

    const { error } = await supabase.auth.updateUser({
      data: {
        username: cleanName,
        avatar_url: next.avatarUrl,
        address: next.address,
      },
    });

    if (error) {
      notify('error', 'Profile error: ' + error.message);
      return;
    }

    await supabase
      .from('marketplace_listings')
      .update({
        seller_username: cleanName,
        seller_zip: next.address?.zip || '10001',
      })
      .eq('seller_id', session.user.id)
      .eq('status', 'active');

    setProfile({
      username: cleanName,
      avatarUrl: next.avatarUrl,
      address: next.address,
    });
    setListings((prev) =>
      prev.map((l) =>
        l.seller_id === session.user.id
          ? {
              ...l,
              seller_username: cleanName,
              seller_zip: next.address?.zip || l.seller_zip || '10001',
            }
          : l
      )
    );
    notify('success', 'Profile & shipping address saved!');
  };

  const handleAddReview = async (payload: {
    sellerId: string;
    sellerUsername: string;
    rating: number;
    comment: string;
  }) => {
    if (!demoMode && session?.user) {
      const { error } = await supabase.from('seller_reviews').insert({
        seller_id: payload.sellerId,
        seller_username: payload.sellerUsername,
        reviewer_id: session.user.id,
        reviewer_username: profile.username || 'Collector',
        rating: payload.rating,
        comment: payload.comment,
      });

      if (error) {
        notify('error', 'Review error: ' + error.message);
        return;
      }
      await fetchSupabaseData();
      notify('success', `Submitted ${payload.rating}-star review for ${payload.sellerUsername}!`);
      return;
    }

    const newReview: SellerReview = {
      id: crypto.randomUUID(),
      sellerId: payload.sellerId,
      sellerUsername: payload.sellerUsername,
      reviewerName: profile.username || 'Collector',
      rating: payload.rating,
      comment: payload.comment,
      createdAt: 'Just now',
    };
    setReviews((prev) => [newReview, ...prev]);
    notify('success', `Submitted ${payload.rating}-star review for ${payload.sellerUsername}!`);
  };

  // Listing Edit, Pause/Relist, & Delete Handlers
  const handleUpdateListingDetails = async (
    listingId: string,
    updates: {
      asking_price: number;
      condition: CardCondition;
      shipping_tier: ShippingTier;
      weight_oz: number;
      shipping_price: number;
      free_shipping: boolean;
    }
  ) => {
    if (!demoMode && session?.user) {
      const { error } = await supabase
        .from('marketplace_listings')
        .update(updates)
        .eq('id', listingId)
        .eq('seller_id', session.user.id);

      if (error) {
        notify('error', 'Could not update listing: ' + error.message);
        return;
      }
    }

    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, ...updates } : l))
    );
    notify('success', 'Listing updated!');
  };

  const handleChangeListingStatus = async (
    listingId: string,
    status: 'active' | 'cancelled'
  ) => {
    if (!demoMode && session?.user) {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status })
        .eq('id', listingId)
        .eq('seller_id', session.user.id);

      if (error) {
        notify('error', error.message);
        return;
      }
    }

    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status } : l))
    );
    if (status === 'cancelled') {
      setCartItems((prev) => prev.filter((c) => c.id !== listingId));
      notify('info', 'Listing paused.');
    } else {
      notify('success', 'Listing relisted on Marketplace!');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!demoMode && session?.user) {
      const { error } = await supabase
        .from('marketplace_listings')
        .delete()
        .eq('id', listingId)
        .eq('seller_id', session.user.id);

      if (error) {
        notify('error', 'Could not delete listing: ' + error.message);
        return;
      }
    }

    setListings((prev) => prev.filter((l) => l.id !== listingId));
    setCartItems((prev) => prev.filter((c) => c.id !== listingId));
    notify('info', 'Listing permanently deleted.');
  };

  const handleAddToVault = async (
    card: PokemonCard,
    condition: CardCondition,
    variant: CardVariant
  ) => {
    if (!demoMode && !session?.user) {
      notify('info', 'Sign in to save live cards to your Supabase Vault.');
      setAuthOpen(true);
      return;
    }

    const existing = vaultItems.find(
      (i) =>
        i.card_name === card.name &&
        i.set_name === card.setName &&
        i.card_number === card.number &&
        i.condition === condition &&
        i.variant === variant
    );

    if (demoMode) {
      if (existing) {
        setVaultItems((prev) =>
          prev.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        );
      } else {
        const newRow: UserInventoryRow = {
          id: crypto.randomUUID(),
          user_id: 'demo-guest',
          card_id: card.id,
          card_name: card.name,
          set_name: card.setName,
          card_number: card.number,
          rarity: card.rarity,
          image_url: card.imageUrl,
          condition,
          variant,
          market_price: card.marketPrice,
          quantity: 1,
        };
        setVaultItems((prev) => [newRow, ...prev]);
      }
      notify('success', `Added ${card.name} (${condition}) to Demo Vault!`);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from('user_inventory')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);

      if (error) {
        notify('error', error.message);
        return;
      }
      setVaultItems((prev) =>
        prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
      notify('success', `Updated ${card.name} quantity in Vault!`);
    } else {
      const payload = {
        user_id: session!.user.id,
        card_id: card.id,
        card_name: card.name,
        set_name: card.setName,
        card_number: card.number,
        rarity: card.rarity,
        image_url: card.imageUrl,
        condition,
        variant,
        market_price: card.marketPrice,
        quantity: 1,
      };
      const { data, error } = await supabase
        .from('user_inventory')
        .insert(payload)
        .select()
        .single();

      if (error) {
        notify('error', 'Could not save to Supabase: ' + error.message);
        return;
      }
      setVaultItems((prev) => [data as UserInventoryRow, ...prev]);
      notify('success', `Saved ${card.name} to your Supabase Vault!`);
    }
  };

  const handleStartSelling = (draft: SellDraft) => {
    setSellDraft(draft);
    setSellerSubTab('sell');
    setActiveTab('calculator');
  };

  const handleAddManualCard = async ({
    card,
    condition,
    variant,
    quantity,
    listImmediately,
  }: {
    card: PokemonCard;
    condition: CardCondition;
    variant: CardVariant;
    quantity: number;
    listImmediately: boolean;
  }) => {
    if (!demoMode && !session?.user) {
      notify('info', 'Sign in to add cards to your Supabase Vault.');
      setAuthOpen(true);
      return;
    }

    let createdId = card.id;

    if (demoMode) {
      const newRow: UserInventoryRow = {
        id: crypto.randomUUID(),
        user_id: 'demo-guest',
        card_id: card.id,
        card_name: card.name,
        set_name: card.setName,
        card_number: card.number,
        rarity: card.rarity,
        image_url: card.imageUrl,
        condition,
        variant,
        market_price: card.marketPrice,
        quantity,
      };
      createdId = newRow.id;
      setVaultItems((prev) => [newRow, ...prev]);
      notify('success', `Added ${card.name} x${quantity} to Demo Vault!`);
    } else {
      const payload = {
        user_id: session!.user.id,
        card_id: card.id,
        card_name: card.name,
        set_name: card.setName,
        card_number: card.number,
        rarity: card.rarity,
        image_url: card.imageUrl,
        condition,
        variant,
        market_price: card.marketPrice,
        quantity,
      };
      const { data, error } = await supabase
        .from('user_inventory')
        .insert(payload)
        .select()
        .single();

      if (error) {
        notify('error', 'Could not save to Supabase: ' + error.message);
        return;
      }
      const inserted = data as UserInventoryRow;
      createdId = inserted.id;
      setVaultItems((prev) => [inserted, ...prev]);
      notify('success', `Saved ${card.name} to your Supabase Vault!`);
    }

    if (listImmediately) {
      handleStartSelling({
        cardId: card.id,
        cardName: card.name,
        setName: card.setName,
        cardNumber: card.number,
        rarity: card.rarity,
        variant,
        imageUrl: card.imageUrl,
        condition,
        marketPrice: card.marketPrice,
        vaultItemId: createdId,
      });
    }
  };

  const handleUpdateVaultQuantity = async (
    item: UserInventoryRow,
    delta: number
  ) => {
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      await handleRemoveVaultItem(item.id);
      return;
    }

    if (demoMode) {
      setVaultItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
      );
      return;
    }

    const { error } = await supabase
      .from('user_inventory')
      .update({ quantity: nextQty })
      .eq('id', item.id);

    if (error) {
      notify('error', error.message);
      return;
    }
    setVaultItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
    );
  };

  const handleRemoveVaultItem = async (id: string) => {
    if (demoMode) {
      setVaultItems((prev) => prev.filter((i) => i.id !== id));
      notify('info', 'Removed card from Demo Vault.');
      return;
    }

    const { error } = await supabase
      .from('user_inventory')
      .delete()
      .eq('id', id);
    if (error) {
      notify('error', error.message);
      return;
    }
    setVaultItems((prev) => prev.filter((i) => i.id !== id));
    notify('info', 'Removed card from Vault.');
  };

  const handlePublishListing = async (payload: {
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
  }): Promise<boolean> => {
    if (!demoMode && !session?.user) {
      notify('info', 'Sign in to publish a live Marketplace listing.');
      setAuthOpen(true);
      return false;
    }

    const username =
      profile.username.trim() ||
      (demoMode
        ? 'DemoCollector'
        : session?.user.email?.split('@')[0] ?? 'Collector');
    const sellerZip = profile.address?.zip || '10001';

    let linkedVaultId = payload.vaultItemId;

    if (!linkedVaultId) {
      const existingVault = vaultItems.find(
        (v) =>
          v.card_name === payload.cardName &&
          v.set_name === payload.setName &&
          v.card_number === payload.cardNumber &&
          v.condition === payload.condition &&
          v.variant === payload.variant
      );

      if (demoMode) {
        if (existingVault) {
          linkedVaultId = existingVault.id;
          const activeForRow = listings.filter(
            (l) => l.status === 'active' && l.vault_item_id === existingVault.id
          ).length;
          if (activeForRow >= existingVault.quantity) {
            setVaultItems((prev) =>
              prev.map((i) =>
                i.id === existingVault.id ? { ...i, quantity: i.quantity + 1 } : i
              )
            );
          }
        } else {
          const newVaultRow: UserInventoryRow = {
            id: crypto.randomUUID(),
            user_id: 'demo-guest',
            card_id: payload.cardId,
            card_name: payload.cardName,
            set_name: payload.setName,
            card_number: payload.cardNumber,
            rarity: payload.rarity,
            image_url: payload.imageUrl,
            condition: payload.condition,
            variant: payload.variant,
            market_price: payload.marketPriceAtListing,
            quantity: 1,
          };
          linkedVaultId = newVaultRow.id;
          setVaultItems((prev) => [newVaultRow, ...prev]);
        }
      } else {
        if (existingVault) {
          linkedVaultId = existingVault.id;
          const activeForRow = listings.filter(
            (l) => l.status === 'active' && l.vault_item_id === existingVault.id
          ).length;
          if (activeForRow >= existingVault.quantity) {
            await supabase
              .from('user_inventory')
              .update({ quantity: existingVault.quantity + 1 })
              .eq('id', existingVault.id);
            setVaultItems((prev) =>
              prev.map((i) =>
                i.id === existingVault.id ? { ...i, quantity: i.quantity + 1 } : i
              )
            );
          }
        } else {
          const { data: invCreated, error: invErr } = await supabase
            .from('user_inventory')
            .insert({
              user_id: session!.user.id,
              card_id: payload.cardId,
              card_name: payload.cardName,
              set_name: payload.setName,
              card_number: payload.cardNumber,
              rarity: payload.rarity,
              image_url: payload.imageUrl,
              condition: payload.condition,
              variant: payload.variant,
              market_price: payload.marketPriceAtListing,
              quantity: 1,
            })
            .select()
            .single();

          if (!invErr && invCreated) {
            const inserted = invCreated as UserInventoryRow;
            linkedVaultId = inserted.id;
            setVaultItems((prev) => [inserted, ...prev]);
          }
        }
      }
    }

    if (demoMode) {
      const newListing: MarketplaceListingRow = {
        id: crypto.randomUUID(),
        seller_id: 'demo-guest',
        seller_username: username,
        card_id: payload.cardId,
        card_name: payload.cardName,
        set_name: payload.setName,
        card_number: payload.cardNumber,
        rarity: payload.rarity,
        variant: payload.variant,
        vault_item_id: linkedVaultId ?? null,
        image_url: payload.imageUrl,
        condition: payload.condition,
        asking_price: payload.askingPrice,
        shipping_price: payload.shippingPrice,
        weight_oz: payload.weightOz,
        shipping_tier: payload.shippingTier,
        free_shipping: payload.freeShipping,
        seller_zip: sellerZip,
        market_price_at_listing: payload.marketPriceAtListing,
        status: 'active',
      };
      setListings((prev) => [newListing, ...prev]);
      notify('success', `Listed ${payload.cardName} & synced to your Demo Vault!`);
      setActiveTab('marketplace');
      return true;
    }

    const insertRow = {
      seller_id: session!.user.id,
      seller_username: username,
      card_id: payload.cardId,
      card_name: payload.cardName,
      set_name: payload.setName,
      card_number: payload.cardNumber,
      rarity: payload.rarity,
      variant: payload.variant,
      vault_item_id: linkedVaultId ?? null,
      image_url: payload.imageUrl,
      condition: payload.condition,
      asking_price: payload.askingPrice,
      shipping_price: payload.shippingPrice,
      weight_oz: payload.weightOz,
      shipping_tier: payload.shippingTier,
      free_shipping: payload.freeShipping,
      seller_zip: sellerZip,
      market_price_at_listing: payload.marketPriceAtListing,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      notify('error', 'Listing error: ' + error.message);
      return false;
    }

    setListings((prev) => [data as MarketplaceListingRow, ...prev]);
    notify('success', `Published ${payload.cardName} & tracked in your Vault!`);
    setActiveTab('marketplace');
    return true;
  };

  const cartIds = useMemo(() => new Set(cartItems.map((c) => c.id)), [cartItems]);

  const handleAddToCart = (listing: MarketplaceListingRow) => {
    if (cartIds.has(listing.id)) return;
    setCartItems((prev) => [...prev, listing]);
    notify('success', `Added ${listing.card_name} to Bundle Cart`);
  };

  const handleCheckoutBundle = async (
    itemsToBuy: MarketplaceListingRow[],
    method: PaymentMethod
  ) => {
    const ids = itemsToBuy.map((i) => i.id);
    if (ids.length === 0) return;

    const buyerZip = profile.address?.zip || '10001';
    const summary = groupCartWithWeightShipping(itemsToBuy, buyerZip);
    const baseTotal = summary.subtotal + summary.buyerShippingTotal;
    const fee = calculateBuyerCheckoutFee(baseTotal, method);
    const grandTotal = baseTotal + fee;

    if (!demoMode) {
      if (!session?.user) {
        notify('info', 'Please sign in to complete your order.');
        setAuthOpen(true);
        return;
      }

      const { error } = await supabase.rpc('complete_bundle_checkout', {
        p_listing_ids: ids,
        p_payment_method: method,
        p_buyer_zip: buyerZip,
        p_buyer_address: profile.address ?? null,
        p_buyer_username: profile.username || 'Collector',
      });

      if (error) {
        notify('error', 'Checkout failed: ' + error.message);
        return;
      }

      await fetchSupabaseData();
    } else {
      if (method === 'store_credit') {
        if (wallet.store_credit < grandTotal) {
          notify('error', 'Insufficient Demo Store Credit.');
          return;
        }
        setWallet((prev) => ({
          ...prev,
          store_credit: Number((prev.store_credit - grandTotal).toFixed(2)),
        }));
      }

      setWalletTransactions((prev) => [
        {
          id: crypto.randomUUID(),
          user_id: 'demo-guest',
          type: 'purchase',
          bucket: method === 'store_credit' ? 'store_credit' : 'external',
          amount: -grandTotal,
          fee_amount: fee,
          description: `Purchased ${itemsToBuy.length} card(s) via ${method}`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      const newOrders: OrderRow[] = [];
      for (const group of summary.groups) {
        const cnt = group.items.length;
        for (const item of group.items) {
          const pFee = Number((item.asking_price * 0.045).toFixed(2));
          const labelShare = Number((group.labelCost / cnt).toFixed(2));
          const shipShare = Number((group.buyerShippingCost / cnt).toFixed(2));
          const procShare = Number((fee / itemsToBuy.length).toFixed(2));
          const payout = Math.max(
            0,
            Number(
              (
                item.asking_price -
                pFee -
                (group.hasFreeShipping ? labelShare : 0)
              ).toFixed(2)
            )
          );

          newOrders.push({
            id: crypto.randomUUID(),
            listing_id: item.id,
            buyer_id: 'demo-guest',
            buyer_username: profile.username || 'DemoCollector',
            seller_id: item.seller_id,
            seller_username: item.seller_username,
            card_name: item.card_name,
            set_name: item.set_name,
            card_number: item.card_number ?? '—',
            image_url: item.image_url,
            condition: item.condition,
            card_price: item.asking_price,
            shipping_paid: shipShare,
            label_cost: labelShare,
            free_shipping: group.hasFreeShipping,
            processing_fee: procShare,
            platform_fee: pFee,
            seller_payout: payout,
            total_paid: Number((item.asking_price + shipShare + procShare).toFixed(2)),
            payment_method: method,
            weight_oz: group.totalWeightOz,
            buyer_address: profile.address ?? null,
            seller_zip: item.seller_zip || '10001',
            carrier: 'USPS Ground Advantage',
            tracking_number: null,
            label_url: null,
            shipping_status: 'label_needed',
            created_at: new Date().toISOString(),
          });

          setVaultItems((prev) => [
            {
              id: crypto.randomUUID(),
              user_id: 'demo-guest',
              card_id: item.card_id,
              card_name: item.card_name,
              set_name: item.set_name,
              card_number: item.card_number ?? '—',
              rarity: item.rarity ?? 'Standard',
              image_url: item.image_url,
              condition: item.condition,
              variant: item.variant ?? 'Holofoil',
              market_price: item.market_price_at_listing,
              quantity: 1,
            },
            ...prev,
          ]);
        }
      }

      setOrders((prev) => [...newOrders, ...prev]);
      setListings((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, status: 'sold' } : item))
      );
    }

    setCartItems([]);
    setCartOpen(false);
    notify(
      'success',
      `Order confirmed (${formatUSD(grandTotal)})! Cards added to your Vault & My Shop.`
    );
  };

  const handleGenerateOrderLabel = async (order: OrderRow, customTracking?: string) => {
    const tracking = order.tracking_number || customTracking || generateSandboxTrackingNumber();
    const updatedOrder: OrderRow = {
      ...order,
      tracking_number: tracking,
      shipping_status: order.shipping_status === 'delivered' ? 'delivered' : 'shipped',
    };

    if (!demoMode && session?.user) {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: tracking,
          shipping_status: updatedOrder.shipping_status,
        })
        .eq('id', order.id)
        .eq('seller_id', session.user.id);

      if (error) {
        notify('error', 'Label error: ' + error.message);
        return;
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === order.id ? updatedOrder : o)));
    openPrintableShippingLabel(
      updatedOrder,
      profile.address?.fullName || profile.username || 'Seller'
    );
    notify('success', `USPS Tracking #${tracking} generated!`);
  };

  const handleConfirmOrderDelivery = async (orderId: string) => {
    if (!demoMode && session?.user) {
      const { error } = await supabase
        .from('orders')
        .update({ shipping_status: 'delivered' })
        .eq('id', orderId)
        .eq('buyer_id', session.user.id);

      if (error) {
        notify('error', error.message);
        return;
      }
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, shipping_status: 'delivered' } : o))
    );
    notify('success', 'Delivery confirmed!');
  };

  const currentSellerId = demoMode ? 'demo-guest' : session?.user.id ?? '';

  const listedCountByVaultId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      if (l.status === 'active' && l.vault_item_id) {
        counts[l.vault_item_id] = (counts[l.vault_item_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [listings]);

  const myListings = useMemo(() => {
    if (demoMode) {
      return listings.filter((l) => l.seller_id === 'demo-guest');
    }
    if (session?.user) {
      return listings.filter((l) => l.seller_id === session.user.id);
    }
    return [];
  }, [listings, demoMode, session]);

  const labelsNeededCount = useMemo(
    () =>
      orders.filter(
        (o) => o.seller_id === currentSellerId && o.shipping_status === 'label_needed'
      ).length,
    [orders, currentSellerId]
  );

  const myReviews = useMemo(
    () => (currentSellerId ? reviews.filter((r) => r.sellerId === currentSellerId) : []),
    [reviews, currentSellerId]
  );

  const myAvgRating = useMemo(() => {
    if (myReviews.length === 0) return null;
    return myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length;
  }, [myReviews]);

  const myActiveListingsCount = useMemo(
    () => myListings.filter((l) => l.status === 'active').length,
    [myListings]
  );

  const totalVaultCount = vaultItems.reduce(
    (sum, i) => sum + Number(i.quantity || 1),
    0
  );

  const walletTotalBalance = wallet.store_credit + wallet.seller_balance;
  const buyerZip = profile.address?.zip || '10001';
  const hasShippingAddress = Boolean(
    profile.address?.street && profile.address?.city && profile.address?.zip
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 lg:pb-12">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tickerCards={liveTickerCards}
        demoMode={demoMode}
        onToggleDemoMode={() => {
          const next = !demoMode;
          if (!next) {
            localStorage.removeItem(LS_DEMO_VAULT);
            localStorage.removeItem(LS_DEMO_LISTINGS);
            localStorage.removeItem(LS_DEMO_PROFILE);
            localStorage.removeItem(LS_DEMO_WALLET);
            localStorage.removeItem(LS_DEMO_TX);
            localStorage.removeItem(LS_DEMO_ORDERS);
          }
          setDemoMode(next);
          syncProfileFromSession(session, next);
          notify(
            'info',
            next
              ? 'Demo Mode enabled — using local sample data.'
              : 'Live Mode enabled — connected to Supabase.'
          );
        }}
        userEmail={session?.user.email ?? null}
        profile={profile}
        myActiveListingsCount={myActiveListingsCount}
        labelsNeededCount={labelsNeededCount}
        myAvgRating={myAvgRating}
        walletTotalBalance={walletTotalBalance}
        onOpenWallet={() => setWalletOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={async () => {
          await supabase.auth.signOut();
          syncProfileFromSession(null, demoMode);
          notify('info', 'Signed out.');
        }}
        cartCount={cartItems.length}
        onOpenCart={() => setCartOpen(true)}
        vaultCount={totalVaultCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'marketplace' && (
          <MarketplaceTab
            listings={listings}
            cartIds={cartIds}
            reviews={reviews}
            currentSellerId={currentSellerId}
            currentUserAvatar={profile.avatarUrl}
            buyerZip={buyerZip}
            focusedSeller={focusedSeller}
            onClearFocusedSeller={() => setFocusedSeller(null)}
            onAddToCart={handleAddToCart}
            onEditListing={(listing) => setEditingListing(listing)}
            onDeleteListing={handleDeleteListing}
            onGoToSell={() => {
              setSellerSubTab('sell');
              setActiveTab('calculator');
            }}
            onAddReview={handleAddReview}
          />
        )}

        {activeTab === 'vault' && (
          <MyVaultTab
            items={vaultItems}
            listedCountByVaultId={listedCountByVaultId}
            loading={vaultLoading}
            demoMode={demoMode}
            userEmail={session?.user.email ?? null}
            onAddToVault={handleAddToVault}
            onUpdateQuantity={handleUpdateVaultQuantity}
            onRemoveItem={handleRemoveVaultItem}
            onListForSale={handleStartSelling}
            onOpenAddCard={() => setAddCardOpen(true)}
            onOpenAuth={() => setAuthOpen(true)}
            onLiveCardsLoaded={setLiveTickerCards}
          />
        )}

        {activeTab === 'shop' && (
          <MyShopTab
            currentUserId={currentSellerId}
            myListings={myListings}
            orders={orders}
            onEditListing={(listing) => setEditingListing(listing)}
            onChangeListingStatus={handleChangeListingStatus}
            onDeleteListing={handleDeleteListing}
            onGenerateLabel={handleGenerateOrderLabel}
            onConfirmDelivery={handleConfirmOrderDelivery}
            onGoToSell={() => {
              setSellerSubTab('sell');
              setActiveTab('calculator');
            }}
          />
        )}

        {activeTab === 'calculator' && (
          <FeeCalculatorTab
            subTab={sellerSubTab}
            onSubTabChange={setSellerSubTab}
            initialDraft={sellDraft}
            vaultItems={vaultItems}
            listedCountByVaultId={listedCountByVaultId}
            sellerZip={buyerZip}
            onAddToVault={handleAddToVault}
            onStartSelling={handleStartSelling}
            onLiveCardsLoaded={setLiveTickerCards}
            onPublishListing={handlePublishListing}
          />
        )}
      </main>

      <EditListingModal
        listing={editingListing}
        sellerZip={buyerZip}
        onClose={() => setEditingListing(null)}
        onSave={handleUpdateListingDetails}
      />

      <WalletModal
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        wallet={wallet}
        transactions={walletTransactions}
        demoMode={demoMode}
        isSignedIn={Boolean(session?.user)}
        onTopUpStoreCredit={handleTopUpStoreCredit}
        onConvertEarningsToCredit={handleConvertEarningsToCredit}
        onConnectStripePayout={handleConnectStripePayout}
        onWithdrawToBank={handleWithdrawToBank}
        onOpenAuth={() => setAuthOpen(true)}
      />

      <AddCardModal
        isOpen={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onAddCard={handleAddManualCard}
      />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        userEmail={session?.user.email ?? null}
        demoMode={demoMode}
        myReviews={myReviews}
        onSaveProfile={handleSaveProfile}
        onViewMyStorefront={() => {
          setProfileOpen(false);
          setFocusedSeller({
            sellerId: currentSellerId || 'demo-guest',
            sellerUsername: profile.username || 'Collector',
          });
          setActiveTab('marketplace');
        }}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onEnableDemoMode={() => {
          setDemoMode(true);
          syncProfileFromSession(null, true);
          notify('success', 'Demo Mode (Guest) enabled!');
        }}
        onNotify={notify}
      />

      <BundleCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        storeCreditBalance={wallet.store_credit}
        buyerZip={buyerZip}
        hasShippingAddress={hasShippingAddress}
        onOpenWallet={() => setWalletOpen(true)}
        onOpenAddress={() => setProfileOpen(true)}
        onRemoveItem={(id) =>
          setCartItems((prev) => prev.filter((c) => c.id !== id))
        }
        onClearCart={() => setCartItems([])}
        onCheckout={handleCheckoutBundle}
      />

      {/* Toast Stack */}
      <div className="fixed bottom-20 right-4 z-50 flex max-w-sm flex-col gap-2 lg:bottom-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 text-xs font-semibold shadow-xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200'
                : toast.type === 'error'
                ? 'border-rose-500/40 bg-rose-950/90 text-rose-200'
                : 'border-indigo-500/40 bg-slate-900/95 text-indigo-200'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;