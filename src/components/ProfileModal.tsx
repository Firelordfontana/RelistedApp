import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Camera,
  Check,
  ExternalLink,
  MapPin,
  Save,
  ShieldCheck,
  Star,
  User,
  X,
} from 'lucide-react';
import { POKEMON_AVATARS } from '../data/fallbackCards';
import type { SellerReview, ShippingAddress, UserProfile } from '../types/tcg';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  userEmail: string | null;
  demoMode: boolean;
  myReviews: SellerReview[];
  onSaveProfile: (next: UserProfile) => Promise<void>;
  onViewMyStorefront: () => void;
}

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: '',
  street: '',
  city: '',
  state: '',
  zip: '',
};

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  userEmail,
  demoMode,
  myReviews,
  onSaveProfile,
  onViewMyStorefront,
}: ProfileModalProps) {
  const [section, setSection] = useState<'profile' | 'ratings'>('profile');
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [address, setAddress] = useState<ShippingAddress>(profile.address ?? EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(profile.username);
      setAvatarUrl(profile.avatarUrl);
      setAddress(profile.address ?? EMPTY_ADDRESS);
    }
  }, [isOpen, profile]);

  const ratingStats = useMemo(() => {
    const count = myReviews.length;
    const avg =
      count > 0 ? myReviews.reduce((acc, r) => acc + r.rating, 0) / count : 0;
    const breakdown = [5, 4, 3, 2, 1].map((stars) => {
      const hits = myReviews.filter((r) => r.rating === stars).length;
      return {
        stars,
        count: hits,
        pct: count > 0 ? (hits / count) * 100 : 0,
      };
    });
    const isTrusted = count >= 1 && avg >= 4.5;
    return { count, avg, breakdown, isTrusted };
  }, [myReviews]);

  if (!isOpen) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImageToDataUrl(file);
      setAvatarUrl(resized);
    } catch {
      // Ignore invalid image selections
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    await onSaveProfile({
      username: username.trim(),
      avatarUrl: avatarUrl.trim() || POKEMON_AVATARS[0].url,
      address: {
        fullName: address.fullName.trim(),
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        zip: address.zip.trim(),
      },
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl || POKEMON_AVATARS[0].url}
              alt={username}
              className="h-12 w-12 rounded-full border border-slate-700 bg-slate-950 object-contain p-0.5"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  @{profile.username || 'Collector'}
                </h2>
                {ratingStats.isTrusted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" />
                    Trusted Seller
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>
                  {demoMode ? 'Demo Mode Profile' : userEmail ?? 'Collector Account'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {ratingStats.count > 0
                    ? `${ratingStats.avg.toFixed(1)} (${ratingStats.count} reviews)`
                    : 'No reviews yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewMyStorefront}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Storefront</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2-Tab Section Switcher */}
        <div className="grid grid-cols-2 gap-1 border-b border-slate-800 bg-slate-950/60 p-2">
          <button
            type="button"
            onClick={() => setSection('profile')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              section === 'profile'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile &amp; Address</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('ratings')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              section === 'ratings'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            <span>My Ratings ({ratingStats.count})</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {section === 'profile' ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Seller Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-500">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="KantoVault_TCG"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Choose a Pokémon Avatar
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20">
                    <Camera className="h-3.5 w-3.5" />
                    <span>Upload Custom Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {POKEMON_AVATARS.map((preset) => {
                    const selected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${preset.bgClass}`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="h-11 w-11 object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">
                          {preset.label}
                        </span>
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 p-0.5 text-slate-950">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <MapPin className="h-4 w-4" />
                  <span>Shipping Address (Used for Zone Rates &amp; USPS Labels)</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Full Name"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) =>
                      setAddress((prev) => ({ ...prev, street: e.target.value }))
                    }
                    placeholder="Street Address"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) =>
                      setAddress((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="City"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={address.state}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        state: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="State (NY)"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    maxLength={5}
                    value={address.zip}
                    onChange={(e) =>
                      setAddress((prev) => ({
                        ...prev,
                        zip: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    placeholder="5-Digit ZIP"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !username.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving Profile...' : 'Save Profile & Address'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:grid-cols-12">
                <div className="flex flex-col items-center justify-center border-b border-slate-800 pb-4 sm:col-span-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                  <span className="font-mono text-4xl font-extrabold text-white">
                    {ratingStats.count > 0 ? ratingStats.avg.toFixed(1) : '—'}
                  </span>
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= Math.round(ratingStats.avg)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Based on {ratingStats.count} buyer review
                    {ratingStats.count === 1 ? '' : 's'}
                  </p>
                  <div className="mt-2.5">
                    {ratingStats.isTrusted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Trusted Seller Earned
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                        Earn 4.5★+ for Trusted Badge
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-2 sm:col-span-7">
                  {ratingStats.breakdown.map((row) => (
                    <div key={row.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-mono text-slate-300">{row.stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono text-slate-400">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-white">
                  Reviews Left for @{profile.username}
                </h3>

                {myReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                    <Star className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-300">No buyer reviews yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Once buyers rate your Storefront, their 1–5 star reviews will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-300">
                              @{rev.reviewerName}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3 w-3 ${
                                    s <= rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">{rev.createdAt}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-300">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}