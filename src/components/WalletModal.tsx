import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  History,
  Landmark,
  Lock,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import type { PaymentMethod, WalletState, WalletTransaction } from '../types/tcg';
import { calculateBuyerCheckoutFee, formatUSD } from '../utils/fees';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  transactions: WalletTransaction[];
  demoMode: boolean;
  isSignedIn: boolean;
  onTopUpStoreCredit: (amount: number, method: 'ach' | 'card') => Promise<void>;
  onConvertEarningsToCredit: (amount: number) => Promise<void>;
  onConnectStripePayout: () => Promise<void>;
  onWithdrawToBank: (amount: number) => Promise<void>;
  onOpenAuth: () => void;
}

const PRESET_TOPUPS = [25, 50, 100, 250];

export function WalletModal({
  isOpen,
  onClose,
  wallet,
  transactions,
  demoMode,
  isSignedIn,
  onTopUpStoreCredit,
  onConvertEarningsToCredit,
  onConnectStripePayout,
  onWithdrawToBank,
  onOpenAuth,
}: WalletModalProps) {
  const [section, setSection] = useState<'overview' | 'topup' | 'payout' | 'history'>('overview');
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [topUpMethod, setTopUpMethod] = useState<'ach' | 'card'>('ach');
  const [convertAmount, setConvertAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const canUseWallet = demoMode || isSignedIn;
  const parsedTopUp = Math.max(0, parseFloat(topUpAmount) || 0);
  const topUpFee = calculateBuyerCheckoutFee(parsedTopUp, topUpMethod as PaymentMethod);
  const cardComparisonFee = calculateBuyerCheckoutFee(parsedTopUp, 'card');
  const achComparisonFee = calculateBuyerCheckoutFee(parsedTopUp, 'ach');

  const handleTopUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedTopUp < 5) return;
    setBusy(true);
    await onTopUpStoreCredit(parsedTopUp, topUpMethod);
    setBusy(false);
    setSection('overview');
  };

  const handleConvertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(convertAmount) || 0;
    if (amt <= 0 || amt > wallet.seller_balance) return;
    setBusy(true);
    await onConvertEarningsToCredit(amt);
    setBusy(false);
    setConvertAmount('');
  };

  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount) || 0;
    if (amt <= 0 || amt > wallet.seller_balance) return;
    setBusy(true);
    await onWithdrawToBank(amt);
    setBusy(false);
    setWithdrawAmount('');
    setSection('overview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Collector Wallet &amp; Payouts</h2>
              <p className="text-xs text-slate-400">
                Closed-Loop Store Credit + Stripe Connect Seller Balance
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

        {!canUseWallet ? (
          <div className="p-8 text-center">
            <Lock className="mx-auto mb-3 h-9 w-9 text-slate-600" />
            <h3 className="text-base font-bold text-white">Sign In to Access Your Wallet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              Sign in to manage Store Credit, view your 95.5% seller proceeds, and connect your
              payout account.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="mt-4 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400"
            >
              Sign In / Create Account
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 border-b border-slate-800 bg-slate-950/60 p-2">
              {[
                { id: 'overview', label: 'Balances' },
                { id: 'topup', label: '+ Store Credit' },
                { id: 'payout', label: 'Seller Payouts' },
                { id: 'history', label: `Ledger (${transactions.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setSection(tab.id as 'overview' | 'topup' | 'payout' | 'history')
                  }
                  className={`rounded-xl py-2 text-xs font-semibold transition ${
                    section === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {section === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Store Credit Card */}
                    <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 to-emerald-950/20 p-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Store Credit
                          </span>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            $0 Checkout Fee
                          </span>
                        </div>
                        <div className="mt-2 font-mono text-3xl font-extrabold text-white">
                          {formatUSD(wallet.store_credit)}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Closed-loop buying balance. Spend on any card with zero extra Stripe fees.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSection('topup')}
                        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Load Store Credit</span>
                      </button>
                    </div>

                    {/* Seller Earnings Card */}
                    <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 to-indigo-950/25 p-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                            Seller Balance
                          </span>
                          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                            95.5% Proceeds
                          </span>
                        </div>
                        <div className="mt-2 font-mono text-3xl font-extrabold text-white">
                          {formatUSD(wallet.seller_balance)}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Withdrawable via Stripe Connect, or move to Store Credit with $0 fee.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSection('payout')}
                        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-500 py-2 text-xs font-bold text-white transition hover:bg-indigo-400"
                      >
                        <Landmark className="h-4 w-4" />
                        <span>Withdraw / Convert</span>
                      </button>
                    </div>
                  </div>

                  {/* Compliance & Fee Explainer */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span>How This Keeps Fees Low &amp; Compliant</span>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                      <li>
                        • <strong>Store Credit</strong> is closed-loop (for buying cards only) — load
                        once via <strong>0.8% ACH (max $5)</strong> and buy dozens of singles with{' '}
                        <strong>$0 extra fees</strong>.
                      </li>
                      <li>
                        • <strong>Seller Balance</strong> receives <strong>95.5%</strong> of every
                        sale + shipping and settles through <strong>Stripe Connect</strong> (which
                        handles KYC, 1099-Ks, and licensing).
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {section === 'topup' && (
                <form onSubmit={handleTopUpSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-300">
                      Select Store Credit Amount
                    </label>
                    <div className="mb-3 grid grid-cols-4 gap-2">
                      {PRESET_TOPUPS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopUpAmount(String(amt))}
                          className={`rounded-xl border py-2 font-mono text-xs font-bold transition ${
                            Number(topUpAmount) === amt
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                              : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400" />
                      <input
                        type="number"
                        step="1"
                        min="5"
                        required
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 font-mono text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method Comparison */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Funding Method
                    </label>

                    <button
                      type="button"
                      onClick={() => setTopUpMethod('ach')}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                        topUpMethod === 'ach'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              US Bank / ACH (Stripe Link)
                            </span>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              Lowest Fee
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">0.8% capped at $5.00</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        +{formatUSD(achComparisonFee)} fee
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTopUpMethod('card')}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
                        topUpMethod === 'card'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-indigo-400" />
                        <div>
                          <span className="text-xs font-bold text-white">
                            Credit / Debit Card
                          </span>
                          <p className="text-[11px] text-slate-400">2.9% + $0.30 processing</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        +{formatUSD(cardComparisonFee)} fee
                      </span>
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Store Credit Added</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatUSD(parsedTopUp)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Stripe Processing Fee</span>
                      <span className="font-mono text-slate-300">{formatUSD(topUpFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold text-white">
                      <span>Total Charge</span>
                      <span className="font-mono">{formatUSD(parsedTopUp + topUpFee)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy || parsedTopUp < 5}
                    className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {busy
                      ? 'Adding Store Credit...'
                      : `Load ${formatUSD(parsedTopUp)} Store Credit (Sandbox)`}
                  </button>
                  <p className="text-center text-[11px] text-slate-500">
                    Simulated Stripe Checkout — ready to wire to a Supabase Edge Function + Stripe
                    API key.
                  </p>
                </form>
              )}

              {section === 'payout' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-400">Available Seller Balance</span>
                        <div className="font-mono text-2xl font-extrabold text-white">
                          {formatUSD(wallet.seller_balance)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          wallet.stripe_connect_status === 'connected'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {wallet.stripe_connect_status === 'connected'
                          ? 'Stripe Connect Active'
                          : 'Payout Account Not Connected'}
                      </span>
                    </div>
                  </div>

                  {/* Option 1: Convert Seller Proceeds -> Store Credit ($0 fee) */}
                  <form
                    onSubmit={handleConvertSubmit}
                    className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-white">
                        Move Seller Balance to Store Credit ($0 Fee)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Re-spend your card sales directly inside VaultTCG with zero processing fees.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        max={wallet.seller_balance}
                        value={convertAmount}
                        onChange={(e) => setConvertAmount(e.target.value)}
                        placeholder="Amount ($)"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={
                          busy ||
                          !convertAmount ||
                          parseFloat(convertAmount) <= 0 ||
                          parseFloat(convertAmount) > wallet.seller_balance
                        }
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                      >
                        Move to Credit
                      </button>
                    </div>
                  </form>

                  {/* Option 2: Withdraw to Bank via Stripe Connect */}
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-xs font-bold text-white">
                        Withdraw to Bank via Stripe Connect
                      </h3>
                    </div>

                    {wallet.stripe_connect_status !== 'connected' ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-400">
                          Stripe Connect handles KYC verification, bank routing, and 1099-K forms
                          before payouts.
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            await onConnectStripePayout();
                            setBusy(false);
                          }}
                          className="w-full rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50"
                        >
                          Connect Payout Account (Sandbox)
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleWithdrawSubmit} className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max={wallet.seller_balance}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Amount to withdraw ($)"
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={
                            busy ||
                            !withdrawAmount ||
                            parseFloat(withdrawAmount) <= 0 ||
                            parseFloat(withdrawAmount) > wallet.seller_balance
                          }
                          className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-40"
                        >
                          Withdraw
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {section === 'history' && (
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center">
                      <History className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                      <p className="text-sm font-semibold text-slate-300">
                        No wallet transactions yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Top up Store Credit, buy cards, or sell listings to see your ledger here.
                      </p>
                    </div>
                  ) : (
                    transactions.map((tx) => {
                      const positive = tx.amount >= 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                positive
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {positive ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">
                                {tx.description}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {tx.bucket.replace('_', ' ')} •{' '}
                                {new Date(tx.created_at).toLocaleDateString()}
                                {tx.fee_amount > 0 && ` • Fee: ${formatUSD(tx.fee_amount)}`}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 font-mono text-sm font-bold ${
                              positive ? 'text-emerald-400' : 'text-rose-300'
                            }`}
                          >
                            {positive ? '+' : ''}
                            {formatUSD(tx.amount)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}