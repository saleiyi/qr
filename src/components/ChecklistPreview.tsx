import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ChecklistFields } from './ChecklistFields';
import { PanelModal, primaryClass } from './OperationsUI';
import type { ChecklistTemplate } from '../types/domain';
import type { DraftAnswerMap } from '../utils/domainLogic';
import { validateInspectionDraft } from '../utils/domainLogic';
import { processImageUpload } from '../services/storageAdapter';

export function ChecklistPreview({
  template,
  onClose,
}: {
  template: ChecklistTemplate;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<DraftAnswerMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [valid, setValid] = useState(false);
  const [pending, setPending] = useState(0);
  return (
    <PanelModal
      title="Prévia no celular"
      description="Teste as respostas e condições antes de publicar."
      onClose={onClose}
    >
      <div className="mx-auto max-w-[390px] overflow-hidden rounded-[26px] border-[6px] border-[#17324D] bg-[#F4F7FA] shadow-lg">
        <div className="flex justify-center bg-[#17324D] pb-2">
          <span className="h-1 w-14 rounded-full bg-[#526980]" />
        </div>
        <div className="space-y-4 p-3">
          <header className="rounded-xl border border-[#DCE4EC] bg-white p-4">
            <p className="text-xs font-medium text-[#176B5B]">Equipamento de exemplo</p>
            <h3 className="mt-1 text-lg font-bold">{template.name}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#526980]">
              {template.description ||
                'Responda às perguntas para conferir a experiência em campo.'}
            </p>
          </header>
          <ChecklistFields
            preview
            template={template}
            answers={answers}
            errors={errors}
            photoErrors={photoErrors}
            onChange={(id, patch) => {
              setAnswers((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
              setErrors({});
              setValid(false);
            }}
            onPhotoUpload={async (id, event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPending((count) => count + 1);
              try {
                const result = await processImageUpload(file);
                if (result.ok)
                  setAnswers((current) => ({
                    ...current,
                    [id]: { ...current[id], photoDataUrl: result.dataUrl, photoName: file.name },
                  }));
                else
                  setPhotoErrors((current) => ({
                    ...current,
                    [id]: result.error ?? 'Erro ao carregar foto.',
                  }));
              } catch {
                setPhotoErrors((current) => ({ ...current, [id]: 'Erro ao carregar foto.' }));
              } finally {
                setPending((count) => count - 1);
              }
            }}
          />
          <button
            type="button"
            disabled={pending > 0}
            onClick={() => {
              const found = validateInspectionDraft(template, answers);
              setErrors(Object.fromEntries(found.map((error) => [error.itemId, error.message])));
              setValid(!found.length);
            }}
            className={`${primaryClass} w-full`}
          >
            Testar preenchimento
          </button>
          {valid && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg bg-[#EAF4F0] p-3 text-xs leading-relaxed text-[#176B5B]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Preenchimento válido. Este teste não cria um registro.
            </p>
          )}
        </div>
      </div>
    </PanelModal>
  );
}
