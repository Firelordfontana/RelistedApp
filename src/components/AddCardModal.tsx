import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Camera,
  Check,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { searchPokemonCards } from '../services/pokemonApi';
import type { CardCondition, CardVariant, PokemonCard } from '../types/tcg';
import { formatUSD } from '../utils/fees';
import { CardImage } from './CardImage';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (payload: {
    card: PokemonCard;
    condition: CardCondition;
    variant: CardVariant;
    quantity: number;
    listImmediately: boolean;
  }) => Promise<void>;
}

const CONDITIONS: CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const VARIANTS: CardVariant[] = [
  'Holofoil',
  'Reverse Holofoil',
  'Normal',
  '1st Edition',
  'Alt Art / SIR',
];

function resizeCardPhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const maxWidth = 360;
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AddCardModal({ isOpen, onClose, onAddCard }: AddCardModalProps) {
  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [rarity, setRarity] = useState('Illustration Rare');
  const [condition, setCondition] = useState<CardCondition>('NM');
  const [variant, setVariant] = useState<CardVariant>('Holofoil');
  const [marketPrice, setMarketPrice] = useState('25.00');
  const [quantity, setQuantity] = useState('1');
  const [imageUrl, setImageUrl] = useState('');

  // Camera & Market Match state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<PokemonCard[]>([]);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Live camera preview is unavailable in this browser. Use "Upload / Phone Camera" instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setCameraError(
        'Camera permission denied or blocked. Use "Upload / Phone Camera" below to snap or pick a photo.'
      );
    }
  };

  const snapFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const targetW = 360;
    const ratio = video.videoHeight > 0 ? video.videoHeight / video.videoWidth : 1.4;
    canvas.width = targetW;
    canvas.height = Math.round(targetW * ratio);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setImageUrl(canvas.toDataURL('image/jpeg', 0.82));
    }
    stopCamera();
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeCardPhotoToDataUrl(file);
      setImageUrl(dataUrl);
    } catch {
      // Ignore invalid image files
    }
  };

  const handleMatchPrice = async () => {
    if (!cardName.trim()) return;
    setMatching(true);
    const res = await searchPokemonCards(cardName.trim());
    setMatches(res.cards.slice(0, 6));
    setMatching(false);
  };

  const applyMatch = (card: PokemonCard) => {
    setCardName(card.name);
    setSetName(card.setName);
    setCardNumber(card.number);
    setRarity(card.rarity);
    if (card.marketPrice > 0) {
      setMarketPrice(card.marketPrice.toFixed(2));
    }
    // Only fill official art if user hasn't already snapped/uploaded their own photo
    if (!imageUrl) {
      setImageUrl(card.imageUrl);
    }
    setMatches([]);
  };

  const submitCard = async (listImmediately: boolean) => {
    if (!cardName.trim()) return;
    setSaving(true);

    const parsedPrice = Math.max(0, parseFloat(marketPrice) || 0);
    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);

    const card: PokemonCard = {
      id: crypto.randomUUID(),
      name: cardName.trim(),
      setName: setName.trim() || 'Custom / Manual Entry',
      number: cardNumber.trim() || '—',
      rarity: rarity.trim() || 'Standard',
      imageUrl: imageUrl.trim(),
      marketPrice: parsedPrice,
      priceSource: 'fallback',
    };

    await onAddCard({
      card,
      condition,
      variant,
      quantity: parsedQty,
      listImmediately,
    });

    setSaving(false);
    setCardName('');
    setSetName('');
    setCardNumber('');
    setImageUrl('');
    setMatches([]);
    onClose();
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitCard(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Add or Scan Card to Vault
              </h2>
              <p className="text-xs text-slate-400">
                Snap a card photo, auto-match market price, or enter any card manually
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Camera / Photo Section */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-12">
            <div className="flex flex-col items-center justify-center sm:col-span-5">
              {cameraActive ? (
                <div className="relative w-full overflow-hidden rounded-xl border border-emerald-500/50 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-56 w-full object-cover"
                  />
                  {/* Card Alignment Guide */}
                  <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-dashed border-emerald-400/70" />
                  <div className="flex gap-2 p-2">
                    <button
                      type="button"
                      onClick={snapFromCamera}
                      className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Snap Card Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CardImage
                    src={imageUrl}
                    alt={cardName || 'Card Preview'}
                    className="h-44 w-32 rounded-xl border border-slate-800 bg-slate-900 object-contain p-1"
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="mt-2 text-[11px] font-medium text-rose-400 hover:underline"
                    >
                      Clear Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center space-y-2.5 sm:col-span-7">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Card Photo (Optional)
              </h3>
              <p className="text-xs text-slate-400">
                Take a photo with your camera or upload a scan—or leave blank to auto-fill
                official card art when matching price.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Open Live Camera</span>
                </button>

                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/50">
                  <Upload className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Upload / Phone Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {cameraError && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
                  {cameraError}
                </p>
              )}

              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste an image URL..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Card Details + Market Auto-Match */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Card Details &amp; Market Lookup
            </h3>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Card Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g., Charizard ex, Umbreon VMAX, PSA 10 Pikachu"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleMatchPrice}
                  disabled={matching || !cardName.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {matching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Match Price</span>
                </button>
              </div>
            </div>

            {/* Live Match Suggestions */}
            {matches.length > 0 && (
              <div className="rounded-xl border border-indigo-500/30 bg-slate-950 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                  <span>Tap a printing to auto-fill Set, #, Rarity &amp; Market Price:</span>
                  <button
                    type="button"
                    onClick={() => setMatches([])}
                    className="text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => applyMatch(m)}
                      className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900 p-2 text-left transition hover:border-emerald-500/50"
                    >
                      <CardImage
                        src={m.imageUrl}
                        alt={m.name}
                        className="h-12 w-9 shrink-0 rounded object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{m.name}</p>
                        <p className="truncate text-[10px] text-slate-400">
                          {m.setName} #{m.number}
                        </p>
                        <p className="font-mono text-xs font-bold text-emerald-400">
                          {m.marketPrice > 0 ? formatUSD(m.marketPrice) : 'N/A'}
                        </p>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Set Name
                </label>
                <input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="e.g., 151, Evolving Skies"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="e.g., 199/165"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Rarity / Slab Grade
                </label>
                <input
                  type="text"
                  value={rarity}
                  onChange={(e) => setRarity(e.target.value)}
                  placeholder="e.g., SIR, PSA 10"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Variant
                </label>
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value as CardVariant)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Market Value ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs font-bold text-emerald-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="grid grid-cols-1 gap-2.5 border-t border-slate-800 pt-4 sm:grid-cols-2">
            <button
              type="submit"
              disabled={saving || !cardName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save to My Vault'}</span>
            </button>

            <button
              type="button"
              disabled={saving || !cardName.trim()}
              onClick={() => submitCard(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Tag className="h-4 w-4" />
              <span>Save to Vault &amp; List for Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}