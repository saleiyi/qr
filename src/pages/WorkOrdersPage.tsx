import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Columns3, List, Search, ArrowUpRight, Clock } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAppState } from '../context/AppStateContext';
import { WorkOrderDetail } from '../components/WorkOrderDetail';
import { IssueStatusBadge, IssuePriorityLabel } from '../components/StatusBadge';
import { controlClass, secondaryClass } from '../components/OperationsUI';
import { formatDateBR } from '../utils/date';
import { APP_CONFIG } from '../config/appConfig';
import type { Issue, IssueStatus } from '../types/domain';

const lanes: Array<{ status: IssueStatus; label: string }> = [
  { status: 'open', label: 'Abertas' },
  { status: 'in_progress', label: 'Em atendimento' },
  { status: 'awaiting_review', label: 'Aguardando verificação' },
  { status: 'resolved', label: 'Concluídas' },
];
export function WorkOrdersPage() {
  const { effectiveState: state } = useAppState();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('issueId'));
  const status = params.get('status') ?? 'unresolved';
  const assignee = params.get('assignee') ?? 'all';
  const assetFilter = params.get('assetId');
  const selected = state.issues.find((issue) => issue.id === selectedId);
  const assetOf = (id: string) => state.assets.find((a) => a.id === id);
  const nameOf = (id: string) =>
    state.members.find((m) => m.id === id)?.name ?? 'Aguardando atribuição';
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };
  const filtered = state.issues.filter((issue) => {
    if (status === 'unresolved' && issue.status === 'resolved') return false;
    if (status === 'unassigned' && (issue.assigneeId || issue.status === 'resolved')) return false;
    if (!['unresolved', 'unassigned', 'all'].includes(status) && issue.status !== status)
      return false;
    if (assignee !== 'all' && issue.assigneeId !== assignee) return false;
    if (assetFilter && issue.assetId !== assetFilter) return false;
    const asset = assetOf(issue.assetId);
    return `${issue.title} ${issue.description} ${asset?.code} ${asset?.name} ${issue.id}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const open = (issue: Issue) => {
    setSelectedId(issue.id);
    const next = new URLSearchParams(params);
    next.set('issueId', issue.id);
    setParams(next, { replace: true });
  };
  const close = () => {
    setSelectedId(null);
    const next = new URLSearchParams(params);
    next.delete('issueId');
    setParams(next, { replace: true });
  };
  const card = (issue: Issue, board = false) => {
    const asset = assetOf(issue.assetId);
    const overdue = issue.status !== 'resolved' && issue.dueDate < APP_CONFIG.demoClockDate;
    return (
      <article
        key={issue.id}
        data-testid="work-order"
        className={`${board ? 'rounded-xl border border-[#DCE4EC] bg-white p-4 shadow-xs' : 'grid gap-4 border-b border-[#DCE4EC] p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[minmax(0,1fr)_180px_190px_auto] sm:items-center sm:p-5'}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <IssuePriorityLabel priority={issue.priority} />
            {!issue.inspectionId && (
              <span className="text-[11px] font-medium text-[#526980]">Solicitação QR</span>
            )}
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold leading-relaxed text-[#17324D]">
            {issue.title}
          </h3>
          <Link
            to={`/app/assets/${issue.assetId}`}
            className="mt-1 block break-words text-xs text-[#526980] hover:text-[#176B5B]"
          >
            {asset?.code} · {asset?.name}
          </Link>
          {board && (
            <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-[#526980]">
              {issue.description}
            </p>
          )}
        </div>
        <div className={board ? 'mt-4 border-t border-[#DCE4EC] pt-3' : ''}>
          <p
            className={`text-xs ${!issue.assigneeId ? 'font-semibold text-[#B76A12]' : 'text-[#526980]'}`}
          >
            {nameOf(issue.assigneeId)}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs tabular-nums ${overdue ? 'font-semibold text-[#B42318]' : 'text-[#526980]'}`}
          >
            <Clock className="h-3 w-3" />
            {overdue ? 'Atrasada · ' : ''}
            {formatDateBR(issue.dueDate)}
          </p>
        </div>
        {!board && (
          <div>
            <IssueStatusBadge status={issue.status} />
          </div>
        )}
        <button
          onClick={() => open(issue)}
          className={`${secondaryClass} ${board ? 'mt-3 w-full' : ''}`}
        >
          {issue.status === 'resolved' ? 'Detalhes' : 'Tratar'}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </article>
    );
  };
  return (
    <AppShell
      title="Ordens e pendências"
      subtitle="Da solicitação ao resultado verificado: acompanhe cada atendimento."
      primaryAction={
        <Link to="/app/assets" className={secondaryClass}>
          Abrir equipamentos
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      }
    >
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            key: 'unassigned',
            label: 'Sem atribuição',
            count: state.issues.filter((i) => !i.assigneeId && i.status !== 'resolved').length,
          },
          {
            key: 'in_progress',
            label: 'Em atendimento',
            count: state.issues.filter((i) => i.status === 'in_progress').length,
          },
          {
            key: 'awaiting_review',
            label: 'Aguardando verificação',
            count: state.issues.filter((i) => i.status === 'awaiting_review').length,
          },
          {
            key: 'resolved',
            label: 'Concluídas',
            count: state.issues.filter((i) => i.status === 'resolved').length,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => update('status', item.key)}
            className={`rounded-xl border p-4 text-left ${status === item.key ? 'border-[#176B5B] bg-[#EAF4F0]' : 'border-[#DCE4EC] bg-white'}`}
          >
            <p className="text-xs leading-relaxed text-[#526980]">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#17324D]">{item.count}</p>
          </button>
        ))}
      </section>
      <section className="mb-5 space-y-3 rounded-xl border border-[#DCE4EC] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-[14px] h-4 w-4 text-[#526980]" />
            <input
              type="search"
              aria-label="Buscar pendências"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por problema, equipamento ou código"
              className={`${controlClass} !mt-0 pl-9`}
            />
          </div>
          <select
            aria-label="Filtrar por status da pendência"
            value={status}
            onChange={(event) => update('status', event.target.value)}
            className={`${controlClass} !mt-0 lg:!w-56`}
          >
            <option value="unresolved">Todas em aberto</option>
            <option value="unassigned">Sem atribuição</option>
            {lanes.map((lane) => (
              <option key={lane.status} value={lane.status}>
                {lane.label}
              </option>
            ))}
            <option value="all">Todos os estados</option>
          </select>
          <select
            aria-label="Filtrar por responsável"
            value={assignee}
            onChange={(event) => update('assignee', event.target.value)}
            className={`${controlClass} !mt-0 lg:!w-56`}
          >
            <option value="all">Todos os responsáveis</option>
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE4EC] pt-3">
          <p className="text-xs text-[#526980]">
            {filtered.length} atendimento(s)
            {assetFilter && ` · ${assetOf(assetFilter)?.code ?? 'Equipamento'}`}{' '}
            <button
              onClick={() => {
                setParams({ status: 'unresolved' }, { replace: true });
                setSearch('');
              }}
              className="ml-2 min-h-[36px] font-semibold text-[#176B5B]"
            >
              Limpar filtros
            </button>
          </p>
          <div className="flex gap-1 rounded-lg bg-[#F4F7FA] p-1">
            {(['list', 'board'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={view === mode}
                onClick={() => {setView(mode);if(mode === 'board' && status === 'unresolved')update('status','all');}}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-md px-3 text-xs font-semibold ${view === mode ? 'bg-white text-[#176B5B] shadow-sm' : 'text-[#526980]'}`}
              >
                {mode === 'list' ? <List className="h-4 w-4" /> : <Columns3 className="h-4 w-4" />}
                {mode === 'list' ? 'Lista' : 'Quadro'}
              </button>
            ))}
          </div>
        </div>
      </section>
      {!filtered.length ? (
        <section className="rounded-xl border border-[#DCE4EC] bg-white px-5 py-16 text-center">
          <ClipboardList className="mx-auto h-9 w-9 text-[#8AA2B8]" />
          <h2 className="mt-4 font-semibold">Nenhum atendimento neste filtro</h2>
          <p className="mt-2 text-sm text-[#526980]">
            Altere o status, o responsável ou a busca para consultar outras ordens.
          </p>
        </section>
      ) : view === 'list' ? (
        <section className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white">
          {filtered.map((issue) => card(issue))}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {lanes.map((lane) => {
            const issues = filtered.filter((i) => i.status === lane.status);
            return (
              <div
                key={lane.status}
                className="min-w-0 rounded-xl border border-[#DCE4EC] bg-[#EBF0F5] p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-2 px-1">
                  <h2 className="text-sm font-semibold leading-relaxed">{lane.label}</h2>
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs tabular-nums">
                    {issues.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {issues.map((issue) => card(issue, true))}
                  {!issues.length && (
                    <p className="py-8 text-center text-xs text-[#526980]">
                      Nenhuma ordem nesta etapa
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
      {selected && <WorkOrderDetail key={selected.id} issue={selected} onClose={close} />}
    </AppShell>
  );
}
