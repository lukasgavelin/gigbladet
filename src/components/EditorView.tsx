import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CloudOff,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  ContactPerson,
  DressCodeColor,
  GigData,
  ScheduleItem,
  SetlistItem,
} from '../types/gig.ts';
import { createEmptyGigFormData } from '../data/demoData.ts';
import {
  clearAdminDraft,
  loadAdminDraft,
  recordRecentGig,
  saveAdminDraft,
  savePublicGigCache,
} from '../utils/storage.ts';
import { parseTimeToMinutes } from '../utils/time.ts';
import { saveGigToServer } from '../services/gigApi.ts';
import { useCopyFeedback } from '../hooks/useCopyFeedback.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { MusicianView } from './MusicianView.tsx';
import { ShareModal } from './ShareModal.tsx';

interface EditorViewProps {
  initialGig?: GigData | null;
  adminToken?: string;
  onNavigate: (path: string) => void;
  onGigSaved: (gig: GigData) => void;
}

const QUICK_SWATCHES: { name: string; hex: string }[] = [
  { name: 'Konsertsvart', hex: '#121214' },
  { name: 'Kritvit', hex: '#F8FAFC' },
  { name: 'Antikguld', hex: '#D4AF37' },
  { name: 'Midnattsblå', hex: '#1E293B' },
  { name: 'Vinröd', hex: '#7F1D1D' },
  { name: 'Skogsgrön', hex: '#14532D' },
  { name: 'Silvergrå', hex: '#94A3B8' },
  { name: 'Bärnsten', hex: '#D97706' },
];

