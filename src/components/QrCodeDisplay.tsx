import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  value,
  size = 160,
  label = 'Código QR do equipamento',
  className = '',
}) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      color: {
        dark: '#17324D',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded border border-[#DCE4EC] bg-white text-xs text-[#526980] ${className}`}
        aria-label={label}
      >
        Gerando QR...
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded border border-[#DCE4EC] bg-white p-1.5 ${className}`}
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};

export async function downloadQrCodePng(url: string, filename: string): Promise<void> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 640,
    margin: 2,
    color: {
      dark: '#17324D',
      light: '#FFFFFF',
    },
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
