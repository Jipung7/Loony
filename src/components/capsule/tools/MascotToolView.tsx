import React from 'react';
import { HoloMascotEyes } from '../../HoloMascotEyes';
import { DockPosition, MascotMood, LoonySignLabel } from '../../../types';

export interface MascotToolViewProps {
  mood: MascotMood;
  isPlayingMusic: boolean;
  signLabel?: LoonySignLabel;
  inertiaOffset?: { x: number; y: number };
  isDizzy?: boolean;
  isHeadShaking?: boolean;
  isPetted?: boolean;
  dockPosition?: DockPosition;
  onOpenFullWindow: () => void;
}

/**
 * Tampilan alat Mata Maskot Loony di kapsul
 */
export const MascotToolView: React.FC<MascotToolViewProps> = ({
  mood,
  isPlayingMusic,
  signLabel,
  inertiaOffset,
  isDizzy,
  isHeadShaking,
  isPetted,
  dockPosition,
  onOpenFullWindow,
}) => {
  return (
    <div className="relative w-full flex items-center justify-center">
      <HoloMascotEyes
        mood={mood}
        size="md"
        isCapsuleIdle={false}
        isPlayingMusic={isPlayingMusic}
        signLabel={signLabel}
        inertiaOffset={inertiaOffset}
        isDizzy={isDizzy}
        isHeadShaking={isHeadShaking}
        isPetted={isPetted}
        dockPosition={dockPosition}
        onClick={onOpenFullWindow}
      />
    </div>
  );
};
