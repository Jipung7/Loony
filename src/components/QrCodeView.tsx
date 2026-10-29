import React, { useMemo } from 'react';
import { generateQrSvg } from '../utils/qrCode';

interface QrCodeViewProps {
  data: string;
  size?: number;
  className?: string;
  dotColor?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  data,
  size = 180,
  className = '',
}) => {
  const svgHtml = useMemo(() => {
    if (!data) return '';
    try {
      return generateQrSvg(data, size);
    } catch {
      return '';
    }
  }, [data, size]);

  if (!svgHtml) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-xl bg-white/5 text-[10px] text-zinc-500 ${className}`}
      >
        Membuat QR...
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-2xl bg-white shadow-xl overflow-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
};
