import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MinusCircle,
  Plus,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { AssetIllustration } from '../components/AssetIllustration';
import {
  InspectionStatusBadge,
  IssuePriorityLabel,
  IssueStatusBadge,
} from '../components/StatusBadge';
import { computeAssetInspectionStatus, getAssetOpenIssues } from '../utils/domainLogic';
import { formatDateBR, formatDateTimeBR, formatRelativeDueBR } from '../utils/date';

export const DashboardPage: React.FC = () => {
  const { effectiveState, stats, isPilot, identity } = useAppState();
  const canManageAssets = !isPilot || identity?.role === 'admin';

  const priorityAssets = effectiveState.assets
    .filter((a) => {
      const st = computeAssetInspectionStatus(a, APP_CONFIG.demoClockDate);
      return st === 'overdue' || st === 'due_soon' || st === 'never_inspected';
    })
    .sort((a, b) => {
      const order = { overdue: 0, due_soon: 1, never_inspected: 2, ok: 3, inactive: 4 };
      const sa = computeAssetInspectionStatus(a, APP_CONFIG.demoClockDate);
      const sb = computeAssetInspectionStatus(b, APP_CONFIG.demoClockDate);
      return order[sa] - order[sb];
    })
    .slice(0, 7);

  const activeIssues = effectiveState.issues.filter((i) => i.status !== 'resolved').slice(0, 5);

  const recentRecords = effectiveState.records.slice(0, 6);

  const siteNameOf = (siteId: string) =>
    effectiveState.sites.find((s) => s.id === siteId)?.name ?? siteId;

  const assetOf = (assetId: string) => effectiveState.assets.find((a) => a.id === assetId);

  const memberNameOf = (memberId: string) =>
    effectiveState.members.find((m) => m.id === memberId)?.name ?? 'Não atribuído';

  return (
    <AppShell
      title="O que precisa de atenção hoje"
      subtitle={`Resumo calculado com base em ${stats.totalAssets} equipamentos e ${stats.totalRecordsCount} inspeções registradas`}
      primaryAction={
        canManageAssets && (
          <Link
            to="/app/assets?new=1"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#125548] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Novo equipamento</span>
          </Link>
        )
      }
    >
      {/* KPI Summary Cards — directly clickable to matching filtered views */}
      <Link
        to="/app/plans"
        className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#294968] bg-[#17324D] px-5 py-4 text-white"
      >
        <div>
          <p className="font-semibold">Agenda de inspeções</p>
          <p className="mt-1 text-sm text-[#CBD7E4]">
            {
              effectiveState.tasks.filter(
                (task) =>
                  task.status === 'pending' &&
                  task.dueDate <= APP_CONFIG.demoClockDate &&
                  effectiveState.assets.some(
                    (a) => a.id === task.assetId && a.operationalStatus !== 'inactive',
                  ),
              ).length
            }{' '}
            tarefa(s) para hoje ou atrasadas ·{' '}
            {effectiveState.issues.filter((issue) => issue.status === 'awaiting_review').length}{' '}
            atendimento(s) aguardando verificação
          </p>
        </div>
        <span className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold">
          Ver agenda
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
      <section aria-label="Indicadores operacionais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/app/assets?inspectionStatus=overdue"
            className="group rounded-xl border border-[#DCE4EC] bg-white p-5 shadow-xs transition-all hover:border-[#B42318] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#526980]">Inspeções atrasadas</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF3F2] text-[#B42318]">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#B42318]">
              {stats.overdueCount}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[#476078] group-hover:text-[#17324D]">
              <span>Ver equipamentos atrasados</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </p>
          </Link>

          <Link
            to="/app/assets?inspectionStatus=due_soon"
            className="group rounded-xl border border-[#DCE4EC] bg-white p-5 shadow-xs transition-all hover:border-[#B76A12] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#526980]">
                Vencem nos próximos 7 dias
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF6EB] text-[#B76A12]">
                <Clock className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#B76A12]">
              {stats.dueSoonCount}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[#476078] group-hover:text-[#17324D]">
              <span>Programar inspeções</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </p>
          </Link>

          <Link
            to="/app/issues?status=unresolved"
            className="group rounded-xl border border-[#DCE4EC] bg-white p-5 shadow-xs transition-all hover:border-[#176B5B] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#526980]">Pendências sem conclusão</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDF3F8] text-[#17324D]">
                <AlertTriangle className="h-4 w-4 text-[#B76A12]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#17324D]">
              {stats.unresolvedIssuesCount}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[#476078] group-hover:text-[#17324D]">
              <span>
                {stats.openIssuesCount} abertas · {stats.inProgressIssuesCount} em tratamento
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </p>
          </Link>

          <Link
            to="/app/assets?inspectionStatus=never_inspected"
            className="group rounded-xl border border-[#DCE4EC] bg-white p-5 shadow-xs transition-all hover:border-[#176B5B] hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#526980]">Sem primeira inspeção</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF4F1] text-[#176B5B]">
                <MinusCircle className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#17324D]">
              {stats.neverInspectedCount}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-[#476078] group-hover:text-[#17324D]">
              <span>
                Ativos em dia: {stats.okCount} · Desativados: {stats.inactiveAssets}
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </p>
          </Link>
        </div>
      </section>

      {stats.totalAssets === 0 ? (
        <section className="mt-6 rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-[#17324D]">
            Nenhum equipamento cadastrado no momento
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            Cadastre o primeiro equipamento ou importe uma lista CSV para começar a acompanhar
            inspeções e pendências.
          </p>
          {canManageAssets && (
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/app/assets?new=1"
                className="rounded-lg bg-[#176B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125548]"
              >
                Cadastrar equipamento
              </Link>
            </div>
          )}
        </section>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left: Priority Inspection Queue with Equipment Thumbnails */}
          <section className="rounded-xl border border-[#DCE4EC] bg-white shadow-xs xl:col-span-7">
            <div className="flex items-center justify-between border-b border-[#DCE4EC] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[#17324D]">
                  Fila de inspeções prioritárias
                </h2>
                <p className="text-xs text-[#526980]">
                  Equipamentos ativos atrasados, vencendo em 7 dias ou sem histórico
                </p>
              </div>
              <Link
                to="/app/assets"
                className="text-xs font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
              >
                Ver todos ({stats.totalAssets})
              </Link>
            </div>

            {priorityAssets.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-[#137333]" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-[#17324D]">
                  Todas as inspeções programadas estão em dia
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#DCE4EC]">
                {priorityAssets.map((asset) => {
                  const status = computeAssetInspectionStatus(asset, APP_CONFIG.demoClockDate);
                  const openIssuesCount = getAssetOpenIssues(
                    asset.id,
                    effectiveState.issues,
                  ).length;

                  return (
                    <li
                      key={asset.id}
                      className="flex flex-col justify-between gap-3 px-5 py-3.5 hover:bg-[#F4F7FA]/70 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 items-start gap-3.5">
                        <AssetIllustration
                          category={asset.category}
                          code={asset.code}
                          name={asset.name}
                          photoDataUrl={asset.photoDataUrl}
                          className="hidden h-14 w-16 shrink-0 sm:flex"
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#526980]">
                            <span className="font-mono font-bold text-[#17324D]">{asset.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>{siteNameOf(asset.siteId)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{memberNameOf(asset.assigneeId)}</span>
                          </div>
                          <Link
                            to={`/app/assets/${asset.id}`}
                            className="mt-0.5 block truncate text-sm font-semibold text-[#17324D] hover:text-[#176B5B]"
                          >
                            {asset.name}
                          </Link>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs">
                            <InspectionStatusBadge status={status} />
                            <span className="tabular-nums text-[#476078]">
                              {formatRelativeDueBR(
                                asset.nextInspectionDue,
                                APP_CONFIG.demoClockDate,
                              )}
                            </span>
                            {openIssuesCount > 0 && (
                              <span className="font-medium text-[#B42318]">
                                {openIssuesCount} pendência(s) aberta(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          to={`/a/${asset.id}/inspect`}
                          className="inline-flex min-h-[38px] items-center rounded-lg border border-[#176B5B] bg-[#EAF4F1] px-3.5 py-1.5 text-xs font-semibold text-[#176B5B] hover:bg-[#176B5B] hover:text-white transition-colors whitespace-nowrap"
                        >
                          Inspecionar
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Right Column: Active Issues & Recent Activity */}
          <div className="space-y-6 xl:col-span-5">
            <section className="rounded-xl border border-[#DCE4EC] bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DCE4EC] px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-[#17324D]">Pendências em aberto</h2>
                  <p className="text-xs text-[#526980]">Não conformidades aguardando tratamento</p>
                </div>
                <Link
                  to="/app/issues"
                  className="text-xs font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
                >
                  Tratar pendências
                </Link>
              </div>

              {activeIssues.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#526980]">
                  Nenhuma pendência aberta no momento.
                </div>
              ) : (
                <ul className="divide-y divide-[#DCE4EC]">
                  {activeIssues.map((issue) => {
                    const eq = assetOf(issue.assetId);
                    return (
                      <li key={issue.id} className="px-5 py-3.5 hover:bg-[#F4F7FA]/60">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-[#17324D]">
                            {eq?.code ?? issue.assetId} · {eq?.name}
                          </span>
                          <IssuePriorityLabel priority={issue.priority} />
                        </div>
                        <Link
                          to={`/app/issues?issueId=${issue.id}`}
                          className="mt-1 block text-sm font-medium text-[#17324D] hover:text-[#176B5B]"
                        >
                          {issue.title}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#526980]">
                          <IssueStatusBadge status={issue.status} />
                          <span className="tabular-nums">Prazo: {formatDateBR(issue.dueDate)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-[#DCE4EC] bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DCE4EC] px-5 py-4">
                <h2 className="text-base font-bold text-[#17324D]">Atividade recente</h2>
                <Link
                  to="/app/records"
                  className="text-xs font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
                >
                  Ver registros
                </Link>
              </div>
              <ul className="divide-y divide-[#DCE4EC]">
                {recentRecords.map((rec) => (
                  <li key={rec.id} className="px-5 py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/app/assets/${rec.assetId}`}
                        className="font-semibold text-[#17324D] hover:text-[#176B5B] truncate"
                      >
                        <span className="font-mono">{rec.assetCodeSnapshot}</span> —{' '}
                        {rec.assetNameSnapshot}
                      </Link>
                      <span
                        className={`shrink-0 font-semibold ${
                          rec.overallResult === 'approved' ? 'text-[#137333]' : 'text-[#B42318]'
                        }`}
                      >
                        {rec.overallResult === 'approved'
                          ? 'Aprovada'
                          : `${rec.nonConformingCount} não conforme(s)`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[#526980] tabular-nums">
                      Por {rec.inspectorNameSnapshot} · {formatDateTimeBR(rec.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
};
