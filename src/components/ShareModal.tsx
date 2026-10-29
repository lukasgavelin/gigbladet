import React from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  MessageSquare,
  Share2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { GigData } from '../types/gig.ts';
import { formatSwedishDate } from '../utils/time.ts';
import { useCopyFeedback } from '../hooks/useCopyFeedback.ts';

interface ShareModalProps {
  gig: GigData;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ gig, onClose, onNavigate }) => {
  const { copiedKey, copyWithFeedback } = useCopyFeedback<'public' | 'admin' | 'message'>(2500);

  const origin = window.location.origin;
  const publicUrl = `${origin}/g/${encodeURIComponent(gig.publicId)}`;
  const adminUrl = gig.adminToken ? `${origin}/edit/${encodeURIComponent(gig.adminToken)}` : '';

  const shareMessage = `Här är körschemat och all backstage-info för ${gig.title}${
    gig.ensemble ? ` (${gig.ensemble})` : ''
  } – ${formatSwedishDate(gig.date)}:\n${publicUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${gig.title} – Körschema`,
          text: `Körschema och hålltider för ${gig.title}`,
          url: publicUrl,
        });
        return;
      } catch {
        // User cancelled share sheet
      }
    }
    void copyWithFeedback(publicUrl, 'public');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Redo att delas
            </div>
            <h2 id="share-modal-title" className="text-xl font-bold text-zinc-900 dark:text-white">
              Dela gig-bladet
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {gig.title} {gig.ensemble ? `• ${gig.ensemble}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Stäng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* 1. Musician Link */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                1. Länk till musikerna
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Publik läslänk
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Skicka länken i chatten eller mejlet. Ingen inloggning krävs, och sidan fungerar även offline backstage.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyWithFeedback(publicUrl, 'public')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-emerald-500 hover:opacity-90 text-white dark:text-zinc-950 font-semibold px-4 py-2.5 text-xs transition-opacity shrink-0 cursor-pointer"
              >
                {copiedKey === 'public' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Kopierad
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopiera länk
                  </>
                )}
              </button>
            </div>

            <div className="pt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyWithFeedback(shareMessage, 'message')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                {copiedKey === 'message' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Meddelande kopierat
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                    Kopiera text för SMS / chatt
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate(`/g/${encodeURIComponent(gig.publicId)}`);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                Öppna musiker-vyn
              </button>

              {'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                  Dela
                </button>
              )}
            </div>
          </div>

          {/* 2. Admin Link */}
          {adminUrl && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <KeyRound className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  2. Länk för att ändra
                </span>
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  Administratör
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Spara länken för dig själv. Ändringar du gör här uppdaterar musikernas vy direkt.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={adminUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyWithFeedback(adminUrl, 'admin')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold px-4 py-2.5 text-xs transition-colors shrink-0 cursor-pointer"
                >
                  {copiedKey === 'admin' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Kopierad
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Kopiera admin-länk
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium px-5 py-2 text-xs transition-colors cursor-pointer"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
