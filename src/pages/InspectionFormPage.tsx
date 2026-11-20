import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import type {
  ChecklistAnswerValue,
  InspectionDraft,
  InspectionRecord,
  TemplateItem,
} from '../types/domain';
import {
  clearInspectionDraft,
  loadInspectionDraft,
  processImageUpload,
  saveInspectionDraft,
} from '../services/storageAdapter';
import {
  validateInspectionDraft,
  type DraftAnswerMap,
} from '../utils/domainLogic';
import { formatDateTimeBR } from '../utils/date';
import { ConfirmDialog } from '../components/ConfirmDialog';

function fingerprintDraft(draft: Omit<InspectionDraft, 'updatedAt'>): string {
  return JSON.stringify({
    assetId: draft.assetId,
    templateId: draft.templateId,
    inspectorId: draft.inspectorId,
    generalNotes: draft.generalNotes,
    answers: draft.answers,
  });
}

export const InspectionFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, demoSettings, submitInspection, addToast } = useAppState();

  const asset = state.assets.find((a) => a.id === id);
  const template = asset
    ? state.templates.find((t) => t.id === asset.templateId) ?? state.templates[0]
    : undefined;

  const activeInspectors = state.members.filter(
    (m) => m.status === 'active' && m.role !== 'viewer',
  );
  const defaultInspectorId = activeInspectors[0]?.id ?? state.members[0]?.id ?? '';

  const [inspectorId, setInspectorId] = useState(defaultInspectorId);
  const [generalNotes, setGeneralNotes] = useState('');
  const [answers, setAnswers] = useState<DraftAnswerMap>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(
    null,
  );
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'processing' | 'saving' | 'saved' | 'error'>('idle');
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const [submittedResult, setSubmittedResult] = useState<{
    record: InspectionRecord;
    createdIssuesCount: number;
  } | null>(null);

  const idempotencyKeyRef = useRef<string>(
    `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

  const draftValues = useMemo(() => ({
    assetId: asset?.id ?? '',
    templateId: template?.id ?? '',
    inspectorId,
    generalNotes,
    answers,
  }), [asset?.id, template?.id, inspectorId, generalNotes, answers]);
  const currentFingerprint = useMemo(() => fingerprintDraft(draftValues), [draftValues]);
  const initialFingerprint = useMemo(() => fingerprintDraft({
    assetId: asset?.id ?? '',
    templateId: template?.id ?? '',
    inspectorId: defaultInspectorId,
    generalNotes: '',
    answers: {},
  }), [asset?.id, template?.id, defaultInspectorId]);
  const hasPendingPhotos = pendingPhotoCount > 0;
  const hasUnsavedChanges = Boolean(
    asset && template && !submittedResult &&
    (hasPendingPhotos || currentFingerprint !== (lastSavedFingerprint ?? initialFingerprint)),
  );

  const blocker = useBlocker(useCallback(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && !allowLeaveRef.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [hasUnsavedChanges],
  ));

  useBeforeUnload(useCallback((event) => {
    if (hasUnsavedChanges && !allowLeaveRef.current) {
      event.preventDefault();
      event.returnValue = '';
    }
  }, [hasUnsavedChanges]));

  useEffect(() => {
    if (blocker.state === 'blocked' && !hasUnsavedChanges) blocker.proceed();
  }, [blocker, hasUnsavedChanges]);

  // Restore saved draft if present (and never preselect "Conforme")
  useEffect(() => {
    if (!asset) return;
    const saved = loadInspectionDraft(asset.id);
    if (saved) {
      setAnswers(saved.answers ?? {});
      setGeneralNotes(saved.generalNotes ?? '');
      if (saved.inspectorId) setInspectorId(saved.inspectorId);
      setLastSavedFingerprint(fingerprintDraft(saved));
      setDraftSaveState('saved');
      setDraftRestoredNotice(
        `Rascunho recuperado (salvo em ${formatDateTimeBR(saved.updatedAt)}).`,
      );
    }
  }, [asset?.id]);

  const persistDraft = useCallback(() => {
    const result = saveInspectionDraft(
      { ...draftValues, updatedAt: new Date().toISOString() },
      demoSettings.simulateStorageError,
    );
    if (result.ok) {
      setLastSavedFingerprint(currentFingerprint);
      setDraftSaveState('saved');
      setDraftSaveError(null);
    } else {
      setDraftSaveState('error');
      setDraftSaveError(result.error ?? 'Não foi possível salvar o rascunho.');
    }
    return result;
  }, [draftValues, currentFingerprint, demoSettings.simulateStorageError]);

  // Debounce expensive photo serialization and report the actual persistence result.
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setDraftSaveState(lastSavedFingerprint === null ? 'idle' : 'saved');
      setDraftSaveError(null);
      return;
    }
    if (allowLeaveRef.current) return;
    setDraftSaveState(hasPendingPhotos ? 'processing' : 'saving');
    if (hasPendingPhotos) return;
    const timer = window.setTimeout(persistDraft, 350);
    return () => window.clearTimeout(timer);
  }, [hasUnsavedChanges, hasPendingPhotos, lastSavedFingerprint, persistDraft]);

  const sections = useMemo(() => {
    if (!template) return [];
    const grouped = new Map<string, TemplateItem[]>();
    for (const item of template.items) {
      const list = grouped.get(item.section) ?? [];
      list.push(item);
      grouped.set(item.section, list);
    }
    return Array.from(grouped.entries());
  }, [template]);

  if (!asset || !template) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] p-6 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-[#DCE4EC] bg-white p-6">
          <h1 className="text-lg font-bold text-[#17324D]">
            Equipamento não encontrado
          </h1>
          <Link
            to="/app/assets"
            className="mt-4 inline-block rounded-lg bg-[#176B5B] px-4 py-2 text-sm font-semibold text-white"
          >
            Voltar aos equipamentos
          </Link>
        </div>
      </div>
    );
  }

  const totalItems = template.items.length;
  const answeredCount = template.items.filter(
    (item) => Boolean(answers[item.id]?.status),
  ).length;
  const remainingCount = totalItems - answeredCount;
  const progressPct =
    totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  const setItemStatus = (itemId: string, status: ChecklistAnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status,
      },
    }));
    setItemErrors((prev) => {
      if (!prev[itemId]) return prev;
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const setItemField = (
    itemId: string,
    patch: Partial<DraftAnswerMap[string]>,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...patch,
      },
    }));
    setItemErrors((prev) => {
      if (!prev[itemId]) return prev;
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const handlePhotoUpload = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoErrors((prev) => ({ ...prev, [itemId]: '' }));
    setPendingPhotoCount((count) => count + 1);
    try {
      const res = await processImageUpload(file);
      if (!res.ok) {
        setPhotoErrors((prev) => ({
          ...prev,
          [itemId]: res.error ?? 'Erro ao carregar imagem.',
        }));
        return;
      }
      setItemField(itemId, {
        photoDataUrl: res.dataUrl,
        photoName: file.name,
      });
    } catch {
      setPhotoErrors((prev) => ({
        ...prev,
        [itemId]: 'Erro ao carregar imagem. Selecione a foto novamente.',
      }));
    } finally {
      setPendingPhotoCount((count) => count - 1);
    }
  };

  const handleManualSaveDraft = () => {
    if (hasPendingPhotos) return;
    const res = persistDraft();
    if (!res.ok) {
      addToast({
        type: 'error',
        title: 'Falha ao salvar rascunho',
        description: res.error,
      });
      return;
    }
    addToast({
      type: 'success',
      title: 'Rascunho salvo',
      description: 'Você pode sair e retomar esta inspeção mais tarde.',
    });
  };

  const handleDiscardDraft = () => {
    allowLeaveRef.current = true;
    clearInspectionDraft(asset.id);
    setConfirmDiscardOpen(false);
    navigate(`/a/${asset.id}`);
  };

  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittedResult || hasPendingPhotos) return;

    const validationErrors = validateInspectionDraft(template, answers);
    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {};
      for (const err of validationErrors) {
        if (!errMap[err.itemId]) errMap[err.itemId] = err.message;
      }
      setItemErrors(errMap);

      const firstId = validationErrors[0].itemId;
      const el = document.getElementById(`checklist-item-${firstId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addToast({
        type: 'error',
        title: 'Revise os itens obrigatórios',
        description: `${validationErrors.length} item(ns) precisam de atenção antes de finalizar.`,
      });
      return;
    }

    setIsSubmitting(true);
    const res = submitInspection({
      assetId: asset.id,
      templateId: template.id,
      inspectorId,
      generalNotes,
      answers,
      idempotencyKey: idempotencyKeyRef.current,
    });
    setIsSubmitting(false);

    if (!res.ok || !res.record) {
      addToast({
        type: 'error',
        title: 'Não foi possível finalizar a inspeção',
        description: res.error,
      });
      return;
    }

    clearInspectionDraft(asset.id);
    setSubmittedResult({
      record: res.record,
      createdIssuesCount: res.createdIssuesCount ?? 0,
    });
  };

  if (submittedResult) {
    const { record, createdIssuesCount } = submittedResult;
    return (
      <div className="min-h-screen bg-[#F4F7FA] px-4 py-8 text-[#17324D]">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#DCE4EC] bg-white p-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                record.overallResult === 'approved'
                  ? 'bg-[#ECF7EE] text-[#137333]'
                  : 'bg-[#FEF6EB] text-[#B76A12]'
              }`}
            >
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#17324D]">
                Inspeção finalizada
              </h1>
              <p className="text-xs text-[#526980]">
                Registro {record.id} · {formatDateTimeBR(record.submittedAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-4 text-sm">
            <p className="font-mono text-xs font-semibold text-[#17324D]">
              {record.assetCodeSnapshot}
            </p>
            <p className="font-semibold text-[#17324D]">
              {record.assetNameSnapshot}
            </p>
            <p className="mt-1 text-xs text-[#476078]">
              Inspetor: {record.inspectorNameSnapshot}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#DCE4EC] pt-3 text-center text-xs tabular-nums">
              <div>
                <p className="font-mono text-base font-bold text-[#137333]">
                  {record.conformingCount}
                </p>
                <p className="text-[#526980]">Conformes</p>
              </div>
              <div>
                <p className="font-mono text-base font-bold text-[#B42318]">
                  {record.nonConformingCount}
                </p>
                <p className="text-[#526980]">Não conformes</p>
              </div>
              <div>
                <p className="font-mono text-base font-bold text-[#476078]">
                  {record.naCount}
                </p>
                <p className="text-[#526980]">N/A</p>
              </div>
            </div>
          </div>

          {createdIssuesCount > 0 && (
            <div className="mt-4 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] p-4 text-xs text-[#B42318]">
              <p className="font-semibold">
                {createdIssuesCount} pendência(s) aberta(s) automaticamente
              </p>
              <p className="mt-1">
                Cada item marcado como Não conforme gerou uma pendência rastreável na lista de tratamento.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            {createdIssuesCount > 0 && (
              <Link
                to={`/app/issues?assetId=${asset.id}`}
                className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#B42318] px-4 text-sm font-semibold text-white hover:bg-[#911C13]"
              >
                Ver pendências geradas
              </Link>
            )}
            <Link
              to={`/a/${asset.id}`}
              className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#176B5B] px-4 text-sm font-semibold text-white hover:bg-[#125548]"
            >
              Voltar à ficha móvel
            </Link>
            <Link
              to="/app/records"
              className="flex w-full min-h-[44px] items-center justify-center rounded-xl border border-[#DCE4EC] bg-white px-4 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA]"
            >
              Abrir registros e relatórios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-28 text-[#17324D]">
      {/* Sticky Compact Top Bar (part of <=15% total sticky surface) */}
      <header className="sticky top-0 z-30 border-b border-[#DCE4EC] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate(`/a/${asset.id}`)}
            aria-label="Voltar para ficha do equipamento"
            className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[#35506B] hover:text-[#17324D]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Ficha</span>
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate font-mono text-xs font-bold text-[#17324D]">
              {asset.code}
            </p>
            <p className="truncate text-[11px] text-[#526980] tabular-nums">
              {answeredCount} de {totalItems} respondidos
            </p>
          </div>

          <button
            type="button"
            onClick={() => setConfirmDiscardOpen(true)}
            className="min-h-[40px] px-2 text-xs font-medium text-[#B42318] hover:underline"
          >
            Limpar
          </button>
        </div>
        <div className="h-1 w-full bg-[#DCE4EC]">
          <div
            className="h-full bg-[#176B5B] transition-all duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {/* Inspection Context Card */}
        <section className="rounded-2xl border border-[#DCE4EC] bg-white p-4 sm:p-5">
          <p className="font-mono text-xs font-semibold text-[#176B5B]">
            {asset.code} · {template.name}
          </p>
          <h1 className="mt-1 text-lg font-bold text-[#17324D]">
            {asset.name}
          </h1>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inspector-select"
                className="block text-xs font-medium text-[#526980]"
              >
                Responsável pela inspeção
              </label>
              <select
                id="inspector-select"
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-sm text-[#17324D]"
              >
                {activeInspectors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.jobTitle})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end text-xs text-[#476078]">
              <p className="tabular-nums">
                Progresso: <strong>{answeredCount}</strong> concluído(s) ·{' '}
                <strong>{remainingCount}</strong> restante(s)
              </p>
              <p className="mt-0.5 text-[11px] text-[#526980]">
                Nenhum item vem marcado previamente.
              </p>
            </div>
          </div>

          {draftRestoredNotice && (
            <div className="mt-3 rounded-lg border border-[#CBE4D3] bg-[#ECF7EE] px-3 py-2 text-xs text-[#137333]">
              {draftRestoredNotice}
            </div>
          )}
        </section>

        {draftSaveState !== 'idle' && (
          <div
            role={draftSaveState === 'error' ? 'alert' : 'status'}
            className={`mt-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              draftSaveState === 'error'
                ? 'border-[#F4C7C3] bg-[#FEF3F2] text-[#B42318]'
                : 'border-[#DCE4EC] bg-white text-[#476078]'
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {draftSaveState === 'error'
                  ? 'Não foi possível salvar o rascunho'
                  : draftSaveState === 'processing'
                    ? 'Processando foto… Aguarde antes de salvar ou finalizar.'
                    : draftSaveState === 'saving'
                      ? 'Salvando rascunho…'
                      : 'Rascunho salvo neste navegador'}
              </p>
              {draftSaveState === 'error' && (
                <p className="mt-1 text-xs leading-relaxed">
                  {draftSaveError} Suas respostas continuam nesta tela. Salve novamente antes de sair.
                </p>
              )}
            </div>
            {draftSaveState === 'error' && (
              <button
                type="button"
                onClick={handleManualSaveDraft}
                className="min-h-[44px] shrink-0 rounded-lg border border-[#F4C7C3] bg-white px-3 text-xs font-semibold hover:bg-[#FEF3F2]"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitInspection} noValidate className="mt-5 space-y-5">
          {sections.map(([sectionName, items]) => (
            <section
              key={sectionName}
              className="rounded-2xl border border-[#DCE4EC] bg-white p-4 sm:p-5"
            >
              <h2 className="border-b border-[#DCE4EC] pb-2.5 text-sm font-bold text-[#17324D]">
                {sectionName}
              </h2>

              <div className="divide-y divide-[#DCE4EC]">
                {items.map((item) => {
                  const ans = answers[item.id] ?? {};
                  const errorMsg = itemErrors[item.id];
                  const photoErr = photoErrors[item.id];
                  const needsPhoto =
                    item.photoRequired ||
                    (item.photoRequiredOnFail && ans.status === 'non_conforming');

                  return (
                    <div
                      key={item.id}
                      id={`checklist-item-${item.id}`}
                      className="py-4 first:pt-3 last:pb-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[#17324D]">
                          {item.label}
                          {item.required && (
                            <span className="ml-1 text-[#B42318]" aria-hidden="true">
                              *
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Touch-friendly 3-way selector (44px+ min-height) */}
                      <div
                        className="mt-3 grid grid-cols-[1fr_1.35fr_0.75fr] gap-1.5 sm:grid-cols-3 sm:gap-2"
                        role="group"
                        aria-label={`Resultado para ${item.label}`}
                      >
                        <button
                          type="button"
                          onClick={() => setItemStatus(item.id, 'conforming')}
                          aria-pressed={ans.status === 'conforming'}
                          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                            ans.status === 'conforming'
                              ? 'border-[#137333] bg-[#ECF7EE] text-[#137333]'
                              : 'border-[#DCE4EC] bg-white text-[#35506B] hover:bg-[#F4F7FA]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemStatus(item.id, 'non_conforming')}
                          aria-pressed={ans.status === 'non_conforming'}
                          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                            ans.status === 'non_conforming'
                              ? 'border-[#B42318] bg-[#FEF3F2] text-[#B42318]'
                              : 'border-[#DCE4EC] bg-white text-[#35506B] hover:bg-[#F4F7FA]'
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Não conforme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemStatus(item.id, 'na')}
                          aria-pressed={ans.status === 'na'}
                          className={`flex min-h-[44px] items-center justify-center rounded-xl border px-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                            ans.status === 'na'
                              ? 'border-[#476078] bg-[#EAF0F6] text-[#17324D]'
                              : 'border-[#DCE4EC] bg-white text-[#526980] hover:bg-[#F4F7FA]'
                          }`}
                        >
                          N/A
                        </button>
                      </div>

                      {/* Numeric input when item type is number */}
                      {item.type === 'number' && ans.status !== 'na' && (
                        <div className="mt-3">
                          <label
                            htmlFor={`num-${item.id}`}
                            className="block text-xs font-medium text-[#476078]"
                          >
                            Leitura numérica {item.unit ? `(${item.unit})` : ''}
                          </label>
                          <input
                            id={`num-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            value={ans.numericValue ?? ''}
                            onChange={(e) =>
                              setItemField(item.id, { numericValue: e.target.value })
                            }
                            placeholder={`Ex.: 12.5 ${item.unit ?? ''}`}
                            className="mt-1 w-full max-w-xs min-h-[42px] rounded-lg border border-[#DCE4EC] px-3 font-mono text-sm text-[#17324D]"
                          />
                        </div>
                      )}

                      {/* Observation text (required on non_conforming) */}
                      {(ans.status === 'non_conforming' || ans.note) && (
                        <div className="mt-3">
                          <label
                            htmlFor={`note-${item.id}`}
                            className="block text-xs font-medium text-[#476078]"
                          >
                            {ans.status === 'non_conforming'
                              ? 'Descrição da não conformidade *'
                              : 'Observação'}
                          </label>
                          <textarea
                            id={`note-${item.id}`}
                            rows={2}
                            value={ans.note ?? ''}
                            onChange={(e) =>
                              setItemField(item.id, { note: e.target.value })
                            }
                            placeholder="Descreva o problema encontrado, peça afetada ou risco..."
                            className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                          />
                        </div>
                      )}

                      {/* Optional/Required Photo upload */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] px-3 py-1.5 text-xs font-medium text-[#17324D] hover:bg-[#EAF0F6]">
                          <Camera className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
                          <span>
                            {ans.photoDataUrl
                              ? 'Trocar foto'
                              : needsPhoto
                                ? 'Anexar foto (obrigatório)'
                                : 'Anexar foto (opcional)'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(ev) => handlePhotoUpload(item.id, ev)}
                            className="sr-only"
                          />
                        </label>
                        <span className="text-[11px] text-[#526980]">
                          JPG, PNG ou WEBP até 5 MB
                        </span>
                      </div>

                      {ans.photoDataUrl && (
                        <div className="mt-2.5 flex items-center gap-3">
                          <img
                            src={ans.photoDataUrl}
                            alt={`Evidência de ${item.label}`}
                            referrerPolicy="no-referrer"
                            className="h-16 w-24 rounded-lg border border-[#DCE4EC] object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setItemField(item.id, {
                                photoDataUrl: undefined,
                                photoName: undefined,
                              })
                            }
                            className="inline-flex min-h-[36px] items-center gap-1 text-xs font-medium text-[#B42318]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remover foto
                          </button>
                        </div>
                      )}

                      {photoErr && (
                        <p className="mt-1.5 text-xs font-medium text-[#B42318]" role="alert">
                          {photoErr}
                        </p>
                      )}

                      {errorMsg && (
                        <p
                          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#B42318]"
                          role="alert"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {errorMsg}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* General Notes */}
          <section className="rounded-2xl border border-[#DCE4EC] bg-white p-4 sm:p-5">
            <label
              htmlFor="general-notes"
              className="block text-sm font-semibold text-[#17324D]"
            >
              Observações gerais da inspeção (opcional)
            </label>
            <textarea
              id="general-notes"
              rows={3}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Condições de operação, recomendações para a próxima preventiva..."
              className="mt-2 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
            />
          </section>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#DCE4EC] bg-white/95 px-3 py-2.5 backdrop-blur-sm">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={hasPendingPhotos}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm font-semibold text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-60 whitespace-nowrap"
              >
                <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Salvar rascunho</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasPendingPhotos}
                className="inline-flex min-h-[44px] flex-[1.25] items-center justify-center gap-1.5 rounded-xl bg-[#176B5B] px-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#125548] disabled:opacity-60 whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {isSubmitting ? 'Registrando...' : 'Finalizar inspeção'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Sair sem salvar o rascunho?"
        description="As últimas respostas e fotos ainda não foram salvas. Continue preenchendo para tentar salvar novamente, ou saia sem guardar estas alterações."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar preenchendo"
        tone="danger"
        onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); }}
        onCancel={() => { if (blocker.state === 'blocked') blocker.reset(); }}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Descartar rascunho da inspeção?"
        description="Todas as respostas e fotos preenchidas nesta inspeção serão apagadas e você voltará para a ficha do equipamento."
        confirmLabel="Descartar rascunho"
        cancelLabel="Continuar preenchendo"
        tone="danger"
        onConfirm={handleDiscardDraft}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
    </div>
  );
};
