import { Modal } from './Modal';
import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { Asset, Site } from '../types/domain';
import { QrCodeDisplay } from './QrCodeDisplay';
import { APP_CONFIG } from '../config/appConfig';
import { equipmentScanUrl } from '../services/runtimeMode';

interface QrLabelPrintModalProps {
  open: boolean;
  assets: Asset[];
  sites: Site[];
  onClose: () => void;
}

type LabelSize = 'small' | 'medium' | 'large';

export const QrLabelPrintModal: React.FC<QrLabelPrintModalProps> = ({
  open,
  assets,
  sites,
  onClose,
}) => {
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [showSite, setShowSite] = useState(true);
  const [showSector, setShowSector] = useState(true);

  if (!open) return null;

  const siteNameOf = (siteId: string) => sites.find((s) => s.id === siteId)?.name ?? '';

  const gridColsClass =
    labelSize === 'small'
      ? 'grid-cols-2 sm:grid-cols-3'
      : labelSize === 'medium'
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1';

  const qrPixelSize = labelSize === 'small' ? 84 : labelSize === 'medium' ? 110 : 140;

  return (
    <Modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/50 p-4 print:static print:block print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-batch-title"
      onClose={onClose}
      printable
    >
      <div className="print-container flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-[#DCE4EC] bg-white shadow-2xl print:max-h-none print:border-none print:shadow-none">
        <div className="no-print flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
          <div>
            <h2 id="qr-batch-title" className="text-lg font-semibold text-[#17324D]">
              Gerar etiquetas QR para impressão ({assets.length})
            </h2>
            <p className="text-xs text-[#526980]">
              Layout A4 pronto para impressão ou salvamento em PDF pelo navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar prévia de etiquetas"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE4EC] bg-[#F4F7FA] px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#476078]">Tamanho da etiqueta:</span>
              <div className="inline-flex rounded-lg border border-[#DCE4EC] bg-white p-0.5">
                {[
                  { id: 'small' as const, label: 'Pequena (50×30mm)' },
                  { id: 'medium' as const, label: 'Média (70×45mm)' },
                  { id: 'large' as const, label: 'Grande (100×65mm)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLabelSize(opt.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                      labelSize === opt.id
                        ? 'bg-[#176B5B] text-white'
                        : 'text-[#476078] hover:text-[#17324D]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-medium text-[#17324D]">
              <input
                type="checkbox"
                checked={showSite}
                onChange={(e) => setShowSite(e.target.checked)}
                className="h-4 w-4 accent-[#176B5B]"
              />
              Exibir local
            </label>

            <label className="flex items-center gap-1.5 text-xs font-medium text-[#17324D]">
              <input
                type="checkbox"
                checked={showSector}
                onChange={(e) => setShowSector(e.target.checked)}
                className="h-4 w-4 accent-[#176B5B]"
              />
              Exibir setor
            </label>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir folha A4
          </button>
        </div>

        {/* Printable A4 Sheet Preview */}
        <div className="flex-1 overflow-y-auto bg-[#E8EEF4] p-6 print:overflow-visible print:bg-white print:p-0">
          <div className="mx-auto max-w-[210mm] rounded border border-[#DCE4EC] bg-white p-6 shadow-sm print:max-w-none print:border-none print:p-0 print:shadow-none">
            <div className={`grid gap-4 ${gridColsClass}`}>
              {assets.map((asset) => {
                const scanUrl = equipmentScanUrl(asset.id);
                return (
                  <div
                    key={asset.id}
                    className="print-avoid-break flex items-center gap-4 rounded-lg border border-[#17324D]/30 bg-white p-3.5"
                  >
                    <QrCodeDisplay
                      value={scanUrl}
                      size={qrPixelSize}
                      label={`QR Code de ${asset.code}`}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-[#17324D]">
                          {asset.code}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#526980]">
                          {APP_CONFIG.brandName}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#17324D]">
                        {asset.name}
                      </p>
                      {showSite && (
                        <p className="mt-1 truncate text-xs text-[#476078]">
                          {siteNameOf(asset.siteId)}
                        </p>
                      )}
                      {showSector && (
                        <p className="truncate text-[11px] text-[#526980]">Setor: {asset.sector}</p>
                      )}
                      <p className="mt-1.5 font-mono text-[10px] text-[#526980]">
                        Escaneie para ficha e inspeção
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
