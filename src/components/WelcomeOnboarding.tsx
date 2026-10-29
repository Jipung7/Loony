import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { HoloMascotEyes } from './HoloMascotEyes';
import { ThemeMode } from '../types';

/**
 * Welcome Onboarding Loony (tampil sekali saat pertama kali aplikasi dibuka / setelah reset).
 * Urutan animasi:
 *  0) 'capsule' : Kapsul kecil berisi Loony muncul di tengah layar, berkedip lalu tersenyum.
 *  1) 'greet'   : Kapsul sedikit membesar, sapaan muncul di bawah Loony.
 *  2) 'form'    : Kapsul membesar menjadi jendela, Loony meluncur ke atas, kontrol muncul
 *                 dengan efek "pop-out" + sedikit bounce.
 *  3) 'exit'    : Setelah Mulai / Lewati, jendela mengecil kembali menjadi kapsul lalu memudar.
 * Kapsul utama & jendela ruang kerja belum dirender sampai onboarding selesai.
 */
type Phase = 'capsule' | 'greet' | 'form' | 'exit';

const SIZE: Record<Phase, { w: number; h: number; r: number }> = {
  capsule: { w: 132, h: 54, r: 27 },
  greet: { w: 340, h: 132, r: 28 },
  form: { w: 360, h: 416, r: 26 },
  exit: { w: 132, h: 54, r: 27 },
};

// Posisi vertikal kotak mata Loony (tinggi kotak 40px) di dalam kapsul/jendela
const EYES_TOP: Record<Phase, number> = {
  capsule: 7,
  greet: 26,
  form: 30,
  exit: 7,
};

const SIZE_TRANSITION = { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const };
const POP_SPRING = { type: 'spring' as const, stiffness: 420, damping: 17, mass: 0.7 };

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string }> = [
  { id: 'dark', label: 'Gelap' },
  { id: 'light', label: 'Terang' },
  { id: 'system', label: 'Sistem' },
];

