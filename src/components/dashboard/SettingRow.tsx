import React from 'react';

export interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  alignTop?: boolean;
}

/**
 * Baris Pengaturan Horizontal Minimalis
 * Gaya desain bersih terinspirasi dari Raycast & macOS System Preferences
 */
export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  children,
  alignTop,
}) => (
  <div className={`flex ${alignTop ? 'items-start' : 'items-center'} justify-between gap-6 py-4`}>
    <div className="w-56 shrink-0 pr-2">
      <div className="text-xs font-medium text-zinc-200 leading-snug break-words">{title}</div>
      {description && (
        <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed break-words">{description}</div>
      )}
    </div>
    <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
      {children}
    </div>
  </div>
);
