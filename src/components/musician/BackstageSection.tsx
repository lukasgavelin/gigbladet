import React from 'react';
import {
  Car,
  Check,
  Coffee,
  Copy,
  DoorOpen,
  Palette,
  Wifi,
} from 'lucide-react';
import type { BackstageInfo } from '../../types/gig.ts';

interface BackstageSectionProps {
  backstage: BackstageInfo;
  copiedKey: string | null;
  onCopy: (text: string, key: 'wifi' | 'door' | 'share') => void;
}

const SAFE_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export const BackstageSection: React.FC<BackstageSectionProps> = ({
  backstage,
  copiedKey,
  onCopy,
}) => {
  const doorCode = backstage.doorCode.trim();
  const greenRoom = backstage.greenRoom.trim();
  const wifiName = backstage.wifiName.trim();
  const wifiPassword = backstage.wifiPassword.trim();
  const dressCodeText = backstage.dressCodeText.trim();
  const validColors = (backstage.dressCodeColors || []).filter(
    (c) => c.name.trim().length > 0
  );
  const foodInfo = backstage.foodInfo.trim();
  const parkingInfo = backstage.parkingInfo.trim();

  const hasDoorOrRoom = Boolean(doorCode || greenRoom);
  const hasWifi = Boolean(wifiName || wifiPassword);
  const hasDressCode = Boolean(dressCodeText || validColors.length > 0);
  const hasFoodOrParking = Boolean(foodInfo || parkingInfo);

  const hasBackstageInfo =
    hasDoorOrRoom || hasWifi || hasDressCode || hasFoodOrParking;

  if (!hasBackstageInfo) return null;

  return (
    <section aria-label="Backstage och praktiskt" className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Backstage & Praktiskt
      </h2>

      {(hasDoorOrRoom || hasWifi) && (
        <div
          className={`grid grid-cols-1 gap-4 ${
            hasDoorOrRoom && hasWifi ? 'sm:grid-cols-2' : ''
          }`}
        >
          {/* Door Code & Green Room */}
          {hasDoorOrRoom && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <DoorOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Dörrkod & Loge</span>
                </div>

                {doorCode && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        Scen- / Portkod
                      </div>
                      <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-amber-400 tracking-wider mt-0.5">
                        {doorCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopy(doorCode, 'door')}
                      className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'door' ? (
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
                )}

                {greenRoom && (
                  <div
                    className={`text-sm text-zinc-600 dark:text-zinc-300 ${
                      doorCode
                        ? 'pt-2 border-t border-zinc-100 dark:border-zinc-800/60'
                        : 'pt-1'
                    }`}
                  >
                    <span className="text-zinc-400 dark:text-zinc-500">Loge: </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {greenRoom}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wi-Fi */}
          {hasWifi && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <Wifi className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span>Wi-Fi</span>
                </div>

                {wifiName && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 pt-1">
                    Nätverk:{' '}
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {wifiName}
                    </span>
                  </div>
                )}

                {wifiPassword && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Lösenord:{' '}
                    <span className="font-mono font-medium text-zinc-900 dark:text-amber-300">
                      {wifiPassword}
                    </span>
                  </div>
                )}
              </div>

              {wifiPassword && (
                <button
                  type="button"
                  onClick={() => onCopy(wifiPassword, 'wifi')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3.5 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  {copiedKey === 'wifi' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Lösenord kopierat
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Kopiera Wi-Fi-lösenord</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dress Code with Visual Color Circles */}
      {hasDressCode && (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-5 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Palette className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Klädkod</span>
          </div>

          {dressCodeText && (
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
              {dressCodeText}
            </p>
          )}

          {validColors.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-0.5">
              {validColors.map((color) => {
                const safeHex = SAFE_HEX_REGEX.test(color.hex) ? color.hex : '#18181B';
                return (
                  <div
                    key={color.id}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 dark:border-white/25 shrink-0"
                      style={{ backgroundColor: safeHex }}
                    />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {color.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Food & Parking */}
      {hasFoodOrParking && (
        <div
          className={`grid grid-cols-1 gap-4 ${
            foodInfo && parkingInfo ? 'sm:grid-cols-2' : ''
          }`}
        >
          {foodInfo && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Coffee className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Mat & Fika</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {foodInfo}
              </p>
            </div>
          )}

          {parkingInfo && (
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Parkering & Lastkaj</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {parkingInfo}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
