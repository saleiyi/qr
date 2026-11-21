import { useCallback, useRef, useState } from 'react';
import { Link, useBeforeUnload, useBlocker } from 'react-router-dom';
import { Camera, CheckCircle2, Clock3, UserRound, ClipboardCheck } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { processImageUpload } from '../services/storageAdapter';
import type { Issue, IssuePriority } from '../types/domain';
import type { WorkOrderAction } from '../utils/operations';
import { formatDateBR, formatDateTimeBR } from '../utils/date';
import { ConfirmDialog } from './ConfirmDialog';
import { IssuePriorityLabel, IssueStatusBadge } from './StatusBadge';
import {
  PanelModal,
  FormField,
  FormError,
  controlClass,
  primaryClass,
  secondaryClass,
} from './OperationsUI';

export function WorkOrderDetail({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const { state, demoSettings, changeWorkOrder } = useAppState();
  const admin = demoSettings.activeDemoRole === 'admin';
  const viewer = demoSettings.activeDemoRole === 'viewer';
  const members = state.members.filter(
    (member) => member.status === 'active' && member.role !== 'viewer',
  );
  const asset = state.assets.find((a) => a.id === issue.assetId);
  const [assignee, setAssignee] = useState(issue.assigneeId);
  const [dueDate, setDueDate] = useState(issue.dueDate);
  const [priority, setPriority] = useState(issue.priority);
  const [note, setNote] = useState(issue.resolutionNote ?? '');
  const [photo, setPhoto] = useState(issue.treatmentPhotoDataUrl);
  const [photoName, setPhotoName] = useState(issue.treatmentPhotoName);
  const [reviewNote, setReviewNote] = useState('');
  const [actor, setActor] = useState(
    members.find((m) => m.role === (admin ? 'admin' : 'operator'))?.id ?? members[0]?.id ?? '',
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const allowLeave = useRef(false);
  const dirty =
    !viewer &&
    issue.status !== 'resolved' &&
    Boolean(
      processing ||
      assignee !== issue.assigneeId ||
      dueDate !== issue.dueDate ||
      priority !== issue.priority ||
      note !== (issue.resolutionNote ?? '') ||
      photo !== issue.treatmentPhotoDataUrl ||
      reviewNote,
    );
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
  const close = () => (dirty ? setDiscard(true) : onClose());
  const history = [
    ...(!issue.timeline?.some((event) => event.label === 'Solicitação registrada')
      ? [
          {
            id: 'created',
            at: issue.createdAt,
            actorId: '',
            label: issue.inspectionId ? 'Aberta pela inspeção' : 'Solicitação recebida',
          },
        ]
      : []),
    ...(issue.timeline ?? []),
  ];
  const act = async (action: WorkOrderAction) => {
    if (processing) return;
    const result = await changeWorkOrder(issue.id, action, {
      actorId: actor,
      assigneeId: assignee,
      dueDate,
      priority,
      note: action === 'submit' ? note : reviewNote,
      photoDataUrl: photo,
      photoName,
    });
    if (!result.ok) setError(result.error ?? 'Não foi possível atualizar a ordem.');
    else {
      setError(null);
      setReviewNote('');
    }
  };
  return (
    <>
      <PanelModal
        title={issue.title}
        description={`${asset?.code ?? 'Equipamento'} · ${asset?.name ?? ''}`}
        onClose={close}
        wide
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <IssueStatusBadge status={issue.status} />
              <IssuePriorityLabel priority={issue.priority} />
              <span className="text-xs text-[#526980]">Prazo: {formatDateBR(issue.dueDate)}</span>
              {!issue.assigneeId && (
                <span className="text-xs font-semibold text-[#B76A12]">Aguardando atribuição</span>
              )}
            </div>
            <section className="rounded-xl border border-[#DCE4EC] bg-[#F8FAFC] p-4">
              <h3 className="text-sm font-semibold">Problema relatado</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#476078]">
                {issue.description}
              </p>
              {issue.reportedBy && (
                <p className="mt-3 text-xs text-[#526980]">Informado por {issue.reportedBy}</p>
              )}
              {issue.photoDataUrl && (
                <img
                  src={issue.photoDataUrl}
                  alt="Foto do problema relatado"
                  className="mt-3 max-h-56 max-w-full rounded-lg object-contain"
                />
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#176B5B]">
                <Link to={`/app/assets/${issue.assetId}`}>Abrir ficha do equipamento</Link>
                {issue.inspectionId && (
                  <Link to={`/app/records?recordId=${issue.inspectionId}`}>
                    Ver inspeção de origem
                  </Link>
                )}
              </div>
            </section>
            <FormError message={error} />
            {!viewer && issue.status !== 'resolved' && (
              <FormField label="Responsável pela ação">
                <select
                  value={actor}
                  onChange={(event) => setActor(event.target.value)}
                  className={controlClass}
                >
                  {members
                    .filter((m) => (admin ? m.role === 'admin' : m.role === 'operator'))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </FormField>
            )}
            {admin && issue.status !== 'resolved' && (
              <section className="space-y-3 rounded-xl border border-[#DCE4EC] p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="h-4 w-4 text-[#176B5B]" />
                  Atribuição do atendimento
                </h3>
                <FormField label="Responsável pelo atendimento">
                  <select
                    value={assignee}
                    onChange={(event) => setAssignee(event.target.value)}
                    className={controlClass}
                  >
                    <option value="">Aguardando atribuição</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Prazo do atendimento">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className={controlClass}
                    />
                  </FormField>
                  <FormField label="Prioridade do atendimento">
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as IssuePriority)}
                      className={controlClass}
                    >
                      <option value="high">Alta</option>
                      <option value="medium">Média</option>
                      <option value="low">Baixa</option>
                    </select>
                  </FormField>
                </div>
                <button onClick={() => act('assign')} className={secondaryClass}>
                  Salvar atribuição
                </button>
              </section>
            )}
            {!viewer && issue.status === 'open' && (
              <button
                onClick={() => act('start')}
                disabled={!issue.assigneeId || processing}
                className={primaryClass}
              >
                <Clock3 className="h-4 w-4" />
                Iniciar atendimento
              </button>
            )}
            {issue.status === 'in_progress' && !viewer && (
              <section className="space-y-4 rounded-xl border border-[#DCE4EC] p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-[#176B5B]" />
                  Tratamento realizado
                </h3>
                <FormField label="Resultado do tratamento e ação corretiva *">
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={controlClass}
                    placeholder="Descreva o reparo e os testes realizados."
                  />
                </FormField>
                <label className={`${secondaryClass} cursor-pointer`}>
                  <Camera className="h-4 w-4" />
                  {processing ? 'Processando foto…' : 'Anexar foto do tratamento'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={processing}
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setProcessing(true);
                      setError(null);
                      try {
                        const result = await processImageUpload(file);
                        if (result.ok) {
                          setPhoto(result.dataUrl);
                          setPhotoName(file.name);
                        } else setError(result.error ?? 'Não foi possível carregar a foto.');
                      } catch {
                        setError('Não foi possível processar a foto. Selecione novamente.');
                      } finally {
                        setProcessing(false);
                      }
                    }}
                  />
                </label>
                {photo && (
                  <div>
                    <img
                      src={photo}
                      alt="Foto do tratamento"
                      className="max-h-60 max-w-full rounded-lg border border-[#DCE4EC] object-contain"
                    />
                    <button
                      onClick={() => {
                        setPhoto(undefined);
                        setPhotoName(undefined);
                      }}
                      className="mt-2 min-h-[40px] text-xs font-semibold text-[#B42318]"
                    >
                      Remover foto do tratamento
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#526980]">
                  JPG, PNG ou WEBP até 5 MB. O administrador verificará o resultado antes de
                  concluir.
                </p>
                <button
                  onClick={() => act('submit')}
                  disabled={processing}
                  className={primaryClass}
                >
                  Enviar para verificação
                </button>
              </section>
            )}
            {(issue.status === 'awaiting_review' || issue.status === 'resolved' || viewer) &&
              issue.resolutionNote && (
                <section className="rounded-xl border border-[#CBE4D3] bg-[#F3F9F5] p-4">
                  <h3 className="font-semibold">Tratamento registrado</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#476078]">
                    {issue.resolutionNote}
                  </p>
                  {issue.treatmentPhotoDataUrl && (
                    <img
                      src={issue.treatmentPhotoDataUrl}
                      alt="Foto do tratamento"
                      className="mt-3 max-h-60 max-w-full rounded-lg object-contain"
                    />
                  )}
                </section>
              )}
            {issue.status === 'awaiting_review' && admin && (
              <section className="space-y-3 rounded-xl border border-[#C8D7EA] bg-[#F5F8FC] p-4">
                <h3 className="font-semibold">Verificar o resultado</h3>
                <FormField
                  label="Observações da verificação"
                  hint="Explique o ajuste necessário ao devolver a ordem."
                >
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    className={controlClass}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => act('approve')} className={primaryClass}>
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovar e concluir
                  </button>
                  <button onClick={() => act('reject')} className={secondaryClass}>
                    Devolver para ajuste
                  </button>
                </div>
              </section>
            )}
            {viewer && (
              <p className="rounded-lg bg-[#F4F7FA] p-3 text-sm text-[#526980]">
                Perfil Visualizador: consulta de detalhes e histórico.
              </p>
            )}
            {issue.status === 'resolved' && (
              <p className="text-sm text-[#137333]">
                Concluída em {formatDateTimeBR(issue.resolvedAt)} por{' '}
                {state.members.find((m) => m.id === issue.resolvedById)?.name ?? 'responsável'}.
              </p>
            )}
          </div>
          <aside className="min-w-0 border-t border-[#DCE4EC] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h3 className="font-semibold">Histórico do atendimento</h3>
            <p className="mt-2 break-all text-[11px] text-[#526980]">{issue.id}</p>
            <ol className="mt-5 space-y-5 border-l border-[#DCE4EC] pl-4">
              {history.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#176B5B]" />
                  <p className="text-xs font-semibold leading-relaxed">{event.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#526980]">
                    {formatDateTimeBR(event.at)}
                    <br />
                    {state.members.find((m) => m.id === event.actorId)?.name ??
                      issue.reportedBy ??
                      'Registro do sistema'}
                  </p>
                  {event.note && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#476078]">
                      {event.note}
                    </p>
                  )}
                  {event.assigneeId && (
                    <p className="mt-2 text-xs leading-relaxed text-[#526980]">
                      {event.assigneeName ??
                        state.members.find((member) => member.id === event.assigneeId)?.name ??
                        event.assigneeId}{' '}
                      · {formatDateBR(event.dueDate)} ·{' '}
                      {event.priority === 'high'
                        ? 'Alta'
                        : event.priority === 'medium'
                          ? 'Média'
                          : 'Baixa'}
                    </p>
                  )}
                  {event.photoDataUrl && (
                    <figure className="mt-2">
                      <img
                        src={event.photoDataUrl}
                        alt={`Evidência do tratamento em ${formatDateTimeBR(event.at)}`}
                        className="max-h-48 max-w-full rounded-lg border border-[#DCE4EC] object-contain"
                      />
                      {event.photoName && (
                        <figcaption className="mt-1 break-words text-[11px] text-[#526980]">
                          {event.photoName}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </PanelModal>
      <ConfirmDialog
        open={discard || blocker.state === 'blocked'}
        title="Descartar alterações do atendimento?"
        description="Há informações ou fotos ainda não salvas nesta ordem."
        confirmLabel="Descartar alterações"
        cancelLabel="Continuar editando"
        tone="danger"
        onConfirm={() => {
          allowLeave.current = true;
          setDiscard(false);
          if (blocker.state === 'blocked') blocker.proceed();
          else onClose();
        }}
        onCancel={() => {
          setDiscard(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
    </>
  );
}
