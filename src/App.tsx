import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import type { GigData } from './types/gig.ts';
import { GIG_PRESETS, getTodayDateString } from './data/presets.ts';
import { loadPublicGigCache, savePublicGigCache } from './utils/storage.ts';
import { fetchAdminGig, fetchPublicGig } from './services/gigApi.ts';
import { LandingView } from './components/LandingView.tsx';
import { MusicianView } from './components/MusicianView.tsx';
import { EditorView } from './components/EditorView.tsx';

function safeDecodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getFallbackDemoGig(publicId: string): GigData | null {
  if (publicId === 'demo-soul') {
    const preset = GIG_PRESETS.find((p) => p.key === 'band')!;
    return {
      ...preset.defaultData,
      date: getTodayDateString(),
      publicId: 'demo-soul',
      updatedAt: new Date().toISOString(),
    };
  }
  if (publicId === 'demo-kor') {
    const preset = GIG_PRESETS.find((p) => p.key === 'choir')!;
    return {
      ...preset.defaultData,
      date: getTodayDateString(),
      publicId: 'demo-kor',
      updatedAt: new Date().toISOString(),
    };
  }
  return null;
}

export const App: React.FC = () => {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);
  const [gigData, setGigData] = useState<GigData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setPathname(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRouteData = async () => {
      setError(null);
      setIsOfflineFallback(false);

      if (pathname.startsWith('/g/')) {
        const publicId = safeDecodeParam(pathname.slice(3).replace(/\/+$/, ''));
        const cached = loadPublicGigCache(publicId);
        if (cached) {
          setGigData(cached);
        } else {
          setLoading(true);
        }

        try {
          const fresh = await fetchPublicGig(publicId);
          if (!cancelled) {
            if (cached?.adminToken && !fresh.adminToken) {
              fresh.adminToken = cached.adminToken;
            }
            setGigData(fresh);
            savePublicGigCache(fresh);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            if (cached) {
              setGigData(cached);
              setIsOfflineFallback(true);
              setLoading(false);
            } else {
              const demoFallback = getFallbackDemoGig(publicId);
              if (demoFallback) {
                setGigData(demoFallback);
                savePublicGigCache(demoFallback);
                setIsOfflineFallback(true);
                setLoading(false);
              } else {
                setError('Kunde inte hitta körschemat eller så saknas internetanslutning.');
                setLoading(false);
              }
            }
          }
        }
        return;
      }

      if (pathname.startsWith('/edit/')) {
        const adminToken = safeDecodeParam(pathname.slice(6).replace(/\/+$/, ''));
        setLoading(true);
        try {
          const data = await fetchAdminGig(adminToken);
          if (!cancelled) {
            setGigData(data);
            savePublicGigCache(data);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError('Kunde inte ladda administratörslänken. Kontrollera att länken är komplett.');
            setLoading(false);
          }
        }
        return;
      }

      setGigData(null);
      setLoading(false);
    };

    void loadRouteData();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-6 h-6 text-amber-500 dark:text-amber-400 animate-spin" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Laddar körschema...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 text-center space-y-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-white">
            Kunde inte öppna gig-bladet
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 text-white dark:text-zinc-950 font-semibold px-5 py-2.5 text-xs transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Till startsidan
          </button>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/g/') && gigData) {
    return (
      <MusicianView
        gig={gigData}
        isOfflineFallback={isOfflineFallback}
        onNavigate={navigate}
      />
    );
  }

  if (pathname.startsWith('/edit/')) {
    const adminToken = safeDecodeParam(pathname.slice(6).replace(/\/+$/, ''));
    return (
      <EditorView
        key={adminToken}
        initialGig={gigData}
        adminToken={adminToken}
        onNavigate={navigate}
        onGigSaved={(saved) => setGigData(saved)}
      />
    );
  }

  if (pathname === '/ny') {
    return (
      <EditorView
        key="new-gig"
        onNavigate={navigate}
        onGigSaved={(saved) => setGigData(saved)}
      />
    );
  }

  return <LandingView onNavigate={navigate} />;
};
