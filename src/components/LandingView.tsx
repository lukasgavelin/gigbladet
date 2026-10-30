import React from 'react';
import {
  ArrowRight,
  ArrowSquareOut,
  Broadcast,
  DeviceMobile,
  Key,
  PencilSimple,
  Plus,
  ShieldCheck,
  WifiSlash,
} from '@phosphor-icons/react';
import { getRecentGigs } from '../utils/storage.ts';
import { formatSwedishDate } from '../utils/time.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface LandingViewProps {
  onNavigate: (path: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const recentGigs = getRecentGigs();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 dark:border-zinc-900 bg-zinc-50/85 dark:bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span className="text-sm font-bold tracking-widest uppercase text-zinc-900 dark:text-white">
              GigBladet
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => onNavigate('/g/demo-soul')}
              className="hidden sm:inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Demoläge
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/ny')}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 text-white dark:text-zinc-950 font-semibold px-4 py-1.5 text-xs transition-opacity cursor-pointer"
            >
              <Plus weight="bold" className="w-3.5 h-3.5" />
              Nytt körschema
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 sm:px-6 py-16 sm:py-24 space-y-20">
        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto space-y-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Noll kontotvång • Fungerar offline • Backstage-redo
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Det friktionsfria körschemat för musiker och ensembler.
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Samla hålltider, live-puls, portkoder, Wi-Fi, klädkod och setlist på en enda länk. Musikerna klickar och har allt direkt på skärmen – även utan täckning i logen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => onNavigate('/ny')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 dark:bg-amber-500 hover:opacity-90 text-white dark:text-zinc-950 font-semibold px-7 py-3.5 text-sm transition-opacity cursor-pointer"
            >
              <span>Skapa nytt gig-blad</span>
              <ArrowRight weight="bold" className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/g/demo-soul')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium px-6 py-3.5 text-sm transition-colors cursor-pointer"
            >
              <Broadcast weight="duotone" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Öppna demoläge</span>
            </button>
          </div>
        </section>

        {/* Demo Mode Section */}
        <section className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Demoläge (Exempeldata)
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Se hur ett färdigifyllt gig-blad ser ut för musikerna eller testa att redigera.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 flex flex-col justify-between gap-5">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Demo 1 • Band / Klubbspelning
                </div>
                <div className="text-base font-semibold text-zinc-900 dark:text-white">
                  Soul & Brass Night – Live på Fasching
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Exempel med hålltider, setlist, portkod, Wi-Fi och klädkod.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('/g/demo-soul')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-950 font-medium px-4 py-2 text-xs transition-opacity cursor-pointer"
                >
                  <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
                  Musiker-vy
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/edit/adm_demo_soul_secret')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-4 py-2 text-xs transition-colors cursor-pointer"
                >
                  <PencilSimple weight="duotone" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Redigera demo
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-6 flex flex-col justify-between gap-5">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Demo 2 • Vokalensemble / Kör
                </div>
                <div className="text-base font-semibold text-zinc-900 dark:text-white">
                  Höstkonsert: Nordiskt Ljus
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Exempel med akustikprov, stämrep, klädkod och körrepertoar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('/g/demo-kor')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-950 font-medium px-4 py-2 text-xs transition-opacity cursor-pointer"
                >
                  <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
                  Musiker-vy
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/edit/adm_demo_kor_secret')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-4 py-2 text-xs transition-colors cursor-pointer"
                >
                  <PencilSimple weight="duotone" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  Redigera demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Gigs on Device */}
        {recentGigs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Senast använda på den här enheten
            </h2>
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
              {recentGigs.map((item) => (
                <div
                  key={item.publicId}
                  className="px-5 py-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.ensemble ? `${item.ensemble} • ` : ''}
                      {formatSwedishDate(item.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/g/${encodeURIComponent(item.publicId)}`)}
                      className="rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    >
                      Visa
                    </button>
                    {item.adminToken && (
                      <button
                        type="button"
                        onClick={() => onNavigate(`/edit/${encodeURIComponent(item.adminToken!)}`)}
                        title="Redigera med sparad admin-länk"
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Key weight="duotone" className="w-3 h-3" />
                        Admin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Core Principles Section */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-zinc-200/70 dark:border-zinc-900 pt-10">
          <div className="space-y-2">
            <DeviceMobile weight="duotone" className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Noll friktion</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Inga appar att ladda ner, inga konton och inga lösenord för ensemblen.
            </p>
          </div>
          <div className="space-y-2">
            <WifiSlash weight="duotone" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Offline backstage
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Cachas automatiskt i telefonen så schemat kan läsas även utan täckning.
            </p>
          </div>
          <div className="space-y-2">
            <ShieldCheck weight="duotone" className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Endast det du fyller i syns
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Fält och sektioner som du lämnar tomma döljs automatiskt i musikernas vy.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-zinc-200/70 dark:border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">GigBladet</span>
            <span>– Det friktionsfria körschemat för musiker</span>
          </div>
          <a
            href="https://github.com/lukasgavelin/gigbladet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <span>Öppen källkod & teknisk dokumentation</span>
            <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
          </a>
        </footer>
      </main>
    </div>
  );
};