const INPUT_CLASS =
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-amber-500 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors';

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const EditorView: React.FC<EditorViewProps> = ({
  initialGig,
  adminToken,
  onNavigate,
  onGigSaved,
}) => {
  const isEditingExisting = Boolean(adminToken && initialGig);
  const draftKey = adminToken || 'new_gig_v2';

  const getInitialFormState = (): Omit<GigData, 'publicId' | 'updatedAt'> => {
    if (initialGig) {
      return {
        adminToken: initialGig.adminToken || adminToken,
        title: initialGig.title,
        ensemble: initialGig.ensemble,
        date: initialGig.date,
        venue: initialGig.venue,
        address: initialGig.address,
        generalNotes: initialGig.generalNotes,
        schedule:
          initialGig.schedule.length > 0
            ? initialGig.schedule
            : createEmptyGigFormData().schedule,
        contacts: initialGig.contacts,
        backstage: initialGig.backstage,
        setlistEnabled: initialGig.setlistEnabled,
        setlist: initialGig.setlist,
      };
    }

    const savedDraft = loadAdminDraft(draftKey);
    if (savedDraft?.data) {
      return savedDraft.data;
    }

    return createEmptyGigFormData();
  };

  const [formData, setFormData] = useState<Omit<GigData, 'publicId' | 'updatedAt'>>(
    getInitialFormState
  );
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [savedGig, setSavedGig] = useState<GigData | null>(initialGig || null);
  const effectiveAdminToken = savedGig?.adminToken || adminToken;
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'offline_queued' | 'error'
  >(isEditingExisting ? 'saved' : 'idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const { copiedKey: copiedInline, copyWithFeedback: copyInlineLink } =
    useCopyFeedback<'public' | 'admin'>(2000);

  useEffect(() => {
    saveAdminDraft(draftKey, formData);
  }, [draftKey, formData]);

  const handleResetEmpty = () => {
    clearAdminDraft(draftKey);
    setFormData(createEmptyGigFormData());
    setValidationMessage(null);
  };

  const handleSave = useCallback(
    async (openShareAfterCreate = true) => {
      if (!formData.title.trim()) {
        setValidationMessage('Fyll i evenemangets namn längst upp innan du sparar.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setValidationMessage(null);

      if (!navigator.onLine) {
        setSaveState('offline_queued');
        return;
      }

      setSaveState('saving');
      try {
        const isUpdate = Boolean(effectiveAdminToken);
        const saved = await saveGigToServer(formData, effectiveAdminToken);

        setSavedGig(saved);
        setSaveState('saved');
        clearAdminDraft(draftKey);
        savePublicGigCache(saved);
        recordRecentGig({
          publicId: saved.publicId,
          adminToken: saved.adminToken || effectiveAdminToken,
          title: saved.title,
          ensemble: saved.ensemble,
          date: saved.date,
          venue: saved.venue,
          lastVisitedAt: new Date().toISOString(),
        });
        onGigSaved(saved);

        if (!isUpdate && saved.adminToken) {
          window.history.replaceState({}, '', `/edit/${encodeURIComponent(saved.adminToken)}`);
          if (openShareAfterCreate) {
            setShowShareModal(true);
          }
        }
      } catch (err) {
        if (!navigator.onLine) {
          setSaveState('offline_queued');
        } else {
          setSaveState('error');
          setValidationMessage(
            err instanceof Error ? err.message : 'Kunde inte spara körschemat.'
          );
        }
      }
    },
    [draftKey, effectiveAdminToken, formData, onGigSaved]
  );

  useEffect(() => {
    const handleOnline = () => {
      if (effectiveAdminToken && saveState === 'offline_queued') {
        void handleSave(false);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [effectiveAdminToken, handleSave, saveState]);

  // Schedule list helpers
  const updateScheduleItem = (id: string, patch: Partial<ScheduleItem>) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const addScheduleItem = () => {
    const lastItem = formData.schedule[formData.schedule.length - 1];
    const nextTime = lastItem?.endTime || lastItem?.time || '';
    setFormData((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          id: makeId('sch'),
          time: nextTime,
          endTime: '',
          title: '',
          description: '',
          location: '',
          highlight: false,
        },
      ],
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const moveScheduleItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= formData.schedule.length) return;
    setFormData((prev) => {
      const next = [...prev.schedule];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, schedule: next };
    });
    if (effectiveAdminToken) setSaveState('idle');
  };

  const sortScheduleChronologically = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule].sort(
        (a, b) => (parseTimeToMinutes(a.time) ?? 9999) - (parseTimeToMinutes(b.time) ?? 9999)
      ),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const removeScheduleItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((item) => item.id !== id),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  // Contacts helpers
  const updateContact = (id: string, patch: Partial<ContactPerson>) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { id: makeId('cnt'), name: '', role: '', phone: '' },
      ],
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const removeContact = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  // Dresscode colors helpers
  const addDressColor = (name = '', hex = '#121214') => {
    setFormData((prev) => ({
      ...prev,
      backstage: {
        ...prev.backstage,
        dressCodeColors: [
          ...prev.backstage.dressCodeColors,
          { id: makeId('clr'), name, hex },
        ],
      },
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const updateDressColor = (id: string, patch: Partial<DressCodeColor>) => {
    setFormData((prev) => ({
      ...prev,
      backstage: {
        ...prev.backstage,
        dressCodeColors: prev.backstage.dressCodeColors.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const removeDressColor = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      backstage: {
        ...prev.backstage,
        dressCodeColors: prev.backstage.dressCodeColors.filter((c) => c.id !== id),
      },
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  // Setlist helpers
  const addSetlistItem = () => {
    setFormData((prev) => ({
      ...prev,
      setlistEnabled: true,
      setlist: [
        ...prev.setlist,
        {
          id: makeId('sng'),
          title: '',
          key: '',
          tempo: '',
          soloistOrNotes: '',
          setHeader: '',
        },
      ],
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const updateSetlistItem = (id: string, patch: Partial<SetlistItem>) => {
    setFormData((prev) => ({
      ...prev,
      setlist: prev.setlist.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  const moveSetlistItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= formData.setlist.length) return;
    setFormData((prev) => {
      const next = [...prev.setlist];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, setlist: next };
    });
    if (effectiveAdminToken) setSaveState('idle');
  };

  const removeSetlistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      setlist: prev.setlist.filter((s) => s.id !== id),
    }));
    if (effectiveAdminToken) setSaveState('idle');
  };

  if (isPreview) {
    const previewGig: GigData = {
      ...formData,
      publicId: savedGig?.publicId || 'forhandsgranskning',
      adminToken: effectiveAdminToken,
      updatedAt: new Date().toISOString(),
    };
    return (
      <MusicianView
        gig={previewGig}
        isPreviewMode={true}
        onNavigate={onNavigate}
        onExitPreview={() => setIsPreview(false)}
      />
    );
  }

  const currentPublicUrl = savedGig
    ? `${window.location.origin}/g/${encodeURIComponent(savedGig.publicId)}`
    : '';
  const currentAdminUrl = effectiveAdminToken
    ? `${window.location.origin}/edit/${encodeURIComponent(effectiveAdminToken)}`
    : '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-28 transition-colors">
      {/* Sticky Top Action Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 dark:border-zinc-900 bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-900 dark:text-white hover:text-amber-500 transition-colors cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              GigBladet
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {savedGig ? 'Redigera' : 'Nytt körschema'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveState === 'offline_queued' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <CloudOff className="w-3.5 h-3.5" />
                Sparat lokalt
              </span>
            )}
            {saveState === 'saved' && savedGig && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 px-2">
                <Check className="w-3.5 h-3.5" />
                Sparat
              </span>
            )}

            <ThemeToggle />

            {!savedGig && (
              <button
                type="button"
                onClick={handleResetEmpty}
                title="Rensa alla fält"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rensa</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Förhandsgranska</span>
            </button>

            {savedGig && (
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Dela</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saveState === 'saving'}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 disabled:opacity-60 text-white dark:text-zinc-950 font-semibold px-4 py-1.5 text-xs transition-opacity cursor-pointer"
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sparar...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{savedGig ? 'Spara' : 'Publicera'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-6 pt-10 space-y-10">
        {/* Intro / Helper Note */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {savedGig ? 'Redigera körschema' : 'Skapa nytt körschema'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Fyll bara i de fält som är relevanta för ert gig. Alla fält och sektioner som lämnas tomma döljs automatiskt i musikernas vy.
          </p>
        </div>

        {validationMessage && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300">
            {validationMessage}
          </div>
        )}

        {/* DELA-LÄGE BANNER (when gig has been created/saved) */}
        {savedGig && (
          <section
            aria-label="Delningslänkar"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Delningslänkar
              </h2>
              <button
                type="button"
                onClick={() => onNavigate(`/g/${encodeURIComponent(savedGig.publicId)}`)}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Öppna musiker-vyn →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Musician Link */}
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    1. Länk till musikerna
                  </span>
                  <button
                    type="button"
                    onClick={() => copyInlineLink(currentPublicUrl, 'public')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiedInline === 'public' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Kopierad</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Kopiera</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                  {currentPublicUrl}
                </div>
              </div>

              {/* Secret Admin Link */}
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    2. Länk för att ändra (Admin)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyInlineLink(currentAdminUrl, 'admin')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiedInline === 'admin' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Kopierad</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Kopiera</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                  {currentAdminUrl}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 1. GRUNDUPPGIFTER (GIG-HUVUD) */}
        <section
          aria-label="Grunduppgifter"
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              1. Gig-huvud & Plats
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Endast evenemangets namn är obligatoriskt. Fyller du i spelställe eller adress skapas en direktlänk till kartappen för musikerna.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Evenemangets namn *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  if (validationMessage) setValidationMessage(null);
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Höstkonsert, Bröllopsspelning eller Klubbkväll"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Ensemble / Band / Kör (valfritt)
              </label>
              <input
                type="text"
                value={formData.ensemble}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, ensemble: e.target.value }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Kammarkören eller kvartettens namn"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Datum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, date: e.target.value }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Spelställe / Lokal (valfritt)
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, venue: e.target.value }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Katarina Kyrka, Fasching eller Stora salen"
                className={INPUT_CLASS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Gatuadress & Ort (valfritt – aktiverar "Öppna karta"-knappen)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, address: e.target.value }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Högbergsgatan 13, Stockholm"
                className={INPUT_CLASS}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Viktig ankomstnotis högst upp (valfritt)
              </label>
              <input
                type="text"
                value={formData.generalNotes}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, generalNotes: e.target.value }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Ingång via södra porten mot gården. Medtag legitimation och notställ."
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>

        {/* 2. TIDSLINJE / KÖRSCHEMA */}
        <section
          aria-label="Redigera körschema"
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 sm:p-7 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                2. Körschema & Hålltider
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lägg till tider för t.ex. samling, soundcheck, matpaus och konsertstart. Rader utan rubrik ignoreras.
              </p>
            </div>
            {formData.schedule.length > 1 && (
              <button
                type="button"
                onClick={sortScheduleChronologically}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Sortera kronologiskt
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {formData.schedule.map((item, idx) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="grid grid-cols-12 gap-2.5 items-center">
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">
                      Starttid
                    </label>
                    <input
                      type="time"
                      value={item.time}
                      onChange={(e) => updateScheduleItem(item.id, { time: e.target.value })}
                      className={`${INPUT_CLASS} font-mono !px-2.5 !py-2`}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">
                      Sluttid (valfri)
                    </label>
                    <input
                      type="time"
                      value={item.endTime || ''}
                      onChange={(e) => updateScheduleItem(item.id, { endTime: e.target.value })}
                      className={`${INPUT_CLASS} font-mono !px-2.5 !py-2`}
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">
                      Hållpunkt / Aktivitet
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateScheduleItem(item.id, { title: e.target.value })}
                      placeholder="t.ex. Inlastning, Soundcheck, Middag eller Konsertstart"
                      className={`${INPUT_CLASS} font-medium !py-2`}
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-1 pt-1 sm:pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        updateScheduleItem(item.id, { highlight: !item.highlight })
                      }
                      title="Markera som huvudpunkt / konsertstart"
                      className={`rounded-lg border px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                        item.highlight
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveScheduleItem(idx, -1)}
                      disabled={idx === 0}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Flytta upp"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScheduleItem(idx, 1)}
                      disabled={idx === formData.schedule.length - 1}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Flytta ner"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(item.id)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      aria-label="Ta bort rad"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="text"
                      value={item.location || ''}
                      onChange={(e) => updateScheduleItem(item.id, { location: e.target.value })}
                      placeholder="Plats i lokalen (valfritt, t.ex. Stora scenen)"
                      className={`${INPUT_CLASS} !text-xs !py-2`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) =>
                        updateScheduleItem(item.id, { description: e.target.value })
                      }
                      placeholder="Detaljer (valfritt, t.ex. Alla klara på scen med ställda instrument)"
                      className={`${INPUT_CLASS} !text-xs !py-2`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addScheduleItem}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-amber-500/60 py-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Lägg till hållpunkt
          </button>
        </section>

        {/* 3. BACKSTAGE & PRAKTISKT */}
        <section
          aria-label="Backstage och praktisk info"
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 sm:p-7 space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              3. Backstage & Praktiskt (Valfritt)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fyll endast i det som behövs. Om du t.ex. lämnar Wi-Fi eller parkering tomt så visas inte de korten för musikerna.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Dörr- / Scenkod
              </label>
              <input
                type="text"
                value={formData.backstage.doorCode}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, doorCode: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. #2408* eller Porttelefon 04"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Logeplacering
              </label>
              <input
                type="text"
                value={formData.backstage.greenRoom}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, greenRoom: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Loge A & B (1 tr ner bakom scenen)"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Wi-Fi-nätverk (SSID)
              </label>
              <input
                type="text"
                value={formData.backstage.wifiName}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, wifiName: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Artist_Guest_5G"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Wi-Fi-lösenord (får en 1-klicks kopiera-knapp)
              </label>
              <input
                type="text"
                value={formData.backstage.wifiPassword}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, wifiPassword: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Soundcheck2026!"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          {/* Dress Code & Visual Color Swatches */}
          <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-5 space-y-3.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Klädkod (valfri text och/eller visuella färgcirklar)
            </label>
            <input
              type="text"
              value={formData.backstage.dressCodeText}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  backstage: { ...prev.backstage, dressCodeText: e.target.value },
                }));
                if (effectiveAdminToken) setSaveState('idle');
              }}
              placeholder="t.ex. Helklätt svart med valfri detalj i mässing/guld, svarta skor"
              className={INPUT_CLASS}
            />

            <div className="space-y-2.5">
              {formData.backstage.dressCodeColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.backstage.dressCodeColors.map((color) => (
                    <div
                      key={color.id}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-2 pr-3 py-1"
                    >
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => updateDressColor(color.id, { hex: e.target.value })}
                        className="h-5 w-5 rounded-full cursor-pointer bg-transparent border-0"
                        aria-label="Välj färg"
                      />
                      <input
                        type="text"
                        value={color.name}
                        onChange={(e) => updateDressColor(color.id, { name: e.target.value })}
                        placeholder="Färgnamn"
                        className="w-24 bg-transparent text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeDressColor(color.id)}
                        className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                        aria-label="Ta bort färg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 mr-1">
                  Lägg till färgcirkel (valfritt):
                </span>
                {QUICK_SWATCHES.map((sw) => (
                  <button
                    key={sw.name}
                    type="button"
                    onClick={() => addDressColor(sw.name, sw.hex)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-600 dark:text-zinc-300 cursor-pointer"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/15 dark:border-white/20"
                      style={{ backgroundColor: sw.hex }}
                    />
                    + {sw.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-5">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Mat & Fika
              </label>
              <textarea
                rows={2}
                value={formData.backstage.foodInfo}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, foodInfo: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Varm soppa och smörgås serveras kl 17:30 i logen. Kaffe finns hela kvällen."
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Parkering & Lastkaj
              </label>
              <textarea
                rows={2}
                value={formData.backstage.parkingInfo}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    backstage: { ...prev.backstage, parkingInfo: e.target.value },
                  }));
                  if (effectiveAdminToken) setSaveState('idle');
                }}
                placeholder="t.ex. Fri ilastning vid bakre lastkajen i 15 min, därefter P-hus 200 m bort."
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>

        {/* 4. KONTAKTPERSONER */}
        <section
          aria-label="Kontaktpersoner"
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 sm:p-7 space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              4. Kontaktpersoner (Valfritt)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Lägg till t.ex. kapellmästare, producent eller ljudtekniker så kan musikerna ringa direkt med ett tryck.
            </p>
          </div>

          {formData.contacts.length > 0 && (
            <div className="space-y-3">
              {formData.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, { name: e.target.value })}
                      placeholder="Namn (t.ex. Maria Lindqvist)"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={contact.role}
                      onChange={(e) => updateContact(contact.id, { role: e.target.value })}
                      placeholder="Roll (t.ex. Kapellmästare / Ljud)"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, { phone: e.target.value })}
                      placeholder="Telefon (t.ex. 070-123 45 67)"
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      aria-label="Ta bort kontakt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Lägg till kontaktperson
          </button>
        </section>

        {/* 5. SETLIST / REPERTOAR */}
        <section
          aria-label="Setlist och repertoar"
          className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                5. Setlist / Repertoar (Valfritt)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lägg till låtlista med tonart, tempo (BPM) och solistnoteringar om ni vill ha repertoaren på samma blad.
              </p>
            </div>
            {formData.setlist.length > 0 && (
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.setlistEnabled}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, setlistEnabled: e.target.checked }));
                    if (effectiveAdminToken) setSaveState('idle');
                  }}
                  className="h-4 w-4 rounded accent-amber-500"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Visa
                </span>
              </label>
            )}
          </div>

          {formData.setlistEnabled && formData.setlist.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {formData.setlist.map((song, idx) => (
                <div key={song.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400 w-5">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={song.title}
                        onChange={(e) =>
                          updateSetlistItem(song.id, { title: e.target.value })
                        }
                        placeholder="Låttitel (t.ex. Fly Me to the Moon)"
                        className={`${INPUT_CLASS} !py-2 font-medium`}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <input
                        type="text"
                        value={song.key}
                        onChange={(e) => updateSetlistItem(song.id, { key: e.target.value })}
                        placeholder="Tonart (t.ex. Cm)"
                        className={`${INPUT_CLASS} !py-2 !text-xs font-mono`}
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <input
                        type="text"
                        value={song.tempo}
                        onChange={(e) =>
                          updateSetlistItem(song.id, { tempo: e.target.value })
                        }
                        placeholder="Tempo (116 BPM)"
                        className={`${INPUT_CLASS} !py-2 !text-xs font-mono`}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveSetlistItem(idx, -1)}
                        disabled={idx === 0}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        aria-label="Flytta upp låt"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSetlistItem(idx, 1)}
                        disabled={idx === formData.setlist.length - 1}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        aria-label="Flytta ner låt"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSetlistItem(song.id)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        aria-label="Ta bort låt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pl-7">
                    <div>
                      <input
                        type="text"
                        value={song.setHeader || ''}
                        onChange={(e) =>
                          updateSetlistItem(song.id, { setHeader: e.target.value })
                        }
                        placeholder="Set-rubrik ovanför (valfritt, t.ex. Set 1)"
                        className={`${INPUT_CLASS} !py-1.5 !text-xs`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={song.soloistOrNotes}
                        onChange={(e) =>
                          updateSetlistItem(song.id, { soloistOrNotes: e.target.value })
                        }
                        placeholder="Solist / Arr-notering (valfritt, t.ex. Solo: Maja • A cappella-intro)"
                        className={`${INPUT_CLASS} !py-1.5 !text-xs`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addSetlistItem}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-amber-500/60 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Lägg till låt i setlisten
          </button>
        </section>

        {/* Bottom Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-zinc-400 dark:text-zinc-500">
            Inga konton behövs. Ändringar mellanlagras automatiskt på enheten.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-5 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Förhandsgranska
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saveState === 'saving'}
              className="rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 text-white dark:text-zinc-950 font-semibold px-6 py-2.5 text-xs sm:text-sm transition-opacity cursor-pointer"
            >
              {savedGig ? 'Spara & Visa länkar' : 'Publicera & Få länkar'}
            </button>
          </div>
        </div>
      </main>

      {showShareModal && savedGig && (
        <ShareModal
          gig={savedGig}
          onClose={() => setShowShareModal(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
