import { Modal } from '../components/Modal';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import {
  IssuePriorityLabel,
  IssueStatusBadge,
} from '../components/StatusBadge';
import { formatDateBR, formatDateTimeBR } from '../utils/date';
import type { Issue } from '../types/domain';

export const IssuesPage: React.FC = () => {
  const {
    effectiveState,
    demoSettings,
    updateIssueStatus,
    resolveIssue,
  } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') ?? 'unresolved';
  const assigneeFilter = searchParams.get('assignee') ?? 'all';
  const assetFilter = searchParams.get('assetId') ?? 'all';
  const openIssueId = searchParams.get('issueId');
  const [search, setSearch] = useState('');

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    openIssueId,
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolverId, setResolverId] = useState(
    effectiveState.members[0]?.id ?? '',
  );
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (openIssueId) {
      setSelectedIssueId(openIssueId);
    }
  }, [openIssueId]);

  const selectedIssue: Issue | undefined = effectiveState.issues.find(
    (i) => i.id === selectedIssueId,
  );

  useEffect(() => {
    setResolutionNote('');
    setResolveError(null);
  }, [selectedIssueId]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return effectiveState.issues.filter((iss) => {
      if (statusFilter === 'unresolved' && iss.status === 'resolved') return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'unresolved' &&
        iss.status !== statusFilter
      ) {
        return false;
      }
      if (assigneeFilter !== 'all' && iss.assigneeId !== assigneeFilter) {
        return false;
      }
      if (assetFilter !== 'all' && iss.assetId !== assetFilter) {
        return false;
      }
      if (q) {
        const asset = effectiveState.assets.find((a) => a.id === iss.assetId);
        const match =
          iss.title.toLowerCase().includes(q) ||
          iss.description.toLowerCase().includes(q) ||
          (asset?.name.toLowerCase().includes(q) ?? false) ||
          (asset?.code.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [
    effectiveState.issues,
    effectiveState.assets,
    statusFilter,
    assigneeFilter,
    assetFilter,
    search,
  ]);

  const assetOf = (id: string) =>
    effectiveState.assets.find((a) => a.id === id);
  const memberNameOf = (id: string) =>
    effectiveState.members.find((m) => m.id === id)?.name ?? '—';
  const inspectionOf = (id: string) =>
    effectiveState.records.find((r) => r.id === id);

  const isViewer = demoSettings.activeDemoRole === 'viewer';

  const handleCloseDrawer = () => {
    setSelectedIssueId(null);
    if (searchParams.has('issueId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('issueId');
      setSearchParams(next, { replace: true });
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    const res = resolveIssue(selectedIssue.id, resolutionNote, resolverId);
    if (!res.ok) {
      setResolveError(res.error ?? 'Erro ao concluir pendência.');
      return;
    }
    setResolveError(null);
  };

  return (
    <AppShell
      title="Tratamento de pendências"
      subtitle={`${filteredIssues.length} pendência(s) exibida(s) a partir de inspeções em campo`}
    >
      {/* Filters */}
      <div className="rounded-xl border border-[#DCE4EC] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label htmlFor="issues-search" className="sr-only">
              Buscar pendências
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526980]"
                aria-hidden="true"
              />
              <input
                id="issues-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por item, descrição ou código..."
                className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] pl-9 pr-3 text-sm text-[#17324D]"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filtrar por status da pendência"
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-sm text-[#17324D]"
            >
              <option value="unresolved">Abertas e em tratamento</option>
              <option value="open">Somente abertas</option>
              <option value="in_progress">Em tratamento</option>
              <option value="resolved">Resolvidas</option>
              <option value="all">Todas</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filtrar por responsável"
              value={assigneeFilter}
              onChange={(e) => updateParam('assignee', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-sm text-[#17324D]"
            >
              <option value="all">Todos os responsáveis</option>
              {effectiveState.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center">
            {(statusFilter !== 'unresolved' ||
              assigneeFilter !== 'all' ||
              assetFilter !== 'all' ||
              search) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchParams({}, { replace: true });
                }}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] px-3 text-xs font-semibold text-[#17324D] hover:bg-[#EAF0F6]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <CheckCircle2
            className="mx-auto h-8 w-8 text-[#137333]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-base font-semibold text-[#17324D]">
            Nenhuma pendência encontrada neste filtro
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            Altere o filtro de status para consultar ocorrências já resolvidas ou limpar a busca.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="mt-5 hidden overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-xs md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EC] bg-[#EDF2F7] text-[11px] font-bold uppercase tracking-wide text-[#35506B]">
                  <th className="px-4 py-3">Equipamento</th>
                  <th className="px-4 py-3">Não conformidade</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EC]">
                {filteredIssues.map((iss) => {
                  const asset = assetOf(iss.assetId);
                  return (
                    <tr
                      key={iss.id}
                      className="hover:bg-[#F4F7FA]/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs">
                        <Link
                          to={`/app/assets/${iss.assetId}`}
                          className="font-mono font-semibold text-[#176B5B] hover:underline"
                        >
                          {asset?.code ?? iss.assetId}
                        </Link>
                        <p className="mt-0.5 font-medium text-[#17324D]">
                          {asset?.name ?? 'Equipamento'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#17324D]">
                          {iss.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#526980]">
                          {iss.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#35506B]">
                        {memberNameOf(iss.assigneeId)}
                      </td>
                      <td className="px-4 py-3">
                        <IssuePriorityLabel priority={iss.priority} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-[#35506B]">
                        {formatDateBR(iss.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <IssueStatusBadge status={iss.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIssueId(iss.id)}
                          className="rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#17324D] hover:bg-[#EAF4F1] hover:text-[#176B5B]"
                        >
                          {iss.status === 'resolved' ? 'Detalhes' : 'Tratar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {filteredIssues.map((iss) => {
              const asset = assetOf(iss.assetId);
              return (
                <div
                  key={iss.id}
                  className="rounded-xl border border-[#DCE4EC] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-[#176B5B]">
                      {asset?.code} · {asset?.name}
                    </span>
                    <IssuePriorityLabel priority={iss.priority} />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#17324D]">
                    {iss.title}
                  </p>
                  <p className="mt-1 text-xs text-[#476078]">{iss.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#DCE4EC] pt-3">
                    <IssueStatusBadge status={iss.status} />
                    <button
                      type="button"
                      onClick={() => setSelectedIssueId(iss.id)}
                      className="min-h-[38px] rounded-lg bg-[#176B5B] px-3.5 text-xs font-semibold text-white"
                    >
                      {iss.status === 'resolved' ? 'Ver detalhe' : 'Tratar pendência'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Slide-over Resolution Drawer */}
      {selectedIssue && (
        <Modal
          className="no-print fixed inset-0 z-50 flex justify-end bg-[#17324D]/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-drawer-title"
          onClose={handleCloseDrawer}
        >
          <div className="fixed inset-0" onClick={handleCloseDrawer} />
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[#526980]">
                  Pendência {selectedIssue.id}
                </p>
                <h2
                  id="issue-drawer-title"
                  className="text-base font-bold text-[#17324D]"
                >
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                aria-label="Fechar detalhes da pendência"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <IssueStatusBadge status={selectedIssue.status} />
                <IssuePriorityLabel priority={selectedIssue.priority} />
                <span className="font-mono text-xs text-[#526980] tabular-nums">
                  Prazo: {formatDateBR(selectedIssue.dueDate)}
                </span>
              </div>

              {/* Origin Links */}
              <div className="rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#526980]">Equipamento de origem</span>
                  <Link
                    to={`/app/assets/${selectedIssue.assetId}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#176B5B] hover:underline"
                  >
                    <span>
                      {assetOf(selectedIssue.assetId)?.code} —{' '}
                      {assetOf(selectedIssue.assetId)?.name}
                    </span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#526980]">Inspeção geradora</span>
                  {(() => {
                    const insp = inspectionOf(selectedIssue.inspectionId);
                    return (
                      <Link
                        to={`/app/records?recordId=${selectedIssue.inspectionId}`}
                        className="font-mono font-medium text-[#17324D] hover:text-[#176B5B] hover:underline"
                      >
                        {selectedIssue.inspectionId} (
                        {formatDateTimeBR(insp?.submittedAt ?? selectedIssue.createdAt)})
                      </Link>
                    );
                  })()}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#526980]">Responsável atribuído</span>
                  <span className="font-medium text-[#17324D]">
                    {memberNameOf(selectedIssue.assigneeId)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#526980]">
                  Ocorrência relatada na inspeção
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#17324D]">
                  {selectedIssue.description}
                </p>
                {selectedIssue.photoDataUrl && (
                  <img
                    src={selectedIssue.photoDataUrl}
                    alt="Evidência anexada na inspeção"
                    referrerPolicy="no-referrer"
                    className="mt-3 max-h-52 rounded-lg border border-[#DCE4EC] object-contain"
                  />
                )}
              </div>

              {selectedIssue.status === 'resolved' ? (
                <div className="rounded-xl border border-[#CBE4D3] bg-[#ECF7EE] p-4">
                  <p className="text-xs font-semibold text-[#137333]">
                    Pendência concluída em {formatDateTimeBR(selectedIssue.resolvedAt)}
                  </p>
                  <p className="mt-1 text-sm text-[#17324D]">
                    {selectedIssue.resolutionNote}
                  </p>
                  <p className="mt-2 text-xs text-[#476078]">
                    Tratada por:{' '}
                    {memberNameOf(selectedIssue.resolvedById ?? '')}
                  </p>
                </div>
              ) : !isViewer ? (
                <form
                  onSubmit={handleResolveSubmit}
                  className="space-y-4 border-t border-[#DCE4EC] pt-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#17324D]">
                      Registrar tratamento
                    </h3>
                    {selectedIssue.status === 'open' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateIssueStatus(selectedIssue.id, 'in_progress')
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2D3AA] bg-[#FEF6EB] px-3 py-1.5 text-xs font-semibold text-[#B76A12] hover:bg-[#FDEBD3]"
                      >
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Marcar em tratamento
                      </button>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="resolver-select"
                      className="block text-xs font-medium text-[#476078]"
                    >
                      Executado por
                    </label>
                    <select
                      id="resolver-select"
                      value={resolverId}
                      onChange={(e) => setResolverId(e.target.value)}
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-sm text-[#17324D]"
                    >
                      {effectiveState.members
                        .filter((m) => m.role !== 'viewer')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="resolution-note"
                      className="block text-xs font-medium text-[#476078]"
                    >
                      Resultado do tratamento e ação corretiva *
                    </label>
                    <textarea
                      id="resolution-note"
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => {
                        setResolutionNote(e.target.value);
                        if (resolveError) setResolveError(null);
                      }}
                      placeholder="Descreva a peça substituída, ajuste realizado ou teste final..."
                      className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                    />
                    {resolveError && (
                      <p className="mt-1 text-xs font-medium text-[#B42318]" role="alert">
                        {resolveError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[44px] rounded-lg bg-[#176B5B] px-4 text-sm font-semibold text-white hover:bg-[#125548]"
                  >
                    Concluir e fechar pendência
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4 text-xs text-[#476078]">
                  Perfil Visualizador: apenas consulta. Alterne para Operador ou Administrador para registrar o tratamento.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
};
