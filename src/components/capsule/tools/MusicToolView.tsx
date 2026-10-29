import React from 'react';
import { Disc3, ExternalLink, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

export interface MusicToolViewProps {
  isPlayingMusic: boolean;
  musicTrackName: string;
  musicArtistName: string;
  onOpenMusicSourceApp: () => void;
  onPrevTrack: () => void;
  onToggleMusicPlayer: () => void;
  onNextTrack: () => void;
  isEn: boolean;
}

/**
 * Tampilan alat Windows Media Control di kapsul
 */
export const MusicToolView: React.FC<MusicToolViewProps> = ({
  isPlayingMusic,
  musicTrackName,
  musicArtistName,
  onOpenMusicSourceApp,
  onPrevTrack,
  onToggleMusicPlayer,
  onNextTrack,
  isEn,
}) => {
  const isNoMedia =
    !isPlayingMusic ||
    !musicTrackName ||
    musicTrackName === 'Belum ada media diputar' ||
    musicTrackName === 'No media playing';
  const displayTrackName = isNoMedia
    ? isEn
      ? 'No media playing'
      : 'Belum ada media diputar'
    : musicTrackName;
  const displayArtistName = isNoMedia
    ? 'Windows Media'
    : musicArtistName || (isEn ? 'Playing' : 'Sedang Diputar');

  return (
    <div
      data-interactive="true"
      onClick={(e) => {
        e.stopPropagation();
        onOpenMusicSourceApp();
      }}
      title={isEn ? 'Click to open media player' : 'Klik untuk membuka aplikasi / browser pemutar musik'}
      className="w-full flex items-center justify-between gap-2 px-1.5 py-1 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 ${
            isPlayingMusic ? 'animate-vinyl-spin' : ''
          }`}
        >
          <Disc3 className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isPlayingMusic && (
              <div className="flex items-end gap-[2px] h-3 shrink-0">
                <span className="w-[2px] rounded-full bg-cyan-400 eq-bar-1" />
                <span className="w-[2px] rounded-full bg-zinc-300 eq-bar-2" />
                <span className="w-[2px] rounded-full bg-cyan-400 eq-bar-3" />
              </div>
            )}
            <span className="truncate text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
              {displayTrackName}
            </span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <div className="truncate text-[10px] text-zinc-400">
            {displayArtistName}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrevTrack();
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMusicPlayer();
          }}
          className="p-1.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white transition cursor-pointer"
        >
          {isPlayingMusic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNextTrack();
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
