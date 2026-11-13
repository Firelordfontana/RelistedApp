import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Calculator,
  ChevronDown,
  LogIn,
  LogOut,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  User,
  Vault,
  Wallet,
} from 'lucide-react';
import type { PokemonCard, TabId, UserProfile } from '../types/tcg';
import { formatUSD } from '../utils/fees';

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tickerCards: PokemonCard[];
  demoMode: boolean;
  onToggleDemoMode: () => void;
  userEmail: string | null;
  profile: UserProfile;
  myActiveListingsCount: number;
  labelsNeededCount: number;
  myAvgRating: number | null;
  walletTotalBalance: number;
  onOpenWallet: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  cartCount: number;
  onOpenCart: () => void;
  vaultCount: number;
}

const TABS: { id: TabId; label: string; shortLabel: string; icon: ReactNode }[] = [
  {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'Buy',
    icon: <Store className="h-4 w-4" />,
  },
  {
    id: 'vault',
    label: 'My Vault',
    shortLabel: 'Vault',
    icon: <Vault className="h-4 w-4" />,
  },
  {
    id: 'shop',
    label: 'My Shop',
    shortLabel: 'Shop',
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: 'calculator',
    label: 'Seller Portal',
    shortLabel: 'Sell',
    icon: <Calculator className="h-4 w-4" />,
  },
];

export function Navbar({
  activeTab,
  onTabChange,
  tickerCards,
  demoMode,
  onToggleDemoMode,
  userEmail,
  profile,
  myActiveListingsCount,
  labelsNeededCount,
  myAvgRating,
  walletTotalBalance,
  onOpenWallet,
  onOpenProfile,
  onOpenAuth,
  onSignOut,
  cartCount,
  onOpenCart,
  vaultCount,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const displayName =
    demoMode || userEmail ? `@${profile.username || 'Collector'}` : 'Sign In';

  return (
    <>
      <div className="border-b border-slate-800/70 bg-slate-900/80 text-xs">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-1.5 no-scrollbar">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE MARKET
          </span>
          <div className="flex items-center gap-5 whitespace-nowrap text-slate-300">
            {tickerCards.length === 0 ? (
              <span className="text-slate-400">Loading live TCGplayer prices...</span>
            ) : (
              tickerCards.slice(0, 10).map((card) => (
                <span key={card.id} className="inline-flex items-center gap-1.5">
                  <span className="font-medium text-slate-200">{card.name}</span>
                  <span className="text-slate-500">#{card.number}</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {card.marketPrice > 0 ? formatUSD(card.marketPrice) : 'N/A'}
                  </span>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  VaultTCG
                </span>
                <span className="hidden rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 sm:inline-block">
                  4.5% Fee
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Low-Fee TCG Marketplace &amp; Vault
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl border border-slate-800/90 bg-slate-900/70 p-1 lg:flex">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === 'vault' && vaultCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {vaultCount}
                    </span>
                  )}
                  {tab.id === 'shop' && labelsNeededCount > 0 && (
                    <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      {labelsNeededCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWallet}
              title="Open Wallet & Payouts"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 font-mono text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formatUSD(walletTotalBalance)}</span>
            </button>

            <button
              onClick={onOpenCart}
              title="Open Bundle Cart"
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-slate-800 sm:px-3"
            >
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">
                  {cartCount}
                </span>
              )}
            </button>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-2 pr-2.5 text-xs font-semibold text-slate-200 transition hover:border-indigo-500/50 hover:bg-slate-800"
              >
                <div className="relative">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className="h-6 w-6 rounded-full border border-slate-700 bg-slate-950 object-contain"
                  />
                  {demoMode && (
                    <span
                      title="Demo Mode Active"
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400"
                    />
                  )}
                </div>

                <span className="hidden max-w-[100px] truncate sm:inline">
                  {displayName}
                </span>

                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                    menuOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl ring-1 ring-black/40">
                  <div className="border-b border-slate-800 bg-slate-950/60 p-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.username}
                        className="h-10 w-10 rounded-full border border-slate-700 bg-slate-950 object-contain p-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {demoMode || userEmail ? `@${profile.username}` : 'Live Mode (Guest)'}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {demoMode
                            ? 'Demo Mode (saved locally)'
                            : userEmail ?? 'Sign in to sync Vault & Wallet'}
                        </p>
                      </div>
                    </div>

                    {(demoMode || userEmail) && (
                      <div className="mt-2.5 flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {myAvgRating !== null ? myAvgRating.toFixed(1) : 'New'}
                        </span>
                        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-semibold text-indigo-300">
                          {myActiveListingsCount} Active Listing
                          {myActiveListingsCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenWallet();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
                    >
                      <Wallet className="h-4 w-4 text-emerald-400" />
                      <span>Wallet &amp; Seller Payouts</span>
                    </button>

                    {(demoMode || userEmail) && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
                      >
                        <User className="h-4 w-4 text-indigo-400" />
                        <span>Profile, Address &amp; Ratings</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onToggleDemoMode();
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            demoMode ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        <span>Demo Mode (Guest)</span>
                      </span>
                      <span
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          demoMode ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            demoMode ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </button>

                    <div className="my-1 border-t border-slate-800" />

                    {userEmail ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-400 transition hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenAuth();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl bg-indigo-500/15 px-3 py-2 text-left text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/25 hover:text-white"
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Sign In / Create Account</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-2 py-1.5 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.shortLabel}</span>
                {tab.id === 'vault' && vaultCount > 0 && (
                  <span className="absolute right-3 top-1 rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-slate-950">
                    {vaultCount}
                  </span>
                )}
                {tab.id === 'shop' && labelsNeededCount > 0 && (
                  <span className="absolute right-3 top-1 rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-slate-950">
                    {labelsNeededCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}