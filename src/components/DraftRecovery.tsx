import type { InspectionDraft } from '../types/domain';
import { formatDateTimeBR } from '../utils/date';
import { secondaryClass } from './OperationsUI';

export function DraftDownload({
  draft,
  label = 'Baixar rascunho anterior',
}: {
  draft: InspectionDraft;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`${secondaryClass} !text-xs`}
      onClick={() => {
        const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rascunho-${draft.assetId}-v${draft.templateVersion ?? 1}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      {label} · v{draft.templateVersion ?? 1}
    </button>
  );
}
export function DraftRecovery({ drafts }: { drafts: InspectionDraft[] }) {
  if (!drafts.length) return null;
  return (
    <details
      open
      className="mt-4 rounded-xl border border-[#F2D3AA] bg-[#FEF6EB] p-4 text-[#795015]"
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Rascunhos anteriores preservados
      </summary>
      <p className="mt-2 text-xs leading-relaxed">
        O modelo foi alterado. Perguntas modificadas precisam de uma nova resposta. Você pode baixar
        o preenchimento anterior com suas fotos.
      </p>
      <div className="mt-3 space-y-2">
        {drafts.map((draft, index) => (
          <div key={`${draft.updatedAt}-${index}`} className="flex flex-wrap items-center gap-2">
            <DraftDownload draft={draft} />
            <span className="text-[11px]">{formatDateTimeBR(draft.updatedAt)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
