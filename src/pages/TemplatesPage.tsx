import { useCallback, useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Eye, FileCheck2, Plus, Save, Trash2, Send } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAppState } from '../context/AppStateContext';
import { ChecklistPreview } from '../components/ChecklistPreview';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  FormField,
  FormError,
  controlClass,
  primaryClass,
  secondaryClass,
} from '../components/OperationsUI';
import type {
  ChecklistTemplate,
  EquipmentCategory,
  TemplateItem,
  TemplateItemType,
} from '../types/domain';
import { APP_CONFIG } from '../config/appConfig';

const categories = [
  'Climatização',
  'Compressores',
  'Movimentação',
  'Energia',
  'Ferramentas',
  'Elétrica',
  'Geral',
] as const;
const typeLabels: Record<TemplateItemType, string> = {
  check: 'Conformidade',
  number: 'Leitura numérica',
  single_choice: 'Seleção única',
  date: 'Data',
};
const statusLabels: Record<string, string> = {
  conforming: 'Conforme',
  non_conforming: 'Não conforme',
  na: 'N/A',
};
const makeItem = (): TemplateItem => ({
  id: `item-${crypto.randomUUID()}`,
  section: 'Verificação geral',
  label: 'Nova pergunta',
  type: 'check',
  required: true,
  photoRequired: false,
});

