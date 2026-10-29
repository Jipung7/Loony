import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
}

/**
 * Saklar Toggle Taktil Minimalis
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
      checked ? 'bg-zinc-100 loony-toggle-on' : 'bg-white/[0.08] hover:bg-white/[0.12]'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
        checked ? 'translate-x-4 bg-zinc-950 loony-toggle-thumb-on' : 'translate-x-1 bg-zinc-400'
      }`}
    />
  </button>
);
