import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import type {
  ChecklistTemplate,
  EquipmentCategory,
  TemplateItem,
  TemplateItemType,
} from '../types/domain';
import { formatDateBR } from '../utils/date';

const CATEGORIES: Array<EquipmentCategory | 'Geral'> = [
  'Climatização',
  'Compressores',
  'Movimentação',
  'Energia',
  'Ferramentas',
  'Elétrica',
  'Geral',
];

export const TemplatesPage: React.FC = () => {
  const { state, demoSettings, saveTemplate, applyTemplateToCategory } =
    useAppState();
  const [selectedId, setSelectedId] = useState<string>(
    state.templates[0]?.id ?? '',
  );
  const [draft, setDraft] = useState<ChecklistTemplate | null>(null);
  const [applyTargetCategory, setApplyTargetCategory] = useState<string>(
    'Climatização',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTemplate = state.templates.find((t) => t.id === selectedId);

  useEffect(() => {
    if (selectedTemplate) {
      setDraft(JSON.parse(JSON.stringify(selectedTemplate)));
      setApplyTargetCategory(
        selectedTemplate.category === 'Geral'
          ? 'Climatização'
          : selectedTemplate.category,
      );
      setFormError(null);
    }
  }, [selectedId, selectedTemplate]);

  const isViewer = demoSettings.activeDemoRole === 'viewer';

  const handleMoveItem = (idx: number, direction: -1 | 1) => {
    if (!draft) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= draft.items.length) return;
    const nextItems = [...draft.items];
    const [moved] = nextItems.splice(idx, 1);
    nextItems.splice(targetIdx, 0, moved);
    setDraft({ ...draft, items: nextItems });
  };

  const handleUpdateItem = (itemId: string, patch: Partial<TemplateItem>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      items: draft.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });
  };

  const handleAddItem = () => {
    if (!draft) return;
    const newItem: TemplateItem = {
      id: `item-${Date.now().toString(36)}`,
      section: draft.items[draft.items.length - 1]?.section ?? 'Verificação Geral',
      label: 'Novo item de verificação',
      type: 'check',
      required: true,
      photoRequired: false,
    };
    setDraft({ ...draft, items: [...draft.items, newItem] });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!draft) return;
    if (draft.items.length <= 1) {
      setFormError('O modelo precisa manter pelo menos 1 item de verificação.');
      return;
    }
    setDraft({
      ...draft,
      items: draft.items.filter((it) => it.id !== itemId),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      setFormError('Informe o nome do modelo de inspeção.');
      return;
    }
    const emptyLabel = draft.items.find((it) => !it.label.trim());
    if (emptyLabel) {
      setFormError('Todos os itens do checklist devem ter uma descrição.');
      return;
    }
    setFormError(null);
    saveTemplate(draft);
  };

  return (
    <AppShell
      title="Modelos de inspeção"
      subtitle="Padronize perguntas por tipo de equipamento sem alterar registros históricos já concluídos"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List of Templates */}
        <aside className="space-y-3 lg:col-span-4">
          {state.templates.map((tpl) => {
            const active = tpl.id === selectedId;
            const linkedCount = state.assets.filter(
              (a) => a.templateId === tpl.id,
            ).length;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedId(tpl.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? 'border-[#176B5B] bg-white ring-1 ring-[#176B5B]'
                    : 'border-[#DCE4EC] bg-white hover:bg-[#F4F7FA]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#176B5B]">
                    {tpl.category}
                  </span>
                  <span className="text-xs tabular-nums text-[#526980]">
                    {tpl.items.length} itens · {linkedCount} equip.
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-[#17324D]">
                  {tpl.name}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[#476078]">
                  {tpl.description}
                </p>
                <p className="mt-2 text-[11px] text-[#526980] tabular-nums">
                  Atualizado em {formatDateBR(tpl.updatedAt)}
                </p>
              </button>
            );
          })}
        </aside>

        {/* Right Editor & Preview */}
        {draft && (
          <div className="space-y-5 lg:col-span-8">
            <form
              onSubmit={handleSave}
              className="rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE4EC] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#17324D]">
                    Editar estrutura do modelo
                  </h2>
                  <p className="text-xs text-[#526980]">
                    Alterações afetam apenas inspeções futuras.
                  </p>
                </div>
                {!isViewer && (
                  <button
                    type="submit"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Salvar modelo
                  </button>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] px-4 py-2.5 text-xs font-medium text-[#B42318]"
                >
                  {formError}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="tpl-name"
                    className="block text-xs font-semibold text-[#476078]"
                  >
                    Nome do modelo
                  </label>
                  <input
                    id="tpl-name"
                    type="text"
                    disabled={isViewer}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tpl-category"
                    className="block text-xs font-semibold text-[#476078]"
                  >
                    Categoria sugerida
                  </label>
                  <select
                    id="tpl-category"
                    disabled={isViewer}
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        category: e.target.value as EquipmentCategory | 'Geral',
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="tpl-desc"
                  className="block text-xs font-semibold text-[#476078]"
                >
                  Descrição
                </label>
                <input
                  id="tpl-desc"
                  type="text"
                  disabled={isViewer}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                />
              </div>

              {/* Items */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#17324D]">
                    Itens de verificação ({draft.items.length})
                  </h3>
                  {!isViewer && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#176B5B] hover:bg-[#EAF4F1]"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Adicionar item
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {draft.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-3.5"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-[#526980]">
                            Grupo / Seção
                          </label>
                          <input
                            type="text"
                            disabled={isViewer}
                            value={item.section}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { section: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-[#DCE4EC] bg-white px-2.5 py-1.5 text-xs text-[#17324D]"
                          />
                        </div>
                        <div className="sm:col-span-8">
                          <label className="block text-[11px] font-medium text-[#526980]">
                            Pergunta / Item {idx + 1}
                          </label>
                          <input
                            type="text"
                            disabled={isViewer}
                            value={item.label}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { label: e.target.value })
                            }
                            className="mt-1 w-full rounded border border-[#DCE4EC] bg-white px-2.5 py-1.5 text-xs text-[#17324D]"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <select
                            aria-label="Tipo de resposta"
                            disabled={isViewer}
                            value={item.type}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                type: e.target.value as TemplateItemType,
                              })
                            }
                            className="rounded border border-[#DCE4EC] bg-white px-2 py-1 text-xs text-[#17324D]"
                          >
                            <option value="check">Conforme / Não conforme</option>
                            <option value="number">Leitura numérica + status</option>
                          </select>

                          {item.type === 'number' && (
                            <input
                              type="text"
                              disabled={isViewer}
                              value={item.unit ?? ''}
                              onChange={(e) =>
                                handleUpdateItem(item.id, { unit: e.target.value })
                              }
                              placeholder="Unidade (ex.: °C, bar)"
                              className="w-28 rounded border border-[#DCE4EC] bg-white px-2 py-1 text-xs text-[#17324D]"
                            />
                          )}

                          <label className="flex items-center gap-1.5 text-[#17324D]">
                            <input
                              type="checkbox"
                              disabled={isViewer}
                              checked={item.required}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  required: e.target.checked,
                                })
                              }
                              className="accent-[#176B5B]"
                            />
                            Obrigatório
                          </label>

                          <label className="flex items-center gap-1.5 text-[#17324D]">
                            <input
                              type="checkbox"
                              disabled={isViewer}
                              checked={item.photoRequired}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  photoRequired: e.target.checked,
                                })
                              }
                              className="accent-[#176B5B]"
                            />
                            Exigir foto
                          </label>
                        </div>

                        {!isViewer && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveItem(idx, -1)}
                              aria-label={`Mover item ${idx + 1} para cima`}
                              className="rounded border border-[#DCE4EC] bg-white p-1.5 text-[#476078] hover:text-[#17324D] disabled:opacity-40"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draft.items.length - 1}
                              onClick={() => handleMoveItem(idx, 1)}
                              aria-label={`Mover item ${idx + 1} para baixo`}
                              className="rounded border border-[#DCE4EC] bg-white p-1.5 text-[#476078] hover:text-[#17324D] disabled:opacity-40"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remover item ${idx + 1}`}
                              className="rounded border border-[#DCE4EC] bg-white p-1.5 text-[#B42318] hover:bg-[#FEF3F2]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Apply Template to Category */}
            {!isViewer && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE4EC] bg-white p-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#17324D]">
                    Aplicar modelo em lote aos equipamentos
                  </h3>
                  <p className="text-xs text-[#526980]">
                    Vincula este checklist a todos os equipamentos da categoria selecionada.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Categoria de destino"
                    value={applyTargetCategory}
                    onChange={(e) => setApplyTargetCategory(e.target.value)}
                    className="min-h-[38px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs text-[#17324D]"
                  >
                    <option value="Climatização">Climatização</option>
                    <option value="Compressores">Compressores</option>
                    <option value="Movimentação">Movimentação</option>
                    <option value="Energia">Energia</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Elétrica">Elétrica</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      applyTemplateToCategory(draft.id, applyTargetCategory)
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#176B5B] bg-[#EAF4F1] px-3.5 text-xs font-semibold text-[#176B5B] hover:bg-[#DCEEE8]"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Aplicar agora
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};