export function TemplatesPage() {
  const { state, demoSettings, saveTemplateDraft, publishTemplate, applyTemplateToCategory } =
    useAppState();
  const [params, setParams] = useSearchParams();
  const all = [
    ...state.templateDrafts,
    ...state.templates.filter((t) => !state.templateDrafts.some((draft) => draft.id === t.id)),
  ];
  const selected = all.find((t) => t.id === params.get('templateId')) ?? all[0];
  const published = state.templates.find((t) => t.id === selected?.id);
  const [draft, setDraft] = useState<ChecklistTemplate | null>(() =>
    selected ? structuredClone(selected) : null,
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(selected));
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [applyCategory, setApplyCategory] = useState('Climatização');
  const [applyConfirm, setApplyConfirm] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const allowLeave = useRef(false);
  const canEdit = demoSettings.activeDemoRole === 'admin';
  const dirty = canEdit && Boolean(draft) && JSON.stringify(draft) !== baseline;
  const blocker = useBlocker(useCallback(() => dirty && !allowLeave.current, [dirty]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty && !allowLeave.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty],
    ),
  );
  useEffect(() => {
    setDraft(selected ? structuredClone(selected) : null);
    setBaseline(JSON.stringify(selected));
    setError(null);
    allowLeave.current = false;
  }, [selected]);
  const select = (id: string) => setParams({ templateId: id }, { replace: true });
  const requestAction = (action: () => void) => {
    if (dirty) {
      pendingAction.current = action;
      setDiscard(true);
    } else action();
  };
  const create = (copy = false) =>
    requestAction(() => {
      const next: ChecklistTemplate =
        copy && selected
          ? {
              ...structuredClone(selected),
              id: `template-${crypto.randomUUID()}`,
              name: `${selected.name} (cópia)`,
              version: 0,
            }
          : {
              id: `template-${crypto.randomUUID()}`,
              name: 'Novo modelo de inspeção',
              category: 'Geral',
              description: '',
              version: 0,
              updatedAt: APP_CONFIG.demoClockISO,
              items: [makeItem()],
            };
      const result = saveTemplateDraft(next);
      if (!result.ok) setError(result.error ?? 'Não foi possível criar o modelo.');
      else select(next.id);
    });
  const updateItem = (id: string, patch: Partial<TemplateItem>) => {
    if (draft)
      setDraft({
        ...draft,
        items: draft.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      });
  };
  const move = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const items = [...draft.items];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setDraft({ ...draft, items });
  };
  const save = (publish: boolean) => {
    if (!draft) return;
    const result = publish ? publishTemplate(draft) : saveTemplateDraft(draft);
    if (!result.ok) setError(result.error ?? 'Não foi possível salvar o modelo.');
    else {
      setError(null);
      setBaseline(JSON.stringify(draft));
    }
  };

  return (
    <AppShell
      title="Modelos de inspeção"
      subtitle="Prepare a rotina, teste no celular e publique quando estiver pronta."
      primaryAction={
        canEdit ? (
          <button onClick={() => create()} className={primaryClass}>
            <Plus className="h-4 w-4" />
            Novo modelo
          </button>
        ) : undefined
      }
    >
      <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Biblioteca de modelos</h2>
            <span className="text-xs tabular-nums text-[#526980]">{all.length}</span>
          </div>
          <select
            aria-label="Selecionar modelo"
            value={selected?.id ?? ''}
            onChange={(event) => select(event.target.value)}
            className={`${controlClass} lg:hidden`}
          >
            {all.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <nav aria-label="Biblioteca de modelos" className="hidden space-y-2 lg:block">
            {all.map((template) => {
              const isDraft = state.templateDrafts.some((t) => t.id === template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => select(template.id)}
                  className={`w-full rounded-xl border p-4 text-left ${selected?.id === template.id ? 'border-[#176B5B] bg-[#EAF4F0]' : 'border-[#DCE4EC] bg-white hover:border-[#8AA2B8]'}`}
                >
                  <p className="break-words text-sm font-semibold leading-relaxed">
                    {template.name}
                  </p>
                  <p className="mt-2 text-xs text-[#526980]">
                    {template.category} · {template.items.length} pergunta(s)
                  </p>
                  <span
                    className={`mt-2 inline-block rounded px-2 py-0.5 text-[11px] font-medium ${isDraft ? 'bg-[#FEF6EB] text-[#B76A12]' : 'bg-white text-[#176B5B]'}`}
                  >
                    {isDraft ? 'Rascunho salvo' : `Publicado · v${template.version ?? 1}`}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 space-y-5">
          {draft ? (
            <>
              <section className="rounded-xl border border-[#DCE4EC] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE4EC] pb-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {published
                        ? `Versão publicada: ${published.version ?? 1}`
                        : 'Modelo ainda não publicado'}
                    </p>
                    <p className={`mt-1 text-xs ${dirty ? 'text-[#B76A12]' : 'text-[#526980]'}`}>
                      {dirty
                        ? 'Alterações ainda não salvas'
                        : state.templateDrafts.some((t) => t.id === draft.id)
                          ? 'Rascunho salvo · não altera o formulário em uso'
                          : 'Pronto para uso nos equipamentos'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPreview(true)} className={secondaryClass}>
                      <Eye className="h-4 w-4" />
                      Prévia no celular
                    </button>
                    {canEdit && (
                      <button onClick={() => create(true)} className={secondaryClass}>
                        <Copy className="h-4 w-4" />
                        Duplicar modelo
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <FormError message={error} />
                  <FormField label="Nome do modelo">
                    <input
                      value={draft.name}
                      disabled={!canEdit}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      className={controlClass}
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Categoria do modelo">
                      <select
                        value={draft.category}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            category: event.target.value as EquipmentCategory | 'Geral',
                          })
                        }
                        className={controlClass}
                      >
                        {categories.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Descrição do modelo">
                      <input
                        value={draft.description}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setDraft({ ...draft, description: event.target.value })
                        }
                        className={controlClass}
                        placeholder="Orientação para a equipe"
                      />
                    </FormField>
                  </div>
                </div>
              </section>
              {draft.items.map((item, index) => {
                const number = index + 1;
                const previous = draft.items
                  .slice(0, index)
                  .filter((candidate) => candidate.type !== 'date');
                const parent = previous.find(
                  (candidate) => candidate.id === item.visibleWhen?.itemId,
                );
                const choices =
                  parent?.type === 'single_choice'
                    ? (parent.options ?? [])
                    : ['conforming', 'non_conforming', 'na'];
                return (
                  <section
                    key={item.id}
                    className="rounded-xl border border-[#DCE4EC] bg-white p-4 sm:p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE4EC] pb-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF4F0] text-[#176B5B]">
                          {number}
                        </span>
                        {typeLabels[item.type]}
                      </h3>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                            aria-label={`Mover pergunta ${number} para cima`}
                            className={`${secondaryClass} !min-h-[36px] !px-2`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            disabled={index === draft.items.length - 1}
                            onClick={() => move(index, 1)}
                            aria-label={`Mover pergunta ${number} para baixo`}
                            className={`${secondaryClass} !min-h-[36px] !px-2`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            disabled={draft.items.length === 1}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                items: draft.items.filter((question) => question.id !== item.id),
                              })
                            }
                            aria-label={`Remover pergunta ${number}`}
                            className={`${secondaryClass} !min-h-[36px] !px-2 !text-[#B42318]`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <FormField label={`Pergunta ${number}`}>
                        <input
                          disabled={!canEdit}
                          value={item.label}
                          onChange={(event) => updateItem(item.id, { label: event.target.value })}
                          className={controlClass}
                        />
                      </FormField>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label={`Seção da pergunta ${number}`}>
                          <input
                            disabled={!canEdit}
                            value={item.section}
                            onChange={(event) =>
                              updateItem(item.id, { section: event.target.value })
                            }
                            className={controlClass}
                          />
                        </FormField>
                        <FormField label={`Tipo da pergunta ${number}`}>
                          <select
                            disabled={!canEdit}
                            value={item.type}
                            onChange={(event) => {
                              const type = event.target.value as TemplateItemType;
                              updateItem(item.id, {
                                type,
                                options:
                                  type === 'single_choice' ? ['Opção 1', 'Opção 2'] : undefined,
                                min: type === 'number' ? item.min : undefined,
                                max: type === 'number' ? item.max : undefined,
                              });
                            }}
                            className={controlClass}
                          >
                            {Object.entries(typeLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>
                      {item.type === 'single_choice' && (
                        <FormField
                          label={`Opções da pergunta ${number}`}
                          hint="Uma opção por linha."
                        >
                          <textarea
                            disabled={!canEdit}
                            value={(item.options ?? []).join('\n')}
                            rows={3}
                            onChange={(event) =>
                              updateItem(item.id, { options: event.target.value.split('\n') })
                            }
                            className={controlClass}
                          />
                        </FormField>
                      )}
                      {item.type === 'number' && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormField label={`Unidade da pergunta ${number}`}>
                            <input
                              disabled={!canEdit}
                              value={item.unit ?? ''}
                              onChange={(event) =>
                                updateItem(item.id, { unit: event.target.value })
                              }
                              className={controlClass}
                            />
                          </FormField>
                          <FormField label={`Mínimo da pergunta ${number}`}>
                            <input
                              disabled={!canEdit}
                              type="number"
                              step="any"
                              value={item.min ?? ''}
                              onChange={(event) =>
                                updateItem(item.id, {
                                  min:
                                    event.target.value === ''
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                              className={controlClass}
                            />
                          </FormField>
                          <FormField label={`Máximo da pergunta ${number}`}>
                            <input
                              disabled={!canEdit}
                              type="number"
                              step="any"
                              value={item.max ?? ''}
                              onChange={(event) =>
                                updateItem(item.id, {
                                  max:
                                    event.target.value === ''
                                      ? undefined
                                      : Number(event.target.value),
                                })
                              }
                              className={controlClass}
                            />
                          </FormField>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#476078]">
                        <label className="flex min-h-[40px] items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={item.required}
                            onChange={(event) =>
                              updateItem(item.id, { required: event.target.checked })
                            }
                            className="h-4 w-4 accent-[#176B5B]"
                          />
                          Resposta obrigatória
                        </label>
                        <label className="flex min-h-[40px] items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={item.photoRequired}
                            onChange={(event) =>
                              updateItem(item.id, { photoRequired: event.target.checked })
                            }
                            className="h-4 w-4 accent-[#176B5B]"
                          />
                          Foto obrigatória
                        </label>
                        {(item.type === 'check' || item.type === 'number') && (
                          <label className="flex min-h-[40px] items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={item.photoRequiredOnFail ?? false}
                              onChange={(event) =>
                                updateItem(item.id, { photoRequiredOnFail: event.target.checked })
                              }
                              className="h-4 w-4 accent-[#176B5B]"
                            />
                            Foto obrigatória se não conforme
                          </label>
                        )}
                      </div>
                      {index > 0 && (
                        <div className="grid gap-3 rounded-lg bg-[#F4F7FA] p-3 sm:grid-cols-2">
                          <FormField label={`Exibir pergunta ${number}`}>
                            <select
                              disabled={!canEdit}
                              value={item.visibleWhen?.itemId ?? ''}
                              onChange={(event) => {
                                const target = previous.find(
                                  (question) => question.id === event.target.value,
                                );
                                updateItem(item.id, {
                                  visibleWhen: target
                                    ? {
                                        itemId: target.id,
                                        equals:
                                          target.type === 'single_choice'
                                            ? (target.options?.[0] ?? '')
                                            : 'conforming',
                                      }
                                    : undefined,
                                });
                              }}
                              className={controlClass}
                            >
                              <option value="">Sempre</option>
                              {previous.map((question) => (
                                <option key={question.id} value={question.id}>
                                  Se: {question.label}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          {item.visibleWhen && (
                            <FormField label={`Resposta que exibe a pergunta ${number}`}>
                              <select
                                disabled={!canEdit}
                                value={item.visibleWhen.equals}
                                onChange={(event) =>
                                  updateItem(item.id, {
                                    visibleWhen: {
                                      itemId: item.visibleWhen!.itemId,
                                      equals: event.target.value,
                                    },
                                  })
                                }
                                className={controlClass}
                              >
                                {choices.map((choice) => (
                                  <option key={choice} value={choice}>
                                    {parent?.type === 'single_choice'
                                      ? choice
                                      : statusLabels[choice]}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
              {canEdit && (
                <button
                  onClick={() => setDraft({ ...draft, items: [...draft.items, makeItem()] })}
                  className={`${secondaryClass} w-full !border-dashed`}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar pergunta
                </button>
              )}
              {canEdit && (
                <div className="sticky bottom-2 z-20 flex flex-wrap justify-end gap-2 rounded-xl border border-[#DCE4EC] bg-white/95 p-3 shadow-sm backdrop-blur-sm">
                  <button
                    onClick={() => save(false)}
                    className={`${secondaryClass} flex-1 sm:flex-none`}
                  >
                    <Save className="h-4 w-4" />
                    Salvar rascunho do modelo
                  </button>
                  <button
                    onClick={() => save(true)}
                    className={`${primaryClass} flex-1 sm:flex-none`}
                  >
                    <Send className="h-4 w-4" />
                    Publicar modelo
                  </button>
                </div>
              )}
              {published && canEdit && (
                <section className="space-y-3 rounded-xl border border-[#DCE4EC] bg-white p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <FileCheck2 className="h-4 w-4 text-[#176B5B]" />
                    Aplicar versão publicada
                  </h3>
                  <p className="text-sm leading-relaxed text-[#526980]">
                    A versão {published.version ?? 1} será usada nas próximas inspeções dos
                    equipamentos escolhidos. Registros anteriores mantêm suas respostas.
                  </p>
                  <FormField label="Categoria de destino">
                    <select
                      value={applyCategory}
                      onChange={(event) => setApplyCategory(event.target.value)}
                      className={controlClass}
                    >
                      {categories
                        .filter((category) => category !== 'Geral')
                        .map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      <option value="all">Todos os equipamentos</option>
                    </select>
                  </FormField>
                  <button onClick={() => setApplyConfirm(true)} className={secondaryClass}>
                    Aplicar aos equipamentos
                  </button>
                </section>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-[#DCE4EC] bg-white p-8 text-center">
              <h2 className="font-semibold">Crie seu primeiro modelo</h2>
              <p className="mt-2 text-sm text-[#526980]">
                Defina as perguntas que a equipe deve responder na inspeção.
              </p>
            </div>
          )}
        </div>
      </div>
      {preview && draft && <ChecklistPreview template={draft} onClose={() => setPreview(false)} />}
      <ConfirmDialog
        open={discard || blocker.state === 'blocked'}
        title="Sair sem salvar o modelo?"
        description="Há alterações neste modelo que ainda não foram salvas."
        confirmLabel="Continuar sem salvar"
        cancelLabel="Continuar editando"
        tone="danger"
        onConfirm={() => {
          allowLeave.current = true;
          setDiscard(false);
          if (pendingAction.current) {
            const action = pendingAction.current;
            pendingAction.current = null;
            action();
            allowLeave.current = false;
          } else if (blocker.state === 'blocked') blocker.proceed();
        }}
        onCancel={() => {
          setDiscard(false);
          pendingAction.current = null;
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
      <ConfirmDialog
        open={applyConfirm}
        title="Aplicar este modelo aos equipamentos?"
        description={`A versão publicada será vinculada a ${state.assets.filter((asset) => applyCategory === 'all' || asset.category === applyCategory).length} equipamento(s). Os registros anteriores serão preservados.`}
        confirmLabel="Confirmar aplicação"
        onConfirm={() => {
          if (!published) return;
          const result = applyTemplateToCategory(published.id, applyCategory);
          if (result.ok) setApplyConfirm(false);
          else setError(result.error ?? 'Não foi possível aplicar.');
        }}
        onCancel={() => setApplyConfirm(false)}
      />
    </AppShell>
  );
}