export const WelcomeOnboarding: React.FC = () => {
  const { settings, updateSettings, resolvedWindowTheme, t } = useApp();
  const [phase, setPhase] = useState<Phase>('capsule');
  const [isHappy, setIsHappy] = useState(false);
  const [name, setName] = useState(settings.userNickname || '');

  // Jendela overlay Electron harus menerima klik selama onboarding berlangsung
  useEffect(() => {
    window.electronAPI?.setIgnoreMouseEvents?.(false);
  }, []);

  // Jalankan urutan animasi pembuka
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setIsHappy(true), 900),
      window.setTimeout(() => setPhase('greet'), 1600),
      window.setTimeout(() => setPhase('form'), 3900),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const finish = (saveName: boolean) => {
    if (phase === 'exit') return;
    setPhase('exit');
    setIsHappy(true);
    window.setTimeout(() => {
      window.electronAPI?.setIgnoreMouseEvents?.(true);
      updateSettings({
        ...(saveName && name.trim() ? { userNickname: name.trim() } : {}),
        hasCompletedOnboarding: true,
      });
    }, 650);
  };

  const size = SIZE[phase];
  const prayerOn = settings.prayerFeatureEnabled !== false;
  const eyesMood = phase === 'form' ? (name.trim() ? 'happy' : 'neutral') : isHappy ? 'happy' : 'neutral';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-auto">
      {/* Latar redup lembut, muncul bersamaan dengan jendela */}
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'form' ? 1 : phase === 'exit' ? 0 : 0.35 }}
        transition={{ duration: 0.6 }}
      />

      <motion.div
        data-theme={resolvedWindowTheme}
        className="window-glass relative overflow-hidden text-zinc-100"
        initial={{ width: SIZE.capsule.w, height: SIZE.capsule.h, borderRadius: 27, scale: 0.4, opacity: 0 }}
        animate={{
          width: size.w,
          height: size.h,
          borderRadius: size.r,
          scale: 1,
          opacity: phase === 'exit' ? 0 : 1,
        }}
        transition={{
          width: SIZE_TRANSITION,
          height: SIZE_TRANSITION,
          borderRadius: SIZE_TRANSITION,
          scale: { type: 'spring', stiffness: 380, damping: 16 },
          opacity: phase === 'exit' ? { duration: 0.3, delay: 0.35 } : { duration: 0.25 },
        }}
      >
        {/* Loony: tengah kapsul -> meluncur halus ke bagian atas jendela */}
        <motion.div
          className="absolute left-0 right-0 h-10 flex items-center justify-center select-none pointer-events-none"
          initial={{ top: EYES_TOP.capsule, scale: 1 }}
          animate={{ top: EYES_TOP[phase], scale: phase === 'form' ? 1.2 : 1 }}
          transition={SIZE_TRANSITION}
        >
          <HoloMascotEyes mood={eyesMood} size="sm" isCapsuleIdle={false} />
        </motion.div>

        {/* Sapaan pembuka */}
        <AnimatePresence>
          {phase === 'greet' && (
            <motion.div
              key="greet"
              className="absolute left-0 right-0 top-[76px] px-6 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.45 } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            >
              <div className="text-[13px] font-semibold text-zinc-100">
                {settings.language === 'en' ? "Hi, I'm Loony." : 'Hai, aku Loony.'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {settings.language === 'en'
                  ? 'Ready to help you be more productive'
                  : 'Siap membantumu lebih produktif'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kontrol onboarding: muncul "pop-out" dengan sedikit bounce secara berurutan */}
        <AnimatePresence>
          {phase === 'form' && (
            <motion.div
              key="form"
              className="absolute left-0 right-0 top-[96px] px-6 flex flex-col gap-3.5"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              variants={{
                hidden: {},
                show: { transition: { delayChildren: 0.45, staggerChildren: 0.09 } },
              }}
            >
              {/* Pilihan Bahasa Cepat (Quick Language Toggle) */}
              <PopItem>
                <div className="w-full flex items-center justify-between px-1">
                  <span className="text-xs text-zinc-300 font-medium">{t.settings.language}</span>
                  <div className="inline-flex p-0.5 rounded-xl bg-white/[0.04]">
                    {(
                      [
                        { id: 'en', label: 'English' },
                        { id: 'id', label: 'Indonesia' },
                      ] as const
                    ).map((langOpt) => {
                      const active = (settings.language || 'en') === langOpt.id;
                      return (
                        <button
                          key={langOpt.id}
                          type="button"
                          onClick={() =>
                            updateSettings({
                              language: langOpt.id,
                              currencySymbol: langOpt.id === 'id' ? 'Rp' : '$',
                              prayerFeatureEnabled: langOpt.id === 'id',
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition cursor-pointer ${
                            active
                              ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {langOpt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopItem>

              <PopItem>
                <div className="w-full space-y-1.5 text-left">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-zinc-300 font-medium">
                      {t.settings.userNickname}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal truncate max-w-[200px]" title={t.onboarding.nameQuestion}>
                      {t.onboarding.nameQuestion}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finish(true);
                    }}
                    placeholder={t.onboarding.namePlaceholder}
                    autoFocus
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/20 transition font-medium"
                  />
                </div>
              </PopItem>

              <PopItem>
                <div className="flex p-0.5 rounded-xl bg-white/[0.04] w-full">
                  {[
                    { id: 'dark' as ThemeMode, label: t.settings.themeDark },
                    { id: 'light' as ThemeMode, label: t.settings.themeLight },
                    { id: 'system' as ThemeMode, label: t.settings.themeSystem },
                  ].map((opt) => {
                    const active = (settings.windowTheme || 'dark') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateSettings({ windowTheme: opt.id, capsuleTheme: opt.id })}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] transition cursor-pointer ${
                          active ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </PopItem>

              <PopItem>
                <div className="w-full flex items-center justify-between px-1">
                  <span className="text-xs text-zinc-300 font-medium">
                    {settings.language === 'en' ? 'Prayer Times & Adzan' : 'Pengingat Shalat'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prayerOn}
                    onClick={() => updateSettings({ prayerFeatureEnabled: !prayerOn })}
                    className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                      prayerOn ? 'bg-emerald-500/80' : 'bg-white/[0.12]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        prayerOn ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </PopItem>

              <PopItem>
                <div className="w-full flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => finish(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.98] transition cursor-pointer"
                  >
                    {t.onboarding.getStarted}
                  </button>
                  <button
                    type="button"
                    onClick={() => finish(false)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer py-1"
                  >
                    {t.onboarding.skip}
                  </button>
                </div>
              </PopItem>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const PopItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, scale: 0.82, y: 10 },
      show: { opacity: 1, scale: 1, y: 0, transition: POP_SPRING },
    }}
  >
    {children}
  </motion.div>
);
