import { useId, type ChangeEvent } from 'react';
import { Camera, Check, XCircle, Trash2 } from 'lucide-react';
import type { ChecklistTemplate } from '../types/domain';
import { visibleItems, effectiveAnswer, type Answer } from '../utils/checklist';
import { controlClass } from './OperationsUI';

interface Props {
  template: ChecklistTemplate;
  answers: Record<string, Answer>;
  onChange: (id: string, patch: Answer) => void;
  errors?: Record<string, string>;
  photoErrors?: Record<string, string>;
  onPhotoUpload?: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
  preview?: boolean;
}
export function ChecklistFields({
  template,
  answers,
  onChange,
  errors = {},
  photoErrors = {},
  onPhotoUpload,
  preview = false,
}: Props) {
  const prefix = useId();
  const groups = new Map<string, ReturnType<typeof visibleItems>>();
  for (const item of visibleItems(template, answers))
    groups.set(item.section, [...(groups.get(item.section) ?? []), item]);
  return (
    <>
      {Array.from(groups.entries()).map(([section, items]) => (
        <section key={section} className="rounded-2xl border border-[#DCE4EC] bg-white p-4 sm:p-5">
          <h2 className="border-b border-[#DCE4EC] pb-2.5 text-sm font-bold text-[#17324D]">
            {section}
          </h2>
          <div className="divide-y divide-[#DCE4EC]">
            {items.map((item) => {
              const answer = effectiveAnswer(item, answers[item.id]);
              const needsPhoto =
                item.photoRequired ||
                (item.photoRequiredOnFail && answer.status === 'non_conforming');
              const inputId = `${prefix}-${item.id}`;
              return (
                <div
                  key={item.id}
                  id={preview ? undefined : `checklist-item-${item.id}`}
                  className="py-4 first:pt-3 last:pb-1"
                >
                  <label
                    htmlFor={item.type === 'check' ? undefined : inputId}
                    className="block text-sm font-medium leading-relaxed text-[#17324D]"
                  >
                    {item.label}
                    {item.required && <span className="ml-1 text-[#B42318]">*</span>}
                  </label>
                  {(item.type === 'check' || item.type === 'number') && (
                    <div
                      role="group"
                      aria-label={`Resultado para ${item.label}`}
                      className="mt-3 grid grid-cols-[1fr_1.35fr_0.75fr] gap-1.5 sm:grid-cols-3 sm:gap-2"
                    >
                      {(
                        [
                          { value: 'conforming', label: 'Conforme', icon: Check },
                          { value: 'non_conforming', label: 'Não conforme', icon: XCircle },
                          { value: 'na', label: 'N/A', icon: null },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onChange(item.id, { status: option.value })}
                          aria-pressed={answer.status === option.value}
                          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-semibold whitespace-nowrap transition-colors sm:text-xs ${answer.status === option.value ? (option.value === 'non_conforming' ? 'border-[#B42318] bg-[#FEF3F2] text-[#B42318]' : 'border-[#176B5B] bg-[#EAF4F0] text-[#176B5B]') : 'border-[#DCE4EC] bg-white text-[#476078] hover:border-[#8AA2B8]'}`}
                        >
                          {option.icon && <option.icon className="h-3.5 w-3.5 shrink-0" />}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.type === 'number' && answer.status !== 'na' && (
                    <label className="mt-3 block text-xs font-medium text-[#526980]">
                      Leitura numérica{item.unit ? ` (${item.unit})` : ''}
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        value={answer.numericValue ?? ''}
                        onChange={(event) =>
                          onChange(item.id, { numericValue: event.target.value })
                        }
                        className={controlClass}
                        placeholder={item.unit ? `Ex.: 12,5 ${item.unit}` : 'Ex.: 12,5'}
                      />
                      {(item.min !== undefined || item.max !== undefined) && (
                        <span className="mt-1 block text-[11px] font-normal">
                          Faixa esperada: {item.min ?? 'sem mínimo'} a {item.max ?? 'sem máximo'}{' '}
                          {item.unit}. Fora da faixa gera uma não conformidade.
                        </span>
                      )}
                    </label>
                  )}
                  {item.type === 'single_choice' && (
                    <select
                      id={inputId}
                      value={answer.value ?? ''}
                      onChange={(event) => onChange(item.id, { value: event.target.value })}
                      className={controlClass}
                    >
                      <option value="">Selecione uma opção</option>
                      {item.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {item.type === 'date' && (
                    <input
                      id={inputId}
                      type="date"
                      value={answer.value ?? ''}
                      onChange={(event) => onChange(item.id, { value: event.target.value })}
                      className={controlClass}
                    />
                  )}
                  {answer.status === 'non_conforming' && (
                    <label className="mt-3 block text-xs font-semibold text-[#B42318]">
                      Descrição da não conformidade *
                      <textarea
                        value={answer.note ?? ''}
                        onChange={(event) => onChange(item.id, { note: event.target.value })}
                        rows={3}
                        className={controlClass}
                        placeholder="O que foi encontrado? Descreva o problema."
                      />
                    </label>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <label
                      className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${needsPhoto ? 'border-[#F2D3AA] bg-[#FEF6EB] text-[#B76A12]' : 'border-[#DCE4EC] bg-[#F4F7FA] text-[#17324D]'}`}
                    >
                      <Camera className="h-4 w-4 text-[#176B5B]" />
                      {needsPhoto ? 'Anexar foto obrigatória' : 'Anexar foto (opcional)'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => onPhotoUpload?.(item.id, event)}
                        disabled={!onPhotoUpload}
                      />
                    </label>
                    <span className="text-[11px] text-[#526980]">JPG, PNG ou WEBP até 5 MB</span>
                  </div>
                  {answer.photoDataUrl && (
                    <div className="mt-3">
                      <img
                        src={answer.photoDataUrl}
                        alt={`Evidência de ${item.label}`}
                        className="max-h-48 max-w-full rounded-lg border border-[#DCE4EC] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onChange(item.id, { photoDataUrl: undefined, photoName: undefined })
                        }
                        className="mt-2 flex min-h-[36px] items-center gap-1 text-xs font-semibold text-[#B42318]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover foto
                      </button>
                    </div>
                  )}
                  {(errors[item.id] || photoErrors[item.id]) && (
                    <p role="alert" className="mt-2 text-xs font-medium text-[#B42318]">
                      {errors[item.id] || photoErrors[item.id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
